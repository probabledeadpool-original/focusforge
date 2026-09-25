"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Radio, CheckCircle2, AlertTriangle, 
  RefreshCw, Eye, EyeOff, Check, ExternalLink, Sparkles
} from 'lucide-react';
import { useSpotifyStore } from '../../../hooks/useSpotifyStore';

export default function SpotifyApiConfig() {
  const store = useSpotifyStore();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    store.loadCredentials();
  }, []);

  useEffect(() => {
    setClientId(store.clientId || '');
    setClientSecret(store.clientSecret || '');
  }, [store.clientId, store.clientSecret]);

  const handleSave = () => {
    store.setCredentials(clientId.trim(), clientSecret.trim());
    setSaveStatus('Spotify API credentials saved to browser storage.');
    setTimeout(() => setSaveStatus(null), 3500);
  };

  const handleTest = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      setTestResult({
        success: false,
        message: 'Please enter both Client ID and Client Secret before testing.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    store.setCredentials(clientId.trim(), clientSecret.trim());

    try {
      await store.fetchCategories();
      setTestResult({ success: true, message: 'Spotify API verified successfully.' });
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || 'Failed to authenticate.' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 rounded-3xl bg-zinc-950/80 border border-white/10 space-y-6 backdrop-blur-2xl shadow-[0_0_50px_rgba(34,197,94,0.03)] relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-green-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.2)] shrink-0">
            <Radio size={20} />
          </div>
          <div>
            <h3 className="font-heading text-lg sm:text-xl font-bold text-white lowercase">Spotify Web API</h3>
            <p className="text-[11px] text-white/50 font-mono mt-0.5">
              POWERS THE FREQUENCY SPOTIFY INTEGRATION
            </p>
          </div>
        </div>

        <a 
          href="https://developer.spotify.com/dashboard" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-[10px] font-mono uppercase tracking-wider transition-all self-start sm:self-auto cursor-pointer"
        >
          <span>Get Free Key</span>
          <ExternalLink size={12} />
        </a>
      </div>

      {/* Inputs & Actions */}
      <div className="space-y-4">
        <div className="space-y-3">
          <label className="text-[10px] uppercase font-mono tracking-widest text-white/40 block">
            Client ID
          </label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Enter Client ID"
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-green-400 font-mono transition-colors"
          />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] uppercase font-mono tracking-widest text-white/40 block">
            Client Secret
          </label>
          <div className="relative">
            <input
              type={showSecret ? "text" : "password"}
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Enter Client Secret"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-green-400 font-mono pr-10 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer"
              title={showSecret ? "Hide secret" : "Show secret"}
            >
              {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleSave}
            className="px-5 py-3 bg-white text-black font-mono font-bold text-xs uppercase tracking-wider rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-md shrink-0 cursor-pointer flex-1 sm:flex-none"
          >
            Save Credentials
          </button>

          <button
            onClick={handleTest}
            disabled={isTesting}
            className="px-5 py-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 font-mono font-bold text-xs uppercase tracking-wider rounded-2xl transition-all disabled:opacity-50 shrink-0 flex items-center justify-center gap-2 cursor-pointer flex-1 sm:flex-none"
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

        {saveStatus && (
          <p className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 pt-1">
            <Check size={14} /> {saveStatus}
          </p>
        )}
      </div>

      {/* Test Feedback */}
      {testResult && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border font-mono space-y-2 ${
            testResult.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-2">
              {testResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>
                {testResult.success 
                  ? 'SPOTIFY API VERIFIED' 
                  : 'SPOTIFY API ERROR'}
              </span>
            </div>
          </div>
          <p className="text-xs text-white/90 leading-relaxed">
            {testResult.message}
          </p>
        </motion.div>
      )}
    </div>
  );
}
