"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, Sparkles, Mic, CheckCircle2, AlertTriangle, 
  RefreshCw, Zap, Shield, Cpu, Activity, Info, Eye, EyeOff, 
  Check, ChevronRight, BarChart3, Database, Layers
} from 'lucide-react';
import { 
  AVAILABLE_MODELS, 
  getSelectedTextModel, 
  setSelectedTextModel, 
  getSelectedLiveModel, 
  setSelectedLiveModel, 
  getAiSessionUsage, 
  resetAiSessionUsage, 
  AiSessionUsage,
  ModelDefinition
} from '../../lib/aiModelConfig';

export default function AiModelSelector() {
  const [selectedText, setSelectedText] = useState<string>('gemma-4-26b-a4b-it');
  const [selectedVoice, setSelectedVoice] = useState<string>('gemini-2.0-flash-exp');
  const [customModelInput, setCustomModelInput] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<string | null>(null);

  // Capability Test State
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    model: string;
    message: string;
    latencyMs?: number;
    capabilities?: {
      textReasoning: boolean;
      toolRouting: boolean;
      structuredJson: boolean;
      liveAudio?: boolean;
    };
    isFallback?: boolean;
    fallbackModel?: string;
    errorType?: string;
  } | null>(null);

  // Usage Telemetry State
  const [usage, setUsage] = useState<AiSessionUsage>(getAiSessionUsage());

  useEffect(() => {
    setSelectedText(getSelectedTextModel());
    setSelectedVoice(getSelectedLiveModel());
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('gemini-api-key') || '';
      setApiKey(savedKey);
    }

    const handleModelChange = () => {
      setSelectedText(getSelectedTextModel());
      setSelectedVoice(getSelectedLiveModel());
    };

    const handleUsageChange = (e: any) => {
      if (e?.detail) setUsage(e.detail);
      else setUsage(getAiSessionUsage());
    };

    window.addEventListener('ai-model-changed', handleModelChange);
    window.addEventListener('ai-usage-updated', handleUsageChange);

    return () => {
      window.removeEventListener('ai-model-changed', handleModelChange);
      window.removeEventListener('ai-usage-updated', handleUsageChange);
    };
  }, []);

  const handleSelectTextModel = (modelId: string) => {
    setSelectedText(modelId);
    setSelectedTextModel(modelId);
    setTestResult(null);
  };

  const handleSaveApiKey = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gemini-api-key', apiKey.trim());
      setApiKeyStatus('API Key saved securely to your browser storage.');
      setTimeout(() => setApiKeyStatus(null), 4000);
    }
  };

  const runModelCapabilityTest = async (modelToTest?: string) => {
    const targetModel = modelToTest || selectedText;
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          model: targetModel,
          isTest: true
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          model: data.model || targetModel,
          message: data.message || `Model ${targetModel} is verified and ready.`,
          latencyMs: data.latencyMs,
          capabilities: data.capabilities,
          isFallback: data.isFallback,
          fallbackModel: data.fallbackModel
        });
      } else {
        setTestResult({
          success: false,
          model: targetModel,
          message: data.error || 'Capability test failed or model is unreachable.',
          errorType: data.errorType,
          latencyMs: data.latencyMs
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        model: targetModel,
        message: err?.message || 'Network error attempting model ping.',
        errorType: 'NETWORK_ERROR'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const textModels = AVAILABLE_MODELS.filter(m => m.category === 'text');
  const voiceModels = AVAILABLE_MODELS.filter(m => m.category === 'voice');

  return (
    <div className="space-y-8">
      {/* SECTION 1: DUAL MODEL ARCHITECTURE SELECTOR */}
      <div className="space-y-6">
        
        {/* TEXT REASONING MODEL (Gemma 4 26B Primary) */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Bot size={16} className="text-cyan-400" />
                <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono">
                  1. Text Reasoning & Tool Routing Model
                </h3>
              </div>
              <p className="text-xs text-white/50 font-mono mt-0.5">
                Powers command classification, search, summarization, tool argument extraction, and text chat.
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold self-start sm:self-auto">
              ACTIVE: {selectedText}
            </span>
          </div>

          {/* Model Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {textModels.map((m) => {
              const isSelected = selectedText === m.id;
              const isGemma4 = m.id.includes('gemma-4');

              return (
                <div
                  key={m.id}
                  onClick={() => handleSelectTextModel(m.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.2)] ring-1 ring-cyan-400/50'
                      : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Top Header Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider ${
                      isGemma4 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/10 text-white/70'
                    }`}>
                      {m.quotaTier} Quota
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-300 font-bold">
                        <Check size={12} /> Active
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h4 className={`text-sm font-mono font-bold ${isSelected ? 'text-cyan-300' : 'text-white'}`}>
                      {m.name}
                    </h4>
                    <p className="text-[10px] font-mono text-cyan-400/70 truncate mt-0.5">
                      {m.id}
                    </p>
                    <p className="text-[11px] text-white/50 leading-relaxed mt-2 line-clamp-2 font-sans">
                      {m.description}
                    </p>
                  </div>

                  {/* Capabilities Footnote */}
                  <div className="pt-3 mt-3 border-t border-white/5 flex flex-wrap gap-1.5">
                    {m.capabilities.textReasoning && (
                      <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] font-mono text-white/70">
                        Reasoning
                      </span>
                    )}
                    {m.capabilities.toolRouting && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-[9px] font-mono text-purple-300 border border-purple-500/20">
                        Tools
                      </span>
                    )}
                    {m.capabilities.vision && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-[9px] font-mono text-amber-300 border border-amber-500/20">
                        Vision
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Text Model Input */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <label className="text-[10px] uppercase font-mono tracking-widest text-white/40 block mb-1">
                Custom Text Model Identifier
              </label>
              <input
                type="text"
                value={customModelInput}
                onChange={(e) => setCustomModelInput(e.target.value)}
                placeholder="e.g. gemma-4-26b-a4b-it, gemini-3.7-flash-thinking-exp..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <button
              onClick={() => {
                if (customModelInput.trim()) {
                  handleSelectTextModel(customModelInput.trim());
                  setCustomModelInput('');
                }
              }}
              disabled={!customModelInput.trim()}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white text-black font-mono font-bold text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-30 transition-opacity shrink-0 cursor-pointer self-end"
            >
              Apply Model
            </button>
          </div>
        </div>

        {/* VOICE & LIVE AUDIO MODEL (Gemini Live-Compatible) */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Mic size={16} className="text-purple-400" />
                <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono">
                  2. Voice & Live Audio Model
                </h3>
              </div>
              <p className="text-xs text-white/50 font-mono mt-0.5">
                Dedicated to real-time low-latency bidirectional voice dialogue and audio streaming.
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest bg-purple-500/10 text-purple-300 border border-purple-500/30 font-bold self-start sm:self-auto">
              VOICE ENGINE: {selectedVoice}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {voiceModels.map((m) => {
              const isSelected = selectedVoice === m.id;

              return (
                <div
                  key={m.id}
                  onClick={() => {
                    setSelectedVoice(m.id);
                    setSelectedLiveModel(m.id);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-purple-500/15 border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.2)] ring-1 ring-purple-400/50'
                      : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Live Audio Capable
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-purple-300 font-bold">
                        <Check size={12} /> Active Voice Model
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className={`text-sm font-mono font-bold ${isSelected ? 'text-purple-300' : 'text-white'}`}>
                      {m.name}
                    </h4>
                    <p className="text-[10px] font-mono text-purple-400/70 truncate mt-0.5">
                      {m.id}
                    </p>
                    <p className="text-[11px] text-white/50 leading-relaxed mt-2 font-sans">
                      {m.description}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-white/40">
                    <span>Bidirectional Streaming</span>
                    <span className="text-purple-300 font-bold">Low Latency</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 2: API KEY & CAPABILITY VERIFICATION */}
      <div className="p-6 rounded-3xl bg-zinc-950/80 border border-white/10 space-y-4 backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <Shield size={18} className="text-cyan-400" />
            <span className="text-xs font-mono uppercase font-bold text-white tracking-wider">
              Gemini API Key & Model Capability Verification
            </span>
          </div>
          <span className="text-[10px] font-mono text-white/40">SECURE LOCAL SANDBOX</span>
        </div>

        {/* API Key Input Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter Gemini API key (AIzaSy...)"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono pr-10"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer"
            >
              {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveApiKey}
              className="px-5 py-3 bg-white text-black font-mono font-bold text-xs uppercase tracking-wider rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-md shrink-0 cursor-pointer"
            >
              Save Key
            </button>

            <button
              onClick={() => runModelCapabilityTest(selectedText)}
              disabled={isTesting}
              className="px-5 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-mono font-bold text-xs uppercase tracking-wider rounded-2xl transition-all disabled:opacity-50 shrink-0 flex items-center gap-2 cursor-pointer"
            >
              {isTesting && <RefreshCw size={13} className="animate-spin" />}
              <span>{isTesting ? 'Verifying...' : `Test ${selectedText}`}</span>
            </button>
          </div>
        </div>

        {apiKeyStatus && (
          <p className="text-xs font-mono text-emerald-400">{apiKeyStatus}</p>
        )}

        {/* Capability Test Result Card */}
        {testResult && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl border font-mono space-y-2.5 ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : testResult.errorType === 'QUOTA_EXHAUSTED'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2">
                {testResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>
                  {testResult.success 
                    ? `CAPABILITY TEST PASSED: ${testResult.model}` 
                    : `TEST FAILED (${testResult.errorType || 'ERROR'})`}
                </span>
              </div>
              {testResult.latencyMs && (
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px]">
                  {testResult.latencyMs}ms Latency
                </span>
              )}
            </div>

            <p className="text-xs leading-relaxed text-white/90">
              {testResult.message}
            </p>

            {testResult.capabilities && (
              <div className="pt-2 border-t border-white/10 flex flex-wrap gap-2 text-[10px]">
                <span className="px-2 py-0.5 rounded bg-white/10 text-white flex items-center gap-1">
                  <Check size={10} className="text-emerald-400" /> Text Reasoning
                </span>
                <span className="px-2 py-0.5 rounded bg-white/10 text-white flex items-center gap-1">
                  <Check size={10} className="text-emerald-400" /> Tool Routing
                </span>
                <span className="px-2 py-0.5 rounded bg-white/10 text-white flex items-center gap-1">
                  <Check size={10} className="text-emerald-400" /> Structured JSON Output
                </span>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* SECTION 3: QUOTA & USAGE TELEMETRY PANEL */}
      <div className="p-6 rounded-3xl bg-zinc-950/80 border border-white/10 space-y-4 backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-cyan-400" />
            <span className="text-xs font-mono uppercase font-bold text-white tracking-wider">
              Session Quota & Usage Telemetry
            </span>
          </div>
          <button
            onClick={resetAiSessionUsage}
            className="text-[10px] font-mono text-white/40 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
          >
            Reset Counters
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="text-[10px] text-white/40 uppercase tracking-widest block">Session Requests</span>
            <span className="text-xl font-bold text-white">{usage.sessionRequests}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="text-[10px] text-white/40 uppercase tracking-widest block">Estimated Input</span>
            <span className="text-xl font-bold text-cyan-300">~{usage.estimatedInputTokens.toLocaleString()} tokens</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="text-[10px] text-white/40 uppercase tracking-widest block">Estimated Output</span>
            <span className="text-xl font-bold text-purple-300">~{usage.estimatedOutputTokens.toLocaleString()} tokens</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="text-[10px] text-white/40 uppercase tracking-widest block">Fallback Triggers</span>
            <span className={`text-xl font-bold ${usage.fallbackCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {usage.fallbackCount}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] font-mono text-white/40 pt-2 border-t border-white/5 gap-2">
          <span>Active Text Model: <strong className="text-white">{selectedText}</strong></span>
          <span>Active Voice Model: <strong className="text-purple-300">{selectedVoice}</strong></span>
          {usage.lastLatencyMs > 0 && <span>Last Roundtrip: <strong className="text-cyan-400">{usage.lastLatencyMs}ms</strong></span>}
        </div>
      </div>
    </div>
  );
}
