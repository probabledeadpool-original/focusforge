"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useMarketsStore } from '../../hooks/useMarketsStore';
import { useAuraIntegration } from '../../hooks/useAuraIntegration';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, TrendingUp, TrendingDown, BarChart3, Newspaper, Cpu, Globe, 
  Zap, Search, ChevronRight, ArrowUpRight, ArrowDownRight, RefreshCw, 
  Layers, Shield, DollarSign, Wallet, CheckCircle2, Sliders, ExternalLink
} from 'lucide-react';

// Watchlist Asset Definitions
const ASSET_CATEGORIES = {
  crypto: [
    { symbol: 'BINANCE:BTCUSDT', name: 'Bitcoin', ticker: 'BTC/USDT', price: 91420.50, change: 3.42, high: 92100, low: 88400, vol: '28.4B' },
    { symbol: 'BINANCE:ETHUSDT', name: 'Ethereum', ticker: 'ETH/USDT', price: 3410.20, change: 1.85, high: 3480, low: 3320, vol: '14.2B' },
    { symbol: 'BINANCE:SOLUSDT', name: 'Solana', ticker: 'SOL/USDT', price: 218.75, change: 7.12, high: 224, low: 201, vol: '8.1B' },
    { symbol: 'BINANCE:DOGEUSDT', name: 'Dogecoin', ticker: 'DOGE/USDT', price: 0.384, change: -1.20, high: 0.41, low: 0.37, vol: '3.9B' },
    { symbol: 'BINANCE:XRPUSDT', name: 'XRP', ticker: 'XRP/USDT', price: 1.48, change: 4.60, high: 1.54, low: 1.39, vol: '5.2B' },
    { symbol: 'BINANCE:NEARUSDT', name: 'NEAR Protocol', ticker: 'NEAR/USDT', price: 6.84, change: 8.90, high: 7.10, low: 6.20, vol: '980M' },
  ],
  tech: [
    { symbol: 'NASDAQ:NVDA', name: 'NVIDIA Corp', ticker: 'NVDA', price: 145.80, change: 2.75, high: 147.20, low: 142.10, vol: '42.1M' },
    { symbol: 'NASDAQ:AAPL', name: 'Apple Inc', ticker: 'AAPL', price: 232.50, change: 0.94, high: 234.00, low: 230.10, vol: '35.4M' },
    { symbol: 'NASDAQ:TSLA', name: 'Tesla Inc', ticker: 'TSLA', price: 342.10, change: -2.15, high: 355.00, low: 338.40, vol: '68.2M' },
    { symbol: 'NASDAQ:MSFT', name: 'Microsoft', ticker: 'MSFT', price: 428.90, change: 1.12, high: 431.50, low: 424.00, vol: '22.8M' },
    { symbol: 'NASDAQ:AMZN', name: 'Amazon.com', ticker: 'AMZN', price: 204.60, change: 1.65, high: 206.30, low: 201.80, vol: '29.7M' },
    { symbol: 'NASDAQ:GOOGL', name: 'Alphabet Inc', ticker: 'GOOGL', price: 178.40, change: 0.45, high: 180.20, low: 176.90, vol: '21.0M' },
  ],
  indices: [
    { symbol: 'SP:SPX', name: 'S&P 500', ticker: 'SPX', price: 5988.40, change: 0.62, high: 6010, low: 5950, vol: '3.2B' },
    { symbol: 'NASDAQ:IXIC', name: 'Nasdaq Composite', ticker: 'IXIC', price: 19120.80, change: 0.88, high: 19200, low: 18980, vol: '4.8B' },
    { symbol: 'DJ:DJI', name: 'Dow Jones', ticker: 'DJI', price: 43910.20, change: 0.35, high: 44100, low: 43750, vol: '1.9B' },
    { symbol: 'TVC:GOLD', name: 'Gold Spot', ticker: 'XAU/USD', price: 2684.50, change: 0.42, high: 2698, low: 2670, vol: '18.4B' },
    { symbol: 'TVC:USOIL', name: 'Crude Oil', ticker: 'WTI', price: 68.90, change: -1.45, high: 70.40, low: 68.10, vol: '12.1B' },
    { symbol: 'TVC:DXY', name: 'US Dollar Index', ticker: 'DXY', price: 106.85, change: 0.28, high: 107.10, low: 106.40, vol: 'N/A' },
  ],
  forex: [
    { symbol: 'FX:EURUSD', name: 'Euro / US Dollar', ticker: 'EUR/USD', price: 1.0542, change: -0.32, high: 1.0590, low: 1.0510, vol: '84.2B' },
    { symbol: 'FX:USDJPY', name: 'US Dollar / Yen', ticker: 'USD/JPY', price: 154.20, change: 0.48, high: 154.80, low: 153.60, vol: '62.1B' },
    { symbol: 'FX:GBPUSD', name: 'British Pound / USD', ticker: 'GBP/USD', price: 1.2640, change: -0.15, high: 1.2690, low: 1.2590, vol: '45.0B' },
    { symbol: 'TVC:US10Y', name: 'US 10Y Yield', ticker: 'US10Y', price: 4.42, change: 1.25, high: 4.46, low: 4.38, vol: 'N/A' },
  ]
};

// Helper for TradingView Embed Script injection
const injectWidget = (src: string, containerId: string, config: object) => {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const script = document.createElement('script');
  script.src = src;
  script.type = 'text/javascript';
  script.async = true;
  script.innerHTML = JSON.stringify({
    ...config,
    "width": "100%",
    "height": "100%",
    "colorTheme": "dark",
    "isTransparent": true,
    "locale": "en",
  });
  container.appendChild(script);
};

export default function Markets() {
  const { activeSymbol, setSymbol } = useMarketsStore();
  const { recordSession } = useAuraIntegration();
  const [activeCategory, setActiveCategory] = useState<'crypto' | 'tech' | 'indices' | 'forex' | 'custom'>('crypto');
  const [chartInterval, setChartInterval] = useState('D');
  const [searchQuery, setSearchQuery] = useState('');
  const [isIntroLoading, setIsIntroLoading] = useState(false);
  const [orderType, setOrderType] = useState<'buy' | 'short'>('buy');
  const [stakeAmount, setStakeAmount] = useState('500');
  const [leverage, setLeverage] = useState(5);
  const [openPositions, setOpenPositions] = useState<any[]>([
    { id: 1, symbol: 'BINANCE:BTCUSDT', type: 'LONG', entry: 89400, size: '$2,500', pnl: '+$142.50', pnlPercent: '+5.7%', leverage: '5x' },
    { id: 2, symbol: 'NASDAQ:NVDA', type: 'LONG', entry: 141.20, size: '$1,000', pnl: '+$32.60', pnlPercent: '+3.2%', leverage: '3x' }
  ]);
  const [orderbookTick, setOrderbookTick] = useState(0);

  // Custom Watchlist State
  const [customWatchlist, setCustomWatchlist] = useState<any[]>([
    { symbol: 'NASDAQ:AMD', name: 'Advanced Micro Devices', ticker: 'AMD', price: 154.30, change: 3.12 },
    { symbol: 'BINANCE:ADAUSDT', name: 'Cardano', ticker: 'ADA/USDT', price: 0.824, change: 5.40 },
    { symbol: 'TVC:SILVER', name: 'Silver Spot', ticker: 'SILVER', price: 31.45, change: 1.20 }
  ]);
  const [newCustomSymbol, setNewCustomSymbol] = useState('');
  const [newCustomName, setNewCustomName] = useState('');

  // Load and save custom watchlist
  useEffect(() => {
    try {
      const saved = localStorage.getItem('focusforge-custom-watchlist');
      if (saved) setCustomWatchlist(JSON.parse(saved));
    } catch (e) {}
  }, []);

  const saveCustomWatchlist = (updated: any[]) => {
    setCustomWatchlist(updated);
    try {
      localStorage.setItem('focusforge-custom-watchlist', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleAddCustomSymbol = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomSymbol.trim()) return;
    const formattedSymbol = newCustomSymbol.trim().toUpperCase();
    const ticker = formattedSymbol.includes(':') ? formattedSymbol.split(':')[1] : formattedSymbol;
    const newItem = {
      symbol: formattedSymbol.includes(':') ? formattedSymbol : `BINANCE:${formattedSymbol}`,
      name: newCustomName.trim() || ticker,
      ticker: ticker,
      price: 100.00,
      change: 0.00
    };
    const updated = [newItem, ...customWatchlist];
    saveCustomWatchlist(updated);
    setNewCustomSymbol('');
    setNewCustomName('');
    setSymbol(newItem.symbol);
  };

  const handleDeleteCustomSymbol = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customWatchlist.filter(item => item.symbol !== symbol);
    saveCustomWatchlist(updated);
  };

  // Live orderbook dynamic ticking simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setOrderbookTick(p => p + 1);
    }, 1400);
    return () => clearInterval(timer);
  }, []);

  // Track session time for Focus AURA
  const startTimeRef = useRef<number>(Date.now());
  useEffect(() => {
    startTimeRef.current = Date.now();
    return () => {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000 / 60);
      if (duration >= 2) {
        recordSession({
          type: 'video',
          duration: Math.max(duration, 5),
          quality: 0.85,
          completed: true,
          note: 'TradingView Market Analysis & Intelligence'
        });
      }
    };
  }, [recordSession]);

  // Inject TradingView Widgets on activeSymbol or chartInterval change
  useEffect(() => {
    // 1. Ticker Tape Top Bar
    injectWidget(
      'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js',
      'tv-ticker-tape',
      {
        "symbols": [
          { "proName": "BINANCE:BTCUSDT", "title": "Bitcoin" },
          { "proName": "BINANCE:ETHUSDT", "title": "Ethereum" },
          { "proName": "BINANCE:SOLUSDT", "title": "Solana" },
          { "proName": "NASDAQ:NVDA", "title": "NVIDIA" },
          { "proName": "NASDAQ:TSLA", "title": "Tesla" },
          { "proName": "SP:SPX", "title": "S&P 500" },
          { "proName": "TVC:GOLD", "title": "Gold" }
        ],
        "showSymbolLogo": true,
        "displayMode": "adaptive"
      }
    );

    // 2. Main Advanced TradingView Chart
    injectWidget(
      'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js',
      'tv-advanced-chart',
      {
        "symbol": activeSymbol,
        "interval": chartInterval,
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "allow_symbol_change": true,
        "calendar": false,
        "support_host": "https://www.tradingview.com",
        "backgroundColor": "rgba(0, 0, 0, 1)",
        "gridColor": "rgba(255, 255, 255, 0.03)",
        "hide_top_toolbar": false,
        "save_image": true,
        "container_id": "tv-advanced-chart"
      }
    );

    // 3. Technical Sentiment Gauge
    injectWidget(
      'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js',
      'tv-tech-gauge',
      {
        "symbol": activeSymbol,
        "interval": "1H",
        "showIntervalTabs": true,
        "colorTheme": "dark",
        "isTransparent": true,
        "locale": "en",
        "displayMode": "single"
      }
    );

    // 4. Financial Statistics / Profile
    injectWidget(
      'https://s3.tradingview.com/external-embedding/embed-widget-financials.js',
      'tv-financials',
      {
        "symbol": activeSymbol,
        "displayMode": "regular"
      }
    );

    // 5. Symbol Profile / Overview
    injectWidget(
      'https://s3.tradingview.com/external-embedding/embed-widget-symbol-profile.js',
      'tv-symbol-profile',
      {
        "symbol": activeSymbol,
      }
    );

    // 6. Market Timeline News
    injectWidget(
      'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js',
      'tv-news-timeline',
      {
        "symbol": activeSymbol,
        "feedMode": "all_symbols",
        "displayMode": "regular"
      }
    );
  }, [activeSymbol, chartInterval]);

  const activeCategoryList: any[] = activeCategory === 'custom' 
    ? customWatchlist 
    : ((ASSET_CATEGORIES as any)[activeCategory] || ASSET_CATEGORIES.crypto);

  const currentList = activeCategoryList.filter((a: any) => 
    (a.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
    (a.ticker?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (a.symbol?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const activeAssetData = activeCategoryList.find((a: any) => a.symbol === activeSymbol) || activeCategoryList[0] || ASSET_CATEGORIES.crypto[0];

  const handleExecuteTrade = () => {
    const numericStake = parseFloat(stakeAmount) || 100;
    const newPos = {
      id: Date.now(),
      symbol: activeSymbol,
      type: orderType.toUpperCase() === 'BUY' ? 'LONG' : 'SHORT',
      entry: activeAssetData.price,
      size: `$${(numericStake * leverage).toLocaleString()}`,
      pnl: '+$0.00',
      pnlPercent: '0.0%',
      leverage: `${leverage}x`
    };
    setOpenPositions([newPos, ...openPositions]);
  };

  const closePosition = (id: number) => {
    setOpenPositions(openPositions.filter(p => p.id !== id));
  };

  return (
    <div className="w-full min-h-screen bg-black text-white p-4 md:p-8 space-y-6 overflow-y-auto custom-scrollbar pt-24 font-sans selection:bg-cyan-500/30">
      
      {/* Ambience glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[140px]" />
      </div>

      {/* Top Banner & TradingView Ticker Tape */}
      <div className="relative z-10 space-y-4">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.2)]">
              <BarChart3 size={20} className="text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-white font-heading">TradingView Intelligence Suite</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-widest bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  INSTITUTIONAL // LIVE
                </span>
              </div>
              <p className="text-xs text-white/40 font-mono mt-0.5">Real-Time Global Feeds • Multi-Asset Charts • Focus Staking</p>
            </div>
          </div>

          {/* Timeframe Interval Switcher */}
          <div className="flex items-center gap-2 bg-zinc-950/80 border border-white/10 rounded-2xl p-1.5 backdrop-blur-xl">
            {['1', '5', '15', '60', '240', 'D', 'W'].map((interval) => (
              <button
                key={interval}
                onClick={() => setChartInterval(interval)}
                className={`px-3 py-1 rounded-xl text-[10px] font-mono font-bold transition-all ${
                  chartInterval === interval 
                    ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(34,211,238,0.5)]' 
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                {interval === '1' ? '1m' : interval === '5' ? '5m' : interval === '15' ? '15m' : interval === '60' ? '1H' : interval === '240' ? '4H' : interval === 'D' ? '1D' : '1W'}
              </button>
            ))}
          </div>
        </header>

        {/* Real-time Ticker Tape Embed */}
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-950/70 backdrop-blur-xl shadow-2xl h-12">
          <div id="tv-ticker-tape" className="w-full h-full" />
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Multi-Asset Watchlist (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-zinc-950/80 border border-white/10 rounded-3xl p-4 backdrop-blur-2xl shadow-2xl space-y-4">
            
            {/* Watchlist Header & Search */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-white/50">Watchlist</span>
                <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">LIVE TICKS</span>
              </div>

              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  placeholder="Filter symbols..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 font-mono"
                />
              </div>

              {/* Category Tabs */}
              <div className="grid grid-cols-5 gap-1 bg-white/5 p-1 rounded-xl border border-white/5 text-[8px] font-mono uppercase font-bold text-center">
                {(['crypto', 'tech', 'indices', 'forex', 'custom'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`py-1.5 rounded-lg transition-all ${activeCategory === cat ? 'bg-white text-black font-bold shadow' : 'text-white/40 hover:text-white'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Add Custom Symbol Input (When on custom tab) */}
              {activeCategory === 'custom' && (
                <form onSubmit={handleAddCustomSymbol} className="flex flex-col gap-2 p-3 bg-white/[0.03] border border-cyan-500/20 rounded-2xl">
                  <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    <span>+ Add Custom Symbol</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Symbol (e.g. BINANCE:ADAUSDT or AMD)"
                    value={newCustomSymbol}
                    onChange={e => setNewCustomSymbol(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/20 font-mono focus:outline-none focus:border-cyan-400"
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Display Name (optional)"
                      value={newCustomName}
                      onChange={e => setNewCustomName(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1 text-[11px] text-white placeholder:text-white/20 font-mono focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[10px] uppercase font-mono rounded-xl transition-all"
                    >
                      Add
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Asset List */}
            <div className="space-y-2 max-h-[460px] overflow-y-auto custom-scrollbar pr-1">
              {currentList.map(asset => {
                const isSelected = activeSymbol === asset.symbol;
                const isPositive = asset.change >= 0;
                return (
                  <div
                    key={asset.symbol}
                    onClick={() => setSymbol(asset.symbol)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer group flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.15)] ring-1 ring-cyan-500/30'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/15'
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className={`text-xs font-bold font-mono truncate ${isSelected ? 'text-cyan-400' : 'text-white group-hover:text-white'}`}>
                        {asset.ticker}
                      </span>
                      <span className="text-[10px] text-white/40 truncate">{asset.name}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-white">
                          ${asset.price < 10 ? asset.price.toFixed(4) : asset.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className={`text-[10px] font-mono font-bold flex items-center justify-end gap-0.5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                          {isPositive ? `+${asset.change}%` : `${asset.change}%`}
                        </div>
                      </div>

                      {activeCategory === 'custom' && (
                        <button
                          onClick={(e) => handleDeleteCustomSymbol(asset.symbol, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-white/30 transition-opacity"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Live Orderbook Ladder */}
          <div className="bg-zinc-950/80 border border-white/10 rounded-3xl p-4 backdrop-blur-2xl shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/40">Market Depth / Orderbook</span>
              <Activity size={12} className="text-cyan-400 animate-pulse" />
            </div>

            {/* Asks (Red) */}
            <div className="space-y-1 font-mono text-[10px]">
              {[
                { price: (activeAssetData.price * 1.003).toFixed(2), size: (2.4 + (orderbookTick % 3) * 0.4).toFixed(2), fill: '68%' },
                { price: (activeAssetData.price * 1.002).toFixed(2), size: (5.1 - (orderbookTick % 2) * 0.3).toFixed(2), fill: '84%' },
                { price: (activeAssetData.price * 1.001).toFixed(2), size: (1.8 + (orderbookTick % 4) * 0.2).toFixed(2), fill: '45%' },
              ].map((row, i) => (
                <div key={i} className="relative flex justify-between px-2 py-0.5 rounded overflow-hidden">
                  <div className="absolute right-0 top-0 bottom-0 bg-rose-500/10 pointer-events-none" style={{ width: row.fill }} />
                  <span className="text-rose-400 z-10">${row.price}</span>
                  <span className="text-white/40 z-10">{row.size}</span>
                </div>
              ))}
            </div>

            {/* Mid Price Separator */}
            <div className="py-1 px-2 rounded-lg bg-white/5 flex items-center justify-between text-xs font-mono font-bold">
              <span className="text-white">${activeAssetData.price.toLocaleString()}</span>
              <span className="text-[9px] uppercase tracking-wider text-emerald-400">SPREAD 0.01%</span>
            </div>

            {/* Bids (Green) */}
            <div className="space-y-1 font-mono text-[10px]">
              {[
                { price: (activeAssetData.price * 0.999).toFixed(2), size: (3.2 + (orderbookTick % 3) * 0.5).toFixed(2), fill: '55%' },
                { price: (activeAssetData.price * 0.998).toFixed(2), size: (6.4 - (orderbookTick % 2) * 0.4).toFixed(2), fill: '90%' },
                { price: (activeAssetData.price * 0.997).toFixed(2), size: (2.1 + (orderbookTick % 4) * 0.3).toFixed(2), fill: '40%' },
              ].map((row, i) => (
                <div key={i} className="relative flex justify-between px-2 py-0.5 rounded overflow-hidden">
                  <div className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 pointer-events-none" style={{ width: row.fill }} />
                  <span className="text-emerald-400 z-10">${row.price}</span>
                  <span className="text-white/40 z-10">{row.size}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Column: Advanced TradingView Chart (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-zinc-950/80 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-2xl shadow-2xl h-[580px] flex flex-col relative group">
            
            {/* Chart Header Bar */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/40">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
                <span className="text-sm font-bold font-mono text-white uppercase">{activeSymbol}</span>
                <span className="text-xs text-white/40 font-mono">${activeAssetData.price.toLocaleString()}</span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`https://www.tradingview.com/symbols/${activeSymbol.replace(':', '-')}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 rounded-xl border border-cyan-500/30 transition-colors"
                >
                  <span>TradingView.com</span>
                  <ExternalLink size={10} />
                </a>
              </div>
            </div>

            {/* TradingView Advanced Chart Embed */}
            <div id="tv-advanced-chart" className="flex-1 w-full h-full" />
          </div>

          {/* Open Positions & Focus Staking Desk */}
          <div className="bg-zinc-950/80 border border-white/10 rounded-3xl p-5 backdrop-blur-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-cyan-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-white">Simulated Focus Staking Positions</span>
              </div>
              <span className="text-[10px] font-mono text-white/40">{openPositions.length} ACTIVE</span>
            </div>

            {openPositions.length === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-white/30 border border-dashed border-white/10 rounded-2xl">
                No active simulated trades. Execute a Long or Short order below to test market predictions.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {openPositions.map(pos => (
                  <div key={pos.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between font-mono text-xs">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${pos.type === 'LONG' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                        {pos.type} {pos.leverage}
                      </span>
                      <div>
                        <div className="font-bold text-white">{pos.symbol.split(':')[1] || pos.symbol}</div>
                        <div className="text-[10px] text-white/40">Entry: ${pos.entry.toLocaleString()} • Size: {pos.size}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-emerald-400">{pos.pnl}</div>
                        <div className="text-[10px] text-emerald-400/70">{pos.pnlPercent}</div>
                      </div>
                      <button
                        onClick={() => closePosition(pos.id)}
                        className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 text-[10px] font-bold border border-white/10 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Execution Terminal & Sentiment Gauges (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Paper Trading Order Execution Box */}
          <div className="bg-zinc-950/80 border border-white/10 rounded-3xl p-5 backdrop-blur-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/50">Execution Terminal</span>
              <Wallet size={13} className="text-emerald-400" />
            </div>

            {/* Long / Short Toggle */}
            <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
              <button
                onClick={() => setOrderType('buy')}
                className={`py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all ${
                  orderType === 'buy' ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'text-white/40 hover:text-white'
                }`}
              >
                Long / Buy
              </button>
              <button
                onClick={() => setOrderType('short')}
                className={`py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all ${
                  orderType === 'short' ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'text-white/40 hover:text-white'
                }`}
              >
                Short / Sell
              </button>
            </div>

            {/* Stake Amount */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono text-white/40">
                <span>STAKE CAPITAL</span>
                <span>AVAIL: $50,000</span>
              </div>
              <div className="relative">
                <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={e => setStakeAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50"
                  placeholder="500"
                />
              </div>
            </div>

            {/* Leverage Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono text-white/40">
                <span>LEVERAGE</span>
                <span className="text-cyan-400 font-bold">{leverage}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={leverage}
                onChange={e => setLeverage(parseInt(e.target.value))}
                className="w-full accent-cyan-400 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-mono text-white/20">
                <span>1x (Spot)</span>
                <span>5x</span>
                <span>10x</span>
                <span>20x (Max)</span>
              </div>
            </div>

            {/* Execution CTA Button */}
            <button
              onClick={handleExecuteTrade}
              className={`w-full py-3 rounded-2xl text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${
                orderType === 'buy'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-black hover:opacity-90 shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-rose-600 to-red-500 text-white hover:opacity-90 shadow-rose-500/20'
              }`}
            >
              <Zap size={13} />
              <span>Execute {orderType.toUpperCase()} Order</span>
            </button>
          </div>

          {/* Technical Analysis Gauge Embed */}
          <div className="bg-zinc-950/80 border border-white/10 rounded-3xl p-4 backdrop-blur-2xl shadow-2xl space-y-3 h-[380px] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/40">Technical Sentiment</span>
              <Activity size={12} className="text-purple-400" />
            </div>
            <div id="tv-tech-gauge" className="flex-1 w-full h-full" />
          </div>

        </div>

      </div>

      {/* Bottom Row: Financial Profile & Market News Intelligence */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
        
        {/* Financials & Overview */}
        <div className="lg:col-span-6 bg-zinc-950/80 border border-white/10 rounded-3xl p-5 backdrop-blur-2xl shadow-2xl h-[420px] flex flex-col">
          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-white/50">Financial Intelligence Matrix</span>
            <BarChart3 size={14} className="text-emerald-400" />
          </div>
          <div id="tv-financials" className="flex-1 w-full h-full" />
        </div>

        {/* Global Market News Timeline */}
        <div className="lg:col-span-6 bg-zinc-950/80 border border-white/10 rounded-3xl p-5 backdrop-blur-2xl shadow-2xl h-[420px] flex flex-col">
          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-white/50">Global News Stream & Catalyst Feed</span>
            <Newspaper size={14} className="text-blue-400" />
          </div>
          <div id="tv-news-timeline" className="flex-1 w-full h-full" />
        </div>

      </div>

    </div>
  );
}
