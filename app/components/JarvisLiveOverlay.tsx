"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Radio, Mic, MicOff, Square, RefreshCw, X, Key, ChevronRight,
  Sliders, Sparkles, Check, Sun, Zap, Brain, Languages, FileAudio, Bot
} from 'lucide-react';
import { VoiceBeam } from 'voice-glow';
import { useJarvisStore } from '../../hooks/useJarvisStore';
import { jarvisLiveEngine } from '../../lib/jarvisLiveEngine';
import { jarvisLiveAudioPipeline } from '../../lib/jarvisLiveAudioPipeline';
import { 
  getSelectedLiveModel, 
  setSelectedLiveModel, 
  getLiveModelCapabilities, 
  LIVE_MODELS_MAP 
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

  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showTuningPopover, setShowTuningPopover] = useState(false);
  const [tuningTab, setTuningTab] = useState<'models' | 'glow'>('models');
  
  // Glow Intensity with persistence (default 0.85)
  const [glowIntensity, setGlowIntensity] = useState<number>(0.85);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jarvis-live-glow-intensity');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 0.1 && val <= 1.5) {
          setGlowIntensity(val);
        }
      }
    }
  }, []);

  const handleSetGlowIntensity = (val: number) => {
    const clamped = Math.max(0.1, Math.min(1.3, val));
    setGlowIntensity(clamped);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jarvis-live-glow-intensity', clamped.toString());
      window.dispatchEvent(new CustomEvent('jarvis-live-glow-intensity-changed', { detail: { intensity: clamped } }));
    }
  };

  const selectedModelId = liveTelemetry.selectedModel || getSelectedLiveModel();
  const capabilities = useMemo(() => getLiveModelCapabilities(selectedModelId), [selectedModelId]);

  // Sound-reactive & state flags
  const isProcessing = livePhase === 'LIVE_PROCESSING' || livePhase === 'CONNECTING_LIVE';
  const isSpeaking = livePhase === 'LIVE_SPEAKING';
  const isLiveActive = isLiveOverlayOpen && livePhase !== 'IDLE' && livePhase !== 'EXITING_LIVE';

  // Get active microphone stream for VoiceBeam
  const liveStream = jarvisLiveAudioPipeline.getMediaStream();

  // Escape key handler to exit Live mode
  useEffect(() => {
    if (!isLiveActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        stopLiveMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLiveActive, stopLiveMode]);

  const handleSaveApiKey = () => {
    if (!apiKeyInput.trim()) return;
    localStorage.setItem('gemini-api-key', apiKeyInput.trim());
    setShowApiKeyPrompt(false);
    startLiveMode(selectedModelId);
  };

  const handleSwitchModel = (modelId: string) => {
    setSelectedLiveModel(modelId);
    startLiveMode(modelId);
  };

  if (!isLiveActive) return null;

  // Status Badge and Indicator
  const getStatusInfo = () => {
    switch (livePhase) {
      case 'CONNECTING_LIVE':
      case 'REQUESTING_MICROPHONE':
        return {
          label: 'Connecting...',
          dotClass: 'bg-amber-400 animate-pulse',
          borderClass: 'border-amber-500/30 text-amber-300'
        };
      case 'LIVE_READY':
      case 'LIVE_LISTENING':
        return {
          label: 'Live • Listening',
          dotClass: 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-ping',
          borderClass: 'border-emerald-500/30 text-emerald-300'
        };
      case 'LIVE_PROCESSING':
        return {
          label: liveTelemetry.activeTool ? `Tool: ${liveTelemetry.activeTool}` : 'Thinking...',
          dotClass: 'bg-purple-400 shadow-[0_0_8px_#c084fc] animate-pulse',
          borderClass: 'border-purple-500/30 text-purple-300'
        };
      case 'LIVE_SPEAKING':
        return {
          label: 'Jarvis Speaking...',
          dotClass: 'bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse',
          borderClass: 'border-cyan-500/30 text-cyan-300'
        };
      case 'LIVE_INTERRUPTED':
        return {
          label: 'Interrupted',
          dotClass: 'bg-amber-400',
          borderClass: 'border-amber-500/30 text-amber-300'
        };
      case 'LIVE_RECONNECTING':
        return {
          label: 'Reconnecting...',
          dotClass: 'bg-amber-400 animate-bounce',
          borderClass: 'border-amber-500/30 text-amber-300'
        };
      case 'LIVE_ERROR':
        return {
          label: liveTelemetry.lastError?.includes('API Key') ? 'API Key Required' : (liveTelemetry.lastError || 'Notice'),
          dotClass: 'bg-rose-400 shadow-[0_0_8px_#f43f5e]',
          borderClass: 'border-rose-500/30 text-rose-300'
        };
      default:
        return {
          label: 'Live',
          dotClass: 'bg-cyan-400',
          borderClass: 'border-cyan-500/30 text-cyan-300'
        };
    }
  };

  const status = getStatusInfo();

  // Model Short Display Name
  const getShortModelName = (id: string) => {
    switch(id) {
      case 'gemini-2.5-flash-native-audio-dialog': return '2.5 Flash Native';
      case 'gemini-3-flash-live': return '3 Flash Live';
      case 'gemini-3.5-live-translate': return '3.5 Translate';
      case 'gemini-3.5-transcribe-live': return '3.5 Transcribe';
      case 'gemini-3.8-live': return '3.8 Live';
      case 'gemini-3.8-live-extended-thinking': return '3.8 Thinking';
      default: return 'Live Engine';
    }
  };

  // Dynamic beam strength calculation
  const calculatedStrength = Math.min(1.0, glowIntensity);
  const calculatedGlowSize = 1.2 + glowIntensity * 0.6;
  const calculatedBloomOpacity = Math.min(0.85, 0.35 + glowIntensity * 0.45);
  const calculatedInnerOpacity = Math.min(0.7, 0.2 + glowIntensity * 0.35);
  const calculatedStrokeOpacity = Math.min(0.9, 0.45 + glowIntensity * 0.4);
  const calculatedBrightness = Math.min(1.2, 0.85 + glowIntensity * 0.2);

  // Active dialogue text to display
  const activeSpeechCaption = liveTelemetry.interimTranscript || (
    isSpeaking ? liveTelemetry.lastModelResponse : null
  );

  return (
    <>
      {/* 1. FULL-SCREEN BOTTOM-EDGE SOUND-REACTIVE VOICE BEAM WITH DYNAMIC INTENSITY TUNING */}
      <div 
        className="fixed inset-x-0 bottom-0 h-48 pointer-events-none z-[400] flex justify-center items-end select-none overflow-visible"
        style={{
          maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0) 100%)'
        }}
      >
        <VoiceBeam
          stream={liveStream}
          level={() => jarvisLiveAudioPipeline.getInputLevel()}
          processing={isProcessing}
          type="mobile"
          scale={1.2}
          reach={1.8}
          spread={1.4}
          bend={40}
          flow={35}
          glowSize={calculatedGlowSize}
          glowHeight={1.2}
          glowWidth={1.1}
          bloomScale={1.4}
          bloomHeight={1.4}
          innerScale={1.2}
          innerHeight={1.2}
          distortion={0.4}
          softness={1.4}
          brightness={calculatedBrightness}
          saturation={1.1}
          strokeOpacity={calculatedStrokeOpacity}
          innerOpacity={calculatedInnerOpacity}
          bloomOpacity={calculatedBloomOpacity}
          bandStrength={1.1}
          theme="dark"
          strength={calculatedStrength}
          colorVariant="colorful"
          className="w-full h-full pointer-events-none"
        >
          {/* Pinned bottom boundary eliminating fullscreen GPU overdraw */}
          <div className="w-full h-10 pointer-events-none bg-transparent" />
        </VoiceBeam>
      </div>

      {/* 2. REAL-TIME FLOATING DIALOGUE CAPTIONS (WHEN TALKING / ANSWERING) */}
      <AnimatePresence>
        {activeSpeechCaption && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[440] max-w-lg w-[calc(100vw-40px)] pointer-events-none flex justify-center"
          >
            <div className="px-4 py-2.5 rounded-2xl bg-[#090a0f]/90 border border-cyan-500/30 backdrop-blur-2xl shadow-[0_15px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(6,182,212,0.2)] text-center ring-1 ring-white/10">
              <div className="flex items-center justify-center gap-1.5 mb-1 text-[9px] font-mono font-bold tracking-widest uppercase text-cyan-300">
                {liveTelemetry.interimTranscript ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                    <span>Listening</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span>Jarvis</span>
                  </>
                )}
              </div>
              <p className="text-xs md:text-sm font-medium text-white/95 leading-relaxed tracking-tight">
                &ldquo;{activeSpeechCaption}&rdquo;
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. SLEEK BOTTOM-RIGHT LIVE MODE CONTROL DOCK & MODEL SELECTOR */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+4.75rem)] md:bottom-5 right-3 sm:right-5 z-[450] pointer-events-auto flex flex-col items-end gap-2 select-none">
        
        {/* Model Selection & Glow Tuning Popover */}
        <AnimatePresence>
          {showTuningPopover && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="mb-1 w-88 max-w-[calc(100vw-40px)] p-3.5 rounded-2xl bg-[#0a0b10]/95 border border-white/20 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(6,182,212,0.2)] flex flex-col gap-3 ring-1 ring-white/10"
            >
              {/* Header with Tabs */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-xl border border-white/10">
                  <button
                    onClick={() => setTuningTab('models')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider font-bold transition-all ${
                      tuningTab === 'models' 
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm' 
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Live Models
                  </button>
                  <button
                    onClick={() => setTuningTab('glow')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider font-bold transition-all flex items-center gap-1 ${
                      tuningTab === 'glow' 
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm' 
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    <Sun size={11} /> Glow Level
                  </button>
                </div>

                <button
                  onClick={() => setShowTuningPopover(false)}
                  className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Tab 1: Live Models List */}
              {tuningTab === 'models' && (
                <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-0.5 custom-scrollbar">
                  <div className="text-[9px] font-mono uppercase tracking-widest text-white/40 px-1">
                    Select Live Conversation Model
                  </div>
                  {Object.values(LIVE_MODELS_MAP).map((model) => {
                    const isSelected = selectedModelId === model.id;
                    return (
                      <button
                        key={model.id}
                        onClick={() => handleSwitchModel(model.id)}
                        className={`w-full text-left p-2.5 rounded-xl transition-all border cursor-pointer flex flex-col gap-1 relative ${
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.15)] text-white'
                            : 'bg-white/[0.03] border-white/5 hover:border-white/20 hover:bg-white/[0.06] text-white/80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {model.supportsThinking ? (
                              <Brain size={12} className="text-purple-400" />
                            ) : model.supportsTranslation ? (
                              <Languages size={12} className="text-amber-400" />
                            ) : model.id.includes('transcribe') ? (
                              <FileAudio size={12} className="text-emerald-400" />
                            ) : (
                              <Radio size={12} className="text-cyan-400" />
                            )}
                            <span className="text-[11px] font-mono font-bold tracking-tight">
                              {model.name}
                            </span>
                          </div>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-cyan-400 text-black flex items-center justify-center shrink-0">
                              <Check size={10} strokeWidth={3} />
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/60">
                            {model.latencyCategory}
                          </span>
                          {model.supportsTools && (
                            <span className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                              Tools
                            </span>
                          )}
                          {model.supportsThinking && (
                            <span className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300">
                              Reasoning
                            </span>
                          )}
                        </div>

                        <p className="text-[9px] text-white/50 line-clamp-2 leading-tight mt-0.5">
                          {model.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Tab 2: Glow Intensity Controls */}
              {tuningTab === 'glow' && (
                <div className="flex flex-col gap-3 py-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-white/70">Edge Glow Intensity:</span>
                    <span className="text-cyan-300 font-bold bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/30">
                      {Math.round(glowIntensity * 100)}%
                    </span>
                  </div>

                  {/* Interactive Slider */}
                  <div className="space-y-1">
                    <input
                      type="range"
                      min="0.2"
                      max="1.2"
                      step="0.05"
                      value={glowIntensity}
                      onChange={(e) => handleSetGlowIntensity(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 h-1.5 bg-white/10 rounded-lg cursor-pointer appearance-none"
                    />
                    <div className="flex justify-between text-[8px] font-mono text-white/40">
                      <span>Subtle (20%)</span>
                      <span>Default (85%)</span>
                      <span>Vivid (120%)</span>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {[
                      { label: 'Soft', value: 0.45, pct: '45%' },
                      { label: 'Balanced', value: 0.85, pct: '85%' },
                      { label: 'Maximum', value: 1.15, pct: '115%' },
                    ].map((preset) => {
                      const isActive = Math.abs(glowIntensity - preset.value) < 0.06;
                      return (
                        <button
                          key={preset.label}
                          onClick={() => handleSetGlowIntensity(preset.value)}
                          className={`py-1.5 px-2 rounded-xl text-center text-[9px] font-mono transition-all border cursor-pointer ${
                            isActive
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                              : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <div>{preset.label}</div>
                          <div className="text-[7px] text-white/40">{preset.pct}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Optional In-line API Key Config Prompt */}
        <AnimatePresence>
          {showApiKeyPrompt && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="mb-1 w-80 p-3 rounded-2xl bg-[#0c0c12]/95 border border-white/20 backdrop-blur-2xl shadow-2xl flex flex-col gap-2 ring-1 ring-white/10"
            >
              <div className="flex items-center justify-between text-xs font-mono text-white/80 pb-1 border-b border-white/10">
                <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                  <Key size={13} /> Gemini API Key
                </span>
                <button
                  onClick={() => setShowApiKeyPrompt(false)}
                  className="p-1 text-white/40 hover:text-white"
                >
                  <X size={13} />
                </button>
              </div>
              <input
                type="password"
                placeholder="Enter AI Studio API Key..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
                className="w-full px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 font-mono"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  onClick={() => setShowApiKeyPrompt(false)}
                  className="px-2.5 py-1 text-[10px] text-white/60 hover:text-white rounded-lg bg-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveApiKey}
                  className="px-3 py-1 text-[10px] bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg font-mono"
                >
                  Save & Connect
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Bottom Right Floating Control Capsule */}
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-1.5 p-1.5 pl-3 rounded-full bg-[#0c0c12]/90 border border-white/15 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(6,182,212,0.2)] text-white transition-all hover:border-cyan-400/40 group ring-1 ring-white/5"
        >
          {/* Dynamic Status Tag */}
          <div className="flex items-center gap-2 pr-1">
            <div className="relative flex items-center justify-center">
              <span className={`w-2 h-2 rounded-full ${status.dotClass}`} />
            </div>
            <span className="text-[11px] font-mono font-bold tracking-tight text-white/90">
              {status.label}
            </span>
          </div>

          {/* Model Selector & Glow Tuning Trigger Chip */}
          <button
            onClick={() => setShowTuningPopover(!showTuningPopover)}
            className={`px-2.5 py-1 rounded-full border text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              showTuningPopover
                ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-white/5 border-white/10 hover:border-white/25 text-white/70 hover:text-white'
            }`}
            title="Switch Live Model or Tune Glow Intensity"
          >
            <Sparkles size={11} className="text-cyan-400" />
            <span className="truncate max-w-[100px]">{getShortModelName(selectedModelId)}</span>
            <Sliders size={10} className="text-white/40" />
          </button>

          {/* Quick API Key Prompt Trigger if missing or on error */}
          {((livePhase === 'LIVE_ERROR' && liveTelemetry.lastError?.includes('API Key')) || (typeof window !== 'undefined' && !localStorage.getItem('gemini-api-key'))) && (
            <button
              onClick={() => setShowApiKeyPrompt(!showApiKeyPrompt)}
              className="px-2.5 py-1 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.3)] animate-pulse"
              title="Configure Gemini API Key"
            >
              <Key size={11} />
              <span>Set Key</span>
            </button>
          )}

          {/* Stop / Barge-In Button (Visible when Jarvis is speaking) */}
          {isSpeaking && (
            <button
              onClick={interruptLive}
              className="px-2.5 py-1 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-1 text-[10px] font-mono uppercase font-bold tracking-wider transition-all shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-pulse cursor-pointer"
              title="Stop Speaking / Interrupt (Space or Speak)"
            >
              <Square size={9} className="fill-current" />
              <span>Stop</span>
            </button>
          )}

          {/* Retry Button on Error */}
          {livePhase === 'LIVE_ERROR' && !liveTelemetry.lastError?.includes('API Key') && (
            <button
              onClick={() => startLiveMode(selectedModelId)}
              className="p-1.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all cursor-pointer"
              title="Retry Live Connection"
            >
              <RefreshCw size={12} />
            </button>
          )}

          {/* Mute / Unmute Microphone */}
          <button
            onClick={toggleLiveMute}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              liveTelemetry.isMuted
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10 hover:border-white/30'
            }`}
            title={liveTelemetry.isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {liveTelemetry.isMuted ? <MicOff size={13} /> : <Mic size={13} />}
          </button>

          {/* Close / Exit Live Mode */}
          <button
            onClick={stopLiveMode}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 transition-all cursor-pointer"
            title="Exit Live Mode (Esc)"
          >
            <X size={13} />
          </button>
        </motion.div>
      </div>
    </>
  );
}
