"use client";

import React, { useMemo } from 'react';
import { ThinkingOrb, OrbState, OrbSize } from 'thinking-orbs';
import { SiriWave } from '@/components/ui/siri-wave';
import { motion, AnimatePresence } from 'motion/react';
import type { VoiceState } from '../../lib/jarvisVoiceEngine';
import type { JarvisAiState } from '../../hooks/useJarvisStore';

export interface JarvisVisualizerProps {
  voiceState: VoiceState;
  aiState?: JarvisAiState;
  isProcessing?: boolean;
  activeTool?: string | null;
  geminiStatus?: 'idle' | 'connecting' | 'processing' | 'connected' | 'error';
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
  speed?: number;
  paused?: boolean;
}

/**
 * Resolves the optimal ThinkingOrb state (9 hand-tuned animated states)
 * based on the active tool directive, LLM status, or cognitive phase.
 */
export function resolveOrbState(
  voiceState: VoiceState,
  aiState?: JarvisAiState,
  activeTool?: string | null,
  geminiStatus?: string
): OrbState {
  // 1. Tool-Specific Cognitive Mappings
  if (activeTool) {
    const tool = activeTool.toUpperCase();
    if (tool.includes('SEARCH') || tool.includes('WEATHER') || tool.includes('WORLD_PULSE') || tool.includes('NEWS')) {
      return 'searching';
    }
    if (
      tool.includes('STOCK') || 
      tool.includes('CRYPTO') || 
      tool.includes('CURRENCY') || 
      tool.includes('FX') || 
      tool.includes('PORTFOLIO') || 
      tool.includes('WATCHLIST')
    ) {
      return 'solving';
    }
    if (tool.includes('EARTHQUAKE') || tool.includes('ISS') || tool.includes('NASA') || tool.includes('APOD')) {
      return 'weaving';
    }
    if (tool.includes('AUDIO') || tool.includes('PLAYLIST') || tool.includes('SONG') || tool.includes('TRACK') || tool.includes('MUSIC')) {
      return 'composing';
    }
    if (tool.includes('TASK') || tool.includes('NAVIGATE') || tool.includes('COIN')) {
      return 'shaping';
    }
    if (tool.includes('TIMER')) {
      return 'breathing';
    }
  }

  // 2. State & Engine Mappings
  if (geminiStatus === 'connecting') return 'connecting';
  if (geminiStatus === 'processing' || aiState === 'thinking' || voiceState === 'PROCESSING_COMMAND') return 'working';
  if (voiceState === 'LISTENING_FOR_COMMAND' || aiState === 'listening') return 'listening';
  if (voiceState === 'SPEAKING_RESPONSE' || aiState === 'speaking') return 'working';
  
  // 3. Ambient Standby
  return 'breathing';
}

/**
 * Master Hybrid Visualizer:
 * Seamlessly balances:
 * - SiriWave Wave ("wave") -> Vocal Speech Response
 * - SiriWave Fluid-Dots ("fluid-dots") -> Audio Perception / User Speech Capture
 * - Thinking Orbs (9 States) -> Cognitive Processing, Tool Solving & Ambient Breathing
 */
export default function JarvisOrbVisualizer({
  voiceState,
  aiState,
  isProcessing = false,
  activeTool,
  geminiStatus,
  size = 'hero',
  className = '',
  speed = 1,
  paused = false,
}: JarvisVisualizerProps) {
  const orbState = useMemo(() => {
    return resolveOrbState(voiceState, aiState, activeTool, geminiStatus);
  }, [voiceState, aiState, activeTool, geminiStatus]);

  // Determine Visual Mode:
  // - "wave" for speaking
  // - "dots" for active listening to microphone
  // - "orb" for thinking / processing / solving / connecting / ambient breathing
  const mode: 'wave' | 'dots' | 'orb' = useMemo(() => {
    if (voiceState === 'SPEAKING_RESPONSE' || aiState === 'speaking') {
      return 'wave';
    }
    if (voiceState === 'LISTENING_FOR_COMMAND' || aiState === 'listening') {
      return 'dots';
    }
    // Processing / Thinking / Standby
    return 'orb';
  }, [voiceState, aiState]);

  // Dimensions
  const wavePixelSize = size === 'sm' ? 44 : size === 'md' ? 90 : size === 'lg' ? 180 : 320;
  const orbPixelScale: OrbSize = size === 'sm' ? 20 : size === 'md' ? 32 : 64;

  if (size === 'sm') {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        {mode === 'wave' && (
          <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
            <SiriWave variant="wave" size={40} renderScale={0.7} className="pointer-events-none" />
          </div>
        )}
        {mode === 'dots' && (
          <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
            <SiriWave variant="fluid-dots" size={40} renderScale={0.7} className="pointer-events-none" />
          </div>
        )}
        {mode === 'orb' && (
          <div className="flex items-center justify-center">
            <ThinkingOrb state={orbState} size={20} speed={speed} theme="dark" paused={paused} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <AnimatePresence mode="wait">
        {mode === 'wave' && (
          <motion.div
            key="siri-wave"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative flex items-center justify-center"
          >
            <SiriWave
              variant="wave"
              size={wavePixelSize}
              renderScale={0.85}
              className="pointer-events-none z-10 drop-shadow-[0_0_25px_rgba(59,130,246,0.3)]"
            />
          </motion.div>
        )}

        {mode === 'dots' && (
          <motion.div
            key="siri-fluid-dots"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative flex items-center justify-center"
          >
            <SiriWave
              variant="fluid-dots"
              size={wavePixelSize}
              renderScale={0.85}
              className="pointer-events-none z-10 drop-shadow-[0_0_25px_rgba(168,85,247,0.3)]"
            />
          </motion.div>
        )}

        {mode === 'orb' && (
          <motion.div
            key={`thinking-orb-${orbState}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, ease: [0.32, 1.2, 0.55, 1] }}
            className="relative flex items-center justify-center"
          >
            {/* Ambient Multi-Layer Glow Halo */}
            <div className="absolute inset-0 -m-8 rounded-full bg-gradient-to-tr from-cyan-500/10 via-purple-500/10 to-blue-500/10 blur-2xl pointer-events-none" />
            
            {/* Orb Container with Apple-style subtle ring */}
            <div className={`relative flex items-center justify-center ${size === 'hero' ? 'p-6 rounded-full bg-black/40 border border-white/10 backdrop-blur-2xl shadow-[0_15px_40px_rgba(0,0,0,0.6)]' : ''}`}>
              <ThinkingOrb
                state={orbState}
                size={orbPixelScale}
                speed={speed}
                theme="dark"
                paused={paused}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
