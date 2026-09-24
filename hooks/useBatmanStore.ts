import { create } from 'zustand';

export type HudStatus = 'STANDBY' | 'ACQUIRING' | 'LOCKED_IN' | 'AI_ANALYZING' | 'EXECUTING' | 'STREAMING_AUDIO';

export type HudContextCard = 
  | 'none' 
  | 'voice' 
  | 'frequency' 
  | 'tasks' 
  | 'intel' 
  | 'timer' 
  | 'system' 
  | 'notes' 
  | 'shelf';

interface BatmanStore {
  isBatmanMode: boolean;
  hudStatus: HudStatus;
  activeContextCard: HudContextCard;
  targetFocus: string;
  lockInStartTime: number | null;
  voiceTranscript: string;
  aiResponse: string;
  isListening: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  
  // Actions
  setBatmanMode: (active: boolean) => void;
  toggleBatmanMode: (active?: boolean) => void;
  setHudStatus: (status: HudStatus) => void;
  setActiveContextCard: (card: HudContextCard) => void;
  setTargetFocus: (target: string) => void;
  setVoiceTelemetry: (data: {
    transcript?: string;
    aiResponse?: string;
    isListening?: boolean;
    isSpeaking?: boolean;
    audioLevel?: number;
  }) => void;
  resetLockInTimer: () => void;
}

export const useBatmanStore = create<BatmanStore>((set, get) => ({
  isBatmanMode: false,
  hudStatus: 'STANDBY',
  activeContextCard: 'voice',
  targetFocus: 'DEEP WORK FOCUS DIRECTIVE // ALPHA',
  lockInStartTime: null,
  voiceTranscript: '',
  aiResponse: '',
  isListening: false,
  isSpeaking: false,
  audioLevel: 0,

  setBatmanMode: (active: boolean) => {
    set({
      isBatmanMode: active,
      lockInStartTime: active ? (get().lockInStartTime || Date.now()) : null,
      hudStatus: active ? 'LOCKED_IN' : 'STANDBY',
    });
  },

  toggleBatmanMode: (active?: boolean) => {
    const next = active !== undefined ? active : !get().isBatmanMode;
    set({
      isBatmanMode: next,
      lockInStartTime: next ? (get().lockInStartTime || Date.now()) : null,
      hudStatus: next ? 'LOCKED_IN' : 'STANDBY',
    });
  },

  setHudStatus: (status: HudStatus) => set({ hudStatus: status }),
  setActiveContextCard: (card: HudContextCard) => set({ activeContextCard: card }),
  setTargetFocus: (target: string) => set({ targetFocus: target }),
  
  setVoiceTelemetry: (data) => set((state) => ({
    ...state,
    voiceTranscript: data.transcript !== undefined ? data.transcript : state.voiceTranscript,
    aiResponse: data.aiResponse !== undefined ? data.aiResponse : state.aiResponse,
    isListening: data.isListening !== undefined ? data.isListening : state.isListening,
    isSpeaking: data.isSpeaking !== undefined ? data.isSpeaking : state.isSpeaking,
    audioLevel: data.audioLevel !== undefined ? data.audioLevel : state.audioLevel,
  })),

  resetLockInTimer: () => set({ lockInStartTime: Date.now() }),
}));
