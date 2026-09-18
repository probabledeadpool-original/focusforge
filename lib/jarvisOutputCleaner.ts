/**
 * J.A.R.V.I.S. Output Extractor & Defensive Sanitizer
 * 
 * Ensures that model responses delivered to the UI and Text-to-Speech contain
 * ONLY the final user-facing answer—free of role markers, chat delimiters,
 * internal monologues, thought channels, and meta-commentary.
 */

export function extractFinalResponse(data: any): string {
  if (!data) return "";

  // 1. If string is directly passed
  if (typeof data === 'string') {
    return data;
  }

  // 2. Google Generative Language API candidates structure
  if (data?.candidates?.[0]?.content?.parts && Array.isArray(data.candidates[0].content.parts)) {
    const parts = data.candidates[0].content.parts;
    const finalParts = parts
      .filter((part: any) => part && part.text && !part.thought)
      .map((part: any) => part.text);

    if (finalParts.length > 0) {
      return finalParts.join("");
    }
  }

  // 3. Fallbacks for SDK text or output_text properties
  if (typeof data?.text === 'string') {
    return data.text;
  }
  if (typeof data?.output_text === 'string') {
    return data.output_text;
  }

  return "";
}

export function cleanJarvisOutput(input: string | any): string {
  if (!input && input !== 0) return "";

  let text = String(input);

  // 1. Remove code fences when the entire response is accidentally wrapped in ```markdown or ```text
  text = text.replace(/^```(?:text|markdown)?\r?\n?/i, "");
  text = text.replace(/\r?\n?```$/i, "");

  // 2. Remove thinking tags and thought channels (<thought>...</thought> / <|channel|>thought...<|channel|>final)
  text = text.replace(/<thought>[\s\S]*?<\/thought>/gi, "");
  text = text.replace(/<\|channel\|>thought[\s\S]*?<\|channel\|>(?:final|output)/gi, "");

  // 3. Remove Gemma and chat-template special tokens
  text = text.replace(/<start_of_turn>(?:user|model|assistant|system)?\s*/gi, "");
  text = text.replace(/<end_of_turn>\s*/gi, "");
  text = text.replace(/<\|start\|>\s*/gi, "");
  text = text.replace(/<\|end\|>\s*/gi, "");
  text = text.replace(/<\|channel\|>\s*/gi, "");

  // 4. Handle thought: / analysis: ... final: <answer>
  const finalTagMatch = text.match(/(?:^|\n)\s*(?:final|direct answer|final answer)\s*:\s*([\s\S]+)$/i);
  if (finalTagMatch && finalTagMatch[1]?.trim()) {
    text = finalTagMatch[1].trim();
  }

  // 5. Handle simulated multi-turn dialogs with separator followed by answer (User: ... \n Assistant: ... \n *** \n <answer>)
  // If there's a dialogue followed by a separator (*** / ---) and then the actual answer, take what follows the separator
  const dialogSeparatorMatch = text.match(/(?:(?:user|assistant|model):\s*[\s\S]*?)\n\s*(?:[-*=_]{3,})\s*\n([\s\S]+)$/i);
  if (dialogSeparatorMatch && dialogSeparatorMatch[1]?.trim()) {
    text = dialogSeparatorMatch[1].trim();
  }

  // 6. Handle accidental multi-turn transcript pattern (e.g. user\n...\n---\nassistant\n<answer>)
  const assistantTurnRegex = /(?:^|\n)\s*(?:\*{1,3}|-{3,})?\s*(?:assistant|model)\s*(?:\*{1,3}|-{3,})?\s*:?\s*([\s\S]+)$/i;
  const assistantMatch = text.match(assistantTurnRegex);
  if (assistantMatch && assistantMatch[1]?.trim()) {
    text = assistantMatch[1].trim();
  }

  // 7. Handle internal draft monologues (e.g. * Draft 1 (Internal Monologue): ... * Draft 2: <answer>)
  const draftMatches = [...text.matchAll(/(?:^|\n)\s*\*?\s*\*?Draft\s*\d+[^:\n]*:\*?\s*([\s\S]*?)(?=(?:\n\s*\*?\s*\*?Draft\s*\d+|$))/gi)];
  if (draftMatches.length > 0) {
    const lastDraft = draftMatches[draftMatches.length - 1][1].trim();
    if (lastDraft) {
      text = lastDraft;
    }
  }

  // 6. Strip internal persona breakdown headers if present
  text = text.replace(/^\s*\*?\s*Persona\s*:[\s\S]*?(?=\n\n|\n[A-Z]|\n\s*\*?\s*Draft|\nDirect|$)/i, "").trim();
  text = text.replace(/^\s*\*?\s*User Query\s*:[\s\S]*?(?=\n\n|\n[A-Z]|$)/i, "").trim();
  text = text.replace(/^\s*\*?\s*Attributes\s*:[\s\S]*?(?=\n\n|\n[A-Z]|$)/i, "").trim();
  text = text.replace(/^\s*\*?\s*Format\s*:[\s\S]*?(?=\n\n|\n[A-Z]|$)/i, "").trim();
  text = text.replace(/^\s*\*?\s*Draft\s*\d+[\s\S]*?:\s*/i, "").trim();

  // 7. Remove raw internal monologue / thought process prefixes at line starts
  text = text.replace(/^(?:Internal Monologue|Thought Process|Thinking Process|Draft \d+):\s*[\s\S]*?\n/i, "").trim();

  // 8. Remove leading role labels and conversation headers
  text = text.replace(/^\s*(?:user|assistant|model|system)\s*:\s*/gim, "");
  text = text.replace(/^\s*(?:thought|analysis|final)\s*:\s*/gim, "");
  text = text.replace(/^\s*(?:user|assistant|model|system)\s*$/gim, "");

  // 9. Remove standalone separator-only lines (---, ***, ===, ___), but PRESERVE markdown list items (- item)
  text = text.replace(/^\s*(?:-{3,}|\*{3,}|={3,}|_{3,})\s*$/gm, "");

  // 10. Clean up excess empty lines and leading/trailing whitespace
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return text;
}
