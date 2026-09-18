"use client";

import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Disc } from 'lucide-react';
import { useFrequencyStore, AudioEnhancementPreset } from '@/hooks/useFrequencyStore';

interface QuickNowPlayingCardProps {
  onOpenStudio?: () => void;
}

const DSP_PRESET_NAMES: Record<AudioEnhancementPreset, string> = {
  original: 'Pure Bypass',
  enhanced: 'Studio EQ',
  immersive: 'Spatial 3D',
  'bass-titan': '808 Bass',
  'vocal-air': 'Vocal Air',
};

export const QuickNowPlayingCard: React.FC<QuickNowPlayingCardProps> = ({ onOpenStudio }) => {
  const store = useFrequencyStore();
  const currentTrack = store.getCurrentTrack();

  return (
    <div className="w-full p-3.5 rounded-2xl bg-white/[0.06] border border-white/10 hover:border-white/20 transition-all backdrop-blur-2xl flex flex-col gap-3 shadow-lg select-none">
      {/* Top Header & Track Details */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Album Art / Vinyl Indicator */}
          <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/15 bg-black/40 shadow-inner flex items-center justify-center">
            {currentTrack?.thumbnail ? (
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title || "Track Artwork"}
                className={`w-full h-full object-cover ${store.isPlaying ? 'animate-spin-slow' : ''}`}
              />
            ) : (
              <Disc size={22} className={`text-white/40 ${store.isPlaying ? 'animate-spin' : ''}`} />
            )}
            {store.isPlaying && (
              <div className="absolute inset-0 bg-cyan-500/10 pointer-events-none ring-1 ring-inset ring-cyan-400/30" />
            )}
          </div>

          {/* Song Info */}
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-bold text-white tracking-tight truncate">
              {currentTrack?.title || "The Frequency Radio"}
            </span>
            <span className="text-[11px] text-white/50 truncate font-sans">
              {currentTrack?.artist || "Ambient Lo-Fi & Neural Beats"}
            </span>
          </div>
        </div>

        {/* DSP Preset Badge */}
        {onOpenStudio && (
          <button
            type="button"
            onClick={onOpenStudio}
            className="px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[9px] font-mono uppercase tracking-wider text-cyan-300 font-bold transition-all shrink-0 hover:scale-105 active:scale-95 cursor-pointer"
            title="Open Audio Studio"
          >
            {DSP_PRESET_NAMES[store.audioPreset] || 'DSP'}
          </button>
        )}
      </div>

      {/* Progress & Controls Bar */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
        {/* Progress bar line */}
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-cyan-400 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
            style={{
              width: store.duration > 0
                ? `${Math.min(100, Math.max(0, (store.currentTime / store.duration) * 100))}%`
                : store.isPlaying ? '60%' : '0%'
            }}
          />
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              store.previous();
            }}
            className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-all active:scale-90 cursor-pointer"
            title="Previous Track"
            aria-label="Previous Track"
          >
            <SkipBack size={14} fill="currentColor" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              store.togglePlay();
            }}
            className="w-9 h-9 rounded-full bg-white text-black hover:bg-white/90 flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer"
            title={store.isPlaying ? "Pause" : "Play"}
            aria-label={store.isPlaying ? "Pause" : "Play"}
          >
            {store.isPlaying ? (
              <Pause size={16} fill="black" />
            ) : (
              <Play size={16} fill="black" className="ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              store.next();
            }}
            className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-all active:scale-90 cursor-pointer"
            title="Next Track"
            aria-label="Next Track"
          >
            <SkipForward size={14} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
};
