"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, SunDim, Volume2, VolumeX, Volume1, Maximize2, Minimize2, 
  Mic, MicOff, Sparkles, Shield, Bell, BellOff, Moon, Zap, Radio, 
  RotateCcw, SlidersHorizontal, Eye, Flame 
} from 'lucide-react';
import { useFrequencyStore } from '@/hooks/useFrequencyStore';
import { useJarvisStore } from '@/hooks/useJarvisStore';
import { useAppStore } from '@/hooks/useAppStore';
import { jarvisVoiceEngine } from '@/lib/jarvisVoiceEngine';

import { QuickSettingsHeader } from './QuickSettingsHeader';
import { QuickActionTile } from './QuickActionTile';
import { QuickSlider } from './QuickSlider';
import { QuickHardwareRouting } from './QuickHardwareRouting';
import { QuickEdgeLightingSection } from './QuickEdgeLightingSection';
import { QuickDspSection } from './QuickDspSection';
import { QuickAiModelSection } from './QuickAiModelSection';
import { QuickSettingsFooter } from './QuickSettingsFooter';

interface QuickSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  isEmbeddedInIsland?: boolean;
}

export const QuickSettingsPanel: React.FC<QuickSettingsPanelProps> = ({
  isOpen,
  onClose,
  className = '',
  isEmbeddedInIsland = false
}) => {
  const frequencyStore = useFrequencyStore();
  const jarvisStore = useJarvisStore();
  const { view } = useAppStore();

  const [screenBrightness, setScreenBrightness] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const prevVolumeRef = useRef<number>(80);

  // Audio I/O state
  const [audioInputDevices, setAudioInputDevices] = useState<{ deviceId: string; label: string }[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<{ deviceId: string; label: string }[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('default');
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>('default');
  const [micPermissionGranted, setMicPermissionGranted] = useState<boolean>(false);
  const [isTestingSpeaker, setIsTestingSpeaker] = useState(false);

  // Zero Distraction Focus Shield State
  const [zeroDistraction, setZeroDistraction] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('focusforge-zero-distraction') === 'true';
    }
    return false;
  });

  // Auto Fullscreen Preference
  const [autoFullscreenEnabled, setAutoFullscreenEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('focusforge-default-fullscreen') !== 'false';
    }
    return true;
  });

  const panelRef = useRef<HTMLDivElement>(null);

  // Initialize and load saved preferences
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedBrightness = localStorage.getItem('maybach-screen-brightness');
    if (savedBrightness) {
      const parsed = Number(savedBrightness);
      if (!isNaN(parsed)) setScreenBrightness(parsed);
    }

    const savedMic = localStorage.getItem('focusforge-audio-input-device') || 'default';
    const savedSpeaker = localStorage.getItem('focusforge-audio-output-device') || 'default';
    setSelectedMicId(savedMic);
    setSelectedSpeakerId(savedSpeaker);

    const checkFullscreen = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', checkFullscreen);

    refreshAudioDevices();

    return () => {
      document.removeEventListener('fullscreenchange', checkFullscreen);
    };
  }, []);

  // Keyboard navigation & Escape key dismiss
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const refreshAudioDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter(d => d.kind === 'audioinput').map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${i + 1}`
      }));
      const outputs = devices.filter(d => d.kind === 'audiooutput').map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Speaker ${i + 1}`
      }));
      setAudioInputDevices(inputs);
      setAudioOutputDevices(outputs);
      const hasLabels = inputs.some(d => !!d.label);
      setMicPermissionGranted(hasLabels);
    } catch (e) {
      console.warn("Could not enumerate audio devices", e);
    }
  }, []);

  const requestMicAccess = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMicPermissionGranted(true);
      refreshAudioDevices();
    } catch (e) {
      console.warn("Mic access request rejected", e);
    }
  };

  const handleSelectMic = (deviceId: string) => {
    setSelectedMicId(deviceId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('focusforge-audio-input-device', deviceId);
      window.dispatchEvent(new CustomEvent('audio-input-device-changed', { detail: { deviceId } }));
    }
  };

  const handleSelectSpeaker = (deviceId: string) => {
    setSelectedSpeakerId(deviceId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('focusforge-audio-output-device', deviceId);
      window.dispatchEvent(new CustomEvent('audio-output-device-changed', { detail: { deviceId } }));
      if (typeof (HTMLMediaElement.prototype as any).setSinkId === 'function') {
        document.querySelectorAll('audio, video').forEach((el: any) => {
          try { el.setSinkId(deviceId); } catch (e) {}
        });
      }
    }
  };

  const testSpeakerChime = () => {
    setIsTestingSpeaker(true);
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.14); // G5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.42);
      setTimeout(() => setIsTestingSpeaker(false), 500);
    } catch (e) {
      setIsTestingSpeaker(false);
    }
  };

  const applyBrightness = (val: number) => {
    const clamped = Math.max(15, Math.min(100, val));
    setScreenBrightness(clamped);
    if (typeof window !== 'undefined') {
      localStorage.setItem('maybach-screen-brightness', String(clamped));
      window.dispatchEvent(new CustomEvent('screen-brightness-changed', { detail: { brightness: clamped } }));
    }
  };

  const toggleMute = () => {
    if (frequencyStore.volume > 0) {
      prevVolumeRef.current = frequencyStore.volume;
      frequencyStore.setVolume(0);
    } else {
      frequencyStore.setVolume(prevVolumeRef.current > 0 ? prevVolumeRef.current : 80);
    }
  };

  const toggleFullscreen = () => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn("Fullscreen request failed", err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.warn("Exit fullscreen failed", err);
        });
      }
    }
  };

  const toggleAutoFullscreen = () => {
    const nextVal = !autoFullscreenEnabled;
    setAutoFullscreenEnabled(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('focusforge-default-fullscreen', String(nextVal));
    }
  };

  const toggleZeroDistraction = () => {
    const nextVal = !zeroDistraction;
    setZeroDistraction(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('focusforge-zero-distraction', String(nextVal));
      window.dispatchEvent(new CustomEvent('zero-distraction-changed', { detail: { enabled: nextVal } }));
    }
  };

  const toggleJarvisWakeWord = () => {
    const nextVal = !jarvisStore.isHotwordEnabled;
    jarvisStore.setIsHotwordEnabled(nextVal);
    if (nextVal) {
      jarvisVoiceEngine.startWakeWordDetection();
    } else {
      jarvisVoiceEngine.stopWakeWordDetection();
    }
  };

  const handleResetDefaults = () => {
    applyBrightness(100);
    frequencyStore.setVolume(80);
    frequencyStore.setAudioPreset('original');
    if (!frequencyStore.edgeLighting) {
      frequencyStore.toggleEdgeLighting();
    }
    frequencyStore.setEdgeLightingMode('ambient');
    frequencyStore.setEdgeLightingColorSource('dominant');
  };

  if (!isOpen) return null;

  const content = (
    <div 
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-settings-title"
      onClick={(e) => e.stopPropagation()}
      className={`w-full h-full flex flex-col p-4 sm:p-5 relative z-10 select-none bg-[#050608]/95 border border-cyan-500/25 backdrop-blur-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(6,182,212,0.15)] rounded-3xl ${className}`}
    >
      {/* Mobile Drag Indicator */}
      <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-2 sm:hidden shrink-0" />

      {/* Header */}
      <QuickSettingsHeader 
        onClose={onClose}
        onResetDefaults={handleResetDefaults}
        activeView={view}
      />

      {/* Grouped Controls Scroll Container */}
      <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar pr-0.5 min-h-0">
        
        {/* 1. PRIMARY QUICK ACTION TILES (2x2 Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Tile 1: Canvas Immersion */}
          <QuickActionTile
            icon={isFullscreen ? Minimize2 : Maximize2}
            label="Canvas Immersion"
            sublabel={isFullscreen ? "Native Fullscreen" : "Windowed Mode"}
            isActive={isFullscreen}
            onClick={toggleFullscreen}
            activeColor="emerald"
            badge={isFullscreen ? "MAX" : "NORMAL"}
            ariaLabel="Toggle Canvas Fullscreen Mode"
          />

          {/* Tile 2: J.A.R.V.I.S. Hands-Free Voice */}
          <QuickActionTile
            icon={jarvisStore.isHotwordEnabled ? Mic : MicOff}
            label="J.A.R.V.I.S. Voice"
            sublabel={jarvisStore.isHotwordEnabled ? "Hotword Active ('JARVIS')" : "Voice Standby"}
            isActive={jarvisStore.isHotwordEnabled}
            onClick={toggleJarvisWakeWord}
            activeColor="cyan"
            badge={jarvisStore.voiceState !== 'IDLE' && jarvisStore.voiceState !== 'ERROR' ? "LIVE" : "READY"}
            ariaLabel="Toggle Hands-Free JARVIS Wake Word Listener"
          />

          {/* Tile 3: Ambient Edge Lighting */}
          <QuickActionTile
            icon={Sparkles}
            label="Edge Lighting"
            sublabel={`Mode: ${frequencyStore.edgeLightingMode}`}
            isActive={frequencyStore.edgeLighting}
            onClick={() => frequencyStore.toggleEdgeLighting()}
            activeColor="cyan"
            badge={frequencyStore.edgeLighting ? "ON" : "OFF"}
            ariaLabel="Toggle Screen Ambient Edge Lighting"
          />

          {/* Tile 4: Zero Distraction Shield */}
          <QuickActionTile
            icon={Shield}
            label="Focus Shield"
            sublabel={zeroDistraction ? "Zero Distraction Lock" : "Standard Mode"}
            isActive={zeroDistraction}
            onClick={toggleZeroDistraction}
            activeColor="purple"
            badge={zeroDistraction ? "LOCKED" : "OFF"}
            ariaLabel="Toggle Zero Distraction Focus Shield"
          />
        </div>

        {/* 2. DUAL CAPSULE SLIDERS (Display Luminance & Master Audio) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <QuickSlider
            icon={screenBrightness < 50 ? <SunDim size={13} /> : <Sun size={13} />}
            label="Display"
            value={screenBrightness}
            min={15}
            max={100}
            step={1}
            onChange={applyBrightness}
            accentColor="amber"
            valueDisplay={`${screenBrightness}%`}
            presets={[
              { label: '25%', val: 25 },
              { label: '50%', val: 50 },
              { label: '75%', val: 75 },
              { label: 'Max', val: 100 },
            ]}
            ariaLabel="Screen Brightness Slider"
          />

          <QuickSlider
            icon={
              frequencyStore.volume === 0 ? (
                <VolumeX size={13} className="text-red-400" />
              ) : frequencyStore.volume < 50 ? (
                <Volume1 size={13} />
              ) : (
                <Volume2 size={13} />
              )
            }
            label="Volume"
            value={frequencyStore.volume}
            min={0}
            max={100}
            step={1}
            onChange={(v) => frequencyStore.setVolume(v)}
            accentColor="cyan"
            valueDisplay={frequencyStore.volume === 0 ? 'MUTED' : `${frequencyStore.volume}%`}
            onIconClick={toggleMute}
            iconTitle={frequencyStore.volume === 0 ? "Unmute" : "Mute Master Audio"}
            presets={[
              { label: 'Mute', val: 0 },
              { label: '35%', val: 35 },
              { label: '70%', val: 70 },
              { label: 'Max', val: 100 },
            ]}
            ariaLabel="Master Audio Volume Slider"
          />
        </div>

        {/* 3. AI INTELLIGENCE & GEMMA 4 MODEL SUITE */}
        <QuickAiModelSection />

        {/* 4. AUDIO DSP ACOUSTIC EQUALIZER */}
        <QuickDspSection 
          audioPreset={frequencyStore.audioPreset}
          onSetAudioPreset={(preset) => frequencyStore.setAudioPreset(preset)}
        />

        {/* 5. ACOUSTIC HARDWARE ROUTING (Microphone & Speaker Pipeline) */}
        <QuickHardwareRouting
          audioInputDevices={audioInputDevices}
          audioOutputDevices={audioOutputDevices}
          selectedMicId={selectedMicId}
          selectedSpeakerId={selectedSpeakerId}
          micPermissionGranted={micPermissionGranted}
          onRequestMicAccess={requestMicAccess}
          onSelectMic={handleSelectMic}
          onSelectSpeaker={handleSelectSpeaker}
          onRefreshDevices={refreshAudioDevices}
          onTestSpeakerChime={testSpeakerChime}
          isTestingSpeaker={isTestingSpeaker}
        />

        {/* 6. SCREEN EDGE LIGHTING MODES & COLOR SOURCE */}
        <QuickEdgeLightingSection
          edgeLighting={frequencyStore.edgeLighting}
          edgeLightingMode={frequencyStore.edgeLightingMode}
          edgeLightingColorSource={frequencyStore.edgeLightingColorSource || 'dominant'}
          onToggleEdgeLighting={() => frequencyStore.toggleEdgeLighting()}
          onSetColorSource={(src) => frequencyStore.setEdgeLightingColorSource(src)}
          onSetMode={(m) => frequencyStore.setEdgeLightingMode(m)}
          onOpenStudio={() => frequencyStore.setStudioOpen(true)}
        />
      </div>

      {/* Footer */}
      <QuickSettingsFooter onClose={onClose} />
    </div>
  );

  // If embedded in Dynamic Island modal container
  if (isEmbeddedInIsland) {
    return content;
  }

  // Standalone Floating Overlay Mode (usable anywhere in the app)
  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[150] flex items-end sm:items-start justify-center sm:justify-end p-2 sm:p-6 bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.96 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col pointer-events-auto"
        >
          {content}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
