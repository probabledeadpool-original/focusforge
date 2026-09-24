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
  size?: 'sm' | 'capsule' | 'bubble' | 'md' | 'lg' | 'hero';
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
    if (tool.includes('SEARCH') || tool.includes('WEATHER') || tool.includes('WORLD_PULSE') || tool.includes('NEWS') || tool.includes('YOUTUBE')) {
      return 'searching';
    }
    if (
      tool.includes('STOCK') || 
      tool.includes('CRYPTO') || 
      tool.includes('CURRENCY') || 
      tool.includes('FX') || 
      tool.includes('PORTFOLIO') || 
      tool.includes('WATCHLIST') ||
      tool.includes('SOLVE') ||
      tool.includes('CALC')
    ) {
      return 'solving';
    }
    if (tool.includes('EARTHQUAKE') || tool.includes('ISS') || tool.includes('NASA') || tool.includes('APOD') || tool.includes('SATELLITE')) {
      return 'weaving';
    }
    if (tool.includes('AUDIO') || tool.includes('PLAYLIST') || tool.includes('SONG') || tool.includes('TRACK') || tool.includes('MUSIC') || tool.includes('FREQUENCY')) {
      return 'composing';
    }
    if (tool.includes('TASK') || tool.includes('NAVIGATE') || tool.includes('COIN') || tool.includes('FOCUS')) {
      return 'shaping';
    }
    if (tool.includes('TIMER')) {
      return 'breathing';
    }
  }

  // 2. State & Engine Mappings
  if (geminiStatus === 'connecting') return 'connecting';
  if (geminiStatus === 'processing' || aiState === 'thinking' || (voiceState as string) === 'processing_command' || (voiceState as string) === 'PROCESSING_COMMAND') return 'working';
  if ((voiceState as string) === 'listening_for_command' || (voiceState as string) === 'transcribing_command' || (voiceState as string) === 'activated' || (voiceState as string) === 'wake_candidate' || (voiceState as string) === 'LISTENING_FOR_COMMAND' || aiState === 'listening') return 'listening';
  if ((voiceState as string) === 'speaking_response' || (voiceState as string) === 'SPEAKING_RESPONSE' || aiState === 'speaking') return 'working';
  
  // 3. Ambient Standby
  return 'breathing';
}

/**
 * Resolves dynamic glow color based on the current cognitive or visual state
 */
function getAuraGradient(mode: 'wave' | 'dots' | 'orb', orbState: OrbState): string {
  if (mode === 'wave') {
    return 'from-cyan-500/25 via-blue-500/20 to-sky-400/25';
  }
  if (mode === 'dots') {
    return 'from-fuchsia-500/25 via-purple-500/20 to-cyan-400/25';
  }
  switch (orbState) {
    case 'searching':
      return 'from-cyan-500/25 via-sky-500/20 to-blue-600/25';
    case 'solving':
      return 'from-emerald-500/25 via-teal-500/20 to-cyan-500/25';
    case 'weaving':
      return 'from-indigo-500/25 via-purple-500/20 to-violet-600/25';
    case 'composing':
      return 'from-amber-500/25 via-orange-500/20 to-rose-500/25';
    case 'shaping':
      return 'from-blue-500/25 via-indigo-500/20 to-cyan-500/25';
    case 'connecting':
      return 'from-cyan-400/30 via-blue-500/25 to-teal-400/30';
    case 'listening':
      return 'from-purple-500/25 via-pink-500/20 to-cyan-400/25';
    case 'working':
      return 'from-blue-500/25 via-cyan-500/20 to-indigo-500/25';
    case 'breathing':
    default:
      return 'from-cyan-500/15 via-blue-500/10 to-purple-500/15';
  }
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
    if ((voiceState as string) === 'speaking_response' || (voiceState as string) === 'SPEAKING_RESPONSE' || aiState === 'speaking') {
      return 'wave';
    }
    if ((voiceState as string) === 'listening_for_command' || (voiceState as string) === 'transcribing_command' || (voiceState as string) === 'activated' || (voiceState as string) === 'LISTENING_FOR_COMMAND' || aiState === 'listening') {
      // In mini capsule or sm mode, we can use fluid-dots or listening orb
      return 'dots';
    }
    // Processing / Thinking / Standby
    return 'orb';
  }, [voiceState, aiState]);

  const auraGradient = useMemo(() => getAuraGradient(mode, orbState), [mode, orbState]);

  // Scale mappings:
  // sm: 24px (header/small badge)
  // capsule: 36px
  // bubble: 52px (Apple Intelligence dynamic island sphere)
  // md: 48px
  // lg: 80px
  // hero: 128px (HUD centerpiece)
  const wavePixelSize = 
    size === 'sm' ? 44 : 
    size === 'capsule' ? 56 : 
    size === 'bubble' ? 54 :
    size === 'md' ? 100 : 
    size === 'lg' ? 180 : 320;

  const orbPixelScale: OrbSize = 
    size === 'sm' ? 20 : 64;

  const containerDimensionClass = 
    size === 'sm' ? 'w-7 h-7' :
    size === 'capsule' ? 'w-9 h-9' :
    size === 'bubble' ? 'w-full h-full aspect-square' :
    size === 'md' ? 'w-14 h-14' :
    size === 'lg' ? 'w-24 h-24' : 'w-40 h-40';

  // Bubble Rendering for Apple Intelligence Floating Sphere
  if (size === 'bubble') {
    return (
      <div className={`relative w-full h-full aspect-square flex items-center justify-center ${className}`}>
        {/* Soft internal gradient diffusion */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-tr ${auraGradient} blur-md opacity-60 pointer-events-none scale-110`} />
        
        {mode === 'wave' && (
          <div className="w-full h-full flex items-center justify-center relative z-10">
            <SiriWave variant="wave" size={54} renderScale={0.95} className="pointer-events-none" />
          </div>
        )}
        {mode === 'dots' && (
          <div className="w-full h-full flex items-center justify-center relative z-10">
            <SiriWave variant="fluid-dots" size={54} renderScale={0.95} className="pointer-events-none" />
          </div>
        )}
        {mode === 'orb' && (
          <div className="w-full h-full flex items-center justify-center relative z-10 scale-[0.58]">
            <ThinkingOrb 
              state={orbState} 
              size={64} 
              speed={speed} 
              theme="dark" 
              paused={paused} 
            />
          </div>
        )}
      </div>
    );
  }

  // Compact Rendering (sm & capsule) for Top Bars & Dynamic Island
  if (size === 'sm' || size === 'capsule') {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        {/* Soft background aura glow */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-tr ${auraGradient} blur-md opacity-70 pointer-events-none scale-125`} />
        
        {mode === 'wave' && (
          <div className={`${containerDimensionClass} flex items-center justify-center overflow-hidden relative z-10`}>
            <SiriWave variant="wave" size={wavePixelSize} renderScale={0.85} className="pointer-events-none" />
          </div>
        )}
        {mode === 'dots' && (
          <div className={`${containerDimensionClass} flex items-center justify-center overflow-hidden relative z-10`}>
            <SiriWave variant="fluid-dots" size={wavePixelSize} renderScale={0.85} className="pointer-events-none" />
          </div>
        )}
        {mode === 'orb' && (
          <div className={`${containerDimensionClass} flex items-center justify-center relative z-10`}>
            <ThinkingOrb 
              state={orbState} 
              size={orbPixelScale} 
              speed={speed} 
              theme="dark" 
              paused={paused} 
            />
          </div>
        )}
      </div>
    );
  }

  // Full & Hero Rendering (md, lg, hero) with Apple-grade frosted glass container
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
            <div className={`absolute inset-0 -m-8 rounded-full bg-gradient-to-tr ${auraGradient} blur-3xl opacity-60 pointer-events-none`} />
            <SiriWave
              variant="wave"
              size={wavePixelSize}
              renderScale={0.9}
              className="pointer-events-none z-10 drop-shadow-[0_0_25px_rgba(59,130,246,0.4)]"
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
            <div className={`absolute inset-0 -m-8 rounded-full bg-gradient-to-tr ${auraGradient} blur-3xl opacity-60 pointer-events-none`} />
            <SiriWave
              variant="fluid-dots"
              size={wavePixelSize}
              renderScale={0.9}
              className="pointer-events-none z-10 drop-shadow-[0_0_25px_rgba(168,85,247,0.4)]"
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
            <div className={`absolute inset-0 -m-10 rounded-full bg-gradient-to-tr ${auraGradient} blur-3xl opacity-75 pointer-events-none`} />
            
            {/* Orb Container with Apple-style subtle ring */}
            <div className={`relative flex items-center justify-center ${size === 'hero' ? 'p-6 rounded-full bg-black/40 border border-white/10 backdrop-blur-2xl shadow-[0_15px_40px_rgba(0,0,0,0.6)] ring-1 ring-white/15' : ''}`}>
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
