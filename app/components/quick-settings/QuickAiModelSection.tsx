"use client";

import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, Cpu, Check, Radio, Sun, Brain, Languages, FileAudio } from 'lucide-react';
import { 
  AVAILABLE_MODELS, 
  getSelectedTextModel, 
  setSelectedTextModel,
  getSelectedLiveModel,
  setSelectedLiveModel,
  LIVE_MODELS_MAP
} from '@/lib/aiModelConfig';

interface QuickAiModelSectionProps {
  onOpenModelSelector?: () => void;
}

export const QuickAiModelSection: React.FC<QuickAiModelSectionProps> = ({
  onOpenModelSelector
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'live'>('live');
  const [selectedTextModel, setSelectedTextModelState] = useState<string>('gemma-4-26b-a4b-it');
  const [selectedLiveModel, setSelectedLiveModelState] = useState<string>('gemini-2.5-flash-native-audio-dialog');
  const [liveGlowIntensity, setLiveGlowIntensity] = useState<number>(0.85);

  useEffect(() => {
    setSelectedTextModelState(getSelectedTextModel());
    setSelectedLiveModelState(getSelectedLiveModel());

    if (typeof window !== 'undefined') {
      const savedGlow = localStorage.getItem('jarvis-live-glow-intensity');
      if (savedGlow) {
        const parsed = parseFloat(savedGlow);
        if (!isNaN(parsed)) setLiveGlowIntensity(parsed);
      }
    }

    const handleModelChange = () => {
      setSelectedTextModelState(getSelectedTextModel());
      setSelectedLiveModelState(getSelectedLiveModel());
    };

    const handleGlowChange = (e: any) => {
      if (e.detail?.intensity) setLiveGlowIntensity(e.detail.intensity);
    };

    window.addEventListener('ai-model-changed', handleModelChange);
    window.addEventListener('jarvis-live-glow-intensity-changed', handleGlowChange);
    return () => {
      window.removeEventListener('ai-model-changed', handleModelChange);
      window.removeEventListener('jarvis-live-glow-intensity-changed', handleGlowChange);
    };
  }, []);

  const handleSelectText = (modelId: string) => {
    setSelectedTextModelState(modelId);
    setSelectedTextModel(modelId);
  };

  const handleSelectLive = (modelId: string) => {
    setSelectedLiveModelState(modelId);
    setSelectedLiveModel(modelId);
  };

  const handleGlowSlider = (val: number) => {
    setLiveGlowIntensity(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jarvis-live-glow-intensity', val.toString());
      window.dispatchEvent(new CustomEvent('jarvis-live-glow-intensity-changed', { detail: { intensity: val } }));
    }
  };

  const currentTextDef = AVAILABLE_MODELS.find(m => m.id === selectedTextModel) || AVAILABLE_MODELS[0];
  const currentLiveDef = LIVE_MODELS_MAP[selectedLiveModel] || Object.values(LIVE_MODELS_MAP)[0];

  return (
    <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all backdrop-blur-2xl space-y-2.5 shadow-lg">
      {/* Header with Mode Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            {activeTab === 'live' ? <Radio size={13} className="animate-pulse" /> : <Cpu size={13} />}
          </div>
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-white">
              {activeTab === 'live' ? 'Gemini Live Voice' : 'Text AI Intelligence'}
            </span>
            <p className="text-[8px] font-mono text-cyan-300/80 tracking-tight truncate max-w-[170px]">
              {activeTab === 'live' ? currentLiveDef?.name : currentTextDef?.name}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`px-2 py-0.5 rounded-md text-[8px] font-mono uppercase font-bold tracking-wider transition-all ${
              activeTab === 'live'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-white/40 hover:text-white'
            }`}
          >
            Live Voice
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`px-2 py-0.5 rounded-md text-[8px] font-mono uppercase font-bold tracking-wider transition-all ${
              activeTab === 'text'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-white/40 hover:text-white'
            }`}
          >
            Text
          </button>
        </div>
      </div>

      {/* Tab: Gemini Live Engine */}
      {activeTab === 'live' && (
        <div className="space-y-2">
          {/* 6 Live Models Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-0.5">
            {[
              { id: 'gemini-2.5-flash-native-audio-dialog', label: '2.5 Flash Native', tag: 'Dialog (Default)' },
              { id: 'gemini-3-flash-live', label: '3 Flash Live', tag: 'Ultra-Low 200ms' },
              { id: 'gemini-3.5-live-translate', label: '3.5 Translate', tag: 'Multilingual' },
              { id: 'gemini-3.5-transcribe-live', label: '3.5 Transcribe', tag: 'Speech-to-Text' },
              { id: 'gemini-3.8-live', label: '3.8 Live', tag: 'Extended Context' },
              { id: 'gemini-3.8-live-extended-thinking', label: '3.8 Thinking', tag: 'Deep Reasoning' },
            ].map((m) => {
              const isSelected = selectedLiveModel === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectLive(m.id)}
                  aria-pressed={isSelected}
                  className={`py-1.5 px-2 rounded-xl text-left transition-all border cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.2)] font-bold'
                      : 'bg-white/[0.02] border-white/[0.05] text-white/50 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono uppercase truncate">
                      {m.label}
                    </span>
                    {isSelected && <Check size={10} className="text-cyan-400 shrink-0" />}
                  </div>
                  <span className="text-[7px] font-mono text-white/40 tracking-tight mt-0.5">
                    {m.tag}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Live Glow Intensity Control */}
          <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-[9px] font-mono">
              <span className="text-white/60 flex items-center gap-1">
                <Sun size={10} className="text-cyan-400" /> Voice Glow Intensity
              </span>
              <span className="text-cyan-300 font-bold">
                {Math.round(liveGlowIntensity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.2"
              step="0.05"
              value={liveGlowIntensity}
              onChange={(e) => handleGlowSlider(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-1 bg-white/10 rounded-lg cursor-pointer appearance-none"
            />
          </div>
        </div>
      )}

      {/* Tab: Text AI Models */}
      {activeTab === 'text' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
          {[
            { id: 'gemma-4-26b-a4b-it', label: 'Gemma 4 26B', tag: 'High Quota' },
            { id: 'gemma-4-31b-it', label: 'Gemma 4 31B', tag: 'Flagship' },
            { id: 'gemma-2-27b-it', label: 'Gemma 2 27B', tag: 'Reasoning' },
            { id: 'gemini-2.5-flash', label: 'Gemini 2.5', tag: 'Low Latency' },
          ].map((m) => {
            const isSelected = selectedTextModel === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectText(m.id)}
                aria-pressed={isSelected}
                className={`py-1.5 px-2 rounded-xl text-left transition-all border cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.2)] font-bold'
                    : 'bg-white/[0.02] border-white/[0.05] text-white/50 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono uppercase truncate">
                    {m.label}
                  </span>
                  {isSelected && <Check size={10} className="text-cyan-400 shrink-0" />}
                </div>
                <span className="text-[7px] font-mono text-white/40 tracking-tight mt-0.5">
                  {m.tag}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
