"use client";

import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, Cpu, Check, Activity } from 'lucide-react';
import { AVAILABLE_MODELS, getSelectedTextModel, setSelectedTextModel } from '@/lib/aiModelConfig';

interface QuickAiModelSectionProps {
  onOpenModelSelector?: () => void;
}

export const QuickAiModelSection: React.FC<QuickAiModelSectionProps> = ({
  onOpenModelSelector
}) => {
  const [selectedModel, setSelectedModel] = useState<string>('gemma-4-26b-a4b-it');

  useEffect(() => {
    setSelectedModel(getSelectedTextModel());

    const handleModelChange = (e: any) => {
      setSelectedModel(getSelectedTextModel());
    };

    window.addEventListener('ai-model-changed', handleModelChange);
    return () => window.removeEventListener('ai-model-changed', handleModelChange);
  }, []);

  const handleSelect = (modelId: string) => {
    setSelectedModel(modelId);
    setSelectedTextModel(modelId);
  };

  const currentDef = AVAILABLE_MODELS.find(m => m.id === selectedModel) || AVAILABLE_MODELS[0];

  return (
    <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all backdrop-blur-2xl space-y-2.5 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Cpu size={13} />
          </div>
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-white">
              AI Intelligence Engine
            </span>
            <p className="text-[8px] font-mono text-cyan-300/80 tracking-tight">
              Active: {currentDef?.name || 'Gemma 4'}
            </p>
          </div>
        </div>

        <span className="text-[8px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full font-bold border text-emerald-300 bg-emerald-500/10 border-emerald-500/25 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          ONLINE
        </span>
      </div>

      {/* Fast Model Selector Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
        {[
          { id: 'gemma-4-26b-a4b-it', label: 'Gemma 4 26B', tag: 'High Quota' },
          { id: 'gemma-4-31b-it', label: 'Gemma 4 31B', tag: 'Flagship' },
          { id: 'gemma-2-27b-it', label: 'Gemma 2 27B', tag: 'Reasoning' },
          { id: 'gemini-2.5-flash', label: 'Gemini 2.5', tag: 'Low Latency' },
        ].map((m) => {
          const isSelected = selectedModel === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => handleSelect(m.id)}
              aria-pressed={isSelected}
              aria-label={`Select AI Model: ${m.label}`}
              className={`py-1.5 px-2 rounded-xl text-left transition-all border cursor-pointer flex flex-col justify-between focus:outline-none focus:ring-1 focus:ring-cyan-500/50 ${
                isSelected
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                  : 'bg-white/[0.02] border-white/[0.05] text-white/50 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold uppercase truncate">
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
    </div>
  );
};
