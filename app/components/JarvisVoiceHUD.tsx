"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, MicOff, Volume2, VolumeX, Sparkles, Bot, 
  Send, X, Maximize2, Minimize2, Trash2, Zap, 
  Activity, Play, Pause, Radio, CheckCircle2, 
  RotateCcw, Shield, Cpu, ChevronRight, Terminal,
  Clock, CheckSquare, Music, RefreshCw, SlidersHorizontal,
  FileText, Hand, Search, Award, MessageSquare, Bug, AlertTriangle,
  Youtube, ExternalLink, Check, TrendingUp,
  Cloud, Sun, CloudRain, Wind, Droplets, Compass, Thermometer,
  Globe, Newspaper, Radio as RadioIcon, Eye, DollarSign, Coins,
  TrendingDown, ArrowUpRight, ArrowDownRight, Percent, Calendar
} from 'lucide-react';
import { useJarvisStore, JarvisAiState, StockSpotData, TaskSpotData } from '../../hooks/useJarvisStore';
import { useJarvisHotword } from '../../hooks/useJarvisHotword';
import { useAppStore } from '../../hooks/useAppStore';
import { useFrequencyStore } from '../../hooks/useFrequencyStore';
import { useMarketsStore } from '../../hooks/useMarketsStore';
import { jarvisAudio } from '../../lib/jarvisAudio';
import { jarvisVoiceEngine, VoiceState } from '../../lib/jarvisVoiceEngine';
import { SiriWave, SiriWaveVariant } from '@/components/ui/siri-wave';
import { ThinkingOrb } from 'thinking-orbs';
import JarvisOrbVisualizer, { resolveOrbState } from './JarvisOrbVisualizer';
import { JarvisDiagnosticsPanel } from './JarvisDiagnosticsPanel';
import type { YouTubeSearchResult } from '../../lib/youtubeSearch';
import { handleGlobalJarvisCommand } from '../../lib/jarvisCommandDispatcher';
import { getSelectedTextModel, getSelectedLiveModel } from '../../lib/aiModelConfig';
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
} from '../../lib/intelligence/types';
import { fetchWeather } from '../../lib/intelligence/weatherAdapter';
import { convertCurrency } from '../../lib/intelligence/fxAdapter';
import { removeFromWatchlist } from '../../lib/intelligence/watchlistManager';
import { deleteHolding, getPortfolioData } from '../../lib/intelligence/portfolioManager';

// ==========================================
// 1. SPOT UI: VIDEO CARDS (Apple TV Style)
// ==========================================
function SpotVideoWidget({ 
  videos, 
  onWatch 
}: { 
  videos: YouTubeSearchResult[]; 
  onWatch: (video: YouTubeSearchResult) => void;
}) {
  const { setView } = useAppStore();
  const { closeJarvis } = useJarvisStore();

  return (
    <div className="flex flex-col h-full w-full space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 px-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
            <Youtube size={16} />
          </div>
          <div>
            <span className="text-sm font-heading font-extrabold text-white tracking-wide block">
              YouTube Search Results
            </span>
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
              {videos.length} videos • Say &ldquo;Play 1&rdquo; or click to stream in The Place
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            setView('place');
            window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'place' } }));
            closeJarvis();
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black text-[9px] font-mono uppercase font-bold tracking-wider transition-all cursor-pointer"
        >
          <span>The Place</span>
          <ExternalLink size={10} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 max-h-[44vh] overflow-y-auto no-scrollbar pr-1">
        {videos.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => onWatch(item)}
            className="group bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/25 rounded-2xl p-3 cursor-pointer transition-all duration-300 flex flex-col justify-between space-y-2.5 hover:scale-[1.02] shadow-sm relative"
          >
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black/60 border border-white/5">
              <img 
                src={item.thumbnail} 
                alt={item.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-95 group-hover:brightness-100"
              />
              {/* Card Index Badge for Voice Selection */}
              <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[10px] font-mono font-bold text-white tracking-wide shadow-md">
                #{idx + 1}
              </div>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
                <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform">
                  <Play size={14} fill="black" className="ml-0.5" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-mono uppercase text-red-400 font-bold block truncate tracking-wider">
                {item.channelTitle || "YouTube"}
              </span>
              <h5 className="font-mono text-xs font-bold text-white line-clamp-2 leading-snug">
                {item.title}
              </h5>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onWatch(item);
              }}
              className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black border border-white/10 text-[9px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 shadow-sm cursor-pointer"
            >
              <Play size={10} fill="currentColor" /> Watch in The Place
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 2. SPOT UI: STOCK & MARKET CHART (TradingView)
// ==========================================
function SpotStockWidget({ symbol, name }: StockSpotData) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [interval, setInterval] = useState('D');
  const { setView } = useAppStore();
  const { setSymbol } = useMarketsStore();
  const { closeJarvis } = useJarvisStore();

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: symbol,
      interval: interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: false,
      calendar: false,
      backgroundColor: "rgba(0, 0, 0, 0)",
      gridColor: "rgba(255, 255, 255, 0.04)",
      hide_top_toolbar: true,
      hide_legend: false,
      save_image: false,
      width: "100%",
      height: "100%",
      colorTheme: "dark",
      isTransparent: true,
    });
    containerRef.current.appendChild(script);
  }, [symbol, interval]);

  return (
    <div className="flex flex-col h-full w-full space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 px-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs">
            <TrendingUp size={16} />
          </div>
          <div>
            <span className="text-sm font-heading font-extrabold text-white tracking-wide block">
              {symbol}
            </span>
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
              Live Interactive Market Chart
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10">
            {['1', '15', '60', 'D', 'W'].map((int) => (
              <button
                key={int}
                onClick={() => setInterval(int)}
                className={`px-2.5 py-0.5 rounded-lg text-[9px] font-mono font-bold transition-all cursor-pointer ${
                  interval === int ? 'bg-white text-black shadow-sm' : 'text-white/40 hover:text-white'
                }`}
              >
                {int === '60' ? '1H' : int === 'D' ? '1D' : int === 'W' ? '1W' : `${int}m`}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setSymbol(symbol);
              setView('hub');
              window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'hub' } }));
              closeJarvis();
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black text-[9px] font-mono uppercase font-bold tracking-wider transition-all cursor-pointer"
          >
            <span>Full Hub</span>
            <ExternalLink size={10} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[300px] sm:min-h-[360px] rounded-2xl overflow-hidden bg-black/50 border border-white/10 relative shadow-inner">
        <div ref={containerRef} className="tradingview-widget-container h-full w-full" />
      </div>
    </div>
  );
}

// ==========================================
// 3. SPOT UI: TASKS CHECKLIST (Apple Reminders Style)
// ==========================================
function SpotTaskWidget({ tasks }: TaskSpotData) {
  const [taskList, setTaskList] = useState(tasks);
  const { setView } = useAppStore();
  const { closeJarvis } = useJarvisStore();

  const toggleTask = (id: string) => {
    const updated = taskList.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTaskList(updated);
    try {
      const stored = JSON.parse(localStorage.getItem('focus-tasks') || '[]');
      const newStored = stored.map((t: any) => t.id === id ? { ...t, done: !t.done } : t);
      localStorage.setItem('focus-tasks', JSON.stringify(newStored));
      window.dispatchEvent(new CustomEvent('tasksUpdated', { detail: { tasks: newStored, source: 'jarvis' } }));
    } catch(e) {}
  };

  return (
    <div className="flex flex-col h-full w-full space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 px-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <CheckSquare size={16} />
          </div>
          <div>
            <span className="text-sm font-heading font-extrabold text-white tracking-wide block">
              Active Objectives
            </span>
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
              {taskList.filter(t => !t.done).length} Remaining
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            setView('tasks');
            window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'tasks' } }));
            closeJarvis();
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black text-[9px] font-mono uppercase font-bold tracking-wider transition-all cursor-pointer"
        >
          <span>Open Tasks</span>
          <ExternalLink size={10} />
        </button>
      </div>

      <div className="space-y-2.5 max-h-[340px] overflow-y-auto no-scrollbar pr-1">
        {taskList.length === 0 ? (
          <div className="py-12 text-center text-white/40 font-mono text-xs">
            No active tasks on your agenda, sir.
          </div>
        ) : (
          taskList.map((task) => (
            <div
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                task.done 
                  ? 'bg-white/[0.02] border-white/5 opacity-50' 
                  : 'bg-white/[0.05] hover:bg-white/[0.08] border-white/10 hover:border-white/20'
              }`}
            >
              <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                task.done ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-white/20 bg-black/40'
              }`}>
                {task.done && <Check size={12} strokeWidth={3} />}
              </div>
              <span className={`text-xs font-mono flex-1 ${task.done ? 'line-through text-white/40' : 'text-white/90'}`}>
                {task.title}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ==========================================
// 4. SPOT UI: ATMOSPHERE & WEATHER (Apple Weather Style)
// ==========================================
function SpotWeatherWidget({ data }: { data: WeatherData }) {
  const [cityInput, setCityInput] = useState('');
  const [currentData, setCurrentData] = useState(data);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSearchCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityInput.trim()) return;
    setIsRefreshing(true);
    try {
      const res = await fetchWeather(cityInput.trim());
      setCurrentData(res);
      setCityInput('');
    } catch (e) {} finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 px-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            {currentData.isDay ? <Sun size={16} /> : <Cloud size={16} />}
          </div>
          <div>
            <span className="text-sm font-heading font-extrabold text-white tracking-wide block">
              {currentData.city}{currentData.country ? `, ${currentData.country}` : ''}
            </span>
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
              Live Atmosphere Telemetry • {currentData.source}
            </span>
          </div>
        </div>

        {/* Quick City Search Bar */}
        <form onSubmit={handleSearchCity} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Change city..."
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-xs placeholder:text-white/30 outline-none focus:border-blue-400/50 w-32 sm:w-44 font-mono transition-all"
          />
          <button
            type="submit"
            disabled={isRefreshing}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black transition-all cursor-pointer shrink-0"
          >
            <Search size={13} />
          </button>
        </form>
      </div>

      {/* Main Temperature & Metric Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Big Temp Box */}
        <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-blue-400 font-bold tracking-wider">
              {currentData.conditionText}
            </span>
            <span className="text-[9px] font-mono text-white/40">
              Feels like {currentData.apparentTemperature}°C
            </span>
          </div>
          <div className="my-2">
            <span className="text-5xl sm:text-6xl font-heading font-extrabold text-white tracking-tight">
              {currentData.temperature}°
            </span>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono text-white/60">
            <span>Wind: {currentData.windSpeed} km/h</span>
            <span>Humidity: {currentData.humidity}%</span>
          </div>
        </div>

        {/* Atmospheric Detail Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-white/50 text-[10px] font-mono">
              <Droplets size={12} className="text-cyan-400" />
              <span>Humidity</span>
            </div>
            <span className="text-xl font-heading font-bold text-white mt-1">{currentData.humidity}%</span>
            <span className="text-[9px] text-white/40">Precip: {currentData.precipitation} mm</span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-white/50 text-[10px] font-mono">
              <Wind size={12} className="text-emerald-400" />
              <span>Wind Velocity</span>
            </div>
            <span className="text-xl font-heading font-bold text-white mt-1">{currentData.windSpeed} <span className="text-xs text-white/50">km/h</span></span>
            <span className="text-[9px] text-white/40">Direction: {currentData.windDirection}°</span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-white/50 text-[10px] font-mono">
              <Sun size={12} className="text-amber-400" />
              <span>UV Index</span>
            </div>
            <span className="text-xl font-heading font-bold text-white mt-1">{currentData.uvIndex ?? 'Low'}</span>
            <span className="text-[9px] text-white/40">Air Quality: {currentData.aqi ? `AQI ${currentData.aqi}` : 'Good'}</span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-white/50 text-[10px] font-mono">
              <Compass size={12} className="text-purple-400" />
              <span>Solar Orbit</span>
            </div>
            <span className="text-xs font-mono font-bold text-white mt-1">↑ {currentData.sunrise || '06:00'}</span>
            <span className="text-[9px] font-mono text-white/40">↓ {currentData.sunset || '18:30'}</span>
          </div>
        </div>

        {/* 5-Day Forecast */}
        <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between space-y-2">
          <span className="text-[10px] font-mono uppercase text-white/50 font-bold tracking-wider">5-Day Outlook</span>
          <div className="space-y-1.5">
            {currentData.daily.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs font-mono py-0.5 border-b border-white/5 last:border-none">
                <span className="text-white/70 w-12">{d.date}</span>
                <span className="text-white/40 text-[10px]">L: {d.minTemp}°</span>
                <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden mx-2">
                  <div className="h-full bg-gradient-to-r from-blue-400 to-amber-400 rounded-full" style={{ width: `${Math.min(100, Math.max(20, (d.maxTemp + 10) * 2))}%` }} />
                </div>
                <span className="text-white font-bold w-8 text-right">{d.maxTemp}°</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hourly Strip */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {currentData.hourly.map((h, i) => (
          <div key={i} className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 shrink-0 min-w-[64px]">
            <span className="text-[9px] font-mono text-white/50">{h.time}</span>
            <Cloud size={14} className="text-white/70 my-0.5" />
            <span className="text-xs font-mono font-bold text-white">{h.temp}°</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 5. SPOT UI: WORLD PULSE & GLOBAL NEWS (GDELT)
// ==========================================
function SpotNewsWidget({ data }: { data: NewsData }) {
  return (
    <div className="flex flex-col h-full w-full space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 px-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Globe size={16} />
          </div>
          <div>
            <span className="text-sm font-heading font-extrabold text-white tracking-wide block">
              World Pulse: {data.category}
            </span>
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
              {data.articles.length} verified dispatches • {data.source}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[44vh] overflow-y-auto no-scrollbar pr-1">
        {data.articles.map((art) => (
          <a
            key={art.id}
            href={art.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-2 cursor-pointer shadow-sm hover:scale-[1.01]"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[9px] font-mono font-bold uppercase">
                  {art.domain || art.source}
                </span>
                {art.publishedAt && (
                  <span className="text-[9px] font-mono text-white/40">{art.publishedAt}</span>
                )}
              </div>
              <h4 className="text-xs font-mono font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2">
                {art.title}
              </h4>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[9px] font-mono text-white/50 group-hover:text-white">
              <span>Read Full Report</span>
              <ExternalLink size={10} />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 6. SPOT UI: EARTH MONITORS & SEISMIC (USGS)
// ==========================================
function SpotEarthquakeWidget({ data }: { data: EarthquakeData }) {
  return (
    <div className="flex flex-col h-full w-full space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 px-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Activity size={16} />
          </div>
          <div>
            <span className="text-sm font-heading font-extrabold text-white tracking-wide block">
              Earth Monitor: Seismic Telemetry
            </span>
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
              {data.earthquakes.length} Global Events (M{data.minMagnitude}+) • {data.source}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[44vh] overflow-y-auto no-scrollbar pr-1">
        {data.earthquakes.map((eq) => {
          const isHigh = eq.mag >= 5.0;
          const isMed = eq.mag >= 4.0;
          return (
            <a
              key={eq.id}
              href={eq.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/25 transition-all flex flex-col justify-between space-y-2 group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-black ${
                  isHigh ? 'bg-red-500/20 border border-red-500/40 text-red-400' :
                  isMed ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300' :
                  'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                }`}>
                  M {eq.mag}
                </span>
                <span className="text-[9px] font-mono text-white/40">Depth: {eq.depth} km</span>
              </div>

              <h5 className="text-xs font-mono font-bold text-white line-clamp-2">
                {eq.place}
              </h5>

              <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[9px] font-mono text-white/40 group-hover:text-white">
                <span>{new Date(eq.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="flex items-center gap-1">USGS Page <ExternalLink size={9} /></span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// 7. SPOT UI: ORBITAL & ISS TRACKER
// ==========================================
function SpotIssWidget({ data }: { data: IssData }) {
  const [telemetry, setTelemetry] = useState(data);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/intelligence/iss');
        if (res.ok) {
          const fresh = await res.json();
          setTelemetry(fresh);
        }
      } catch (e) {}
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full w-full space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 px-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 animate-pulse">
            <RadioIcon size={16} />
          </div>
          <div>
            <span className="text-sm font-heading font-extrabold text-white tracking-wide block">
              Orbital Monitor: {telemetry.name}
            </span>
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
              Live NORAD Telemetry • {telemetry.source}
            </span>
          </div>
        </div>

        <span className="px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono uppercase font-bold animate-pulse">
          Live Orbit Track
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase text-white/40">Latitude</span>
          <span className="text-2xl font-mono font-extrabold text-cyan-300 my-1">{telemetry.latitude}°</span>
          <span className="text-[9px] font-mono text-white/40">Geodetic North/South</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase text-white/40">Longitude</span>
          <span className="text-2xl font-mono font-extrabold text-cyan-300 my-1">{telemetry.longitude}°</span>
          <span className="text-[9px] font-mono text-white/40">Geodetic East/West</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase text-white/40">Orbital Altitude</span>
          <span className="text-2xl font-mono font-extrabold text-purple-300 my-1">{telemetry.altitude} <span className="text-xs text-white/40">km</span></span>
          <span className="text-[9px] font-mono text-white/40">{Math.round(telemetry.altitude * 0.621371)} miles</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase text-white/40">Orbital Velocity</span>
          <span className="text-2xl font-mono font-extrabold text-emerald-300 my-1">{Math.round(telemetry.velocity).toLocaleString()} <span className="text-xs text-white/40">km/h</span></span>
          <span className="text-[9px] font-mono text-white/40">{Math.round(telemetry.velocity * 0.621371).toLocaleString()} mph (~7.6 km/s)</span>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 8. SPOT UI: NASA SPACE INTELLIGENCE (APOD)
// ==========================================
function SpotNasaWidget({ data }: { data: NasaApodData }) {
  return (
    <div className="flex flex-col h-full w-full space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 px-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles size={16} />
          </div>
          <div>
            <span className="text-sm font-heading font-extrabold text-white tracking-wide block">
              NASA Astronomy Picture of the Day
            </span>
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
              {data.date} • {data.copyright || 'NASA Public Domain'}
            </span>
          </div>
        </div>

        {data.hdurl && (
          <a
            href={data.hdurl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black text-[9px] font-mono uppercase font-bold tracking-wider transition-all cursor-pointer"
          >
            <span>Full HD Image</span>
            <ExternalLink size={10} />
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[44vh] overflow-y-auto no-scrollbar pr-1">
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/60 border border-white/10">
          {data.media_type === 'video' ? (
            <iframe src={data.url} className="w-full h-full border-none" title={data.title} allowFullScreen />
          ) : (
            <img src={data.url} alt={data.title} className="w-full h-full object-cover" />
          )}
        </div>

        <div className="flex flex-col justify-between space-y-3 p-4 rounded-2xl bg-white/[0.04] border border-white/10 overflow-y-auto max-h-[300px] no-scrollbar">
          <div className="space-y-2">
            <h3 className="text-sm font-heading font-extrabold text-white leading-tight">{data.title}</h3>
            <p className="text-xs font-mono text-white/70 leading-relaxed">{data.explanation}</p>
          </div>
          <span className="text-[9px] font-mono text-white/40 block pt-2 border-t border-white/5">
            Credit & Copyright: {data.copyright || 'NASA / STScI'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 9. SPOT UI: CRYPTOCURRENCY PULSE (CoinGecko)
// ==========================================
function SpotCryptoWidget({ data }: { data: CryptoData }) {
  const { setSymbol } = useMarketsStore();
  const { setView } = useAppStore();
  const { closeJarvis } = useJarvisStore();

  const handleOpenChart = (coin: any) => {
    const symbolMap: Record<string, string> = {
      'BTC': 'BINANCE:BTCUSDT',
      'ETH': 'BINANCE:ETHUSDT',
      'SOL': 'BINANCE:SOLUSDT',
      'XRP': 'BINANCE:XRPUSDT',
      'DOGE': 'BINANCE:DOGEUSDT',
      'ADA': 'BINANCE:ADAUSDT'
    };
    const tvSymbol = symbolMap[coin.symbol] || `BINANCE:${coin.symbol}USDT`;
    setSymbol(tvSymbol);
    setView('hub');
    window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'hub' } }));
    closeJarvis();
  };

  return (
    <div className="flex flex-col h-full w-full space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 px-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Coins size={16} />
          </div>
          <div>
            <span className="text-sm font-heading font-extrabold text-white tracking-wide block">
              Market Pulse: Cryptocurrency
            </span>
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
              Live Global Valuations (Base: {data.baseCurrency}) • {data.source}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[44vh] overflow-y-auto no-scrollbar pr-1">
        {data.coins.map((coin) => {
          const isUp = coin.price_change_percentage_24h >= 0;
          return (
            <div
              key={coin.id}
              onClick={() => handleOpenChart(coin)}
              className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all cursor-pointer flex flex-col justify-between space-y-2.5 group hover:scale-[1.01]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {coin.image && <img src={coin.image} alt="" className="w-6 h-6 rounded-full" />}
                  <div>
                    <span className="text-xs font-mono font-bold text-white block leading-tight">{coin.name}</span>
                    <span className="text-[9px] font-mono text-white/40 uppercase">{coin.symbol}</span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                  isUp ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {isUp ? '+' : ''}{coin.price_change_percentage_24h}%
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-lg font-mono font-extrabold text-white">
                  ${coin.current_price.toLocaleString()}
                </span>
                <span className="text-[9px] font-mono text-white/40">
                  Vol: ${(coin.total_volume / 1e9).toFixed(1)}B
                </span>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); handleOpenChart(coin); }}
                className="w-full py-1.5 rounded-xl bg-white/5 hover:bg-white text-white hover:text-black text-[9px] font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 transition-all"
              >
                <span>TradingView Chart</span>
                <ExternalLink size={9} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// 10. SPOT UI: FX & CURRENCY INTELLIGENCE (Frankfurter)
// ==========================================
function SpotFxWidget({ data }: { data: FxData }) {
  const [amount, setAmount] = useState<number>(data.amount || 100);
  const [base, setBase] = useState<string>(data.base || 'USD');
  const [target, setTarget] = useState<string>(data.target || 'INR');
  const [fxResult, setFxResult] = useState(data);
  const [isConverting, setIsConverting] = useState(false);

  const handleConvert = async () => {
    setIsConverting(true);
    try {
      const res = await convertCurrency(amount, base, target);
      setFxResult(res);
    } catch (e) {} finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 px-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <DollarSign size={16} />
          </div>
          <div>
            <span className="text-sm font-heading font-extrabold text-white tracking-wide block">
              FX Lens: Currency Intelligence
            </span>
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
              European Central Bank Reference Rates ({fxResult.date}) • {fxResult.source}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Converter Box */}
        <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between space-y-4">
          <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold tracking-wider">Currency Conversion</span>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] font-mono text-white/40 block mb-1">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white font-mono text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] font-mono text-white/40 block mb-1">From</label>
              <select
                value={base}
                onChange={(e) => setBase(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-sm outline-none"
              >
                {['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-mono text-white/40 block mb-1">To</label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-sm outline-none"
              >
                {['INR', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleConvert}
            disabled={isConverting}
            className="w-full py-2.5 rounded-xl bg-white text-black font-mono font-bold text-xs uppercase tracking-wider hover:bg-white/90 transition-all cursor-pointer"
          >
            {isConverting ? 'Calculating...' : 'Calculate Conversion'}
          </button>

          {fxResult.convertedAmount !== undefined && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-mono font-extrabold text-white">
                {fxResult.convertedAmount.toLocaleString()} {target}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 mt-1">
                1 {base} = {fxResult.rate} {target}
              </span>
            </div>
          )}
        </div>

        {/* Popular Reference Rates Table */}
        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between space-y-2">
          <span className="text-[10px] font-mono uppercase text-white/50 font-bold tracking-wider">Key Reference Rates (Base: {fxResult.base})</span>
          <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar">
            {Object.entries(fxResult.rates).slice(0, 8).map(([cur, r]) => (
              <div key={cur} className="flex items-center justify-between text-xs font-mono py-1.5 border-b border-white/5">
                <span className="text-white font-bold">{cur}</span>
                <span className="text-white/70">{r.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 11. SPOT UI: MARKET WATCHLIST
// ==========================================
function SpotWatchlistWidget({ data }: { data: WatchlistData }) {
  const [items, setItems] = useState(data.items);
  const { setSymbol } = useMarketsStore();
  const { setView } = useAppStore();
  const { closeJarvis } = useJarvisStore();

  const handleRemove = (id: string) => {
    const updated = removeFromWatchlist(id);
    setItems(updated.items);
  };

  const handleOpen = (symbol: string) => {
    setSymbol(symbol);
    setView('hub');
    window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'hub' } }));
    closeJarvis();
  };

  return (
    <div className="flex flex-col h-full w-full space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 px-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Eye size={16} />
          </div>
          <div>
            <span className="text-sm font-heading font-extrabold text-white tracking-wide block">
              Market Watchlist
            </span>
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
              {items.length} Monitored Assets • Persistent Storage
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            setView('hub');
            window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'hub' } }));
            closeJarvis();
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black text-[9px] font-mono uppercase font-bold tracking-wider transition-all cursor-pointer"
        >
          <span>Markets Hub</span>
          <ExternalLink size={10} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 max-h-[44vh] overflow-y-auto no-scrollbar pr-1">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => handleOpen(item.symbol)}
            className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all cursor-pointer flex flex-col justify-between space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-white">{item.ticker}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleRemove(item.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-red-400 transition-opacity"
              >
                <Trash2 size={11} />
              </button>
            </div>
            <span className="text-[10px] font-mono text-white/50 truncate">{item.name}</span>
            <div className="flex items-baseline justify-between pt-1 border-t border-white/5">
              <span className="text-sm font-mono font-bold text-white">${item.price?.toLocaleString()}</span>
              {item.change !== undefined && (
                <span className={`text-[9px] font-mono font-bold ${item.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {item.change >= 0 ? '+' : ''}{item.change}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 12. SPOT UI: LOCAL PORTFOLIO TRACKER
// ==========================================
function SpotPortfolioWidget({ data }: { data: PortfolioData }) {
  const [port, setPort] = useState(data);

  const handleDelete = (id: string) => {
    deleteHolding(id);
    getPortfolioData().then(setPort);
  };

  const isProfitable = port.totalPnl >= 0;

  return (
    <div className="flex flex-col h-full w-full space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 px-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Percent size={16} />
          </div>
          <div>
            <span className="text-sm font-heading font-extrabold text-white tracking-wide block">
              Portfolio Valuation & P&L
            </span>
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
              Local Manual Portfolio Tracker • {port.holdings.length} Positions
            </span>
          </div>
        </div>
      </div>

      {/* Summary Valuation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase text-white/40">Total Valuation</span>
          <span className="text-2xl sm:text-3xl font-mono font-extrabold text-white my-1">
            ${port.totalValue.toLocaleString()}
          </span>
          <span className="text-[9px] font-mono text-white/40">Cost Basis: ${port.totalCost.toLocaleString()}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase text-white/40">Unrealized P&L</span>
          <span className={`text-2xl sm:text-3xl font-mono font-extrabold my-1 ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isProfitable ? '+' : ''}${port.totalPnl.toLocaleString()}
          </span>
          <span className="text-[9px] font-mono text-white/40">Profit / Loss</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase text-white/40">Total Return</span>
          <span className={`text-2xl sm:text-3xl font-mono font-extrabold my-1 ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isProfitable ? '+' : ''}{port.totalPnlPercent}%
          </span>
          <span className="text-[9px] font-mono text-white/40">Relative ROI</span>
        </div>
      </div>

      {/* Positions Breakdown Table */}
      <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5 max-h-[220px] overflow-y-auto no-scrollbar">
        <span className="text-[10px] font-mono uppercase text-white/50 font-bold tracking-wider block">Holdings Allocation</span>
        {port.holdings.map((h) => (
          <div key={h.id} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{h.name}</span>
              <span className="text-[10px] text-white/40">({h.quantity} units)</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white">${h.currentValue.toLocaleString()}</span>
              <span className={`font-bold ${h.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {h.pnl >= 0 ? '+' : ''}${h.pnl.toLocaleString()} ({h.pnl >= 0 ? '+' : ''}{h.pnlPercent}%)
              </span>
              <button onClick={() => handleDelete(h.id)} className="text-white/30 hover:text-red-400 p-1">
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// MAIN JARVIS VOICE HUD COMPONENT
// ==========================================
export default function JarvisVoiceHUD() {
  const {
    isOpen,
    displayMode,
    setDisplayMode,
    isMinimized,
    closeJarvis,
    setIsMinimized,
    voiceState,
    telemetry,
    aiState,
    setAiState,
    isListening,
    isSpeaking,
    isHotwordEnabled,
    setIsHotwordEnabled,
    voiceFeedbackEnabled,
    setVoiceFeedbackEnabled,
    messages,
    addMessage,
    clearMessages,
    lastAction,
    setLastAction,
    startLiveMode
  } = useJarvisStore();

  // Initialize two-stage wake-word listener ("JARVIS")
  useJarvisHotword();

  // App store & external controls
  const { 
    view, 
    setView, 
    setIsRunning, 
    isRunning, 
    timeLeft, 
    setTimeLeft, 
    setActiveTimer, 
    activeTimer,
    maybachCoins,
    setMaybachCoins,
    totalMinutesFocused 
  } = useAppStore();
  const frequencyStore = useFrequencyStore();

  const [inputVal, setInputVal] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Global shortcut 'Shift+L' to enter Live mode directly
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'L' || e.key === 'l') && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        startLiveMode();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [startLiveMode]);

  // Dynamic Shader Variant: "wave" for speaking/listening/idle, "fluid-dots" when thinking/processing
  const currentShaderVariant: SiriWaveVariant = useMemo(() => {
    if ((voiceState as string) === 'processing_command' || (voiceState as string) === 'PROCESSING_COMMAND' || isProcessing || aiState === 'thinking') {
      return 'fluid-dots';
    }
    return 'wave';
  }, [voiceState, isProcessing, aiState]);

  // Determine current Spot UI type based on latest message
  const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const spotType = useMemo(() => {
    if (showHistory) return null;
    if (!latestMessage) return null;
    if (latestMessage.mediaResults && latestMessage.mediaResults.length > 0) return 'video';
    if (latestMessage.stockData) return 'stock';
    if (latestMessage.taskData && latestMessage.taskData.tasks) return 'task';
    if (latestMessage.weatherData) return 'weather';
    if (latestMessage.newsData) return 'news';
    if (latestMessage.earthquakeData) return 'earthquake';
    if (latestMessage.issData) return 'iss';
    if (latestMessage.nasaData) return 'nasa';
    if (latestMessage.cryptoData) return 'crypto';
    if (latestMessage.fxData) return 'fx';
    if (latestMessage.watchlistData) return 'watchlist';
    if (latestMessage.portfolioData) return 'portfolio';
    return null;
  }, [latestMessage, showHistory]);

  // Process User Input via Centralized Global Command Dispatcher
  const handleUserMessage = useCallback(async (rawText: string) => {
    const text = rawText.trim();
    if (!text) return;
    setInputVal('');
    setIsProcessing(true);
    try {
      await handleGlobalJarvisCommand(text);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleWatchVideoInThePlace = (video: { id: string; title: string; thumbnail: string; url: string }) => {
    setView('place');
    window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'place' } }));
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('start-theatre', { 
        detail: { 
          url: video.url, 
          videoId: video.id, 
          title: video.title, 
          thumbnail: video.thumbnail 
        } 
      }));
    }, 50);
    closeJarvis();
  };

  // In minimized mode, do not render a duplicate floating bubble in top-right
  if (!isOpen || displayMode === 'minimized') return null;

  // Render State Pill supporting 10 explicit FSM states
  const renderStateBadge = () => {
    switch (voiceState as string) {
      case 'disabled':
        return { label: "Voice Disabled", color: "bg-zinc-800/40 border-zinc-700/50 text-zinc-400", dot: "bg-zinc-500" };
      case 'standby':
      case 'WAKE_WORD_LISTENING':
        return { label: "Say 'JARVIS'", color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300", dot: "bg-emerald-400" };
      case 'wake_candidate':
        return { label: "Verifying...", color: "bg-amber-500/15 border-amber-500/30 text-amber-300 animate-pulse", dot: "bg-amber-400 animate-ping" };
      case 'activated':
      case 'WAKE_WORD_DETECTED':
        return { label: "Yes, Sir?", color: "bg-cyan-500/20 border-cyan-500/40 text-cyan-200 shadow-sm", dot: "bg-cyan-400 animate-ping" };
      case 'listening_for_command':
      case 'LISTENING_FOR_COMMAND':
        return { label: "Listening...", color: "bg-rose-500/15 border-rose-500/30 text-rose-300 animate-pulse", dot: "bg-rose-400 animate-ping" };
      case 'transcribing_command':
        return { label: "Transcribing...", color: "bg-indigo-500/15 border-indigo-500/30 text-indigo-300 animate-pulse", dot: "bg-indigo-400" };
      case 'processing_command':
      case 'PROCESSING_COMMAND':
        return { label: "Processing...", color: "bg-purple-500/15 border-purple-500/30 text-purple-300 animate-pulse", dot: "bg-purple-400" };
      case 'confirmation_required':
        return { label: "Confirm Action", color: "bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse", dot: "bg-amber-400 animate-bounce" };
      case 'speaking_response':
      case 'SPEAKING_RESPONSE':
        return { label: "Jarvis Speaking", color: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300", dot: "bg-cyan-400 animate-pulse" };
      case 'error':
      case 'ERROR':
        return { label: "Voice Error", color: "bg-red-500/15 border-red-500/30 text-red-300", dot: "bg-red-400" };
      default:
        return { label: "Standby", color: "bg-white/5 border-white/10 text-white/70", dot: "bg-white/40" };
    }
  };

  const badge = renderStateBadge();

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-3xl backdrop-saturate-150 flex flex-col justify-between p-6 md:p-10 select-none overflow-hidden"
        style={{
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          backdropFilter: 'blur(40px) saturate(180%)'
        }}
      >
        {/* Soft Ambient Apple-style Light Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-500/10 via-purple-500/5 to-transparent rounded-full blur-[140px] pointer-events-none z-0" />

        {/* TOP BAR */}
        <div className="w-full flex items-center justify-between pb-4 border-b border-white/10 max-w-6xl mx-auto relative z-20">
          {/* Logo & Status */}
          <div className="flex items-center gap-3.5">
            <div className="flex flex-col">
              <h1 className="font-heading font-extrabold text-2xl md:text-3xl text-white tracking-tighter lowercase leading-none flex items-center gap-1">
                jarvis<span className="text-cyan-400">.</span>
              </h1>
            </div>
            <div className={`flex items-center gap-2.5 px-3 py-1 rounded-full border text-[9px] md:text-[10px] font-mono uppercase tracking-[0.2em] font-bold ${badge.color}`}>
              <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                <ThinkingOrb state={resolveOrbState(voiceState, aiState, telemetry?.activeTool, telemetry?.geminiStatus)} size={20} theme="dark" />
              </div>
              <span>{badge.label}</span>
            </div>
          </div>

          {/* Action Pills */}
          <div className="flex items-center gap-2">
            {/* Enter Live Mode Button */}
            <button
              onClick={() => startLiveMode()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/10 hover:border-white/25 text-[10px] font-mono uppercase font-bold tracking-wider transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Start Live Voice Conversation (Shift+L)"
            >
              <Radio size={12} className="text-cyan-400 animate-pulse" />
              <span>Live Mode</span>
              <span className="hidden md:inline px-1.5 py-0.2 rounded bg-white/10 text-[8px] text-white/60">⇧L</span>
            </button>

            <button
              onClick={() => setShowDebug(!showDebug)}
              className={`p-2 rounded-xl border transition-all text-[10px] font-mono uppercase font-bold flex items-center gap-1.5 ${
                showDebug ? 'bg-white text-black border-white' : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
              }`}
              title="Toggle Telemetry Monitor"
            >
              <Bug size={14} />
              <span className="hidden sm:inline text-[9px]">Telemetry</span>
            </button>

            <button
              onClick={() => setVoiceFeedbackEnabled(!voiceFeedbackEnabled)}
              className={`px-3.5 py-2 rounded-xl border text-[10px] font-mono uppercase font-bold tracking-widest transition-all flex items-center gap-2 ${
                voiceFeedbackEnabled 
                  ? 'bg-white text-black border-white' 
                  : 'bg-white/5 text-white/50 border-white/10 hover:border-white/30'
              }`}
              title="Toggle Spoken Responses (TTS)"
            >
              {voiceFeedbackEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              <span className="hidden sm:inline">{voiceFeedbackEnabled ? 'Voice ON' : 'Muted'}</span>
            </button>

            <button
              onClick={() => setIsHotwordEnabled(!isHotwordEnabled)}
              className={`hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[10px] font-mono uppercase font-bold tracking-widest transition-all ${
                isHotwordEnabled 
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                  : 'bg-white/5 text-white/40 border-white/10'
              }`}
              title="Toggle Wake-Word ('JARVIS')"
            >
              <Radio size={12} className={isHotwordEnabled ? 'text-emerald-400' : 'text-white/30'} />
              <span>Wake: {isHotwordEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2 rounded-xl border transition-all ${
                showHistory ? 'bg-white text-black border-white shadow-lg' : 'bg-white/5 text-white/50 border-white/10 hover:text-white hover:border-white/30'
              }`}
              title="Conversation Log"
            >
              <MessageSquare size={14} />
            </button>

            {/* Switch to Expanded Island Mode */}
            <button
              onClick={() => setDisplayMode('expanded')}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-all cursor-pointer"
              title="Switch to Island Window Mode"
            >
              <SlidersHorizontal size={14} />
            </button>

            {/* Switch to Minimized Capsule Mode */}
            <button
              onClick={() => setDisplayMode('minimized')}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-all cursor-pointer"
              title="Minimize to Dynamic Island Capsule"
            >
              <Minimize2 size={14} />
            </button>

            <button
              onClick={closeJarvis}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-all text-[10px] font-mono uppercase tracking-wider cursor-pointer"
              title="Dismiss (Esc)"
            >
              <X size={14} />
              <span className="hidden sm:inline text-[9px] text-white/30">Esc</span>
            </button>
          </div>
        </div>

        {/* DEVELOPER DEBUG TELEMETRY DRAWER */}
        <AnimatePresence>
          {showDebug && (
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full max-w-6xl mx-auto my-2 p-4 rounded-2xl bg-black/90 border border-white/15 backdrop-blur-3xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-[10px] font-mono text-white/70 shadow-2xl relative z-30"
            >
              <div>
                <span className="text-white/40 block uppercase tracking-wider">STATE / PHASE</span>
                <span className="font-bold text-cyan-300">{telemetry.phase}</span>
              </div>
              <div>
                <span className="text-white/40 block uppercase tracking-wider">SESSION ID</span>
                <span className="font-bold text-white truncate block">{telemetry.sessionId || 'None'}</span>
              </div>
              <div>
                <span className="text-white/40 block uppercase tracking-wider">WAKE DETECTOR</span>
                <span className={`font-bold ${telemetry.wakeWordEnabled ? 'text-emerald-300' : 'text-white/40'}`}>
                  {telemetry.wakeWordEnabled ? 'ONLINE' : 'DISABLED'}
                </span>
              </div>
              <div>
                <span className="text-white/40 block uppercase tracking-wider">MIC STATUS</span>
                <span className={`font-bold ${telemetry.microphoneStatus === 'listening' ? 'text-emerald-300' : telemetry.microphoneStatus === 'error' ? 'text-red-400' : 'text-white/60'}`}>
                  {telemetry.microphoneStatus.toUpperCase()} ({telemetry.audioSampleRate}Hz)
                </span>
              </div>
              <div>
                <span className="text-white/40 block uppercase tracking-wider">GEMINI STATUS</span>
                <span className={`font-bold ${telemetry.geminiStatus === 'connected' ? 'text-emerald-300' : telemetry.geminiStatus === 'processing' ? 'text-purple-300 animate-pulse' : 'text-white/50'}`}>
                  {telemetry.geminiStatus?.toUpperCase() || 'IDLE'}
                </span>
              </div>
              <div>
                <span className="text-white/40 block uppercase tracking-wider">TEXT REASONING MODEL</span>
                <span className="font-bold text-amber-300 font-mono">{getSelectedTextModel()}</span>
              </div>
              <div>
                <span className="text-white/40 block uppercase tracking-wider">LIVE VOICE MODEL</span>
                <span className="font-bold text-cyan-300 font-mono">{getSelectedLiveModel()}</span>
              </div>
              <div>
                <span className="text-white/40 block uppercase tracking-wider">ACTIVE LISTENERS</span>
                <span className="font-bold text-cyan-300">{telemetry.activeListenerCount || 1} registered</span>
              </div>
              <div>
                <span className="text-white/40 block uppercase tracking-wider">ACTIVE TIMERS</span>
                <span className="font-bold text-purple-300">{telemetry.activeTimers || 0} active</span>
              </div>
              <div>
                <span className="text-white/40 block uppercase tracking-wider">ACTIVE TOOL</span>
                <span className="font-bold text-amber-300">{telemetry.activeTool || 'None'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-white/40 block uppercase tracking-wider">LAST TRANSITION</span>
                <span className="font-bold text-white/90 truncate block">{telemetry.lastTransition || 'None'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-white/40 block uppercase tracking-wider">LAST ERROR</span>
                <span className="font-bold text-red-400 truncate block">{telemetry.error || 'None'}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================
            CENTER STAGE: Hybrid Visualizer Stage OR Dynamic SPOT UI
            ======================================================== */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full my-4 relative">
          
          {/* CASE 1: SPOT UI ACTIVE (The visualizer docks into top pill) */}
          {spotType && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center justify-center relative z-20 flex-1"
            >
              {/* Top Docked Visualizer Pill */}
              <motion.div 
                layout
                className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-2xl shadow-lg mb-3 shrink-0"
              >
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <JarvisOrbVisualizer
                    voiceState={voiceState}
                    aiState={aiState}
                    isProcessing={isProcessing}
                    activeTool={telemetry?.activeTool}
                    geminiStatus={telemetry?.geminiStatus as any}
                    size="sm"
                  />
                </div>
                <div className="flex flex-col min-w-0 max-w-md">
                  <span className="text-[8px] font-mono uppercase tracking-widest text-white/40">JARVIS Assistant</span>
                  <span className="text-xs font-medium text-white/90 truncate">{latestMessage?.text}</span>
                </div>
                <button 
                  onClick={() => {
                    addMessage({ role: 'assistant', text: "Standing by, sir." });
                  }}
                  className="ml-2 p-1 text-white/40 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
                  title="Dismiss Spot Card"
                >
                  <X size={13} />
                </button>
              </motion.div>

              {/* Dynamic Spot UI Container */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.32, 1.2, 0.55, 1] }}
                className="w-full max-w-4xl mx-auto p-5 sm:p-6 rounded-3xl bg-zinc-950/75 border border-white/15 backdrop-blur-3xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] relative overflow-hidden"
              >
                {spotType === 'video' && latestMessage?.mediaResults && (
                  <SpotVideoWidget videos={latestMessage.mediaResults} onWatch={handleWatchVideoInThePlace} />
                )}
                {spotType === 'stock' && latestMessage?.stockData && (
                  <SpotStockWidget {...latestMessage.stockData} />
                )}
                {spotType === 'task' && latestMessage?.taskData && (
                  <SpotTaskWidget {...latestMessage.taskData} />
                )}
                {spotType === 'weather' && latestMessage?.weatherData && (
                  <SpotWeatherWidget data={latestMessage.weatherData} />
                )}
                {spotType === 'news' && latestMessage?.newsData && (
                  <SpotNewsWidget data={latestMessage.newsData} />
                )}
                {spotType === 'earthquake' && latestMessage?.earthquakeData && (
                  <SpotEarthquakeWidget data={latestMessage.earthquakeData} />
                )}
                {spotType === 'iss' && latestMessage?.issData && (
                  <SpotIssWidget data={latestMessage.issData} />
                )}
                {spotType === 'nasa' && latestMessage?.nasaData && (
                  <SpotNasaWidget data={latestMessage.nasaData} />
                )}
                {spotType === 'crypto' && latestMessage?.cryptoData && (
                  <SpotCryptoWidget data={latestMessage.cryptoData} />
                )}
                {spotType === 'fx' && latestMessage?.fxData && (
                  <SpotFxWidget data={latestMessage.fxData} />
                )}
                {spotType === 'watchlist' && latestMessage?.watchlistData && (
                  <SpotWatchlistWidget data={latestMessage.watchlistData} />
                )}
                {spotType === 'portfolio' && latestMessage?.portfolioData && (
                  <SpotPortfolioWidget data={latestMessage.portfolioData} />
                )}
              </motion.div>
            </motion.div>
          )}

          {/* CASE 2: DEFAULT AMBIENT STAGE (No spot content -> Balanced SiriWave + Fluid Dots + Thinking Orb in center) */}
          {!spotType && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center w-full"
            >
              {/* Dynamic Visualizer Stage: Wave on speech, Fluid-dots on listening, ThinkingOrbs on processing/solving/idle */}
              <div className="relative flex items-center justify-center mb-6">
                <JarvisOrbVisualizer
                  voiceState={voiceState}
                  aiState={aiState}
                  isProcessing={isProcessing}
                  activeTool={telemetry?.activeTool}
                  geminiStatus={telemetry?.geminiStatus as any}
                  size={typeof window !== 'undefined' && window.innerWidth < 640 ? 'md' : 'hero'}
                />
              </div>

              {/* Dynamic Typography / Live Transcript */}
              <div className="w-full max-w-3xl text-center min-h-[80px] flex items-center justify-center px-6 z-10">
                <AnimatePresence mode="wait">
                  {(telemetry?.interimTranscript || telemetry?.transcript) ? (
                    <motion.div
                      key="live-transcript"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="px-6 py-3 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-xl font-heading text-lg md:text-2xl text-white font-medium tracking-tight"
                    >
                      “{telemetry?.interimTranscript || telemetry?.transcript}”
                    </motion.div>
                  ) : messages.length > 0 && ((voiceState as string) === 'speaking_response' || (voiceState as string) === 'standby' || (voiceState as string) === 'SPEAKING_RESPONSE' || (voiceState as string) === 'WAKE_WORD_LISTENING') ? (
                    <motion.div
                      key={messages[messages.length - 1].id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="px-6 py-3 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md font-heading font-medium text-lg md:text-2xl text-white/90 leading-relaxed max-w-2xl lowercase tracking-tight"
                    >
                      {messages[messages.length - 1].text}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="idle-prompt"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center gap-2"
                    >
                      <span className="text-xs md:text-sm font-mono text-white/50 uppercase tracking-[0.25em]">
                        {(voiceState as string) === 'listening_for_command' || (voiceState as string) === 'LISTENING_FOR_COMMAND' ? "I'm listening — speak your command..." : "Say 'JARVIS' or press microphone to speak"}
                      </span>
                      <span className="text-[10px] font-mono text-cyan-400/80 uppercase tracking-widest">
                        Ready for focus timers, tasks, video search and stock market charts
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* Telemetry Stream Drawer */}
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute inset-x-0 bottom-0 top-0 bg-zinc-950/95 border border-white/15 rounded-3xl p-6 backdrop-blur-3xl overflow-y-auto flex flex-col z-30 shadow-[0_25px_70px_rgba(0,0,0,0.95)] no-scrollbar"
              >
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white">
                      <Terminal size={15} />
                    </div>
                    <div>
                      <span className="font-mono text-xs uppercase tracking-widest text-white font-extrabold block">Neural Command History</span>
                      <span className="text-[8px] font-mono uppercase tracking-wider text-white/40">Audit log & directives</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={clearMessages}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[9px] font-mono uppercase tracking-wider transition-all border border-white/10 cursor-pointer"
                    >
                      Clear Log
                    </button>
                    <button
                      onClick={() => setShowHistory(false)}
                      className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 space-y-3.5 overflow-y-auto pr-2">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3.5 rounded-2xl border text-xs font-mono transition-all ${
                        m.role === 'user' 
                          ? 'bg-white/5 border-white/15 text-white ml-auto max-w-[80%] shadow-md' 
                          : 'bg-black/70 border-white/10 text-white/90 mr-auto max-w-[85%]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[8px] text-white/40 uppercase tracking-widest mb-1.5 font-bold">
                        <span className={m.role === 'user' ? 'text-white/60' : 'text-cyan-400'}>
                          {m.role === 'user' ? 'Direct Vocal Input' : 'J.A.R.V.I.S.'}
                        </span>
                        <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                      <p className="leading-relaxed text-[13px]">{m.text}</p>
                      {m.actionSummary && (
                        <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center gap-1.5 text-[9px] text-emerald-400 font-bold uppercase tracking-wider">
                          <CheckCircle2 size={11} />
                          <span>Executed: {m.actionSummary}</span>
                        </div>
                      )}
                      {m.mediaResults && m.mediaResults.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                          <div className="flex items-center gap-1.5 text-[9px] text-red-400 font-bold uppercase tracking-wider">
                            <Youtube size={12} />
                            <span>Playable Video Results:</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {m.mediaResults.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => handleWatchVideoInThePlace(item)}
                                className="flex gap-2.5 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-500/40 cursor-pointer transition-all items-center group/card shadow-sm"
                              >
                                <img src={item.thumbnail} className="w-16 h-10 object-cover rounded-lg shrink-0 brightness-90 group-hover/card:brightness-100" alt="" />
                                <div className="flex-1 min-w-0">
                                  <span className="text-[8px] text-red-400 uppercase font-mono block truncate">{item.channelTitle}</span>
                                  <h6 className="text-[10px] font-mono text-white font-bold truncate">{item.title}</h6>
                                </div>
                                <Play size={14} className="text-white/40 group-hover/card:text-red-400 shrink-0" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* BOTTOM COMMAND CONSOLE */}
        <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-3.5 relative z-20">
          {/* Main Input Row */}
          <div className="w-full flex items-center gap-2.5 bg-zinc-950/80 border border-white/15 focus-within:border-white/40 focus-within:shadow-[0_0_30px_rgba(255,255,255,0.1)] p-2 pl-3 rounded-2xl md:rounded-full backdrop-blur-2xl transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
            
            {/* Push To Talk / Command Listener Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={async () => {
                if ((voiceState as string) === 'listening_for_command' || (voiceState as string) === 'LISTENING_FOR_COMMAND') {
                  jarvisVoiceEngine.commitCommand();
                } else {
                  await jarvisVoiceEngine.warmupMicrophone();
                  jarvisVoiceEngine.startCommandListening();
                }
              }}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer relative ${
                (voiceState as string) === 'listening_for_command' || (voiceState as string) === 'LISTENING_FOR_COMMAND'
                  ? 'bg-rose-500 text-white shadow-[0_0_30px_rgba(244,63,94,0.8)] animate-pulse' 
                  : 'bg-white text-black hover:bg-zinc-200 shadow-md'
              }`}
              title={(voiceState as string) === 'listening_for_command' || (voiceState as string) === 'LISTENING_FOR_COMMAND' ? "Click to finalize spoken directive" : "Speak directive to J.A.R.V.I.S."}
            >
              {(voiceState as string) === 'listening_for_command' || (voiceState as string) === 'LISTENING_FOR_COMMAND' ? <MicOff size={18} /> : <Mic size={18} />}
              {((voiceState as string) === 'listening_for_command' || (voiceState as string) === 'LISTENING_FOR_COMMAND') && (
                <span className="absolute inset-0 rounded-full border-2 border-rose-400 animate-ping pointer-events-none" />
              )}
            </motion.button>

            {/* Cancel Button if listening/processing */}
            {((voiceState as string) === 'listening_for_command' || (voiceState as string) === 'transcribing_command' || (voiceState as string) === 'processing_command' || (voiceState as string) === 'speaking_response' || (voiceState as string) === 'LISTENING_FOR_COMMAND' || (voiceState as string) === 'PROCESSING_COMMAND' || (voiceState as string) === 'SPEAKING_RESPONSE') && (
              <button
                onClick={() => jarvisVoiceEngine.cancelCurrentAction()}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 border border-white/15 flex items-center justify-center transition-all cursor-pointer shrink-0"
                title="Cancel Voice Action (Esc)"
              >
                <X size={12} />
              </button>
            )}

            {/* Retry Button if Error */}
            {((voiceState as string) === 'error' || (voiceState as string) === 'ERROR') && (
              <button
                onClick={() => jarvisVoiceEngine.startCommandListening()}
                className="w-8 h-8 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 flex items-center justify-center transition-all cursor-pointer shrink-0"
                title="Retry Voice Connection"
              >
                <RefreshCw size={12} />
              </button>
            )}

            {/* Input field */}
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const toSubmit = (inputVal || '').trim() || (telemetry?.interimTranscript || telemetry?.transcript || '').trim();
                  if (toSubmit) {
                    jarvisVoiceEngine.stopCommandListening();
                    handleUserMessage(toSubmit);
                  }
                }
              }}
              placeholder={(voiceState as string) === 'listening_for_command' || (voiceState as string) === 'LISTENING_FOR_COMMAND' ? (telemetry?.interimTranscript || telemetry?.transcript || "Listening to your voice...") : "Type command or message to J.A.R.V.I.S..."}
              className="flex-1 bg-transparent border-none text-xs md:text-sm text-white placeholder:text-white/30 font-mono focus:outline-none px-2"
            />

            {/* Send button */}
            <button
              onClick={() => {
                const toSubmit = (inputVal || '').trim() || (telemetry?.interimTranscript || telemetry?.transcript || '').trim();
                if (toSubmit) {
                  jarvisVoiceEngine.stopCommandListening();
                  handleUserMessage(toSubmit);
                }
              }}
              disabled={(!(inputVal || '').trim() && !(telemetry?.interimTranscript || telemetry?.transcript || '').trim()) || isProcessing}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white text-white hover:text-black border border-white/15 flex items-center justify-center transition-all disabled:opacity-20 shrink-0 cursor-pointer"
              title="Send Command (Enter)"
            >
              <Send size={14} />
            </button>
          </div>

          {/* Quick Command Chips with Category Icons */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full py-1">
            {[
              { label: "weather in Tokyo", icon: <Cloud size={10} className="text-blue-400" /> },
              { label: "crypto prices", icon: <Coins size={10} className="text-amber-400" /> },
              { label: "convert 100 USD to INR", icon: <DollarSign size={10} className="text-emerald-400" /> },
              { label: "world pulse", icon: <Globe size={10} className="text-purple-400" /> },
              { label: "track iss", icon: <RadioIcon size={10} className="text-cyan-400" /> },
              { label: "show recent earthquakes", icon: <Activity size={10} className="text-rose-400" /> },
              { label: "astronomy picture of the day", icon: <Sparkles size={10} className="text-indigo-400" /> },
              { label: "my portfolio", icon: <Percent size={10} className="text-emerald-400" /> },
              { label: "open watchlist", icon: <Eye size={10} className="text-blue-400" /> },
              { label: "search video lofi beats", icon: <Youtube size={10} className="text-red-400" /> },
              { label: "search stock TSLA", icon: <TrendingUp size={10} className="text-emerald-400" /> },
              { label: "what are my tasks?", icon: <CheckSquare size={10} className="text-cyan-400" /> },
              { label: "start 25m timer", icon: <Clock size={10} className="text-blue-400" /> }
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleUserMessage(chip.label)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.12] border border-white/10 hover:border-white/25 text-[10px] font-mono text-white/65 hover:text-white transition-all whitespace-nowrap backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95"
              >
                {chip.icon}
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Developer Diagnostics Modal */}
        <JarvisDiagnosticsPanel isOpen={showDebug} onClose={() => setShowDebug(false)} />
      </motion.div>
    </AnimatePresence>
  );
}
