"use client";

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

export interface QuickCircleItem {
  id: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  activeColor?: 'cyan' | 'emerald' | 'amber' | 'purple' | 'white';
  onClick: () => void;
  ariaLabel: string;
  badge?: string;
}

interface QuickCircleGridProps {
  items: QuickCircleItem[];
}

const COLOR_STYLES = {
  cyan: {
    activeCircle: 'bg-cyan-400 text-black border-cyan-300 shadow-[0_0_18px_rgba(6,182,212,0.6)] ring-2 ring-cyan-400/50',
    activeText: 'text-cyan-300 font-bold',
  },
  emerald: {
    activeCircle: 'bg-emerald-400 text-black border-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.6)] ring-2 ring-emerald-400/50',
    activeText: 'text-emerald-300 font-bold',
  },
  amber: {
    activeCircle: 'bg-amber-400 text-black border-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.6)] ring-2 ring-amber-400/50',
    activeText: 'text-amber-300 font-bold',
  },
  purple: {
    activeCircle: 'bg-purple-400 text-black border-purple-300 shadow-[0_0_18px_rgba(168,85,247,0.6)] ring-2 ring-purple-400/50',
    activeText: 'text-purple-300 font-bold',
  },
  white: {
    activeCircle: 'bg-white text-black border-white shadow-[0_0_18px_rgba(255,255,255,0.6)] ring-2 ring-white/50',
    activeText: 'text-white font-bold',
  },
};

export const QuickCircleGrid: React.FC<QuickCircleGridProps> = ({ items }) => {
  return (
    <div className="grid grid-cols-4 gap-y-3.5 gap-x-2 w-full select-none py-1">
      {items.map((item) => {
        const Icon = item.icon;
        const color = COLOR_STYLES[item.activeColor || 'cyan'];

        return (
          <button
            key={item.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              item.onClick();
            }}
            aria-pressed={item.isActive}
            aria-label={item.ariaLabel}
            className="flex flex-col items-center gap-1.5 group cursor-pointer focus:outline-none transition-transform active:scale-90"
          >
            {/* Circular Icon Capsule */}
            <div
              className={`relative w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-200 ${
                item.isActive
                  ? color.activeCircle
                  : 'bg-white/[0.07] border-white/10 text-white/70 hover:text-white hover:bg-white/[0.14] hover:border-white/25 shadow-sm'
              }`}
            >
              <Icon size={19} strokeWidth={item.isActive ? 2.4 : 1.8} />

              {/* Status Badge */}
              {item.badge && (
                <span
                  className={`absolute -top-1 -right-1 text-[7px] font-mono px-1 py-0.2 rounded-full font-bold uppercase tracking-wider ${
                    item.isActive ? 'bg-black text-white' : 'bg-white/20 text-white/70'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </div>

            {/* Label */}
            <span
              className={`text-[10px] font-sans text-center truncate max-w-[70px] leading-tight tracking-tight transition-colors ${
                item.isActive ? color.activeText : 'text-white/60 group-hover:text-white/90'
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
