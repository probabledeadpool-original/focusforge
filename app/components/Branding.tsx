"use client";

import React from 'react';

export const MaybachLogo = ({ 
  size = 64, 
  className = "", 
  color = "currentColor",
  glow = true
}: { 
  size?: number; 
  className?: string; 
  color?: string;
  glow?: boolean;
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 500 500" 
    className={`shrink-0 ${className}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="maybachChrome" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="25%" stopColor="#E0E4E8" />
        <stop offset="50%" stopColor="#8A929A" />
        <stop offset="75%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#707882" />
      </linearGradient>
      <linearGradient id="maybachPlatinum" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#A0A8B0" />
        <stop offset="50%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#B4BCC4" />
      </linearGradient>
      <filter id="maybachGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    {/* Outer Rounded Double-Arched Shield / Crest */}
    <path 
      d="M250 36 C340 36 440 90 440 220 C440 340 340 450 250 464 C160 450 60 340 60 220 C60 90 160 36 250 36 Z" 
      stroke="url(#maybachChrome)" 
      strokeWidth="12" 
      fill="rgba(0,0,0,0.5)"
      strokeLinecap="round"
      strokeLinejoin="round"
      filter={glow ? "url(#maybachGlow)" : undefined}
    />

    {/* Inner Precision Crest Inset */}
    <path 
      d="M250 56 C326 56 416 102 416 220 C416 322 328 424 250 438 C172 424 84 322 84 220 C84 102 174 56 250 56 Z" 
      stroke="url(#maybachPlatinum)" 
      strokeWidth="2.5" 
      fill="none"
      opacity="0.6"
    />

    {/* Double-M Monogram Interlocking Geometry */}
    <g transform="translate(0, 10)">
      {/* Outer/Taller Interlocking 'M' */}
      <path
        d="M142 370 L142 165 C142 142 160 128 182 128 C202 128 218 140 228 158 L250 196 L272 158 C282 140 298 128 318 128 C340 128 358 142 358 165 L358 370 M164 370 L164 175 C164 160 174 150 188 150 C200 150 210 158 218 172 L250 228 L282 172 C290 158 300 150 312 150 C326 150 336 160 336 175 L336 370"
        fill="url(#maybachChrome)"
      />

      {/* Inner/Compact Arched Base 'M' */}
      <path
        d="M178 370 L178 220 C178 202 192 190 210 190 C224 190 238 198 245 212 L250 222 L255 212 C262 198 276 190 290 190 C308 190 322 202 322 220 L322 370 M196 370 L196 230 C196 218 204 210 215 210 C223 210 232 216 238 226 L250 248 L262 226 C268 216 277 210 285 210 C296 210 304 218 304 230 L304 370"
        fill="url(#maybachPlatinum)"
      />
    </g>
  </svg>
);

export const MaybachText = ({ 
  className = "", 
  size = "text-5xl",
  subtitle = true
}: { 
  className?: string; 
  size?: string;
  subtitle?: boolean;
}) => (
  <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
    <div 
      className={`${size} font-extrabold tracking-[0.6em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]`} 
      style={{ fontFamily: '"Inter", sans-serif', letterSpacing: '0.45em' }}
    >
      MAYBACH
    </div>
    {subtitle && (
      <div className="text-[9px] font-mono tracking-[0.55em] text-white/40 uppercase mt-1">
        MANUFAKTUR // PROTOCOL
      </div>
    )}
  </div>
);
