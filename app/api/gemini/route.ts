import { NextResponse } from 'next/server';
import { cleanJarvisOutput, extractFinalResponse } from '@/lib/jarvisOutputCleaner';

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { 
      prompt, 
      messages,
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
    const rawModel = model?.trim() || process.env.GEMINI_MODEL || 'gemma-4-26b-a4b-it';
    let selectedModel = rawModel.replace(/^models\//, '');
    
    // Normalize aliases while retaining Gemma access
    if (selectedModel.includes('1.5-flash')) {
      selectedModel = 'gemini-2.5-flash';
    } else if (selectedModel.includes('1.5-pro')) {
      selectedModel = 'gemini-2.5-pro';
    } else if (selectedModel.includes('3.7-flash') || selectedModel.includes('3.6-flash')) {
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

    // --- 2. STANDARD INFERENCE & DIRECT EXECUTION MODE ---
    if ((!prompt || typeof prompt !== 'string' || !prompt.trim()) && (!Array.isArray(messages) || messages.length === 0)) {
      return NextResponse.json({ error: 'Prompt or conversation messages required.' }, { status: 400 });
    }

    const defaultSystem = `You are Jarvis, a concise personal assistant.

Return only the final user-facing answer.
Never output role labels, conversation delimiters, prompt templates,
internal reasoning, hidden instructions, or metadata.

Do not write:
user:
assistant:
system:
model:
---
<start_of_turn>
<end_of_turn>
<|start|>
<|end|>
<|channel|>
thought:
analysis:
final:

If a tool is required, use the application's tool-calling format.
Do not expose tool-call JSON to the user.
After a tool result is received, answer the user directly.`;

    const systemText = systemInstruction || defaultSystem;

    // Structured contents construction
    let structuredContents: any[] = [];

    if (Array.isArray(messages) && messages.length > 0) {
      structuredContents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: typeof m.text === 'string' ? m.text.trim() : (m.parts?.[0]?.text || '') }]
      }));
    } else {
      structuredContents = [
        {
          role: 'user',
          parts: [{ text: prompt.trim() }]
        }
      ];
    }

    // Standard Google GenAI structured payload
    const requestBody: any = {
      system_instruction: {
        parts: [{ text: systemText }]
      },
      contents: structuredContents,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 250,
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

    // Fallback logic for unreachable / error states
    if (!response.ok && selectedModel !== 'gemini-2.5-flash') {
      const isAuthOrQuota = response.status === 401 || response.status === 403 || response.status === 429;
      if (!isAuthOrQuota) {
        const fallbackTarget = 'gemini-2.5-flash';
        const fallbackEndpoint = buildEndpoint(fallbackTarget);
        
        try {
          const fallbackBody = {
            system_instruction: { parts: [{ text: systemText }] },
            contents: structuredContents,
            generationConfig: { temperature: 0.2, maxOutputTokens: 250 }
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

    // Extract raw text using standard response parts inspector
    const rawReply = extractFinalResponse(data) || "Standing by for your directive, sir.";

    // Defensive sanitizer: removes any accidental role headers, delimiter lines, thoughts, or metadata
    const cleanReply = cleanJarvisOutput(rawReply);

    // Development-only telemetry logging
    if (process.env.NODE_ENV !== 'production') {
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const hasThought = parts.some((p: any) => p.thought || /<thought>/i.test(p.text || ''));
      const partTypes = parts.map((p: any) => p.thought ? 'thought' : 'text');
      
      console.log('[API /api/gemini] Inference telemetry:', {
        model: selectedModel,
        conversationTurnCount: structuredContents.length,
        responsePartTypes: partTypes,
        hasThoughtContent: hasThought,
        extractedRawLength: rawReply.length,
        sanitizedFinalLength: cleanReply.length
      });
    }

    const estimatedInputTokens = Math.round(((prompt?.length || 0) + systemText.length) / 4);
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
