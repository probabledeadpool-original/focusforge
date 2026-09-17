"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Activity, SlidersHorizontal, Sparkles, Volume2, 
  RotateCcw, Zap, Disc, Radio, Eye, Waves, Palette,
  Flame, Check
} from 'lucide-react';
import { 
  useFrequencyStore, 
  AudioEnhancementPreset, 
  EdgeLightingMode, 
  EdgeLightingColorTheme 
} from '../../../hooks/useFrequencyStore';
import { AudioEnhancementEngine } from './AudioEnhancementEngine';

const PRESET_DEFINITIONS: { id: AudioEnhancementPreset; label: string; tag: string; desc: string; color: string }[] = [
  {
    id: 'original',
    label: 'Original',
    tag: 'FLAT BYPASS',
    desc: 'Pure, unaltered source signal without DSP processing.',
    color: 'text-white/60 border-white/10 hover:border-white/25',
  },
  {
    id: 'enhanced',
    label: 'Enhanced',
    tag: 'STUDIO MASTER',
    desc: 'Warm analog low-end punch, controlled vocal mids, and pristine air.',
    color: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.2)]',
  },
  {
    id: 'immersive',
    label: 'Immersive',
    tag: '3D SPATIAL FIELD',
    desc: 'Dolby-style psychoacoustic width with deeper sub-bass extension.',
    color: 'text-purple-400 border-purple-500/40 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.2)]',
  },
  {
    id: 'bass-titan',
    label: 'Bass Titan',
    tag: '808 SUB IMPACT',
    desc: 'Heavyweight punch and sub-rumble with dynamic peak limiter guard.',
    color: 'text-amber-400 border-amber-500/40 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.2)]',
  },
  {
    id: 'vocal-air',
    label: 'Vocal Air',
    tag: 'PRISTINE CLARITY',
    desc: 'High vocal intimacy, dialogue intelligibility, and open acoustic air.',
    color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]',
  },
];

const LIGHTING_MODES: { id: EdgeLightingMode; label: string; desc: string }[] = [
  { id: 'ambient', label: 'Ambient', desc: 'Subtle Apple-grade breathing perimeter field (Default)' },
  { id: 'pulse', label: 'Pulse', desc: 'Sub-bass atmospheric expansion & soft recoil' },
  { id: 'flow', label: 'Flow', desc: 'Continuous organic light stream orbiting display' },
  { id: 'spectrum', label: 'Spectrum', desc: 'Spatial frequency split: Bass (bottom), Mids (sides), Treble (top)' },
  { id: 'cinematic', label: 'Cinematic', desc: 'Ultra-slow room light reflections for movies & ambient' },
  { id: 'energy', label: 'Energy', desc: 'High-responsiveness dynamic punch without RGB chaos' },
  { id: 'reactive', label: 'Reactive', desc: 'Transient bursts and localized audio wave propagation' },
  { id: 'custom', label: 'Custom', desc: 'Tailor tactile lighting physics, spread, and motion' },
];

const COLOR_THEMES: { id: EdgeLightingColorTheme; label: string; swatches: string[] }[] = [
  { id: 'adaptive', label: 'Dynamic Artwork', swatches: ['#00f0ff', '#ff007f', '#8b5cf6'] },
  { id: 'cyberpunk', label: 'Cyberpunk Neon', swatches: ['#00f0ff', '#ff007f'] },
  { id: 'midnight', label: 'Tokyo Midnight', swatches: ['#8b5cf6', '#3b82f6'] },
  { id: 'solar', label: 'Solar Flare', swatches: ['#f59e0b', '#ef4444'] },
  { id: 'emerald', label: 'Emerald Matrix', swatches: ['#10b981', '#06b6d4'] },
  { id: 'prismatic', label: 'Prismatic Rainbow', swatches: ['#ff0055', '#00e5ff', '#ffe600'] },
  { id: 'ice', label: 'Diamond Ice', swatches: ['#ffffff', '#93c5fd'] },
];

export default function AudioStudioModal() {
  const store = useFrequencyStore();
  const [activeTab, setActiveTab] = useState<'dsp' | 'lighting'>('dsp');
  const [visualizerBands, setVisualizerBands] = useState<number[]>(new Array(24).fill(0.1));
  const animRef = useRef<number | null>(null);

  // Live 24-Band Visualizer Animation Loop
  useEffect(() => {
    if (!store.isStudioOpen) return;

    const updateVisualizer = () => {
      const data = AudioEnhancementEngine.getVisualizerData(store.isPlaying, 24);
      setVisualizerBands(data);
      animRef.current = requestAnimationFrame(updateVisualizer);
    };

    animRef.current = requestAnimationFrame(updateVisualizer);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [store.isStudioOpen, store.isPlaying]);

  if (!store.isStudioOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-3xl flex items-center justify-center p-4 sm:p-6"
        onClick={() => store.setStudioOpen(false)}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-zinc-950/95 border border-white/15 rounded-3xl w-full max-w-3xl overflow-hidden shadow-[0_25px_100px_rgba(0,0,0,0.9)] flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-cyan-300">
                <Activity size={18} className="text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-white tracking-tight">
                    Acoustic & Photon Studio
                  </h2>
                  <span className="text-[10px] font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                    Pro Engine
                  </span>
                </div>
                <p className="text-xs text-white/40 mt-0.5">
                  Real-time Web Audio DSP & Perimeter Ambient Lighting
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  store.setAudioPreset('enhanced');
                  store.setAudioParams({ bass: 70, clarity: 65, spatial: 60, intensity: 80 });
                  store.setEdgeLightingMode('ambient');
                  store.setEdgeLightingColorTheme('adaptive');
                  store.setEdgeLightingIntensity(80);
                  store.setEdgeLightingSpread(70);
                  store.setEdgeLightingSensitivity(75);
                  store.setCustomLighting({
                    intensity: 80,
                    motion: 60,
                    bassResponse: 75,
                    colorReactivity: 70,
                    glowSpread: 70,
                    speed: 55,
                  });
                }}
                className="h-8 px-3 rounded-xl bg-white/5 hover:bg-white/10 active:scale-[0.98] text-white/50 hover:text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                title="Reset All Values"
              >
                <RotateCcw size={12} />
                <span className="hidden sm:inline">Reset</span>
              </button>
              <button
                onClick={() => store.setStudioOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 active:scale-[0.98] text-white/60 hover:text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer"
                title="Close Studio (Esc)"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Live Spectrum Visualizer Banner */}
          <div className="px-6 py-3.5 bg-black/40 border-b border-white/[0.06] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-white/40">
              <span className="flex items-center gap-1.5 text-white/60 font-medium">
                <Waves size={13} className="text-cyan-400" />
                24-Band Master Spectrum
              </span>
              <span className="text-[11px] font-mono text-cyan-400/80">
                {store.isPlaying ? 'Live Audio Flux' : 'Idle Analyzer'}
              </span>
            </div>

            <div className="h-14 flex items-end justify-between gap-1 pt-1">
              {visualizerBands.map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div 
                    className="w-full rounded-t-sm transition-all duration-75"
                    style={{
                      height: `${Math.max(4, bar * 100)}%`,
                      background: store.audioPreset === 'immersive'
                        ? 'linear-gradient(to top, #7c3aed, #c084fc)'
                        : store.audioPreset === 'bass-titan'
                        ? 'linear-gradient(to top, #d97706, #fbbf24)'
                        : store.audioPreset === 'vocal-air'
                        ? 'linear-gradient(to top, #059669, #34d399)'
                        : 'linear-gradient(to top, #0891b2, #22d3ee)',
                      boxShadow: bar > 0.6 ? '0 0 8px rgba(34, 211, 238, 0.4)' : 'none',
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-between text-[9px] font-mono text-white/25 pt-1 border-t border-white/[0.04]">
              <span>32Hz</span>
              <span>125Hz</span>
              <span>500Hz</span>
              <span>2kHz</span>
              <span>8kHz</span>
              <span>16kHz</span>
            </div>
          </div>

          {/* Apple Segmented Switcher Tabs */}
          <div className="flex border-b border-white/[0.08] px-6 pt-3 bg-white/[0.01]">
            <button
              onClick={() => setActiveTab('dsp')}
              className={`pb-3 px-4 text-xs font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                activeTab === 'dsp'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <Activity size={14} />
              Audio Enhancement Engine
            </button>
            <button
              onClick={() => setActiveTab('lighting')}
              className={`pb-3 px-4 text-xs font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                activeTab === 'lighting'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <Sparkles size={14} />
              Screen Edge Lighting
            </button>
          </div>

          {/* Tab Body */}
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
            {activeTab === 'dsp' ? (
              /* TAB 1: AUDIO DSP ENHANCEMENT ENGINE */
              <div className="space-y-6">
                {/* Preset Profiles */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-white/70">
                      Acoustic Preset Profiles
                    </span>
                    <span className="text-xs font-mono text-cyan-400 font-semibold capitalize">
                      Active: {store.audioPreset}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {PRESET_DEFINITIONS.map((preset) => {
                      const isActive = store.audioPreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => store.setAudioPreset(preset.id)}
                          className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer relative overflow-hidden backdrop-blur-md active:scale-[0.98] ${
                            isActive
                              ? preset.color
                              : 'bg-white/[0.02] border-white/10 text-white/70 hover:bg-white/[0.05] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-white">
                              {preset.label}
                            </span>
                            <span className="text-[9px] font-mono text-white/40">
                              {preset.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-white/50 leading-relaxed mt-1">
                            {preset.desc}
                          </p>
                          {isActive && (
                            <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fine-Tuning Advanced Matrix */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal size={14} className="text-cyan-400" />
                      <span className="text-xs font-semibold text-white">
                        DSP Parametric Sliders
                      </span>
                    </div>
                    <span className="text-xs text-white/40">
                      Real-time Gain & Width
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Bass Dynamics */}
                    <div className="space-y-2 bg-white/[0.02] p-3.5 rounded-xl border border-white/[0.06]">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-white/70">Sub-Bass & Impact</span>
                        <span className="text-amber-400 font-mono font-semibold">{store.audioParams.bass}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={store.audioParams.bass}
                        onChange={(e) => store.setAudioParams({ bass: Number(e.target.value) })}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-400"
                      />
                    </div>

                    {/* Vocal Clarity */}
                    <div className="space-y-2 bg-white/[0.02] p-3.5 rounded-xl border border-white/[0.06]">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-white/70">Vocal & Presence</span>
                        <span className="text-cyan-400 font-mono font-semibold">{store.audioParams.clarity}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={store.audioParams.clarity}
                        onChange={(e) => store.setAudioParams({ clarity: Number(e.target.value) })}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>

                    {/* Spatial Width */}
                    <div className="space-y-2 bg-white/[0.02] p-3.5 rounded-xl border border-white/[0.06]">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-white/70">Spatial 3D Field</span>
                        <span className="text-purple-400 font-mono font-semibold">{store.audioParams.spatial}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={store.audioParams.spatial}
                        onChange={(e) => store.setAudioParams({ spatial: Number(e.target.value) })}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-400"
                      />
                    </div>

                    {/* DSP Intensity */}
                    <div className="space-y-2 bg-white/[0.02] p-3.5 rounded-xl border border-white/[0.06]">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-white/70">Overall Intensity</span>
                        <span className="text-emerald-400 font-mono font-semibold">{store.audioParams.intensity}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={store.audioParams.intensity}
                        onChange={(e) => store.setAudioParams({ intensity: Number(e.target.value) })}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* TAB 2: SCREEN EDGE LIGHTING MATRIX */
              <div className="space-y-6">
                {/* Master Switch */}
                <div className="p-4 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
                      store.edgeLighting ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-white/5 border-white/10 text-white/40'
                    }`}>
                      <Sparkles size={16} className={store.edgeLighting ? "animate-pulse" : ""} />
                    </div>
                    <div>
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                        Perimeter LED Hardware Engine
                      </h4>
                      <p className="text-[9px] font-mono text-white/40">
                        Continuous atmospheric light field with color inertia & physical attack/decay
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => store.toggleEdgeLighting()}
                    className={`w-12 h-6.5 rounded-full transition-all duration-300 p-1 flex items-center shrink-0 cursor-pointer border ${
                      store.edgeLighting 
                        ? 'bg-cyan-500 border-cyan-400 justify-end shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                        : 'bg-white/10 border-white/15 justify-start'
                    }`}
                  >
                    <motion.div 
                      layout 
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className={`w-4 h-4 rounded-full ${store.edgeLighting ? 'bg-black' : 'bg-white/60'}`} 
                    />
                  </button>
                </div>

                {/* Lighting Modes */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/50 font-bold">
                      Edge Lighting Dynamics Mode
                    </span>
                    <span className="text-[9px] font-mono text-cyan-400 uppercase font-bold">
                      {store.edgeLightingMode}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {LIGHTING_MODES.map((mode) => {
                      const isActive = store.edgeLightingMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          onClick={() => store.setEdgeLightingMode(mode.id)}
                          className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                            isActive
                              ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)] font-bold'
                              : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="text-xs font-mono uppercase tracking-wider flex items-center justify-between mb-1">
                            {mode.label}
                            {isActive && <Check size={12} className="text-cyan-400" />}
                          </div>
                          <p className="text-[8px] font-mono text-white/40 leading-snug">
                            {mode.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Mode Controls (When Custom mode is active) */}
                {store.edgeLightingMode === 'custom' && (
                  <div className="p-5 rounded-3xl bg-cyan-950/20 border border-cyan-500/30 space-y-4">
                    <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300">
                        Custom Lighting Engine Physics
                      </span>
                      <span className="text-[9px] font-mono text-cyan-400/60 uppercase">
                        Tactile Precision Controls
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {/* Intensity */}
                      <div className="space-y-1.5 bg-black/40 p-3 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-white/60 uppercase">Intensity</span>
                          <span className="text-cyan-400 font-bold">{store.customLighting.intensity}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={store.customLighting.intensity}
                          onChange={(e) => store.setCustomLighting({ intensity: Number(e.target.value) })}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                        />
                        <div className="flex justify-between text-[8px] font-mono text-white/30">
                          <span>Low</span>
                          <span>High</span>
                        </div>
                      </div>

                      {/* Motion */}
                      <div className="space-y-1.5 bg-black/40 p-3 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-white/60 uppercase">Motion</span>
                          <span className="text-cyan-400 font-bold">{store.customLighting.motion}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={store.customLighting.motion}
                          onChange={(e) => store.setCustomLighting({ motion: Number(e.target.value) })}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                        />
                        <div className="flex justify-between text-[8px] font-mono text-white/30">
                          <span>Still</span>
                          <span>Fluid</span>
                        </div>
                      </div>

                      {/* Bass Response */}
                      <div className="space-y-1.5 bg-black/40 p-3 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-white/60 uppercase">Bass Response</span>
                          <span className="text-amber-400 font-bold">{store.customLighting.bassResponse}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={store.customLighting.bassResponse}
                          onChange={(e) => store.setCustomLighting({ bassResponse: Number(e.target.value) })}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-400"
                        />
                        <div className="flex justify-between text-[8px] font-mono text-white/30">
                          <span>Low</span>
                          <span>High</span>
                        </div>
                      </div>

                      {/* Color Reactivity */}
                      <div className="space-y-1.5 bg-black/40 p-3 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-white/60 uppercase">Color Reactivity</span>
                          <span className="text-purple-400 font-bold">{store.customLighting.colorReactivity}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={store.customLighting.colorReactivity}
                          onChange={(e) => store.setCustomLighting({ colorReactivity: Number(e.target.value) })}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-400"
                        />
                        <div className="flex justify-between text-[8px] font-mono text-white/30">
                          <span>Low</span>
                          <span>High</span>
                        </div>
                      </div>

                      {/* Glow Spread */}
                      <div className="space-y-1.5 bg-black/40 p-3 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-white/60 uppercase">Glow Spread</span>
                          <span className="text-pink-400 font-bold">{store.customLighting.glowSpread}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={store.customLighting.glowSpread}
                          onChange={(e) => store.setCustomLighting({ glowSpread: Number(e.target.value) })}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pink-400"
                        />
                        <div className="flex justify-between text-[8px] font-mono text-white/30">
                          <span>Tight</span>
                          <span>Wide</span>
                        </div>
                      </div>

                      {/* Speed */}
                      <div className="space-y-1.5 bg-black/40 p-3 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-white/60 uppercase">Speed</span>
                          <span className="text-emerald-400 font-bold">{store.customLighting.speed}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={store.customLighting.speed}
                          onChange={(e) => store.setCustomLighting({ speed: Number(e.target.value) })}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                        />
                        <div className="flex justify-between text-[8px] font-mono text-white/30">
                          <span>Slow</span>
                          <span>Fast</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Color Source Selector: Dominant | Cover | Adaptive | Custom */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/50 font-bold">
                      Color Source Engine
                    </span>
                    <span className="text-[9px] font-mono text-cyan-400 uppercase font-bold">
                      Source: {store.edgeLightingColorSource}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                    {/* Dominant Colour Source */}
                    <button
                      onClick={() => store.setEdgeLightingColorSource('dominant')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                        store.edgeLightingColorSource === 'dominant'
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)] font-bold'
                          : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase tracking-wider">● Dominant</span>
                        {store.edgeLightingColorSource === 'dominant' && <Check size={12} className="text-cyan-400" />}
                      </div>
                      <p className="text-[8px] font-mono text-white/40 leading-snug">
                        Extracts live dominant color from playing video/content & updates every 5s
                      </p>
                      {store.edgeLightingColorSource === 'dominant' && (
                        <div className="flex items-center gap-1 pt-1 text-[8px] font-mono text-cyan-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                          <span>5s Dynamic Loop</span>
                        </div>
                      )}
                    </button>

                    {/* Cover Source */}
                    <button
                      onClick={() => store.setEdgeLightingColorSource('cover')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                        store.edgeLightingColorSource === 'cover'
                          ? 'bg-purple-500/15 border-purple-400 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.25)] font-bold'
                          : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase tracking-wider">● Cover</span>
                        {store.edgeLightingColorSource === 'cover' && <Check size={12} className="text-purple-400" />}
                      </div>
                      <p className="text-[8px] font-mono text-white/40 leading-snug">
                        Static harmonic palette derived from artwork cover
                      </p>
                      {/* Live Swatch Preview from Cover Palette */}
                      {store.coverPalette && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <div className="w-3 h-3 rounded-full border border-white/30 shadow-sm" style={{ backgroundColor: store.coverPalette.primary }} title="Primary" />
                          <div className="w-3 h-3 rounded-full border border-white/30 shadow-sm" style={{ backgroundColor: store.coverPalette.secondary }} title="Secondary" />
                          <div className="w-3 h-3 rounded-full border border-white/30 shadow-sm" style={{ backgroundColor: store.coverPalette.accent }} title="Accent" />
                        </div>
                      )}
                    </button>

                    {/* Adaptive Source */}
                    <button
                      onClick={() => store.setEdgeLightingColorSource('adaptive')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                        store.edgeLightingColorSource === 'adaptive'
                          ? 'bg-indigo-500/15 border-indigo-400 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.25)] font-bold'
                          : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase tracking-wider">○ Adaptive</span>
                        {store.edgeLightingColorSource === 'adaptive' && <Check size={12} className="text-indigo-400" />}
                      </div>
                      <p className="text-[8px] font-mono text-white/40 leading-snug">
                        Intelligent music-reactive mood & frequency shifts
                      </p>
                    </button>

                    {/* Custom Source */}
                    <button
                      onClick={() => store.setEdgeLightingColorSource('custom')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                        store.edgeLightingColorSource === 'custom'
                          ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)] font-bold'
                          : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase tracking-wider">○ Custom</span>
                        {store.edgeLightingColorSource === 'custom' && <Check size={12} className="text-amber-400" />}
                      </div>
                      <p className="text-[8px] font-mono text-white/40 leading-snug">
                        Select curated neon palettes or theme swatches
                      </p>
                    </button>
                  </div>
                </div>

                {/* Custom Color Themes (When Custom Color Source is active) */}
                {store.edgeLightingColorSource === 'custom' && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-white/50 font-bold">
                        Custom Palette Swatches
                      </span>
                      <span className="text-[9px] font-mono text-cyan-400 uppercase font-bold">
                        {store.edgeLightingColorTheme}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {COLOR_THEMES.filter(t => t.id !== 'adaptive').map((theme) => {
                        const isActive = store.edgeLightingColorTheme === theme.id;
                        return (
                          <button
                            key={theme.id}
                            onClick={() => store.setEdgeLightingColorTheme(theme.id)}
                            className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                              isActive
                                ? 'bg-white/10 border-white/40 text-white shadow-[0_0_15px_rgba(255,255,255,0.15)] font-bold'
                                : 'bg-white/[0.02] border-white/10 text-white/50 hover:text-white hover:bg-white/[0.05]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              {theme.swatches.map((color, idx) => (
                                <div
                                  key={idx}
                                  className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                            <span className="text-[10px] font-mono uppercase tracking-wider truncate">
                              {theme.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Physics Sliders (for non-custom modes) */}
                {store.edgeLightingMode !== 'custom' && (
                  <div className="p-5 rounded-3xl bg-black/50 border border-white/10 space-y-4">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-white block">
                      Atmospheric Field Physics
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Intensity */}
                      <div className="space-y-1.5 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-white/60 uppercase">Luminance</span>
                          <span className="text-cyan-400 font-bold">{store.edgeLightingIntensity}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={store.edgeLightingIntensity}
                          onChange={(e) => store.setEdgeLightingIntensity(Number(e.target.value))}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                        />
                      </div>

                      {/* Spread */}
                      <div className="space-y-1.5 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-white/60 uppercase">Diffusion Spread</span>
                          <span className="text-purple-400 font-bold">{store.edgeLightingSpread}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={store.edgeLightingSpread}
                          onChange={(e) => store.setEdgeLightingSpread(Number(e.target.value))}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-400"
                        />
                      </div>

                      {/* Sensitivity */}
                      <div className="space-y-1.5 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-white/60 uppercase">Beat Reactivity</span>
                          <span className="text-emerald-400 font-bold">{store.edgeLightingSensitivity}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={store.edgeLightingSensitivity}
                          onChange={(e) => store.setEdgeLightingSensitivity(Number(e.target.value))}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
