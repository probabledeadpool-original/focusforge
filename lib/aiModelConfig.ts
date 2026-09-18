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

export interface LiveModelCapabilities {
  id: string;
  name: string;
  categoryLabel: string;
  inputModalities: ('audio' | 'text')[];
  outputModalities: ('audio' | 'text')[];
  supportsVoiceConversation: boolean;
  supportsTranslation: boolean;
  supportsTranscription: boolean;
  supportsTools: boolean;
  supportsThinking: boolean;
  latencyCategory: 'Ultra-Low (~200ms)' | 'Low (~350ms)' | 'Standard (~450ms)' | 'Extended (~900ms)';
  description: string;
  isRecommendedDefault?: boolean;
}

export const LIVE_MODELS_MAP: Record<string, LiveModelCapabilities> = {
  'gemini-2.5-flash-native-audio-dialog': {
    id: 'gemini-2.5-flash-native-audio-dialog',
    name: 'Gemini 2.5 Flash Native Audio Dialog',
    categoryLabel: 'Native Audio Dialogue (Default)',
    inputModalities: ['audio', 'text'],
    outputModalities: ['audio', 'text'],
    supportsVoiceConversation: true,
    supportsTranslation: true,
    supportsTranscription: true,
    supportsTools: true,
    supportsThinking: false,
    latencyCategory: 'Low (~350ms)',
    description: 'Premier native-audio conversational model with direct bidirectional speech streaming, approved tool calling, and low-latency acoustic responses.',
    isRecommendedDefault: true
  },
  'gemini-3-flash-live': {
    id: 'gemini-3-flash-live',
    name: 'Gemini 3 Flash Live',
    categoryLabel: 'High-Throughput Live Voice',
    inputModalities: ['audio', 'text'],
    outputModalities: ['audio', 'text'],
    supportsVoiceConversation: true,
    supportsTranslation: true,
    supportsTranscription: true,
    supportsTools: true,
    supportsThinking: false,
    latencyCategory: 'Ultra-Low (~200ms)',
    description: 'Ultra-low-latency real-time voice streaming with accelerated turn taking and hands-free conversational flow.'
  },
  'gemini-3.5-live-translate': {
    id: 'gemini-3.5-live-translate',
    name: 'Gemini 3.5 Live Translate',
    categoryLabel: 'Live Multilingual Translation',
    inputModalities: ['audio', 'text'],
    outputModalities: ['audio', 'text'],
    supportsVoiceConversation: false,
    supportsTranslation: true,
    supportsTranscription: true,
    supportsTools: false,
    supportsThinking: false,
    latencyCategory: 'Low (~350ms)',
    description: 'Specialized for simultaneous voice translation across multiple languages. Not configured for general autonomous assistant directives.'
  },
  'gemini-3.5-transcribe-live': {
    id: 'gemini-3.5-transcribe-live',
    name: 'Gemini 3.5 Transcribe Live',
    categoryLabel: 'Live Speech-to-Text Transcription',
    inputModalities: ['audio'],
    outputModalities: ['text'],
    supportsVoiceConversation: false,
    supportsTranslation: false,
    supportsTranscription: true,
    supportsTools: false,
    supportsThinking: false,
    latencyCategory: 'Ultra-Low (~200ms)',
    description: 'High-accuracy real-time speech-to-text transcription. Outputs live transcripts only (no synthetic spoken voice output).'
  },
  'gemini-3.8-live': {
    id: 'gemini-3.8-live',
    name: 'Gemini 3.8 Live',
    categoryLabel: 'Extended Context Live Dialogue',
    inputModalities: ['audio', 'text'],
    outputModalities: ['audio', 'text'],
    supportsVoiceConversation: true,
    supportsTranslation: true,
    supportsTranscription: true,
    supportsTools: true,
    supportsThinking: false,
    latencyCategory: 'Standard (~450ms)',
    description: 'Advanced live conversational model with deep context retention and complex tool orchestrations.'
  },
  'gemini-3.8-live-extended-thinking': {
    id: 'gemini-3.8-live-extended-thinking',
    name: 'Gemini 3.8 Live Extended Thinking',
    categoryLabel: 'Live Voice with Deep Reasoning',
    inputModalities: ['audio', 'text'],
    outputModalities: ['audio', 'text'],
    supportsVoiceConversation: true,
    supportsTranslation: true,
    supportsTranscription: true,
    supportsTools: true,
    supportsThinking: true,
    latencyCategory: 'Extended (~900ms)',
    description: 'Live dialogue paired with extended internal reasoning before synthesis. Latency is higher; ideal for complex architectural questions.'
  }
};

export const DEFAULT_LIVE_MODEL_ID = 'gemini-2.5-flash-native-audio-dialog';

export interface AiConfig {
  textModel: string;
  liveModel: string;
  embeddingModel: string;
}

export const AI_CONFIG: AiConfig = {
  textModel: "gemma-4-26b-a4b-it",
  liveModel: DEFAULT_LIVE_MODEL_ID,
  embeddingModel: "text-embedding-004"
};

export const AVAILABLE_MODELS: ModelDefinition[] = [
  {
    id: "gemma-4-26b-a4b-it",
    name: "Gemma 4 26B Instruct",
    category: "text",
    description: "Google's high-capacity Gemma 4 instruction model with generous quota for text reasoning, summarization, and direct command execution.",
    capabilities: {
      textReasoning: true,
      toolRouting: true,
      searchSummarization: true,
      liveAudio: false,
      vision: false,
    },
    recommendedFor: "Default model: high-speed text reasoning, commands & tool routing",
    quotaTier: "High"
  },
  {
    id: "gemma-4-31b-it",
    name: "Gemma 4 31B Instruct",
    category: "text",
    description: "Flagship Gemma 4 model with maximum parameter capacity for nuanced reasoning and complex multi-step instructions.",
    capabilities: {
      textReasoning: true,
      toolRouting: true,
      searchSummarization: true,
      liveAudio: false,
      vision: false,
    },
    recommendedFor: "Complex reasoning & deep analytical queries",
    quotaTier: "High"
  },
  {
    id: "gemma-2-27b-it",
    name: "Gemma 2 27B Instruct",
    category: "text",
    description: "Google's powerful open-weights language model optimized for conversational reasoning and exact answers.",
    capabilities: {
      textReasoning: true,
      toolRouting: true,
      searchSummarization: true,
      liveAudio: false,
      vision: false,
    },
    recommendedFor: "Concise responses & open weights reasoning",
    quotaTier: "High"
  },
  {
    id: "gemma-2-9b-it",
    name: "Gemma 2 9B Instruct",
    category: "text",
    description: "Ultra-lean Gemma model optimized for low-latency command parsing and instant responses.",
    capabilities: {
      textReasoning: true,
      toolRouting: true,
      searchSummarization: true,
      liveAudio: false,
      vision: false,
    },
    recommendedFor: "Ultra-fast response times & lightweight operations",
    quotaTier: "High"
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    category: "text",
    description: "Ultra-fast flagship model with exceptional reasoning, low latency, and direct response generation.",
    capabilities: {
      textReasoning: true,
      toolRouting: true,
      searchSummarization: true,
      liveAudio: false,
      vision: true,
    },
    recommendedFor: "Instant voice commands, direct query answers & tool execution",
    quotaTier: "High"
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    category: "text",
    description: "Google's premier deep reasoning model for complex multifaceted problem solving.",
    capabilities: {
      textReasoning: true,
      toolRouting: true,
      searchSummarization: true,
      liveAudio: false,
      vision: true,
    },
    recommendedFor: "Complex academic problem solving & deep research",
    quotaTier: "Standard"
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    category: "text",
    description: "High-throughput turbo model designed for quick responses and lightweight tasks.",
    capabilities: {
      textReasoning: true,
      toolRouting: true,
      searchSummarization: true,
      liveAudio: false,
      vision: true,
    },
    recommendedFor: "Fast text operations & rapid summaries",
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
  const saved = localStorage.getItem('focusforge-selected-text-model') || localStorage.getItem('gemini-model');
  if (!saved || saved.includes('1.5-flash') || saved.includes('1.5-pro')) {
    return AI_CONFIG.textModel;
  }
  return saved;
}

export function setSelectedTextModel(modelId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('focusforge-selected-text-model', modelId);
  localStorage.setItem('gemini-model', modelId); // sync for backward compatibility
  window.dispatchEvent(new CustomEvent('ai-model-changed', { detail: { textModel: modelId } }));
}

export function getSelectedLiveModel(): string {
  if (typeof window === 'undefined') return DEFAULT_LIVE_MODEL_ID;
  const saved = localStorage.getItem('focusforge-selected-live-model');
  if (saved && LIVE_MODELS_MAP[saved]) {
    return saved;
  }
  return DEFAULT_LIVE_MODEL_ID;
}

export function setSelectedLiveModel(modelId: string): void {
  if (typeof window === 'undefined') return;
  const validId = LIVE_MODELS_MAP[modelId] ? modelId : DEFAULT_LIVE_MODEL_ID;
  localStorage.setItem('focusforge-selected-live-model', validId);
  window.dispatchEvent(new CustomEvent('ai-model-changed', { detail: { liveModel: validId } }));
  window.dispatchEvent(new CustomEvent('jarvis-live-model-changed', { detail: { modelId: validId } }));
}

export function getLiveModelCapabilities(modelId: string): LiveModelCapabilities {
  return LIVE_MODELS_MAP[modelId] || LIVE_MODELS_MAP[DEFAULT_LIVE_MODEL_ID];
}

export function validateLiveModelCompatibility(modelId: string, requiredCapability: 'speechOutput' | 'tools' | 'translation' | 'thinking'): boolean {
  const caps = getLiveModelCapabilities(modelId);
  switch (requiredCapability) {
    case 'speechOutput':
      return caps.outputModalities.includes('audio');
    case 'tools':
      return caps.supportsTools;
    case 'translation':
      return caps.supportsTranslation;
    case 'thinking':
      return caps.supportsThinking;
    default:
      return true;
  }
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

