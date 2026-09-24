"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, MicOff, Volume2, AlertCircle, RefreshCw, X, 
  Send, ShieldCheck, CheckCircle, HelpCircle, Terminal,
  Radio, Sparkles, Check, CornerDownLeft
} from 'lucide-react';
import { useJarvisStore } from '../../hooks/useJarvisStore';
import { jarvisVoiceEngine, VoiceState, VoiceEngineTelemetry } from '../../lib/jarvisVoiceEngine';
import { handleGlobalJarvisCommand } from '../../lib/jarvisCommandDispatcher';

export interface JarvisVoiceStatusProps {
  className?: string;
  showTextInput?: boolean;
  onToggleDiagnostics?: () => void;
}

export function JarvisVoiceStatus({
  className = '',
  showTextInput = true,
  onToggleDiagnostics
}: JarvisVoiceStatusProps) {
  const { 
    phase, 
    telemetry, 
    confirmPendingAction, 
    cancelPendingAction, 
    retryVoice 
  } = useJarvisStore();

  const [textInputValue, setTextInputValue] = useState('');
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut support (Escape to cancel, Alt+J to activate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing inside an input element other than our fallback, ignore
      if (document.activeElement?.tagName === 'INPUT' && document.activeElement !== inputRef.current) {
        return;
      }
      if (document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'Escape') {
        if (phase !== 'standby' && phase !== 'disabled') {
          e.preventDefault();
          jarvisVoiceEngine.cancelCurrentAction();
        }
      } else if (e.altKey && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        jarvisVoiceEngine.startManualPushToTalk();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase]);

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = textInputValue.trim();
    if (!trimmed) return;
    setTextInputValue('');
    await handleGlobalJarvisCommand(trimmed);
  };

  // State metadata configuration
  const stateMeta: Record<VoiceState, { label: string; icon: React.ReactNode; color: string; desc: string }> = {
    disabled: {
      label: 'Disabled',
      icon: <MicOff size={14} className="text-zinc-500" />,
      color: 'border-zinc-800 bg-zinc-900/60 text-zinc-400',
      desc: 'Voice disabled. Click to enable.'
    },
    standby: {
      label: 'Standby',
      icon: <Radio size={14} className="text-emerald-400 animate-pulse" />,
      color: 'border-emerald-500/20 bg-emerald-950/20 text-emerald-300',
      desc: 'Listening for "Jarvis"...'
    },
    wake_candidate: {
      label: 'Verifying',
      icon: <Sparkles size={14} className="text-amber-400 animate-spin" />,
      color: 'border-amber-500/30 bg-amber-950/30 text-amber-300',
      desc: 'Verifying wake phrase...'
    },
    activated: {
      label: 'Activated',
      icon: <CheckCircle size={14} className="text-cyan-400" />,
      color: 'border-cyan-500/40 bg-cyan-950/40 text-cyan-200',
      desc: 'Jarvis activated. Yes, sir?'
    },
    listening_for_command: {
      label: 'Listening',
      icon: <Mic size={14} className="text-cyan-400 animate-bounce" />,
      color: 'border-cyan-500/50 bg-cyan-950/50 text-cyan-200 shadow-cyan-500/10 shadow-lg',
      desc: 'Listening for your command...'
    },
    transcribing_command: {
      label: 'Transcribing',
      icon: <Mic size={14} className="text-indigo-400 animate-pulse" />,
      color: 'border-indigo-500/50 bg-indigo-950/50 text-indigo-200',
      desc: 'Transcribing utterance...'
    },
    processing_command: {
      label: 'Processing',
      icon: <Sparkles size={14} className="text-purple-400 animate-spin" />,
      color: 'border-purple-500/50 bg-purple-950/50 text-purple-200',
      desc: 'Analyzing structured intent...'
    },
    speaking_response: {
      label: 'Speaking',
      icon: <Volume2 size={14} className="text-blue-400 animate-pulse" />,
      color: 'border-blue-500/40 bg-blue-950/30 text-blue-200',
      desc: 'Jarvis speaking (mic gated)'
    },
    confirmation_required: {
      label: 'Confirmation Required',
      icon: <HelpCircle size={14} className="text-amber-400" />,
      color: 'border-amber-500/60 bg-amber-950/50 text-amber-200',
      desc: 'Destructive action confirmation'
    },
    error: {
      label: 'Voice Error',
      icon: <AlertCircle size={14} className="text-red-400" />,
      color: 'border-red-500/60 bg-red-950/50 text-red-200',
      desc: telemetry.errorMessage || 'Voice recognition error'
    }
  };

  const currentMeta = stateMeta[phase] || stateMeta.standby;
  const isInteracting = phase !== 'standby' && phase !== 'disabled';

  return (
    <section 
      aria-label="JARVIS Voice Interaction Panel" 
      aria-live="polite" 
      className={`relative rounded-2xl border backdrop-blur-xl p-3 transition-all duration-300 ${currentMeta.color} ${className}`}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center p-1.5 rounded-xl bg-black/40 border border-white/10">
            {currentMeta.icon}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider">
                {currentMeta.label}
              </span>
              {telemetry.isMicrophoneActive && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <p className="text-[10px] text-white/60 font-sans leading-tight">
              {currentMeta.desc}
            </p>
          </div>
        </div>

        {/* Action / Control Buttons */}
        <div className="flex items-center gap-1.5">
          {phase === 'error' && (
            <button
              onClick={() => retryVoice()}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 text-[10px] font-mono cursor-pointer transition-colors"
              aria-label="Retry Voice Connection"
            >
              <RefreshCw size={10} />
              <span>Retry</span>
            </button>
          )}

          {phase === 'disabled' && (
            <button
              onClick={() => jarvisVoiceEngine.enableVoice(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono cursor-pointer transition-colors"
              aria-label="Enable Jarvis Voice"
            >
              <Mic size={10} />
              <span>Enable Voice</span>
            </button>
          )}

          {isInteracting && (
            <button
              onClick={() => jarvisVoiceEngine.cancelCurrentAction()}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 transition-colors cursor-pointer"
              title="Cancel (Esc)"
              aria-label="Cancel voice command"
            >
              <X size={12} />
            </button>
          )}

          {onToggleDiagnostics && (
            <button
              onClick={onToggleDiagnostics}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-white/50 hover:text-white border border-white/10 text-[10px] font-mono transition-colors cursor-pointer"
              title="Developer Diagnostics"
              aria-label="Toggle developer diagnostics panel"
            >
              <Terminal size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Flow Widget */}
      <AnimatePresence>
        {phase === 'confirmation_required' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2"
          >
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-amber-200">
                  {telemetry.pendingConfirmationPrompt || "Confirmation required for write operation."}
                </p>
                <p className="text-[10px] font-mono text-amber-400/80">
                  Say &ldquo;Yes&rdquo; or click Confirm to execute • Say &ldquo;No&rdquo; to abort
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => cancelPendingAction()}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-mono cursor-pointer transition-colors"
              >
                Cancel (No)
              </button>
              <button
                onClick={() => confirmPendingAction()}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs font-mono cursor-pointer transition-colors shadow-sm"
              >
                <Check size={12} />
                <span>Confirm (Yes)</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Transcript Display */}
      {(telemetry.finalCommandTranscript || telemetry.interimTranscript) && (
        <div className="mt-2.5 p-2 rounded-xl bg-black/40 border border-white/10 space-y-1">
          <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest block">
            Command Utterance
          </span>
          <div className="text-xs text-white leading-relaxed">
            {telemetry.finalCommandTranscript && (
              <span className="font-medium text-white">{telemetry.finalCommandTranscript} </span>
            )}
            {telemetry.interimTranscript && (
              <span className="italic text-white/50 animate-pulse">{telemetry.interimTranscript}</span>
            )}
          </div>
        </div>
      )}

      {/* Error Recovery Advice */}
      {phase === 'error' && telemetry.errorRecoveryHint && (
        <div className="mt-2 text-[10px] font-mono text-red-300/90 bg-red-950/40 p-2 rounded-lg border border-red-500/20">
          💡 {telemetry.errorRecoveryHint}
        </div>
      )}

      {/* Text Input Fallback */}
      {showTextInput && (
        <form onSubmit={handleTextSubmit} className="mt-2.5 flex items-center gap-1.5">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              placeholder="Or type a command (e.g. 'start 25m timer')..."
              className="w-full bg-black/50 border border-white/10 focus:border-cyan-500/50 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none transition-all font-sans"
              aria-label="Text command input fallback"
            />
          </div>
          <button
            type="submit"
            disabled={!textInputValue.trim()}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black disabled:opacity-30 disabled:hover:bg-white/10 disabled:hover:text-white transition-all cursor-pointer disabled:cursor-not-allowed"
            aria-label="Submit command"
          >
            <CornerDownLeft size={14} />
          </button>
        </form>
      )}

      {/* Privacy & Safety Badge */}
      <div className="mt-2 flex items-center justify-between text-[9px] font-mono text-white/40 pt-1 border-t border-white/5">
        <div className="flex items-center gap-1">
          <ShieldCheck size={10} className="text-emerald-400" />
          <span>On-device FSM • Zero Standby Audio Upload</span>
        </div>
        <span className="hidden sm:inline">Press Alt+J or say &ldquo;Jarvis&rdquo;</span>
      </div>
    </section>
  );
}
