"use client";

import React from 'react';
import { Activity } from 'lucide-react';

interface QuickDspSectionProps {
  audioPreset: string;
  onSetAudioPreset: (preset: any) => void;
}

const DSP_PRESETS = [
  { id: 'original', label: 'Original', desc: 'Direct Pass' },
  { id: 'enhanced', label: 'Studio', desc: 'Enhanced' },
  { id: 'immersive', label: 'Spatial', desc: '3D Audio' },
  { id: 'bass-titan', label: '808 Bass', desc: 'Titan' },
  { id: 'vocal-air', label: 'Vocal Air', desc: 'Clarity' },
];

export const QuickDspSection: React.FC<QuickDspSectionProps> = ({
  audioPreset,
  onSetAudioPreset
}) => {
  return (
    <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all backdrop-blur-2xl space-y-2.5 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Activity size={13} className={audioPreset !== 'original' ? 'animate-pulse text-cyan-400' : ''} />
          </div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-white">
            Audio DSP Equalizer
          </span>
        </div>
        
        <span
          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${
            audioPreset === 'immersive'
              ? 'text-purple-300 bg-purple-500/15 border-purple-500/30'
              : audioPreset === 'bass-titan'
              ? 'text-amber-300 bg-amber-500/15 border-amber-500/30'
              : audioPreset === 'vocal-air'
              ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
              : audioPreset === 'enhanced'
              ? 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30'
              : 'text-white/40 bg-white/5 border-white/10'
          }`}
        >
          {audioPreset}
        </span>
      </div>

      {/* 5 DSP Modes */}
      <div className="grid grid-cols-5 gap-1.5">
        {DSP_PRESETS.map((mode) => {
          const isSelected = audioPreset === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onSetAudioPreset(mode.id)}
              aria-pressed={isSelected}
              aria-label={`Audio DSP mode: ${mode.label}`}
              className={`py-1.5 px-1 rounded-xl text-center transition-all border cursor-pointer flex flex-col items-center focus:outline-none focus:ring-1 focus:ring-cyan-500/50 ${
                isSelected
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                  : 'bg-white/[0.02] border-white/[0.05] text-white/40 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <span className="text-[9px] font-mono uppercase tracking-wider font-bold">
                {mode.label}
              </span>
              <span className="text-[7px] font-mono text-white/30 truncate mt-0.5">
                {mode.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
