"use client";

import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

// ============================================================================
// APPLE-GRADE DESIGN SYSTEM PRIMITIVES & TOKENS
// ============================================================================

/**
 * 1. Typography Hierarchy Tokens
 */
export const typography = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, system-ui, sans-serif',
  display: 'text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white',
  heading: 'text-xl sm:text-2xl font-semibold tracking-tight text-white',
  subheading: 'text-base sm:text-lg font-medium text-white/90',
  body: 'text-sm font-normal text-white/80 leading-relaxed',
  secondary: 'text-xs text-white/50 leading-normal',
  metadata: 'text-[11px] font-mono text-white/40 tracking-wider',
  caption: 'text-[10px] uppercase tracking-widest text-white/40 font-semibold',
};

/**
 * 2. Surface Hierarchy Primitives
 */
export type SurfaceLevel = 'base' | 'primary' | 'secondary' | 'floating' | 'modal' | 'glass';

interface AppleSurfaceProps extends HTMLMotionProps<'div'> {
  level?: SurfaceLevel;
  interactive?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const AppleSurface = forwardRef<HTMLDivElement, AppleSurfaceProps>(
  ({ level = 'primary', interactive = false, className = '', children, ...props }, ref) => {
    let surfaceClass = 'bg-zinc-950/60 border border-white/[0.06]';

    switch (level) {
      case 'base':
        surfaceClass = 'bg-[#060608] border-transparent';
        break;
      case 'primary':
        surfaceClass = 'bg-zinc-900/40 border border-white/[0.06] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.3)]';
        break;
      case 'secondary':
        surfaceClass = 'bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12]';
        break;
      case 'floating':
        surfaceClass = 'bg-zinc-900/80 border border-white/[0.12] backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.5)]';
        break;
      case 'modal':
        surfaceClass = 'bg-zinc-950/90 border border-white/[0.14] backdrop-blur-3xl shadow-[0_24px_80px_rgba(0,0,0,0.7)]';
        break;
      case 'glass':
        surfaceClass = 'bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl shadow-lg';
        break;
    }

    return (
      <motion.div
        ref={ref}
        whileHover={interactive ? { scale: 1.005 } : undefined}
        whileTap={interactive ? { scale: 0.99 } : undefined}
        transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
        className={`rounded-2xl transition-colors ${surfaceClass} ${className}`}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
AppleSurface.displayName = 'AppleSurface';

/**
 * 3. Tactile Button Primitive
 */
export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'glass';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface AppleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export const AppleButton = forwardRef<HTMLButtonElement, AppleButtonProps>(
  ({ variant = 'secondary', size = 'md', icon, iconRight, className = '', children, disabled, ...props }, ref) => {
    let variantClass = 'bg-white/10 text-white hover:bg-white/15 border border-white/10';
    
    switch (variant) {
      case 'primary':
        variantClass = 'bg-white text-black font-semibold hover:bg-white/90 shadow-md shadow-white/10 border-transparent';
        break;
      case 'secondary':
        variantClass = 'bg-white/[0.08] text-white/90 hover:text-white hover:bg-white/[0.14] border border-white/[0.08]';
        break;
      case 'tertiary':
        variantClass = 'bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05] border-transparent';
        break;
      case 'destructive':
        variantClass = 'bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/20';
        break;
      case 'glass':
        variantClass = 'bg-white/[0.05] backdrop-blur-md text-white hover:bg-white/[0.10] border border-white/[0.12]';
        break;
    }

    let sizeClass = 'px-4 py-2 text-xs rounded-xl gap-2';
    if (size === 'sm') sizeClass = 'px-3 py-1.5 text-[11px] rounded-lg gap-1.5';
    if (size === 'lg') sizeClass = 'px-6 py-3 text-sm rounded-2xl gap-2.5 font-medium';

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer select-none active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100 ${variantClass} ${sizeClass} ${className}`}
        {...props}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        {children && <span>{children}</span>}
        {iconRight && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  }
);
AppleButton.displayName = 'AppleButton';

/**
 * 4. Tactile Icon Button
 */
interface AppleIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const AppleIconButton = forwardRef<HTMLButtonElement, AppleIconButtonProps>(
  ({ size = 'md', active = false, className = '', children, disabled, ...props }, ref) => {
    let sizeClass = 'w-9 h-9 text-sm rounded-xl';
    if (size === 'sm') sizeClass = 'w-7 h-7 text-xs rounded-lg';
    if (size === 'lg') sizeClass = 'w-11 h-11 text-base rounded-2xl';

    const activeClass = active 
      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40' 
      : 'bg-white/[0.04] hover:bg-white/[0.1] text-white/60 hover:text-white border-white/[0.06]';

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`inline-flex items-center justify-center transition-all duration-150 cursor-pointer border select-none active:scale-[0.96] disabled:opacity-30 disabled:pointer-events-none ${sizeClass} ${activeClass} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
AppleIconButton.displayName = 'AppleIconButton';

/**
 * 5. Apple Segmented Control (Sliding Capsule Tab Bar)
 */
interface SegmentOption<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
}

interface AppleSegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function AppleSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: AppleSegmentedControlProps<T>) {
  return (
    <div className={`p-1 bg-black/40 border border-white/[0.08] rounded-xl flex items-center gap-1 ${className}`}>
      {options.map((opt) => {
        const isSelected = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`relative flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer select-none ${
              isSelected ? 'text-white font-semibold' : 'text-white/40 hover:text-white/80'
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId="apple-segmented-pill"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                className="absolute inset-0 bg-white/[0.12] border border-white/[0.15] rounded-lg shadow-sm"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {opt.icon}
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * 6. Apple Tactile Slider
 */
interface AppleSliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
  valueDisplay?: string;
  accentColor?: string;
  className?: string;
}

export function AppleSlider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  label,
  valueDisplay,
  accentColor = 'bg-cyan-400',
  className = '',
}: AppleSliderProps) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <div className={`space-y-1.5 ${className}`}>
      {(label || valueDisplay) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="text-white/70 font-medium">{label}</span>}
          {valueDisplay && <span className="text-white/40 font-mono text-[11px]">{valueDisplay}</span>}
        </div>
      )}
      <div className="relative h-2 bg-white/[0.08] hover:bg-white/[0.12] rounded-full cursor-pointer transition-all flex items-center group">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div
          className={`h-full rounded-full transition-all duration-75 ${accentColor}`}
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-white shadow-md border border-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -translate-x-1/2"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * 7. Apple Tactile Switch / Toggle
 */
interface AppleToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function AppleToggle({ checked, onChange, disabled, className = '' }: AppleToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors duration-200 p-0.5 flex items-center cursor-pointer border select-none ${
        checked ? 'bg-cyan-500 border-cyan-400 justify-end' : 'bg-white/10 border-white/15 justify-start'
      } ${disabled ? 'opacity-40 pointer-events-none' : ''} ${className}`}
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`w-5 h-5 rounded-full shadow-sm ${checked ? 'bg-black' : 'bg-white'}`}
      />
    </button>
  );
}

/**
 * 8. Apple Native Search & Text Input
 */
interface AppleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  className?: string;
}

export const AppleInput = forwardRef<HTMLInputElement, AppleInputProps>(
  ({ icon, clearable, onClear, value, className = '', ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {icon && <span className="absolute left-3.5 text-white/30 pointer-events-none">{icon}</span>}
        <input
          ref={ref}
          value={value}
          className={`w-full bg-white/[0.04] border border-white/[0.08] focus:border-cyan-400/60 focus:bg-white/[0.07] rounded-xl py-2.5 ${
            icon ? 'pl-10' : 'pl-3.5'
          } ${clearable ? 'pr-9' : 'pr-3.5'} text-xs text-white placeholder:text-white/30 focus:outline-none transition-all duration-150 ${className}`}
          {...props}
        />
        {clearable && value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 p-0.5 text-white/40 hover:text-white transition-colors rounded-full"
          >
            ✕
          </button>
        )}
      </div>
    );
  }
);
AppleInput.displayName = 'AppleInput';
