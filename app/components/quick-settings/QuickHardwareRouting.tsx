"use client";

import React, { useState } from 'react';
import { Headphones, Mic, Volume2, ChevronDown, Check } from 'lucide-react';

interface AudioDevice {
  deviceId: string;
  label: string;
}

interface QuickHardwareRoutingProps {
  audioInputDevices: AudioDevice[];
  audioOutputDevices: AudioDevice[];
  selectedMicId: string;
  selectedSpeakerId: string;
  micPermissionGranted: boolean;
  onRequestMicAccess: () => void;
  onSelectMic: (deviceId: string) => void;
  onSelectSpeaker: (deviceId: string) => void;
  onRefreshDevices: () => void;
  onTestSpeakerChime: () => void;
  isTestingSpeaker: boolean;
}

export const QuickHardwareRouting: React.FC<QuickHardwareRoutingProps> = ({
  audioInputDevices,
  audioOutputDevices,
  selectedMicId,
  selectedSpeakerId,
  micPermissionGranted,
  onRequestMicAccess,
  onSelectMic,
  onSelectSpeaker,
  onRefreshDevices,
  onTestSpeakerChime,
  isTestingSpeaker
}) => {
  const [showMicPicker, setShowMicPicker] = useState(false);
  const [showSpeakerPicker, setShowSpeakerPicker] = useState(false);

  const activeMicLabel = audioInputDevices.find(d => d.deviceId === selectedMicId)?.label ||
    (audioInputDevices.length > 0 && micPermissionGranted ? audioInputDevices[0]?.label : 'Default System Mic');

  const activeSpeakerLabel = audioOutputDevices.find(d => d.deviceId === selectedSpeakerId)?.label ||
    (audioOutputDevices.length > 0 ? audioOutputDevices[0]?.label : 'Default System Output');

  return (
    <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all backdrop-blur-2xl space-y-2.5 shadow-lg relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Headphones size={14} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-white">
                Audio Hardware Routing
              </span>
              <span className="text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-full font-bold border text-cyan-300 bg-cyan-500/10 border-cyan-500/25">
                I/O DEVICES
              </span>
            </div>
            <p className="text-[9px] font-mono text-white/40 tracking-tight mt-0.5">
              Dedicated Microphone & Speaker Pipeline
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onTestSpeakerChime}
          disabled={isTestingSpeaker}
          className={`px-2.5 py-1 rounded-xl border text-[9px] font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
            isTestingSpeaker 
              ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)] animate-pulse' 
              : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10'
          }`}
          title="Test Speaker Audio with Precision Harmonic Chime"
          aria-label="Test speaker output sound"
        >
          <Volume2 size={11} className={isTestingSpeaker ? "animate-bounce text-cyan-300" : ""} />
          <span>{isTestingSpeaker ? 'Playing...' : 'Test Sound'}</span>
        </button>
      </div>

      <div className="space-y-2 pt-0.5">
        {/* Microphone Input Selector */}
        <div className="rounded-xl bg-black/40 border border-white/10 p-2.5 space-y-1.5 transition-all">
          <div className="text-[9px] font-mono uppercase tracking-widest text-white/50 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold text-white/70">
              <Mic size={11} className="text-rose-400" /> Microphone Input
            </span>
            {!micPermissionGranted ? (
              <button
                type="button"
                onClick={onRequestMicAccess}
                className="text-[8px] font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer focus:outline-none"
              >
                Grant Access
              </button>
            ) : (
              <span className="text-[8px] font-mono text-emerald-400/80">Active</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setShowMicPicker(!showMicPicker);
              setShowSpeakerPicker(false);
              onRefreshDevices();
            }}
            aria-expanded={showMicPicker}
            aria-label="Select Microphone Device"
            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/40 text-[10px] font-mono text-white/90 flex items-center justify-between transition-all cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
              <span className="truncate font-medium">{activeMicLabel}</span>
            </div>
            <ChevronDown size={12} className={`text-white/40 shrink-0 ml-1.5 transition-transform duration-200 ${showMicPicker ? 'rotate-180 text-cyan-400' : ''}`} />
          </button>

          {showMicPicker && (
            <div className="rounded-lg bg-black/95 border border-cyan-500/30 p-1 space-y-0.5 max-h-40 overflow-y-auto no-scrollbar shadow-2xl">
              <button
                type="button"
                onClick={() => {
                  onSelectMic('default');
                  setShowMicPicker(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-md text-[10px] font-mono transition-colors flex items-center justify-between cursor-pointer ${
                  selectedMicId === 'default' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="truncate">Default System Microphone</span>
                {selectedMicId === 'default' && <Check size={11} className="text-cyan-400 shrink-0" />}
              </button>

              {audioInputDevices.filter(d => d.deviceId !== 'default').map((dev, idx) => (
                <button
                  key={dev.deviceId || idx}
                  type="button"
                  onClick={() => {
                    onSelectMic(dev.deviceId);
                    setShowMicPicker(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-[10px] font-mono transition-colors flex items-center justify-between cursor-pointer ${
                    selectedMicId === dev.deviceId ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="truncate">{dev.label || `Microphone ${idx + 1}`}</span>
                  {selectedMicId === dev.deviceId && <Check size={11} className="text-cyan-400 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Speaker Output Selector */}
        <div className="rounded-xl bg-black/40 border border-white/10 p-2.5 space-y-1.5 transition-all">
          <div className="text-[9px] font-mono uppercase tracking-widest text-white/50 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold text-white/70">
              <Volume2 size={11} className="text-cyan-400" /> Speaker Output
            </span>
            <span className="text-[8px] font-mono text-white/40">
              {audioOutputDevices.length > 0 ? `${audioOutputDevices.length} available` : 'Default'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowSpeakerPicker(!showSpeakerPicker);
              setShowMicPicker(false);
              onRefreshDevices();
            }}
            aria-expanded={showSpeakerPicker}
            aria-label="Select Speaker Device"
            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/40 text-[10px] font-mono text-white/90 flex items-center justify-between transition-all cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 shadow-[0_0_6px_rgba(6,182,212,0.6)]" />
              <span className="truncate font-medium">{activeSpeakerLabel}</span>
            </div>
            <ChevronDown size={12} className={`text-white/40 shrink-0 ml-1.5 transition-transform duration-200 ${showSpeakerPicker ? 'rotate-180 text-cyan-400' : ''}`} />
          </button>

          {showSpeakerPicker && (
            <div className="rounded-lg bg-black/95 border border-cyan-500/30 p-1 space-y-0.5 max-h-40 overflow-y-auto no-scrollbar shadow-2xl">
              <button
                type="button"
                onClick={() => {
                  onSelectSpeaker('default');
                  setShowSpeakerPicker(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-md text-[10px] font-mono transition-colors flex items-center justify-between cursor-pointer ${
                  selectedSpeakerId === 'default' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="truncate">Default System Output</span>
                {selectedSpeakerId === 'default' && <Check size={11} className="text-cyan-400 shrink-0" />}
              </button>

              {audioOutputDevices.filter(d => d.deviceId !== 'default').map((dev, idx) => (
                <button
                  key={dev.deviceId || idx}
                  type="button"
                  onClick={() => {
                    onSelectSpeaker(dev.deviceId);
                    setShowSpeakerPicker(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-[10px] font-mono transition-colors flex items-center justify-between cursor-pointer ${
                    selectedSpeakerId === dev.deviceId ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="truncate">{dev.label || `Speaker / Headset ${idx + 1}`}</span>
                  {selectedSpeakerId === dev.deviceId && <Check size={11} className="text-cyan-400 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
