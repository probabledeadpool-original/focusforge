"use client";

import React from 'react';
import { Mic, Terminal, Activity } from 'lucide-react';
import { useJarvisStore } from '@/hooks/useJarvisStore';
import { useAppStore } from '@/hooks/useAppStore';

interface QuickSettingsFooterProps {
  onClose: () => void;
}

export const QuickSettingsFooter: React.FC<QuickSettingsFooterProps> = ({ onClose }) => {
  const { openJarvis } = useJarvisStore();
  const { setView } = useAppStore();

  const handleLaunchJarvis = () => {
    onClose();
    openJarvis(undefined, 'fullscreen');
  };

  const handleOpenTerminal = () => {
    onClose();
    setView('terminal');
  };

  return (
    <div className="pt-2.5 mt-auto border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-2 text-[8px] font-mono uppercase tracking-widest text-white/35 shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span>MAYBACH KERNEL ONLINE</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleLaunchJarvis}
          className="hover:text-cyan-300 text-white/60 transition-colors flex items-center gap-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500/50 rounded px-1"
        >
          <Mic size={10} />
          <span>Launch Jarvis</span>
        </button>

        <button
          type="button"
          onClick={handleOpenTerminal}
          className="hover:text-purple-300 text-white/60 transition-colors flex items-center gap-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-500/50 rounded px-1"
        >
          <Terminal size={10} />
          <span>Terminal</span>
        </button>

        <span className="text-white/20 hidden sm:inline">•</span>
        <span className="text-white/30 hidden sm:inline">Ctrl + ,</span>
      </div>
    </div>
  );
};
