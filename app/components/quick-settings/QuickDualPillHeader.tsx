"use client";

import React from 'react';
import { Wifi, WifiOff, Mic, MicOff, Radio, ChevronRight, Activity } from 'lucide-react';
import { useJarvisStore } from '../../../hooks/useJarvisStore';

interface QuickDualPillHeaderProps {
  isJarvisActive: boolean;
  onToggleJarvis: () => void;
  isOnline: boolean;
  onOpenVoiceHUD: () => void;
}

export const QuickDualPillHeader: React.FC<QuickDualPillHeaderProps> = ({
  isJarvisActive,
  onToggleJarvis,
  isOnline,
  onOpenVoiceHUD
}) => {
  return (
    <div className="grid grid-cols-2 gap-2.5 w-full select-none">
      {/* Pill 1: J.A.R.V.I.S. Voice HUD Launcher */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenVoiceHUD();
        }}
        className="h-14 p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2 shadow-md cursor-pointer text-left group bg-white/[0.06] border-white/10 hover:border-cyan-400/50 hover:bg-cyan-500/10"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 group-hover:bg-cyan-400 group-hover:text-black">
            <Radio size={16} strokeWidth={2.4} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-white tracking-tight truncate flex items-center gap-1.5">
              Voice HUD
            </span>
            <span className="text-[10px] text-cyan-300/90 font-mono tracking-wider truncate">
              Launch Copilot
            </span>
          </div>
        </div>
        <ChevronRight size={14} className="text-white/40 group-hover:text-white" />
      </button>

      {/* Pill 2: J.A.R.V.I.S. Neural Core & Wake Word */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleJarvis();
        }}
        aria-pressed={isJarvisActive}
        className={`h-14 p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2 shadow-md cursor-pointer text-left group ${
          isJarvisActive
            ? 'bg-cyan-500/15 border-cyan-400/50 shadow-[0_0_16px_rgba(6,182,212,0.2)]'
            : 'bg-white/[0.06] border-white/10 hover:border-white/20'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
              isJarvisActive
                ? 'bg-cyan-400 text-black shadow-[0_0_14px_rgba(6,182,212,0.6)]'
                : 'bg-white/10 text-white/60 group-hover:text-white'
            }`}
          >
            {isJarvisActive ? <Mic size={16} strokeWidth={2.4} /> : <MicOff size={16} />}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-white tracking-tight truncate flex items-center gap-1">
              J.A.R.V.I.S.
              {isJarvisActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />}
            </span>
            <span className={`text-[10px] font-mono tracking-wider truncate ${isJarvisActive ? 'text-cyan-300 font-semibold' : 'text-white/40'}`}>
              {isJarvisActive ? 'Hotword: ON' : 'Voice Standby'}
            </span>
          </div>
        </div>

        <div
          onClick={(e) => {
            e.stopPropagation();
            onOpenVoiceHUD();
          }}
          className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
          title="Open Full Voice HUD"
        >
          <ChevronRight size={14} />
        </div>
      </button>
    </div>
  );
};

