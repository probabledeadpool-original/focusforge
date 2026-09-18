"use client";

import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface QuickActionTileProps {
  icon: LucideIcon;
  label: string;
  sublabel: string;
  isActive: boolean;
  onClick: () => void;
  activeColor?: 'cyan' | 'emerald' | 'amber' | 'purple' | 'rose';
  badge?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

const COLOR_STYLES = {
  cyan: {
    activeBg: 'bg-cyan-500/15 border-cyan-400/40 text-white shadow-[0_0_20px_rgba(6,182,212,0.15)]',
    iconActive: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30 shadow-[0_0_10px_rgba(6,182,212,0.4)]',
    badgeActive: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
  },
  emerald: {
    activeBg: 'bg-emerald-500/15 border-emerald-400/40 text-white shadow-[0_0_20px_rgba(16,185,129,0.15)]',
    iconActive: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30 shadow-[0_0_10px_rgba(16,185,129,0.4)]',
    badgeActive: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  },
  amber: {
    activeBg: 'bg-amber-500/15 border-amber-400/40 text-white shadow-[0_0_20px_rgba(245,158,11,0.15)]',
    iconActive: 'bg-amber-500/20 text-amber-300 border-amber-400/30 shadow-[0_0_10px_rgba(245,158,11,0.4)]',
    badgeActive: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
  },
  purple: {
    activeBg: 'bg-purple-500/15 border-purple-400/40 text-white shadow-[0_0_20px_rgba(168,85,247,0.15)]',
    iconActive: 'bg-purple-500/20 text-purple-300 border-purple-400/30 shadow-[0_0_10px_rgba(168,85,247,0.4)]',
    badgeActive: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
  },
  rose: {
    activeBg: 'bg-rose-500/15 border-rose-400/40 text-white shadow-[0_0_20px_rgba(244,63,94,0.15)]',
    iconActive: 'bg-rose-500/20 text-rose-300 border-rose-400/30 shadow-[0_0_10px_rgba(244,63,94,0.4)]',
    badgeActive: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
  }
};

export const QuickActionTile: React.FC<QuickActionTileProps> = ({
  icon: Icon,
  label,
  sublabel,
  isActive,
  onClick,
  activeColor = 'cyan',
  badge,
  disabled = false,
  ariaLabel
}) => {
  const styles = COLOR_STYLES[activeColor];

  return (
    <motion.button
      type="button"
      whileHover={disabled ? {} : { scale: 1.015 }}
      whileTap={disabled ? {} : { scale: 0.985 }}
      transition={{ duration: 0.15 }}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={ariaLabel || `${label}: ${isActive ? 'Active' : 'Inactive'}`}
      className={`p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between gap-3 w-full cursor-pointer relative overflow-hidden backdrop-blur-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
        disabled 
          ? 'opacity-40 cursor-not-allowed bg-white/[0.02] border-white/5 text-white/30' 
          : isActive 
          ? `${styles.activeBg}` 
          : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08] hover:border-white/20 text-white/80'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div 
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
            isActive 
              ? styles.iconActive 
              : 'bg-white/[0.05] border-white/10 text-white/50'
          }`}
        >
          <Icon size={16} strokeWidth={2} />
        </div>
        
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-white truncate block">
              {label}
            </span>
          </div>
          <span className="text-[9px] font-mono text-white/40 tracking-tight block truncate mt-0.5">
            {sublabel}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {badge && (
          <span 
            className={`text-[8px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full font-bold border transition-colors ${
              isActive 
                ? styles.badgeActive 
                : 'bg-white/5 border-white/10 text-white/40'
            }`}
          >
            {badge}
          </span>
        )}
        
        {/* Toggle Pill Dot Indicator */}
        <div 
          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
            isActive 
              ? 'border-white/60 bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]' 
              : 'border-white/20 bg-transparent'
          }`}
        >
          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
        </div>
      </div>
    </motion.button>
  );
};
