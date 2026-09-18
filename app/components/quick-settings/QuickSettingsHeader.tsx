"use client";

import React from 'react';
import { SlidersHorizontal, RotateCcw, X, Sparkles, Activity } from 'lucide-react';

interface QuickSettingsHeaderProps {
  onClose: () => void;
  onResetDefaults: () => void;
  activeView?: string;
}

export const QuickSettingsHeader: React.FC<QuickSettingsHeaderProps> = ({
  onClose,
  onResetDefaults,
  activeView = 'home'
}) => {
  return (
    <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-white/[0.08] shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-inner backdrop-blur-xl">
          <SlidersHorizontal size={14} className="text-cyan-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 
              id="quick-settings-title" 
              className="text-xs font-bold font-mono tracking-[0.2em] uppercase text-white"
            >
              Control Center
            </h2>
            <span className="text-[8px] font-mono uppercase tracking-widest text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full font-bold">
              {activeView}
            </span>
          </div>
          <p className="text-[9px] font-mono text-white/40 tracking-wider uppercase mt-0.5">
            System, Audio DSP & Intelligence Core
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onResetDefaults}
          className="h-7 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10 text-[9px] font-mono uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          title="Reset All Controls to Default"
          aria-label="Reset all controls to default"
        >
          <RotateCcw size={11} />
          <span className="hidden sm:inline">Default</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          title="Close Control Center (Esc)"
          aria-label="Close Control Center"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
