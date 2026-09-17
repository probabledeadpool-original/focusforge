import { create } from 'zustand';

interface MarketsStore {
  activeSymbol: string;
  setSymbol: (symbol: string) => void;
  isSearching: boolean;
  setIsSearching: (isSearching: boolean) => void;
}

export const useMarketsStore = create<MarketsStore>((set) => ({
  activeSymbol: 'BINANCE:BTCUSD',
  setSymbol: (symbol) => set({ activeSymbol: symbol }),
  isSearching: false,
  setIsSearching: (isSearching) => set({ isSearching })
}));
