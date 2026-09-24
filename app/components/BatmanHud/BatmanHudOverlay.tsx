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
  Flame, Award, CheckCircle2, Trash2, Plus, Volume1
} from 'lucide-react';
import { ThinkingOrb, OrbState } from 'thinking-orbs';
import { HudFrame, TargetingUI } from '@/components/ui/animated-hud-targeting-ui';
import { useBatmanStore, SPOT_ROOMS, BatmanActiveModule, SpotRoom } from '@/hooks/useBatmanStore';
import { useFrequencyStore } from '@/hooks/useFrequencyStore';
import { useJarvisStore } from '@/hooks/useJarvisStore';
import { useAppStore } from '@/hooks/useAppStore';
import { jarvisVoiceEngine } from '@/lib/jarvisVoiceEngine';
import { jarvisLiveEngine } from '@/lib/jarvisLiveEngine';
import { executeLocalCommand } from '@/lib/jarvisCommandDispatcher';
import { resolveOrbState } from '../JarvisOrbVisualizer';
import { fetchWeather } from '@/lib/intelligence/weatherAdapter';
import { fetchNews } from '@/lib/intelligence/worldPulseAdapter';
import { fetchEarthquakes } from '@/lib/intelligence/earthquakeAdapter';
import { fetchIssTelemetry } from '@/lib/intelligence/issAdapter';
import { fetchCryptoMarkets } from '@/lib/intelligence/cryptoAdapter';

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
  const [isLoadingIntel, setIsLoadingIntel] = useState(false);
  const [mediaSearchQuery, setMediaSearchQuery] = useState('');

  const animRef = useRef<number | null>(null);
  const fpsRef = useRef({ frames: 0, lastTime: performance.now() });

  // 1. CINEMATIC INTRO TIMELINE SEQUENCE (Blur -> 2.0s Blank OLED -> Intro Vector Build -> Active)
  useEffect(() => {
    if (!batmanStore.isBatmanMode) {
      setIntroStep(0);
      setBootLogs([]);
      return;
    }

    // Step 1: Blurring out into Black (0ms - 1000ms)
    setIntroStep(1);

    // Step 2: Pitch-Black 2-Second OLED Delay (1000ms - 3000ms)
    const blankTimer = setTimeout(() => {
      setIntroStep(2);
      
      // Play tactical audio boot sound
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(55, audioCtx.currentTime); // Low sub drone
        osc.frequency.exponentialRampToValueAtTime(432, audioCtx.currentTime + 1.2);
        gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.3);
      } catch (e) {}

      // Step 3: Draw Vector Targeting & Feed Boot Telemetry (3000ms - 4500ms)
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
        }, index * 300);
      });

      // Step 4: Fully Active HUD (4500ms)
      const activeTimer = setTimeout(() => {
        setIntroStep(3);
        batmanStore.setIntroPhase('active');
      }, 2200);

      return () => clearTimeout(activeTimer);
    }, 2000);

    return () => clearTimeout(blankTimer);
  }, [batmanStore.isBatmanMode]);

  // Escape Key to Exit Batman Lock-In Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && batmanStore.isBatmanMode) {
        batmanStore.toggleBatmanMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [batmanStore]);

  // Lock-In Chronometer & Telemetry Loop
  useEffect(() => {
    if (!batmanStore.isBatmanMode || introStep < 3) return;

    const timer = setInterval(() => {
      if (batmanStore.lockInStartTime) {
        const diff = Math.floor((Date.now() - batmanStore.lockInStartTime) / 1000);
        const hrs = String(Math.floor(diff / 3600)).padStart(2, '0');
        const mins = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
        const secs = String(diff % 60).padStart(2, '0');
        setElapsedTime(`${hrs}:${mins}:${secs}`);
      }
    }, 1000);

    const updateTelemetry = () => {
      fpsRef.current.frames++;
      const now = performance.now();
      if (now - fpsRef.current.lastTime >= 1000) {
        setFps(Math.round((fpsRef.current.frames * 1000) / (now - fpsRef.current.lastTime)));
        fpsRef.current.frames = 0;
        fpsRef.current.lastTime = now;
      }

      // Voice / Music Waveform Telemetry
      if (frequencyStore.isPlaying || batmanStore.isSpeaking || jarvisStore.voiceState === 'SPEAKING_RESPONSE') {
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

      animRef.current = requestAnimationFrame(updateTelemetry);
    };

    animRef.current = requestAnimationFrame(updateTelemetry);

    return () => {
      clearInterval(timer);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [batmanStore.isBatmanMode, batmanStore.lockInStartTime, frequencyStore.isPlaying, batmanStore.isSpeaking, jarvisStore.voiceState, introStep]);

  // Synchronize Tasks from localStorage and Window Events
  useEffect(() => {
    const handleTasksUpdated = (e: any) => {
      if (e.detail?.tasks) {
        setTasks(e.detail.tasks);
      }
    };
    window.addEventListener('tasksUpdated', handleTasksUpdated);
    return () => window.removeEventListener('tasksUpdated', handleTasksUpdated);
  }, []);

  // Fetch Planetary Intelligence Feeds on Demand
  useEffect(() => {
    if (batmanStore.activeModule === 'intel' && !weatherData && !isLoadingIntel) {
      setIsLoadingIntel(true);
      Promise.allSettled([
        fetchWeather('Tokyo'),
        fetchNews('technology'),
        fetchEarthquakes(2.5, 4, 'day'),
        fetchIssTelemetry(),
        fetchCryptoMarkets('usd', ['bitcoin', 'ethereum', 'solana'])
      ]).then(([wRes, nRes, eRes, iRes, cRes]) => {
        if (wRes.status === 'fulfilled') setWeatherData(wRes.value);
        if (nRes.status === 'fulfilled') setNewsData(nRes.value.articles || []);
        if (eRes.status === 'fulfilled') setEarthquakeData(eRes.value.earthquakes || []);
        if (iRes.status === 'fulfilled') setIssData(iRes.value);
        if (cRes.status === 'fulfilled') setCryptoData(cRes.value?.coins || []);
        setIsLoadingIntel(false);
      });
    }
  }, [batmanStore.activeModule, weatherData, isLoadingIntel]);

  // Task Handlers
  const handleToggleTask = (id: string | number) => {
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTasks(updated);
    localStorage.setItem('focus-tasks', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('tasksUpdated', { detail: { tasks: updated, source: 'batman-hud' } }));
    if (updated.find(t => t.id === id)?.done) {
      appStore.setMaybachCoins((c: number) => c + 25);
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    const newTask = {
      id: `task-${Date.now()}`,
      title: newTaskInput.trim(),
      desc: 'Created via Batman HUD',
      priority: 'urgent',
      estimatedMinutes: 30,
      subtasks: [],
      done: false,
      created: Date.now()
    };
    const updated = [newTask, ...tasks];
    setTasks(updated);
    setNewTaskInput('');
    localStorage.setItem('focus-tasks', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('tasksUpdated', { detail: { tasks: updated, source: 'batman-hud' } }));
  };

  const handleDeleteTask = (id: string | number) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    localStorage.setItem('focus-tasks', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('tasksUpdated', { detail: { tasks: updated, source: 'batman-hud' } }));
  };

  // Notes Handlers
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteInput.trim()) return;
    const updated = [newNoteInput.trim(), ...notes];
    setNotes(updated);
    setNewNoteInput('');
    localStorage.setItem('batman-hud-notes', JSON.stringify(updated));
  };

  // Resolve Active Track & Spot Room
  const currentTrack = useMemo(() => {
    return frequencyStore.tracks?.find(t => t.id === frequencyStore.currentTrackId);
  }, [frequencyStore.tracks, frequencyStore.currentTrackId]);

  const activeSpot = useMemo(() => {
    return SPOT_ROOMS.find(s => s.id === batmanStore.activeSpotId) || SPOT_ROOMS[0];
  }, [batmanStore.activeSpotId]);

  // Resolve Orb State for Dynamic Thinking Orb Form Factor
  const orbState: OrbState = useMemo(() => {
    return resolveOrbState(
      jarvisStore.voiceState,
      jarvisStore.aiState,
      jarvisStore.lastAction
    );
  }, [jarvisStore.voiceState, jarvisStore.aiState, jarvisStore.lastAction]);

  if (!batmanStore.isBatmanMode) return null;

  // ---------------------------------------------------------------------------
  // RENDER: STAGE 1 & 2 — CINEMATIC BLUR & PURE OLED BLANK SUSPENSE (2.0s)
  // ---------------------------------------------------------------------------
  if (introStep < 2) {
    return (
      <motion.div
        initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
        animate={{ opacity: 1, backdropFilter: "blur(32px)" }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[9999] bg-black pointer-events-auto flex items-center justify-center"
      >
        <motion.div 
          animate={{ scale: [1, 1.05, 1], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center"
        >
          <div className="w-2 h-2 bg-white rounded-full animate-ping" />
        </motion.div>
      </motion.div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: STAGE 3 — VECTOR TARGETING INTRO BOOT SEQUENCE
  // ---------------------------------------------------------------------------
  if (introStep === 2) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black text-white font-mono flex flex-col items-center justify-center overflow-hidden p-6">
        <div className="relative w-full max-w-lg flex flex-col items-center justify-center">
          <TargetingUI className="w-72 h-72 sm:w-96 sm:h-96 text-white opacity-80" />
          
          {/* Real-time Typewriter Boot Logs */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 w-full bg-white/[0.04] border border-white/20 p-3.5 space-y-1 text-[10px] tracking-wider"
          >
            {bootLogs.map((log, i) => (
              <motion.div
                key={i}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="flex items-center gap-2 text-white/90"
              >
                <span className="text-white/40">&gt;&gt;</span>
                <span>{log}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: STAGE 4 — FULLY OPERATIONAL B.A.T.M.A.N. TACTICAL HUD
  // ---------------------------------------------------------------------------
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.04, filter: "blur(20px)" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[9999] bg-black text-white font-mono select-none overflow-hidden flex flex-col justify-between"
      >
        {/* CRT Scanline Layer */}
        <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0)_50%,rgba(0,0,0,0.8)_50%)] bg-[length:100%_4px]" />

        {/* Ambient Grid Backdrop */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.92)_100%)] z-0" />
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.06] z-0" 
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
            backgroundSize: '28px 28px'
          }}
        />

        {/* Chamfered Polygonal HUD Frame */}
        <HudFrame>
          <div className="relative w-full h-full flex flex-col justify-between p-3 sm:p-6 z-20 overflow-hidden">
            
            {/* 1. TOP TELEMETRY STATUS BAR */}
            <motion.header
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex items-center justify-between border-b border-white/20 pb-2.5 pt-0.5"
            >
              {/* Left Brand Header */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-white animate-ping rounded-full" />
                  <span className="text-xs sm:text-sm font-bold tracking-[0.25em] text-white">
                    B.A.T.M.A.N. // SOVEREIGN HUD
                  </span>
                </div>
                <div className="hidden lg:flex items-center gap-2 text-[10px] text-white/50 border-l border-white/20 pl-3">
                  <span>SECURE CHANNEL</span>
                  <span className="text-white/20">•</span>
                  <span className="text-white">FPS: {fps}</span>
                  <span className="text-white/20">•</span>
                  <span>SPOT: {activeSpot.name.toUpperCase()}</span>
                </div>
              </div>

              {/* Center Lock-In Chronometer */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/20 px-3 py-1 rounded-sm">
                <Clock size={12} className="text-white/60" />
                <span className="text-[11px] sm:text-xs font-bold tracking-widest text-white">
                  T+{elapsedTime}
                </span>
              </div>

              {/* Right Disengage & Voice Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (jarvisVoiceEngine.getState() === 'WAKE_WORD_LISTENING') {
                      jarvisVoiceEngine.startCommandListening();
                    } else {
                      jarvisVoiceEngine.startWakeWordDetection();
                    }
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 border text-[10px] font-bold tracking-wider cursor-pointer transition-all ${
                    jarvisVoiceEngine.getState() === 'LISTENING_FOR_COMMAND'
                      ? 'bg-white text-black border-white'
                      : 'bg-white/5 border-white/20 text-white/80 hover:border-white/40'
                  }`}
                >
                  <Mic size={11} />
                  <span className="hidden sm:inline">MIC ON</span>
                </button>

                <button
                  type="button"
                  onClick={() => batmanStore.toggleBatmanMode(false)}
                  className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-white/90 text-black text-[10px] sm:text-[11px] font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                >
                  <span>DISENGAGE</span>
                  <span className="text-[9px] opacity-60">[ESC]</span>
                </button>
              </div>
            </motion.header>

            {/* 2. MAIN CENTER HUD WORKSPACE (Contextual Module Router) */}
            <div className="flex-1 relative flex items-center justify-center my-2 sm:my-3 overflow-hidden">
              
              {/* Background Animated Vector Target Reticle */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                <TargetingUI className="w-[300px] h-[300px] sm:w-[480px] sm:h-[480px] text-white" />
              </div>

              {/* MODULE ROUTER */}
              <div className="relative z-10 w-full max-w-6xl h-full flex flex-col justify-center px-1 sm:px-4">
                
                {/* ------------------------------------------------------------- */}
                {/* MODULE A: VOICE CORE & THINKING ORB MATRIX (Default)          */}
                {/* ------------------------------------------------------------- */}
                {batmanStore.activeModule === 'voice_core' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center justify-center text-center space-y-4"
                  >
                    {/* Living Thinking Orb Quantum Form Factor */}
                    <div className="relative flex items-center justify-center">
                      <motion.div
                        animate={{
                          scale: [1, 1.08, 1],
                          opacity: [0.2, 0.4, 0.2]
                        }}
                        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                        className="w-40 h-40 sm:w-56 sm:h-56 rounded-full border border-dashed border-white/20 absolute pointer-events-none"
                      />

                      {/* Thinking Orb Core Component */}
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

                    {/* Live Transcript & Voice Wave Oscilloscope */}
                    <div className="w-full max-w-lg bg-black/80 border border-white/15 p-3 backdrop-blur-xl">
                      <div className="flex items-center justify-between text-[9px] text-white/40 border-b border-white/10 pb-1.5 mb-2">
                        <span className="flex items-center gap-1.5 text-white">
                          <Terminal size={10} />
                          <span>TACTICAL STREAM</span>
                        </span>
                        <span>{jarvisStore.voiceState}</span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-white leading-relaxed font-mono min-h-[38px] line-clamp-2">
                        {jarvisStore.telemetry?.interimTranscript || jarvisStore.telemetry?.transcript || batmanStore.voiceTranscript || batmanStore.aiResponse || 'All neural nodes calibrated. Say "Play 432Hz focus", "Show tasks", "Show spot", or speak any request.'}
                      </p>
                      
                      {/* 24-Band Visualizer Wave */}
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

                {/* ------------------------------------------------------------- */}
                {/* MODULE B: THE PLACE / VIRTUAL SPOT CO-FOCUS NETWORK          */}
                {/* ------------------------------------------------------------- */}
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

                {/* ------------------------------------------------------------- */}
                {/* MODULE C: MEDIA / YOUTUBE VIDEO STREAM & FREQUENCY           */}
                {/* ------------------------------------------------------------- */}
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
                          ACOUSTIC FREQUENCY & VIDEO MONITOR
                        </span>
                      </div>
                      <span className="text-[10px] text-white/50">
                        {frequencyStore.isPlaying ? 'AUDIO ACTIVE' : 'STANDBY'}
                      </span>
                    </div>

                    {/* YouTube Search Input */}
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (mediaSearchQuery.trim()) {
                          executeLocalCommand(`play ${mediaSearchQuery.trim()}`);
                        }
                      }}
                      className="flex items-center gap-2 mb-3"
                    >
                      <input
                        type="text"
                        value={mediaSearchQuery}
                        onChange={(e) => setMediaSearchQuery(e.target.value)}
                        placeholder='Voice or type query (e.g. "Tokyo Rain LoFi", "Hans Zimmer Interstellar")...'
                        className="flex-1 bg-white/[0.04] border border-white/20 px-3 py-1.5 text-[11px] text-white placeholder:text-white/30 focus:outline-none focus:border-white"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-white text-black text-[10px] font-bold tracking-wider uppercase cursor-pointer hover:bg-white/90"
                      >
                        STREAM
                      </button>
                    </form>

                    {/* Active Track Visual Card */}
                    <div className="p-3.5 border border-white/20 bg-white/[0.03] flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 border border-white/20 bg-white/5 flex items-center justify-center shrink-0">
                          <Music size={18} className={frequencyStore.isPlaying ? "animate-pulse text-white" : "text-white/40"} />
                        </div>
                        <div>
                          <p className="text-[12px] font-bold text-white truncate max-w-[280px]">
                            {currentTrack?.title || 'Tokyo Rain & Cyberpunk Lo-Fi'}
                          </p>
                          <p className="text-[10px] text-white/50">
                            {currentTrack?.artist || 'Binaural Focus Frequency'}
                          </p>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => executeLocalCommand('previous track')}
                          className="p-1.5 border border-white/10 hover:border-white/30 cursor-pointer"
                        >
                          <SkipBack size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => frequencyStore.togglePlay()}
                          className="w-8 h-8 bg-white text-black flex items-center justify-center cursor-pointer hover:bg-white/90"
                        >
                          {frequencyStore.isPlaying ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => executeLocalCommand('next track')}
                          className="p-1.5 border border-white/10 hover:border-white/30 cursor-pointer"
                        >
                          <SkipForward size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Equalizer DSP Preset Switcher */}
                    <div className="grid grid-cols-5 gap-1.5 mt-3">
                      {(['original', 'enhanced', 'immersive', 'bass-titan', 'vocal-air'] as const).map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => frequencyStore.setAudioPreset(preset)}
                          className={`py-1 px-1 text-center text-[9px] uppercase border cursor-pointer ${
                            frequencyStore.audioPreset === preset
                              ? 'bg-white text-black border-white font-bold'
                              : 'bg-white/[0.02] border-white/10 text-white/50 hover:text-white'
                          }`}
                        >
                          {preset.replace('-', ' ')}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* MODULE D: MISSION TASK BACKLOG & MATRIX                      */}
                {/* ------------------------------------------------------------- */}
                {batmanStore.activeModule === 'tasks' && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="w-full max-w-3xl mx-auto bg-black/85 border border-white/20 p-4 sm:p-5 backdrop-blur-2xl"
                  >
                    <div className="flex items-center justify-between border-b border-white/20 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Crosshair size={14} className="text-white" />
                        <span className="text-xs font-bold tracking-widest uppercase text-white">
                          MISSION BACKLOG DIRECTIVES
                        </span>
                      </div>
                      <span className="text-[10px] text-white/50">
                        {tasks.filter(t => t.done).length}/{tasks.length} COMPLETED
                      </span>
                    </div>

                    {/* Add Task Input Form */}
                    <form onSubmit={handleAddTask} className="flex items-center gap-2 mb-3">
                      <input
                        type="text"
                        value={newTaskInput}
                        onChange={(e) => setNewTaskInput(e.target.value)}
                        placeholder="Add mission objective via voice or text..."
                        className="flex-1 bg-white/[0.04] border border-white/20 px-3 py-1.5 text-[11px] text-white placeholder:text-white/30 focus:outline-none focus:border-white"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-white text-black text-[10px] font-bold tracking-wider uppercase cursor-pointer hover:bg-white/90 flex items-center gap-1"
                      >
                        <Plus size={11} />
                        <span>ADD</span>
                      </button>
                    </form>

                    {/* Task List */}
                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                      {tasks.length === 0 ? (
                        <div className="p-6 border border-white/10 text-center text-[10px] text-white/40">
                          NO ACTIVE DIRECTIVES. SAY &quot;ADD TASK&quot; OR TYPE ABOVE.
                        </div>
                      ) : (
                        tasks.map((task) => (
                          <div
                            key={task.id}
                            className={`p-2.5 border transition-all flex items-center justify-between gap-3 ${
                              task.done
                                ? 'border-white/10 bg-white/[0.02] text-white/30 line-through'
                                : 'border-white/20 bg-white/[0.04] text-white hover:border-white/40'
                            }`}
                          >
                            <div 
                              onClick={() => handleToggleTask(task.id)}
                              className="flex items-center gap-2.5 flex-1 cursor-pointer"
                            >
                              <div className={`w-4 h-4 border flex items-center justify-center shrink-0 ${
                                task.done ? 'border-white bg-white text-black' : 'border-white/40'
                              }`}>
                                {task.done && <CheckSquare size={12} />}
                              </div>
                              <span className="text-[11px] font-medium leading-tight">
                                {task.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] border border-white/15 px-1.5 py-0.5 uppercase tracking-widest text-white/60">
                                {task.priority || 'HIGH'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task.id)}
                                className="text-white/40 hover:text-white p-1 cursor-pointer"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* MODULE E: DEEP WORK FOCUS TIMER CHRONOMETER                  */}
                {/* ------------------------------------------------------------- */}
                {batmanStore.activeModule === 'timer' && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="w-full max-w-xl mx-auto bg-black/85 border border-white/20 p-6 backdrop-blur-2xl text-center space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-white/20 pb-3">
                      <span className="text-xs font-bold tracking-widest uppercase text-white">
                        DEEP WORK CHRONOMETER // CYCLES
                      </span>
                      <span className="text-[10px] text-white/50">
                        {appStore.isRunning ? 'RUNNING' : 'PAUSED'}
                      </span>
                    </div>

                    {/* Timer Radial Display */}
                    <div className="py-4">
                      <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white font-mono">
                        {Math.floor(appStore.timeLeft / 60).toString().padStart(2, '0')}:
                        {(appStore.timeLeft % 60).toString().padStart(2, '0')}
                      </h2>
                      <p className="text-[10px] text-white/50 mt-1 uppercase tracking-widest">
                        {appStore.activeTimer?.name || '25M DEEP WORK SPRINT'}
                      </p>
                    </div>

                    {/* Timer Presets */}
                    <div className="grid grid-cols-4 gap-2">
                      {[15, 25, 45, 90].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => executeLocalCommand(`start timer for ${mins} minutes`)}
                          className="py-1.5 border border-white/20 bg-white/[0.02] hover:bg-white text-white hover:text-black text-[10px] font-bold uppercase transition-all"
                        >
                          {mins} MIN
                        </button>
                      ))}
                    </div>

                    {/* Timer Actions */}
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => appStore.setIsRunning(!appStore.isRunning)}
                        className="px-6 py-2 bg-white text-black text-[11px] font-bold tracking-widest uppercase hover:bg-white/90"
                      >
                        {appStore.isRunning ? 'PAUSE SPRINT' : 'START SPRINT'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          appStore.setIsRunning(false);
                          appStore.setTimeLeft(25 * 60);
                        }}
                        className="px-4 py-2 border border-white/20 text-white text-[11px] font-bold tracking-widest uppercase hover:border-white"
                      >
                        RESET
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* MODULE F: PLANETARY INTELLIGENCE & TELEMETRY FEEDS           */}
                {/* ------------------------------------------------------------- */}
                {batmanStore.activeModule === 'intel' && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="w-full max-w-4xl mx-auto bg-black/85 border border-white/20 p-4 sm:p-5 backdrop-blur-2xl space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-white/20 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Compass size={14} className="text-white" />
                        <span className="text-xs font-bold tracking-widest uppercase text-white">
                          GLOBAL PLANETARY TELEMETRY & INTELLIGENCE
                        </span>
                      </div>
                      <span className="text-[10px] text-white/50">LIVE FEEDS</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1">
                      {/* Weather Feed */}
                      <div className="p-3 border border-white/15 bg-white/[0.02]">
                        <span className="text-[9px] text-white/40 uppercase tracking-widest">ATMOSPHERIC SENSOR</span>
                        <h4 className="text-[13px] font-bold mt-1 text-white">
                          {weatherData ? `${weatherData.city}: ${weatherData.temp}°C` : 'Tokyo: 19°C Rain'}
                        </h4>
                        <p className="text-[10px] text-white/60 mt-0.5">
                          {weatherData?.condition || 'Overcast Precipitation • Humidity: 82%'}
                        </p>
                      </div>

                      {/* ISS Orbital Telemetry */}
                      <div className="p-3 border border-white/15 bg-white/[0.02]">
                        <span className="text-[9px] text-white/40 uppercase tracking-widest">ORBITAL STATION (ISS)</span>
                        <h4 className="text-[13px] font-bold mt-1 text-white">
                          {issData ? `${Math.round(issData.altitude)} KM ALTITUDE` : '418 KM ALTITUDE'}
                        </h4>
                        <p className="text-[10px] text-white/60 mt-0.5">
                          {issData ? `Lat: ${issData.latitude}°, Lon: ${issData.longitude}°` : 'Orbital Speed: 27,600 km/h'}
                        </p>
                      </div>

                      {/* Seismic Detector */}
                      <div className="p-3 border border-white/15 bg-white/[0.02]">
                        <span className="text-[9px] text-white/40 uppercase tracking-widest">SEISMIC ACTIVITY</span>
                        <h4 className="text-[13px] font-bold mt-1 text-white">
                          {earthquakeData.length > 0 ? `${earthquakeData.length} EVENTS (M2.5+)` : 'NOMINAL SEISMIC'}
                        </h4>
                        <p className="text-[10px] text-white/60 mt-0.5 truncate">
                          {earthquakeData[0]?.place || 'Global tectonic plates stable'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* MODULE G: MAYBACH ECONOMY LEDGER & USER STATS               */}
                {/* ------------------------------------------------------------- */}
                {batmanStore.activeModule === 'ledger' && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="w-full max-w-2xl mx-auto bg-black/85 border border-white/20 p-6 backdrop-blur-2xl space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-white/20 pb-3">
                      <span className="text-xs font-bold tracking-widest uppercase text-white">
                        MAYBACH ECONOMIC LEDGER // SOVEREIGN RANK
                      </span>
                      <span className="text-[10px] text-white/50">TIER: TITANIUM</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-4 border border-white/20 bg-white/[0.03]">
                        <span className="text-[9px] text-white/40 uppercase">MAYBACH COINS</span>
                        <h3 className="text-2xl font-bold text-white mt-1">
                          {appStore.maybachCoins} ₥
                        </h3>
                      </div>
                      <div className="p-4 border border-white/20 bg-white/[0.03]">
                        <span className="text-[9px] text-white/40 uppercase">FOCUS STREAK</span>
                        <h3 className="text-2xl font-bold text-white mt-1">
                          12 DAYS
                        </h3>
                      </div>
                      <div className="p-4 border border-white/20 bg-white/[0.03]">
                        <span className="text-[9px] text-white/40 uppercase">AURA FLOW</span>
                        <h3 className="text-2xl font-bold text-white mt-1">
                          98.4%
                        </h3>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* MODULE H: TACTICAL SCRATCHPAD & NOTES                        */}
                {/* ------------------------------------------------------------- */}
                {batmanStore.activeModule === 'notes' && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="w-full max-w-2xl mx-auto bg-black/85 border border-white/20 p-5 backdrop-blur-2xl space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-white/20 pb-3">
                      <span className="text-xs font-bold tracking-widest uppercase text-white">
                        TACTICAL SCRATCHPAD // MEMORY
                      </span>
                      <span className="text-[10px] text-white/50">{notes.length} ENTRIES</span>
                    </div>

                    <form onSubmit={handleAddNote} className="flex gap-2">
                      <input
                        type="text"
                        value={newNoteInput}
                        onChange={(e) => setNewNoteInput(e.target.value)}
                        placeholder="Capture tactical note..."
                        className="flex-1 bg-white/[0.04] border border-white/20 px-3 py-1.5 text-[11px] text-white placeholder:text-white/30 focus:outline-none focus:border-white"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-white text-black text-[10px] font-bold uppercase hover:bg-white/90"
                      >
                        SAVE
                      </button>
                    </form>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {notes.map((note, idx) => (
                        <div key={idx} className="p-2.5 border border-white/10 bg-white/[0.02] text-[11px] text-white/90">
                          {note}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

              </div>
            </div>

            {/* 3. BOTTOM TACTICAL DOCK & MODULE SWITCHER */}
            <motion.footer
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="border-t border-white/20 pt-2.5 pb-0.5 flex flex-col sm:flex-row items-center justify-between gap-2.5"
            >
              {/* Module Switcher Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto py-0.5">
                {[
                  { id: 'voice_core', label: 'NEURAL CORE' },
                  { id: 'spot', label: 'THE PLACE' },
                  { id: 'media', label: 'MEDIA' },
                  { id: 'tasks', label: 'TASKS' },
                  { id: 'timer', label: 'TIMER' },
                  { id: 'intel', label: 'INTEL' },
                  { id: 'ledger', label: 'LEDGER' },
                  { id: 'notes', label: 'NOTES' },
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
