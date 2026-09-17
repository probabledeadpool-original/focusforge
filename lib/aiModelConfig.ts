"use client";

export type ModelCategory = 'text' | 'voice' | 'embedding';

export interface ModelDefinition {
  id: string;
  name: string;
  category: ModelCategory;
  description: string;
  capabilities: {
    textReasoning: boolean;
    toolRouting: boolean;
    searchSummarization: boolean;
    liveAudio: boolean;
    vision: boolean;
  };
  recommendedFor: string;
  quotaTier: 'High' | 'Standard' | 'Experimental';
}

export interface AiConfig {
  textModel: string;
  liveModel: string;
  embeddingModel: string;
}

export const AI_CONFIG: AiConfig = {
  textModel: "gemma-4-26b-a4b-it",
  liveModel: "gemini-2.0-flash-exp",
  embeddingModel: "text-embedding-004"
};

export const AVAILABLE_MODELS: ModelDefinition[] = [
  {
    id: "gemma-4-26b-a4b-it",
    name: "Gemma 4 26B Instruct",
    category: "text",
    description: "High-capacity open-weights instruction model with generous quota for text reasoning, summarization, and tool routing.",
    capabilities: {
      textReasoning: true,
      toolRouting: true,
      searchSummarization: true,
      liveAudio: false,
      vision: false,
    },
    recommendedFor: "Daily text reasoning, command classification, search & tool routing (Primary High Quota)",
    quotaTier: "High"
  },
  {
    id: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    category: "text",
    description: "Google's hybrid reasoning flagship with ultra-fast execution and multimodal context comprehension.",
    capabilities: {
      textReasoning: true,
      toolRouting: true,
      searchSummarization: true,
      liveAudio: false,
      vision: true,
    },
    recommendedFor: "Complex analytical logic and vision inspection",
    quotaTier: "Standard"
  },
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    category: "text",
    description: "High-throughput turbo model designed for quick responses and iterative multi-step workflows.",
    capabilities: {
      textReasoning: true,
      toolRouting: true,
      searchSummarization: true,
      liveAudio: false,
      vision: true,
    },
    recommendedFor: "Fast text summarization and rapid drafts",
    quotaTier: "Standard"
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    category: "text",
    description: "Lightweight and efficient fallback model with low latency and balanced resource consumption.",
    capabilities: {
      textReasoning: true,
      toolRouting: true,
      searchSummarization: true,
      liveAudio: false,
      vision: true,
    },
    recommendedFor: "Reliable fallback text reasoning",
    quotaTier: "Standard"
  },
  {
    id: "gemini-2.0-flash-exp",
    name: "Gemini 2.0 Flash (Live Audio)",
    category: "voice",
    description: "Real-time bidirectional audio & voice conversation model compatible with low-latency streaming.",
    capabilities: {
      textReasoning: true,
      toolRouting: true,
      searchSummarization: true,
      liveAudio: true,
      vision: true,
    },
    recommendedFor: "Real-time hands-free voice operations & acoustic dialogue",
    quotaTier: "Experimental"
  }
];

export interface AiSessionUsage {
  sessionRequests: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  fallbackCount: number;
  lastUsedModel: string;
  lastError: string | null;
  lastLatencyMs: number;
  lastCheckedAt: number;
}

const USAGE_STORAGE_KEY = 'focusforge-ai-session-usage';

export function getSelectedTextModel(): string {
  if (typeof window === 'undefined') return AI_CONFIG.textModel;
  return localStorage.getItem('focusforge-selected-text-model') || 
         localStorage.getItem('gemini-model') || 
         AI_CONFIG.textModel;
}

export function setSelectedTextModel(modelId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('focusforge-selected-text-model', modelId);
  localStorage.setItem('gemini-model', modelId); // sync for backward compatibility
  window.dispatchEvent(new CustomEvent('ai-model-changed', { detail: { textModel: modelId } }));
}

export function getSelectedLiveModel(): string {
  if (typeof window === 'undefined') return AI_CONFIG.liveModel;
  return localStorage.getItem('focusforge-selected-live-model') || AI_CONFIG.liveModel;
}

export function setSelectedLiveModel(modelId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('focusforge-selected-live-model', modelId);
  window.dispatchEvent(new CustomEvent('ai-model-changed', { detail: { liveModel: modelId } }));
}

export function getAiSessionUsage(): AiSessionUsage {
  if (typeof window === 'undefined') {
    return {
      sessionRequests: 0,
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      fallbackCount: 0,
      lastUsedModel: AI_CONFIG.textModel,
      lastError: null,
      lastLatencyMs: 0,
      lastCheckedAt: 0,
    };
  }
  try {
    const raw = sessionStorage.getItem(USAGE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  return {
    sessionRequests: 0,
    estimatedInputTokens: 0,
    estimatedOutputTokens: 0,
    fallbackCount: 0,
    lastUsedModel: getSelectedTextModel(),
    lastError: null,
    lastLatencyMs: 0,
    lastCheckedAt: Date.now(),
  };
}

export function recordAiUsage(metrics: {
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  isFallback?: boolean;
  error?: string | null;
  latencyMs?: number;
}): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getAiSessionUsage();
    const updated: AiSessionUsage = {
      sessionRequests: current.sessionRequests + 1,
      estimatedInputTokens: current.estimatedInputTokens + (metrics.inputTokens || 0),
      estimatedOutputTokens: current.estimatedOutputTokens + (metrics.outputTokens || 0),
      fallbackCount: current.fallbackCount + (metrics.isFallback ? 1 : 0),
      lastUsedModel: metrics.model || current.lastUsedModel,
      lastError: metrics.error !== undefined ? metrics.error : current.lastError,
      lastLatencyMs: metrics.latencyMs || current.lastLatencyMs,
      lastCheckedAt: Date.now(),
    };
    sessionStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('ai-usage-updated', { detail: updated }));
  } catch (e) {}
}

export function resetAiSessionUsage(): void {
  if (typeof window === 'undefined') return;
  const initial: AiSessionUsage = {
    sessionRequests: 0,
    estimatedInputTokens: 0,
    estimatedOutputTokens: 0,
    fallbackCount: 0,
    lastUsedModel: getSelectedTextModel(),
    lastError: null,
    lastLatencyMs: 0,
    lastCheckedAt: Date.now(),
  };
  sessionStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(initial));
  window.dispatchEvent(new CustomEvent('ai-usage-updated', { detail: initial }));
}
