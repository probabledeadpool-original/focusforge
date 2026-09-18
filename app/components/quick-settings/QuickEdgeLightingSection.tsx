"use client";

import React from 'react';
import { Sparkles, Sliders } from 'lucide-react';
import { motion } from 'motion/react';

import type { EdgeLightingMode, EdgeLightingColorSource } from '@/hooks/useFrequencyStore';

interface QuickEdgeLightingSectionProps {
  edgeLighting: boolean;
  edgeLightingMode: EdgeLightingMode;
  edgeLightingColorSource: EdgeLightingColorSource;
  onToggleEdgeLighting: () => void;
  onSetColorSource: (src: EdgeLightingColorSource) => void;
  onSetMode: (mode: EdgeLightingMode) => void;
  onOpenStudio: () => void;
}

const LIGHTING_MODES: { id: EdgeLightingMode; label: string }[] = [
  { id: 'ambient', label: 'Ambient' },
  { id: 'pulse', label: 'Pulse' },
  { id: 'flow', label: 'Flow' },
  { id: 'spectrum', label: 'Spectrum' },
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'energy', label: 'Energy' },
  { id: 'reactive', label: 'Reactive' },
  { id: 'custom', label: 'Custom' },
];

const COLOR_SOURCES: { id: EdgeLightingColorSource; label: string }[] = [
  { id: 'dominant', label: 'Dominant (5s)' },
  { id: 'cover', label: 'Cover Art' },
  { id: 'adaptive', label: 'Adaptive' },
  { id: 'custom', label: 'Custom' },
];

export const QuickEdgeLightingSection: React.FC<QuickEdgeLightingSectionProps> = ({
  edgeLighting,
  edgeLightingMode,
  edgeLightingColorSource,
  onToggleEdgeLighting,
  onSetColorSource,
  onSetMode,
  onOpenStudio
}) => {
  return (
    <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all backdrop-blur-2xl space-y-2.5 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-xl flex items-center justify-center border transition-all ${
            edgeLighting 
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]' 
              : 'bg-white/[0.06] border-white/10 text-white/40'
          }`}>
            <Sparkles size={14} className={edgeLighting ? "animate-pulse" : ""} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-white">
                Screen Edge Lighting
              </span>
              <span className={`text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-full font-bold border ${
                edgeLighting
                  ? 'text-cyan-300 bg-cyan-500/10 border-cyan-500/25'
                  : 'text-white/30 bg-white/5 border-white/10'
              }`}>
                {edgeLighting ? 'ON' : 'OFF'}
              </span>
            </div>
            <p className="text-[9px] font-mono text-white/40 tracking-tight mt-0.5">
              Mode: <span className="text-white/70 capitalize">{edgeLightingMode}</span> • Source: <span className="text-cyan-300 capitalize">{edgeLightingColorSource || 'cover'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenStudio}
            className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[9px] font-mono uppercase tracking-wider border border-white/10 cursor-pointer transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          >
            Studio Pro
          </button>
          
          <button
            type="button"
            onClick={onToggleEdgeLighting}
            aria-pressed={edgeLighting}
            aria-label="Toggle Screen Edge Lighting"
            className={`w-11 h-6 rounded-full transition-all duration-300 p-0.5 flex items-center shrink-0 cursor-pointer border focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
              edgeLighting 
                ? 'bg-cyan-500 border-cyan-400 justify-end shadow-[0_0_12px_rgba(6,182,212,0.4)]' 
                : 'bg-white/10 border-white/15 justify-start'
            }`}
          >
            <motion.div 
              layout 
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={`w-4 h-4 rounded-full ${edgeLighting ? 'bg-black shadow-sm' : 'bg-white/60'}`} 
            />
          </button>
        </div>
      </div>

      {/* Color Source Selector (Dominant / Cover Artwork / Adaptive / Custom) */}
      <div className="flex items-center gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
        {COLOR_SOURCES.map((src) => {
          const isSelected = (edgeLightingColorSource || 'dominant') === src.id;
          return (
            <button
              key={src.id}
              type="button"
              onClick={() => onSetColorSource(src.id)}
              className={`flex-1 py-1 rounded-lg text-[8px] font-mono uppercase tracking-wider transition-all border cursor-pointer text-center focus:outline-none ${
                isSelected
                  ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300 font-bold'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              {src.label}
            </button>
          );
        })}
      </div>

      {/* Lighting Mode Quick Chips */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 pt-0.5">
        {LIGHTING_MODES.map((m) => {
          const isSelected = edgeLightingMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSetMode(m.id)}
              className={`py-1 px-1 rounded-lg text-[8px] font-mono uppercase transition-all border text-center cursor-pointer focus:outline-none ${
                isSelected
                  ? 'bg-white/20 border-white/40 text-white font-bold shadow-sm'
                  : 'bg-white/[0.02] border-white/[0.04] text-white/40 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
