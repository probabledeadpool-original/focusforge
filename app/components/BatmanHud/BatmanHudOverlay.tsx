"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, Shield, Radio, Activity, Play, Pause, 
  Clock, Cpu, Battery, Eye, ChevronRight, X, 
  Layers, Crosshair, RefreshCw, FileText, ListTodo, 
  Search, Zap, Music, Globe, Users, MapPin, Film, 
  SkipForward, SkipBack, Coins, Flame, Award, 
  CheckCircle2, Trash2, Plus, Volume1, Volume2,
  TrendingUp, ExternalLink, Check, Sun, Cloud, 
  Droplets, Wind, DollarSign, ArrowUpRight, 
  ArrowDownRight, Youtube, Maximize2, Power, 
  RotateCcw, Sliders, Headphones, Tv, Monitor, 
  Shuffle, Repeat, ArrowRight, CornerDownLeft,
  Radio as RadioIcon, Compass, Sparkles, CheckSquare
} from 'lucide-react';
import { ThinkingOrb } from 'thinking-orbs';
import { TargetingUI, HudFrame } from '@/components/ui/animated-hud-targeting-ui';
import { useBatmanStore, BatmanActiveModule } from '@/hooks/useBatmanStore';
import { useFrequencyStore } from '@/hooks/useFrequencyStore';
import { useJarvisStore } from '@/hooks/useJarvisStore';
import { useAppStore } from '@/hooks/useAppStore';
import { jarvisVoiceEngine } from '@/lib/jarvisVoiceEngine';
import { handleGlobalJarvisCommand } from '@/lib/jarvisCommandDispatcher';
import { resolveOrbState } from '../JarvisOrbVisualizer';
import { jarvisAudio } from '@/lib/jarvisAudio';
import { searchYouTube, YouTubeSearchResult } from '@/lib/youtubeSearch';
import type { 
  WeatherData, NewsData, EarthquakeData, 
  IssData, NasaApodData, CryptoData, 
  FxData, WatchlistData, PortfolioData 
} from '@/lib/intelligence/types';
import type { StockSpotData } from '@/hooks/useJarvisStore';

// =========================================================================
// DATA STRUCTURES
// =========================================================================

interface TacticalVideoItem {
  id: string;
  title: string;
  thumbnail: string;
  category: string;
  channel?: string;
}

const DEFAULT_THE_PLACE_VAULT: { name: string; category: string; items: TacticalVideoItem[] }[] = [
  {
    name: "Neo-Tokyo Cyberpunk Ambient",
    category: "Ambient",
    items: [
      { id: 'TIqsKXQHvFI', title: 'High Stakes Ambient Nocturne', thumbnail: 'https://img.youtube.com/vi/TIqsKXQHvFI/maxresdefault.jpg', category: 'Cyberpunk', channel: 'Focus Forge' },
      { id: 'Ui7Hb4cvamY', title: 'Solving the Unsolvable (Focus Core)', thumbnail: 'https://img.youtube.com/vi/Ui7Hb4cvamY/maxresdefault.jpg', category: 'Synthwave', channel: 'Wayne Enterprises' },
      { id: 'df4p7bP_MaY', title: 'Discipline Over Motivation (Rain Suite)', thumbnail: 'https://img.youtube.com/vi/df4p7bP_MaY/maxresdefault.jpg', category: 'Rain', channel: 'Shadow Ops' },
    ]
  },
  {
    name: "Alpha & Gamma Wave Siphon",
    category: "Binaural",
    items: [
      { id: '8ObcKYvrCpY', title: 'Symbol of Focus & Execution (40Hz Gamma)', thumbnail: 'https://img.youtube.com/vi/8ObcKYvrCpY/maxresdefault.jpg', category: '40Hz Gamma', channel: 'Neural Forge' },
      { id: 'on40ISrPmIk', title: 'Pressure Makes Diamonds (10Hz Alpha)', thumbnail: 'https://img.youtube.com/vi/on40ISrPmIk/maxresdefault.jpg', category: '10Hz Alpha', channel: 'Neural Forge' },
    ]
  },
  {
    name: "Lofi Study Vault",
    category: "Music",
    items: [
      { id: 'NrMjwLKhGg4', title: 'Winning in Silence (Analog Lofi)', thumbnail: 'https://img.youtube.com/vi/NrMjwLKhGg4/maxresdefault.jpg', category: 'Lofi', channel: 'Chill Beats' },
      { id: 'jfKfPfyJRdk', title: 'Lofi Girl - Beats to Relax/Study to', thumbnail: 'https://img.youtube.com/vi/jfKfPfyJRdk/maxresdefault.jpg', category: 'Live Lofi', channel: 'Lofi Girl' },
      { id: 'YKLKoHORjYI', title: 'The Batman Atmospheric Focus Suite', thumbnail: 'https://img.youtube.com/vi/YKLKoHORjYI/maxresdefault.jpg', category: 'OST', channel: 'WaterTower Music' },
    ]
  }
];

interface TacticalDirective {
  id: string;
  text: string;
  priority: 'CRITICAL' | 'HIGH' | 'TACTICAL';
  completed: boolean;
  createdAt: number;
}

interface PomodoroState {
  mode: 'pomodoro' | 'stopwatch';
  durationSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  preset: 25 | 50 | 90 | 5 | 'custom';
  laps: string[];
}

// =========================================================================
// MONOCHROME TACTICAL SPOT UI COMPONENTS FOR BATMAN HUD
// =========================================================================

function BatmanSpotVideoWidget({ 
  videos, 
  onWatch 
}: { 
  videos: YouTubeSearchResult[]; 
  onWatch: (video: YouTubeSearchResult) => void; 
}) {
  return (
    <div className="space-y-3 w-full max-h-[50vh] overflow-y-auto pr-1 no-scrollbar">
      <div className="flex items-center justify-between border-b border-white/20 pb-2">
        <div className="flex items-center gap-2">
          <Youtube size={14} className="text-white" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-white">
            TACTICAL VIDEO NODES ({videos.length})
          </span>
        </div>
        <span className="text-[9px] text-white/50 font-mono">SAY &ldquo;PLAY 1&rdquo; OR CLICK TO STREAM</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {videos.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => onWatch(item)}
            className="group bg-white/[0.04] hover:bg-white/[0.12] border border-white/20 hover:border-white p-2.5 cursor-pointer transition-all duration-200 flex flex-col justify-between relative"
          >
            <div className="relative aspect-video overflow-hidden bg-black border border-white/10 mb-2">
              <img 
                src={item.thumbnail} 
                alt={item.title} 
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
              />
              <div className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 text-[9px] font-mono text-white border border-white/30">
                #{idx + 1}
              </div>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Play size={16} fill="white" className="text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[8px] text-white/50 font-mono uppercase block truncate">
                {item.channelTitle || 'STREAM NODE'}
              </span>
              <h5 className="font-mono text-[10px] font-bold text-white line-clamp-2 leading-tight">
                {item.title}
              </h5>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BatmanSpotStockWidget({ stock }: { stock: StockSpotData }) {
  return (
    <div className="bg-white/[0.04] border border-white/20 p-4 space-y-3 w-full">
      <div className="flex items-center justify-between border-b border-white/20 pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-white" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-white">
            MARKET TELEMETRY: {stock.symbol.toUpperCase()}
          </span>
        </div>
        <span className="text-[9px] text-white/50 font-mono">EXCHANGE: {stock.exchange || 'NASDAQ'}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-black/60 border border-white/10 p-2.5">
          <span className="text-[8px] text-white/50 block font-mono">ASSET TICKER</span>
          <span className="text-base font-bold text-white font-mono">{stock.symbol.toUpperCase()}</span>
        </div>
        <div className="bg-black/60 border border-white/10 p-2.5">
          <span className="text-[8px] text-white/50 block font-mono">NAME</span>
          <span className="text-xs font-bold text-white font-mono truncate block">{stock.name || stock.symbol}</span>
        </div>
        <div className="bg-black/60 border border-white/10 p-2.5">
          <span className="text-[8px] text-white/50 block font-mono">STATUS</span>
          <span className="text-xs font-bold text-white font-mono">MONITORED</span>
        </div>
        <div className="bg-black/60 border border-white/10 p-2.5">
          <span className="text-[8px] text-white/50 block font-mono">DATA FEED</span>
          <span className="text-xs font-bold text-white font-mono">SYNCHRONIZED</span>
        </div>
      </div>
    </div>
  );
}

function BatmanSpotWeatherWidget({ weather }: { weather: WeatherData }) {
  return (
    <div className="bg-white/[0.04] border border-white/20 p-4 space-y-3 w-full">
      <div className="flex items-center justify-between border-b border-white/20 pb-2">
        <div className="flex items-center gap-2">
          <Sun size={14} className="text-white" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-white">
            METEOROLOGICAL SENSOR: {weather.city.toUpperCase()}
          </span>
        </div>
        <span className="text-[9px] text-white/50 font-mono">{(weather.conditionText || 'CLEAR').toUpperCase()}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-black/60 border border-white/10 p-2.5">
          <span className="text-[8px] text-white/50 block font-mono">TEMPERATURE</span>
          <span className="text-xl font-bold text-white font-mono">{weather.temperature}°C</span>
        </div>
        <div className="bg-black/60 border border-white/10 p-2.5">
          <span className="text-[8px] text-white/50 block font-mono">HUMIDITY</span>
          <span className="text-sm font-bold text-white font-mono">{weather.humidity}%</span>
        </div>
        <div className="bg-black/60 border border-white/10 p-2.5">
          <span className="text-[8px] text-white/50 block font-mono">WIND VELOCITY</span>
          <span className="text-sm font-bold text-white font-mono">{weather.windSpeed} km/h</span>
        </div>
        <div className="bg-black/60 border border-white/10 p-2.5">
          <span className="text-[8px] text-white/50 block font-mono">SYSTEM LOCATION</span>
          <span className="text-sm font-bold text-white font-mono truncate block">{weather.city}</span>
        </div>
      </div>
    </div>
  );
}

function BatmanSpotCryptoWidget({ crypto }: { crypto: CryptoData }) {
  return (
    <div className="bg-white/[0.04] border border-white/20 p-4 space-y-3 w-full max-h-[45vh] overflow-y-auto no-scrollbar">
      <div className="flex items-center justify-between border-b border-white/20 pb-2">
        <div className="flex items-center gap-2">
          <Coins size={14} className="text-white" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-white">
            CRYPTOGRAPHIC ASSET TELEMETRY
          </span>
        </div>
        <span className="text-[9px] text-white/50 font-mono">TOP MARKET NODES</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {crypto.coins.slice(0, 6).map((coin) => (
          <div key={coin.id} className="bg-black/60 border border-white/10 p-2.5 flex justify-between items-center">
            <div>
              <span className="text-[9px] text-white/50 block font-mono">{coin.name}</span>
              <span className="text-xs font-bold text-white font-mono">{coin.symbol.toUpperCase()}</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-white font-mono">${coin.current_price.toLocaleString()}</span>
              <span className="text-[9px] text-white/60 block font-mono">
                {coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BatmanSpotNewsWidget({ news }: { news: NewsData }) {
  return (
    <div className="bg-white/[0.04] border border-white/20 p-4 space-y-3 w-full max-h-[45vh] overflow-y-auto no-scrollbar">
      <div className="flex items-center justify-between border-b border-white/20 pb-2">
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-white" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-white">
            WORLD PULSE // GLOBAL INTELLIGENCE FEED
          </span>
        </div>
        <span className="text-[9px] text-white/50 font-mono">{news.articles.length} DISPATCHES</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {news.articles.slice(0, 6).map((art, idx) => (
          <a
            key={idx}
            href={art.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 bg-black/60 border border-white/10 hover:border-white transition-all space-y-1 block group"
          >
            <div className="flex justify-between items-center text-[8px] text-white/40 font-mono">
              <span className="uppercase">{art.source || art.domain || 'INTEL'}</span>
              <span>{art.publishedAt || 'LIVE'}</span>
            </div>
            <h6 className="text-[10px] font-bold text-white group-hover:text-white/80 line-clamp-2 font-mono">
              {art.title}
            </h6>
          </a>
        ))}
      </div>
    </div>
  );
}

function BatmanSpotEarthquakeWidget({ data }: { data: EarthquakeData }) {
  return (
    <div className="bg-white/[0.04] border border-white/20 p-4 space-y-3 w-full max-h-[45vh] overflow-y-auto no-scrollbar">
      <div className="flex items-center justify-between border-b border-white/20 pb-2">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-white" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-white">
            SEISMIC TELEMETRY (USGS SENSORS)
          </span>
        </div>
        <span className="text-[9px] text-white/50 font-mono">{data.earthquakes.length} EVENTS DETECTED</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {data.earthquakes.slice(0, 6).map((eq) => (
          <div key={eq.id} className="p-2.5 bg-black/60 border border-white/10 flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-white font-mono block">M {eq.mag}</span>
              <span className="text-[9px] text-white/50 font-mono truncate max-w-[140px] block">{eq.place}</span>
            </div>
            <span className="text-[8px] text-white/40 font-mono">{eq.depth} KM DEPTH</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BatmanSpotIssWidget({ data }: { data: IssData }) {
  return (
    <div className="bg-white/[0.04] border border-white/20 p-4 space-y-3 w-full">
      <div className="flex items-center justify-between border-b border-white/20 pb-2">
        <div className="flex items-center gap-2">
          <RadioIcon size={14} className="text-white" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-white">
            ORBITAL TRACKER: {data.name}
          </span>
        </div>
        <span className="text-[9px] text-white/50 font-mono">NORAD TELEMETRY</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-black/60 border border-white/10 p-2.5">
          <span className="text-[8px] text-white/50 block font-mono">LATITUDE</span>
          <span className="text-base font-bold text-white font-mono">{data.latitude}°</span>
        </div>
        <div className="bg-black/60 border border-white/10 p-2.5">
          <span className="text-[8px] text-white/50 block font-mono">LONGITUDE</span>
          <span className="text-base font-bold text-white font-mono">{data.longitude}°</span>
        </div>
        <div className="bg-black/60 border border-white/10 p-2.5">
          <span className="text-[8px] text-white/50 block font-mono">ALTITUDE</span>
          <span className="text-base font-bold text-white font-mono">{data.altitude} KM</span>
        </div>
        <div className="bg-black/60 border border-white/10 p-2.5">
          <span className="text-[8px] text-white/50 block font-mono">VELOCITY</span>
          <span className="text-base font-bold text-white font-mono">{Math.round(data.velocity).toLocaleString()} KM/H</span>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// MAIN BATMAN TACTICAL HUD OVERLAY COMPONENT
// =========================================================================

export default function BatmanHudOverlay() {
  const batmanStore = useBatmanStore();
  const frequencyStore = useFrequencyStore();
  const jarvisStore = useJarvisStore();
  const appStore = useAppStore();

  // -------------------------------------------------------------------------
  // MODULE 1: THE PLACE & VIDEO STREAM STATE (SYNCHRONIZED WITH LOCALSTORAGE)
  // -------------------------------------------------------------------------
  const [activeVideoId, setActiveVideoId] = useState<string>('TIqsKXQHvFI');
  const [activeVideoTitle, setActiveVideoTitle] = useState<string>('High Stakes Ambient Nocturne');
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(true);
  const [isCrtFilterActive, setIsCrtFilterActive] = useState<boolean>(false);
  const [videoSearchQuery, setVideoSearchQuery] = useState<string>('');
  const [videoSearchResults, setVideoSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [isSearchingVideos, setIsSearchingVideos] = useState<boolean>(false);
  const [customVideoUrlInput, setCustomVideoUrlInput] = useState<string>('');
  const [thePlacePlaylists, setThePlacePlaylists] = useState(DEFAULT_THE_PLACE_VAULT);

  // Sync playlists from ThePlace localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncPlaylists = () => {
      try {
        const savedPlaylists = localStorage.getItem('focusforge-theplace-playlists');
        if (savedPlaylists) {
          const parsed = JSON.parse(savedPlaylists);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const formatted = parsed.map((p: any) => ({
              name: p.name || 'Custom Playlist',
              category: p.category || 'Custom',
              items: (p.items || []).map((it: any) => ({
                id: it.id,
                title: it.title || 'Track',
                thumbnail: it.thumbnail || `https://img.youtube.com/vi/${it.id}/hqdefault.jpg`,
                category: p.category || 'Custom',
                channel: it.channelTitle || 'The Place'
              }))
            }));
            setThePlacePlaylists([...formatted, ...DEFAULT_THE_PLACE_VAULT]);
            return;
          }
        }
      } catch (e) {}
      setThePlacePlaylists(DEFAULT_THE_PLACE_VAULT);
    };

    syncPlaylists();
    window.addEventListener('storage', syncPlaylists);
    return () => window.removeEventListener('storage', syncPlaylists);
  }, []);

  // -------------------------------------------------------------------------
  // MODULE 2: MISSION CHRONOMETER & POMODORO STATE
  // -------------------------------------------------------------------------
  const [pomodoro, setPomodoro] = useState<PomodoroState>({
    mode: 'pomodoro',
    durationSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    isRunning: false,
    preset: 25,
    laps: []
  });

  // -------------------------------------------------------------------------
  // MODULE 3: TACTICAL DIRECTIVES (SYNCHRONIZED WITH FOCUS-TASKS LOCALSTORAGE)
  // -------------------------------------------------------------------------
  const [directives, setDirectives] = useState<TacticalDirective[]>([]);
  const [newDirectiveText, setNewDirectiveText] = useState<string>('');
  const [newDirectivePriority, setNewDirectivePriority] = useState<'CRITICAL' | 'HIGH' | 'TACTICAL'>('HIGH');
  const [directiveFilter, setDirectiveFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  const loadTasksFromStorage = () => {
    try {
      const stored = localStorage.getItem('focus-tasks');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const mapped: TacticalDirective[] = parsed.map((t: any, idx: number) => ({
            id: t.id ? String(t.id) : `task-${idx}-${Date.now()}`,
            text: t.text || t.title || 'Untitled Directive',
            priority: t.priority ? (String(t.priority).toUpperCase() as any) : 'HIGH',
            completed: Boolean(t.done || t.completed),
            createdAt: t.createdAt || Date.now()
          }));
          setDirectives(mapped);
          return;
        }
      }
    } catch (e) {}
    // Fallback default tasks
    setDirectives([
      { id: '1', text: 'Execute high-frequency cognitive session', priority: 'CRITICAL', completed: true, createdAt: Date.now() - 3600000 },
      { id: '2', text: 'Audit neural telemetry & system logs', priority: 'HIGH', completed: false, createdAt: Date.now() - 1800000 },
      { id: '3', text: 'Calibrate binaural focus audio stream', priority: 'TACTICAL', completed: false, createdAt: Date.now() - 900000 },
    ]);
  };

  useEffect(() => {
    loadTasksFromStorage();
    const handleTasksEvent = () => loadTasksFromStorage();
    window.addEventListener('tasksUpdated', handleTasksEvent);
    window.addEventListener('storage', handleTasksEvent);
    return () => {
      window.removeEventListener('tasksUpdated', handleTasksEvent);
      window.removeEventListener('storage', handleTasksEvent);
    };
  }, []);

  const saveTasksToStorage = (updated: TacticalDirective[]) => {
    setDirectives(updated);
    try {
      const payload = updated.map(d => ({
        id: d.id,
        text: d.text,
        title: d.text,
        done: d.completed,
        completed: d.completed,
        priority: d.priority,
        createdAt: d.createdAt
      }));
      localStorage.setItem('focus-tasks', JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent('tasksUpdated', { detail: { tasks: payload, source: 'batman-hud' } }));
    } catch (e) {}
  };

  // -------------------------------------------------------------------------
  // MODULE 4: ACOUSTIC SYNTHESIZER & AMBIENT SOUNDBOARD
  // -------------------------------------------------------------------------
  const [ambientLayers, setAmbientLayers] = useState<{ id: string; name: string; volume: number; active: boolean; hz?: string }[]>([
    { id: 'rain', name: 'Heavy Gotham Rain', volume: 60, active: true, hz: 'Pink Noise' },
    { id: 'cyber', name: 'Nocturnal Cyber Hum', volume: 45, active: false, hz: '432Hz' },
    { id: 'gamma', name: '40Hz Gamma Siphon', volume: 70, active: true, hz: '40Hz' },
    { id: 'wind', name: 'Tower High Wind', volume: 30, active: false, hz: 'Brown Noise' },
    { id: 'white', name: 'Cosmic White Noise', volume: 50, active: false, hz: 'White Noise' },
  ]);

  // System metrics & Inputs
  const [inputCommand, setInputCommand] = useState('');
  const [fps, setFps] = useState(60);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [dismissedSpotId, setDismissedSpotId] = useState<string | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const animRef = useRef<number | null>(null);

  // -------------------------------------------------------------------------
  // 1. CINEMATIC INTRO & DISENGAGE TRANSITION CONTROLLER
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (batmanStore.isBatmanMode) {
      setDismissedSpotId(null);
      loadTasksFromStorage();
      
      // Stage 1: Blurring
      batmanStore.setIntroPhase('blurring');
      
      // Stage 2: Blank Delay (2.0s blackout pause)
      const t1 = setTimeout(() => {
        batmanStore.setIntroPhase('blank_delay');
        if (typeof window !== 'undefined') {
          jarvisAudio.playActivate();
        }
      }, 700);

      // Stage 3: Orchestrated Intro Reveal
      const t2 = setTimeout(() => {
        batmanStore.setIntroPhase('animating_intro');
      }, 1900);

      // Stage 4: Full Active Mode
      const t3 = setTimeout(() => {
        batmanStore.setIntroPhase('active');
      }, 2600);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [batmanStore.isBatmanMode]);

  // Clock & Telemetry Tick
  useEffect(() => {
    const clockInterval = setInterval(() => {
      const now = new Date();
      setCurrentTimeStr(now.toTimeString().split(' ')[0] + ' UTC');
    }, 1000);

    return () => clearInterval(clockInterval);
  }, []);

  // Frame tick for stopwatch & FPS
  useEffect(() => {
    if (!batmanStore.isBatmanMode) return;

    let lastFrameTime = performance.now();
    let frameCount = 0;

    const tick = () => {
      const now = performance.now();
      frameCount++;
      if (now - lastFrameTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastFrameTime = now;
      }

      if (batmanStore.lockInStartTime) {
        const diff = Date.now() - batmanStore.lockInStartTime;
        const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
        const m = Math.floor((diff / (1000 * 60)) % 60).toString().padStart(2, '0');
        const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
        setElapsedTime(`${h}:${m}:${s}`);
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [batmanStore.isBatmanMode, batmanStore.lockInStartTime]);

  // Pomodoro Countdown Timer Interval
  useEffect(() => {
    if (!pomodoro.isRunning) return;

    const interval = setInterval(() => {
      setPomodoro(prev => {
        if (prev.mode === 'pomodoro') {
          if (prev.remainingSeconds <= 1) {
            jarvisAudio.playExecute();
            appStore.setTotalMinutesFocused((mins: number) => mins + Math.round(prev.durationSeconds / 60));
            appStore.setMaybachCoins((c: number) => c + 50);
            return {
              ...prev,
              remainingSeconds: prev.durationSeconds,
              isRunning: false
            };
          }
          return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
        } else {
          return { ...prev, remainingSeconds: prev.remainingSeconds + 1 };
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pomodoro.isRunning, pomodoro.mode, appStore]);

  // Keyboard shortcut listener (Escape to disengage)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && batmanStore.isBatmanMode) {
        batmanStore.disengageBatmanMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [batmanStore.isBatmanMode]);

  // Spot UI payload detection across all intelligence types
  const spotMessage = [...jarvisStore.messages].reverse().find(m => 
    (m.mediaResults && m.mediaResults.length > 0) || 
    m.stockData || m.weatherData || m.cryptoData || m.newsData || m.earthquakeData || m.issData || m.nasaData || m.taskData || m.fxData || m.watchlistData || m.portfolioData
  );

  const activeSpotMsg = (spotMessage && spotMessage.id !== dismissedSpotId) ? spotMessage : null;

  const spotType = useMemo(() => {
    if (!activeSpotMsg) return null;
    if (activeSpotMsg.mediaResults && activeSpotMsg.mediaResults.length > 0) return 'video';
    if (activeSpotMsg.stockData) return 'stock';
    if (activeSpotMsg.weatherData) return 'weather';
    if (activeSpotMsg.cryptoData) return 'crypto';
    if (activeSpotMsg.newsData) return 'news';
    if (activeSpotMsg.earthquakeData) return 'earthquake';
    if (activeSpotMsg.issData) return 'iss';
    if (activeSpotMsg.nasaData) return 'nasa';
    if (activeSpotMsg.taskData) return 'task';
    if (activeSpotMsg.fxData) return 'fx';
    if (activeSpotMsg.watchlistData) return 'watchlist';
    if (activeSpotMsg.portfolioData) return 'portfolio';
    return null;
  }, [activeSpotMsg]);

  const orbState = useMemo(() => {
    return resolveOrbState(
      jarvisStore.voiceState,
      jarvisStore.aiState,
      jarvisStore.telemetry?.activeTool,
      jarvisStore.telemetry?.geminiStatus
    );
  }, [jarvisStore.voiceState, jarvisStore.aiState, jarvisStore.telemetry]);

  // Directives handlers
  const toggleDirective = (id: string) => {
    const updated = directives.map(d => {
      if (d.id === id) {
        const next = !d.completed;
        if (next) {
          appStore.setMaybachCoins((c: number) => c + 25);
          jarvisAudio.playExecute();
        }
        return { ...d, completed: next };
      }
      return d;
    });
    saveTasksToStorage(updated);
  };

  const addDirective = () => {
    if (!newDirectiveText.trim()) return;
    const updated: TacticalDirective[] = [
      {
        id: Date.now().toString(),
        text: newDirectiveText.trim(),
        priority: newDirectivePriority,
        completed: false,
        createdAt: Date.now()
      },
      ...directives
    ];
    saveTasksToStorage(updated);
    setNewDirectiveText('');
    jarvisAudio.playExecute();
  };

  const deleteDirective = (id: string) => {
    const updated = directives.filter(d => d.id !== id);
    saveTasksToStorage(updated);
  };

  const clearCompletedDirectives = () => {
    const updated = directives.filter(d => !d.completed);
    saveTasksToStorage(updated);
  };

  // Video Streaming search handler
  const handlePerformVideoSearch = async () => {
    if (!videoSearchQuery.trim()) return;
    setIsSearchingVideos(true);
    try {
      const response = await searchYouTube(videoSearchQuery.trim(), 6);
      setVideoSearchResults(response?.results || []);
    } catch (e) {
      console.warn("YouTube search in Batman HUD failed:", e);
    } finally {
      setIsSearchingVideos(false);
    }
  };

  const handleStreamCustomUrl = () => {
    const url = customVideoUrlInput.trim();
    if (!url) return;
    const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    const vidId = (match && match[2].length === 11) ? match[2] : url;
    setActiveVideoId(vidId);
    setActiveVideoTitle(`Tactical Stream [${vidId}]`);
    setCustomVideoUrlInput('');
    setIsVideoPlaying(true);
  };

  const selectPomodoroPreset = (preset: 25 | 50 | 90 | 5) => {
    setPomodoro({
      mode: 'pomodoro',
      preset,
      durationSeconds: preset * 60,
      remainingSeconds: preset * 60,
      isRunning: false,
      laps: []
    });
  };

  const togglePomodoroPlay = () => {
    setPomodoro(prev => ({ ...prev, isRunning: !prev.isRunning }));
  };

  const resetPomodoro = () => {
    setPomodoro(prev => ({
      ...prev,
      remainingSeconds: prev.mode === 'pomodoro' ? prev.durationSeconds : 0,
      isRunning: false,
      laps: []
    }));
  };

  const recordLap = () => {
    const formatTime = (secs: number) => {
      const m = Math.floor(secs / 60).toString().padStart(2, '0');
      const s = (secs % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    };
    setPomodoro(prev => ({
      ...prev,
      laps: [formatTime(prev.remainingSeconds), ...prev.laps]
    }));
  };

  const formatTimerDigits = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!batmanStore.isBatmanMode && !batmanStore.isDisengaging) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="batman-hud-container"
        initial={{ opacity: 0, filter: 'blur(40px) brightness(0.2)' }}
        animate={{ 
          opacity: batmanStore.isDisengaging ? 0 : 1, 
          filter: batmanStore.isDisengaging ? 'blur(40px) brightness(0.2)' : 'blur(0px) brightness(1.0)',
          scale: batmanStore.isDisengaging ? 0.95 : 1
        }}
        exit={{ opacity: 0, filter: 'blur(40px)', scale: 0.95 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[999] bg-black text-white font-mono overflow-hidden select-none"
      >
        {/* ========================================================================= */}
        {/* PHASE 1, 2 & 3: CINEMATIC BLUR, BLACKOUT & TARGETING RETICLE ANIMATION    */}
        {/* ========================================================================= */}
        {(batmanStore.introPhase === 'blurring' || batmanStore.introPhase === 'blank_delay' || batmanStore.introPhase === 'animating_intro') && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black flex flex-col items-center justify-center p-6 z-50 overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex flex-col items-center justify-center"
            >
              <TargetingUI className="w-80 h-80 max-w-full" pathColors={{ light: "white", dark: "white" }} />
              
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="absolute -bottom-8 flex flex-col items-center gap-1.5"
              >
                <div className="flex items-center gap-2 bg-white text-black px-3 py-1 text-[10px] font-extrabold tracking-[0.3em] uppercase">
                  <Shield size={12} />
                  <span>B.A.T.M.A.N. // LOCK-IN</span>
                </div>
                <span className="text-[9px] text-white/50 font-mono tracking-widest animate-pulse">
                  CALIBRATING TARGETING SYSTEMS...
                </span>
              </motion.div>
            </motion.div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* PHASE 4: GLORIOUS TACTICAL HUD INTERFACE (CINEMATIC FADE-IN TRANSITION)   */}
        {/* ========================================================================= */}
        {batmanStore.introPhase === 'active' && (
          <motion.div
            key="active-batman-hud-viewport"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="w-full h-full"
          >
            <HudFrame className="w-full h-full p-3 sm:p-5 flex flex-col justify-between relative z-20">
              <div className="w-full h-full flex flex-col justify-between overflow-hidden">
                
                {/* 1. TOP TACTICAL SYSTEM BAR (CLEAN & UNOBSTRUCTED FOR EVERYTHING ISLAND) */}
                <motion.header 
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="flex items-center justify-between border-b border-white/20 pb-2.5"
                >
                  {/* Left System Telemetry */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-white text-black px-2.5 py-1 text-[10px] font-extrabold tracking-widest uppercase">
                      <Shield size={12} />
                      <span>B.A.T.M.A.N. // HUD</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-[10px] text-white/60">
                      <span className="text-white font-bold">LOCKED_IN</span>
                      <span className="text-white/20">•</span>
                      <span>FPS: {fps}</span>
                      <span className="text-white/20">•</span>
                      <span>COINS: {appStore.maybachCoins}</span>
                    </div>
                  </div>

                  {/* Top-Center is left 100% empty & unobstructed for Everything Island */}
                  <div className="flex-1" />

                  {/* Right Chronometer & Disengage */}
                  <div className="flex items-center justify-end gap-2">
                    <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/20 px-2.5 py-1">
                      <Clock size={11} className="text-white animate-pulse" />
                      <span className="text-[10px] font-bold text-white tracking-wider">T+ {elapsedTime}</span>
                    </div>

                    <button
                      onClick={() => batmanStore.disengageBatmanMode()}
                      className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-zinc-200 text-black text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                      title="Disengage Batman Mode (Esc)"
                    >
                      <Power size={11} />
                      <span>Disengage</span>
                      <span className="text-[8px] opacity-60">Esc</span>
                    </button>
                  </div>
                </motion.header>

                {/* 2. CENTRAL VIEWPORT ROUTER (ROUTED BY ACTIVE MODULE OR SPOT INTERCEPTOR) */}
                <div className="flex-1 my-3 min-h-0 relative overflow-hidden">
                  
                  {/* SPOT UI INTERCEPTOR OVERLAY */}
                  {spotType && activeSpotMsg && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 z-40 bg-black/95 border border-white/30 p-4 flex flex-col justify-between backdrop-blur-xl"
                    >
                      <div className="flex items-center justify-between border-b border-white/20 pb-2">
                        <div className="flex items-center gap-2">
                          <Crosshair size={14} className="text-white animate-pulse" />
                          <span className="text-[11px] font-bold tracking-widest uppercase text-white">
                            TACTICAL VISOR INTERCEPT: SPOT INTELLIGENCE
                          </span>
                        </div>
                        <button
                          onClick={() => setDismissedSpotId(activeSpotMsg.id)}
                          className="px-2.5 py-1 bg-white text-black hover:bg-zinc-200 text-[9px] font-mono font-bold uppercase transition-colors"
                        >
                          [ CLOSE SPOT INTERCEPT X ]
                        </button>
                      </div>

                      <div className="flex-1 flex items-center justify-center my-3 overflow-y-auto no-scrollbar">
                        {spotType === 'video' && activeSpotMsg.mediaResults && (
                          <BatmanSpotVideoWidget 
                            videos={activeSpotMsg.mediaResults} 
                            onWatch={(v) => {
                              setActiveVideoId(v.id);
                              setActiveVideoTitle(v.title);
                              batmanStore.setActiveModule('media');
                              setDismissedSpotId(activeSpotMsg.id);
                            }} 
                          />
                        )}
                        {spotType === 'stock' && activeSpotMsg.stockData && (
                          <BatmanSpotStockWidget stock={activeSpotMsg.stockData} />
                        )}
                        {spotType === 'weather' && activeSpotMsg.weatherData && (
                          <BatmanSpotWeatherWidget weather={activeSpotMsg.weatherData} />
                        )}
                        {spotType === 'crypto' && activeSpotMsg.cryptoData && (
                          <BatmanSpotCryptoWidget crypto={activeSpotMsg.cryptoData} />
                        )}
                        {spotType === 'news' && activeSpotMsg.newsData && (
                          <BatmanSpotNewsWidget news={activeSpotMsg.newsData} />
                        )}
                        {spotType === 'earthquake' && activeSpotMsg.earthquakeData && (
                          <BatmanSpotEarthquakeWidget data={activeSpotMsg.earthquakeData} />
                        )}
                        {spotType === 'iss' && activeSpotMsg.issData && (
                          <BatmanSpotIssWidget data={activeSpotMsg.issData} />
                        )}
                        {spotType === 'nasa' && activeSpotMsg.nasaData && (
                          <div className="bg-black border border-white/20 p-4 w-full">
                            <span className="text-[11px] font-bold text-white mb-2 block">NASA TELEMETRY</span>
                            <div className="text-[10px] text-white/70">{activeSpotMsg.nasaData.title}</div>
                          </div>
                        )}
                        {spotType === 'task' && activeSpotMsg.taskData && (
                          <div className="bg-black border border-white/20 p-4 w-full">
                            <span className="text-[11px] font-bold text-white mb-2 block">TASK DATABASE SYNCED</span>
                            <div className="text-[10px] text-white/70">Tasks retrieved: {activeSpotMsg.taskData.tasks?.length || 0}</div>
                          </div>
                        )}
                        {spotType === 'fx' && activeSpotMsg.fxData && (
                          <div className="bg-black border border-white/20 p-4 w-full">
                            <span className="text-[11px] font-bold text-white mb-2 block">FX RATES</span>
                            <div className="text-[10px] text-white/70">Pair: {activeSpotMsg.fxData.base}/{activeSpotMsg.fxData.target || 'N/A'} @ {activeSpotMsg.fxData.rate}</div>
                          </div>
                        )}
                      </div>

                      <div className="text-[9px] text-white/50 text-center font-mono">
                        Say &ldquo;close spot&rdquo; or click [ CLOSE SPOT INTERCEPT ] to return to active tactical module.
                      </div>
                    </motion.div>
                  )}

                  {/* ------------------------------------------------------------------------- */}
                  {/* MODULE 01: NEURAL CORE (Voice, AI Intent, Orb, Overview)                  */}
                  {/* ------------------------------------------------------------------------- */}
                  {batmanStore.activeModule === 'voice_core' && (
                    <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4">
                      {/* Left Wing: Mission Objectives Snapshot */}
                      <div className="hidden lg:flex lg:col-span-3 flex-col justify-between border border-white/20 bg-white/[0.02] p-3.5 space-y-3">
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between border-b border-white/20 pb-1.5">
                            <div className="flex items-center gap-1.5">
                              <ListTodo size={13} className="text-white" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-white">DIRECTIVES</span>
                            </div>
                            <span className="text-[9px] text-white/50">{directives.filter(d => d.completed).length}/{directives.length}</span>
                          </div>
                          <div className="space-y-1.5 max-h-[30vh] overflow-y-auto no-scrollbar">
                            {directives.slice(0, 5).map(d => (
                              <div 
                                key={d.id} 
                                onClick={() => toggleDirective(d.id)}
                                className={`p-2 border text-[9px] cursor-pointer transition-all flex items-center justify-between ${
                                  d.completed ? 'bg-white/[0.02] border-white/10 text-white/40 line-through' : 'bg-white/[0.05] border-white/20 text-white hover:border-white'
                                }`}
                              >
                                <span className="truncate">{d.text}</span>
                                <CheckCircle2 size={11} className={d.completed ? 'text-white/40' : 'text-white'} />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5 border-t border-white/20 pt-2 text-[9px] text-white/60">
                          <div className="flex justify-between">
                            <span>FOCUS MINUTES</span>
                            <span className="font-bold text-white">{appStore.totalMinutesFocused} MIN</span>
                          </div>
                          <div className="w-full bg-white/10 h-1">
                            <div className="bg-white h-full" style={{ width: `${Math.min(100, (appStore.maybachCoins % 500) / 5)}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Center Stage: Neural Core Gyroscope */}
                      <div className="lg:col-span-6 flex flex-col items-center justify-center border border-white/20 bg-white/[0.02] p-4 relative overflow-hidden">
                        <div className="absolute top-2 left-2 text-[8px] text-white/30 font-mono">+ 01_NEURAL_CORE</div>
                        <div className="absolute top-2 right-2 text-[8px] text-white/30 font-mono">SYSTEM // LOCKED +</div>
                        
                        <div className="relative flex items-center justify-center w-48 h-48 sm:w-56 sm:h-56 my-auto">
                          <div className="absolute inset-0 rounded-full border border-dashed border-white/20 animate-[spin_30s_linear_infinite]" />
                          <div className="absolute inset-3 rounded-full border border-white/10 animate-[spin_20s_linear_infinite_reverse]" />
                          <div className="absolute inset-8 rounded-full border border-white/20" />
                          <div className="relative z-10 scale-125">
                            <ThinkingOrb state={orbState} size={64} theme="dark" />
                          </div>
                        </div>

                        <div className="space-y-1 text-center mt-2">
                          <div className="text-xs font-extrabold tracking-widest uppercase text-white">
                            {jarvisStore.voiceState === 'listening_for_command' || jarvisStore.voiceState === 'transcribing_command'
                              ? 'LISTENING TO DIRECTIVE...'
                              : jarvisStore.voiceState === 'speaking_response'
                              ? 'TRANSMITTING NEURAL AUDIO...'
                              : 'NEURAL CORE ACTIVE • SAY "JARVIS"'}
                          </div>
                          <div className="text-[10px] text-white/50 max-w-sm font-mono truncate">
                            {jarvisStore.telemetry?.interimTranscript || jarvisStore.telemetry?.finalCommandTranscript || 'Voice pipeline engaged to tactical frequency.'}
                          </div>
                        </div>
                      </div>

                      {/* Right Wing: Frequency & Quick Radars */}
                      <div className="hidden lg:flex lg:col-span-3 flex-col justify-between border border-white/20 bg-white/[0.02] p-3.5 space-y-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between border-b border-white/20 pb-1.5">
                            <div className="flex items-center gap-1.5">
                              <Headphones size={13} className="text-white" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-white">FREQUENCY</span>
                            </div>
                            <span className="text-[9px] text-white/50">{frequencyStore.isPlaying ? 'STREAMING' : 'PAUSED'}</span>
                          </div>
                          <div className="p-2.5 bg-black/60 border border-white/10 space-y-1.5">
                            <span className="text-[8px] text-white/40 uppercase block">ACTIVE SOUNDSCAPE</span>
                            <div className="text-[11px] font-bold text-white truncate">
                              {frequencyStore.getCurrentTrack()?.title || 'The Batman - Atmospheric Suite'}
                            </div>
                            <button 
                              onClick={() => frequencyStore.togglePlay()}
                              className="mt-1 w-full py-1 bg-white text-black text-[9px] font-bold uppercase flex items-center justify-center gap-1"
                            >
                              {frequencyStore.isPlaying ? <Pause size={10} /> : <Play size={10} />}
                              <span>{frequencyStore.isPlaying ? 'Pause' : 'Play Stream'}</span>
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5 border-t border-white/20 pt-2">
                          <span className="text-[8px] text-white/50 uppercase font-bold block">TACTICAL VOICE RADAR</span>
                          <div className="grid grid-cols-2 gap-1">
                            {[
                              { label: "Open Video", cmd: "open the place" },
                              { label: "Start 25m", cmd: "start 25 minute timer" },
                              { label: "Tokyo Weather", cmd: "weather in tokyo" },
                              { label: "Crypto Pulse", cmd: "crypto prices" }
                            ].map((item, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleGlobalJarvisCommand(item.cmd)}
                                className="p-1 bg-white/[0.04] hover:bg-white text-white hover:text-black border border-white/15 text-[8px] font-mono text-left truncate transition-all"
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ------------------------------------------------------------------------- */}
                  {/* MODULE 02: THE PLACE (TACTICAL VIDEO STREAMER & AMBIENT VISUALS)          */}
                  {/* ------------------------------------------------------------------------- */}
                  {(batmanStore.activeModule === 'media' || batmanStore.activeModule === 'spot') && (
                    <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4">
                      {/* Left 9 Cols: Main Video Stream Viewport */}
                      <div className="lg:col-span-9 flex flex-col border border-white/20 bg-white/[0.02] p-3 space-y-2 h-full">
                        <div className="flex items-center justify-between border-b border-white/20 pb-2">
                          <div className="flex items-center gap-2">
                            <Tv size={14} className="text-white" />
                            <span className="text-[11px] font-bold uppercase tracking-widest text-white truncate max-w-md">
                              TACTICAL FEED: {activeVideoTitle}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setIsCrtFilterActive(!isCrtFilterActive)}
                              className={`px-2 py-0.5 text-[8px] font-mono border transition-all ${
                                isCrtFilterActive ? 'bg-white text-black font-bold' : 'border-white/20 text-white/60 hover:text-white'
                              }`}
                            >
                              [ CRT SCANLINES {isCrtFilterActive ? 'ON' : 'OFF'} ]
                            </button>
                          </div>
                        </div>

                        {/* Embedded Video Player */}
                        <div className={`relative flex-1 w-full bg-black border border-white/20 overflow-hidden ${
                          isCrtFilterActive ? 'after:absolute after:inset-0 after:bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] after:bg-[length:100%_4px] after:pointer-events-none' : ''
                        }`}>
                          <iframe
                            src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1&controls=1&loop=1&playlist=${activeVideoId}&enablejsapi=1`}
                            title="Batman Tactical Stream"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full border-0 absolute inset-0"
                          />
                        </div>

                        {/* Video Stream Controls & URL input */}
                        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                          <div className="flex items-center gap-1.5 w-full sm:w-auto">
                            <button
                              onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                              className="px-3 py-1 bg-white text-black text-[9px] font-bold uppercase flex items-center gap-1"
                            >
                              {isVideoPlaying ? <Pause size={10} /> : <Play size={10} />}
                              <span>{isVideoPlaying ? 'Pause' : 'Play'}</span>
                            </button>
                          </div>
                          <div className="flex-1 flex items-center gap-1 bg-black/60 border border-white/20 px-2 py-1 w-full">
                            <ExternalLink size={11} className="text-white/40" />
                            <input
                              type="text"
                              value={customVideoUrlInput}
                              onChange={(e) => setCustomVideoUrlInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleStreamCustomUrl()}
                              placeholder="Paste YouTube Video URL or ID..."
                              className="bg-transparent text-[10px] text-white placeholder:text-white/30 font-mono focus:outline-none flex-1"
                            />
                            <button
                              onClick={handleStreamCustomUrl}
                              className="px-2 py-0.5 bg-white text-black text-[8px] font-bold uppercase"
                            >
                              STREAM
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right 3 Cols: Curated "The Place" Vault & Search */}
                      <div className="lg:col-span-3 flex flex-col border border-white/20 bg-white/[0.02] p-3 space-y-3 h-full">
                        {/* Search Bar */}
                        <div className="flex items-center gap-1 bg-black/60 border border-white/20 px-2 py-1">
                          <Search size={11} className="text-white/40" />
                          <input
                            type="text"
                            value={videoSearchQuery}
                            onChange={(e) => setVideoSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handlePerformVideoSearch()}
                            placeholder="Search tactical video nodes..."
                            className="bg-transparent text-[10px] text-white placeholder:text-white/30 font-mono focus:outline-none flex-1"
                          />
                          <button
                            onClick={handlePerformVideoSearch}
                            disabled={isSearchingVideos}
                            className="px-2 py-0.5 bg-white text-black text-[8px] font-bold uppercase"
                          >
                            {isSearchingVideos ? '...' : 'FIND'}
                          </button>
                        </div>

                        {/* Video List: Search Results OR Curated Playlist */}
                        <div className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-2.5">
                          {videoSearchResults.length > 0 ? (
                            <div className="space-y-1.5">
                              <span className="text-[9px] text-white/50 uppercase font-bold block">SEARCH RESULTS</span>
                              {videoSearchResults.map((vid) => (
                                <div
                                  key={vid.id}
                                  onClick={() => {
                                    setActiveVideoId(vid.id);
                                    setActiveVideoTitle(vid.title);
                                  }}
                                  className="p-1.5 bg-white/[0.04] hover:bg-white/[0.12] border border-white/20 hover:border-white cursor-pointer transition-all flex items-center gap-2"
                                >
                                  <img src={vid.thumbnail} alt="" className="w-12 aspect-video object-cover grayscale" />
                                  <div className="truncate">
                                    <h6 className="text-[9px] font-bold text-white truncate">{vid.title}</h6>
                                    <span className="text-[8px] text-white/50">{vid.channelTitle}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            thePlacePlaylists.map((pl) => (
                              <div key={pl.name} className="space-y-1.5">
                                <span className="text-[8px] text-white/50 uppercase font-bold tracking-wider block border-b border-white/10 pb-0.5">
                                  {pl.name}
                                </span>
                                {pl.items.map((item) => (
                                  <div
                                    key={item.id}
                                    onClick={() => {
                                      setActiveVideoId(item.id);
                                      setActiveVideoTitle(item.title);
                                    }}
                                    className={`p-1.5 border cursor-pointer transition-all flex items-center gap-2 ${
                                      activeVideoId === item.id 
                                        ? 'bg-white text-black border-white font-bold' 
                                        : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/15 text-white'
                                    }`}
                                  >
                                    <img src={item.thumbnail} alt="" className="w-10 aspect-video object-cover grayscale" />
                                    <div className="truncate flex-1">
                                      <h6 className="text-[9px] truncate">{item.title}</h6>
                                      <span className="text-[7px] opacity-60 uppercase">{item.category}</span>
                                    </div>
                                    <Play size={10} fill="currentColor" />
                                  </div>
                                ))}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ------------------------------------------------------------------------- */}
                  {/* MODULE 03: MISSION CHRONOMETER & POMODORO                                 */}
                  {/* ------------------------------------------------------------------------- */}
                  {batmanStore.activeModule === 'timer' && (
                    <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4">
                      {/* Left 8 Cols: Giant Tactical Digital Chronometer */}
                      <div className="lg:col-span-8 flex flex-col justify-between border border-white/20 bg-white/[0.02] p-6 space-y-4">
                        {/* Mode & Preset Selector */}
                        <div className="flex flex-wrap items-center justify-between border-b border-white/20 pb-3 gap-2">
                          <div className="flex items-center gap-1.5 bg-black/60 border border-white/20 p-1">
                            <button
                              onClick={() => setPomodoro(prev => ({ ...prev, mode: 'pomodoro', remainingSeconds: prev.durationSeconds }))}
                              className={`px-3 py-1 text-[9px] font-mono uppercase font-bold transition-all ${
                                pomodoro.mode === 'pomodoro' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                              }`}
                            >
                              POMODORO
                            </button>
                            <button
                              onClick={() => setPomodoro(prev => ({ ...prev, mode: 'stopwatch', remainingSeconds: 0 }))}
                              className={`px-3 py-1 text-[9px] font-mono uppercase font-bold transition-all ${
                                pomodoro.mode === 'stopwatch' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                              }`}
                            >
                              STOPWATCH
                            </button>
                          </div>

                          {pomodoro.mode === 'pomodoro' && (
                            <div className="flex items-center gap-1">
                              {[25, 50, 90, 5].map((preset) => (
                                <button
                                  key={preset}
                                  onClick={() => selectPomodoroPreset(preset as any)}
                                  className={`px-2.5 py-1 text-[9px] font-mono border uppercase transition-all ${
                                    pomodoro.preset === preset 
                                      ? 'bg-white text-black font-extrabold border-white' 
                                      : 'border-white/20 text-white/60 hover:text-white'
                                  }`}
                                >
                                  {preset}M
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Giant Digital Readout */}
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <div className="text-[9px] text-white/40 tracking-[0.4em] uppercase mb-2">
                            {pomodoro.mode === 'pomodoro' ? 'FOCUS INTERVAL COUNTDOWN' : 'TACTICAL STOPWATCH ELAPSED'}
                          </div>
                          <div className="text-6xl sm:text-8xl font-black font-mono tracking-tighter text-white select-all">
                            {formatTimerDigits(pomodoro.remainingSeconds)}
                          </div>
                          {/* High-contrast Tactical Bar */}
                          <div className="w-full max-w-md bg-white/10 h-2 mt-4">
                            <div 
                              className="bg-white h-full transition-all duration-300"
                              style={{ 
                                width: pomodoro.mode === 'pomodoro' 
                                  ? `${Math.max(0, Math.min(100, (1 - pomodoro.remainingSeconds / pomodoro.durationSeconds) * 100))}%`
                                  : `${(pomodoro.remainingSeconds % 60) * 1.66}%`
                              }}
                            />
                          </div>
                        </div>

                        {/* Chronometer Actions */}
                        <div className="flex items-center justify-center gap-3 pt-2">
                          <button
                            onClick={togglePomodoroPlay}
                            className="px-6 py-2 bg-white text-black font-mono text-xs font-black uppercase tracking-wider hover:bg-zinc-200 transition-all flex items-center gap-2"
                          >
                            {pomodoro.isRunning ? <Pause size={14} /> : <Play size={14} />}
                            <span>{pomodoro.isRunning ? 'PAUSE TIMER' : 'START FOCUS'}</span>
                          </button>
                          <button
                            onClick={resetPomodoro}
                            className="px-4 py-2 border border-white/20 hover:border-white text-white font-mono text-xs uppercase transition-all flex items-center gap-1.5"
                          >
                            <RotateCcw size={13} />
                            <span>RESET</span>
                          </button>
                          {pomodoro.mode === 'stopwatch' && (
                            <button
                              onClick={recordLap}
                              className="px-4 py-2 border border-white/20 hover:border-white text-white font-mono text-xs uppercase transition-all"
                            >
                              SPLIT LAP
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Right 4 Cols: Laps & History */}
                      <div className="lg:col-span-4 flex flex-col border border-white/20 bg-white/[0.02] p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-white/20 pb-2">
                          <div className="flex items-center gap-1.5">
                            <Activity size={13} className="text-white" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white">CYCLE LOGS</span>
                          </div>
                          <span className="text-[9px] text-white/50">STREAK: {Math.max(1, Math.floor(appStore.totalMinutesFocused / 60))} DAYS</span>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
                          {pomodoro.laps.length === 0 ? (
                            <div className="text-[9px] text-white/40 italic p-3 border border-dashed border-white/10 text-center">
                              No split intervals recorded in this session.
                            </div>
                          ) : (
                            pomodoro.laps.map((lap, idx) => (
                              <div key={idx} className="p-2 bg-white/[0.04] border border-white/10 flex justify-between text-[10px]">
                                <span className="text-white/60 font-mono">LAP #{pomodoro.laps.length - idx}</span>
                                <span className="font-bold text-white font-mono">{lap}</span>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="p-3 bg-black/60 border border-white/10 text-[9px] space-y-1">
                          <div className="flex justify-between text-white/60">
                            <span>COMPLETED CYCLES</span>
                            <span className="text-white font-bold">{Math.floor(appStore.totalMinutesFocused / 25)} CYCLES</span>
                          </div>
                          <div className="flex justify-between text-white/60">
                            <span>FOCUS REWARD</span>
                            <span className="text-white font-bold">+50 COINS / CYCLE</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ------------------------------------------------------------------------- */}
                  {/* MODULE 04: TACTICAL MISSION DIRECTIVES (TASKS & HABITS)                   */}
                  {/* ------------------------------------------------------------------------- */}
                  {batmanStore.activeModule === 'tasks' && (
                    <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4">
                      {/* Left 8 Cols: Interactive Directives Matrix */}
                      <div className="lg:col-span-8 flex flex-col justify-between border border-white/20 bg-white/[0.02] p-4 space-y-3">
                        {/* Header & Filter Deck */}
                        <div className="flex flex-wrap items-center justify-between border-b border-white/20 pb-2 gap-2">
                          <div className="flex items-center gap-2">
                            <ListTodo size={14} className="text-white" />
                            <span className="text-[11px] font-bold uppercase tracking-widest text-white">
                              MISSION DIRECTIVES ({directives.filter(d => d.completed).length}/{directives.length})
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map((f) => (
                              <button
                                key={f}
                                onClick={() => setDirectiveFilter(f)}
                                className={`px-2 py-0.5 text-[8px] font-mono uppercase border transition-all ${
                                  directiveFilter === f 
                                    ? 'bg-white text-black font-bold border-white' 
                                    : 'border-white/20 text-white/60 hover:text-white'
                                }`}
                              >
                                {f}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Directives List */}
                        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                          {directives
                            .filter(d => {
                              if (directiveFilter === 'ACTIVE') return !d.completed;
                              if (directiveFilter === 'COMPLETED') return d.completed;
                              return true;
                            })
                            .map((directive) => (
                              <div
                                key={directive.id}
                                className={`p-2.5 border transition-all flex items-center justify-between gap-3 ${
                                  directive.completed
                                    ? 'bg-white/[0.02] border-white/10 text-white/40'
                                    : 'bg-white/[0.04] border-white/20 text-white hover:border-white'
                                }`}
                              >
                                <div 
                                  onClick={() => toggleDirective(directive.id)}
                                  className="flex items-center gap-2.5 cursor-pointer flex-1 truncate"
                                >
                                  <CheckCircle2 
                                    size={14} 
                                    className={directive.completed ? 'text-white/40' : 'text-white'} 
                                  />
                                  <span className={`text-[10px] font-mono truncate ${directive.completed ? 'line-through' : ''}`}>
                                    {directive.text}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[8px] px-1.5 py-0.5 border uppercase font-mono ${
                                    directive.priority === 'CRITICAL' 
                                      ? 'bg-white text-black font-black border-white' 
                                      : 'border-white/20 text-white/60'
                                  }`}>
                                    {directive.priority}
                                  </span>
                                  <button
                                    onClick={() => deleteDirective(directive.id)}
                                    className="text-white/30 hover:text-white p-1"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>

                        {/* Add Directive Input Console */}
                        <div className="flex items-center gap-2 bg-black/60 border border-white/20 p-1.5">
                          <select
                            value={newDirectivePriority}
                            onChange={(e) => setNewDirectivePriority(e.target.value as any)}
                            className="bg-black text-white text-[9px] font-mono border border-white/20 px-2 py-1 focus:outline-none"
                          >
                            <option value="CRITICAL">CRITICAL</option>
                            <option value="HIGH">HIGH</option>
                            <option value="TACTICAL">TACTICAL</option>
                          </select>
                          <input
                            type="text"
                            value={newDirectiveText}
                            onChange={(e) => setNewDirectiveText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addDirective()}
                            placeholder="Initialize new tactical mission objective..."
                            className="bg-transparent text-[10px] text-white placeholder:text-white/30 font-mono focus:outline-none flex-1"
                          />
                          <button
                            onClick={addDirective}
                            className="px-3 py-1 bg-white text-black text-[9px] font-bold uppercase flex items-center gap-1"
                          >
                            <Plus size={11} />
                            <span>ADD</span>
                          </button>
                        </div>
                      </div>

                      {/* Right 4 Cols: Focus Economy Ledger */}
                      <div className="lg:col-span-4 flex flex-col justify-between border border-white/20 bg-white/[0.02] p-4 space-y-3">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-white/20 pb-2">
                            <div className="flex items-center gap-1.5">
                              <Coins size={13} className="text-white" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-white">COGNITIVE ECONOMY</span>
                            </div>
                            <span className="text-[9px] text-white/50">TIER // V</span>
                          </div>

                          <div className="p-3 bg-black/60 border border-white/10 space-y-2">
                            <span className="text-[8px] text-white/50 block font-mono uppercase">MAYBACH REWARDS BALANCE</span>
                            <div className="text-2xl font-black text-white font-mono">{appStore.maybachCoins} COINS</div>
                            <span className="text-[8px] text-white/40 block font-mono">+25 COINS EARNED PER DIRECTIVE COMPLETED</span>
                          </div>

                          <div className="space-y-1 text-[9px] text-white/60">
                            <div className="flex justify-between">
                              <span>TACTICAL RANK</span>
                              <span className="text-white font-bold">SHADOW OPERATIVE</span>
                            </div>
                            <div className="flex justify-between">
                              <span>TOTAL FOCUS LOGGED</span>
                              <span className="text-white font-bold">{appStore.totalMinutesFocused} MINUTES</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={clearCompletedDirectives}
                          className="w-full py-1.5 border border-white/20 hover:border-white text-white text-[9px] font-mono uppercase transition-colors"
                        >
                          [ PURGE COMPLETED DIRECTIVES ]
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ------------------------------------------------------------------------- */}
                  {/* MODULE 05: ACOUSTIC SYNTHESIZER & BINAURAL FREQUENCY                       */}
                  {/* ------------------------------------------------------------------------- */}
                  {batmanStore.activeModule === 'ledger' && (
                    <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4">
                      {/* Left 6 Cols: Master Audio Stream & Player */}
                      <div className="lg:col-span-6 flex flex-col justify-between border border-white/20 bg-white/[0.02] p-4 space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-white/20 pb-2">
                            <div className="flex items-center gap-2">
                              <Headphones size={14} className="text-white" />
                              <span className="text-[11px] font-bold uppercase tracking-widest text-white">
                                MASTER AUDIO SYNTHESIZER
                              </span>
                            </div>
                            <span className="text-[9px] text-white/50">{frequencyStore.isPlaying ? 'ACTIVE' : 'MUTED'}</span>
                          </div>

                          <div className="p-4 bg-black/60 border border-white/10 space-y-2.5">
                            <span className="text-[8px] text-white/40 uppercase block">STREAMING AUDIO CORE</span>
                            <div className="text-sm font-bold text-white truncate font-mono">
                              {frequencyStore.getCurrentTrack()?.title || 'The Batman - Atmospheric Suite'}
                            </div>
                            <div className="text-[10px] text-white/60 font-mono">
                              {frequencyStore.getCurrentTrack()?.artist || 'Michael Giacchino'}
                            </div>
                            
                            <div className="flex items-center gap-2 pt-2">
                              <button
                                onClick={() => frequencyStore.togglePlay()}
                                className="px-4 py-1.5 bg-white text-black text-[10px] font-bold uppercase flex items-center gap-1.5"
                              >
                                {frequencyStore.isPlaying ? <Pause size={12} /> : <Play size={12} />}
                                <span>{frequencyStore.isPlaying ? 'PAUSE' : 'PLAY'}</span>
                              </button>
                              <button
                                onClick={() => frequencyStore.next()}
                                className="p-1.5 border border-white/20 hover:border-white text-white text-[10px]"
                              >
                                <SkipForward size={12} />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 border-t border-white/20 pt-3">
                          <div className="flex items-center justify-between text-[9px] text-white/60">
                            <span>MASTER GAIN VOLUME</span>
                            <span>{frequencyStore.volume}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={frequencyStore.volume}
                            onChange={(e) => frequencyStore.setVolume(Number(e.target.value))}
                            className="w-full accent-white bg-white/20 cursor-pointer h-1"
                          />
                        </div>
                      </div>

                      {/* Right 6 Cols: Ambient Soundboard Layers */}
                      <div className="lg:col-span-6 flex flex-col border border-white/20 bg-white/[0.02] p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-white/20 pb-2">
                          <div className="flex items-center gap-2">
                            <Sliders size={14} className="text-white" />
                            <span className="text-[11px] font-bold uppercase tracking-widest text-white">
                              BINAURAL & AMBIENT LAYERS
                            </span>
                          </div>
                          <span className="text-[9px] text-white/50">MULTI-CHANNEL MIX</span>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                          {ambientLayers.map((layer) => (
                            <div key={layer.id} className="p-2.5 bg-black/60 border border-white/10 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setAmbientLayers(prev => prev.map(l => l.id === layer.id ? { ...l, active: !l.active } : l))}
                                    className={`px-2 py-0.5 text-[8px] font-mono uppercase border ${
                                      layer.active ? 'bg-white text-black font-bold border-white' : 'border-white/20 text-white/40'
                                    }`}
                                  >
                                    {layer.active ? 'ACTIVE' : 'OFF'}
                                  </button>
                                  <span className="text-[10px] font-bold text-white font-mono">{layer.name}</span>
                                </div>
                                <span className="text-[8px] text-white/50 font-mono">{layer.hz}</span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={layer.volume}
                                onChange={(e) => {
                                  const vol = Number(e.target.value);
                                  setAmbientLayers(prev => prev.map(l => l.id === layer.id ? { ...l, volume: vol } : l));
                                }}
                                className="w-full accent-white bg-white/20 cursor-pointer h-1"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ------------------------------------------------------------------------- */}
                  {/* MODULE 06: INTEL (MARKETS, STOCKS, CRYPTO, WEATHER)                       */}
                  {/* ------------------------------------------------------------------------- */}
                  {batmanStore.activeModule === 'intel' && (
                    <div className="h-full flex flex-col border border-white/20 bg-white/[0.02] p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/20 pb-2">
                        <div className="flex items-center gap-2">
                          <Globe size={14} className="text-white" />
                          <span className="text-[11px] font-bold uppercase tracking-widest text-white">
                            PLANETARY TELEMETRY & INTELLIGENCE RADAR
                          </span>
                        </div>
                        <span className="text-[9px] text-white/50">LIVE NODES CONNECTED</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 flex-1 overflow-y-auto no-scrollbar">
                        <div className="bg-black/60 border border-white/10 p-3 space-y-2">
                          <div className="flex items-center justify-between text-[8px] text-white/50 uppercase">
                            <span>MARKET COMPOSITE</span>
                            <TrendingUp size={12} className="text-white" />
                          </div>
                          <div className="text-xl font-bold font-mono text-white">NASDAQ: 18,340</div>
                          <span className="text-[9px] text-white/60 block font-mono">+1.24% // BULLISH SYNCHRONIZATION</span>
                        </div>

                        <div className="bg-black/60 border border-white/10 p-3 space-y-2">
                          <div className="flex items-center justify-between text-[8px] text-white/50 uppercase">
                            <span>BITCOIN ORBIT</span>
                            <Coins size={12} className="text-white" />
                          </div>
                          <div className="text-xl font-bold font-mono text-white">$67,420</div>
                          <span className="text-[9px] text-white/60 block font-mono">+2.85% // 24H DELTA</span>
                        </div>

                        <div className="bg-black/60 border border-white/10 p-3 space-y-2">
                          <div className="flex items-center justify-between text-[8px] text-white/50 uppercase">
                            <span>GOTHAM METEOROLOGY</span>
                            <Cloud size={12} className="text-white" />
                          </div>
                          <div className="text-xl font-bold font-mono text-white">14°C // RAIN</div>
                          <span className="text-[9px] text-white/60 block font-mono">HUMIDITY: 92% • BAROMETER 1012hPa</span>
                        </div>

                        <div className="bg-black/60 border border-white/10 p-3 space-y-2">
                          <div className="flex items-center justify-between text-[8px] text-white/50 uppercase">
                            <span>NEURAL LATENCY</span>
                            <Zap size={12} className="text-white" />
                          </div>
                          <div className="text-xl font-bold font-mono text-white">18 MS</div>
                          <span className="text-[9px] text-white/60 block font-mono">ZERO PACKET LOSS DETECTED</span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-black/60 border border-white/20 flex items-center justify-between">
                        <span className="text-[9px] text-white/60 font-mono">
                          Ask JARVIS: &ldquo;What is the weather in Hyderabad?&rdquo; or &ldquo;Show Tesla stock&rdquo; or &ldquo;Crypto prices&rdquo;
                        </span>
                        <button 
                          onClick={() => handleGlobalJarvisCommand("crypto prices")}
                          className="px-2.5 py-1 bg-white text-black text-[8px] font-bold uppercase font-mono"
                        >
                          PULL CRYPTO SPOT
                        </button>
                      </div>
                    </div>
                  )}

                </div>

                {/* 3. BOTTOM COMMAND DECK WITH INTEGRATED MODULE NAVIGATION DOCK */}
                <motion.footer 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="flex flex-col border-t border-white/20 pt-2.5 gap-2"
                >
                  {/* Tactical Module Navigation Dock (Placed on bottom to keep top clean for Everything Island) */}
                  <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-1 bg-white/[0.04] border border-white/20 p-1">
                      {[
                        { id: 'voice_core', label: '01_CORE', icon: Radio },
                        { id: 'media', label: '02_THE_PLACE', icon: Tv },
                        { id: 'timer', label: '03_CHRONO', icon: Clock },
                        { id: 'tasks', label: '04_DIRECTIVES', icon: ListTodo },
                        { id: 'ledger', label: '05_FREQUENCY', icon: Headphones },
                        { id: 'intel', label: '06_INTEL', icon: Globe },
                      ].map((tab) => {
                        const isActive = batmanStore.activeModule === tab.id || (tab.id === 'media' && batmanStore.activeModule === 'spot');
                        return (
                          <button
                            key={tab.id}
                            onClick={() => {
                              batmanStore.setActiveModule(tab.id as BatmanActiveModule);
                              setDismissedSpotId(null);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1 text-[9px] font-mono uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                              isActive 
                                ? 'bg-white text-black font-extrabold shadow-sm' 
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <tab.icon size={11} />
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="hidden sm:flex items-center gap-2 text-[10px] text-white/50 font-mono">
                      <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                      <span className="uppercase font-bold">BATMAN TACTICAL HUD ACTIVE</span>
                    </div>
                  </div>

                  {/* Voice Trigger Input Console */}
                  <div className="w-full flex items-center gap-2 bg-white/[0.04] border border-white/20 px-3 py-1.5">
                    <button
                      onClick={() => {
                        if (jarvisStore.voiceState === 'listening_for_command' || jarvisStore.voiceState === 'transcribing_command') {
                          jarvisVoiceEngine.commitCommand();
                        } else {
                          jarvisAudio.playActivate();
                          jarvisVoiceEngine.startCommandListening();
                        }
                      }}
                      className={`p-1.5 rounded-none transition-all cursor-pointer ${
                        jarvisStore.voiceState === 'listening_for_command' || jarvisStore.voiceState === 'transcribing_command'
                          ? 'bg-white text-black animate-pulse'
                          : 'bg-white/10 hover:bg-white text-white hover:text-black'
                      }`}
                      title="Push to Talk"
                    >
                      <Mic size={14} />
                    </button>

                    <input
                      type="text"
                      value={inputCommand}
                      onChange={(e) => setInputCommand(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && inputCommand.trim()) {
                          handleGlobalJarvisCommand(inputCommand.trim());
                          setInputCommand('');
                        }
                      }}
                      placeholder="Type or speak tactical directive to JARVIS..."
                      className="bg-transparent text-xs text-white placeholder:text-white/30 font-mono focus:outline-none flex-1"
                    />

                    <span className="text-[9px] text-white/40 hidden md:inline font-mono">
                      SAY &ldquo;JARVIS&rdquo; OR &ldquo;WEATHER IN HYDERABAD&rdquo; OR &ldquo;SEARCH FOR VIDEO&rdquo;
                    </span>
                  </div>
                </motion.footer>

              </div>
            </HudFrame>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
