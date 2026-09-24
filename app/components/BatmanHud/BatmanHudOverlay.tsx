"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Volume2, VolumeX, Shield, Radio, 
  Activity, Play, Pause, CheckSquare, Sparkles, 
  Terminal, Compass, Clock, Cpu, Battery, Eye, 
  ChevronRight, X, Layers, Crosshair, RefreshCw,
  FileText, ListTodo, Search, Zap, Music
} from 'lucide-react';
import { HudFrame, TargetingUI } from '@/components/ui/animated-hud-targeting-ui';
import { useBatmanStore, HudContextCard } from '@/hooks/useBatmanStore';
import { useFrequencyStore } from '@/hooks/useFrequencyStore';
import { jarvisVoiceEngine } from '@/lib/jarvisVoiceEngine';
import { jarvisLiveEngine } from '@/lib/jarvisLiveEngine';

export default function BatmanHudOverlay() {
  const batmanStore = useBatmanStore();
  const frequencyStore = useFrequencyStore();
  
  // Tactical HUD States
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [fps, setFps] = useState(60);
  const [activeVoiceLevel, setActiveVoiceLevel] = useState(0);
  const [selectedTab, setSelectedTab] = useState<HudContextCard>('voice');
  const [activeTasks, setActiveTasks] = useState([
    { id: 1, title: 'Complete high-priority code architecture', done: false, priority: 'CRITICAL' },
    { id: 2, title: 'Calibrate neural audio frequency dsp', done: true, priority: 'HIGH' },
    { id: 3, title: 'Finalize zero-distraction deep work sprint', done: false, priority: 'ALPHA' },
  ]);
  const [quickNote, setQuickNote] = useState('');
  const [systemNotes, setSystemNotes] = useState<string[]>([
    'Lock-in directive initialized at peak cognitive bandwidth.',
    'Acoustic resonance synchronized to Tokyo Midnight 432Hz.'
  ]);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [hudScanline, setHudScanline] = useState(true);
  const [visualizerData, setVisualizerData] = useState<number[]>(new Array(24).fill(0.15));

  const animRef = useRef<number | null>(null);
  const fpsRef = useRef({ frames: 0, lastTime: performance.now() });

  // Escape Key to Exit Batman Lock-In Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && batmanStore.isBatmanMode) {
        batmanStore.toggleBatmanMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [batmanStore]);

  // Lock-In Timer & FPS Telemetry Loop
  useEffect(() => {
    if (!batmanStore.isBatmanMode) return;

    const timer = setInterval(() => {
      if (batmanStore.lockInStartTime) {
        const diff = Math.floor((Date.now() - batmanStore.lockInStartTime) / 1000);
        const hrs = String(Math.floor(diff / 3600)).padStart(2, '0');
        const mins = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
        const secs = String(diff % 60).padStart(2, '0');
        setElapsedTime(`${hrs}:${mins}:${secs}`);
      }
    }, 1000);

    const updateTelemetry = () => {
      fpsRef.current.frames++;
      const now = performance.now();
      if (now - fpsRef.current.lastTime >= 1000) {
        setFps(Math.round((fpsRef.current.frames * 1000) / (now - fpsRef.current.lastTime)));
        fpsRef.current.frames = 0;
        fpsRef.current.lastTime = now;
      }

      // Live waveform calculation
      if (frequencyStore.isPlaying) {
        const simulated = Array.from({ length: 24 }, (_, i) => {
          const t = now * 0.005 + i * 0.3;
          return Math.max(0.1, (Math.sin(t) * 0.5 + 0.5) * 0.85 + Math.random() * 0.15);
        });
        setVisualizerData(simulated);
      } else {
        setVisualizerData(Array.from({ length: 24 }, () => 0.08 + Math.random() * 0.06));
      }

      animRef.current = requestAnimationFrame(updateTelemetry);
    };

    animRef.current = requestAnimationFrame(updateTelemetry);

    return () => {
      clearInterval(timer);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [batmanStore.isBatmanMode, batmanStore.lockInStartTime, frequencyStore.isPlaying]);

  // Contextual Switch: Auto-surface frequency card if music is toggled on
  useEffect(() => {
    if (frequencyStore.isPlaying && selectedTab === 'none') {
      setSelectedTab('frequency');
    }
  }, [frequencyStore.isPlaying]);

  if (!batmanStore.isBatmanMode) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05, filter: "blur(20px)" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[9999] bg-black text-white font-mono select-none overflow-hidden flex flex-col justify-between"
      >
        {/* CRT Scanline & Grain Texture for Batman HUD */}
        {hudScanline && (
          <div 
            className="absolute inset-0 pointer-events-none z-50 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0)_50%,rgba(0,0,0,0.8)_50%)] bg-[length:100%_4px]"
          />
        )}

        {/* Tactical Ambient Vignette & Grid Backdrop */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.85)_100%)] z-0" />
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.06] z-0" 
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
            backgroundSize: '28px 28px'
          }}
        />

        {/* HUD Frame Overlay with Chamfered Corners */}
        <HudFrame>
          <div className="relative w-full h-full flex flex-col justify-between p-4 sm:p-7 z-20">
            
            {/* 1. TOP TELEMETRY STATUS BAR */}
            <motion.header
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex items-center justify-between border-b border-white/20 pb-3 pt-1"
            >
              {/* Left Tactical Header */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-white animate-ping rounded-full" />
                  <span className="text-xs sm:text-sm font-bold tracking-[0.25em] text-white">
                    BATMAN // LOCK-IN PROTOCOL
                  </span>
                </div>
                <div className="hidden md:flex items-center gap-2 text-[10px] text-white/50 border-l border-white/20 pl-3">
                  <span>SECURE HUD CHANNEL</span>
                  <span className="text-white/20">•</span>
                  <span className="text-white">SYS_NOMINAL</span>
                  <span className="text-white/20">•</span>
                  <span>FPS: {fps}</span>
                </div>
              </div>

              {/* Center Lock-In Chronometer */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/20 px-3 py-1 rounded-sm">
                <Clock size={12} className="text-white/60" />
                <span className="text-[11px] sm:text-xs font-bold tracking-widest text-white">
                  T+{elapsedTime}
                </span>
              </div>

              {/* Right Disengage Action */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => batmanStore.toggleBatmanMode(false)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-white/90 text-black text-[10px] sm:text-[11px] font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                >
                  <span>DISENGAGE</span>
                  <span className="text-[9px] opacity-60">[ESC]</span>
                </button>
              </div>
            </motion.header>

            {/* 2. MAIN CENTER HUD DISPLAY */}
            <div className="flex-1 relative flex items-center justify-center my-2 sm:my-4 overflow-hidden">
              
              {/* Background Animated Targeting System */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                <TargetingUI className="w-[320px] h-[320px] sm:w-[500px] sm:h-[500px] text-white" />
              </div>

              {/* Center Crosshair Coordinates Ring */}
              <div className="relative z-10 w-full max-w-5xl h-full flex flex-col md:flex-row items-center justify-between gap-6 px-2">
                
                {/* LEFT CONTEXTUAL TACTICAL PANEL */}
                <motion.div
                  initial={{ x: -40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="w-full md:w-80 h-auto max-h-[380px] bg-black/80 border border-white/20 backdrop-blur-xl p-4 flex flex-col justify-between shadow-[0_0_30px_rgba(0,0,0,0.8)]"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                      <div className="flex items-center gap-2">
                        <Crosshair size={13} className="text-white" />
                        <span className="text-[10px] font-bold tracking-widest uppercase text-white">
                          MISSION BACKLOG
                        </span>
                      </div>
                      <span className="text-[9px] text-white/50">
                        {activeTasks.filter(t => t.done).length}/{activeTasks.length} DONE
                      </span>
                    </div>

                    {/* Task Checklist */}
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {activeTasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => {
                            setActiveTasks(tasks => tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t));
                          }}
                          className={`p-2 border transition-all cursor-pointer flex items-start gap-2.5 ${
                            task.done 
                              ? 'border-white/10 bg-white/[0.02] text-white/40 line-through' 
                              : 'border-white/20 bg-white/[0.04] text-white hover:border-white/40 hover:bg-white/[0.08]'
                          }`}
                        >
                          <div className={`mt-0.5 w-3.5 h-3.5 border flex items-center justify-center shrink-0 ${
                            task.done ? 'border-white/40 bg-white text-black' : 'border-white/40'
                          }`}>
                            {task.done && <CheckSquare size={10} className="text-black" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] leading-tight font-medium">
                              {task.title}
                            </p>
                            <span className="text-[8px] tracking-wider text-white/40 uppercase">
                              PRIORITY // {task.priority}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tactical Task Action */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[9px] text-white/60">
                    <span>VOICE TRIGGER: &quot;ADD TASK&quot;</span>
                    <span className="text-white">STATUS: ENGAGED</span>
                  </div>
                </motion.div>

                {/* CENTER VOICE RADAR & AUDIO WAVE */}
                <div className="flex flex-col items-center justify-center text-center relative z-20">
                  
                  {/* Concentric Voice Pulse Ring */}
                  <div className="relative flex items-center justify-center mb-4">
                    <motion.div
                      animate={{
                        scale: frequencyStore.isPlaying || batmanStore.isSpeaking ? [1, 1.15, 1] : [1, 1.03, 1],
                        opacity: frequencyStore.isPlaying || batmanStore.isSpeaking ? [0.4, 0.9, 0.4] : [0.2, 0.4, 0.2]
                      }}
                      transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                      className="w-32 h-32 sm:w-44 sm:h-44 rounded-full border border-white/30 flex items-center justify-center"
                    />

                    <motion.div
                      animate={{
                        scale: frequencyStore.isPlaying || batmanStore.isSpeaking ? [1, 1.25, 1] : [1, 1.06, 1],
                        opacity: [0.1, 0.3, 0.1]
                      }}
                      transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
                      className="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full border border-dashed border-white/20"
                    />

                    {/* Center Core HUD Symbol */}
                    <div className="absolute w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-black border-2 border-white flex flex-col items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                      <Mic 
                        size={22} 
                        className={batmanStore.isSpeaking ? "text-white animate-pulse" : "text-white/80"} 
                      />
                      <span className="text-[8px] sm:text-[9px] font-bold tracking-widest text-white mt-1">
                        {batmanStore.isSpeaking ? "AI STREAMING" : "LISTENING"}
                      </span>
                    </div>
                  </div>

                  {/* Focus Directive Target */}
                  <div className="max-w-md px-4 py-1.5 bg-white/[0.03] border border-white/20 backdrop-blur-md">
                    <p className="text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase text-white">
                      {batmanStore.targetFocus}
                    </p>
                  </div>

                  {/* 24-Band Audio / Voice Spectrum */}
                  <div className="flex items-end justify-center gap-1 mt-3 h-8 w-64">
                    {visualizerData.map((val, idx) => (
                      <motion.div
                        key={idx}
                        style={{ height: `${Math.max(10, val * 100)}%` }}
                        className="w-1.5 bg-white transition-all duration-75"
                      />
                    ))}
                  </div>
                </div>

                {/* RIGHT CONTEXTUAL INTEL & MUSIC STREAM */}
                <motion.div
                  initial={{ x: 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="w-full md:w-80 h-auto max-h-[380px] bg-black/80 border border-white/20 backdrop-blur-xl p-4 flex flex-col justify-between shadow-[0_0_30px_rgba(0,0,0,0.8)]"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                      <div className="flex items-center gap-2">
                        <Radio size={13} className="text-white" />
                        <span className="text-[10px] font-bold tracking-widest uppercase text-white">
                          ACOUSTIC FREQUENCY
                        </span>
                      </div>
                      <span className="text-[9px] text-white/50">
                        {frequencyStore.isPlaying ? 'ACTIVE // 432HZ' : 'STANDBY'}
                      </span>
                    </div>

                    {/* Frequency Player Card */}
                    {(() => {
                      const currentTrack = frequencyStore.tracks?.find(t => t.id === frequencyStore.currentTrackId);
                      return (
                        <div className="p-3 border border-white/20 bg-white/[0.03] space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[11px] font-bold text-white tracking-wide truncate max-w-[180px]">
                                {currentTrack?.title || 'Tokyo Rain & Cyberpunk Lo-Fi'}
                              </p>
                              <p className="text-[9px] text-white/50">
                                {currentTrack?.artist || 'Focus Wave Binaural Engine'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => frequencyStore.togglePlay()}
                              className="w-8 h-8 rounded-sm bg-white text-black flex items-center justify-center cursor-pointer hover:bg-white/90 transition-all"
                            >
                              {frequencyStore.isPlaying ? <Pause size={14} /> : <Play size={14} />}
                            </button>
                          </div>

                          {/* Tactical Equalizer Preset Bar */}
                          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[9px]">
                            <span className="text-white/50">PRESET:</span>
                            <span className="text-white font-bold uppercase">{frequencyStore.audioPreset}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const presets = ['original', 'enhanced', 'immersive', 'bass-titan', 'vocal-air'] as const;
                                const next = presets[(presets.indexOf(frequencyStore.audioPreset) + 1) % presets.length];
                                frequencyStore.setAudioPreset(next);
                              }}
                              className="px-1.5 py-0.5 border border-white/20 text-white/70 hover:text-white"
                            >
                              CYCLE
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Tactical Voice Intel Preview */}
                    <div className="mt-3 p-2.5 border border-white/10 bg-white/[0.02]">
                      <div className="flex items-center gap-1.5 text-[9px] text-white/50 uppercase tracking-wider mb-1">
                        <Terminal size={10} />
                        <span>TACTICAL AI STREAM</span>
                      </div>
                      <p className="text-[10px] text-white/80 leading-relaxed font-mono line-clamp-3">
                        {batmanStore.aiResponse || 'All neural processing nodes synchronized. Speak any command or request system telemetry.'}
                      </p>
                    </div>
                  </div>

                  {/* Context Card Footer */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[9px] text-white/60">
                    <span>AUDIO RES: 48kHz / 24-BIT</span>
                    <span className="text-white font-mono">FLOW LEVEL: 100%</span>
                  </div>
                </motion.div>

              </div>
            </div>

            {/* 3. BOTTOM HUD CONTEXT BAR & QUICK COMMANDS */}
            <motion.footer
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="border-t border-white/20 pt-3 pb-1 flex flex-col sm:flex-row items-center justify-between gap-3"
            >
              {/* Voice Directives Quick Guide */}
              <div className="flex items-center gap-2 sm:gap-4 text-[9px] sm:text-[10px] text-white/50 overflow-x-auto w-full sm:w-auto py-1">
                <span className="text-white font-bold shrink-0">VOICE COMMANDS:</span>
                <span className="border border-white/10 px-2 py-0.5 bg-white/[0.03] text-white/70 shrink-0">&quot;Play Tokyo rain&quot;</span>
                <span className="border border-white/10 px-2 py-0.5 bg-white/[0.03] text-white/70 shrink-0">&quot;Add mission task&quot;</span>
                <span className="border border-white/10 px-2 py-0.5 bg-white/[0.03] text-white/70 shrink-0">&quot;Search docs&quot;</span>
                <span className="border border-white/10 px-2 py-0.5 bg-white/[0.03] text-white/70 shrink-0">&quot;Disengage&quot;</span>
              </div>

              {/* Tactical Status Indicator */}
              <div className="flex items-center gap-4 text-[9px] sm:text-[10px] text-white/60 shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  <span>MIC MONITOR ON</span>
                </div>
                <div className="hidden sm:block text-white/20">•</div>
                <div className="hidden sm:flex items-center gap-1.5">
                  <Compass size={11} className="text-white" />
                  <span>COORDINATES // 35.6762° N, 139.6503° E</span>
                </div>
              </div>
            </motion.footer>

          </div>
        </HudFrame>
      </motion.div>
    </AnimatePresence>
  );
}
