"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Radio, Mic, MicOff, Volume2, VolumeX, X, 
  Sparkles, RefreshCw, Square, MessageSquare, 
  Bug, ChevronDown, Check, AlertTriangle, ShieldCheck, 
  Cpu, Layers, Zap, Info, Play
} from 'lucide-react';
import { VoiceBeam } from 'voice-glow';
import { useJarvisStore } from '../../hooks/useJarvisStore';
import { jarvisLiveEngine, LivePhase } from '../../lib/jarvisLiveEngine';
import { jarvisLiveAudioPipeline } from '../../lib/jarvisLiveAudioPipeline';
import { 
  LIVE_MODELS_MAP, 
  getSelectedLiveModel, 
  setSelectedLiveModel, 
  getLiveModelCapabilities 
} from '../../lib/aiModelConfig';

export default function JarvisLiveOverlay() {
  const {
    isLiveOverlayOpen,
    livePhase,
    liveTelemetry,
    stopLiveMode,
    startLiveMode,
    toggleLiveMute,
    interruptLive
  } = useJarvisStore();

  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const selectedModelId = liveTelemetry.selectedModel || getSelectedLiveModel();
  const capabilities = useMemo(() => getLiveModelCapabilities(selectedModelId), [selectedModelId]);

  // Determine sound-reactive processing / thinking flag for VoiceBeam
  const isProcessing = livePhase === 'LIVE_PROCESSING' || livePhase === 'CONNECTING_LIVE';
  const isSpeaking = livePhase === 'LIVE_SPEAKING';
  const isInterrupted = livePhase === 'LIVE_INTERRUPTED';
  const isListening = livePhase === 'LIVE_LISTENING' || livePhase === 'LIVE_READY';

  // Get active microphone stream for VoiceBeam
  const liveStream = jarvisLiveAudioPipeline.getMediaStream();

  // Escape key handler to exit Live mode
  useEffect(() => {
    if (!isLiveOverlayOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        stopLiveMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLiveOverlayOpen, stopLiveMode]);

  if (!isLiveOverlayOpen) return null;

  // Status Badge and Header Text
  const renderStatus = () => {
    switch (livePhase) {
      case 'CONNECTING_LIVE':
        return {
          badge: 'Connecting to Live…',
          dot: 'bg-amber-400 animate-pulse',
          border: 'border-amber-500/40 text-amber-300 bg-amber-500/15',
          subtitle: 'Establishing secure bidirectional session with Gemini...'
        };
      case 'REQUESTING_MICROPHONE':
        return {
          badge: 'Requesting Mic…',
          dot: 'bg-amber-400 animate-pulse',
          border: 'border-amber-500/40 text-amber-300 bg-amber-500/15',
          subtitle: 'Initializing 16kHz low-latency audio capture stream...'
        };
      case 'LIVE_READY':
      case 'LIVE_LISTENING':
        return {
          badge: 'Live • Listening',
          dot: 'bg-emerald-400 animate-ping',
          border: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/15',
          subtitle: 'Speak naturally — Jarvis is listening continuously'
        };
      case 'LIVE_PROCESSING':
        return {
          badge: liveTelemetry.activeTool ? `Executing: ${liveTelemetry.activeTool}` : 'Live • Thinking',
          dot: 'bg-purple-400 animate-pulse',
          border: 'border-purple-500/40 text-purple-300 bg-purple-500/15',
          subtitle: liveTelemetry.activeTool ? 'Coordinating approved tool execution' : 'Synthesizing response turn...'
        };
      case 'LIVE_SPEAKING':
        return {
          badge: 'Live • Jarvis is speaking',
          dot: 'bg-cyan-400 animate-pulse',
          border: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/15',
          subtitle: 'Streaming native voice response (you can interrupt anytime)'
        };
      case 'LIVE_INTERRUPTED':
        return {
          badge: 'Live • Interrupted',
          dot: 'bg-amber-400',
          border: 'border-amber-500/40 text-amber-300 bg-amber-500/15',
          subtitle: 'Immediate playback cutoff — capturing new speech turn'
        };
      case 'LIVE_RECONNECTING':
        return {
          badge: `Reconnecting (${liveTelemetry.reconnectCount})…`,
          dot: 'bg-amber-400 animate-bounce',
          border: 'border-amber-500/40 text-amber-300 bg-amber-500/15',
          subtitle: 'Resuming conversation context with Gemini Live...'
        };
      case 'LIVE_ERROR':
        return {
          badge: 'Live Session Error',
          dot: 'bg-rose-400',
          border: 'border-rose-500/40 text-rose-300 bg-rose-500/15',
          subtitle: liveTelemetry.lastError || 'Live link disconnected'
        };
      case 'EXITING_LIVE':
        return {
          badge: 'Live mode off',
          dot: 'bg-white/40',
          border: 'border-white/10 text-white/60 bg-white/5',
          subtitle: 'Releasing audio pipeline and returning to standby'
        };
      default:
        return {
          badge: 'Start Live',
          dot: 'bg-white/40',
          border: 'border-white/10 text-white/60 bg-white/5',
          subtitle: 'Ready to connect'
        };
    }
  };

  const status = renderStatus();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed inset-0 z-[600] bg-black/75 backdrop-blur-3xl backdrop-saturate-150 flex flex-col justify-between p-6 md:p-10 select-none overflow-hidden"
        style={{
          WebkitBackdropFilter: 'blur(36px) saturate(180%)',
          backdropFilter: 'blur(36px) saturate(180%)'
        }}
      >
        {/* TOP STATUS BAR */}
        <div className="w-full flex items-center justify-between pb-4 border-b border-white/10 max-w-6xl mx-auto relative z-20">
          {/* Logo & Live Mode Indicator */}
          <div className="flex items-center gap-3">
            <h1 className="font-heading font-extrabold text-2xl md:text-3xl text-white tracking-tighter lowercase flex items-center gap-2">
              jarvis<span className="text-cyan-400">.</span>
              <span className="px-2 py-0.5 rounded-md bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/40 text-[10px] font-mono tracking-widest text-cyan-300 uppercase font-bold">
                LIVE
              </span>
            </h1>

            {/* Dynamic Status Pill */}
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[10px] font-mono uppercase tracking-widest font-bold ${status.border}`}>
              <span className={`w-2 h-2 rounded-full ${status.dot}`} />
              <span>{status.badge}</span>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center gap-2.5">
            {/* Model Selector Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowModelPicker(!showModelPicker)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/15 hover:border-white/30 text-white text-xs font-mono transition-all cursor-pointer shadow-sm"
                title="Select Live Model"
              >
                <Cpu size={13} className="text-cyan-400" />
                <span className="font-medium truncate max-w-[140px] sm:max-w-[200px]">
                  {capabilities.name}
                </span>
                <ChevronDown size={13} className="text-white/40" />
              </button>

              {/* Model Dropdown Menu */}
              <AnimatePresence>
                {showModelPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-black/95 border border-white/20 backdrop-blur-3xl shadow-2xl p-3 z-50 flex flex-col gap-2 max-h-[70vh] overflow-y-auto no-scrollbar"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-white/10 px-1">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-white/50 font-bold">
                        Live Voice Models
                      </span>
                      <span className="text-[9px] font-mono text-cyan-400">Capability-Aware</span>
                    </div>

                    {Object.values(LIVE_MODELS_MAP).map((m) => {
                      const isSelected = m.id === selectedModelId;
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            setSelectedLiveModel(m.id);
                            setShowModelPicker(false);
                            // Re-start Live session with new model if active
                            if (livePhase !== 'IDLE' && livePhase !== 'EXITING_LIVE') {
                              startLiveMode(m.id);
                            }
                          }}
                          className={`w-full p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                              : 'bg-white/5 border-white/10 hover:border-white/20 text-white/80 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold font-mono tracking-tight text-white flex items-center gap-1.5">
                              {m.name}
                              {m.isRecommendedDefault && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[8px] font-bold uppercase">
                                  Default
                                </span>
                              )}
                            </span>
                            {isSelected && <Check size={14} className="text-cyan-400 shrink-0" />}
                          </div>

                          <p className="text-[10px] text-white/50 leading-relaxed font-sans">
                            {m.description}
                          </p>

                          {/* Capabilities Badges */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span className="px-2 py-0.5 rounded-full bg-white/10 text-[8px] font-mono text-white/70 uppercase">
                              In: {m.inputModalities.join('/')}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-white/10 text-[8px] font-mono text-white/70 uppercase">
                              Out: {m.outputModalities.join('/')}
                            </span>
                            {m.supportsTools && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[8px] font-mono uppercase">
                                Tools
                              </span>
                            )}
                            {m.supportsTranslation && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[8px] font-mono uppercase">
                                Translate
                              </span>
                            )}
                            {m.supportsTranscription && (
                              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[8px] font-mono uppercase">
                                Transcribe
                              </span>
                            )}
                            {m.supportsThinking && (
                              <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[8px] font-mono uppercase">
                                Thinking
                              </span>
                            )}
                            <span className="ml-auto text-[8px] font-mono text-white/40">
                              {m.latencyCategory}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Debug Telemetry Toggle */}
            <button
              onClick={() => setShowDebug(!showDebug)}
              className={`p-2 rounded-full border transition-all text-[10px] font-mono uppercase font-bold flex items-center gap-1.5 ${
                showDebug
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
              }`}
              title="Toggle Live Debug Monitor"
            >
              <Bug size={14} />
              <span className="hidden sm:inline text-[9px]">Debug</span>
            </button>

            {/* Transcript Toggle */}
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className={`p-2 rounded-full border transition-all ${
                showTranscript
                  ? 'bg-white text-black border-white'
                  : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
              }`}
              title="View Live Transcript"
            >
              <MessageSquare size={14} />
            </button>

            {/* Mute Mic Control */}
            <button
              onClick={toggleLiveMute}
              className={`px-3 py-1.5 rounded-full border text-xs font-mono font-bold tracking-wider transition-all flex items-center gap-1.5 ${
                liveTelemetry.isMuted
                  ? 'bg-rose-500 text-white border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                  : 'bg-white/5 text-white border-white/15 hover:border-white/30'
              }`}
              title={liveTelemetry.isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {liveTelemetry.isMuted ? <MicOff size={13} /> : <Mic size={13} />}
              <span className="hidden sm:inline text-[10px]">{liveTelemetry.isMuted ? 'Muted' : 'Mic ON'}</span>
            </button>

            {/* Exit Live Button */}
            <button
              onClick={stopLiveMode}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 transition-all text-xs font-mono uppercase tracking-wider cursor-pointer"
              title="Exit Live Mode (Esc)"
            >
              <X size={14} />
              <span className="hidden sm:inline text-[10px]">Exit Live</span>
            </button>
          </div>
        </div>

        {/* DEVELOPER DEBUG TELEMETRY PANEL */}
        <AnimatePresence>
          {showDebug && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="w-full max-w-6xl mx-auto my-2 p-4 rounded-2xl bg-black/90 border border-cyan-500/30 backdrop-blur-2xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-[10px] font-mono text-white/70 shadow-2xl relative z-30"
            >
              <div>
                <span className="text-white/40 block uppercase tracking-wider">LIVE STATE</span>
                <span className="font-bold text-cyan-300">{liveTelemetry.phase}</span>
              </div>
              <div>
                <span className="text-white/40 block uppercase tracking-wider">SESSION ID</span>
                <span className="font-bold text-white truncate block">{liveTelemetry.sessionId || 'None'}</span>
              </div>
              <div>
                <span className="text-white/40 block uppercase tracking-wider">MODEL</span>
                <span className="font-bold text-amber-300 truncate block">{liveTelemetry.selectedModel}</span>
              </div>
              <div>
                <span className="text-white/40 block uppercase tracking-wider">WS CONNECTION</span>
                <span className={`font-bold ${liveTelemetry.wsState === 'OPEN' ? 'text-emerald-300' : 'text-amber-400'}`}>
                  {liveTelemetry.wsState}
                </span>
              </div>
              <div>
                <span className="text-white/40 block uppercase tracking-wider">AUDIO I/O RATES</span>
                <span className="font-bold text-white">
                  In: {liveTelemetry.inputSampleRate}Hz • Out: {liveTelemetry.outputSampleRate}Hz
                </span>
              </div>
              <div>
                <span className="text-white/40 block uppercase tracking-wider">STREAMED CHUNKS</span>
                <span className="font-bold text-white">
                  ↑ {liveTelemetry.inputChunkCount} • ↓ {liveTelemetry.outputChunkCount}
                </span>
              </div>
              <div>
                <span className="text-white/40 block uppercase tracking-wider">BARGE-IN COUNT</span>
                <span className="font-bold text-cyan-300">{liveTelemetry.bargeInCount} interruptions</span>
              </div>
              <div>
                <span className="text-white/40 block uppercase tracking-wider">RECONNECTS</span>
                <span className="font-bold text-purple-300">{liveTelemetry.reconnectCount}</span>
              </div>
              <div>
                <span className="text-white/40 block uppercase tracking-wider">LAST SERVER EVENT</span>
                <span className="font-bold text-white/80">{liveTelemetry.lastServerEventType || 'None'}</span>
              </div>
              <div>
                <span className="text-white/40 block uppercase tracking-wider">ACTIVE TOOL</span>
                <span className="font-bold text-amber-300">{liveTelemetry.activeTool || 'None'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-white/40 block uppercase tracking-wider">LAST ERROR</span>
                <span className="font-bold text-rose-400 truncate block">{liveTelemetry.lastError || 'None'}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CENTER STAGE: SOUND-REACTIVE VOICE GLOW CONSOLE */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full my-4 relative">
          
          {/* Main VoiceBeam Host Element */}
          <div className="w-full max-w-md flex flex-col items-center justify-center relative">
            <VoiceBeam
              stream={liveStream}
              processing={isProcessing}
              colorVariant="colorful"
              type="default"
              reach={1.4}
              spread={1.1}
              flow={52}
              bend={65}
              idle={0.25}
              strength={1.0}
              className="w-full"
            >
              <div className="w-full p-8 md:p-10 rounded-3xl bg-black/70 border border-white/15 backdrop-blur-2xl flex flex-col items-center text-center shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden group">
                
                {/* Central Status Icon */}
                <div className="relative mb-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                    isSpeaking 
                      ? 'bg-cyan-400 text-black shadow-[0_0_35px_rgba(6,182,212,0.8)] scale-110' 
                      : isProcessing
                      ? 'bg-purple-500 text-white shadow-[0_0_30px_rgba(168,85,247,0.7)] animate-pulse'
                      : isListening
                      ? 'bg-emerald-400 text-black shadow-[0_0_25px_rgba(52,211,153,0.6)]'
                      : 'bg-white/10 text-white/60'
                  }`}>
                    {isSpeaking ? (
                      <Volume2 size={28} className="animate-pulse" />
                    ) : isProcessing ? (
                      <Sparkles size={28} className="animate-spin" />
                    ) : (
                      <Mic size={28} />
                    )}
                  </div>
                </div>

                {/* Main Heading Text */}
                <h2 className="text-xl md:text-2xl font-bold font-heading text-white tracking-tight lowercase mb-1">
                  {isSpeaking ? 'Jarvis Speaking' : isProcessing ? 'Processing' : 'Continuous Live'}
                </h2>

                <p className="text-xs md:text-sm font-mono text-white/50 max-w-xs leading-relaxed">
                  {status.subtitle}
                </p>

                {/* Stop Speaking / Barge-in Button */}
                {isSpeaking && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    onClick={interruptLive}
                    className="mt-5 px-4 py-2 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 hover:border-rose-500 flex items-center gap-2 text-xs font-mono uppercase tracking-wider transition-all cursor-pointer shadow-md"
                  >
                    <Square size={12} className="fill-current" />
                    <span>Stop Speaking</span>
                  </motion.button>
                )}

                {/* Error Retry Button */}
                {livePhase === 'LIVE_ERROR' && (
                  <button
                    onClick={() => startLiveMode(selectedModelId)}
                    className="mt-4 px-4 py-2 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-2 text-xs font-mono uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    <span>Retry Live Connection</span>
                  </button>
                )}
              </div>
            </VoiceBeam>
          </div>

          {/* Transcript Drawer Overlay */}
          <AnimatePresence>
            {showTranscript && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute inset-x-0 bottom-0 top-0 bg-black/95 border border-white/15 rounded-3xl p-6 backdrop-blur-3xl overflow-y-auto flex flex-col z-30 shadow-2xl no-scrollbar"
              >
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                  <span className="font-mono text-xs uppercase tracking-widest text-white font-bold flex items-center gap-2">
                    <MessageSquare size={14} className="text-cyan-400" />
                    Live Conversation Transcript
                  </span>
                  <button
                    onClick={() => setShowTranscript(false)}
                    className="p-1 rounded-lg text-white/50 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto font-mono text-xs text-white/80 space-y-3 pr-2">
                  {liveTelemetry.transcript ? (
                    <p className="leading-relaxed whitespace-pre-wrap">{liveTelemetry.transcript}</p>
                  ) : (
                    <p className="text-white/40 italic">Awaiting speech conversation...</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* BOTTOM QUICK FOOTER */}
        <div className="w-full max-w-3xl mx-auto flex items-center justify-between text-[11px] font-mono text-white/40 pt-3 border-t border-white/10">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-white/60">
              <ShieldCheck size={13} className="text-emerald-400" />
              Ephemeral Token Secure
            </span>
            <span>•</span>
            <span>{capabilities.latencyCategory}</span>
          </div>

          <div className="flex items-center gap-2 text-white/50">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white text-[10px]">Esc</kbd> to exit Live mode</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
