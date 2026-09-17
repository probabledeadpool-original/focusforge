"use client";

import React, { useState, useRef } from 'react';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function InteractiveGlassPanel({ children, className = "", ...props }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [hue, setHue] = useState(200);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert to percentages for the radial gradient
    const xPct = (x / rect.width) * 100;
    const yPct = (y / rect.height) * 100;
    
    // Dynamic hue based on horizontal mouse position (Spectrum Bleed)
    const newHue = 200 + (xPct * 1.6); // Shifts from 200 (blue) to ~360 (red/pink)

    setMousePos({ x, y });
    setHue(newHue);
  };

  return (
    <div 
      ref={panelRef}
      className={`glass-panel rounded-3xl ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        '--mouse-x': `${mousePos.x}px`,
        '--mouse-y': `${mousePos.y}px`,
        '--mouse-hue': hue,
      } as React.CSSProperties}
      {...props}
    >
      {/* Dynamic spotlight layer */}
      <div 
        className="glass-spotlight transition-opacity duration-500"
        style={{ opacity: isHovered ? 1 : 0 }}
      />
      
      {/* Dynamic edge bleed layer */}
      <div 
        className="glass-edge-bleed transition-opacity duration-500"
        style={{ opacity: isHovered ? 1 : 0 }}
      />

      {/* Content wrapper */}
      <div className="relative z-20 h-full w-full">
        {children}
      </div>
    </div>
  );
}
