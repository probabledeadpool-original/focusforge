"use client";

import React, { useRef, useState, useCallback } from 'react';
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
  accentColor?: 'amber' | 'cyan' | 'emerald' | 'purple' | 'white';
  valueDisplay?: string;
  presets?: PresetOption[];
  onIconClick?: () => void;
  iconTitle?: string;
  ariaLabel: string;
}

const ACCENT_STYLES = {
  amber: {
    trackFill: 'bg-gradient-to-r from-amber-500 to-amber-400',
    iconColor: 'text-amber-400',
    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]',
    presetActive: 'bg-amber-400/20 border-amber-400/50 text-amber-300 font-bold',
  },
  cyan: {
    trackFill: 'bg-gradient-to-r from-cyan-500 to-cyan-400',
    iconColor: 'text-cyan-400',
    glow: 'shadow-[0_0_15px_rgba(6,182,212,0.3)]',
    presetActive: 'bg-cyan-400/20 border-cyan-400/50 text-cyan-300 font-bold',
  },
  emerald: {
    trackFill: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
    iconColor: 'text-emerald-400',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
    presetActive: 'bg-emerald-400/20 border-emerald-400/50 text-emerald-300 font-bold',
  },
  purple: {
    trackFill: 'bg-gradient-to-r from-purple-500 to-purple-400',
    iconColor: 'text-purple-400',
    glow: 'shadow-[0_0_15px_rgba(168,85,247,0.3)]',
    presetActive: 'bg-purple-400/20 border-purple-400/50 text-purple-300 font-bold',
  },
  white: {
    trackFill: 'bg-white',
    iconColor: 'text-white',
    glow: 'shadow-[0_0_15px_rgba(255,255,255,0.3)]',
    presetActive: 'bg-white/20 border-white/50 text-white font-bold',
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
  accentColor = 'white',
  valueDisplay,
  presets,
  onIconClick,
  iconTitle,
  ariaLabel
}) => {
  const styles = ACCENT_STYLES[accentColor] || ACCENT_STYLES.white;
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const calculateValueFromPointer = useCallback((clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const rawVal = min + pos * (max - min);
    const steppedVal = Math.round(rawVal / step) * step;
    const clamped = Math.max(min, Math.min(max, steppedVal));
    onChange(clamped);
  }, [min, max, step, onChange]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button.slider-icon-btn')) return;

    e.preventDefault();
    setIsDragging(true);
    calculateValueFromPointer(e.clientX);

    const onPointerMove = (moveEvent: PointerEvent) => {
      calculateValueFromPointer(moveEvent.clientX);
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const renderSliderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null)) {
      return React.createElement(icon as any, { size: 18, strokeWidth: 2 });
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-1.5 w-full select-none">
      {/* Thick Pill Capsule Slider (Apple Control Center / Samsung One UI Style) */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        role="slider"
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            onChange(Math.min(max, value + (step * 5)));
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            onChange(Math.max(min, value - (step * 5)));
          }
        }}
        className={`relative w-full h-12 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 transition-all cursor-pointer overflow-hidden flex items-center justify-between px-3.5 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 ${isDragging ? 'scale-[0.99] border-white/30' : ''}`}
      >
        {/* Filled Level Fill */}
        <div
          className={`absolute left-0 top-0 bottom-0 ${styles.trackFill} transition-[width] duration-75 ease-out rounded-r-xl opacity-90`}
          style={{ width: `${percentage}%` }}
        />

        {/* Content Container (Above the filled background) */}
        <div className="relative z-10 flex items-center justify-between w-full pointer-events-none">
          {/* Icon & Label */}
          <div className="flex items-center gap-2.5">
            {onIconClick ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onIconClick();
                }}
                className="slider-icon-btn pointer-events-auto p-1.5 -ml-1 rounded-xl hover:bg-black/20 active:scale-95 transition-all text-white/90 hover:text-white cursor-pointer"
                title={iconTitle}
                aria-label={iconTitle || label}
              >
                {renderSliderIcon()}
              </button>
            ) : (
              <div className="text-white/90 p-1">
                {renderSliderIcon()}
              </div>
            )}
            
            <span className="text-[11px] font-sans font-semibold tracking-wide text-white/90 mix-blend-difference drop-shadow-sm">
              {label}
            </span>
          </div>

          {/* Value Display */}
          <span className="text-xs font-mono font-bold text-white/90 mix-blend-difference drop-shadow-sm px-1.5">
            {valueDisplay || `${value}%`}
          </span>
        </div>
      </div>

      {/* Preset Quick Chips */}
      {presets && presets.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5 px-0.5">
          {presets.map((preset) => {
            const isSelected = value === preset.val;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange(preset.val)}
                className={`py-1 rounded-xl text-[9px] font-mono uppercase tracking-wider transition-all border cursor-pointer text-center focus:outline-none focus:ring-1 focus:ring-cyan-500/50 ${
                  isSelected
                    ? styles.presetActive
                    : 'bg-white/[0.03] border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.08]'
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
