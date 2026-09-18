"use client";

import { create } from 'zustand';
import { jarvisAudio } from '../lib/jarvisAudio';
import { VoicePhase, VoiceStateData, jarvisVoiceEngine } from '../lib/jarvisVoiceEngine';
import '../lib/jarvisCommandDispatcher';

export type JarvisAiState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'executing';
export type JarvisDisplayMode = 'minimized' | 'expanded' | 'fullscreen';

export interface JarvisMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'action';
  text: string;
  actionSummary?: string;
  timestamp: number;
}

interface JarvisStore {
  // 3 Unified Display Modes
  isOpen: boolean;
  displayMode: JarvisDisplayMode;
  isMinimized: boolean;
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
  isOpen: false,
  displayMode: 'fullscreen',
  isMinimized: false,
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
      aiState: 'listening' 
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
    set({ isOpen: false, isListening: false, isSpeaking: false, aiState: 'idle' });
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
    set({ isHotwordEnabled });
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
  addMessage: (msg) => set((state) => ({
    messages: [
      ...state.messages,
      {
        ...msg,
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp: Date.now(),
      }
    ]
  })),
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

  (window as any).__jarvisStore = useJarvisStore;

  window.addEventListener('jarvis-auto-minimize', () => {
    const s = useJarvisStore.getState();
    if (s.isOpen && s.displayMode === 'fullscreen') {
      s.setDisplayMode('minimized');
    }
  });
}

