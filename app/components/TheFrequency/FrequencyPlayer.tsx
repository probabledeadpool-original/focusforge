"use client";
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1, Volume2, Sparkles, SlidersHorizontal, Waves, ChevronDown, ChevronUp, Radio } from 'lucide-react';
import { useFrequencyStore } from '../../../hooks/useFrequencyStore';

export default function FrequencyPlayer() {
  const store = useFrequencyStore();
  const current = store.getCurrentTrack();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const grainRef = useRef<HTMLCanvasElement>(null);
  const [screensaverActive, setScreensaverActive] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubProgress, setScrubProgress] = useState<number | null>(null);
  const [showAdvancedAudio, setShowAdvancedAudio] = useState(false);
  const seekPendingRef = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);

  // Dominant color palette fallback
  const primaryColor = current?.dominantColor || '#7c3aed'; // default purple

  const getColorRgba = (hex: string, alpha: number) => {
    const raw = hex.replace('#', '');
    const normalized = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw;
    const bigint = parseInt(normalized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const accentGlow = getColorRgba(primaryColor, 0.32);
  const accentGlowSoft = getColorRgba(primaryColor, 0.14);
  const accentGlowDeep = getColorRgba(primaryColor, 0.08);
  const progressPercent = store.duration > 0 && !Number.isNaN(store.currentTime)
    ? Math.min(100, Math.max(0, (store.currentTime / store.duration) * 100))
    : 0;

  // Synthetic waveform animation with smoother bars and amplitude flow
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const render = () => {
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
      const width = canvas.width;
      const height = canvas.height;
      const center = height * 0.5;
      const time = Date.now() * 0.0025;
      const progress = store.duration > 0 ? store.currentTime / store.duration : 0;

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';

      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, 'rgba(255,255,255,0.03)');
      bgGrad.addColorStop(1, 'rgba(0,0,0,0.1)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      const barCount = Math.max(28, Math.floor(width / 14));
      const barWidth = width / barCount * 0.64;
      const gap = (width - barWidth * barCount) / Math.max(1, barCount - 1);
      const barGradient = ctx.createLinearGradient(0, 0, 0, height);
      barGradient.addColorStop(0, 'rgba(255,255,255,0.85)');
      barGradient.addColorStop(0.25, primaryColor);
      barGradient.addColorStop(1, 'rgba(255,255,255,0.05)');

      ctx.fillStyle = barGradient;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 8;

      for (let i = 0; i < barCount; i += 1) {
        const x = i * (barWidth + gap);
        const wave = Math.sin(time * 1.2 + i * 0.36) * 0.5 + 0.5;
        const dynamic = Math.sin(time * 2.3 + i * 0.18) * 0.25 + 0.75;
        const amplitude = (store.isPlaying ? 0.8 : 0.38) * height * (0.18 + wave * 0.18 + progress * 0.16) * dynamic;
        const y = center - amplitude * 0.5;
        const h = amplitude;
        ctx.fillRect(x, y, barWidth, h);
      }

      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,255,255,${store.isPlaying ? 0.07 : 0.04})`;
      ctx.fillRect(0, center - 2, width, 4);
      ctx.globalCompositeOperation = 'source-over';

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [current, store.isPlaying, store.currentTime, store.duration]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (store.isExpanded) {
        store.setExpanded(false);
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store.isExpanded, store.setExpanded]);

  useEffect(() => {
    const canvas = grainRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const renderGrain = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);

      if (!Number.isFinite(width) || !Number.isFinite(height) || width === 0 || height === 0) {
        animationId = requestAnimationFrame(renderGrain);
        return;
      }

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      const alpha = store.isPlaying ? 16 : 10;

      for (let i = 0; i < data.length; i += 4) {
        const shade = Math.random() * 30;
        data[i] = shade;
        data[i + 1] = shade;
        data[i + 2] = shade;
        data[i + 3] = alpha;
      }
      ctx.putImageData(imageData, 0, 0);

      if (store.isPlaying && Math.random() < 0.04) {
        ctx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.05})`;
        const lines = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < lines; i += 1) {
          const y = Math.random() * height;
          const lineHeight = 2 + Math.random() * 7;
          ctx.fillRect(0, y, width, lineHeight);
        }
      }

      animationId = requestAnimationFrame(renderGrain);
    };

    renderGrain();
    return () => cancelAnimationFrame(animationId);
  }, [store.isPlaying]);

  useEffect(() => {
    const resetIdle = () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
      setScreensaverActive(false);
      idleTimerRef.current = window.setTimeout(() => {
        setScreensaverActive(true);
      }, 14000);
    };

    if (!store.isExpanded) {
      setScreensaverActive(false);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      return;
    }

    resetIdle();
    const events = ['mousemove', 'mousedown', 'touchstart', 'keydown'];
    events.forEach(eventName => window.addEventListener(eventName, resetIdle));

    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      events.forEach(eventName => window.removeEventListener(eventName, resetIdle));
    };
  }, [store.isExpanded]);

  useEffect(() => {
    if (!isScrubbing) return;
    const handlePointerUp = () => {
      if (seekPendingRef.current !== null) {
        store.seek(seekPendingRef.current);
        seekPendingRef.current = null;
      }
      setIsScrubbing(false);
      setScrubProgress(null);
    };

    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, [isScrubbing, store]);

  if (!current) return null;

  return (
    <AnimatePresence>
      {store.isExpanded && (
        <motion.div 
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="fixed inset-0 z-[100] overflow-hidden bg-[#050505]"
        >
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${current.thumbnail})`,
                filter: 'blur(72px) saturate(180%)',
                opacity: screensaverActive ? 0.34 : 0.18,
                transform: screensaverActive ? 'scale(1.02)' : 'scale(1)',
                transition: 'opacity 0.8s ease, transform 20s ease',
              }}
            />
            <div
              className={`absolute inset-0 transition-opacity duration-700 ${screensaverActive ? 'opacity-100' : 'opacity-0'}`}
              style={{
                backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.1), transparent 22%), radial-gradient(circle at 80% 20%, rgba(138,92,255,0.08), transparent 26%)',
              }}
            />
            <div className={"absolute inset-0 " + (screensaverActive ? 'bg-black/16' : 'bg-black/70')} />
          </div>
          <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at center, ${accentGlowSoft}, transparent 45%), linear-gradient(180deg, ${screensaverActive ? 'rgba(0,0,0,0.25) 0%' : 'rgba(0,0,0,0.95) 0%'}, ${screensaverActive ? 'rgba(5,5,5,0.45) 60%' : '#050505 60%'}, ${screensaverActive ? 'rgba(0,0,0,0.55) 100%' : '#000 100%'})` }} />
          <div className="absolute inset-0 pointer-events-none" style={{ filter: 'url(#frequency-glass)' }}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_35%)]" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/75" />
            <div 
              className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] rounded-full opacity-20 blur-[110px]"
              style={{ background: accentGlow }}
            />
            <div 
              className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 w-[420px] h-[420px] rounded-full opacity-16 blur-[90px]"
              style={{ background: accentGlowDeep }}
            />
          </div>

          <canvas ref={grainRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-55" />
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <filter id="frequency-glass">
              <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="3" result="turb" seed="23" />
              <feDisplacementMap in="SourceGraphic" in2="turb" scale="10" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </svg>

          {!screensaverActive && (
            <div className="absolute inset-0 z-20 overflow-y-auto">
              <div className="relative h-full w-full px-4 py-[calc(env(safe-area-inset-top,1rem)+1rem)] sm:px-10">
                <div className="absolute left-4 sm:left-6 top-[calc(env(safe-area-inset-top,0.5rem)+1rem)] flex items-center gap-3 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-white/70 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] z-30">
                  <button onClick={() => store.setExpanded(false)} className="text-xs uppercase tracking-[0.35em] text-white/80 hover:text-white cursor-pointer min-h-[32px] flex items-center">Close</button>
                </div>

                <div className="mx-auto flex max-w-[1400px] flex-col gap-6 sm:gap-8 pt-16 pb-8 lg:px-8">
                  <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1.6fr_0.9fr]">
                    <div className="rounded-[28px] sm:rounded-[40px] border border-white/10 bg-black/40 p-5 sm:p-8 shadow-[0_50px_100px_rgba(0,0,0,0.35)] backdrop-blur-3xl">
                      <div className="grid gap-6 sm:gap-8">
                        <div className="grid gap-6 lg:grid-cols-[360px_1fr] items-center">
                          <div className="aspect-square w-full max-w-[320px] mx-auto lg:max-w-none overflow-hidden rounded-[24px] sm:rounded-[32px] border border-white/10 bg-white/5">
                            <img src={current.thumbnail} alt={current.title} className="h-full w-full object-cover" />
                          </div>
                          <div className="space-y-4 text-center lg:text-left">
                            <div className="text-[10px] uppercase tracking-[0.35em] text-white/30">Now playing</div>
                            <h1 className="text-2xl sm:text-4xl md:text-5xl font-heading font-extrabold tracking-tight text-white">{current.title}</h1>
                            <p className="text-base sm:text-lg text-white/40">{current.artist}</p>
                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 text-[11px] text-white/40">
                              <span>{store.duration ? `${Math.floor(store.duration / 60)}:${Math.floor(store.duration % 60).toString().padStart(2, '0')}` : '0:00 total'}</span>
                              <span>{store.shuffle ? 'Shuffle on' : 'Shuffle off'}</span>
                              <span>{store.repeat !== 'none' ? `Repeat ${store.repeat}` : 'Repeat off'}</span>
                              <div className="w-[1px] h-3 bg-white/10" />
                              <button
                                onClick={() => {
                                  const next = store.audioPreset === 'enhanced' ? 'immersive' : store.audioPreset === 'immersive' ? 'original' : 'enhanced';
                                  store.setAudioPreset(next);
                                }}
                                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-mono uppercase tracking-widest transition-all cursor-pointer ${
                                  store.audioPreset === 'enhanced'
                                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                                    : store.audioPreset === 'immersive'
                                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                                    : 'bg-white/5 border-white/10 text-white/40'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${store.audioPreset === 'original' ? 'bg-white/30' : 'bg-cyan-400 animate-pulse'}`} />
                                <span>{store.audioPreset === 'original' ? 'Audio · Original' : store.audioPreset === 'enhanced' ? 'Audio · Enhanced' : 'Audio · Immersive'}</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[32px] border border-white/10 bg-white/5 p-5">
                          <div className="relative h-3 overflow-hidden rounded-full bg-white/10">
                            <div className="absolute inset-0 bg-white/5" />
                            <div className="absolute inset-y-0 left-0 rounded-full bg-purple-400/80 transition-all duration-200" style={{ width: `${scrubProgress !== null ? scrubProgress : progressPercent}%` }} />
                          </div>
                          <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-white/30">
                            <span>{store.currentTime ? `${Math.floor(store.currentTime / 60)}:${Math.floor(store.currentTime % 60).toString().padStart(2, '0')}` : '0:00'}</span>
                            <span>{store.duration ? `${Math.floor(store.duration / 60)}:${Math.floor(store.duration % 60).toString().padStart(2, '0')}` : '0:00'}</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center justify-center gap-4">
                            <button onClick={() => store.toggleShuffle()} className={`transition-colors ${store.shuffle ? 'text-purple-400' : 'text-white/40 hover:text-white'}`}>
                              <Shuffle size={18} />
                            </button>
                            <button onClick={() => store.previous()} className="text-white/40 hover:text-white transition-colors">
                              <SkipBack size={24} fill="currentColor" />
                            </button>
                            <button onClick={() => store.togglePlay()} className="grid h-14 w-14 place-items-center rounded-full bg-white text-black shadow-lg shadow-black/20 transition-transform hover:scale-105">
                              {store.isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="translate-x-0.5" />}
                            </button>
                            <button onClick={() => store.next()} className="text-white/40 hover:text-white transition-colors">
                              <SkipForward size={24} fill="currentColor" />
                            </button>
                            <button onClick={() => store.cycleRepeat()} className={`transition-colors ${store.repeat !== 'none' ? 'text-purple-400' : 'text-white/40 hover:text-white'}`}>
                              {store.repeat === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
                            </button>
                          </div>
                          <div className="min-w-[220px] space-y-2">
                            <div className="text-[10px] uppercase tracking-[0.25em] text-white/30">Volume</div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/10 cursor-pointer" onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                                store.setVolume(pct);
                              }}>
                              <div className="h-full rounded-full bg-white/40" style={{ width: `${store.volume}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* Audio Enhancement Engine Card */}
                      <div className="rounded-[40px] border border-white/10 bg-black/40 p-6 shadow-[0_40px_100px_rgba(0,0,0,0.35)] backdrop-blur-3xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Waves size={14} className="text-cyan-400" />
                            <span className="text-[11px] uppercase tracking-[0.35em] text-white/40 font-bold">Audio Engine</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border transition-all ${
                              store.audioPreset === 'enhanced'
                                ? 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                                : store.audioPreset === 'immersive'
                                ? 'text-purple-300 bg-purple-500/10 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.25)]'
                                : store.audioPreset === 'bass-titan'
                                ? 'text-amber-300 bg-amber-500/10 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                                : store.audioPreset === 'vocal-air'
                                ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                                : 'text-white/30 bg-white/5 border-white/10'
                            }`}>
                              {store.audioPreset}
                            </span>
                            <button
                              onClick={() => store.setStudioOpen(true)}
                              className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-[8px] font-mono uppercase tracking-widest border border-white/10 cursor-pointer"
                            >
                              Studio
                            </button>
                          </div>
                        </div>

                        {/* Presets Row */}
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                          {[
                            { id: 'original', label: 'Orig' },
                            { id: 'enhanced', label: 'Enh' },
                            { id: 'immersive', label: 'Imm' },
                            { id: 'bass-titan', label: 'Titan' },
                            { id: 'vocal-air', label: 'Vocal' },
                          ].map(mode => (
                            <button
                              key={mode.id}
                              onClick={() => store.setAudioPreset(mode.id as any)}
                              className={`py-2 px-1.5 rounded-xl text-[9px] font-mono uppercase tracking-wider transition-all border cursor-pointer text-center ${
                                store.audioPreset === mode.id
                                  ? 'bg-white text-black font-bold border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                                  : 'bg-white/[0.03] border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.08]'
                              }`}
                            >
                              {mode.label}
                            </button>
                          ))}
                        </div>

                        {/* Advanced Tuning Collapsible */}
                        <div className="pt-2 border-t border-white/5">
                          <button
                            onClick={() => setShowAdvancedAudio(!showAdvancedAudio)}
                            className="w-full flex items-center justify-between text-[10px] font-mono text-white/40 hover:text-white transition-colors py-1 cursor-pointer"
                          >
                            <span className="uppercase tracking-widest flex items-center gap-1.5">
                              <SlidersHorizontal size={11} /> Advanced DSP Matrix
                            </span>
                            {showAdvancedAudio ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>

                          <AnimatePresence>
                            {showAdvancedAudio && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-3 pt-3 overflow-hidden"
                              >
                                {[
                                  { label: 'Bass Dynamics', key: 'bass' as const, val: store.audioParams.bass },
                                  { label: 'Vocal Clarity', key: 'clarity' as const, val: store.audioParams.clarity },
                                  { label: 'Spatial Width', key: 'spatial' as const, val: store.audioParams.spatial },
                                  { label: 'DSP Intensity', key: 'intensity' as const, val: store.audioParams.intensity },
                                ].map((item) => (
                                  <div key={item.key} className="space-y-1">
                                    <div className="flex justify-between text-[9px] font-mono text-white/40">
                                      <span className="uppercase tracking-wider">{item.label}</span>
                                      <span className="text-white/70 font-bold">{item.val}%</span>
                                    </div>
                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      step="1"
                                      value={item.val}
                                      onChange={(e) => store.setAudioParams({ [item.key]: Number(e.target.value) })}
                                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
                                    />
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Visual Effects & Edge Lighting */}
                      <div className="rounded-[40px] border border-white/10 bg-black/40 p-6 shadow-[0_40px_100px_rgba(0,0,0,0.35)] backdrop-blur-3xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles size={14} className="text-cyan-400 animate-pulse" />
                            <span className="text-[11px] uppercase tracking-[0.35em] text-white/40 font-bold">Edge Lighting</span>
                          </div>
                          <button
                            onClick={() => store.setStudioOpen(true)}
                            className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-[8px] font-mono uppercase tracking-widest border border-white/10 cursor-pointer"
                          >
                            Customizer
                          </button>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-xs font-bold text-white tracking-wide flex items-center gap-2">
                                <span>Perimeter LED Aura</span>
                                <span className="text-[8px] font-mono uppercase text-cyan-400">[{store.edgeLightingMode}]</span>
                              </div>
                              <p className="text-[10px] text-white/40 leading-relaxed mt-0.5">
                                Source: <span className="text-white/80 font-bold uppercase">{store.edgeLightingColorSource}</span> • {store.edgeLighting ? 'Active' : 'Off'}
                              </p>
                            </div>
                            <button
                              onClick={() => store.toggleEdgeLighting()}
                              className={`w-12 h-6 rounded-full transition-all duration-300 p-1 flex items-center shrink-0 cursor-pointer border ${
                                store.edgeLighting 
                                  ? 'bg-cyan-500 border-cyan-400 justify-end shadow-[0_0_12px_rgba(6,182,212,0.5)]' 
                                  : 'bg-white/10 border-white/15 justify-start'
                              }`}
                            >
                              <motion.div 
                                layout 
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                className={`w-4 h-4 rounded-full ${store.edgeLighting ? 'bg-black' : 'bg-white/60'}`} 
                              />
                            </button>
                          </div>

                          {/* Color Source Quick Chips */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 border-t border-white/5">
                            {(['dominant', 'cover', 'adaptive', 'custom'] as const).map(source => (
                              <button
                                key={source}
                                onClick={() => store.setEdgeLightingColorSource(source)}
                                className={`py-1.5 px-2 rounded-xl text-[9px] font-mono uppercase tracking-wider transition-all border cursor-pointer text-center ${
                                  store.edgeLightingColorSource === source
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                                    : 'bg-white/[0.02] border-white/10 text-white/40 hover:text-white'
                                }`}
                              >
                                {source === 'dominant' ? '● Dominant' : source === 'cover' ? '● Cover' : source === 'adaptive' ? '○ Adaptive' : '○ Custom'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[40px] border border-white/10 bg-black/40 p-6 shadow-[0_40px_100px_rgba(0,0,0,0.35)] backdrop-blur-3xl">
                        <div className="text-[11px] uppercase tracking-[0.35em] text-white/30 mb-4">Screen saver</div>
                        <p className="text-sm text-white/50">When the screen saver activates, it will fade into a clean album card and title view while keeping playback running.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {screensaverActive && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-10 bg-black/10 backdrop-blur-4xl px-6 py-[calc(env(safe-area-inset-top,1rem)+1rem)] sm:px-10 text-center">
              <div className="grid w-[320px] place-items-center overflow-hidden rounded-[40px] border border-white/10 bg-white/5 p-6 shadow-[0_60px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl md:w-[420px] md:p-8">
                <div className="aspect-square w-full overflow-hidden rounded-[32px] border border-white/10 bg-black shadow-[inset_0_0_50px_rgba(255,255,255,0.03)]">
                  <img src={current.thumbnail} alt={current.title} className="h-full w-full object-cover" />
                </div>
              </div>
              <div className="max-w-3xl">
                <p className="text-[10px] uppercase tracking-[0.4em] text-white/30 mb-4">Screen Saver Mode</p>
                <h1 className="text-5xl md:text-6xl font-heading font-extrabold text-white tracking-tight leading-tight">{current.title}</h1>
                <p className="mt-4 text-base text-white/40">{current.artist}</p>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
