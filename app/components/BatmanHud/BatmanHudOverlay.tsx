"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Volume2, VolumeX, Shield, Radio, 
  Activity, Play, Pause, CheckSquare, Sparkles, 
  Terminal, Compass, Clock, Cpu, Battery, Eye, 
  ChevronRight, X, Layers, Crosshair, RefreshCw,
  FileText, ListTodo, Search, Zap, Music, Globe,
  Users, MapPin, Film, SkipForward, SkipBack, Coins,
  Flame, Award, CheckCircle2, Trash2, Plus, Volume1,
  TrendingUp, ExternalLink, Check, Sun, Cloud, Droplets,
  Wind, DollarSign, ArrowUpRight, ArrowDownRight, Youtube
} from 'lucide-react';
import { ThinkingOrb, OrbState } from 'thinking-orbs';
import { HudFrame, TargetingUI } from '@/components/ui/animated-hud-targeting-ui';
import { useBatmanStore, SPOT_ROOMS, BatmanActiveModule, SpotRoom } from '@/hooks/useBatmanStore';
import { useFrequencyStore } from '@/hooks/useFrequencyStore';
import { useJarvisStore } from '@/hooks/useJarvisStore';
import { useAppStore } from '@/hooks/useAppStore';
import { jarvisVoiceEngine } from '@/lib/jarvisVoiceEngine';
import { executeLocalCommand, handleGlobalJarvisCommand } from '@/lib/jarvisCommandDispatcher';
import { resolveOrbState } from '../JarvisOrbVisualizer';
import { fetchWeather } from '@/lib/intelligence/weatherAdapter';
import { fetchNews } from '@/lib/intelligence/worldPulseAdapter';
import { fetchEarthquakes } from '@/lib/intelligence/earthquakeAdapter';
import { fetchIssTelemetry } from '@/lib/intelligence/issAdapter';
import { fetchCryptoMarkets } from '@/lib/intelligence/cryptoAdapter';
import { convertCurrency } from '@/lib/intelligence/fxAdapter';
import type { YouTubeSearchResult } from '@/lib/youtubeSearch';
import type { 
  WeatherData, NewsData, EarthquakeData, 
  IssData, NasaApodData, CryptoData, 
  FxData, WatchlistData, PortfolioData 
} from '@/lib/intelligence/types';
import type { StockSpotData } from '@/hooks/useJarvisStore';

// =========================================================================
// BATMAN MONOCHROME TACTICAL SPOT UI COMPONENTS
// =========================================================================

function BatmanSpotVideoWidget({ 
  videos, 
  onWatch 
}: { 
  videos: YouTubeSearchResult[]; 
  onWatch: (video: YouTubeSearchResult) => void; 
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-white/20 pb-2.5">
        <div className="flex items-center gap-2">
          <Youtube size={14} className="text-white" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            TACTICAL VIDEO STREAM RESULTS ({videos.length} NODES)
          </span>
        </div>
        <span className="text-[10px] text-white/50 font-mono">SAY &ldquo;PLAY 1&rdquo; OR CLICK TO STREAM</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[36vh] overflow-y-auto pr-1">
        {videos.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => onWatch(item)}
            className="group p-2.5 border border-white/15 bg-black/60 hover:bg-white/10 hover:border-white transition-all cursor-pointer flex flex-col justify-between space-y-2"
          >
            <div className="relative aspect-video overflow-hidden bg-zinc-900 border border-white/10">
              <img 
                src={item.thumbnail} 
                alt={item.title} 
                className="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 transition-all duration-300"
              />
              <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black text-white text-[9px] font-mono font-bold border border-white/30">
                #{idx + 1}
              </div>
            </div>
            <div>
              <span className="text-[8px] font-mono text-white/50 uppercase block truncate">{item.channelTitle}</span>
              <h5 className="text-[11px] font-mono font-bold text-white line-clamp-2 leading-tight mt-0.5">{item.title}</h5>
            </div>
            <button
              type="button"
              className="w-full py-1 bg-white/10 group-hover:bg-white text-white group-hover:text-black text-[9px] font-bold uppercase font-mono tracking-wider transition-colors"
            >
              STREAM AUDIO / VIDEO
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BatmanSpotStockWidget({ symbol }: StockSpotData) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: symbol,
      interval: "D",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: false,
      calendar: false,
      backgroundColor: "rgba(0, 0, 0, 1)",
      gridColor: "rgba(255, 255, 255, 0.08)",
      hide_top_toolbar: true,
      hide_legend: false,
      save_image: false,
      width: "100%",
      height: "100%",
      colorTheme: "dark",
      isTransparent: true,
    });
    containerRef.current.appendChild(script);
  }, [symbol]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-white/20 pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-white" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            TACTICAL MARKET RADAR // {symbol}
          </span>
        </div>
        <span className="text-[9px] font-mono text-white/50">TRADINGVIEW TELEMETRY</span>
      </div>
      <div ref={containerRef} className="w-full h-[280px] border border-white/20 bg-black" />
    </div>
  );
}

function BatmanSpotWeatherWidget({ data }: { data: WeatherData }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-white/20 pb-2">
        <div className="flex items-center gap-2">
          <Compass size={14} className="text-white" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            ATMOSPHERIC SENSOR // {data.city.toUpperCase()}
          </span>
        </div>
        <span className="text-[9px] font-mono text-white/50">{data.source}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 border border-white/20 bg-black/60 flex flex-col justify-between">
          <span className="text-[9px] font-mono uppercase text-white/50">{data.conditionText}</span>
          <span className="text-4xl font-mono font-bold text-white my-2">{data.temperature}°C</span>
          <span className="text-[9px] font-mono text-white/40">Feels like {data.apparentTemperature}°C</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 border border-white/15 bg-black/40">
            <span className="text-[8px] font-mono text-white/40 uppercase block">Humidity</span>
            <span className="text-lg font-mono font-bold text-white">{data.humidity}%</span>
          </div>
          <div className="p-2.5 border border-white/15 bg-black/40">
            <span className="text-[8px] font-mono text-white/40 uppercase block">Wind</span>
            <span className="text-lg font-mono font-bold text-white">{data.windSpeed} km/h</span>
          </div>
          <div className="p-2.5 border border-white/15 bg-black/40">
            <span className="text-[8px] font-mono text-white/40 uppercase block">UV Index</span>
            <span className="text-lg font-mono font-bold text-white">{data.uvIndex ?? '0'}</span>
          </div>
          <div className="p-2.5 border border-white/15 bg-black/40">
            <span className="text-[8px] font-mono text-white/40 uppercase block">Precip</span>
            <span className="text-lg font-mono font-bold text-white">{data.precipitation} mm</span>
          </div>
        </div>

        <div className="p-3 border border-white/20 bg-black/60 space-y-1.5 text-xs font-mono">
          <span className="text-[9px] text-white/40 uppercase block">Forecast Radar</span>
          {data.daily?.slice(0, 3).map((d, i) => (
            <div key={i} className="flex justify-between border-b border-white/10 pb-1 last:border-none">
              <span className="text-white/70">{d.date}</span>
              <span className="text-white font-bold">{d.minTemp}° / {d.maxTemp}°C</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BatmanSpotNewsWidget({ data }: { data: NewsData }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-white/20 pb-2">
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-white" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            WORLD PULSE // INTELLIGENCE WIRE ({data.category?.toUpperCase() || 'GLOBAL'})
          </span>
        </div>
        <span className="text-[9px] font-mono text-white/50">{data.source}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[30vh] overflow-y-auto pr-1">
        {data.articles?.map((art, idx) => (
          <a
            key={idx}
            href={art.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 border border-white/15 bg-black/60 hover:bg-white/10 hover:border-white transition-colors block space-y-1"
          >
            <div className="flex justify-between text-[8px] font-mono text-white/40 uppercase">
              <span>{art.source}</span>
              <span>{art.publishedAt ? new Date(art.publishedAt).toLocaleTimeString() : ''}</span>
            </div>
            <h6 className="text-[11px] font-mono font-bold text-white line-clamp-2 leading-snug">{art.title}</h6>
          </a>
        ))}
      </div>
    </div>
  );
}

function BatmanSpotCryptoWidget({ data }: { data: CryptoData }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-white/20 pb-2">
        <div className="flex items-center gap-2">
          <Coins size={14} className="text-white" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            CRYPTO ASSET TELEMETRY // COINGECKO
          </span>
        </div>
        <span className="text-[9px] font-mono text-white/50">TOP TIER MARKETS</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-h-[32vh] overflow-y-auto pr-1">
        {data.coins?.map((c) => {
          const isUp = c.price_change_percentage_24h >= 0;
          return (
            <div key={c.id} className="p-3 border border-white/15 bg-black/60 space-y-1.5 font-mono">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white uppercase">{c.symbol}</span>
                <span className={`text-[10px] font-bold ${isUp ? 'text-white' : 'text-white/60'}`}>
                  {isUp ? '+' : ''}{c.price_change_percentage_24h}%
                </span>
              </div>
              <div className="text-lg font-bold text-white">
                ${c.current_price.toLocaleString()}
              </div>
              <span className="text-[9px] text-white/40 block">Vol: ${(c.total_volume / 1e9).toFixed(1)}B</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BatmanSpotFxWidget({ data }: { data: FxData }) {
  const [amount, setAmount] = useState(data.amount || 100);
  const [base, setBase] = useState(data.base || 'USD');
  const [target, setTarget] = useState(data.target || 'INR');
  const [fxResult, setFxResult] = useState(data);

  const handleConvert = async () => {
    try {
      const res = await convertCurrency(amount, base, target);
      setFxResult(res);
    } catch (e) {}
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-white/20 pb-2">
        <div className="flex items-center gap-2">
          <DollarSign size={14} className="text-white" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            FX CURRENCY INTELLIGENCE MATRIX
          </span>
        </div>
        <span className="text-[9px] font-mono text-white/50">{fxResult.source}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
        <div className="p-4 border border-white/20 bg-black/60 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[8px] text-white/40 block uppercase">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-white/5 border border-white/20 px-2 py-1 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[8px] text-white/40 block uppercase">From</label>
              <select
                value={base}
                onChange={(e) => setBase(e.target.value)}
                className="w-full bg-black border border-white/20 px-2 py-1 text-xs text-white"
              >
                {['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[8px] text-white/40 block uppercase">To</label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full bg-black border border-white/20 px-2 py-1 text-xs text-white"
              >
                {['INR', 'USD', 'EUR', 'GBP', 'JPY', 'CAD'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleConvert}
            className="w-full py-1.5 bg-white text-black text-xs font-bold uppercase hover:bg-white/90"
          >
            CALCULATE
          </button>
        </div>

        {fxResult.convertedAmount !== undefined && (
          <div className="p-4 border border-white/20 bg-black/60 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-white/50 uppercase">Converted Value</span>
            <h3 className="text-3xl font-bold text-white my-1">
              {fxResult.convertedAmount.toLocaleString()} {target}
            </h3>
            <span className="text-[10px] text-white/60">1 {base} = {fxResult.rate} {target}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// MAIN BATMAN HUD COMPONENT WITH SMOOTH STAGGERED INTRO & DISENGAGE ANIMATION
// =========================================================================

export default function BatmanHudOverlay() {
  const batmanStore = useBatmanStore();
  const frequencyStore = useFrequencyStore();
  const jarvisStore = useJarvisStore();
  const appStore = useAppStore();

  // Local HUD state
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [fps, setFps] = useState(60);
  const [introStep, setIntroStep] = useState<number>(0);
  const [bootLogs, setBootLogs] = useState<string[]>([]);
  const [visualizerData, setVisualizerData] = useState<number[]>(new Array(24).fill(0.12));
  const [voiceVolume, setVoiceVolume] = useState<number>(0);
  const [isDisengaging, setIsDisengaging] = useState(false);
  
  // Interactive Task state
  const [tasks, setTasks] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('focus-tasks') || '[]');
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [newTaskInput, setNewTaskInput] = useState('');

  // Interactive Notes state
  const [notes, setNotes] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('batman-hud-notes') || '[]');
      } catch (e) {
        return ['Initiated deep work directive in Batman HUD mode.'];
      }
    }
    return ['Initiated deep work directive in Batman HUD mode.'];
  });
  const [newNoteInput, setNewNoteInput] = useState('');

  // Intel Data Caches
  const [weatherData, setWeatherData] = useState<any>(null);
  const [newsData, setNewsData] = useState<any[]>([]);
  const [earthquakeData, setEarthquakeData] = useState<any[]>([]);
  const [issData, setIssData] = useState<any>(null);
  const [cryptoData, setCryptoData] = useState<any[]>([]);
  const [mediaSearchQuery, setMediaSearchQuery] = useState('');
  const [isFocusAudioPlaying, setIsFocusAudioPlaying] = useState(false);

  const animRef = useRef<number | null>(null);
  const fpsRef = useRef({ frames: 0, lastTime: performance.now() });

  // 1. CINEMATIC INTRO TIMELINE SEQUENCE
  // Step 1: BLUR OUT -> Smooth background blur into black (800ms)
  // Step 2: WAIT -> Pitch-black 2.0s OLED Delay
  // Step 3: START INTRO -> Staggered keyframe reveal of tactical vector HUD
  useEffect(() => {
    if (!batmanStore.isBatmanMode) {
      setIntroStep(0);
      setBootLogs([]);
      setIsDisengaging(false);
      return;
    }

    setIsDisengaging(false);
    setIntroStep(1); // Blurring out (Phase 1)

    // Phase 2: Blank 2-second OLED screen
    const blankTimer = setTimeout(() => {
      setIntroStep(2);
      
      // Play tactical audio boot sound
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(55, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(432, audioCtx.currentTime + 1.2);
        gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.3);
      } catch (e) {}

      // Phase 3: Staggered Vector Boot Logs & Reticle Drawing
      const logs = [
        'INITIALIZING B.A.T.M.A.N. TACTICAL CORE...',
        'ESTABLISHING SECURE ZERO-LATENCY NEURAL LINK...',
        'CALIBRATING 24-BAND ACOUSTIC DSP MATRIX...',
        'SYNCHRONIZING VIRTUAL SPOT NETWORK (THE PLACE)...',
        'ALL SYSTEMS LOCKED. PROTOCOL ENGAGED.'
      ];

      logs.forEach((log, index) => {
        setTimeout(() => {
          setBootLogs(prev => [...prev, log]);
        }, index * 260);
      });

      // Phase 4: Full Active Mode
      const activeTimer = setTimeout(() => {
        setIntroStep(3);
        batmanStore.setIntroPhase('active');
      }, 1600);

      return () => clearTimeout(activeTimer);
    }, 2000);

    return () => clearTimeout(blankTimer);
  }, [batmanStore.isBatmanMode]);

  // Handle Disengage with smooth cinematic animation
  const handleDisengage = () => {
    setIsDisengaging(true);
    setTimeout(() => {
      batmanStore.toggleBatmanMode(false);
      setIsDisengaging(false);
    }, 600);
  };

  // Keyboard shortcut: Escape to disengage
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && batmanStore.isBatmanMode) {
        e.preventDefault();
        handleDisengage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [batmanStore.isBatmanMode]);

  // Focus Music Background Event Listener
  useEffect(() => {
    const handleFocusMusicEvent = () => {
      setIsFocusAudioPlaying(true);
    };
    window.addEventListener('batman-focus-music', handleFocusMusicEvent);
    return () => window.removeEventListener('batman-focus-music', handleFocusMusicEvent);
  }, []);

  // Chronometer & Visualizer Tick Loop
  useEffect(() => {
    if (!batmanStore.isBatmanMode) return;

    const tick = () => {
      const now = performance.now();
      fpsRef.current.frames++;
      if (now - fpsRef.current.lastTime >= 1000) {
        setFps(Math.round((fpsRef.current.frames * 1000) / (now - fpsRef.current.lastTime)));
        fpsRef.current.frames = 0;
        fpsRef.current.lastTime = now;
      }

      // Voice / Music Waveform Telemetry
      if (frequencyStore.isPlaying || batmanStore.isSpeaking || (jarvisStore.voiceState as string) === 'speaking_response' || (jarvisStore.voiceState as string) === 'SPEAKING_RESPONSE') {
        const simulated = Array.from({ length: 24 }, (_, i) => {
          const t = now * 0.006 + i * 0.35;
          return Math.max(0.12, (Math.sin(t) * 0.5 + 0.5) * 0.88 + Math.random() * 0.12);
        });
        setVisualizerData(simulated);
        setVoiceVolume(Math.min(1, 0.4 + Math.random() * 0.6));
      } else {
        setVisualizerData(Array.from({ length: 24 }, () => 0.08 + Math.random() * 0.05));
        setVoiceVolume(0.05);
      }

      // Update T+ lock-in timer
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
  }, [batmanStore.isBatmanMode, batmanStore.lockInStartTime, frequencyStore.isPlaying, batmanStore.isSpeaking, jarvisStore.voiceState]);

  // Current active Spot data from Jarvis messages
  const latestMessage = jarvisStore.messages.length > 0 ? jarvisStore.messages[jarvisStore.messages.length - 1] : null;
  const spotType = useMemo(() => {
    if (!latestMessage) return null;
    if (latestMessage.mediaResults && latestMessage.mediaResults.length > 0) return 'video';
    if (latestMessage.stockData) return 'stock';
    if (latestMessage.taskData) return 'task';
    if (latestMessage.weatherData) return 'weather';
    if (latestMessage.newsData) return 'news';
    if (latestMessage.cryptoData) return 'crypto';
    if (latestMessage.fxData) return 'fx';
    if (latestMessage.earthquakeData) return 'earthquake';
    if (latestMessage.issData) return 'iss';
    if (latestMessage.nasaData) return 'nasa';
    if (latestMessage.watchlistData) return 'watchlist';
    if (latestMessage.portfolioData) return 'portfolio';
    return null;
  }, [latestMessage]);

  const orbState = useMemo(() => {
    return resolveOrbState(
      jarvisStore.voiceState,
      jarvisStore.aiState,
      jarvisStore.telemetry?.activeTool,
      jarvisStore.telemetry?.geminiStatus
    );
  }, [jarvisStore.voiceState, jarvisStore.aiState, jarvisStore.telemetry]);

  if (!batmanStore.isBatmanMode) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, filter: 'blur(30px)' }}
        animate={{ 
          opacity: isDisengaging ? 0 : 1, 
          filter: isDisengaging ? 'blur(30px)' : 'blur(0px)' 
        }}
        exit={{ opacity: 0, filter: 'blur(30px)' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-[999] bg-black text-white font-mono overflow-hidden select-none"
      >
        {/* Hidden Background YouTube Focus Music Runner */}
        <iframe
          src={`https://www.youtube.com/embed/YKLKoHORjYI?autoplay=1&controls=0&loop=1&playlist=YKLKoHORjYI&enablejsapi=1`}
          allow="autoplay; encrypted-media"
          className="hidden pointer-events-none w-0 h-0 opacity-0 absolute"
          title="Background Focus Soundtrack"
        />

        {/* ========================================================================= */}
        {/* STAGE 1 & 2: OLED CINEMATIC BLANK / BOOT SEQUENCE                         */}
        {/* ========================================================================= */}
        {introStep < 3 && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center p-6 z-50">
            {introStep === 2 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full space-y-4 text-center"
              >
                <div className="w-16 h-16 mx-auto rounded-full border-2 border-white/40 flex items-center justify-center animate-pulse">
                  <Shield size={28} className="text-white" />
                </div>
                <div className="space-y-1.5 text-left bg-white/[0.02] border border-white/15 p-4 rounded-sm">
                  {bootLogs.map((log, idx) => (
                    <motion.p 
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-[10px] text-white/90 font-mono tracking-wider"
                    >
                      {log}
                    </motion.p>
                  ))}
                  <p className="text-[10px] text-white animate-pulse">_</p>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 3: FULL ACTIVE TACTICAL BATMAN HUD FRAME                            */}
        {/* ========================================================================= */}
        <HudFrame className="w-full h-full p-2 sm:p-4 md:p-6 flex flex-col justify-between">
          <div className="w-full h-full flex flex-col justify-between relative z-20">
            
            {/* 1. TOP TACTICAL SYSTEM BAR */}
            <motion.header 
              initial={{ y: -25, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex items-center justify-between border-b border-white/20 pb-2.5"
            >
              {/* Left System Telemetry */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-white text-black px-2 py-0.5 text-[10px] font-extrabold tracking-widest uppercase">
                  <Shield size={12} />
                  <span>B.A.T.M.A.N. // HUD</span>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-[10px] text-white/60">
                  <span>SYS_ONLINE</span>
                  <span className="text-white/20">•</span>
                  <span className="text-white">FPS: {fps}</span>
                </div>
              </div>

              {/* Center Lock-In Chronometer */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/20 px-3 py-1 rounded-sm">
                <Clock size={12} className="text-white/60" />
                <span className="text-[11px] sm:text-xs font-bold tracking-widest text-white">
                  T+{elapsedTime}
                </span>
              </div>

              {/* Right Disengage & Mic Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const state = jarvisVoiceEngine.getState();
                    if (state === 'standby' || state === 'disabled') {
                      jarvisVoiceEngine.startManualPushToTalk();
                    } else {
                      jarvisVoiceEngine.cancelCurrentAction();
                    }
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 border text-[10px] font-bold tracking-wider cursor-pointer transition-all ${
                    jarvisVoiceEngine.getState() === 'listening_for_command' || jarvisVoiceEngine.getState() === 'transcribing_command'
                      ? 'bg-white text-black border-white animate-pulse'
                      : 'bg-white/5 border-white/20 text-white/80 hover:border-white/40'
                  }`}
                >
                  <Mic size={11} />
                  <span className="hidden sm:inline">MIC ON</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisengage}
                  className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-white/90 text-black text-[10px] sm:text-[11px] font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                >
                  <span>DISENGAGE</span>
                  <span className="text-[9px] opacity-60">[ESC]</span>
                </button>
              </div>
            </motion.header>

            {/* 2. MAIN CENTER HUD WORKSPACE (Dynamic Spot UI OR Active Module Router) */}
            <div className="flex-1 relative flex items-center justify-center my-2 sm:my-3 overflow-hidden">
              
              {/* Background Animated Vector Target Reticle */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
                <TargetingUI className="w-[300px] h-[300px] sm:w-[460px] sm:h-[460px] text-white" />
              </div>

              {/* CENTRAL CONTAINER */}
              <div className="relative z-10 w-full max-w-5xl h-full flex flex-col justify-center px-1 sm:px-4">
                
                {/* ------------------------------------------------------------- */}
                {/* CASE 1: DYNAMIC SPOT UI WIDGET (Rendered directly in HUD)     */}
                {/* ------------------------------------------------------------- */}
                {spotType && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -15 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-4xl mx-auto p-5 rounded-sm bg-black/90 border border-white/30 backdrop-blur-3xl shadow-[0_0_50px_rgba(255,255,255,0.15)] relative"
                  >
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/20">
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-white" />
                        <span className="text-xs font-bold uppercase tracking-wider text-white">
                          INTELLIGENCE SPOT CARD // {spotType.toUpperCase()}
                        </span>
                      </div>
                      <button
                        onClick={() => jarvisStore.addMessage({ role: 'assistant', text: 'Spot cleared, standing by.' })}
                        className="p-1 hover:bg-white/20 border border-white/20 text-white/60 hover:text-white transition-colors cursor-pointer"
                        title="Dismiss Spot Card"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    {spotType === 'video' && latestMessage?.mediaResults && (
                      <BatmanSpotVideoWidget 
                        videos={latestMessage.mediaResults} 
                        onWatch={(v) => executeLocalCommand(`play ${v.title}`)} 
                      />
                    )}
                    {spotType === 'stock' && latestMessage?.stockData && (
                      <BatmanSpotStockWidget {...latestMessage.stockData} />
                    )}
                    {spotType === 'weather' && latestMessage?.weatherData && (
                      <BatmanSpotWeatherWidget data={latestMessage.weatherData} />
                    )}
                    {spotType === 'news' && latestMessage?.newsData && (
                      <BatmanSpotNewsWidget data={latestMessage.newsData} />
                    )}
                    {spotType === 'crypto' && latestMessage?.cryptoData && (
                      <BatmanSpotCryptoWidget data={latestMessage.cryptoData} />
                    )}
                    {spotType === 'fx' && latestMessage?.fxData && (
                      <BatmanSpotFxWidget data={latestMessage.fxData} />
                    )}
                  </motion.div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* CASE 2: DEFAULT MODULE ROUTER (When no Spot UI is active)     */}
                {/* ------------------------------------------------------------- */}
                {!spotType && (
                  <>
                    {/* MODULE A: VOICE CORE & LIVING THINKING ORB (Default) */}
                    {batmanStore.activeModule === 'voice_core' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col items-center justify-center text-center space-y-4"
                      >
                        {/* Living Thinking Orb Core */}
                        <div className="relative flex items-center justify-center">
                          <motion.div
                            animate={{
                              scale: [1, 1.08, 1],
                              opacity: [0.15, 0.35, 0.15]
                            }}
                            transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
                            className="w-40 h-40 sm:w-56 sm:h-56 rounded-full border border-dashed border-white/20 absolute pointer-events-none"
                          />

                          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-black border-2 border-white flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.25)] relative overflow-hidden">
                            <ThinkingOrb 
                              state={orbState}
                              size={64}
                              theme="dark"
                              className="scale-[1.8]"
                            />
                          </div>
                        </div>

                        {/* Focus Directive Target */}
                        <div className="max-w-lg px-4 py-1.5 bg-white/[0.04] border border-white/20 backdrop-blur-md">
                          <p className="text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase text-white">
                            {batmanStore.targetFocus}
                          </p>
                        </div>

                        {/* Live Tactical Stream & 24-Band Visualizer */}
                        <div className="w-full max-w-lg bg-black/85 border border-white/20 p-3 backdrop-blur-xl">
                          <div className="flex items-center justify-between text-[9px] text-white/40 border-b border-white/10 pb-1.5 mb-2">
                            <span className="flex items-center gap-1.5 text-white">
                              <Terminal size={10} />
                              <span>TACTICAL STREAM</span>
                            </span>
                            <span className="uppercase text-cyan-300 font-bold">{jarvisStore.voiceState}</span>
                          </div>
                          <p className="text-[11px] sm:text-xs text-white leading-relaxed font-mono min-h-[38px] line-clamp-2">
                            {jarvisStore.telemetry?.interimTranscript || jarvisStore.telemetry?.transcript || batmanStore.voiceTranscript || 'Say "Jarvis, start focus music", "Show tasks", "Crypto prices", or speak any request.'}
                          </p>
                          
                          {/* 24-Band Oscilloscope */}
                          <div className="flex items-end justify-center gap-1 mt-2.5 h-6">
                            {visualizerData.map((val, idx) => (
                              <motion.div
                                key={idx}
                                style={{ height: `${Math.max(12, val * 100)}%` }}
                                className="w-1 bg-white transition-all duration-75"
                              />
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* MODULE B: THE PLACE / VIRTUAL SPOT NETWORK */}
                    {batmanStore.activeModule === 'spot' && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        className="w-full max-w-4xl mx-auto bg-black/85 border border-white/20 p-4 sm:p-6 backdrop-blur-2xl"
                      >
                        <div className="flex items-center justify-between border-b border-white/20 pb-3 mb-4">
                          <div className="flex items-center gap-2">
                            <Globe size={15} className="text-white" />
                            <span className="text-xs sm:text-sm font-bold tracking-widest uppercase text-white">
                              THE PLACE // VIRTUAL STUDY NETWORK
                            </span>
                          </div>
                          <span className="text-[10px] text-white/50">
                            {SPOT_ROOMS.reduce((acc, s) => acc + s.activeUsers, 0)} USERS SYNCHRONIZED
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[320px] overflow-y-auto pr-1">
                          {SPOT_ROOMS.map((spot) => {
                            const isSelected = batmanStore.activeSpotId === spot.id;
                            return (
                              <div
                                key={spot.id}
                                onClick={() => {
                                  batmanStore.setActiveSpotId(spot.id);
                                  executeLocalCommand(`play ${spot.name}`);
                                }}
                                className={`p-3.5 border transition-all cursor-pointer flex flex-col justify-between ${
                                  isSelected
                                    ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                                    : 'bg-white/[0.03] border-white/15 text-white hover:border-white/40 hover:bg-white/[0.06]'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className={`text-[8px] font-bold tracking-widest px-1.5 py-0.5 uppercase ${
                                      isSelected ? 'bg-black text-white' : 'bg-white/10 text-white/60'
                                    }`}>
                                      {spot.location}
                                    </span>
                                    <span className="text-[9px] flex items-center gap-1 opacity-70">
                                      <Users size={10} />
                                      {spot.activeUsers}
                                    </span>
                                  </div>
                                  <h4 className="text-[12px] font-bold tracking-tight mt-1">
                                    {spot.name}
                                  </h4>
                                  <p className={`text-[10px] mt-1 line-clamp-1 ${isSelected ? 'text-black/70' : 'text-white/50'}`}>
                                    {spot.ambiance}
                                  </p>
                                </div>
                                <div className="pt-2.5 mt-2 border-t border-current/10 flex items-center justify-between text-[9px]">
                                  <span>{spot.frequency}</span>
                                  <span className="font-bold">{isSelected ? 'CONNECTED' : 'ENTER SPOT'}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    {/* MODULE C: MEDIA / YOUTUBE FOCUS MUSIC CONTROLS */}
                    {batmanStore.activeModule === 'media' && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        className="w-full max-w-3xl mx-auto bg-black/85 border border-white/20 p-4 sm:p-5 backdrop-blur-2xl"
                      >
                        <div className="flex items-center justify-between border-b border-white/20 pb-3 mb-3">
                          <div className="flex items-center gap-2">
                            <Radio size={14} className="text-white" />
                            <span className="text-xs font-bold tracking-widest uppercase text-white">
                              ACOUSTIC FREQUENCY & FOCUS SOUNDTRACK
                            </span>
                          </div>
                          <span className="text-[10px] text-white/50">
                            {frequencyStore.isPlaying ? 'AUDIO ACTIVE' : 'STANDBY'}
                          </span>
                        </div>

                        {/* Quick Start Focus Music Button */}
                        <div className="p-3.5 border border-white/20 bg-white/[0.04] mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Music size={18} className="text-white animate-pulse" />
                            <div>
                              <h5 className="text-xs font-bold text-white uppercase">THE BATMAN - FOCUS SUITE</h5>
                              <p className="text-[10px] text-white/50">Michael Giacchino Atmospheric Suite</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => executeLocalCommand('start focus music')}
                            className="px-3 py-1.5 bg-white text-black text-[10px] font-bold uppercase hover:bg-white/90 cursor-pointer"
                          >
                            PLAY FOCUS SOUNDTRACK
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </>
                )}

              </div>
            </div>

            {/* 3. BOTTOM TACTICAL DOCK & MODULE SWITCHER */}
            <motion.footer
              initial={{ y: 25, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="border-t border-white/20 pt-2.5 pb-0.5 flex flex-col sm:flex-row items-center justify-between gap-2.5"
            >
              {/* Module Switcher Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto py-0.5">
                {[
                  { id: 'voice_core', label: 'NEURAL CORE' },
                  { id: 'spot', label: 'THE PLACE' },
                  { id: 'media', label: 'MEDIA' },
                  { id: 'timer', label: 'TIMER' },
                  { id: 'tasks', label: 'TASKS' },
                  { id: 'intel', label: 'INTEL' },
                ].map((mod) => {
                  const isActive = batmanStore.activeModule === mod.id;
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => batmanStore.setActiveModule(mod.id as BatmanActiveModule)}
                      className={`px-2.5 py-1 text-[9px] font-bold tracking-wider uppercase border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-white text-black border-white shadow-sm'
                          : 'bg-white/[0.02] border-white/15 text-white/50 hover:text-white hover:border-white/30'
                      }`}
                    >
                      {mod.label}
                    </button>
                  );
                })}
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-3 text-[9px] text-white/50 shrink-0">
                <span className="text-white/80">DIRECTIVE // FULL SPECTRUM</span>
                <span className="text-white/20">•</span>
                <span>ESC TO EXIT</span>
              </div>
            </motion.footer>

          </div>
        </HudFrame>
      </motion.div>
    </AnimatePresence>
  );
}
