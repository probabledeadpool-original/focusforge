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
  Youtube, ExternalLink
} from 'lucide-react';
import { useJarvisStore, JarvisAiState } from '../../hooks/useJarvisStore';
import { useJarvisHotword } from '../../hooks/useJarvisHotword';
import { useAppStore } from '../../hooks/useAppStore';
import { useFrequencyStore } from '../../hooks/useFrequencyStore';
import { jarvisAudio } from '../../lib/jarvisAudio';
import { jarvisVoiceEngine, VoiceState } from '../../lib/jarvisVoiceEngine';
import { SiriWave, SiriWaveVariant } from '@/components/ui/siri-wave';

import { handleGlobalJarvisCommand } from '../../lib/jarvisCommandDispatcher';
import { getSelectedTextModel, getSelectedLiveModel } from '../../lib/aiModelConfig';

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
        return { label: "Standby", color: "bg-white/5 border-white/10 text-white/60", dot: "bg-white/40" };
      case 'REQUESTING_MICROPHONE':
        return { label: "Requesting Mic...", color: "bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse", dot: "bg-amber-400" };
      case 'WAKE_WORD_LISTENING':
        return { label: "Say 'JARVIS'", color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300", dot: "bg-emerald-400" };
      case 'WAKE_WORD_DETECTED':
        return { label: "Wake Word Detected", color: "bg-cyan-500/20 border-cyan-500/40 text-cyan-300", dot: "bg-cyan-400 animate-ping" };
      case 'LISTENING_FOR_COMMAND':
        return { label: "Listening for Command...", color: "bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse", dot: "bg-rose-400 animate-ping" };
      case 'PROCESSING_COMMAND':
        return { label: "Processing Directive...", color: "bg-purple-500/20 border-purple-500/40 text-purple-300 animate-pulse", dot: "bg-purple-400" };
      case 'EXECUTING_TOOL':
        return { label: telemetry.activeTool ? `Executing: ${telemetry.activeTool}` : "Executing Tool...", color: "bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse", dot: "bg-amber-400 animate-bounce" };
      case 'SPEAKING_RESPONSE':
        return { label: "Jarvis is Speaking...", color: "bg-cyan-500/20 border-cyan-500/40 text-cyan-300", dot: "bg-cyan-400 animate-pulse" };
      case 'ERROR':
        return { label: "Microphone / Link Error", color: "bg-red-500/20 border-red-500/40 text-red-300", dot: "bg-red-400" };
      default:
        return { label: "Standby", color: "bg-white/5 border-white/10 text-white/60", dot: "bg-white/40" };
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
        className="fixed inset-0 z-[500] bg-black/50 backdrop-blur-2xl backdrop-saturate-150 flex flex-col justify-between p-6 md:p-10 select-none overflow-hidden"
        style={{
          WebkitBackdropFilter: 'blur(30px) saturate(160%)',
          backdropFilter: 'blur(30px) saturate(160%)'
        }}
      >
        {/* TOP BAR */}
        <div className="w-full flex items-center justify-between pb-4 border-b border-white/10 max-w-6xl mx-auto relative z-20">
          {/* Logo & Status */}
          <div className="flex items-center gap-3">
            <h1 className="font-heading font-extrabold text-2xl md:text-3xl text-white tracking-tighter lowercase">
              jarvis<span className="text-cyan-400">.</span>
            </h1>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] md:text-[10px] font-mono uppercase tracking-[0.25em] font-bold ${badge.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
              <span>{badge.label}</span>
            </div>
          </div>

          {/* Action Pills */}
          <div className="flex items-center gap-2">
            {/* Enter Live Mode Button */}
            <button
              onClick={() => startLiveMode()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 hover:border-cyan-400 text-[10px] font-mono uppercase font-bold tracking-wider transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer"
              title="Start Live Voice Conversation (Shift+L)"
            >
              <Radio size={12} className="text-cyan-400 animate-pulse" />
              <span>Start Live</span>
              <span className="hidden md:inline px-1 py-0.2 rounded bg-cyan-400/20 text-[8px] text-cyan-200">⇧L</span>
            </button>

            <button
              onClick={() => setShowDebug(!showDebug)}
              className={`p-2 rounded-full border transition-all text-[10px] font-mono uppercase font-bold flex items-center gap-1.5 ${
                showDebug ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
              }`}
              title="Toggle Dev Telemetry Monitor"
            >
              <Bug size={14} />
              <span className="hidden sm:inline text-[9px]">Debug</span>
            </button>

            <button
              onClick={() => setVoiceFeedbackEnabled(!voiceFeedbackEnabled)}
              className={`px-3.5 py-1.5 rounded-full border text-[10px] font-mono uppercase font-bold tracking-widest transition-all flex items-center gap-2 ${
                voiceFeedbackEnabled 
                  ? 'bg-white text-black border-white' 
                  : 'bg-white/5 text-white/50 border-white/10 hover:border-white/30'
              }`}
              title="Toggle Spoken Responses (TTS)"
            >
              {voiceFeedbackEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
              <span>{voiceFeedbackEnabled ? 'Voice ON' : 'Muted'}</span>
            </button>

            <button
              onClick={() => setIsHotwordEnabled(!isHotwordEnabled)}
              className={`hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[10px] font-mono uppercase font-bold tracking-widest transition-all ${
                isHotwordEnabled 
                  ? 'bg-white/10 text-white border-white/30' 
                  : 'bg-white/5 text-white/40 border-white/10'
              }`}
              title="Toggle Wake-Word ('JARVIS')"
            >
              <Radio size={12} className={isHotwordEnabled ? 'text-emerald-400' : 'text-white/30'} />
              <span>Wake: {isHotwordEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2 rounded-full border transition-all ${
                showHistory ? 'bg-white text-black border-white' : 'bg-white/5 text-white/50 border-white/10 hover:text-white hover:border-white/30'
              }`}
              title="Conversation Telemetry"
            >
              <MessageSquare size={14} />
            </button>

            {/* Switch to Expanded Island Mode */}
            <button
              onClick={() => setDisplayMode('expanded')}
              className="p-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-all cursor-pointer"
              title="Switch to Island Window Mode"
            >
              <SlidersHorizontal size={14} />
            </button>

            {/* Switch to Minimized Capsule Mode */}
            <button
              onClick={() => setDisplayMode('minimized')}
              className="p-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-all cursor-pointer"
              title="Minimize to Dynamic Island Capsule"
            >
              <Minimize2 size={14} />
            </button>

            <button
              onClick={closeJarvis}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-all text-[10px] font-mono uppercase tracking-wider cursor-pointer"
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
              className="w-full max-w-6xl mx-auto my-2 p-4 rounded-2xl bg-black/90 border border-cyan-500/30 backdrop-blur-2xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-[10px] font-mono text-white/70 shadow-2xl relative z-30"
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

        {/* CENTER STAGE: Pure SiriWave Canvas & Live Subtitle Stream */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full my-4 relative">
          
          {/* Transparent WebGL Shader Canvas */}
          <div className="relative flex items-center justify-center mb-6">
            <SiriWave 
              variant={currentShaderVariant}
              size={typeof window !== 'undefined' && window.innerWidth < 640 ? 280 : 380}
              renderScale={0.8}
              className="pointer-events-none"
            />
          </div>

          {/* Dynamic Typography / Live Transcript */}
          <div className="w-full max-w-3xl text-center min-h-[80px] flex items-center justify-center px-6">
            <AnimatePresence mode="wait">
              {(telemetry?.interimTranscript || telemetry?.transcript) ? (
                <motion.div
                  key="live-transcript"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="font-mono text-xl md:text-3xl text-white font-extrabold tracking-tight"
                >
                  “{telemetry?.interimTranscript || telemetry?.transcript}”
                </motion.div>
              ) : messages.length > 0 && (voiceState === 'SPEAKING_RESPONSE' || voiceState === 'WAKE_WORD_LISTENING') ? (
                <motion.div
                  key={messages[messages.length - 1].id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="font-heading font-medium text-lg md:text-2xl text-white/90 leading-relaxed max-w-2xl lowercase tracking-tight"
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
                  <span className="text-xs md:text-sm font-mono text-white/40 uppercase tracking-[0.25em]">
                    {voiceState === 'LISTENING_FOR_COMMAND' ? "I'm listening — speak your command..." : "Say 'JARVIS' or press microphone to speak"}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400/60 uppercase tracking-widest">
                    Ready for focus timers, tasks, audio and navigation
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Active Video Search Results Grid (if latest message has mediaResults and history is closed) */}
          {!showHistory && messages.length > 0 && messages[messages.length - 1]?.mediaResults && (messages[messages.length - 1].mediaResults?.length || 0) > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-4xl mx-auto my-4 p-4 rounded-3xl bg-black/80 border border-red-500/30 backdrop-blur-2xl space-y-3 z-30 shadow-[0_0_50px_rgba(239,68,68,0.1)]"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2 px-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-red-400 uppercase tracking-wider">
                  <Youtube size={16} />
                  <span>Found Videos • Click to Stream in The Place</span>
                </div>
                <span className="text-[10px] font-mono text-white/40">
                  {messages[messages.length - 1].mediaResults?.length} results
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[40vh] overflow-y-auto no-scrollbar pr-1">
                {messages[messages.length - 1].mediaResults?.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleWatchVideoInThePlace(item)}
                    className="group bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 hover:border-red-500/50 rounded-2xl p-3 cursor-pointer transition-all duration-300 flex flex-col justify-between space-y-2 hover:scale-[1.02] shadow-lg"
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                      <img 
                        src={item.thumbnail} 
                        alt={item.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-90 group-hover:brightness-100"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                          <Play size={16} fill="white" className="ml-0.5" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[8px] font-mono uppercase text-red-400 font-bold block truncate">
                        {item.channelTitle}
                      </span>
                      <h5 className="font-mono text-xs font-bold text-white line-clamp-2 leading-tight">
                        {item.title}
                      </h5>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWatchVideoInThePlace(item);
                      }}
                      className="w-full py-1.5 px-3 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/30 text-[9px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Play size={10} fill="currentColor" /> Watch in The Place
                    </button>
                  </div>
                ))}
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
                className="absolute inset-x-0 bottom-0 top-0 bg-black/90 border border-white/10 rounded-3xl p-6 backdrop-blur-3xl overflow-y-auto flex flex-col z-30 shadow-2xl no-scrollbar"
              >
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                  <div className="flex items-center gap-2">
                    <Terminal size={16} className="text-cyan-400" />
                    <span className="font-mono text-xs uppercase tracking-widest text-white font-bold">Neural Command History</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={clearMessages}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-[9px] font-mono uppercase tracking-wider transition-all"
                    >
                      Clear Log
                    </button>
                    <button
                      onClick={() => setShowHistory(false)}
                      className="p-1 rounded-lg text-white/50 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto pr-2">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-2xl border text-xs font-mono ${
                        m.role === 'user' 
                          ? 'bg-white/5 border-white/10 text-white ml-auto max-w-[80%]' 
                          : 'bg-black/60 border-cyan-500/20 text-cyan-100 mr-auto max-w-[85%]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[8px] text-white/30 uppercase tracking-widest mb-1 font-bold">
                        <span>{m.role === 'user' ? 'Direct Vocal Input' : 'J.A.R.V.I.S. Response'}</span>
                        <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                      <p className="leading-relaxed">{m.text}</p>
                      {m.actionSummary && (
                        <div className="mt-2 pt-1 border-t border-white/10 flex items-center gap-1.5 text-[9px] text-emerald-400 font-bold uppercase tracking-wider">
                          <CheckCircle2 size={10} />
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
                                className="flex gap-2.5 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-500/40 cursor-pointer transition-all items-center group/card"
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
        <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-3 relative z-20">
          {/* Main Input Row */}
          <div className="w-full flex items-center gap-2 bg-black/60 border border-white/15 focus-within:border-cyan-400/50 p-2 pl-3 rounded-full backdrop-blur-2xl transition-all shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
            
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
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                voiceState === 'LISTENING_FOR_COMMAND'
                  ? 'bg-rose-500 text-white shadow-[0_0_25px_rgba(244,63,94,0.6)] animate-pulse' 
                  : 'bg-white text-black hover:bg-zinc-200 shadow-md'
              }`}
              title={voiceState === 'LISTENING_FOR_COMMAND' ? "Click to finalize spoken directive" : "Speak directive to J.A.R.V.I.S."}
            >
              {voiceState === 'LISTENING_FOR_COMMAND' ? <MicOff size={18} /> : <Mic size={18} />}
            </motion.button>

            {/* Cancel Button if listening/processing */}
            {(voiceState === 'LISTENING_FOR_COMMAND' || voiceState === 'PROCESSING_COMMAND' || voiceState === 'SPEAKING_RESPONSE') && (
              <button
                onClick={() => jarvisVoiceEngine.cancelCurrentAction()}
                className="w-8 h-8 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center transition-all cursor-pointer shrink-0"
                title="Cancel Voice Action (Esc)"
              >
                <X size={12} />
              </button>
            )}

            {/* Retry Button if Error */}
            {voiceState === 'ERROR' && (
              <button
                onClick={() => jarvisVoiceEngine.startCommandListening()}
                className="w-8 h-8 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center transition-all cursor-pointer shrink-0"
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

          {/* Quick Command Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full py-1">
            {[
              "start 25m timer",
              "add task: review project roadmap",
              "what are my tasks?",
              "go to analytics",
              "play 432 hz",
              "open the place",
              "give me a pep talk"
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleUserMessage(chip)}
                className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 text-[10px] font-mono text-white/60 hover:text-white transition-all whitespace-nowrap backdrop-blur-md cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
