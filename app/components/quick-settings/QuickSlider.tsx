"use client";

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PresetOption {
  label: string;
  val: number;
}

interface QuickSliderProps {
  icon: LucideIcon | React.ReactNode;
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (val: number) => void;
  accentColor?: 'amber' | 'cyan' | 'emerald' | 'purple';
  valueDisplay?: string;
  presets?: PresetOption[];
  onIconClick?: () => void;
  iconTitle?: string;
  ariaLabel: string;
}

const ACCENT_STYLES = {
  amber: {
    iconBg: 'bg-amber-400/10 border-amber-400/20 text-amber-400',
    badge: 'text-amber-300 bg-amber-400/10 border-amber-400/25',
    sliderClass: 'accent-amber-400',
    presetActive: 'bg-amber-400/20 border-amber-400/50 text-amber-300 font-bold',
    fillTrack: 'bg-amber-400',
  },
  cyan: {
    iconBg: 'bg-cyan-400/10 border-cyan-400/20 text-cyan-400',
    badge: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/25',
    sliderClass: 'accent-cyan-400',
    presetActive: 'bg-cyan-400/20 border-cyan-400/50 text-cyan-300 font-bold',
    fillTrack: 'bg-cyan-400',
  },
  emerald: {
    iconBg: 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400',
    badge: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/25',
    sliderClass: 'accent-emerald-400',
    presetActive: 'bg-emerald-400/20 border-emerald-400/50 text-emerald-300 font-bold',
    fillTrack: 'bg-emerald-400',
  },
  purple: {
    iconBg: 'bg-purple-400/10 border-purple-400/20 text-purple-400',
    badge: 'text-purple-300 bg-purple-400/10 border-purple-400/25',
    sliderClass: 'accent-purple-400',
    presetActive: 'bg-purple-400/20 border-purple-400/50 text-purple-300 font-bold',
    fillTrack: 'bg-purple-400',
  },
};

export const QuickSlider: React.FC<QuickSliderProps> = ({
  icon,
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  accentColor = 'cyan',
  valueDisplay,
  presets,
  onIconClick,
  iconTitle,
  ariaLabel
}) => {
  const styles = ACCENT_STYLES[accentColor];
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all backdrop-blur-2xl flex flex-col justify-between gap-2.5 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onIconClick ? (
            <button
              type="button"
              onClick={onIconClick}
              className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-colors cursor-pointer ${styles.iconBg} hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-cyan-500/50`}
              title={iconTitle}
              aria-label={iconTitle || label}
            >
              {typeof icon === 'function' ? React.createElement(icon as any, { size: 13 }) : icon}
            </button>
          ) : (
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center border ${styles.iconBg}`}>
              {typeof icon === 'function' ? React.createElement(icon as any, { size: 13 }) : icon}
            </div>
          )}
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/90">
            {label}
          </span>
        </div>

        <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border ${styles.badge}`}>
          {valueDisplay || `${value}%`}
        </span>
      </div>

      {/* Capsule Slider Track */}
      <div className="relative flex items-center h-4 group">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={ariaLabel}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          className={`w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer ${styles.sliderClass} focus:outline-none focus:ring-2 focus:ring-cyan-500/50`}
        />
      </div>

      {/* Quick Presets */}
      {presets && presets.length > 0 && (
        <div className="grid grid-cols-4 gap-1">
          {presets.map((preset) => {
            const isSelected = value === preset.val;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange(preset.val)}
                className={`py-0.5 rounded-lg text-[8px] font-mono uppercase tracking-wider transition-all border cursor-pointer text-center focus:outline-none focus:ring-1 focus:ring-cyan-500/50 ${
                  isSelected
                    ? styles.presetActive
                    : 'bg-white/[0.02] border-white/[0.05] text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
