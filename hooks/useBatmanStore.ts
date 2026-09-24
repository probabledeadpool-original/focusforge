import { create } from 'zustand';

export type HudStatus = 
  | 'STANDBY' 
  | 'ACQUIRING' 
  | 'LOCKED_IN' 
  | 'AI_ANALYZING' 
  | 'EXECUTING' 
  | 'STREAMING_AUDIO' 
  | 'SPOT_SYNCED';

export type BatmanIntroPhase = 
  | 'idle' 
  | 'blurring' 
  | 'blank_delay' 
  | 'animating_intro' 
  | 'active';

export type BatmanActiveModule = 
  | 'voice_core' 
  | 'tasks' 
  | 'media' 
  | 'spot' 
  | 'timer' 
  | 'intel' 
  | 'ledger' 
  | 'notes' 
  | 'terminal';

export interface SpotRoom {
  id: string;
  name: string;
  location: string;
  ambiance: string;
  activeUsers: number;
  frequency: string;
  videoBg?: string;
}

export const SPOT_ROOMS: SpotRoom[] = [
  { id: 'tokyo-cyberpunk', name: 'Shinjuku Neon Tower', location: 'Tokyo, Japan', ambiance: 'Midnight Rain & Cyber Synth', activeUsers: 48, frequency: '432Hz Binaural' },
  { id: 'kyoto-zen', name: 'Arashiyama Bamboo Forest', location: 'Kyoto, Japan', ambiance: 'Rain on Stone & Warm Wind', activeUsers: 29, frequency: '528Hz Miracle DNA' },
  { id: 'manhattan-loft', name: 'Hudson Yards High-Rise', location: 'New York, USA', ambiance: 'Deep Work Storm & Lo-Fi Jazz', activeUsers: 63, frequency: 'ALPHA Wave 10Hz' },
  { id: 'orbital-iss', name: 'Cupola Observation Module', location: 'Low Earth Orbit (418km)', ambiance: 'Cosmic White Noise & Earth Drone', activeUsers: 14, frequency: 'Deep Space THETA' },
  { id: 'maybach-atelier', name: 'Maybach Sovereign Lounge', location: 'Geneva, Switzerland', ambiance: 'Analog Master Audio & Silence', activeUsers: 37, frequency: 'Analog Master Flat' },
];

interface BatmanStore {
  isBatmanMode: boolean;
  introPhase: BatmanIntroPhase;
  hudStatus: HudStatus;
  activeModule: BatmanActiveModule;
  targetFocus: string;
  lockInStartTime: number | null;
  voiceTranscript: string;
  aiResponse: string;
  isListening: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  activeSpotId: string;
  isPiPEnabled: boolean;
  tacticalSearchQuery: string;
  
  // Actions
  setBatmanMode: (active: boolean) => void;
  toggleBatmanMode: (active?: boolean) => void;
  setIntroPhase: (phase: BatmanIntroPhase) => void;
  setHudStatus: (status: HudStatus) => void;
  setActiveModule: (module: BatmanActiveModule) => void;
  setTargetFocus: (target: string) => void;
  setActiveSpotId: (spotId: string) => void;
  setIsPiPEnabled: (enabled: boolean) => void;
  setTacticalSearchQuery: (query: string) => void;
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
  introPhase: 'idle',
  hudStatus: 'STANDBY',
  activeModule: 'voice_core',
  targetFocus: 'DEEP WORK FOCUS DIRECTIVE // ALPHA',
  lockInStartTime: null,
  voiceTranscript: '',
  aiResponse: '',
  isListening: false,
  isSpeaking: false,
  audioLevel: 0,
  activeSpotId: 'tokyo-cyberpunk',
  isPiPEnabled: false,
  tacticalSearchQuery: '',

  setBatmanMode: (active: boolean) => {
    if (active) {
      // Begin 3-stage cinematic transition: Blurring -> Blank 2s -> Intro Animation -> Active
      set({
        isBatmanMode: true,
        introPhase: 'blurring',
        lockInStartTime: get().lockInStartTime || Date.now(),
        hudStatus: 'LOCKED_IN',
      });
    } else {
      set({
        isBatmanMode: false,
        introPhase: 'idle',
        hudStatus: 'STANDBY',
      });
    }
  },

  toggleBatmanMode: (active?: boolean) => {
    const next = active !== undefined ? active : !get().isBatmanMode;
    get().setBatmanMode(next);
  },

  setIntroPhase: (phase: BatmanIntroPhase) => set({ introPhase: phase }),
  setHudStatus: (status: HudStatus) => set({ hudStatus: status }),
  setActiveModule: (module: BatmanActiveModule) => set({ activeModule: module }),
  setTargetFocus: (target: string) => set({ targetFocus: target }),
  setActiveSpotId: (spotId: string) => set({ activeSpotId: spotId }),
  setIsPiPEnabled: (enabled: boolean) => set({ isPiPEnabled: enabled }),
  setTacticalSearchQuery: (query: string) => set({ tacticalSearchQuery: query }),
  
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
