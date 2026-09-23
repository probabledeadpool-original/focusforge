"use client";

import { create } from 'zustand';
import { jarvisAudio } from '../lib/jarvisAudio';
import { VoicePhase, VoiceStateData, jarvisVoiceEngine } from '../lib/jarvisVoiceEngine';
import { LivePhase, LiveTelemetry, jarvisLiveEngine } from '../lib/jarvisLiveEngine';
import '../lib/jarvisCommandDispatcher';

export type JarvisMode = 'STANDBY' | 'WAKE_WORD' | 'NORMAL_COMMAND' | 'LIVE';
export type JarvisAiState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'executing';
export type JarvisDisplayMode = 'minimized' | 'expanded' | 'fullscreen';

import type { YouTubeSearchResult } from '../lib/youtubeSearch';
import type { 
  WeatherData, 
  NewsData, 
  EarthquakeData, 
  IssData, 
  NasaApodData, 
  CryptoData, 
  FxData, 
  WatchlistData, 
  PortfolioData 
} from '../lib/intelligence/types';

export interface StockSpotData {
  symbol: string;
  name?: string;
  exchange?: string;
}

export interface TaskSpotData {
  tasks: { id: string; title: string; done?: boolean }[];
}

export interface TimerSpotData {
  minutes: number;
  label?: string;
}

export interface JarvisMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'action';
  text: string;
  actionSummary?: string;
  timestamp: number;
  mediaResults?: YouTubeSearchResult[];
  stockData?: StockSpotData;
  taskData?: TaskSpotData;
  timerData?: TimerSpotData;
  weatherData?: WeatherData;
  newsData?: NewsData;
  earthquakeData?: EarthquakeData;
  issData?: IssData;
  nasaData?: NasaApodData;
  cryptoData?: CryptoData;
  fxData?: FxData;
  watchlistData?: WatchlistData;
  portfolioData?: PortfolioData;
}

interface JarvisStore {
  // Mode Isolation Architecture
  jarvisMode: JarvisMode;
  setJarvisMode: (mode: JarvisMode) => void;

  // 3 Unified Display Modes
  isOpen: boolean;
  displayMode: JarvisDisplayMode;
  isMinimized: boolean;
  keepHudOpen: boolean;
  setKeepHudOpen: (keep: boolean) => void;
  setDisplayMode: (mode: JarvisDisplayMode) => void;
  setIsOpen: (open: boolean) => void;
  setIsMinimized: (minimized: boolean) => void;
  openJarvis: (initialPrompt?: string, mode?: JarvisDisplayMode) => void;
  closeJarvis: () => void;
  toggleJarvis: () => void;

  // Single Source of Truth for Voice State Machine
  phase: VoicePhase;
  voiceState: VoicePhase; // backwards compatibility alias
  telemetry: VoiceStateData;
  setVoiceStateData: (data: VoiceStateData) => void;

  // Live Conversation Mode State Machine
  livePhase: LivePhase;
  liveTelemetry: LiveTelemetry;
  isLiveActive: boolean;
  isLiveOverlayOpen: boolean;
  setIsLiveOverlayOpen: (open: boolean) => void;
  startLiveMode: (modelId?: string) => Promise<boolean>;
  stopLiveMode: () => void;
  toggleLiveMode: () => void;
  toggleLiveMute: () => void;
  interruptLive: () => void;

  // Derived legacy helper states
  aiState: JarvisAiState;
  setAiState: (state: JarvisAiState) => void;
  isListening: boolean;
  setIsListening: (listening: boolean) => void;
  isSpeaking: boolean;
  setIsSpeaking: (speaking: boolean) => void;

  // Hotword Detection State
  isHotwordEnabled: boolean;
  isHotwordActive: boolean;
  hotwordName: string;
  setIsHotwordEnabled: (enabled: boolean) => void;
  setIsHotwordActive: (active: boolean) => void;
  setHotwordName: (name: string) => void;

  // Voice Customization
  voiceFeedbackEnabled: boolean;
  voiceRate: number;
  voicePitch: number;
  voiceGender: 'male' | 'female';
  setVoiceFeedbackEnabled: (enabled: boolean) => void;
  setVoiceRate: (rate: number) => void;
  setVoicePitch: (pitch: number) => void;
  setVoiceGender: (gender: 'male' | 'female') => void;

  // Conversation & Subtitles
  currentTranscript: string;
  setCurrentTranscript: (transcript: string) => void;
  messages: JarvisMessage[];
  addMessage: (message: Omit<JarvisMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;

  // Last Executed Action
  lastAction: string | null;
  setLastAction: (action: string | null) => void;
}

export const useJarvisStore = create<JarvisStore>((set, get) => ({
  jarvisMode: 'WAKE_WORD',
  setJarvisMode: (jarvisMode) => {
    set({ jarvisMode });
    if (jarvisMode === 'LIVE') {
      jarvisVoiceEngine.stopWakeWordDetection();
    } else if (jarvisMode === 'WAKE_WORD' && get().isHotwordEnabled) {
      jarvisVoiceEngine.startWakeWordDetection();
    }
  },

  isOpen: false,
  displayMode: 'fullscreen',
  isMinimized: false,
  keepHudOpen: false,
  setKeepHudOpen: (keepHudOpen) => set({ keepHudOpen }),
  setDisplayMode: (displayMode) => {
    const isMinimized = displayMode === 'minimized';
    set({ displayMode, isMinimized, isOpen: true });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jarvis-display-mode', { detail: { mode: displayMode } }));
    }
  },
  setIsOpen: (isOpen) => {
    if (isOpen) {
      jarvisAudio.playActivate();
    } else {
      jarvisAudio.playDeactivate();
      jarvisVoiceEngine.cancelCurrentAction();
    }
    set({ isOpen });
  },
  setIsMinimized: (isMinimized) => {
    const displayMode: JarvisDisplayMode = isMinimized ? 'minimized' : 'fullscreen';
    set({ isMinimized, displayMode });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jarvis-display-mode', { detail: { mode: displayMode } }));
    }
  },
  openJarvis: (initialPrompt, targetMode) => {
    jarvisAudio.playActivate();
    const mode = targetMode || 'fullscreen';
    set({ 
      isOpen: true, 
      displayMode: mode, 
      isMinimized: mode === 'minimized', 
      aiState: 'listening',
      jarvisMode: 'NORMAL_COMMAND'
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jarvis-display-mode', { detail: { mode } }));
    }
    if (initialPrompt) {
      get().addMessage({ role: 'user', text: initialPrompt });
      jarvisVoiceEngine.commitCommand(initialPrompt);
    } else {
      jarvisVoiceEngine.startCommandListening();
    }
  },
  closeJarvis: () => {
    jarvisAudio.playDeactivate();
    jarvisVoiceEngine.cancelCurrentAction();
    set({ 
      isOpen: false, 
      isListening: false, 
      isSpeaking: false, 
      aiState: 'idle',
      jarvisMode: get().isHotwordEnabled ? 'WAKE_WORD' : 'STANDBY'
    });
    if (get().isHotwordEnabled) {
      jarvisVoiceEngine.startWakeWordDetection();
    }
  },
  toggleJarvis: () => {
    const nextState = !get().isOpen;
    if (nextState) {
      get().openJarvis();
    } else {
      get().closeJarvis();
    }
  },

  phase: 'IDLE',
  voiceState: 'IDLE',
  telemetry: jarvisVoiceEngine.getStateData(),
  setVoiceStateData: (telemetry) => set({ 
    phase: telemetry.phase, 
    voiceState: telemetry.phase, 
    telemetry 
  }),

  // Live Mode State & Methods
  livePhase: 'IDLE',
  liveTelemetry: jarvisLiveEngine.getTelemetry(),
  isLiveActive: false,
  isLiveOverlayOpen: false,
  setIsLiveOverlayOpen: (isLiveOverlayOpen) => set({ isLiveOverlayOpen }),

  startLiveMode: async (modelId) => {
    // 1. Disengage wake-word mode so microphone is exclusively owned by Live session
    jarvisVoiceEngine.stopWakeWordDetection();
    jarvisVoiceEngine.stopCommandListening();
    jarvisAudio.playActivate();

    set({ 
      jarvisMode: 'LIVE', 
      isLiveActive: true, 
      isLiveOverlayOpen: true,
      isOpen: false // Close legacy HUD when entering full Live mode
    });

    const success = await jarvisLiveEngine.startLiveSession(modelId);
    if (!success) {
      jarvisAudio.playDeactivate();
    }
    return success;
  },

  stopLiveMode: () => {
    jarvisLiveEngine.exitLiveSession();
    jarvisAudio.playDeactivate();
    const nextMode: JarvisMode = get().isHotwordEnabled ? 'WAKE_WORD' : 'STANDBY';
    set({ 
      jarvisMode: nextMode, 
      isLiveActive: false, 
      isLiveOverlayOpen: false 
    });
    if (get().isHotwordEnabled) {
      jarvisVoiceEngine.startWakeWordDetection();
    }
  },

  toggleLiveMode: () => {
    if (get().isLiveActive || get().jarvisMode === 'LIVE') {
      get().stopLiveMode();
    } else {
      get().startLiveMode();
    }
  },

  toggleLiveMute: () => {
    jarvisLiveEngine.toggleMute();
  },

  interruptLive: () => {
    jarvisLiveEngine.stopSpeaking();
  },

  aiState: 'idle',
  setAiState: (aiState) => set({ aiState }),
  isListening: false,
  setIsListening: (isListening) => set({ isListening }),
  isSpeaking: false,
  setIsSpeaking: (isSpeaking) => set({ isSpeaking }),

  isHotwordEnabled: true,
  isHotwordActive: false,
  hotwordName: 'JARVIS',
  setIsHotwordEnabled: (isHotwordEnabled) => {
    jarvisVoiceEngine.setWakeWordEnabled(isHotwordEnabled);
    set({ 
      isHotwordEnabled,
      jarvisMode: isHotwordEnabled ? 'WAKE_WORD' : 'STANDBY'
    });
  },
  setIsHotwordActive: (isHotwordActive) => set({ isHotwordActive }),
  setHotwordName: (hotwordName) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jarvis-hotword-name', hotwordName);
    }
    set({ hotwordName });
  },

  voiceFeedbackEnabled: true,
  voiceRate: 1.05,
  voicePitch: 1.0,
  voiceGender: 'male',
  setVoiceFeedbackEnabled: (voiceFeedbackEnabled) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jarvis-voice-feedback', String(voiceFeedbackEnabled));
    }
    set({ voiceFeedbackEnabled });
  },
  setVoiceRate: (voiceRate) => set({ voiceRate }),
  setVoicePitch: (voicePitch) => set({ voicePitch }),
  setVoiceGender: (voiceGender) => set({ voiceGender }),

  currentTranscript: '',
  setCurrentTranscript: (currentTranscript) => set({ currentTranscript }),
  messages: [
    {
      id: 'init-1',
      role: 'assistant',
      text: "J.A.R.V.I.S. neural link online. Say 'JARVIS' or speak your command.",
      timestamp: Date.now(),
    }
  ],
  addMessage: (msg) => set((state) => {
    // Detect if this incoming message includes rich interactive Spot UI data
    const hasSpotData = Boolean(
      (msg.mediaResults && msg.mediaResults.length > 0) ||
      msg.stockData ||
      msg.taskData ||
      msg.weatherData ||
      msg.newsData ||
      msg.earthquakeData ||
      msg.issData ||
      msg.nasaData ||
      msg.cryptoData ||
      msg.fxData ||
      msg.watchlistData ||
      msg.portfolioData
    );

    // If in minimized mode or closed, automatically open & expand to fullscreen HUD
    const shouldAutoExpand = hasSpotData && (state.isMinimized || state.displayMode === 'minimized' || !state.isOpen);

    if (shouldAutoExpand && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jarvis-display-mode', { detail: { mode: 'fullscreen' } }));
    }

    return {
      messages: [
        ...state.messages,
        {
          ...msg,
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          timestamp: Date.now(),
        }
      ],
      ...(shouldAutoExpand ? { isOpen: true, isMinimized: false, displayMode: 'fullscreen' } : {})
    };
  }),
  clearMessages: () => set({
    messages: [
      {
        id: `init-${Date.now()}`,
        role: 'assistant',
        text: 'Command telemetry cleared. Awaiting your next directive.',
        timestamp: Date.now(),
      }
    ]
  }),

  lastAction: null,
  setLastAction: (lastAction) => set({ lastAction }),
}));

// Sync global store with engine state changes
if (typeof window !== 'undefined') {
  jarvisVoiceEngine.subscribe((stateData: VoiceStateData) => {
    const { phase } = stateData;

    // Map VoicePhase to legacy aiState & flags for backwards compatibility
    let aiState: JarvisAiState = 'idle';
    let isListening = false;
    let isSpeaking = false;

    switch (phase) {
      case 'WAKE_WORD_LISTENING':
        aiState = 'idle';
        break;
      case 'WAKE_WORD_DETECTED':
      case 'LISTENING_FOR_COMMAND':
        aiState = 'listening';
        isListening = true;
        break;
      case 'PROCESSING_COMMAND':
        aiState = 'thinking';
        break;
      case 'EXECUTING_TOOL':
        aiState = 'executing';
        break;
      case 'SPEAKING_RESPONSE':
        aiState = 'speaking';
        isSpeaking = true;
        break;
      case 'ERROR':
        aiState = 'idle';
        break;
    }

    useJarvisStore.setState({
      phase,
      voiceState: phase,
      telemetry: stateData,
      aiState,
      isListening,
      isSpeaking,
      isHotwordActive: phase === 'WAKE_WORD_LISTENING'
    });
  });

  // Sync Live engine telemetry
  jarvisLiveEngine.subscribe((liveData: LiveTelemetry) => {
    useJarvisStore.setState({
      livePhase: liveData.phase,
      liveTelemetry: liveData,
      isLiveActive: liveData.phase !== 'IDLE' && liveData.phase !== 'EXITING_LIVE'
    });
  });

  (window as any).__jarvisStore = useJarvisStore;

  window.addEventListener('jarvis-auto-minimize', () => {
    const s = useJarvisStore.getState();
    const lastMsg = s.messages[s.messages.length - 1];
    
    // If the latest message has interactive Spot UI content, DO NOT auto-minimize so user can interact!
    const hasSpotContent = lastMsg && (
      lastMsg.mediaResults ||
      lastMsg.stockData ||
      lastMsg.taskData ||
      lastMsg.weatherData ||
      lastMsg.newsData ||
      lastMsg.earthquakeData ||
      lastMsg.issData ||
      lastMsg.nasaData ||
      lastMsg.cryptoData ||
      lastMsg.fxData ||
      lastMsg.watchlistData ||
      lastMsg.portfolioData
    );

    if (hasSpotContent) {
      // Keep HUD open for seamless interaction
      return;
    }

    // Otherwise, maintain user view
    if (s.isOpen && s.displayMode === 'fullscreen' && !s.keepHudOpen) {
      s.setDisplayMode('minimized');
    }
  });
}


