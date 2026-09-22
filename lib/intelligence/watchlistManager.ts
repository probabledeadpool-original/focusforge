import { WatchlistItem, WatchlistData } from './types';

const STORAGE_KEY = 'focusforge-market-watchlist';

const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { id: '1', symbol: 'BINANCE:BTCUSDT', name: 'Bitcoin', ticker: 'BTC', category: 'crypto', price: 91420, change: 3.42 },
  { id: '2', symbol: 'BINANCE:ETHUSDT', name: 'Ethereum', ticker: 'ETH', category: 'crypto', price: 3410, change: 1.85 },
  { id: '3', symbol: 'BINANCE:SOLUSDT', name: 'Solana', ticker: 'SOL', category: 'crypto', price: 218.75, change: 7.12 },
  { id: '4', symbol: 'NASDAQ:NVDA', name: 'NVIDIA Corp', ticker: 'NVDA', category: 'tech', price: 145.80, change: 2.75 },
  { id: '5', symbol: 'NASDAQ:AAPL', name: 'Apple Inc', ticker: 'AAPL', category: 'tech', price: 232.50, change: 0.94 },
  { id: '6', symbol: 'NASDAQ:TSLA', name: 'Tesla Inc', ticker: 'TSLA', category: 'tech', price: 342.10, change: -2.15 },
  { id: '7', symbol: 'SP:SPX', name: 'S&P 500', ticker: 'SPX', category: 'indices', price: 5988.40, change: 0.62 },
  { id: '8', symbol: 'TVC:GOLD', name: 'Gold Spot', ticker: 'GOLD', category: 'indices', price: 2684.50, change: 0.42 },
];

export function getWatchlist(): WatchlistData {
  if (typeof window === 'undefined') {
    return { items: DEFAULT_WATCHLIST, baseCurrency: 'USD', lastUpdated: Date.now() };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_WATCHLIST));
      return { items: DEFAULT_WATCHLIST, baseCurrency: 'USD', lastUpdated: Date.now() };
    }
    const items = JSON.parse(raw);
    return { items: Array.isArray(items) ? items : DEFAULT_WATCHLIST, baseCurrency: 'USD', lastUpdated: Date.now() };
  } catch (e) {
    return { items: DEFAULT_WATCHLIST, baseCurrency: 'USD', lastUpdated: Date.now() };
  }
}

export function addToWatchlist(item: Omit<WatchlistItem, 'id'>): WatchlistData {
  const current = getWatchlist();
  const exists = current.items.some((i) => i.symbol.toUpperCase() === item.symbol.toUpperCase());
  if (exists) return current;

  const newItem: WatchlistItem = {
    ...item,
    id: `wl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  };

  const updatedItems = [newItem, ...current.items];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedItems));
  }
  return { items: updatedItems, baseCurrency: current.baseCurrency, lastUpdated: Date.now() };
}

export function removeFromWatchlist(symbolOrId: string): WatchlistData {
  const current = getWatchlist();
  const updatedItems = current.items.filter(
    (i) => i.id !== symbolOrId && i.symbol.toUpperCase() !== symbolOrId.toUpperCase()
  );
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedItems));
  }
  return { items: updatedItems, baseCurrency: current.baseCurrency, lastUpdated: Date.now() };
}

export function reorderWatchlist(items: WatchlistItem[]): WatchlistData {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
  return { items, baseCurrency: 'USD', lastUpdated: Date.now() };
}
