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
  Youtube, ExternalLink, Check, TrendingUp
} from 'lucide-react';
import { useJarvisStore, JarvisAiState, StockSpotData, TaskSpotData } from '../../hooks/useJarvisStore';
import { useJarvisHotword } from '../../hooks/useJarvisHotword';
import { useAppStore } from '../../hooks/useAppStore';
import { useFrequencyStore } from '../../hooks/useFrequencyStore';
import { jarvisAudio } from '../../lib/jarvisAudio';
import { jarvisVoiceEngine, VoiceState } from '../../lib/jarvisVoiceEngine';
import { SiriWave, SiriWaveVariant } from '@/components/ui/siri-wave';
import type { YouTubeSearchResult } from '../../lib/youtubeSearch';

import { handleGlobalJarvisCommand } from '../../lib/jarvisCommandDispatcher';
import { getSelectedTextModel, getSelectedLiveModel } from '../../lib/aiModelConfig';

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
              {videos.length} videos • Click to stream in The Place
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
        {videos.map((item) => (
          <div
            key={item.id}
            onClick={() => onWatch(item)}
            className="group bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/25 rounded-2xl p-3 cursor-pointer transition-all duration-300 flex flex-col justify-between space-y-2.5 hover:scale-[1.02] shadow-sm"
          >
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black/60 border border-white/5">
              <img 
                src={item.thumbnail} 
                alt={item.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-95 group-hover:brightness-100"
              />
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
    if (voiceState === 'PROCESSING_COMMAND' || isProcessing || aiState === 'thinking') {
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

  if (!isOpen) return null;
  if (displayMode !== 'fullscreen') return null;

  // Render State Pill
  const renderStateBadge = () => {
    switch (voiceState) {
      case 'IDLE':
        return { label: "Ready", color: "bg-white/5 border-white/10 text-white/70", dot: "bg-white/40" };
      case 'REQUESTING_MICROPHONE':
        return { label: "Requesting Mic...", color: "bg-amber-500/15 border-amber-500/30 text-amber-300 animate-pulse", dot: "bg-amber-400" };
      case 'WAKE_WORD_LISTENING':
        return { label: "Say 'JARVIS'", color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300", dot: "bg-emerald-400" };
      case 'WAKE_WORD_DETECTED':
        return { label: "Listening...", color: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300", dot: "bg-cyan-400 animate-ping" };
      case 'LISTENING_FOR_COMMAND':
        return { label: "Listening...", color: "bg-rose-500/15 border-rose-500/30 text-rose-300 animate-pulse", dot: "bg-rose-400 animate-ping" };
      case 'PROCESSING_COMMAND':
        return { label: "Processing...", color: "bg-purple-500/15 border-purple-500/30 text-purple-300 animate-pulse", dot: "bg-purple-400" };
      case 'EXECUTING_TOOL':
        return { label: telemetry.activeTool ? `Executing: ${telemetry.activeTool}` : "Executing...", color: "bg-amber-500/15 border-amber-500/30 text-amber-300 animate-pulse", dot: "bg-amber-400 animate-bounce" };
      case 'SPEAKING_RESPONSE':
        return { label: "Jarvis Speaking", color: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300", dot: "bg-cyan-400 animate-pulse" };
      case 'ERROR':
        return { label: "Connection Error", color: "bg-red-500/15 border-red-500/30 text-red-300", dot: "bg-red-400" };
      default:
        return { label: "Ready", color: "bg-white/5 border-white/10 text-white/70", dot: "bg-white/40" };
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
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] md:text-[10px] font-mono uppercase tracking-[0.2em] font-bold ${badge.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
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
                  {telemetry.geminiStatus.toUpperCase()}
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
                <span className="font-bold text-cyan-300">{telemetry.activeListenerCount} registered</span>
              </div>
              <div>
                <span className="text-white/40 block uppercase tracking-wider">ACTIVE TIMERS</span>
                <span className="font-bold text-purple-300">{telemetry.activeTimers?.join(', ') || 'None'}</span>
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
            CENTER STAGE: Pure SiriWave Canvas OR Dynamic SPOT UI
            ======================================================== */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full my-4 relative">
          
          {/* CASE 1: SPOT UI ACTIVE (The wave moves aside / docks into top pill) */}
          {spotType && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center justify-center relative z-20 flex-1"
            >
              {/* Top Docked Wave Pill */}
              <motion.div 
                layout
                className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-2xl shadow-lg mb-3 shrink-0"
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <SiriWave 
                    variant={currentShaderVariant}
                    size={50}
                    renderScale={0.7}
                    className="pointer-events-none"
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
              </motion.div>
            </motion.div>
          )}

          {/* CASE 2: DEFAULT AMBIENT STAGE (No spot content -> Wave in center) */}
          {!spotType && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center w-full"
            >
              {/* Apple-style Fluid SiriWave */}
              <div className="relative flex items-center justify-center mb-6">
                <SiriWave 
                  variant={currentShaderVariant}
                  size={typeof window !== 'undefined' && window.innerWidth < 640 ? 280 : 360}
                  renderScale={0.85}
                  className="pointer-events-none z-10"
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
                  ) : messages.length > 0 && (voiceState === 'SPEAKING_RESPONSE' || voiceState === 'WAKE_WORD_LISTENING') ? (
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
                        {voiceState === 'LISTENING_FOR_COMMAND' ? "I'm listening — speak your command..." : "Say 'JARVIS' or press microphone to speak"}
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
                if (voiceState === 'LISTENING_FOR_COMMAND') {
                  jarvisVoiceEngine.commitCommand();
                } else {
                  await jarvisVoiceEngine.warmupMicrophone();
                  jarvisVoiceEngine.startCommandListening();
                }
              }}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer relative ${
                voiceState === 'LISTENING_FOR_COMMAND'
                  ? 'bg-rose-500 text-white shadow-[0_0_30px_rgba(244,63,94,0.8)] animate-pulse' 
                  : 'bg-white text-black hover:bg-zinc-200 shadow-md'
              }`}
              title={voiceState === 'LISTENING_FOR_COMMAND' ? "Click to finalize spoken directive" : "Speak directive to J.A.R.V.I.S."}
            >
              {voiceState === 'LISTENING_FOR_COMMAND' ? <MicOff size={18} /> : <Mic size={18} />}
              {voiceState === 'LISTENING_FOR_COMMAND' && (
                <span className="absolute inset-0 rounded-full border-2 border-rose-400 animate-ping pointer-events-none" />
              )}
            </motion.button>

            {/* Cancel Button if listening/processing */}
            {(voiceState === 'LISTENING_FOR_COMMAND' || voiceState === 'PROCESSING_COMMAND' || voiceState === 'SPEAKING_RESPONSE') && (
              <button
                onClick={() => jarvisVoiceEngine.cancelCurrentAction()}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 border border-white/15 flex items-center justify-center transition-all cursor-pointer shrink-0"
                title="Cancel Voice Action (Esc)"
              >
                <X size={12} />
              </button>
            )}

            {/* Retry Button if Error */}
            {voiceState === 'ERROR' && (
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
              placeholder={voiceState === 'LISTENING_FOR_COMMAND' ? (telemetry?.interimTranscript || telemetry?.transcript || "Listening to your voice...") : "Type command or message to J.A.R.V.I.S..."}
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
              { label: "search video lofi beats", icon: <Youtube size={10} className="text-red-400" /> },
              { label: "search stock TSLA", icon: <TrendingUp size={10} className="text-emerald-400" /> },
              { label: "search stock BTC", icon: <TrendingUp size={10} className="text-amber-400" /> },
              { label: "what are my tasks?", icon: <CheckSquare size={10} className="text-cyan-400" /> },
              { label: "start 25m timer", icon: <Clock size={10} className="text-blue-400" /> },
              { label: "play 432 hz", icon: <Music size={10} className="text-purple-400" /> },
              { label: "open the place", icon: <Play size={10} className="text-rose-400" /> },
              { label: "give me a pep talk", icon: <Zap size={10} className="text-yellow-400" /> }
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
      </motion.div>
    </AnimatePresence>
  );
}
