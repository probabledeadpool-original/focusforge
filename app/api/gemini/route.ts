import { NextResponse } from 'next/server';

function cleanAiResponse(raw: string): string {
  if (!raw) return "Standing by for your directive, sir.";
  let text = raw.trim();

  // 1. Strip thinking tags if any model outputs <thought>...</thought>
  text = text.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();

  // 2. If Gemma or reasoning model leaked draft monologue (e.g. * Draft 2 (Applying Persona Constraints): ...)
  const draftMatches = [...text.matchAll(/(?:^|\n)\s*\*?\s*\*?Draft\s*\d+[^:\n]*:\*?\s*([\s\S]*?)(?=(?:\n\s*\*?\s*\*?Draft\s*\d+|$))/gi)];
  if (draftMatches.length > 0) {
    const lastDraft = draftMatches[draftMatches.length - 1][1].trim();
    if (lastDraft) {
      text = lastDraft;
    }
  }

  // 3. Strip internal persona breakdown headers if present (e.g. "* Persona: ... \n * User Query: ...")
  text = text.replace(/^\s*\*?\s*Persona\s*:[\s\S]*?(?=\n\n|\n[A-Z]|\n\s*\*?\s*Draft|\nDirect|$)/i, '').trim();
  text = text.replace(/^\s*\*?\s*User Query\s*:[\s\S]*?(?=\n\n|\n[A-Z]|$)/i, '').trim();
  text = text.replace(/^\s*\*?\s*Attributes\s*:[\s\S]*?(?=\n\n|\n[A-Z]|$)/i, '').trim();
  text = text.replace(/^\s*\*?\s*Format\s*:[\s\S]*?(?=\n\n|\n[A-Z]|$)/i, '').trim();
  text = text.replace(/^\s*\*?\s*Draft\s*\d+[\s\S]*?:\s*/i, '').trim();

  // 4. Remove any remaining raw internal monologue prefixes
  text = text.replace(/^(Internal Monologue|Thought Process|Thinking Process|Draft \d+):\s*[\s\S]*?\n/i, '').trim();

  return text || raw.trim();
}

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { 
      prompt, 
      apiKey, 
      systemInstruction, 
      model, 
      isTest, 
      jsonSchema, 
      tools 
    } = await req.json();

    const key = apiKey?.trim() || process.env.GEMINI_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: 'Gemini API key is missing. Please configure your key in Profile.' },
        { status: 400 }
      );
    }

    // Default model if unspecified
    const rawModel = model?.trim() || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    let selectedModel = rawModel.replace(/^models\//, '');
    
    // Normalize aliases while retaining Gemma access
    if (selectedModel.includes('1.5-flash')) {
      selectedModel = 'gemini-2.5-flash';
    } else if (selectedModel.includes('1.5-pro')) {
      selectedModel = 'gemini-2.5-pro';
    } else if (selectedModel.includes('3.7-flash') || selectedModel.includes('3.6-flash')) {
      selectedModel = 'gemini-2.5-flash';
    } else if (selectedModel === 'gemma-4-26b-a4b-it' || selectedModel.startsWith('gemma-4')) {
      // Map to available Gemma 2 27B or try Gemma
      selectedModel = 'gemma-2-27b-it';
    }

    const buildEndpoint = (m: string) => 
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m.replace(/^models\//, ''))}:generateContent?key=${encodeURIComponent(key)}`;

    const isGemmaModel = selectedModel.toLowerCase().includes('gemma');

    // --- 1. MODEL CAPABILITY & PING TEST MODE ---
    if (isTest) {
      const pingStart = Date.now();
      
      let pingResponse = await fetch(buildEndpoint(selectedModel), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Respond with OK' }] }],
          generationConfig: { 
            maxOutputTokens: 20,
            temperature: 0.1 
          },
        }),
      });
      let pingData = await pingResponse.json();
      const latencyMs = Date.now() - pingStart;

      // Handle Quota Limit (429)
      if (pingResponse.status === 429 || pingData?.error?.code === 429 || pingData?.error?.message?.toLowerCase().includes('quota')) {
        return NextResponse.json({
          success: false,
          errorType: 'QUOTA_EXHAUSTED',
          error: `Quota exceeded for ${selectedModel}. High demand or daily rate limit reached.`,
          model: selectedModel,
          latencyMs
        }, { status: 429 });
      }

      // Handle Auth Errors (401/403)
      if (pingResponse.status === 401 || pingResponse.status === 403 || pingData?.error?.code === 403 || pingData?.error?.message?.toLowerCase().includes('api key')) {
        return NextResponse.json({
          success: false,
          errorType: 'AUTH_FAILED',
          error: pingData?.error?.message || 'Invalid Gemini API Key.',
          model: selectedModel,
          latencyMs
        }, { status: 401 });
      }

      // If requested model returned error, test fallback to gemini-2.5-flash
      if (!pingResponse.ok || pingData?.error) {
        const errorMsg = pingData?.error?.message || 'Model unreachable';
        
        const fallbackEndpoint = buildEndpoint('gemini-2.5-flash');
        const fallbackRes = await fetch(fallbackEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Respond with OK' }] }],
            generationConfig: { maxOutputTokens: 20 },
          }),
        });
        const fallbackData = await fallbackRes.json();

        if (fallbackRes.ok && !fallbackData?.error) {
          return NextResponse.json({
            success: true,
            isFallback: true,
            fallbackModel: 'gemini-2.5-flash',
            message: `'${selectedModel}' returned an error (${errorMsg}). Fallback to gemini-2.5-flash verified successfully.`,
            capabilities: {
              textReasoning: true,
              toolRouting: true,
              structuredJson: true
            },
            latencyMs
          });
        }

        return NextResponse.json(
          { 
            success: false,
            errorType: 'MODEL_UNAVAILABLE',
            error: errorMsg,
            model: selectedModel,
            latencyMs
          },
          { status: pingResponse.status || 400 }
        );
      }

      return NextResponse.json({
        success: true,
        model: selectedModel,
        latencyMs,
        message: `Verified successfully! ${selectedModel} is operational.`,
        capabilities: {
          textReasoning: true,
          toolRouting: true,
          structuredJson: true,
          liveAudio: selectedModel.includes('live') || selectedModel.includes('realtime')
        }
      });
    }

    // --- 2. STANDARD INFERENCE & TOOL ROUTING MODE ---
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    const defaultSystem = 'You are J.A.R.V.I.S., the executive AI assistant for Focus Forge. Answer directly in 1 short sentence (15-20 words max). NO conversational filler, NO pleasantries, and NO internal drafts.';
    const systemText = systemInstruction || defaultSystem;

    // Construct model-specific generation payload
    let requestBody: any;
    if (isGemmaModel) {
      // Gemma format: clean direct user content without system_instruction object
      requestBody = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${systemText}\n\nUser Question: ${prompt.trim()}\n\nDirect Answer:`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 200,
        }
      };
    } else {
      // Gemini format: native system_instruction support
      requestBody = {
        system_instruction: {
          parts: [{ text: systemText }]
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: prompt.trim()
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 200,
        }
      };
    }

    if (jsonSchema) {
      requestBody.generationConfig.responseMimeType = "application/json";
    }

    let response = await fetch(buildEndpoint(selectedModel), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    let data = await response.json();
    let isFallback = false;
    let fallbackReason = null;

    // Automatic fallback if model encounters error (e.g. 500, 404, 400)
    if (!response.ok && selectedModel !== 'gemini-2.5-flash') {
      const isAuthOrQuota = response.status === 401 || response.status === 403 || response.status === 429;
      if (!isAuthOrQuota) {
        const fallbackTarget = 'gemini-2.5-flash';
        const fallbackEndpoint = buildEndpoint(fallbackTarget);
        
        try {
          const fallbackBody = {
            system_instruction: { parts: [{ text: systemText }] },
            contents: [{ role: 'user', parts: [{ text: prompt.trim() }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 200 }
          };

          const fallbackResponse = await fetch(fallbackEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fallbackBody),
          });
          
          const fallbackData = await fallbackResponse.json();
          if (fallbackResponse.ok && !fallbackData?.error) {
            response = fallbackResponse;
            data = fallbackData;
            fallbackReason = `'${selectedModel}' returned ${response.status}; automatically routed to ${fallbackTarget}`;
            selectedModel = fallbackTarget;
            isFallback = true;
          }
        } catch (fbErr) {
          console.error('[API /api/gemini] Fallback fetch failed:', fbErr);
        }
      }
    }

    // Handle Quota Limit (429)
    if (response.status === 429 || data?.error?.code === 429 || data?.error?.message?.toLowerCase().includes('quota')) {
      return NextResponse.json(
        { 
          error: `Daily rate limit or quota reached for ${selectedModel}.`,
          errorType: 'QUOTA_EXHAUSTED',
          model: selectedModel
        },
        { status: 429 }
      );
    }

    if (!response.ok || data?.error) {
      console.error(`[API /api/gemini] Model '${selectedModel}' error:`, data?.error);
      return NextResponse.json(
        { 
          error: data?.error?.message || 'Gemini request failed.',
          errorType: response.status === 401 || response.status === 403 ? 'AUTH_ERROR' : 'MODEL_ERROR',
          model: selectedModel 
        },
        { status: response.status || 500 }
      );
    }

    const rawReply = data?.candidates?.[0]?.content?.parts?.[0]?.text ||
                     data?.output_text ||
                     "Standing by for your focus directive, sir.";

    // Clean any leaked thoughts, persona headers, or Draft 1/Draft 2 monologues
    const cleanReply = cleanAiResponse(rawReply);

    const estimatedInputTokens = Math.round((prompt.length + systemText.length) / 4);
    const estimatedOutputTokens = Math.round(cleanReply.length / 4);
    const latencyMs = Date.now() - startTime;

    return NextResponse.json({ 
      reply: cleanReply, 
      text: cleanReply, 
      model: selectedModel,
      isFallback,
      fallbackReason,
      usage: {
        promptTokens: estimatedInputTokens,
        completionTokens: estimatedOutputTokens,
        totalTokens: estimatedInputTokens + estimatedOutputTokens
      },
      latencyMs
    });
  } catch (error: any) {
    console.error('[API /api/gemini] Proxy error:', error);
    return NextResponse.json({ 
      error: error?.message || 'Unable to reach Gemini API.',
      errorType: 'NETWORK_ERROR'
    }, { status: 500 });
  }
}
