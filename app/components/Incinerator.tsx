"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  glint: boolean;
}

export const useIncinerator = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const requestRef = useRef<number | null>(null);

  const incinerate = useCallback(async (element: HTMLElement) => {
    // 1. Snapshot
    const rect = element.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Use a temporary canvas to get pixel data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    // Snapshot logic
    try {
      // For simple text blocks, we can just style the temp canvas
      const style = window.getComputedStyle(element);
      ctx.fillStyle = style.backgroundColor === 'transparent' ? 'rgba(255,255,255,0.05)' : style.backgroundColor;
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = style.color || '#ffffff';
      ctx.font = style.font || '16px serif';
      const text = element.innerText || "";
      const lines = text.split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(line, 10, 24 + i * 20);
      });
    } catch (e) {
      console.warn("Snapshot failed, using generic fragmentation", e);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(0, 0, width, height);
    }

    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    const newParticles: Particle[] = [];
    const step = 4; 

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const i = (y * width + x) * 4;
        const alpha = pixels[i + 3];
        if (alpha > 20) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          
          const maxLife = 600 + Math.random() * 1000;
          newParticles.push({
            x: rect.left + x,
            y: rect.top + y,
            vx: (Math.random() - 0.5) * 6, // Initial burst
            vy: (Math.random() - 0.5) * 6 - 2, // Slight upward pop
            size: 1 + Math.random() * 2,
            color: `rgba(${r}, ${g}, ${b}, ${alpha / 255})`,
            life: maxLife,
            maxLife,
            glint: Math.random() > 0.96
          });
        }
      }
    }

    particlesRef.current = [...particlesRef.current, ...newParticles];

    // Sound - Searing Effect (Noise + Sine Sweep)
    const playSound = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // 1. White Noise Buffer
        const bufferSize = audioCtx.sampleRate * 1.2;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = audioCtx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(1000, audioCtx.currentTime);
        noiseFilter.frequency.exponentialRampToValueAtTime(8000, audioCtx.currentTime + 1.2);

        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

        // 2. Sine Sweep (The "Sizzle")
        const oscillator = audioCtx.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(6000, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.8);

        const sineGain = audioCtx.createGain();
        sineGain.gain.setValueAtTime(0.02, audioCtx.currentTime);
        sineGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);

        const panner = audioCtx.createStereoPanner();
        panner.pan.setValueAtTime(0, audioCtx.currentTime);
        panner.pan.linearRampToValueAtTime(0.8, audioCtx.currentTime + 1.2);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(panner);

        oscillator.connect(sineGain);
        sineGain.connect(panner);

        panner.connect(audioCtx.destination);

        noise.start();
        oscillator.start();
        noise.stop(audioCtx.currentTime + 1.2);
        oscillator.stop(audioCtx.currentTime + 1.2);
      } catch (e) {
        console.warn("Audio failed", e);
      }
    };
    playSound();


    window.dispatchEvent(new CustomEvent('maybach-incineration-start'));
    
    if (!requestRef.current) {
      requestRef.current = requestAnimationFrame(update);
    }
  }, []);

  const update = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const particles = particlesRef.current;
    if (particles.length === 0) {
      requestRef.current = null;
      window.dispatchEvent(new CustomEvent('maybach-incineration-end'));
      return;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      
      // Physics
      p.vx += 0.22; // Wind toward top-right
      p.vy -= 0.12; // Lift
      p.vy += 0.05; // Gravity
      
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 16;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      // Visuals
      const opacity = p.life / p.maxLife;
      const size = p.size * opacity;
      
      ctx.globalAlpha = opacity;
      if (p.glint) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#ffffff';
      } else {
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 0;
      }
      
      ctx.fillRect(p.x, p.y, size, size);
    }

    requestRef.current = requestAnimationFrame(update);
  }, []);

  return { incinerate, canvasRef };
};

export const IncinerationOverlay = ({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement | null> }) => {
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas 
      ref={canvasRef}
      id="incineration-canvas"
      className="fixed inset-0 pointer-events-none z-[9999]"
    />
  );
};
