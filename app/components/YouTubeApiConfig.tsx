"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Youtube, Shield, CheckCircle2, AlertTriangle, 
  RefreshCw, Eye, EyeOff, Check, ExternalLink, Sparkles, Key
} from 'lucide-react';
import { getYouTubeApiKey, setYouTubeApiKey, testYouTubeApiKey } from '../../lib/youtubeSearch';

export default function YouTubeApiConfig() {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
    errorType?: string;
  } | null>(null);

  useEffect(() => {
    setApiKey(getYouTubeApiKey());

    const handleKeyUpdate = (e: any) => {
      if (e?.detail?.key !== undefined) {
        setApiKey(e.detail.key);
      }
    };
    window.addEventListener('youtube-api-key-updated', handleKeyUpdate);
    return () => window.removeEventListener('youtube-api-key-updated', handleKeyUpdate);
  }, []);

  const handleSave = () => {
    setYouTubeApiKey(apiKey);
    setSaveStatus('YouTube Data API key saved to browser storage.');
    setTimeout(() => setSaveStatus(null), 3500);
  };

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setTestResult({
        success: false,
        message: 'Please enter a YouTube Data API v3 key before testing.',
        errorType: 'MISSING_KEY'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await testYouTubeApiKey(apiKey.trim());
      setTestResult(res);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 rounded-3xl bg-zinc-950/80 border border-white/10 space-y-6 backdrop-blur-2xl shadow-[0_0_50px_rgba(239,68,68,0.03)] relative overflow-hidden">
      {/* Background Subtle Flare */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)] shrink-0">
            <Youtube size={20} />
          </div>
          <div>
            <h3 className="font-heading text-lg sm:text-xl font-bold text-white lowercase">YouTube Data API v3</h3>
            <p className="text-[11px] text-white/50 font-mono mt-0.5">
              POWERS REAL-TIME VIDEO SEARCH ACROSS THE PLACE, J.A.R.V.I.S., & EVERYTHING ISLAND (/yt)
            </p>
          </div>
        </div>

        <a 
          href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-[10px] font-mono uppercase tracking-wider transition-all self-start sm:self-auto cursor-pointer"
        >
          <span>Get Free Key</span>
          <ExternalLink size={12} />
        </a>
      </div>

      {/* Key Input & Actions */}
      <div className="space-y-3">
        <label className="text-[10px] uppercase font-mono tracking-widest text-white/40 block">
          YouTube Data API Key
        </label>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy... (YouTube Data API v3 Key)"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-red-400 font-mono pr-10 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer"
              title={showApiKey ? "Hide key" : "Show key"}
            >
              {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="px-5 py-3 bg-white text-black font-mono font-bold text-xs uppercase tracking-wider rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-md shrink-0 cursor-pointer"
            >
              Save Key
            </button>

            <button
              onClick={handleTest}
              disabled={isTesting}
              className="px-5 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-mono font-bold text-xs uppercase tracking-wider rounded-2xl transition-all disabled:opacity-50 shrink-0 flex items-center gap-2 cursor-pointer"
            >
              {isTesting ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>Test Connection</span>
                </>
              )}
            </button>
          </div>
        </div>

        {saveStatus && (
          <p className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 pt-1">
            <Check size={14} /> {saveStatus}
          </p>
        )}
      </div>

      {/* Test Feedback Card */}
      {testResult && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border font-mono space-y-2 ${
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
                  ? 'YOUTUBE DATA API VERIFIED' 
                  : `YOUTUBE API ERROR (${testResult.errorType || 'FAILED'})`}
              </span>
            </div>
            {testResult.latencyMs && (
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px]">
                {testResult.latencyMs}ms Latency
              </span>
            )}
          </div>
          <p className="text-xs text-white/90 leading-relaxed">
            {testResult.message}
          </p>
        </motion.div>
      )}

      {/* Feature capabilities footnote */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5 text-[11px] font-mono text-white/50">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>The Place Live Video Stream</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          <span>Jarvis "search for video"</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
          <span>Everything Island /yt Query</span>
        </div>
      </div>
    </div>
  );
}
