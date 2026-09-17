import { create } from 'zustand';

interface AppStore {
  view: string;
  setView: (view: string) => void;
  timeLeft: number;
  setTimeLeft: (time: number | ((prev: number) => number)) => void;
  isRunning: boolean;
  setIsRunning: (isRunning: boolean) => void;
  activeTimer: any | null;
  setActiveTimer: (timer: any | null) => void;
  totalSegTime: number;
  setTotalSegTime: (time: number) => void;
  currentSegmentIndex: number;
  setCurrentSegmentIndex: (index: number) => void;
  totalSegments: number;
  setTotalSegments: (total: number) => void;
  maybachCoins: number;
  setMaybachCoins: (coins: number | ((prev: number) => number)) => void;
  totalMinutesFocused: number;
  setTotalMinutesFocused: (mins: number | ((prev: number) => number)) => void;
  isVideoPlaying: boolean;
  setIsVideoPlaying: (playing: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  view: 'home',
  setView: (view) => set({ view }),
  timeLeft: 0,
  setTimeLeft: (time) => set((state) => ({ 
    timeLeft: typeof time === 'function' ? time(state.timeLeft) : time 
  })),
  isRunning: false,
  setIsRunning: (isRunning) => set({ isRunning }),
  activeTimer: null,
  setActiveTimer: (activeTimer) => set({ activeTimer }),
  totalSegTime: 0,
  setTotalSegTime: (totalSegTime) => set({ totalSegTime }),
  currentSegmentIndex: 0,
  setCurrentSegmentIndex: (currentSegmentIndex) => set({ currentSegmentIndex }),
  totalSegments: 0,
  setTotalSegments: (totalSegments) => set({ totalSegments }),
  maybachCoins: 120,
  setMaybachCoins: (coins) => set((state) => ({
    maybachCoins: typeof coins === 'function' ? coins(state.maybachCoins) : coins
  })),
  totalMinutesFocused: 185,
  setTotalMinutesFocused: (mins) => set((state) => ({
    totalMinutesFocused: typeof mins === 'function' ? mins(state.totalMinutesFocused) : mins
  })),
  isVideoPlaying: false,
  setIsVideoPlaying: (isVideoPlaying) => set({ isVideoPlaying }),
}));
