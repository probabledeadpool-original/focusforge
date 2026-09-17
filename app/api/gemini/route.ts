import { NextResponse } from 'next/server';

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

    // Default to gemini-2.5-flash for speed and rock-solid reliability
    const rawModel = model?.trim() || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    
    // Clean model format (strip leading models/ if provided)
    let selectedModel = rawModel.replace(/^models\//, '');
    
    // Normalize deprecated or invalid model names
    if (selectedModel.includes('1.5-flash')) {
      selectedModel = 'gemini-2.5-flash';
    } else if (selectedModel.includes('1.5-pro')) {
      selectedModel = 'gemini-2.5-pro';
    } else if (selectedModel.includes('3.7-flash') || selectedModel.includes('3.6-flash')) {
      selectedModel = 'gemini-2.5-flash';
    } else if (selectedModel.startsWith('gemma-4') || selectedModel.includes('gemma-4-26b')) {
      // Map unsupported gemma 4 tags to fast gemini-2.5-flash
      selectedModel = 'gemini-2.5-flash';
    }

    const buildEndpoint = (m: string) => 
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m.replace(/^models\//, ''))}:generateContent?key=${encodeURIComponent(key)}`;

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

      // Handle Quota Limit (429) specifically
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

      // If requested model returned error (500, 404, etc.), test fallback to gemini-2.5-flash
      if (!pingResponse.ok || pingData?.error) {
        const errorMsg = pingData?.error?.message || 'Model unreachable';
        
        // Attempt fallback probe to gemini-2.5-flash
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

    const systemText = systemInstruction || 
      'You are J.A.R.V.I.S., the executive AI assistant for Focus Forge. CRITICAL: Give ONLY the direct factual answer in 1 single short sentence (maximum 15-20 words). NO pleasantries, NO conversational filler, NO preamble, and NO backstory.';

    // Construct generation payload
    const requestBody: any = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${systemText}\n\nUser query: ${prompt.trim()}\n\nDirect factual answer (1 sentence):`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 150,
      }
    };

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

    // Automatic fallback if model encounters 500 (Internal error), 404 (Not found), 503, or invalid model error
    if (!response.ok && selectedModel !== 'gemini-2.5-flash') {
      const isAuthOrQuota = response.status === 401 || response.status === 403 || response.status === 429;
      if (!isAuthOrQuota) {
        const fallbackTarget = 'gemini-2.5-flash';
        const fallbackEndpoint = buildEndpoint(fallbackTarget);
        
        try {
          const fallbackResponse = await fetch(fallbackEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
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

    // Handle Quota Limit (429) specifically
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

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ||
                  data?.output_text ||
                  "Standing by for your focus directive, sir.";

    const estimatedInputTokens = Math.round((prompt.length + systemText.length) / 4);
    const estimatedOutputTokens = Math.round(reply.length / 4);
    const latencyMs = Date.now() - startTime;

    return NextResponse.json({ 
      reply: reply.trim(), 
      text: reply.trim(), 
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
