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
  Wind, DollarSign, ArrowUpRight, ArrowDownRight, Youtube,
  Maximize2, Power
} from 'lucide-react';
import { ThinkingOrb, OrbState } from 'thinking-orbs';
import { TargetingUI, HudFrame } from '@/components/ui/animated-hud-targeting-ui';
import { useBatmanStore, SPOT_ROOMS, BatmanActiveModule, SpotRoom } from '@/hooks/useBatmanStore';
import { useFrequencyStore } from '@/hooks/useFrequencyStore';
import { useJarvisStore } from '@/hooks/useJarvisStore';
import { useAppStore } from '@/hooks/useAppStore';
import { jarvisVoiceEngine } from '@/lib/jarvisVoiceEngine';
import { executeLocalCommand, handleGlobalJarvisCommand } from '@/lib/jarvisCommandDispatcher';
import { resolveOrbState } from '../JarvisOrbVisualizer';
import { jarvisAudio } from '@/lib/jarvisAudio';
import type { YouTubeSearchResult } from '@/lib/youtubeSearch';
import type { 
  WeatherData, NewsData, EarthquakeData, 
  IssData, NasaApodData, CryptoData, 
  FxData, WatchlistData, PortfolioData 
} from '@/lib/intelligence/types';
import type { StockSpotData } from '@/hooks/useJarvisStore';

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

// =========================================================================
// MAIN BATMAN TACTICAL HUD OVERLAY COMPONENT
// =========================================================================

export default function BatmanHudOverlay() {
  const batmanStore = useBatmanStore();
  const frequencyStore = useFrequencyStore();
  const jarvisStore = useJarvisStore();
  const appStore = useAppStore();

  const [missionTasks, setMissionTasks] = useState<{ id: string; text: string; completed: boolean }[]>([
    { id: '1', text: 'Execute high-frequency cognitive session', completed: true },
    { id: '2', text: 'Audit neural telemetry & system logs', completed: false },
    { id: '3', text: 'Deploy production build to Vercel', completed: true },
    { id: '4', text: 'Calibrate binaural focus audio stream', completed: false },
  ]);

  const toggleTask = (id: string) => {
    setMissionTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const [inputCommand, setInputCommand] = useState('');
  const [fps, setFps] = useState(60);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [activeSpotDismissed, setActiveSpotDismissed] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  const animRef = useRef<number | null>(null);

  // -------------------------------------------------------------------------
  // 1. CINEMATIC INTRO & DISENGAGE TRANSITION CONTROLLER
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (batmanStore.isBatmanMode) {
      setActiveSpotDismissed(false);
      
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

  // Spot UI payload
  const latestMessage = jarvisStore.messages.length > 0 ? jarvisStore.messages[jarvisStore.messages.length - 1] : null;
  const spotType = useMemo(() => {
    if (activeSpotDismissed || !latestMessage) return null;
    if (latestMessage.mediaResults && latestMessage.mediaResults.length > 0) return 'video';
    if (latestMessage.stockData) return 'stock';
    if (latestMessage.weatherData) return 'weather';
    if (latestMessage.cryptoData) return 'crypto';
    return null;
  }, [latestMessage, activeSpotDismissed]);

  const orbState = useMemo(() => {
    return resolveOrbState(
      jarvisStore.voiceState,
      jarvisStore.aiState,
      jarvisStore.telemetry?.activeTool,
      jarvisStore.telemetry?.geminiStatus
    );
  }, [jarvisStore.voiceState, jarvisStore.aiState, jarvisStore.telemetry]);

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
        {/* Hidden Background YouTube Focus Music Runner */}
        <iframe
          src={`https://www.youtube.com/embed/YKLKoHORjYI?autoplay=1&controls=0&loop=1&playlist=YKLKoHORjYI&enablejsapi=1`}
          allow="autoplay; encrypted-media"
          className="hidden pointer-events-none w-0 h-0 opacity-0 absolute"
          title="Background Focus Soundtrack"
        />

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
        {/* PHASE 4: GLORIOUS TACTICAL HUD INTERFACE WITH HUDFRAME                    */}
        {/* ========================================================================= */}
        {batmanStore.introPhase === 'active' && (
          <HudFrame className="w-full h-full p-4 md:p-6 flex flex-col justify-between relative z-20">
            <div className="w-full h-full flex flex-col justify-between">
            {/* 1. TOP TACTICAL SYSTEM BAR */}
            <motion.header 
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex items-center justify-between border-b border-white/20 pb-3"
            >
              {/* Left Telemetry */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-white text-black px-2.5 py-1 text-[10px] font-extrabold tracking-widest uppercase">
                  <Shield size={12} />
                  <span>B.A.T.M.A.N. // HUD</span>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-[10px] text-white/60">
                  <span className="text-white font-bold">SYS_ACTIVE</span>
                  <span className="text-white/20">•</span>
                  <span>FPS: {fps}</span>
                  <span className="text-white/20">•</span>
                  <span>LAT: 28.6139° N, LON: 77.2090° E</span>
                </div>
              </div>

              {/* Center Lock-In Chronometer */}
              <div className="flex items-center gap-2 bg-white/[0.04] border border-white/20 px-3 py-1">
                <Clock size={12} className="text-white animate-pulse" />
                <span className="text-[10px] font-bold tracking-widest text-white">T+ {elapsedTime}</span>
              </div>

              {/* Right System Controls & Disengage */}
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-1 text-[10px] text-white/50 border border-white/15 px-2.5 py-1">
                  <span>{currentTimeStr || 'UTC ACTIVE'}</span>
                </div>

                {/* Disengage Button */}
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

            {/* 2. CENTRAL THREE-COLUMN TACTICAL VIEWPORT */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 my-4 min-h-0">
              
              {/* LEFT WING: MISSION MATRIX & COGNITIVE ECONOMY (Col 3) */}
              <motion.aside 
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="hidden lg:flex lg:col-span-3 flex-col justify-between border border-white/20 bg-white/[0.02] p-4 space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-white/20 pb-2">
                    <div className="flex items-center gap-2">
                      <ListTodo size={14} className="text-white" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white">
                        MISSION OBJECTIVES
                      </span>
                    </div>
                    <span className="text-[9px] text-white/50">{missionTasks.filter(t => t.completed).length}/{missionTasks.length}</span>
                  </div>

                  {/* Task List */}
                  <div className="space-y-1.5 max-h-[35vh] overflow-y-auto pr-1 no-scrollbar">
                    {missionTasks.length === 0 ? (
                      <div className="text-[10px] text-white/40 italic p-2 border border-dashed border-white/10">
                        No active mission directives. Say &ldquo;Add task ...&rdquo;
                      </div>
                    ) : (
                      missionTasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => toggleTask(task.id)}
                          className={`p-2 border transition-all cursor-pointer flex items-center justify-between ${
                            task.completed 
                              ? 'bg-white/[0.02] border-white/10 text-white/40 line-through' 
                              : 'bg-white/[0.05] border-white/20 text-white hover:border-white'
                          }`}
                        >
                          <span className="text-[10px] font-mono truncate">{task.text}</span>
                          <CheckCircle2 size={12} className={task.completed ? 'text-white/40' : 'text-white'} />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Cognitive Economy & Focus Metrics */}
                <div className="space-y-2 border-t border-white/20 pt-3">
                  <div className="flex items-center justify-between text-[9px] text-white/60">
                    <span>MAYBACH COINS</span>
                    <span className="font-bold text-white">{appStore.maybachCoins} COINS</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5">
                    <div 
                      className="bg-white h-full transition-all"
                      style={{ width: `${Math.min(100, (appStore.maybachCoins % 500) / 5)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[8px] text-white/40">
                    <span>FOCUS MATRIX ALPHA</span>
                    <span>TOTAL FOCUSED: {appStore.totalMinutesFocused} MINS</span>
                  </div>
                </div>
              </motion.aside>

              {/* CENTER STAGE: NEURAL CORE & CONTEXTUAL SPOT VISOR (Col 6) */}
              <motion.main 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="lg:col-span-6 flex flex-col items-center justify-center border border-white/20 bg-white/[0.02] p-4 relative overflow-hidden"
              >
                {/* Tactical Reticle Crosshairs */}
                <div className="absolute top-2 left-2 text-[8px] text-white/30 font-mono">+ 01_NEURAL_CORE</div>
                <div className="absolute top-2 right-2 text-[8px] text-white/30 font-mono">RETICLE // 4K +</div>
                <div className="absolute bottom-2 left-2 text-[8px] text-white/30 font-mono">STATUS // LOCKED</div>
                <div className="absolute bottom-2 right-2 text-[8px] text-white/30 font-mono">FOCUS // ACTIVE</div>

                {/* Contextual Spot UI Viewport OR Central Neural Core */}
                {spotType && latestMessage ? (
                  <div className="w-full h-full flex flex-col justify-between relative z-20 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/20 pb-2">
                      <div className="flex items-center gap-2">
                        <Crosshair size={14} className="text-white" />
                        <span className="text-[11px] font-bold tracking-widest uppercase text-white">
                          TACTICAL VISOR SPOT OUTPUT
                        </span>
                      </div>
                      <button
                        onClick={() => setActiveSpotDismissed(true)}
                        className="px-2 py-0.5 border border-white/20 hover:border-white text-white/60 hover:text-white text-[9px] font-mono uppercase transition-colors"
                        title="Dismiss to Core"
                      >
                        [ CLOSE SPOT X ]
                      </button>
                    </div>

                    <div className="flex-1 flex items-center justify-center">
                      {spotType === 'video' && latestMessage.mediaResults && (
                        <BatmanSpotVideoWidget 
                          videos={latestMessage.mediaResults} 
                          onWatch={(v) => {
                            window.dispatchEvent(new CustomEvent('start-theatre', { detail: { url: v.url } }));
                          }} 
                        />
                      )}
                      {spotType === 'stock' && latestMessage.stockData && (
                        <BatmanSpotStockWidget stock={latestMessage.stockData} />
                      )}
                      {spotType === 'weather' && latestMessage.weatherData && (
                        <BatmanSpotWeatherWidget weather={latestMessage.weatherData} />
                      )}
                      {spotType === 'crypto' && latestMessage.cryptoData && (
                        <BatmanSpotCryptoWidget crypto={latestMessage.cryptoData} />
                      )}
                    </div>

                    <div className="text-[9px] text-white/50 text-center font-mono">
                      Say &ldquo;close&rdquo; or click [ CLOSE SPOT X ] to return to Neural Core.
                    </div>
                  </div>
                ) : (
                  /* Central Neural Core Thinking Orb */
                  <div className="flex flex-col items-center justify-center space-y-6 text-center my-auto">
                    {/* Concentric Gyroscope HUD Rings */}
                    <div className="relative flex items-center justify-center w-52 h-52">
                      <div className="absolute inset-0 rounded-full border border-dashed border-white/20 animate-[spin_30s_linear_infinite]" />
                      <div className="absolute inset-3 rounded-full border border-white/10 animate-[spin_20s_linear_infinite_reverse]" />
                      <div className="absolute inset-8 rounded-full border border-white/20" />

                      {/* Thinking Orb Component */}
                      <div className="relative z-10 scale-125">
                        <ThinkingOrb state={orbState} size={64} theme="dark" />
                      </div>
                    </div>

                    {/* Telemetry Status Readout */}
                    <div className="space-y-1.5">
                      <div className="text-xs font-extrabold tracking-widest uppercase text-white">
                        {jarvisStore.voiceState === 'listening_for_command' || jarvisStore.voiceState === 'transcribing_command'
                          ? 'LISTENING TO VOICE DIRECTIVE...'
                          : jarvisStore.voiceState === 'speaking_response'
                          ? 'TRANSMITTING NEURAL AUDIO...'
                          : jarvisStore.voiceState === 'processing_command'
                          ? 'PROCESSING INTENT SYNTHESIS...'
                          : 'NEURAL CORE IN STANDBY • SAY "JARVIS"'}
                      </div>
                      <div className="text-[10px] text-white/50 max-w-sm font-mono truncate">
                        {jarvisStore.telemetry?.interimTranscript || jarvisStore.telemetry?.finalCommandTranscript || 'Voice pipeline locked to tactical frequency.'}
                      </div>
                    </div>
                  </div>
                )}
              </motion.main>

              {/* RIGHT WING: ACOUSTIC STREAM & TACTICAL RADAR (Col 3) */}
              <motion.aside 
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="hidden lg:flex lg:col-span-3 flex-col justify-between border border-white/20 bg-white/[0.02] p-4 space-y-4"
              >
                {/* Acoustic Monitor */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-white/20 pb-2">
                    <div className="flex items-center gap-2">
                      <Music size={14} className="text-white" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white">
                        ACOUSTIC FREQUENCY
                      </span>
                    </div>
                    <span className="text-[9px] text-white/50">{frequencyStore.isPlaying ? 'STREAMING' : 'PAUSED'}</span>
                  </div>

                  <div className="p-3 bg-black/60 border border-white/10 space-y-2">
                    <span className="text-[8px] text-white/50 block uppercase font-mono">CURRENT TRACK</span>
                    <div className="text-xs font-bold text-white truncate font-mono">
                      {frequencyStore.getCurrentTrack()?.title || 'The Batman - Atmospheric Focus Suite'}
                    </div>
                    <div className="text-[9px] text-white/60 truncate font-mono">
                      {frequencyStore.getCurrentTrack()?.artist || 'Michael Giacchino'}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button 
                        onClick={() => frequencyStore.togglePlay()}
                        className="p-1.5 bg-white text-black text-[9px] font-bold uppercase flex items-center gap-1"
                      >
                        {frequencyStore.isPlaying ? <Pause size={10} /> : <Play size={10} />}
                        <span>{frequencyStore.isPlaying ? 'Pause' : 'Play'}</span>
                      </button>
                      <button 
                        onClick={() => frequencyStore.next()}
                        className="p-1.5 border border-white/20 hover:border-white text-white text-[9px]"
                      >
                        <SkipForward size={10} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Tactical Voice Directives */}
                <div className="space-y-2 border-t border-white/20 pt-3">
                  <span className="text-[9px] text-white/50 uppercase font-bold block">TACTICAL VOICE RADAR</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: "Start Focus Music", cmd: "start focus music" },
                      { label: "Tokyo Weather", cmd: "weather in tokyo" },
                      { label: "Crypto Pulse", cmd: "crypto prices" },
                      { label: "My Tasks", cmd: "what are my tasks" }
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleGlobalJarvisCommand(item.cmd)}
                        className="p-1.5 bg-white/[0.04] hover:bg-white text-white hover:text-black border border-white/15 text-[9px] font-mono text-left truncate transition-all"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.aside>

            </div>

            {/* 3. BOTTOM COMMAND DECK & VOICE WAVEFORM */}
            <motion.footer 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-between border-t border-white/20 pt-3 gap-3"
            >
              {/* Voice Trigger Input Console */}
              <div className="w-full sm:w-auto flex-1 flex items-center gap-2 bg-white/[0.04] border border-white/20 px-3 py-1.5">
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
                  placeholder="Type or speak tactical command to JARVIS..."
                  className="bg-transparent text-xs text-white placeholder:text-white/30 font-mono focus:outline-none flex-1"
                />

                <span className="text-[9px] text-white/40 hidden md:inline font-mono">
                  SAY &ldquo;JARVIS&rdquo; OR &ldquo;LET&rsquo;S LOCK IN&rdquo;
                </span>
              </div>

              {/* Status Pill */}
              <div className="flex items-center gap-2 text-[10px] text-white/60">
                <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span className="uppercase font-bold">OLED LOCK-IN PROTOCOL ACTIVE</span>
              </div>
            </motion.footer>
            </div>
          </HudFrame>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
