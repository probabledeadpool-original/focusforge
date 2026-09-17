"use client";

import { jarvisAudio } from './jarvisAudio';

export type VoicePhase = 
  | 'IDLE'
  | 'REQUESTING_MICROPHONE'
  | 'WAKE_WORD_LISTENING'
  | 'WAKE_WORD_DETECTED'
  | 'LISTENING_FOR_COMMAND'
  | 'PROCESSING_COMMAND'
  | 'EXECUTING_TOOL'
  | 'SPEAKING_RESPONSE'
  | 'ERROR';

// Deprecated alias for backwards compatibility
export type VoiceState = VoicePhase;

export interface VoiceStateData {
  phase: VoicePhase;
  sessionId: string;
  microphoneStatus: 'idle' | 'requesting' | 'granted' | 'listening' | 'denied' | 'error';
  geminiStatus: 'idle' | 'connecting' | 'connected' | 'processing' | 'error';
  transcript: string;
  interimTranscript: string;
  liveInterimTranscript: string;
  error: string | null;
  wakeWordEnabled: boolean;
  commandStartedAt: number | null;
  lastActivityAt: number;
  activeTool: string | null;
  activeTimers: string[];
  activeListenerCount: number;
  audioSampleRate: number;
  channels: number;
  mimeType: string;
  lastTransition: string;
}

// Deprecated alias for backwards compatibility
export type VoiceEngineTelemetry = VoiceStateData;

export const VOICE_CONFIG = {
  wakeWord: "jarvis",
  wakeWordCooldownMs: 1500,
  commandSilenceTimeoutMs: 1200,
  minimumCommandDurationMs: 250,
  minimumSpeechDurationMs: 200,
  acknowledgementGuardMs: 200,
  reconnectDelayMs: 30,
  maxCommandDurationMs: 60000
};

// Levenshtein distance calculation for ultra-high sensitivity fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

const PHONETIC_JARVIS_STEMS = [
  'jarvis', 'javis', 'jarves', 'jarviz', 'jarvice', 'jarv', 'jervis',
  'travis', 'service', 'harvest', 'starck', 'stark', 'friday',
  'darvis', 'garvis', 'charvis', 'larvis', 'marvis', 'harvis',
  'jarvez', 'jahvis', 'jahves', 'darvish', 'java'
];

function checkHotwordMatch(
  text: string,
  patterns: RegExp[],
  trainedWord: string,
  highSensitivity: boolean
): boolean {
  const clean = text.toLowerCase().replace(/['’]/g, '').trim();
  if (!clean) return false;

  // 1. Direct Regex Patterns
  if (patterns.some(p => p.test(clean))) return true;

  // 2. Direct inclusion of target wake word
  const target = (trainedWord || 'jarvis').toLowerCase().trim();
  if (clean.includes(target) || clean.includes('jarvis') || clean.includes('javis')) {
    return true;
  }

  // 3. Word-by-Word Fuzzy & Phonetic Matching
  const words = clean.replace(/[^a-z0-9\s]/gi, ' ').split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (PHONETIC_JARVIS_STEMS.includes(word)) return true;

    if (word.length >= 3) {
      if (levenshteinDistance(word, 'jarvis') <= (highSensitivity ? 2 : 1)) return true;
      if (trainedWord && levenshteinDistance(word, target) <= (highSensitivity ? 2 : 1)) return true;
    }

    if (highSensitivity && word.length >= 3) {
      if (
        word.startsWith('jarv') ||
        word.startsWith('jav') ||
        word.startsWith('jrv') ||
        word.endsWith('arvis') ||
        word.endsWith('ervis') ||
        word.endsWith('avis')
      ) {
        return true;
      }
    }
  }

  return false;
}

// Default phonetic & natural speech variations of "Jarvis"
const DEFAULT_HOTWORD_PATTERNS = [
  /\b(hey|ok|okay|yo|hi|hello|listen|start|dear|mr|mister)?\s*(jarvis|javis|jarvises|jarves|jarviz|jar\s*vis|jar\s*vice|travis|service|harvest|starck|stark|charles|jervis|darvis|garvis|charvis|arvis|jarv|jrv|jav|java|jarvez|darvish|jahvis|jahves)\b/i,
  /\b(hey|ok|okay|yo|hi|hello)\s*jarvis\b/i,
  /\bjarvis\b/i,
  /\bjavis\b/i,
  /\bjarv\b/i,
];

export function voiceLog(event: string, details?: any): void {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  if (details) {
    console.info(`[JarvisVoiceEngine ${timestamp}] 🔊 ${event}:`, details);
  } else {
    console.info(`[JarvisVoiceEngine ${timestamp}] 🔊 ${event}`);
  }
}

type StateChangeListener = (state: VoiceStateData) => void;
type CommandHandler = (commandText: string, sessionId: string) => Promise<void>;

class JarvisVoiceEngine {
  private static instance: JarvisVoiceEngine;

  private phase: VoicePhase = 'IDLE';
  private currentSessionId: string = '';
  private microphoneStatus: 'idle' | 'requesting' | 'granted' | 'listening' | 'denied' | 'error' = 'idle';
  private geminiStatus: 'idle' | 'connecting' | 'connected' | 'processing' | 'error' = 'idle';
  private activeTool: string | null = null;
  private lastError: string | null = null;
  private lastTransition: string = 'INIT -> IDLE';

  private accumulatedCommandText: string = '';
  private lastDetectedTranscript: string = '';
  private liveInterimTranscript: string = '';
  private commandStartedAt: number | null = null;
  private lastActivityAt: number = Date.now();

  private isWakeWordEnabled: boolean = true;
  private isHighSensitivityMode: boolean = true;
  private preDuckingVolume: number | null = null;
  private isCooldownActive: boolean = false;
  private activeListenerCount: number = 0;
  private activeHotwordPatterns: RegExp[] = [...DEFAULT_HOTWORD_PATTERNS];
  private trainedWakeWord: string = 'Jarvis';

  // Recognizers & Resources
  private wakeWordRecognition: any = null;
  private commandRecognition: any = null;
  private mediaStream: MediaStream | null = null;
  private activeUtterance: SpeechSynthesisUtterance | null = null;

  // Timers
  private silenceTimer: NodeJS.Timeout | null = null;
  private noSpeechTimer: NodeJS.Timeout | null = null;
  private maxDurationTimer: NodeJS.Timeout | null = null;
  private wakeWordCooldownTimer: NodeJS.Timeout | null = null;
  private restartTimer: NodeJS.Timeout | null = null;

  private commandHandler: CommandHandler | null = null;
  private listeners: Set<StateChangeListener> = new Set();

  private constructor() {
    if (typeof window !== 'undefined') {
      const savedPref = localStorage.getItem('jarvis-hotword-enabled');
      if (savedPref !== null) {
        this.isWakeWordEnabled = savedPref !== 'false';
      }
      this.currentSessionId = this.generateSessionId();
      this.loadTrainedWakeWord();

      // Listen for updates from WakeWordTraining component
      window.addEventListener('trained-wakeword-updated', (e: any) => {
        this.loadTrainedWakeWord(e?.detail);
      });
    }
  }

  public loadTrainedWakeWord(customProfile?: any): void {
    if (typeof window === 'undefined') return;
    try {
      const profile = customProfile || JSON.parse(localStorage.getItem('focusforge-trained-wakeword') || '{}');
      const patterns: RegExp[] = [...DEFAULT_HOTWORD_PATTERNS];

      if (profile.wakeWord && typeof profile.wakeWord === 'string') {
        this.trainedWakeWord = profile.wakeWord.trim();
        const escaped = this.trainedWakeWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        patterns.unshift(new RegExp(`\\b(hey|ok|okay|yo|hi|hello)?\\s*${escaped}\\b`, 'i'));
        patterns.unshift(new RegExp(`\\b${escaped}\\b`, 'i'));
      }

      if (Array.isArray(profile.phoneticAliases)) {
        profile.phoneticAliases.forEach((alias: string) => {
          if (alias && alias.trim()) {
            const esc = alias.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            patterns.push(new RegExp(`\\b${esc}\\b`, 'i'));
          }
        });
      }

      this.activeHotwordPatterns = patterns;
      voiceLog("TRAINED_WAKEWORD_LOADED", { 
        wakeWord: this.trainedWakeWord, 
        aliasesCount: profile.phoneticAliases?.length || 0 
      });
    } catch (e) {
      this.activeHotwordPatterns = [...DEFAULT_HOTWORD_PATTERNS];
    }
  }

  public async warmupMicrophone(): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      this.microphoneStatus = 'granted';
      // Release test tracks
      stream.getTracks().forEach(t => t.stop());
      this.notifyTelemetry();
      return true;
    } catch (err: any) {
      this.microphoneStatus = 'denied';
      this.lastError = 'Microphone permission denied or device not found.';
      this.notifyTelemetry();
      return false;
    }
  }

  public static getInstance(): JarvisVoiceEngine {
    if (!JarvisVoiceEngine.instance) {
      JarvisVoiceEngine.instance = new JarvisVoiceEngine();
    }
    return JarvisVoiceEngine.instance;
  }

  public generateSessionId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  // --- Observability & Listener Management ---
  public subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    this.activeListenerCount = this.listeners.size;
    listener(this.getStateData());
    return () => {
      this.listeners.delete(listener);
      this.activeListenerCount = this.listeners.size;
    };
  }

  public setCommandHandler(handler: CommandHandler): void {
    this.commandHandler = handler;
  }

  public getStateData(): VoiceStateData {
    const activeTimers: string[] = [];
    if (this.silenceTimer) activeTimers.push('silenceTimer');
    if (this.noSpeechTimer) activeTimers.push('noSpeechTimer');
    if (this.maxDurationTimer) activeTimers.push('maxDurationTimer');
    if (this.wakeWordCooldownTimer) activeTimers.push('wakeWordCooldown');
    if (this.restartTimer) activeTimers.push('restartTimer');

    return {
      phase: this.phase,
      sessionId: this.currentSessionId,
      microphoneStatus: this.microphoneStatus,
      geminiStatus: this.geminiStatus,
      transcript: this.lastDetectedTranscript || '',
      interimTranscript: this.liveInterimTranscript || '',
      liveInterimTranscript: this.liveInterimTranscript || '',
      error: this.lastError,
      wakeWordEnabled: this.isWakeWordEnabled,
      commandStartedAt: this.commandStartedAt,
      lastActivityAt: this.lastActivityAt,
      activeTool: this.activeTool,
      activeTimers,
      activeListenerCount: this.activeListenerCount,
      audioSampleRate: 16000,
      channels: 1,
      mimeType: 'audio/pcm;rate=16000',
      lastTransition: this.lastTransition,
    };
  }

  // Backwards compatibility getter
  public getTelemetry(): VoiceStateData {
    return this.getStateData();
  }

  public get state(): VoicePhase {
    return this.phase;
  }

  public transitionTo(nextPhase: VoicePhase, reason?: string): boolean {
    const previousPhase = this.phase;
    if (previousPhase === nextPhase) return false;

    // Transition validation
    if (!this.isTransitionAllowed(previousPhase, nextPhase)) {
      voiceLog("INVALID_TRANSITION_ATTEMPT", { from: previousPhase, to: nextPhase, reason });
      return false;
    }

    this.phase = nextPhase;
    this.lastTransition = `${previousPhase} -> ${nextPhase} (${reason || 'normal'})`;
    this.lastActivityAt = Date.now();

    // Sync microphoneStatus with phase
    if (nextPhase === 'REQUESTING_MICROPHONE') {
      this.microphoneStatus = 'requesting';
    } else if (nextPhase === 'WAKE_WORD_LISTENING' || nextPhase === 'LISTENING_FOR_COMMAND') {
      this.microphoneStatus = 'listening';
    } else if (nextPhase === 'ERROR') {
      this.microphoneStatus = this.lastError?.toLowerCase().includes('mic') ? 'denied' : 'error';
    } else if (nextPhase === 'IDLE') {
      this.microphoneStatus = 'idle';
    }

    voiceLog("STATE_TRANSITION", {
      from: previousPhase,
      to: nextPhase,
      sessionId: this.currentSessionId,
      reason: reason || 'normal'
    });

    const stateData = this.getStateData();
    this.listeners.forEach((listener) => {
      try {
        listener(stateData);
      } catch (e) {
        console.error('[JarvisVoiceEngine] Listener dispatch error:', e);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jarvis-voice-state', { detail: stateData }));
    }
    return true;
  }

  private isTransitionAllowed(from: VoicePhase, to: VoicePhase): boolean {
    if (to === 'ERROR' || to === 'IDLE') return true;
    switch (from) {
      case 'IDLE':
        return to === 'REQUESTING_MICROPHONE' || to === 'WAKE_WORD_LISTENING' || to === 'LISTENING_FOR_COMMAND';
      case 'REQUESTING_MICROPHONE':
        return to === 'WAKE_WORD_LISTENING' || to === 'LISTENING_FOR_COMMAND';
      case 'WAKE_WORD_LISTENING':
        return to === 'WAKE_WORD_DETECTED' || to === 'LISTENING_FOR_COMMAND';
      case 'WAKE_WORD_DETECTED':
        return to === 'LISTENING_FOR_COMMAND' || to === 'WAKE_WORD_LISTENING';
      case 'LISTENING_FOR_COMMAND':
        return to === 'PROCESSING_COMMAND' || to === 'WAKE_WORD_LISTENING';
      case 'PROCESSING_COMMAND':
        return to === 'EXECUTING_TOOL' || to === 'SPEAKING_RESPONSE' || to === 'WAKE_WORD_LISTENING';
      case 'EXECUTING_TOOL':
        return to === 'SPEAKING_RESPONSE' || to === 'PROCESSING_COMMAND' || to === 'WAKE_WORD_LISTENING';
      case 'SPEAKING_RESPONSE':
        return to === 'WAKE_WORD_LISTENING' || to === 'LISTENING_FOR_COMMAND';
      case 'ERROR':
        return to === 'REQUESTING_MICROPHONE' || to === 'WAKE_WORD_LISTENING' || to === 'LISTENING_FOR_COMMAND';
      default:
        return false;
    }
  }

  public isSessionActive(sessionId: string): boolean {
    return this.currentSessionId === sessionId;
  }

  public setGeminiStatus(status: 'idle' | 'connecting' | 'connected' | 'processing' | 'error'): void {
    this.geminiStatus = status;
    this.notifyTelemetry();
  }

  public setActiveTool(toolName: string | null): void {
    this.activeTool = toolName;
    if (toolName) {
      this.transitionTo('EXECUTING_TOOL', `Tool invoked: ${toolName}`);
    }
    this.notifyTelemetry();
  }

  // --- 1. Wake-Word Detection Mode ---
  public startWakeWordDetection(): void {
    if (typeof window === 'undefined') return;
    if (!this.isWakeWordEnabled) {
      this.transitionTo('IDLE', 'Hotword disabled in settings');
      return;
    }

    // Do not disrupt active command, processing, tool execution, or speech
    if (
      this.phase === 'LISTENING_FOR_COMMAND' ||
      this.phase === 'PROCESSING_COMMAND' ||
      this.phase === 'EXECUTING_TOOL' ||
      this.phase === 'SPEAKING_RESPONSE'
    ) {
      voiceLog("WAKE_WORD_PAUSED", { activePhase: this.phase });
      return;
    }

    this.stopCommandListening();
    this.clearVoiceTimers();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.lastError = 'Web Speech API is not supported in this browser.';
      this.transitionTo('ERROR', 'Speech API missing');
      return;
    }

    this.cleanupWakeWordRecognition();

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 5;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        this.transitionTo('WAKE_WORD_LISTENING', 'Wake-word detector online');
      };

      recognition.onresult = (event: any) => {
        if (this.isCooldownActive) return;
        if (this.phase !== 'WAKE_WORD_LISTENING') return;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          for (let k = 0; k < item.length; k++) {
            const transcript = (item[k].transcript || '').trim();
            if (!transcript) continue;

            const isMatched = checkHotwordMatch(
              transcript,
              this.activeHotwordPatterns,
              this.trainedWakeWord,
              this.isHighSensitivityMode
            );

            if (isMatched) {
              voiceLog("WAKE_WORD_TRIGGERED", { 
                matchedPhrase: transcript,
                altIndex: k,
                highSensitivity: this.isHighSensitivityMode 
              });
              this.triggerWakeWord(transcript);
              return;
            }
          }
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          this.lastError = 'Microphone permission denied.';
          this.transitionTo('ERROR', 'Microphone permission denied');
          return;
        }
        voiceLog("WAKE_WORD_RECOGNITION_NOTE", { error: e.error });
      };

      recognition.onend = () => {
        if (this.isWakeWordEnabled && this.phase === 'WAKE_WORD_LISTENING') {
          if (this.restartTimer) clearTimeout(this.restartTimer);
          this.restartTimer = setTimeout(() => {
            if (this.isWakeWordEnabled && (this.phase === 'WAKE_WORD_LISTENING' || this.phase === 'IDLE')) {
              this.startWakeWordDetection();
            }
          }, VOICE_CONFIG.reconnectDelayMs);
        }
      };

      try {
        recognition.start();
      } catch (err) {
        voiceLog("WAKE_WORD_ALREADY_STARTED_NOTE");
      }
      this.wakeWordRecognition = recognition;
    } catch (err: any) {
      voiceLog("WAKE_WORD_START_ERROR", { error: err?.message });
      this.lastError = err?.message || 'Failed to start microphone listener';
      if (this.restartTimer) clearTimeout(this.restartTimer);
      this.restartTimer = setTimeout(() => {
        if (this.isWakeWordEnabled) this.startWakeWordDetection();
      }, 500);
    }
  }

  public stopWakeWordDetection(): void {
    this.cleanupWakeWordRecognition();
    if (this.phase === 'WAKE_WORD_LISTENING') {
      this.transitionTo('IDLE', 'Wake-word detection stopped');
    }
  }

  public setHighSensitivity(enabled: boolean): void {
    this.isHighSensitivityMode = enabled;
    voiceLog("HIGH_SENSITIVITY_MODE", { enabled });
  }

  // --- 2. Wake-Word Detected Transition ---
  private triggerWakeWord(rawUtterance: string): void {
    if (this.isCooldownActive) return;
    this.isCooldownActive = true;

    if (this.wakeWordCooldownTimer) clearTimeout(this.wakeWordCooldownTimer);
    this.wakeWordCooldownTimer = setTimeout(() => {
      this.isCooldownActive = false;
      this.wakeWordCooldownTimer = null;
    }, VOICE_CONFIG.wakeWordCooldownMs);

    this.cleanupWakeWordRecognition();

    const sessionId = this.generateSessionId();
    this.currentSessionId = sessionId;

    this.transitionTo('WAKE_WORD_DETECTED', `Wake word matched: "${rawUtterance}"`);

    // Clean leading wake word if user spoke full phrase in one breath
    let trailingCommand = rawUtterance.replace(/^(hey|ok|okay|yo|hi|hello)?\s*(jarvis|javis)\s*/i, '').trim();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jarvis-hotword-triggered', {
        detail: { rawUtterance, trailingCommand, sessionId }
      }));
    }
  }

  // --- 3. Active Command-Listening Mode ---
  public startCommandListening(initialBuffer?: string, existingSessionId?: string): void {
    if (typeof window === 'undefined') return;

    this.cleanupWakeWordRecognition();
    this.clearVoiceTimers();

    const sessionId = existingSessionId || this.generateSessionId();
    this.currentSessionId = sessionId;

    const cleanInitial = (initialBuffer || '').replace(/^(hey|ok|okay|yo|hi|hello)?\s*(jarvis|javis)\s*/i, '').trim();
    this.accumulatedCommandText = cleanInitial;
    this.liveInterimTranscript = cleanInitial;
    this.commandStartedAt = Date.now();
    this.lastError = null;

    this.transitionTo('LISTENING_FOR_COMMAND', 'Started active command listening session');
    this.notifyTelemetry();

    if (cleanInitial.length > 2) {
      this.silenceTimer = setTimeout(() => {
        if (this.phase === 'LISTENING_FOR_COMMAND' && this.accumulatedCommandText.trim()) {
          voiceLog("INITIAL_BUFFER_SILENCE_FINALIZED", { command: this.accumulatedCommandText });
          this.commitCommand(this.accumulatedCommandText.trim());
        }
      }, VOICE_CONFIG.commandSilenceTimeoutMs);
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.lastError = 'Web Speech API unavailable';
      this.transitionTo('ERROR', 'Speech API missing');
      return;
    }

    this.cleanupCommandRecognition();

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      // 8-second fallback timeout if user triggers wake-word and never says anything
      this.noSpeechTimer = setTimeout(() => {
        if (this.phase === 'LISTENING_FOR_COMMAND') {
          if (!this.accumulatedCommandText.trim()) {
            voiceLog("NO_SPEECH_TIMEOUT_STANDBY");
            this.resetVoiceSession();
          }
        }
      }, 8000);

      // Max command duration timeout
      this.maxDurationTimer = setTimeout(() => {
        if (this.phase === 'LISTENING_FOR_COMMAND') {
          if (this.accumulatedCommandText.trim()) {
            voiceLog("MAX_DURATION_EXCEEDED_FINALIZED");
            this.commitCommand(this.accumulatedCommandText.trim());
          } else {
            this.resetVoiceSession();
          }
        }
      }, VOICE_CONFIG.maxCommandDurationMs);

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            final += item[0].transcript + ' ';
          } else {
            interim += item[0].transcript;
          }
        }

        let combined = (final + interim).trim();
        if (!combined && initialBuffer) {
          combined = initialBuffer;
        }

        // Clean out leading wake word only
        combined = combined.replace(/^(hey|ok|okay|yo|hi|hello)?\s*(jarvis|javis)\s*/i, '').trim();

        this.accumulatedCommandText = combined;
        this.liveInterimTranscript = combined;
        this.lastDetectedTranscript = combined;
        this.lastActivityAt = Date.now();

        // Reset the no-speech timer since user is actively talking
        if (this.noSpeechTimer) {
          clearTimeout(this.noSpeechTimer);
          this.noSpeechTimer = null;
        }

        // Clear existing silence timer
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }

        // When meaningful speech is present, start the silence countdown
        if (combined.length > 1) {
          this.silenceTimer = setTimeout(() => {
            if (this.phase === 'LISTENING_FOR_COMMAND') {
              const duration = this.commandStartedAt ? Date.now() - this.commandStartedAt : 0;
              if (duration >= VOICE_CONFIG.minimumCommandDurationMs && this.accumulatedCommandText.trim()) {
                voiceLog("SILENCE_FINALIZED_COMMAND", { command: this.accumulatedCommandText });
                this.commitCommand(this.accumulatedCommandText.trim());
              }
            }
          }, VOICE_CONFIG.commandSilenceTimeoutMs);
        }

        this.notifyTelemetry();
      };

      recognition.onerror = (e: any) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          this.lastError = 'Microphone access denied';
          this.transitionTo('ERROR', 'Microphone permission error');
          return;
        }
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          voiceLog("COMMAND_LISTENER_NOTE", { error: e.error });
        }
      };

      recognition.onend = () => {
        if (this.phase === 'LISTENING_FOR_COMMAND') {
          try {
            recognition.start();
          } catch (e) {}
        }
      };

      try {
        recognition.start();
      } catch (e) {
        voiceLog("COMMAND_RECOGNITION_ALREADY_ACTIVE");
      }
      this.commandRecognition = recognition;
    } catch (err: any) {
      voiceLog("COMMAND_INIT_ERROR", { error: err?.message });
      this.lastError = err?.message || 'Failed to initiate command stream';
      this.transitionTo('ERROR', 'Command recognition failure');
    }
  }

  public stopCommandListening(): void {
    this.cleanupCommandRecognition();
    this.clearVoiceTimers();
  }

  // --- 4. Command Commit & Processing ---
  public commitCommand(textOverride?: string): void {
    const textToProcess = (textOverride || this.accumulatedCommandText).trim();
    if (!textToProcess) {
      this.resetVoiceSession();
      return;
    }

    const sessionId = this.currentSessionId;
    this.cleanupCommandRecognition();
    this.clearVoiceTimers();

    if (!this.transitionTo('PROCESSING_COMMAND', `Processing: "${textToProcess}"`)) {
      return;
    }

    if (this.commandHandler) {
      this.commandHandler(textToProcess, sessionId).catch((err) => {
        voiceLog("COMMAND_HANDLER_ERROR", { error: err?.message });
        this.lastError = err?.message || 'Command processing failed';
        this.transitionTo('ERROR', 'Command handler failed');
      });
    }
  }

  // --- 5. Speaking Response State ---
  public speakResponse(text: string, onComplete?: () => void): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.transitionTo('WAKE_WORD_LISTENING', 'TTS unavailable');
      return;
    }

    const sessionId = this.currentSessionId;
    this.cleanupAudioResources();

    this.transitionTo('SPEAKING_RESPONSE', `Speaking: "${text.slice(0, 40)}..."`);

    try {
      window.speechSynthesis.cancel();

      const cleanText = text
        .replace(/\[ACTION:[\s\S]*?\]/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/#+\s/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[\u{1F600}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .trim();

      if (!cleanText) {
        this.transitionTo('WAKE_WORD_LISTENING', 'Empty speech text');
        if (onComplete) onComplete();
        this.startWakeWordDetection();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((v) =>
        v.lang.startsWith('en') && (
          v.name.includes('UK English Male') ||
          v.name.includes('Daniel') ||
          v.name.includes('George') ||
          v.name.includes('Oliver') ||
          v.name.includes('Natural') ||
          v.name.includes('Google UK English')
        )
      ) || voices.find((v) => v.lang.startsWith('en-GB')) || voices.find((v) => v.lang.startsWith('en'));

      if (preferred) utterance.voice = preferred;

      utterance.onend = () => {
        if (this.isSessionActive(sessionId)) {
          voiceLog("TTS_PLAYBACK_FINISHED");
          this.activeUtterance = null;
          if (onComplete) onComplete();

          // Auto-minimize full screen to dynamic island after responding so user workspace is visible
          try {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('jarvis-auto-minimize'));
            }
          } catch (e) {}

          // Immediate return to continuous wake-word listening
          setTimeout(() => {
            if (this.isSessionActive(sessionId)) {
              this.transitionTo('WAKE_WORD_LISTENING', 'Speech playback completed');
              this.startWakeWordDetection();
            }
          }, VOICE_CONFIG.acknowledgementGuardMs);
        }
      };

      utterance.onerror = (e) => {
        voiceLog("TTS_PLAYBACK_NOTE", { error: e });
        if (this.isSessionActive(sessionId)) {
          this.activeUtterance = null;
          if (onComplete) onComplete();
          try {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('jarvis-auto-minimize'));
            }
          } catch (err) {}
          this.transitionTo('WAKE_WORD_LISTENING', 'TTS error/interrupted');
          this.startWakeWordDetection();
        }
      };

      this.activeUtterance = utterance;
      (window as any)._jarvisActiveUtterance = utterance;

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      window.speechSynthesis.speak(utterance);
    } catch (e: any) {
      voiceLog("TTS_SYNTHESIS_ERROR", { error: e?.message });
      this.transitionTo('WAKE_WORD_LISTENING', 'TTS execution error');
      this.startWakeWordDetection();
    }
  }

  // --- Reset & Cleanup Helpers ---
  public resetVoiceSession(): void {
    voiceLog("RESET_VOICE_SESSION");
    this.cleanupAudioResources();
    this.clearVoiceTimers();
    this.accumulatedCommandText = '';
    this.liveInterimTranscript = '';
    this.activeTool = null;
    this.lastError = null;
    this.transitionTo('WAKE_WORD_LISTENING', 'Voice session reset');
    this.startWakeWordDetection();
  }

  public cancelCurrentAction(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.resetVoiceSession();
  }

  public cleanupAudioResources(): void {
    this.cleanupWakeWordRecognition();
    this.cleanupCommandRecognition();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }

  private cleanupWakeWordRecognition(): void {
    if (this.wakeWordRecognition) {
      try {
        this.wakeWordRecognition.onend = null;
        this.wakeWordRecognition.onerror = null;
        this.wakeWordRecognition.onresult = null;
        this.wakeWordRecognition.abort();
      } catch (e) {}
      this.wakeWordRecognition = null;
    }
  }

  private cleanupCommandRecognition(): void {
    if (this.commandRecognition) {
      try {
        this.commandRecognition.onend = null;
        this.commandRecognition.onerror = null;
        this.commandRecognition.onresult = null;
        this.commandRecognition.abort();
      } catch (e) {}
      this.commandRecognition = null;
    }
  }

  public clearVoiceTimers(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.noSpeechTimer) {
      clearTimeout(this.noSpeechTimer);
      this.noSpeechTimer = null;
    }
    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }

  private notifyTelemetry(): void {
    const stateData = this.getStateData();
    this.listeners.forEach((listener) => {
      try {
        listener(stateData);
      } catch (e) {}
    });
  }

  public setWakeWordEnabled(enabled: boolean): void {
    this.isWakeWordEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('jarvis-hotword-enabled', String(enabled));
    }
    if (enabled) {
      this.startWakeWordDetection();
    } else {
      this.stopWakeWordDetection();
    }
  }

  public getState(): VoicePhase {
    return this.phase;
  }
}

export const jarvisVoiceEngine = JarvisVoiceEngine.getInstance();
