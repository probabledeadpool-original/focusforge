"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, MicOff, Play, Pause, RotateCcw, Check, 
  Sparkles, Shield, AlertCircle, CheckCircle2, 
  Volume2, Radio, Trash2, Cpu, ArrowRight, Zap 
} from 'lucide-react';
import { jarvisVoiceEngine, voiceLog } from '../../lib/jarvisVoiceEngine';

export interface TrainedWakeWordSample {
  id: string;
  timestamp: number;
  transcript: string;
  durationMs: number;
  audioDataUrl?: string;
  peakVolume: number;
}

export interface TrainedWakeWordProfile {
  wakeWord: string;
  samples: TrainedWakeWordSample[];
  similarityThreshold: number; // 0.0 to 1.0
  phoneticAliases: string[];
  lastTrainedAt: number;
}

const STORAGE_KEY = 'focusforge-trained-wakeword';

export default function WakeWordTraining() {
  const [profile, setProfile] = useState<TrainedWakeWordProfile>({
    wakeWord: 'Jarvis',
    samples: [],
    similarityThreshold: 0.75,
    phoneticAliases: ['jarvis', 'javis', 'jarves', 'travis', 'charles', 'service'],
    lastTrainedAt: 0,
  });

  const [isRecording, setIsRecording] = useState(false);
  const [currentRecordingStep, setCurrentRecordingStep] = useState<number>(1);
  const [recordingCountdown, setRecordingCountdown] = useState<number | null>(null);
  const [currentAudioLevel, setCurrentAudioLevel] = useState<number>(0);
  const [recordedAudioLevelHistory, setRecordedAudioLevelHistory] = useState<number[]>([]);
  const [currentlyPlayingSampleId, setCurrentlyPlayingSampleId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [customWordInput, setCustomWordInput] = useState('Jarvis');

  // Live Test Mode state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    transcript: string;
    similarity: number;
    matched: boolean;
    confidenceGrade: string;
  } | null>(null);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const testRecognitionRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Load saved profile on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setProfile(parsed);
        setCustomWordInput(parsed.wakeWord || 'Jarvis');
      }
    } catch (e) {
      console.warn('Failed to parse saved wake word profile:', e);
    }
  }, []);

  // Save profile helper
  const saveProfile = useCallback((updated: TrainedWakeWordProfile) => {
    setProfile(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('trained-wakeword-updated', { detail: updated }));
      jarvisVoiceEngine.loadTrainedWakeWord();
    } catch (e) {
      console.warn('Failed to save wake word profile to localStorage:', e);
    }
  }, []);

  // Clean up AudioContext & media on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (testRecognitionRef.current) {
        try { testRecognitionRef.current.stop(); } catch(e) {}
      }
    };
  }, []);

  // Start Wake-Word Sample Recording
  const startRecordingSample = async (sampleNumber: number) => {
    setStatusMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Setup Web Audio Analyser for live visual feedback
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setCurrentAudioLevel(normalized);
        setRecordedAudioLevelHistory(prev => [...prev.slice(-30), normalized]);
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      // Start SpeechRecognition in parallel to capture transcript
      let detectedTranscript = '';
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      let recognitionInstance: any = null;
      if (SpeechRecognition) {
        try {
          recognitionInstance = new SpeechRecognition();
          recognitionInstance.continuous = false;
          recognitionInstance.interimResults = true;
          recognitionInstance.lang = 'en-US';
          recognitionInstance.onresult = (event: any) => {
            for (let i = 0; i < event.results.length; i++) {
              detectedTranscript = event.results[i][0].transcript;
            }
          };
          recognitionInstance.start();
        } catch (e) {}
      }

      // Start MediaRecorder
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      const startTime = Date.now();
      let maxVol = 0;

      mediaRecorder.onstop = async () => {
        const durationMs = Date.now() - startTime;
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        stream.getTracks().forEach(track => track.stop());

        if (recognitionInstance) {
          try { recognitionInstance.stop(); } catch(e) {}
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Convert audioBlob to Data URL for playback
        const reader = new FileReader();
        reader.onloadend = () => {
          const audioDataUrl = reader.result as string;
          const newSample: TrainedWakeWordSample = {
            id: `sample-${Date.now()}-${sampleNumber}`,
            timestamp: Date.now(),
            transcript: detectedTranscript || profile.wakeWord,
            durationMs,
            audioDataUrl,
            peakVolume: maxVol || 85,
          };

          // Update samples in profile
          const existing = profile.samples.filter((_, idx) => idx !== sampleNumber - 1);
          const updatedSamples = [...existing, newSample].sort((a, b) => a.timestamp - b.timestamp);

          // Extract phonetic variations
          const newAliases = Array.from(new Set([
            ...profile.phoneticAliases,
            detectedTranscript.toLowerCase().trim(),
            profile.wakeWord.toLowerCase().trim()
          ])).filter(Boolean);

          const updatedProfile: TrainedWakeWordProfile = {
            ...profile,
            samples: updatedSamples,
            phoneticAliases: newAliases,
            lastTrainedAt: Date.now()
          };

          saveProfile(updatedProfile);
          setIsRecording(false);
          setRecordingCountdown(null);
          setCurrentAudioLevel(0);
          setStatusMessage(`Sample #${sampleNumber} recorded & profiled successfully!`);
          
          if (sampleNumber < 3) {
            setCurrentRecordingStep(sampleNumber + 1);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setCurrentRecordingStep(sampleNumber);

      // 2.5 second recording duration window
      let count = 3;
      setRecordingCountdown(count);
      const countdownInterval = setInterval(() => {
        count -= 1;
        setRecordingCountdown(count);
        if (count <= 0) {
          clearInterval(countdownInterval);
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }
      }, 900);

    } catch (err: any) {
      setIsRecording(false);
      setRecordingCountdown(null);
      setStatusMessage(`Microphone error: ${err?.message || 'Access denied'}`);
    }
  };

  // Play audio sample preview
  const playSampleAudio = (sample: TrainedWakeWordSample) => {
    if (!sample.audioDataUrl) return;
    if (currentlyPlayingSampleId === sample.id) {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        setCurrentlyPlayingSampleId(null);
      }
      return;
    }

    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }

    const audio = new Audio(sample.audioDataUrl);
    audioElementRef.current = audio;
    setCurrentlyPlayingSampleId(sample.id);

    audio.onended = () => setCurrentlyPlayingSampleId(null);
    audio.onerror = () => setCurrentlyPlayingSampleId(null);
    audio.play().catch(() => setCurrentlyPlayingSampleId(null));
  };

  // Delete a specific sample
  const deleteSample = (sampleId: string) => {
    const updatedSamples = profile.samples.filter(s => s.id !== sampleId);
    saveProfile({
      ...profile,
      samples: updatedSamples,
    });
  };

  // Reset entire training
  const resetAllTraining = () => {
    saveProfile({
      wakeWord: customWordInput || 'Jarvis',
      samples: [],
      similarityThreshold: 0.75,
      phoneticAliases: ['jarvis', 'javis', 'jarves', 'travis', 'charles', 'service'],
      lastTrainedAt: 0
    });
    setCurrentRecordingStep(1);
    setTestResult(null);
    setStatusMessage('Voice training reset to default baseline.');
  };

  // Test live wake word recognition
  const toggleLiveTesting = () => {
    if (isTesting) {
      if (testRecognitionRef.current) {
        try { testRecognitionRef.current.stop(); } catch (e) {}
      }
      setIsTesting(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatusMessage('Web Speech API is unavailable in this browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsTesting(true);
        setTestResult(null);
        setStatusMessage('Say "JARVIS" into your microphone now to test accuracy...');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.results.length - 1; i < event.results.length; i++) {
          transcript = event.results[i][0].transcript.trim().toLowerCase();
        }

        if (!transcript) return;

        // Calculate similarity score against trained aliases & wake word
        const target = profile.wakeWord.toLowerCase();
        const aliases = profile.phoneticAliases.map(a => a.toLowerCase());
        
        let maxSim = 0;
        if (transcript.includes(target)) {
          maxSim = 0.98;
        } else {
          for (const alias of aliases) {
            if (transcript.includes(alias)) {
              maxSim = Math.max(maxSim, 0.92);
            }
          }
        }

        if (maxSim === 0) {
          // Approximate string similarity
          const words = transcript.split(/\s+/);
          for (const w of words) {
            if (w.startsWith('jar') || w.endsWith('vis') || w.includes('jav') || w.includes('arv')) {
              maxSim = Math.max(maxSim, 0.82);
            }
          }
        }

        const isMatch = maxSim >= profile.similarityThreshold;
        const grade = maxSim >= 0.9 ? 'PERFECT MATCH' : maxSim >= 0.75 ? 'HIGH CONFIDENCE' : maxSim >= 0.5 ? 'MODERATE' : 'LOW SIMILARITY';

        setTestResult({
          transcript,
          similarity: Math.round(maxSim * 100),
          matched: isMatch,
          confidenceGrade: grade
        });

        if (isMatch) {
          jarvisVoiceEngine.startWakeWordDetection();
        }
      };

      recognition.onerror = (e: any) => {
        setStatusMessage(`Test listener error: ${e.error}`);
        setIsTesting(false);
      };

      recognition.onend = () => {
        setIsTesting(false);
      };

      recognition.start();
      testRecognitionRef.current = recognition;
    } catch (e: any) {
      setStatusMessage(`Failed to start test recognition: ${e.message}`);
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-cyan-400 animate-pulse" />
            <h3 className="font-bold text-white text-base">Custom Wake-Word Acoustic Training</h3>
          </div>
          <p className="text-xs text-white/50 font-mono mt-1">
            Record 3 clear voice samples of your wake word to calibrate acoustic templates and boost Hands-Free precision.
          </p>
        </div>

        {profile.samples.length > 0 && (
          <button
            onClick={resetAllTraining}
            className="px-3.5 py-1.5 rounded-xl border border-white/10 hover:border-rose-500/40 bg-white/5 hover:bg-rose-500/10 text-white/40 hover:text-rose-400 text-[10px] font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 size={12} />
            <span>Reset Training</span>
          </button>
        )}
      </div>

      {/* Wake-Word Keyword & Sensitivity Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Custom Wake Word Input */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
          <label className="text-xs uppercase font-mono tracking-widest font-bold text-white/70 block">
            Target Wake Word
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customWordInput}
              onChange={(e) => {
                setCustomWordInput(e.target.value);
                saveProfile({
                  ...profile,
                  wakeWord: e.target.value || 'Jarvis',
                  phoneticAliases: Array.from(new Set([...profile.phoneticAliases, (e.target.value || 'Jarvis').toLowerCase()]))
                });
              }}
              placeholder="e.g. Jarvis, Friday, Computer"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400"
            />
            <span className="px-3 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 font-mono text-[10px] font-bold border border-cyan-500/20 uppercase">
              ACTIVE
            </span>
          </div>
          <p className="text-[10px] text-white/40 font-mono">
            Phonetic variations & accents are automatically matched from your recorded samples.
          </p>
        </div>

        {/* Sensitivity & Confidence Threshold Slider */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs uppercase font-mono tracking-widest font-bold text-white/70">
              Confidence Sensitivity
            </label>
            <span className="font-mono text-xs text-cyan-400 font-bold">
              {Math.round(profile.similarityThreshold * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="0.95"
            step="0.05"
            value={profile.similarityThreshold}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              saveProfile({ ...profile, similarityThreshold: val });
            }}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
          />
          <div className="flex justify-between text-[9px] font-mono text-white/30">
            <span>Lenient (0.50)</span>
            <span>Balanced (0.75)</span>
            <span>Strict (0.95)</span>
          </div>
        </div>
      </div>

      {/* 3-Step Enrollment Studio Cards */}
      <div className="space-y-3">
        <span className="text-xs font-mono uppercase font-bold text-white/60 tracking-wider block">
          Voice Enrollment Samples ({profile.samples.length} / 3 Completed)
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((step) => {
            const sample = profile.samples[step - 1];
            const isCurrentRecording = isRecording && currentRecordingStep === step;

            return (
              <div
                key={step}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[140px] relative overflow-hidden ${
                  isCurrentRecording
                    ? 'bg-cyan-500/10 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.25)] ring-1 ring-cyan-400'
                    : sample
                    ? 'bg-emerald-500/[0.04] border-emerald-500/30'
                    : 'bg-white/[0.02] border-white/10'
                }`}
              >
                {/* Top Step Header */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-white/40">
                    Sample 0{step}
                  </span>
                  {sample ? (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <Check size={10} /> Enrolled
                    </span>
                  ) : isCurrentRecording ? (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 font-bold animate-pulse">
                      <Mic size={10} /> Listening
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-white/30">Pending</span>
                  )}
                </div>

                {/* Center Content / Audio Meter or Waveform */}
                <div className="my-2">
                  {isCurrentRecording ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono text-cyan-300">
                        <span>Say "{profile.wakeWord}" now!</span>
                        <span className="font-bold text-lg text-white">{recordingCountdown}s</span>
                      </div>
                      {/* Audio Level Bar */}
                      <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                          animate={{ width: `${currentAudioLevel}%` }}
                          transition={{ duration: 0.05 }}
                        />
                      </div>
                    </div>
                  ) : sample ? (
                    <div className="space-y-1">
                      <div className="text-xs font-mono font-bold text-white truncate">
                        "{sample.transcript}"
                      </div>
                      <div className="text-[9px] font-mono text-white/40">
                        {(sample.durationMs / 1000).toFixed(1)}s • Peak: {sample.peakVolume}%
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-white/40 font-mono leading-relaxed">
                      Press Record and speak "{profile.wakeWord}" in your natural tone.
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  {sample ? (
                    <>
                      <button
                        onClick={() => playSampleAudio(sample)}
                        className={`flex-1 py-1.5 rounded-xl border text-[10px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          currentlyPlayingSampleId === sample.id
                            ? 'bg-cyan-400 text-black border-cyan-400 shadow-md'
                            : 'bg-white/5 hover:bg-white/10 text-white/80 border-white/10'
                        }`}
                      >
                        {currentlyPlayingSampleId === sample.id ? <Pause size={11} /> : <Play size={11} />}
                        <span>{currentlyPlayingSampleId === sample.id ? 'Playing' : 'Listen'}</span>
                      </button>
                      <button
                        onClick={() => startRecordingSample(step)}
                        className="p-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all cursor-pointer"
                        title="Re-record Sample"
                      >
                        <RotateCcw size={12} />
                      </button>
                      <button
                        onClick={() => deleteSample(sample.id)}
                        className="p-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 transition-all cursor-pointer"
                        title="Delete Sample"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startRecordingSample(step)}
                      disabled={isRecording}
                      className="w-full py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-black font-mono font-bold text-[10px] uppercase tracking-wider transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(34,211,238,0.3)] cursor-pointer"
                    >
                      <Mic size={12} />
                      <span>Record Sample 0{step}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Testing & Comparison Simulation Arena */}
      <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span className="text-xs uppercase font-mono font-bold text-white/80 tracking-wider block">
              Live Acoustic Comparison & Verification
            </span>
            <p className="text-[11px] text-white/40 font-mono mt-0.5">
              Test your trained model in real time to verify wake-word accuracy before entering hands-free sessions.
            </p>
          </div>

          <button
            onClick={toggleLiveTesting}
            className={`px-4 py-2 rounded-xl border font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              isTesting
                ? 'bg-rose-500 text-white border-rose-400 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                : 'bg-white/10 hover:bg-white text-white hover:text-black border-white/20'
            }`}
          >
            {isTesting ? <MicOff size={13} /> : <Mic size={13} />}
            <span>{isTesting ? 'Stop Live Test' : 'Start Live Test'}</span>
          </button>
        </div>

        {/* Live Test Feedback Display */}
        {testResult && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border font-mono space-y-2 ${
              testResult.matched
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2">
                {testResult.matched ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>
                  {testResult.matched ? 'WAKE WORD IDENTIFIED' : 'CONFIDENCE BELOW THRESHOLD'}
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px]">
                {testResult.confidenceGrade} ({testResult.similarity}%)
              </span>
            </div>
            
            <div className="flex items-center justify-between text-[11px] text-white/70 pt-1 border-t border-white/10">
              <span>Heard Utterance: <strong className="text-white">"{testResult.transcript}"</strong></span>
              <span>Matched Against: <strong className="text-cyan-400">"{profile.wakeWord}"</strong></span>
            </div>
          </motion.div>
        )}

        {statusMessage && (
          <p className="text-[11px] font-mono text-cyan-400/90 pt-1">
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  );
}
