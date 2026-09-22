import { PortfolioHolding, PortfolioData } from './types';
import { fetchCryptoMarkets } from './cryptoAdapter';

const STORAGE_KEY = 'focusforge-portfolio-holdings';

const DEFAULT_HOLDINGS: PortfolioHolding[] = [
  {
    id: 'hold_btc',
    symbol: 'BINANCE:BTCUSDT',
    name: 'Bitcoin',
    category: 'crypto',
    quantity: 0.45,
    buyPrice: 84000,
    currentPrice: 91420,
    currentValue: 41139,
    costBasis: 37800,
    pnl: 3339,
    pnlPercent: 8.83,
    allocationPercent: 62.4,
    updatedAt: Date.now()
  },
  {
    id: 'hold_eth',
    symbol: 'BINANCE:ETHUSDT',
    name: 'Ethereum',
    category: 'crypto',
    quantity: 4.2,
    buyPrice: 3100,
    currentPrice: 3410,
    currentValue: 14322,
    costBasis: 13020,
    pnl: 1302,
    pnlPercent: 10.0,
    allocationPercent: 21.7,
    updatedAt: Date.now()
  },
  {
    id: 'hold_sol',
    symbol: 'BINANCE:SOLUSDT',
    name: 'Solana',
    category: 'crypto',
    quantity: 48,
    buyPrice: 175,
    currentPrice: 218.75,
    currentValue: 10500,
    costBasis: 8400,
    pnl: 2100,
    pnlPercent: 25.0,
    allocationPercent: 15.9,
    updatedAt: Date.now()
  }
];

export async function getPortfolioData(): Promise<PortfolioData> {
  let holdings: PortfolioHolding[] = [];
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        holdings = JSON.parse(raw);
      } else {
        holdings = DEFAULT_HOLDINGS;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_HOLDINGS));
      }
    } catch (e) {
      holdings = DEFAULT_HOLDINGS;
    }
  } else {
    holdings = DEFAULT_HOLDINGS;
  }

  // Refresh live prices where available from Crypto markets
  try {
    const marketData = await fetchCryptoMarkets('usd').catch(() => null);
    if (marketData && marketData.coins) {
      holdings = holdings.map((h) => {
        const symbolClean = h.symbol.replace(/^(BINANCE:|NASDAQ:|FX:|TVC:)/, '').replace(/USDT?$/, '').toLowerCase();
        const liveCoin = marketData.coins.find(
          (c) => c.symbol.toLowerCase() === symbolClean || c.name.toLowerCase() === h.name.toLowerCase()
        );
        const currentPrice = liveCoin ? liveCoin.current_price : h.currentPrice;
        const currentValue = Math.round(currentPrice * h.quantity * 100) / 100;
        const costBasis = Math.round(h.buyPrice * h.quantity * 100) / 100;
        const pnl = Math.round((currentValue - costBasis) * 100) / 100;
        const pnlPercent = costBasis > 0 ? Math.round(((currentValue - costBasis) / costBasis) * 10000) / 100 : 0;

        return {
          ...h,
          currentPrice,
          currentValue,
          costBasis,
          pnl,
          pnlPercent
        };
      });
    }
  } catch (e) {}

  const totalValue = Math.round(holdings.reduce((sum, h) => sum + h.currentValue, 0) * 100) / 100;
  const totalCost = Math.round(holdings.reduce((sum, h) => sum + h.costBasis, 0) * 100) / 100;
  const totalPnl = Math.round((totalValue - totalCost) * 100) / 100;
  const totalPnlPercent = totalCost > 0 ? Math.round(((totalValue - totalCost) / totalCost) * 10000) / 100 : 0;

  // Compute allocation percentages
  const computedHoldings = holdings.map((h) => ({
    ...h,
    allocationPercent: totalValue > 0 ? Math.round((h.currentValue / totalValue) * 1000) / 10 : 0
  }));

  return {
    holdings: computedHoldings,
    totalValue,
    totalCost,
    totalPnl,
    totalPnlPercent,
    baseCurrency: 'USD',
    lastUpdated: Date.now()
  };
}

export function saveHolding(holding: Omit<PortfolioHolding, 'id' | 'currentValue' | 'costBasis' | 'pnl' | 'pnlPercent' | 'allocationPercent' | 'updatedAt'> & { id?: string }): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let list: PortfolioHolding[] = raw ? JSON.parse(raw) : DEFAULT_HOLDINGS;

    const currentValue = holding.currentPrice * holding.quantity;
    const costBasis = holding.buyPrice * holding.quantity;
    const pnl = currentValue - costBasis;
    const pnlPercent = costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0;

    if (holding.id) {
      list = list.map((item) =>
        item.id === holding.id
          ? {
              ...item,
              ...holding,
              currentValue,
              costBasis,
              pnl,
              pnlPercent,
              allocationPercent: 0,
              updatedAt: Date.now()
            }
          : item
      );
    } else {
      const newHolding: PortfolioHolding = {
        id: `pos_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        symbol: holding.symbol,
        name: holding.name,
        category: holding.category,
        quantity: holding.quantity,
        buyPrice: holding.buyPrice,
        currentPrice: holding.currentPrice,
        currentValue,
        costBasis,
        pnl,
        pnlPercent,
        allocationPercent: 0,
        updatedAt: Date.now()
      };
      list = [newHolding, ...list];
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {}
}

export function deleteHolding(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const list: PortfolioHolding[] = JSON.parse(raw);
    const updated = list.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}
}
