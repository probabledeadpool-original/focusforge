"use client";

import { useEffect } from 'react';
import { useJarvisStore } from './useJarvisStore';
import { jarvisVoiceEngine } from '../lib/jarvisVoiceEngine';

export function useJarvisHotword() {
  const { 
    isHotwordEnabled, 
    openJarvis, 
  } = useJarvisStore();

  useEffect(() => {
    // Keep wake-word detection active whenever hotword is enabled
    if (isHotwordEnabled) {
      jarvisVoiceEngine.startWakeWordDetection();
    } else {
      jarvisVoiceEngine.stopWakeWordDetection();
    }

    // Auto-warmup audio and speech recognition on first user click/touch/keypress
    const warmupListener = () => {
      if (isHotwordEnabled) {
        jarvisVoiceEngine.startWakeWordDetection();
      }
      window.removeEventListener('click', warmupListener);
      window.removeEventListener('touchstart', warmupListener);
      window.removeEventListener('keydown', warmupListener);
    };

    window.addEventListener('click', warmupListener, { once: true });
    window.addEventListener('touchstart', warmupListener, { once: true });
    window.addEventListener('keydown', warmupListener, { once: true });

    return () => {
      window.removeEventListener('click', warmupListener);
      window.removeEventListener('touchstart', warmupListener);
      window.removeEventListener('keydown', warmupListener);
    };
  }, [isHotwordEnabled]);

  // Global hotword trigger listener
  useEffect(() => {
    const handleHotwordTriggered = (e: any) => {
      const { trailingCommand } = e?.detail || {};
      const store = useJarvisStore.getState();
      // If JARVIS is already open in expanded or full screen, don't force reset mode
      store.openJarvis(trailingCommand || undefined, store.displayMode || 'fullscreen');
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
