"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, Shield, Clock, Terminal, AlertTriangle, 
  CheckCircle2, X, Sliders, Trash2, Cpu, Mic, Database
} from 'lucide-react';
import { useJarvisStore } from '../../hooks/useJarvisStore';
import { jarvisVoiceEngine, DiagnosticEvent } from '../../lib/jarvisVoiceEngine';
import { voiceConfig } from '../../lib/voiceConfig';

export interface JarvisDiagnosticsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JarvisDiagnosticsPanel({
  isOpen,
  onClose
}: JarvisDiagnosticsPanelProps) {
  const { telemetry } = useJarvisStore();
  const [activeTab, setActiveTab] = useState<'transitions' | 'telemetry' | 'config'>('transitions');
  const [configValues, setConfigValues] = useState({
    wakeConfidenceThreshold: voiceConfig.wakeConfidenceThreshold,
    intentConfidenceThreshold: voiceConfig.intentConfidenceThreshold,
    commandTimeoutMs: voiceConfig.commandTimeoutMs,
    silenceDebounceMs: voiceConfig.silenceDebounceMs
  });

  if (!isOpen) return null;

  const handleConfigChange = (key: keyof typeof configValues, val: number) => {
    setConfigValues(prev => ({ ...prev, [key]: val }));
    (voiceConfig as any)[key] = val;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-3xl max-h-[85vh] bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100 font-mono"
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Terminal size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wider text-white">
                JARVIS Voice Engine Diagnostics
              </h3>
              <p className="text-[10px] text-zinc-400">
                Finite State Machine Telemetry & Confidence Matrix
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex bg-black/60 rounded-xl p-0.5 border border-zinc-800">
              <button
                onClick={() => setActiveTab('transitions')}
                className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                  activeTab === 'transitions' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                FSM Log ({telemetry.stateHistory.length})
              </button>
              <button
                onClick={() => setActiveTab('telemetry')}
                className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                  activeTab === 'telemetry' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Live Metrics
              </button>
              <button
                onClick={() => setActiveTab('config')}
                className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                  activeTab === 'config' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Thresholds
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {activeTab === 'transitions' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-1 border-b border-zinc-800/60">
                <span>Transition History (Latest First)</span>
                <span>FSM State: <strong className="text-cyan-400">{telemetry.state}</strong></span>
              </div>

              {telemetry.stateHistory.length === 0 ? (
                <div className="py-12 text-center text-zinc-500">
                  No state transitions recorded yet. Utter &ldquo;Jarvis&rdquo; to begin.
                </div>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {telemetry.stateHistory.map((event) => (
                    <div 
                      key={event.id}
                      className="p-2.5 rounded-xl bg-black/40 border border-zinc-800/80 hover:border-zinc-700 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className="text-zinc-400">{event.fromState}</span>
                          <span className="text-zinc-600">→</span>
                          <span className="text-cyan-300">{event.toState}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {new Date(event.timestamp).toLocaleTimeString()}.{String(event.timestamp % 1000).padStart(3, '0')}
                        </span>
                      </div>

                      <div className="text-[11px] text-zinc-300">
                        {event.reason}
                      </div>

                      {/* Detail Pill Badges */}
                      <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
                        {event.wakeConfidence !== undefined && event.wakeConfidence > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
                            Wake Conf: {(event.wakeConfidence * 100).toFixed(0)}%
                          </span>
                        )}
                        {event.intentConfidence !== undefined && event.intentConfidence > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-950/60 border border-purple-800/60 text-purple-400">
                            Intent Conf: {(event.intentConfidence * 100).toFixed(0)}%
                          </span>
                        )}
                        {event.candidateText && (
                          <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
                            Candidate: &ldquo;{event.candidateText}&rdquo;
                          </span>
                        )}
                        {event.commandTranscript && (
                          <span className="px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-800/60 text-cyan-300">
                            Transcript: &ldquo;{event.commandTranscript}&rdquo;
                          </span>
                        )}
                        {event.durationMs !== undefined && event.durationMs > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400">
                            Duration: {event.durationMs}ms
                          </span>
                        )}
                        {event.error && (
                          <span className="px-2 py-0.5 rounded-md bg-red-950/80 border border-red-800 text-red-300">
                            Error: {event.error}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'telemetry' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-black/40 border border-zinc-800 space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">FSM State Telemetry</span>
                <div className="space-y-1 text-zinc-300">
                  <div className="flex justify-between">
                    <span>Current State:</span>
                    <strong className="text-cyan-400">{telemetry.state}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Previous State:</span>
                    <span className="text-zinc-400">{telemetry.previousState}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Microphone:</span>
                    <span className={telemetry.isMicrophoneActive ? "text-emerald-400" : "text-zinc-500"}>
                      {telemetry.microphoneStatus} ({telemetry.isMicrophoneActive ? 'Active' : 'Idle'})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>TTS Playing:</span>
                    <span className={telemetry.isTTSPlaying ? "text-amber-400" : "text-zinc-500"}>
                      {telemetry.isTTSPlaying ? 'Yes (Microphone Gated)' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Audio Uploaded:</span>
                    <span className="text-emerald-400 font-bold">
                      {telemetry.audioUploaded ? 'Uploaded' : 'False (Zero Standby Audio Uploaded)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-zinc-800 space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Confidence Scores</span>
                <div className="space-y-1 text-zinc-300">
                  <div className="flex justify-between">
                    <span>Last Wake Confidence:</span>
                    <span className="text-emerald-400 font-bold">
                      {telemetry.wakeConfidence ? `${(telemetry.wakeConfidence * 100).toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Intent Confidence:</span>
                    <span className="text-purple-400 font-bold">
                      {telemetry.intentConfidence ? `${(telemetry.intentConfidence * 100).toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Parsed Intent:</span>
                    <span className="text-zinc-300 font-mono">
                      {telemetry.lastParsedIntent || 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending Confirmation:</span>
                    <span className={telemetry.hasPendingConfirmation ? "text-amber-400 font-bold" : "text-zinc-500"}>
                      {telemetry.hasPendingConfirmation ? 'Required' : 'None'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-3">
              <p className="text-[11px] text-zinc-400">
                Adjust runtime thresholds for testing false-positive rejection and timeout resilience:
              </p>

              <div className="space-y-3 bg-black/40 p-3 rounded-xl border border-zinc-800">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Wake Word Confidence Threshold</span>
                    <strong className="text-emerald-400">{(configValues.wakeConfidenceThreshold * 100).toFixed(0)}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0.50"
                    max="0.99"
                    step="0.05"
                    value={configValues.wakeConfidenceThreshold}
                    onChange={(e) => handleConfigChange('wakeConfidenceThreshold', parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Intent Confidence Threshold</span>
                    <strong className="text-purple-400">{(configValues.intentConfidenceThreshold * 100).toFixed(0)}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0.50"
                    max="0.99"
                    step="0.05"
                    value={configValues.intentConfidenceThreshold}
                    onChange={(e) => handleConfigChange('intentConfidenceThreshold', parseFloat(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Silence Debounce Time</span>
                    <strong className="text-cyan-400">{configValues.silenceDebounceMs} ms</strong>
                  </div>
                  <input
                    type="range"
                    min="400"
                    max="2000"
                    step="100"
                    value={configValues.silenceDebounceMs}
                    onChange={(e) => handleConfigChange('silenceDebounceMs', parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Command Silence Timeout</span>
                    <strong className="text-cyan-400">{configValues.commandTimeoutMs / 1000} s</strong>
                  </div>
                  <input
                    type="range"
                    min="3000"
                    max="15000"
                    step="1000"
                    value={configValues.commandTimeoutMs}
                    onChange={(e) => handleConfigChange('commandTimeoutMs', parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-zinc-900/40 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Shield size={12} className="text-emerald-400" />
            <span>Local Web Speech FSM • Strictly Non-Invasive</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
