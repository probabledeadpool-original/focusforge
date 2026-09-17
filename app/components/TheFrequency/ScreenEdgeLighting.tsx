"use client";

import React, { useEffect, useRef } from 'react';
import { useFrequencyStore, EdgeLightingMode, EdgeLightingColorTheme } from '../../../hooks/useFrequencyStore';
import { useAppStore } from '../../../hooks/useAppStore';
import { AudioEnhancementEngine, SemanticAudioSignals } from './AudioEnhancementEngine';

// ============================================================================
// COLOR UTILITIES: Spherical HSL & RGB Color Memory Interpolation
// ============================================================================

type RGB = [number, number, number];
type HSL = [number, number, number];

function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  const normalized = clean.length === 3 
    ? clean.split('').map(c => c + c).join('') 
    : clean;
  const num = parseInt(normalized, 16);
  if (isNaN(num)) return [99, 102, 241]; // Fallback Indigo
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): RGB {
  h = ((h % 1.0) + 1.0) % 1.0;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Organic Spherical HSL Transition with Shortest-Arc Hue Interpolation
function interpolateHsl(c1: HSL, c2: HSL, factor: number): HSL {
  let [h1, s1, l1] = c1;
  const [h2, s2, l2] = c2;
  
  // Shortest angle rotation
  let dh = h2 - h1;
  if (dh > 0.5) dh -= 1.0;
  if (dh < -0.5) dh += 1.0;
  
  const h = ((h1 + dh * factor) % 1.0 + 1.0) % 1.0;
  const s = s1 + (s2 - s1) * factor;
  const l = l1 + (l2 - l1) * factor;
  return [h, s, l];
}

// Dynamic Musical Palette Archetypes
interface PaletteArchetype {
  primary: HSL;
  secondary: HSL;
  tertiary: HSL;
}

const PALETTES: Record<'deepBass' | 'warmVocals' | 'etherealAir' | 'energeticElectronic' | 'minimalAmbient', PaletteArchetype> = {
  deepBass: {
    primary: [0.65, 0.85, 0.45],   // Electric Indigo
    secondary: [0.72, 0.90, 0.50], // Deep Violet
    tertiary: [0.60, 0.90, 0.25],  // Midnight Blue
  },
  warmVocals: {
    primary: [0.08, 0.92, 0.52],   // Golden Amber
    secondary: [0.03, 0.90, 0.50], // Warm Coral Red
    tertiary: [0.12, 0.85, 0.42],  // Deep Warm Ochre
  },
  etherealAir: {
    primary: [0.78, 0.88, 0.55],   // Vivid Magenta
    secondary: [0.60, 0.85, 0.55], // Celestial Blue
    tertiary: [0.85, 0.75, 0.48],  // Orchid Lilac
  },
  energeticElectronic: {
    primary: [0.52, 0.98, 0.50],   // Cyan Neon
    secondary: [0.70, 0.90, 0.55], // Electric Violet
    tertiary: [0.45, 0.95, 0.46],  // Emerald Mint
  },
  minimalAmbient: {
    primary: [0.58, 0.45, 0.35],   // Soft Slate Teal
    secondary: [0.62, 0.60, 0.28], // Deep Ocean Mist
    tertiary: [0.55, 0.30, 0.20],  // Obsidian Navy
  },
};

// Curated Preset Color Maps
const THEME_PALETTES: Record<Exclude<EdgeLightingColorTheme, 'adaptive'>, PaletteArchetype> = {
  cyberpunk: {
    primary: [0.52, 0.98, 0.50],   // Electric Cyan
    secondary: [0.92, 0.95, 0.55], // Neon Magenta
    tertiary: [0.72, 0.90, 0.50],  // Violet
  },
  midnight: {
    primary: [0.72, 0.85, 0.55],   // Ultraviolet
    secondary: [0.60, 0.90, 0.50], // Deep Indigo
    tertiary: [0.82, 0.75, 0.45],  // Midnight Rose
  },
  solar: {
    primary: [0.10, 0.95, 0.50],   // Amber Gold
    secondary: [0.01, 0.90, 0.52], // Crimson Flame
    tertiary: [0.14, 0.90, 0.42],  // Ochre Light
  },
  emerald: {
    primary: [0.44, 0.90, 0.46],   // Hyper Emerald
    secondary: [0.50, 0.95, 0.48], // Mint Cyan
    tertiary: [0.38, 0.80, 0.40],  // Jade Deep
  },
  prismatic: {
    primary: [0.0, 0.95, 0.55],    // Red
    secondary: [0.52, 0.95, 0.50], // Cyan
    tertiary: [0.78, 0.95, 0.55],  // Purple
  },
  ice: {
    primary: [0.58, 0.20, 0.92],   // Diamond White
    secondary: [0.58, 0.80, 0.75], // Arctic Sky
    tertiary: [0.60, 0.50, 0.60],  // Frost Blue
  },
};

export interface ExtractedCoverPalette {
  primary: HSL;
  secondary: HSL;
  accent: HSL;
  ambient: HSL;
  highlight: HSL;
}

const artworkPaletteCache = new Map<string, ExtractedCoverPalette>();

// ============================================================================
// CONTINUOUS EDGE LIGHTING ENGINE COMPONENT
// ============================================================================

/**
 * ScreenEdgeLighting
 * 
 * Rebuilt from scratch: A continuous mathematical atmospheric field surrounding
 * the entire display with physical attack/decay dynamics and cognitive color memory.
 * Features first-class Cover Color Lighting, Adaptive Music Reactivity, and Custom Themes.
 */
export default function ScreenEdgeLighting() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const store = useFrequencyStore();
  const isVideoPlaying = useAppStore(s => s.isVideoPlaying);
  const currentTrack = store.getCurrentTrack();

  // Internal Physical Simulation & Memory State
  const simRef = useRef({
    masterLuminance: 0,       // Global smooth alpha (0 to 1)
    
    // Physics Envelope Followers (asymmetrical attack/decay)
    bassEnv: 0.1,
    midEnv: 0.1,
    highEnv: 0.1,
    transientEnv: 0.0,
    intensityEnv: 0.1,

    // Smooth OKLab/HSL Color State with Heavy Inertia Memory
    primaryHsl: [0.65, 0.85, 0.45] as HSL,
    secondaryHsl: [0.72, 0.90, 0.50] as HSL,
    tertiaryHsl: [0.60, 0.90, 0.25] as HSL,
    accentHsl: [0.52, 0.95, 0.50] as HSL,

    targetPrimaryHsl: [0.65, 0.85, 0.45] as HSL,
    targetSecondaryHsl: [0.72, 0.90, 0.50] as HSL,
    targetTertiaryHsl: [0.60, 0.90, 0.25] as HSL,
    targetAccentHsl: [0.52, 0.95, 0.50] as HSL,

    // Cover Art 5-Color Extracted Cache
    currentCoverPalette: null as ExtractedCoverPalette | null,

    // Temporal Flow Accumulators
    flowPhase: 0,
    ambientPhase: 0,
    ripplePositions: [] as { s: number; intensity: number; life: number }[],

    lastTime: 0,
  });

  // Dynamic Live Dominant Color Extractor (Updates every 5 seconds)
  useEffect(() => {
    const colorSource = store.edgeLightingColorSource;
    const theme = store.edgeLightingColorTheme;

    // 1. Custom Color Theme Mode
    if (colorSource === 'custom') {
      const p = THEME_PALETTES[theme === 'adaptive' ? 'cyberpunk' : theme] || THEME_PALETTES.cyberpunk;
      simRef.current.targetPrimaryHsl = p.primary;
      simRef.current.targetSecondaryHsl = p.secondary;
      simRef.current.targetTertiaryHsl = p.tertiary;
      simRef.current.targetAccentHsl = p.secondary;
      return;
    }

    const sampleContentDominantColor = () => {
      if (typeof window === 'undefined') return;

      // A. Attempt to sample directly from active HTML5 <video> elements on page
      const videos = Array.from(document.querySelectorAll('video')) as HTMLVideoElement[];
      const activeVideo = videos.find(v => !v.paused && v.readyState >= 2 && v.videoWidth > 0);

      if (activeVideo) {
        try {
          const off = document.createElement('canvas');
          off.width = 16;
          off.height = 16;
          const ctx = off.getContext('2d');
          if (ctx) {
            ctx.drawImage(activeVideo, 0, 0, 16, 16);
            const data = ctx.getImageData(0, 0, 16, 16).data;
            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            let maxSat = 0, vibR = 99, vibG = 102, vibB = 241;

            for (let i = 0; i < data.length; i += 4) {
              const r = data[i], g = data[i + 1], b = data[i + 2];
              rSum += r; gSum += g; bSum += b; count++;
              const [h, s, l] = rgbToHsl(r, g, b);
              if (s > maxSat && l > 0.2 && l < 0.85) {
                maxSat = s;
                vibR = r; vibG = g; vibB = b;
              }
            }

            const primeRgb: RGB = maxSat > 0.25 ? [vibR, vibG, vibB] : [rSum / count, gSum / count, bSum / count];
            const rawHsl = rgbToHsl(...primeRgb);
            const primary: HSL = [
              rawHsl[0],
              Math.min(0.95, Math.max(0.50, rawHsl[1])),
              Math.min(0.60, Math.max(0.35, rawHsl[2]))
            ];
            const secondary: HSL = [
              ((primary[0] + 0.28) % 1.0 + 1.0) % 1.0,
              Math.min(0.95, primary[1]),
              Math.min(0.55, Math.max(0.30, primary[2]))
            ];
            const ambient: HSL = [
              ((primary[0] - 0.22) % 1.0 + 1.0) % 1.0,
              primary[1] * 0.85,
              Math.max(0.22, primary[2] * 0.7)
            ];
            const accent: HSL = [
              ((primary[0] + 0.5) % 1.0 + 1.0) % 1.0,
              0.95,
              0.55
            ];

            simRef.current.targetPrimaryHsl = primary;
            simRef.current.targetSecondaryHsl = secondary;
            simRef.current.targetTertiaryHsl = ambient;
            simRef.current.targetAccentHsl = accent;

            const toHex = (hsl: HSL) => {
              const [r, g, b] = hslToRgb(...hsl);
              return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
            };

            store.setCoverPalette({
              primary: toHex(primary),
              secondary: toHex(secondary),
              accent: toHex(accent),
              ambient: toHex(ambient),
              highlight: toHex([primary[0], 0.8, 0.72]),
            });
            return;
          }
        } catch {
          // Cross-origin fallback below
        }
      }

      // B. Sample from Track Artwork / Dominant Color
      const thumbUrl = currentTrack?.thumbnail;
      const dominantHex = currentTrack?.dominantColor;

      if (thumbUrl) {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = thumbUrl;
        img.onload = () => {
          try {
            const off = document.createElement('canvas');
            off.width = 24;
            off.height = 24;
            const ctx = off.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, 24, 24);
              const data = ctx.getImageData(0, 0, 24, 24).data;
              let rSum = 0, gSum = 0, bSum = 0, count = 0;
              let maxSat = 0, vibR = 99, vibG = 102, vibB = 241, maxLight = 0, brightR = 120, brightG = 150, brightB = 250;

              for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                rSum += r; gSum += g; bSum += b; count++;
                const [h, s, l] = rgbToHsl(r, g, b);
                if (s > maxSat && l > 0.25 && l < 0.85) {
                  maxSat = s;
                  vibR = r; vibG = g; vibB = b;
                }
                if (l > maxLight && l < 0.95 && s > 0.15) {
                  maxLight = l;
                  brightR = r; brightG = g; brightB = b;
                }
              }

              const primeRgb: RGB = maxSat > 0.25 ? [vibR, vibG, vibB] : [rSum / count, gSum / count, bSum / count];
              const rawPrimary = rgbToHsl(...primeRgb);
              
              const primary: HSL = [
                rawPrimary[0],
                Math.min(0.92, Math.max(0.45, rawPrimary[1])),
                Math.min(0.58, Math.max(0.32, rawPrimary[2]))
              ];

              const secondary: HSL = [
                ((primary[0] + 0.28) % 1.0 + 1.0) % 1.0,
                Math.min(0.95, primary[1] * 1.05),
                Math.min(0.55, Math.max(0.30, primary[2] * 0.95))
              ];

              const accent: HSL = [
                rgbToHsl(vibR, vibG, vibB)[0],
                Math.min(0.98, Math.max(0.65, maxSat)),
                0.55
              ];

              const ambient: HSL = [
                ((primary[0] - 0.22) % 1.0 + 1.0) % 1.0,
                Math.min(0.75, primary[1] * 0.85),
                Math.max(0.22, primary[2] * 0.65)
              ];

              const highlight: HSL = [
                rgbToHsl(brightR, brightG, brightB)[0],
                Math.min(0.85, primary[1]),
                0.72
              ];

              const pal: ExtractedCoverPalette = { primary, secondary, accent, ambient, highlight };
              artworkPaletteCache.set(thumbUrl, pal);
              simRef.current.currentCoverPalette = pal;
              simRef.current.targetPrimaryHsl = primary;
              simRef.current.targetSecondaryHsl = secondary;
              simRef.current.targetTertiaryHsl = ambient;
              simRef.current.targetAccentHsl = accent;

              const toHex = (hsl: HSL) => {
                const [r, g, b] = hslToRgb(...hsl);
                return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
              };

              store.setCoverPalette({
                primary: toHex(primary),
                secondary: toHex(secondary),
                accent: toHex(accent),
                ambient: toHex(ambient),
                highlight: toHex(highlight),
              });
            }
          } catch {
            const fallback = rgbToHsl(...hexToRgb(dominantHex || '#6366f1'));
            simRef.current.targetPrimaryHsl = fallback;
          }
        };
        img.onerror = () => {
          const fallback = rgbToHsl(...hexToRgb(dominantHex || '#6366f1'));
          simRef.current.targetPrimaryHsl = fallback;
        };
      } else {
        const base = rgbToHsl(...hexToRgb(dominantHex || (isVideoPlaying ? '#00f0ff' : '#6366f1')));
        simRef.current.targetPrimaryHsl = base;
        simRef.current.targetSecondaryHsl = [((base[0] + 0.3) % 1.0 + 1.0) % 1.0, base[1], base[2]];
        simRef.current.targetTertiaryHsl = [((base[0] - 0.25) % 1.0 + 1.0) % 1.0, base[1] * 0.8, base[2] * 0.7];
        simRef.current.targetAccentHsl = [((base[0] + 0.5) % 1.0 + 1.0) % 1.0, 0.9, 0.55];
      }
    };

    // Initial sample
    sampleContentDominantColor();

    // In dominant mode, re-sample and update live every 5 seconds
    let intervalId: NodeJS.Timeout | null = null;
    if (colorSource === 'dominant') {
      intervalId = setInterval(sampleContentDominantColor, 5000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [currentTrack?.thumbnail, currentTrack?.dominantColor, currentTrack?.id, isVideoPlaying, store.edgeLightingColorSource, store.edgeLightingColorTheme]);

  // Main Render & Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;

    const render = (now: number) => {
      const sim = simRef.current;
      const dt = sim.lastTime ? Math.min((now - sim.lastTime) / 1000, 0.08) : 0.016;
      sim.lastTime = now;

      // 1. Master Enable/Disable Inertia
      const isTargetActive = store.edgeLighting && (store.isPlaying || isVideoPlaying || Boolean(currentTrack));
      const mode: EdgeLightingMode = store.edgeLightingMode;
      const custom = store.customLighting;

      // Calculate Target Luminance based on mode & intensity
      const baseIntensity = mode === 'custom' 
        ? (custom.intensity / 100) 
        : (store.edgeLightingIntensity / 100);
      
      const targetLuminance = isTargetActive ? baseIntensity : 0.0;
      sim.masterLuminance += (targetLuminance - sim.masterLuminance) * (dt * 3.5);

      if (sim.masterLuminance < 0.003) {
        if (canvas.width > 0 && canvas.height > 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        animId = requestAnimationFrame(render);
        return;
      }

      // 2. Viewport auto-resize with DPR support
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      const targetW = Math.floor(w * dpr);
      const targetH = Math.floor(h * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      // 3. Audio Semantic Analysis Acquisition
      const isAudioActive = store.isPlaying || isVideoPlaying;
      const progress = store.duration > 0 ? store.currentTime / store.duration : 0;
      const audio: SemanticAudioSignals = AudioEnhancementEngine.getSpectralEnergy(isAudioActive, store.volume, progress);

      // Mode-specific parameter tuning
      let speedMult = 1.0;
      let spreadMult = store.edgeLightingSpread / 100;
      let bassMultiplier = 1.0;
      let motionFluidity = 1.0;

      if (mode === 'ambient') {
        speedMult = 0.35;
        spreadMult = 1.1;
        bassMultiplier = 0.45;
        motionFluidity = 0.8;
      } else if (mode === 'cinematic') {
        speedMult = 0.25;
        spreadMult = 1.25;
        bassMultiplier = 0.35;
        motionFluidity = 0.5;
      } else if (mode === 'pulse') {
        speedMult = 0.9;
        spreadMult = 0.95;
        bassMultiplier = 1.4;
      } else if (mode === 'flow') {
        speedMult = 1.4;
        spreadMult = 1.0;
      } else if (mode === 'energy') {
        speedMult = 1.6;
        spreadMult = 1.15;
        bassMultiplier = 1.35;
      } else if (mode === 'reactive') {
        speedMult = 1.2;
        spreadMult = 1.0;
        bassMultiplier = 1.25;
      } else if (mode === 'custom') {
        speedMult = (custom.speed / 50);
        spreadMult = (custom.glowSpread / 70);
        bassMultiplier = (custom.bassResponse / 50);
        motionFluidity = (custom.motion / 50);
      }

      // 4. Physical Attack / Decay Envelope Followers
      // Fast Attack (~12ms) -> Slow Decay (~500ms) for physical light persistence
      const rawBass = audio.bassEnergy * bassMultiplier;
      const rawMid = audio.midEnergy;
      const rawHigh = audio.highEnergy;
      const rawTransient = audio.transientEnergy;

      const attackSpeed = 38.0;
      const decaySpeed = mode === 'ambient' ? 2.5 : mode === 'cinematic' ? 1.8 : 4.0;

      sim.bassEnv += (rawBass - sim.bassEnv) * Math.min(dt * (rawBass > sim.bassEnv ? attackSpeed : decaySpeed), 0.6);
      sim.midEnv += (rawMid - sim.midEnv) * Math.min(dt * (rawMid > sim.midEnv ? 24.0 : 3.5), 0.5);
      sim.highEnv += (rawHigh - sim.highEnv) * Math.min(dt * (rawHigh > sim.highEnv ? 42.0 : 5.0), 0.6);
      sim.transientEnv += (rawTransient - sim.transientEnv) * Math.min(dt * (rawTransient > sim.transientEnv ? 48.0 : 6.0), 0.7);
      sim.intensityEnv += (audio.musicalIntensity - sim.intensityEnv) * Math.min(dt * 2.5, 0.2);

      const bass = Math.min(Math.max(sim.bassEnv, 0.02), 2.2);
      const mids = Math.min(Math.max(sim.midEnv, 0.02), 1.8);
      const highs = Math.min(Math.max(sim.highEnv, 0.02), 1.6);
      const transient = Math.min(Math.max(sim.transientEnv, 0.0), 1.0);
      const intensity = Math.min(Math.max(sim.intensityEnv, 0.0), 1.0);

      // Trigger transient ripple pulses in Reactive mode
      if (mode === 'reactive' && transient > 0.55) {
        if (sim.ripplePositions.length < 5) {
          sim.ripplePositions.push({ s: Math.random(), intensity: transient, life: 1.0 });
        }
      }

      // Update transient ripples
      sim.ripplePositions = sim.ripplePositions
        .map(r => ({ ...r, life: r.life - dt * 2.2 }))
        .filter(r => r.life > 0);

      // 5. Color Memory Transitions based on Color Source
      const colorSource = store.edgeLightingColorSource;

      if (colorSource === 'cover' && sim.currentCoverPalette) {
        const pal = sim.currentCoverPalette;
        
        // Music reacts with cover palette:
        // Calm -> Ambient + Primary
        // Bass hit -> Primary brightens and expands
        // Highs/Transients -> Accent color becomes prominent
        const dynamicPrimary: HSL = [
          pal.primary[0],
          pal.primary[1],
          Math.min(0.68, pal.primary[2] + (bass > 0.6 ? 0.08 : 0.0))
        ];

        const dynamicSecondary: HSL = highs > 0.6 || transient > 0.5 
          ? pal.accent 
          : pal.secondary;

        const dynamicTertiary: HSL = intensity > 0.7 
          ? pal.highlight 
          : pal.ambient;

        // Inertia transition (~1.5s to 3s smooth morphing)
        const colorLag = Math.min(dt * 1.8, 0.06);
        sim.primaryHsl = interpolateHsl(sim.primaryHsl, dynamicPrimary, colorLag);
        sim.secondaryHsl = interpolateHsl(sim.secondaryHsl, dynamicSecondary, colorLag);
        sim.tertiaryHsl = interpolateHsl(sim.tertiaryHsl, dynamicTertiary, colorLag);
      } else if (colorSource === 'adaptive') {
        // Dynamically choose target archetype based on musical mood
        let moodArchetype = PALETTES.minimalAmbient;

        if (bass > 0.9 || audio.spectralTilt > 0.4) {
          moodArchetype = PALETTES.deepBass;
        } else if (mids > 0.75 || (mids > bass && mids > highs)) {
          moodArchetype = PALETTES.warmVocals;
        } else if (highs > 0.8 || audio.spectralTilt < -0.3) {
          moodArchetype = PALETTES.etherealAir;
        } else if (intensity > 0.65 || transient > 0.6) {
          moodArchetype = PALETTES.energeticElectronic;
        }

        // Blend mood with base target palette
        const targetP = interpolateHsl(sim.targetPrimaryHsl, moodArchetype.primary, 0.45);
        const targetS = interpolateHsl(sim.targetSecondaryHsl, moodArchetype.secondary, 0.5);
        const targetT = interpolateHsl(sim.targetTertiaryHsl, moodArchetype.tertiary, 0.5);

        // Color inertia (organic drift without sudden flashes)
        const colorLag = Math.min(dt * 0.95, 0.04);
        sim.primaryHsl = interpolateHsl(sim.primaryHsl, targetP, colorLag);
        sim.secondaryHsl = interpolateHsl(sim.secondaryHsl, targetS, colorLag);
        sim.tertiaryHsl = interpolateHsl(sim.tertiaryHsl, targetT, colorLag);
      } else {
        // Custom Selected Color Theme
        const colorLag = Math.min(dt * 2.2, 0.08);
        sim.primaryHsl = interpolateHsl(sim.primaryHsl, sim.targetPrimaryHsl, colorLag);
        sim.secondaryHsl = interpolateHsl(sim.secondaryHsl, sim.targetSecondaryHsl, colorLag);
        sim.tertiaryHsl = interpolateHsl(sim.tertiaryHsl, sim.targetTertiaryHsl, colorLag);
      }

      const pRgb = hslToRgb(...sim.primaryHsl);
      const sRgb = hslToRgb(...sim.secondaryHsl);
      const tRgb = hslToRgb(...sim.tertiaryHsl);

      // 6. Temporal Motion Accumulator
      sim.ambientPhase += dt * (0.45 * speedMult + intensity * 0.2);
      sim.flowPhase += dt * (1.2 * speedMult + bass * 0.8 * motionFluidity);

      const alpha = sim.masterLuminance;

      // 7. Dynamic Penetration Depths (Pixels extending inward into the display)
      // Low intensity: ~18-35px, Climax moments: ~75-120px
      const basePenetration = (24 + spreadMult * 35);
      const bottomDepth = Math.min(h * 0.38, (basePenetration * 1.35 + bass * 40 + transient * 25));
      const topDepth = Math.min(h * 0.26, (basePenetration * 0.85 + highs * 22));
      const sideDepth = Math.min(w * 0.24, (basePenetration * 0.95 + mids * 28));

      // 8. CONTINUOUS PERIMETER RENDERING
      // Multi-layer field: Layer 1 = Broad Soft Penumbra, Layer 2 = Color Body, Layer 3 = Micro Emitter Bezel

      // --- LAYER 1: ATMOSPHERIC PENUMBRA (Ultra-Soft Inward Diffusion Field) ---
      const renderEdgeGradient = (
        x0: number, y0: number, x1: number, y1: number,
        wRect: number, hRect: number,
        colorStart: RGB, colorMid: RGB,
        peakAlpha: number
      ) => {
        const grad = ctx.createLinearGradient(x0, y0, x1, y1);
        grad.addColorStop(0, `rgba(${colorStart[0]}, ${colorStart[1]}, ${colorStart[2]}, ${peakAlpha})`);
        grad.addColorStop(0.25, `rgba(${colorMid[0]}, ${colorMid[1]}, ${colorMid[2]}, ${peakAlpha * 0.55})`);
        grad.addColorStop(0.65, `rgba(${colorMid[0]}, ${colorMid[1]}, ${colorMid[2]}, ${peakAlpha * 0.18})`);
        grad.addColorStop(1.0, `rgba(${colorMid[0]}, ${colorMid[1]}, ${colorMid[2]}, 0)`);

        ctx.fillStyle = grad;
        ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), wRect, hRect);
      };

      // Flow / Orbiting modulation around the 4 edges
      const flowTheta = sim.flowPhase;
      const bottomWave = Math.sin(flowTheta) * 0.5 + 0.5;
      const rightWave = Math.sin(flowTheta + Math.PI * 0.5) * 0.5 + 0.5;
      const topWave = Math.sin(flowTheta + Math.PI) * 0.5 + 0.5;
      const leftWave = Math.sin(flowTheta + Math.PI * 1.5) * 0.5 + 0.5;

      // Mode-specific color mixing
      let bottomColor = pRgb;
      let topColor = sRgb;
      let sideLeftColor = tRgb;
      let sideRightColor = sRgb;

      if (mode === 'spectrum') {
        // Spectrum mapping: Bass on bottom, Mids on sides, Air on top
        bottomColor = pRgb; // Sub/Bass
        sideLeftColor = tRgb; // Low Mids
        sideRightColor = sRgb; // High Mids
        topColor = [Math.round(sRgb[0] * 0.8 + 50), Math.round(sRgb[1] * 0.9 + 50), 255]; // Air Highs
      } else if (mode === 'flow') {
        // Traveling chromatic wave
        const colAt = (offset: number) => {
          const ph = ((flowTheta * 0.16 + offset) % 1.0);
          return hslToRgb(((sim.primaryHsl[0] + ph) % 1.0), sim.primaryHsl[1], sim.primaryHsl[2]);
        };
        bottomColor = colAt(0);
        sideRightColor = colAt(0.25);
        topColor = colAt(0.5);
        sideLeftColor = colAt(0.75);
      } else if (mode === 'pulse') {
        // Uniform physical bass breathing
        bottomColor = pRgb;
        topColor = pRgb;
        sideLeftColor = pRgb;
        sideRightColor = pRgb;
      }

      // Base luminance calculations with physical restraint
      const bottomPeak = Math.min(0.65, (0.28 + bass * 0.22 + transient * 0.15) * alpha);
      const topPeak = Math.min(0.50, (0.20 + highs * 0.18 + (mode === 'flow' ? topWave * 0.12 : 0)) * alpha);
      const leftPeak = Math.min(0.50, (0.22 + mids * 0.18 + (mode === 'flow' ? leftWave * 0.12 : 0)) * alpha);
      const rightPeak = Math.min(0.50, (0.22 + mids * 0.18 + (mode === 'flow' ? rightWave * 0.12 : 0)) * alpha);

      // 1. Bottom Lighting Field (Sub-Bass anchor)
      renderEdgeGradient(0, h, 0, h - bottomDepth, w, bottomDepth, bottomColor, sRgb, bottomPeak);

      // 2. Top Lighting Field (Atmospheric Presence)
      renderEdgeGradient(0, 0, 0, topDepth, w, topDepth, topColor, pRgb, topPeak);

      // 3. Left & Right Lighting Fields (Vocal Chords & Lateral Immersion)
      renderEdgeGradient(0, 0, sideDepth, 0, sideDepth, h, sideLeftColor, pRgb, leftPeak);
      renderEdgeGradient(w, 0, w - sideDepth, 0, sideDepth, h, sideRightColor, tRgb, rightPeak);

      // --- CORNER SEAMLESS RADIAL MERGING (Prevents rectangular seams) ---
      const renderCornerRadial = (cx: number, cy: number, radius: number, col: RGB, peak: number) => {
        const rad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        rad.addColorStop(0, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${peak * 0.85})`);
        rad.addColorStop(0.4, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${peak * 0.35})`);
        rad.addColorStop(1.0, `rgba(${col[0]}, ${col[1]}, ${col[2]}, 0)`);
        ctx.fillStyle = rad;
        ctx.fillRect(cx === 0 ? 0 : cx - radius, cy === 0 ? 0 : cy - radius, radius, radius);
      };

      const cornerRadius = Math.max(bottomDepth, sideDepth) * 1.25;
      renderCornerRadial(0, h, cornerRadius, bottomColor, bottomPeak);
      renderCornerRadial(w, h, cornerRadius, bottomColor, bottomPeak);
      renderCornerRadial(0, 0, cornerRadius * 0.8, topColor, topPeak);
      renderCornerRadial(w, 0, cornerRadius * 0.8, topColor, topPeak);

      // --- REACTIVE TRANSIENT RIPPLES (Mode: Reactive) ---
      if (mode === 'reactive' && sim.ripplePositions.length > 0) {
        sim.ripplePositions.forEach(r => {
          const rx = r.s * w;
          const rippleRadius = (1.0 - r.life) * (w * 0.35);
          const ripGrad = ctx.createRadialGradient(rx, h, 0, rx, h, rippleRadius);
          ripGrad.addColorStop(0, `rgba(255, 255, 255, ${r.life * 0.5 * alpha})`);
          ripGrad.addColorStop(0.3, `rgba(${sRgb[0]}, ${sRgb[1]}, ${sRgb[2]}, ${r.life * 0.35 * alpha})`);
          ripGrad.addColorStop(1.0, `rgba(${pRgb[0]}, ${pRgb[1]}, ${pRgb[2]}, 0)`);
          ctx.fillStyle = ripGrad;
          ctx.fillRect(rx - rippleRadius, h - bottomDepth * 1.5, rippleRadius * 2, bottomDepth * 1.5);
        });
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [
    store.edgeLighting,
    store.edgeLightingMode,
    store.edgeLightingColorTheme,
    store.edgeLightingIntensity,
    store.edgeLightingSpread,
    store.edgeLightingSensitivity,
    store.customLighting,
    store.isPlaying,
    isVideoPlaying,
    store.volume,
    store.duration
  ]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[9999] select-none"
      style={{
        width: '100vw',
        height: '100vh',
        contain: 'strict',
      }}
    />
  );
}
