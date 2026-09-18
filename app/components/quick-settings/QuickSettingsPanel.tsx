"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, SunDim, Volume2, VolumeX, Volume1, Maximize2, Minimize2, 
  Mic, MicOff, Sparkles, Shield, Moon, Zap, Radio, CloudFog, 
  RotateCcw, SlidersHorizontal, Eye, Flame, Bot, Music, Monitor, X
} from 'lucide-react';
import { useFrequencyStore, EdgeLightingMode, AudioEnhancementPreset } from '@/hooks/useFrequencyStore';
import { useJarvisStore } from '@/hooks/useJarvisStore';
import { useAppStore } from '@/hooks/useAppStore';
import { jarvisVoiceEngine } from '@/lib/jarvisVoiceEngine';
import { getSelectedTextModel, setSelectedTextModel } from '@/lib/aiModelConfig';

import { QuickSettingsHeader } from './QuickSettingsHeader';
import { QuickDualPillHeader } from './QuickDualPillHeader';
import { QuickNowPlayingCard } from './QuickNowPlayingCard';
import { QuickSlider } from './QuickSlider';
import { QuickCircleGrid, QuickCircleItem } from './QuickCircleGrid';
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
  const [showHardwareSection, setShowHardwareSection] = useState(false);

  // Zero Distraction Focus Shield State
  const [zeroDistraction, setZeroDistraction] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('focusforge-zero-distraction') === 'true';
    }
    return false;
  });

  // Current AI Model State
  const [activeModel, setActiveModel] = useState<string>(() => getSelectedTextModel());

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
      const inputs = devices
        .filter(d => d.kind === 'audioinput')
        .map((d, index) => ({
          deviceId: d.deviceId || `input-${index}`,
          label: d.label || `Microphone ${index + 1}`
        }));
      const outputs = devices
        .filter(d => d.kind === 'audiooutput')
        .map((d, index) => ({
          deviceId: d.deviceId || `output-${index}`,
          label: d.label || `Speaker ${index + 1}`
        }));

      setAudioInputDevices(inputs);
      setAudioOutputDevices(outputs);
      setMicPermissionGranted(devices.some(d => d.kind === 'audioinput' && !!d.label));
    } catch (e) {
      console.debug('Failed to enumerate audio devices:', e);
    }
  }, []);

  const requestMicAccess = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicPermissionGranted(true);
      await refreshAudioDevices();
    } catch (e) {
      console.warn("Microphone access request was not granted.", e);
    }
  };

  const handleSelectMic = (id: string) => {
    setSelectedMicId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('focusforge-audio-input-device', id);
      window.dispatchEvent(new CustomEvent('audio-input-device-changed', { detail: { deviceId: id } }));
    }
  };

  const handleSelectSpeaker = (id: string) => {
    setSelectedSpeakerId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('focusforge-audio-output-device', id);
      window.dispatchEvent(new CustomEvent('audio-output-device-changed', { detail: { deviceId: id } }));
    }
  };

  const handleTestSpeakerChime = () => {
    setIsTestingSpeaker(true);
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        setIsTestingSpeaker(false);
        return;
      }
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      const freqs = [528, 660, 792, 1056];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.1);
        
        gain.gain.setValueAtTime(0.001, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.1 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.35);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.4);
      });

      setTimeout(() => {
        ctx.close();
        setIsTestingSpeaker(false);
      }, 900);
    } catch (e) {
      setIsTestingSpeaker(false);
    }
  };

  const applyBrightness = (val: number) => {
    const clamped = Math.max(15, Math.min(100, val));
    setScreenBrightness(clamped);
    if (typeof window !== 'undefined') {
      localStorage.setItem('maybach-screen-brightness', String(clamped));
      const dimmer = document.getElementById('maybach-screen-dimmer');
      if (dimmer) {
        dimmer.style.opacity = String(Math.max(0, (100 - clamped) / 100));
      }
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

  const toggleZeroDistraction = () => {
    const nextVal = !zeroDistraction;
    setZeroDistraction(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('focusforge-zero-distraction', String(nextVal));
      window.dispatchEvent(new CustomEvent('focus-shield-changed', { detail: { enabled: nextVal } }));
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

  const handleCycleAiModel = () => {
    const models = ['gemma-4-26b-a4b-it', 'gemma-4-31b-it', 'gemini-2.5-flash'];
    const currentIdx = models.indexOf(activeModel);
    const nextModel = models[(currentIdx + 1) % models.length];
    setSelectedTextModel(nextModel);
    setActiveModel(nextModel);
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

  // 8 Circular Action Buttons (Apple Control Center & Samsung Quick Circles Style)
  const circleItems: QuickCircleItem[] = [
    {
      id: 'immersion',
      icon: isFullscreen ? Minimize2 : Maximize2,
      label: 'Immersion',
      isActive: isFullscreen,
      activeColor: 'emerald',
      onClick: toggleFullscreen,
      ariaLabel: 'Toggle Canvas Fullscreen Immersion',
      badge: isFullscreen ? 'MAX' : undefined
    },
    {
      id: 'edge-lighting',
      icon: Sparkles,
      label: 'Edge Glow',
      isActive: frequencyStore.edgeLighting,
      activeColor: 'cyan',
      onClick: () => frequencyStore.toggleEdgeLighting(),
      ariaLabel: 'Toggle Screen Ambient Edge Lighting',
      badge: frequencyStore.edgeLighting ? 'ON' : undefined
    },
    {
      id: 'focus-shield',
      icon: Shield,
      label: 'Focus Shield',
      isActive: zeroDistraction,
      activeColor: 'purple',
      onClick: toggleZeroDistraction,
      ariaLabel: 'Toggle Zero-Distraction Focus Shield',
      badge: zeroDistraction ? 'ACTIVE' : undefined
    },
    {
      id: 'fog-zen',
      icon: CloudFog,
      label: 'Atmosphere',
      isActive: false,
      activeColor: 'white',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('open-fog-mode'));
        onClose();
      },
      ariaLabel: 'Open Atmospheric Zen Fog Meditation'
    },
    {
      id: 'hardware-routing',
      icon: showHardwareSection ? SlidersHorizontal : Mic,
      label: 'Audio I/O',
      isActive: showHardwareSection,
      activeColor: 'cyan',
      onClick: () => setShowHardwareSection(!showHardwareSection),
      ariaLabel: 'Toggle Microphone & Speaker Device Selectors',
      badge: micPermissionGranted ? 'OK' : 'REQ'
    },
    {
      id: 'audio-chime',
      icon: Volume2,
      label: 'Sound Test',
      isActive: isTestingSpeaker,
      activeColor: 'amber',
      onClick: handleTestSpeakerChime,
      ariaLabel: 'Play 528Hz Harmonic Diagnostic Chime'
    },
    {
      id: 'ai-model',
      icon: Bot,
      label: activeModel.includes('31b') ? 'Gemma 31B' : activeModel.includes('26b') ? 'Gemma 26B' : 'Gemini AI',
      isActive: true,
      activeColor: 'cyan',
      onClick: handleCycleAiModel,
      ariaLabel: 'Cycle AI Reasoning Engine Model'
    },
    {
      id: 'jarvis-hud',
      icon: Zap,
      label: 'Neural HUD',
      isActive: jarvisStore.isOpen && !jarvisStore.isMinimized,
      activeColor: 'cyan',
      onClick: () => {
        jarvisStore.setDisplayMode('fullscreen');
        jarvisStore.openJarvis();
        onClose();
      },
      ariaLabel: 'Launch Fullscreen J.A.R.V.I.S. Neural Console'
    }
  ];

  const content = (
    <div 
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-settings-title"
      onClick={(e) => e.stopPropagation()}
      className={`w-full h-full flex flex-col p-4 sm:p-5 relative z-10 select-none overflow-hidden ${
        isEmbeddedInIsland 
          ? 'bg-transparent' 
          : 'bg-[#08090d]/95 border border-cyan-500/25 backdrop-blur-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(6,182,212,0.15)] rounded-3xl'
      } ${className}`}
    >
      {/* Top Header Bar */}
      <QuickSettingsHeader 
        onClose={onClose}
        onResetDefaults={handleResetDefaults}
        activeView={view}
      />

      {/* Main Grouped Scrollable Area */}
      <div className="flex-1 space-y-3.5 overflow-y-auto no-scrollbar pr-0.5 min-h-0 pt-1">
        
        {/* 1. DUAL TOP CONNECTIVITY PILLS (Live Voice & Jarvis Hotword) */}
        <QuickDualPillHeader
          isJarvisActive={jarvisStore.isHotwordEnabled}
          onToggleJarvis={toggleJarvisWakeWord}
          isOnline={typeof navigator !== 'undefined' ? navigator.onLine : true}
          onOpenVoiceHUD={() => {
            jarvisStore.setDisplayMode('fullscreen');
            jarvisStore.openJarvis();
            onClose();
          }}
          onStartLive={() => {
            jarvisStore.startLiveMode();
            onClose();
          }}
        />

        {/* 2. NOW PLAYING MEDIA CARD (iOS Style) */}
        <QuickNowPlayingCard 
          onOpenStudio={() => {
            window.dispatchEvent(new CustomEvent('open-audio-studio'));
            onClose();
          }}
        />

        {/* 3. DUAL PROMINENT CAPSULE SLIDERS (Brightness & Volume) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Display Brightness Slider */}
          <QuickSlider
            icon={screenBrightness < 50 ? SunDim : Sun}
            label="Display"
            value={screenBrightness}
            min={15}
            max={100}
            step={1}
            onChange={applyBrightness}
            accentColor="amber"
            valueDisplay={`${screenBrightness}%`}
            ariaLabel="Display Luminance Slider"
            presets={[
              { label: '25%', val: 25 },
              { label: '50%', val: 50 },
              { label: '75%', val: 75 },
              { label: 'Max', val: 100 },
            ]}
          />

          {/* Master Volume Slider */}
          <QuickSlider
            icon={frequencyStore.volume === 0 ? VolumeX : frequencyStore.volume < 50 ? Volume1 : Volume2}
            label="Volume"
            value={frequencyStore.volume}
            min={0}
            max={100}
            step={1}
            onChange={(val) => frequencyStore.setVolume(val)}
            onIconClick={toggleMute}
            iconTitle={frequencyStore.volume === 0 ? "Unmute Volume" : "Mute Volume"}
            accentColor="cyan"
            valueDisplay={frequencyStore.volume === 0 ? "Muted" : `${frequencyStore.volume}%`}
            ariaLabel="Master Volume Slider"
            presets={[
              { label: 'Mute', val: 0 },
              { label: '35%', val: 35 },
              { label: '70%', val: 70 },
              { label: 'Max', val: 100 },
            ]}
          />
        </div>

        {/* 4. CIRCULAR ACTION BUTTONS GRID (4x2 Apple & Samsung Style) */}
        <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-2xl shadow-inner">
          <QuickCircleGrid items={circleItems} />
        </div>

        {/* 5. HARDWARE AUDIO I/O ACCORDION (If toggled) */}
        {showHardwareSection && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
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
              onTestSpeakerChime={handleTestSpeakerChime}
              isTestingSpeaker={isTestingSpeaker}
            />
          </motion.div>
        )}

        {/* 6. SCREEN EDGE LIGHTING QUICK SECTION */}
        <QuickEdgeLightingSection
          edgeLighting={frequencyStore.edgeLighting}
          edgeLightingMode={frequencyStore.edgeLightingMode}
          edgeLightingColorSource={frequencyStore.edgeLightingColorSource}
          onToggleEdgeLighting={() => frequencyStore.toggleEdgeLighting()}
          onSetColorSource={(src) => frequencyStore.setEdgeLightingColorSource(src)}
          onSetMode={(m) => frequencyStore.setEdgeLightingMode(m)}
          onOpenStudio={() => {
            window.dispatchEvent(new CustomEvent('open-audio-studio'));
            onClose();
          }}
        />

        {/* 7. STUDIO AUDIO DSP EQUALIZER */}
        <QuickDspSection
          audioPreset={frequencyStore.audioPreset}
          onSetAudioPreset={(p: AudioEnhancementPreset) => frequencyStore.setAudioPreset(p)}
        />

        {/* 8. COGNITIVE AI MODEL SELECTOR */}
        <QuickAiModelSection />

      </div>

      {/* Footer */}
      <QuickSettingsFooter onClose={onClose} />
    </div>
  );

  // Embedded in Dynamic Island
  if (isEmbeddedInIsland) {
    return content;
  }

  // Standalone Floating Overlay
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
