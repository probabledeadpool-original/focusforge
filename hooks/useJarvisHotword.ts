"use client";

import { useEffect } from 'react';
import { useJarvisStore } from './useJarvisStore';
import { jarvisVoiceEngine } from '../lib/jarvisVoiceEngine';
import { useAppStore } from './useAppStore';
import { useFrequencyStore } from './useFrequencyStore';

export function useJarvisHotword() {
  const { 
    isHotwordEnabled, 
    openJarvis, 
  } = useJarvisStore();

  const view = useAppStore(s => s.view);
  const isVideoPlaying = useAppStore(s => s.isVideoPlaying);
  const isFrequencyPlaying = useFrequencyStore(s => s.isPlaying);

  // Dynamic High-Sensitivity trigger for The Place, The Frequency, and all media playback
  useEffect(() => {
    const isSpecialEnvironment = view === 'place' || view === 'frequency' || isVideoPlaying || isFrequencyPlaying;
    jarvisVoiceEngine.setHighSensitivity(true); // Always keep high sensitivity on by default

    if (isHotwordEnabled) {
      jarvisVoiceEngine.startWakeWordDetection();
    }
  }, [view, isVideoPlaying, isFrequencyPlaying, isHotwordEnabled]);

  useEffect(() => {
    // Keep wake-word detection active whenever hotword is enabled
    if (isHotwordEnabled) {
      jarvisVoiceEngine.startWakeWordDetection();
    } else {
      jarvisVoiceEngine.stopWakeWordDetection();
    }

    // Auto-warmup audio and speech recognition on any user interaction or window focus
    const warmupListener = () => {
      if (isHotwordEnabled) {
        jarvisVoiceEngine.startWakeWordDetection();
      }
    };

    window.addEventListener('click', warmupListener);
    window.addEventListener('touchstart', warmupListener);
    window.addEventListener('keydown', warmupListener);
    window.addEventListener('focus', warmupListener);
    document.addEventListener('visibilitychange', warmupListener);

    return () => {
      window.removeEventListener('click', warmupListener);
      window.removeEventListener('touchstart', warmupListener);
      window.removeEventListener('keydown', warmupListener);
      window.removeEventListener('focus', warmupListener);
      document.removeEventListener('visibilitychange', warmupListener);
    };
  }, [isHotwordEnabled]);

  // Global hotword trigger listener
  useEffect(() => {
    const handleHotwordTriggered = (e: any) => {
      const { trailingCommand } = e?.detail || {};
      const store = useJarvisStore.getState();
      // Always transition to full screen mode when wake word is spoken
      store.openJarvis(trailingCommand || undefined, 'fullscreen');
    };

    window.addEventListener('jarvis-hotword-triggered', handleHotwordTriggered);
    return () => {
      window.removeEventListener('jarvis-hotword-triggered', handleHotwordTriggered);
    };
  }, []);

  // Keyboard shortcut (Ctrl+J or Cmd+J)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        const store = useJarvisStore.getState();
        store.openJarvis(undefined, 'fullscreen');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    startListening: () => jarvisVoiceEngine.startWakeWordDetection(),
    stopListening: () => jarvisVoiceEngine.stopWakeWordDetection(),
  };
}
