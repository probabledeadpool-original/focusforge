"use client";

import { jarvisAudio } from './jarvisAudio';
import { cleanJarvisOutput } from './jarvisOutputCleaner';
import { 
  VoiceState, 
  voiceConfig, 
  VoiceConfig, 
  DiagnosticEvent, 
  StructuredIntentResult 
} from './voiceConfig';
import { wakeWordDetector, WakeWordVerificationResult } from './wakeWordDetector';

export type { VoiceState, VoiceConfig, DiagnosticEvent, StructuredIntentResult };

export function voiceLog(type: string, data?: any): void {
  try {
    if (typeof window !== 'undefined' && (window as any).__JARVIS_DEBUG) {
      console.log(`[JARVIS_VOICE:${type}]`, data || '');
    }
  } catch (e) {}
}

export interface VoiceEngineTelemetry {
  state: VoiceState;
  previousState: VoiceState;
  microphoneStatus: 'idle' | 'requesting' | 'granted' | 'listening' | 'denied' | 'error';
  isMicrophoneActive: boolean;
  wakeWordDetected: boolean;
  wakeConfidence: number;
  lastWakeCandidateText: string;
  interimTranscript: string;
  finalCommandTranscript: string;
  intentConfidence: number;
  lastParsedIntent: string;
  pendingConfirmationPrompt: string | null;
  hasPendingConfirmation: boolean;
  errorMessage: string | null;
  errorRecoveryHint: string | null;
  isTTSPlaying: boolean;
  audioUploaded: boolean;
  lastTransitionTimestamp: number;
  stateHistory: DiagnosticEvent[];

  // Compatibility aliases & properties
  phase?: string;
  transcript?: string;
  activeTool?: string | null;
  geminiStatus?: string;
  sessionId?: string;
  wakeWordEnabled?: boolean;
  audioSampleRate?: number;
  activeListenerCount?: number;
  activeTimers?: number;
  lastTransition?: string;
  error?: string | null;
}

export type VoiceStateListener = (telemetry: VoiceEngineTelemetry) => void;
export type CommandHandler = (commandText: string, sessionId: string) => Promise<void>;

/**
 * Universal High-Reliability Explicit Finite State Machine Voice Engine for JARVIS
 */
export class JarvisVoiceEngine {
  private static instance: JarvisVoiceEngine;

  // State Machine State
  private state: VoiceState = 'standby';
  private previousState: VoiceState = 'disabled';
  private currentSessionId: string = '';
  private stateEntryTimestamp: number = Date.now();

  // Speech Recognition Instances & Controllers
  private recognitionInstance: any = null;
  private isRecognitionRunning: boolean = false;
  private recognitionRestartAttempts: number = 0;
  private maxRestartAttempts: number = 4;

  // Transcript Data
  private currentInterimTranscript: string = '';
  private currentFinalTranscript: string = '';
  private lastWakeCandidate: string = '';
  private lastWakeConfidence: number = 0;
  private lastIntentConfidence: number = 0;
  private lastParsedIntent: string = '';

  // Confirmation Flow
  private pendingConfirmationAction: (() => Promise<void>) | null = null;
  private pendingConfirmationPrompt: string | null = null;

  // Telemetry & Diagnostic History Ring Buffer
  private diagnosticHistory: DiagnosticEvent[] = [];
  private readonly maxDiagnosticLogs: number = 50;
  private listeners: Set<VoiceStateListener> = new Set();
  private commandHandler: CommandHandler | null = null;

  // Timers
  private commandTimeoutTimer: any = null;
  private silenceDebounceTimer: any = null;
  private confirmationTimeoutTimer: any = null;
  private restartDebounceTimer: any = null;
  private wakeVerificationTimer: any = null;

  // Audio Gating & Ducking
  private isSpeakingTTS: boolean = false;
  private speechSynthesisUtterance: SpeechSynthesisUtterance | null = null;
  private errorMessage: string | null = null;
  private errorRecoveryHint: string | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      const storedEnabled = localStorage.getItem('jarvis-always-listening') !== 'false';
      this.state = storedEnabled ? 'standby' : 'disabled';
      this.previousState = 'disabled';
      
      // Initialize on client mount if standby
      if (this.state === 'standby') {
        setTimeout(() => this.startWakeWordRecognition(), 500);
      }
    }
  }

  public static getInstance(): JarvisVoiceEngine {
    if (!JarvisVoiceEngine.instance) {
      JarvisVoiceEngine.instance = new JarvisVoiceEngine();
    }
    return JarvisVoiceEngine.instance;
  }

  // ---------------------------------------------------------------------------
  // EXPLICIT STATE MACHINE TRANSITION CONTROLLER
  // ---------------------------------------------------------------------------
  public transitionTo(
    nextState: VoiceState, 
    reason: string, 
    extraData: Partial<DiagnosticEvent> = {}
  ): boolean {
    const prevState = this.state;
    if (prevState === nextState && nextState !== 'transcribing_command') {
      return false;
    }

    const now = Date.now();
    const durationInPrevState = now - this.stateEntryTimestamp;

    this.previousState = prevState;
    this.state = nextState;
    this.stateEntryTimestamp = now;

    // Record Structured Diagnostic Event
    const diagEvent: DiagnosticEvent = {
      id: `diag-${now}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now,
      fromState: prevState,
      toState: nextState,
      reason,
      wakeConfidence: this.lastWakeConfidence,
      candidateText: this.lastWakeCandidate,
      commandTranscript: this.currentFinalTranscript,
      intentConfidence: this.lastIntentConfidence,
      intent: this.lastParsedIntent,
      error: this.errorMessage,
      durationMs: durationInPrevState,
      audioUploaded: false,
      ...extraData
    };

    this.diagnosticHistory.unshift(diagEvent);
    if (this.diagnosticHistory.length > this.maxDiagnosticLogs) {
      this.diagnosticHistory.pop();
    }

    // State Entry Side Effects
    this.handleStateEntry(nextState, prevState, reason);

    // Notify all UI & Store Subscribers
    this.notifyTelemetry();
    return true;
  }

  private handleStateEntry(nextState: VoiceState, prevState: VoiceState, reason: string): void {
    switch (nextState) {
      case 'disabled':
        this.cleanupAllTimers();
        this.stopSpeechRecognition();
        break;

      case 'standby':
        this.cleanupAllTimers();
        this.currentInterimTranscript = '';
        this.currentFinalTranscript = '';
        this.errorMessage = null;
        this.errorRecoveryHint = null;
        this.pendingConfirmationAction = null;
        this.pendingConfirmationPrompt = null;
        this.isSpeakingTTS = false;
        this.unduckAudio();
        this.startWakeWordRecognition();
        break;

      case 'wake_candidate':
        // Candidate detection in progress
        break;

      case 'activated':
        this.currentSessionId = `session-${Date.now()}`;
        this.cleanupAllTimers();
        this.duckAudio();

        if (voiceConfig.soundFeedbackEnabled) {
          jarvisAudio.playWake();
        }

        // Check if pre-roll command was already provided in candidate phrase
        if (this.currentFinalTranscript.trim().length > 0) {
          setTimeout(() => {
            this.transitionTo('processing_command', 'Executing pre-roll trailing command from single utterance');
          }, 150);
        } else {
          // Transition to listening for command
          setTimeout(() => {
            this.transitionTo('listening_for_command', 'Waiting for command utterance');
          }, 200);
        }
        break;

      case 'listening_for_command':
        this.currentInterimTranscript = '';
        this.startCommandRecognition();
        
        // Command Timeout (e.g. 6 seconds of silence -> returns quietly to standby)
        this.commandTimeoutTimer = setTimeout(() => {
          if (this.state === 'listening_for_command' && !this.currentInterimTranscript && !this.currentFinalTranscript) {
            this.transitionTo('standby', `Command timeout reached (${voiceConfig.commandTimeoutMs}ms silence)`);
          }
        }, voiceConfig.commandTimeoutMs);
        break;

      case 'transcribing_command':
        // Active transcribing: reset silence debounce
        this.resetSilenceDebounce();
        break;

      case 'processing_command':
        this.cleanupAllTimers();
        this.stopSpeechRecognition();
        this.executeCommandPipeline(this.currentFinalTranscript);
        break;

      case 'confirmation_required':
        this.startConfirmationTimer();
        break;

      case 'speaking_response':
        this.cleanupAllTimers();
        this.stopSpeechRecognition();
        break;

      case 'error':
        this.cleanupAllTimers();
        this.stopSpeechRecognition();
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // WEB SPEECH RECOGNITION PIPELINE & LIFECYCLE
  // ---------------------------------------------------------------------------
  private getSpeechRecognitionAPI(): any {
    if (typeof window === 'undefined') return null;
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
  }

  private startWakeWordRecognition(): void {
    if (this.state === 'disabled' || this.isSpeakingTTS) return;
    if (typeof window === 'undefined') return;
    const SpeechRecognition = this.getSpeechRecognitionAPI();

    if (!SpeechRecognition) {
      this.errorMessage = 'Web Speech API is not supported in this browser.';
      this.errorRecoveryHint = 'Use Google Chrome, Microsoft Edge, or the text-input fallback.';
      this.transitionTo('error', 'Browser unsupported');
      return;
    }

    // Reuse or create recognition instance
    try {
      if (this.recognitionInstance) {
        try {
          this.recognitionInstance.abort();
        } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        this.isRecognitionRunning = true;
        this.recognitionRestartAttempts = 0;
        this.notifyTelemetry();
      };

      recognition.onresult = (event: any) => {
        if (this.state !== 'standby' && this.state !== 'wake_candidate') return;

        let interimCombined = '';
        let finalCombined = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const transcriptPiece = res[0]?.transcript || '';
          if (res.isFinal) {
            finalCombined += ' ' + transcriptPiece;
          } else {
            interimCombined += ' ' + transcriptPiece;
          }
        }

        const candidateText = (finalCombined || interimCombined).trim();
        if (!candidateText) return;

        this.lastWakeCandidate = candidateText;

        // Pass 1: Wake Word Candidate Verification
        const verification = wakeWordDetector.verifyWakeWord(candidateText, voiceConfig.wakeConfidenceThreshold);
        this.lastWakeConfidence = verification.confidence;

        if (verification.matched) {
          // Transition to wake candidate verification
          this.transitionTo('wake_candidate', `Candidate wake phrase detected: "${verification.wakePhrase}"`, {
            wakeConfidence: verification.confidence,
            candidateText
          });

          // Pass 2: Temporal Stability Verification
          if (wakeWordDetector.verifyTemporalStability(candidateText)) {
            this.currentFinalTranscript = verification.trailingCommand;
            this.transitionTo('activated', `Wake word verified with confidence ${verification.confidence.toFixed(2)}`, {
              wakeConfidence: verification.confidence,
              commandTranscript: verification.trailingCommand
            });
          }
        } else if (verification.isNearMiss) {
          // Near miss: remain in standby without activating
          this.notifyTelemetry();
        }
      };

      recognition.onerror = (event: any) => {
        const err = event?.error || 'unknown_recognition_error';
        if (err === 'no-speech') return; // Normal quiet period

        if (err === 'not-allowed' || err === 'service-not-allowed') {
          this.errorMessage = 'Microphone access was denied or blocked.';
          this.errorRecoveryHint = 'Please grant microphone permissions in your browser URL bar.';
          this.transitionTo('error', `Microphone permission denied (${err})`);
          return;
        }

        if (err === 'network') {
          this.errorMessage = 'Speech recognition network connection interrupted.';
          this.errorRecoveryHint = 'Check your internet connection or use text input.';
          this.transitionTo('error', 'Network error');
          return;
        }

        // For transient errors, attempt graceful restart with backoff
        this.handleTransientRecognitionError(err);
      };

      recognition.onend = () => {
        this.isRecognitionRunning = false;
        if (this.state === 'standby' && !this.isSpeakingTTS) {
          this.scheduleRecognitionRestart();
        }
      };

      this.recognitionInstance = recognition;
      recognition.start();
    } catch (e: any) {
      this.handleTransientRecognitionError(e?.message || 'Failed to start recognition');
    }
  }

  private startCommandRecognition(): void {
    const SpeechRecognition = this.getSpeechRecognitionAPI();
    if (!SpeechRecognition) return;

    try {
      if (this.recognitionInstance) {
        try {
          this.recognitionInstance.abort();
        } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        this.isRecognitionRunning = true;
        this.notifyTelemetry();
      };

      recognition.onresult = (event: any) => {
        if (this.state !== 'listening_for_command' && this.state !== 'transcribing_command') return;

        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const textPiece = res[0]?.transcript || '';
          if (res.isFinal) {
            final += ' ' + textPiece;
          } else {
            interim += ' ' + textPiece;
          }
        }

        const cleanInterim = interim.trim();
        const cleanFinal = final.trim();

        if (cleanInterim || cleanFinal) {
          this.currentInterimTranscript = cleanInterim;
          if (cleanFinal) {
            this.currentFinalTranscript = (this.currentFinalTranscript + ' ' + cleanFinal).trim();
          }

          // User started speaking -> transition to transcribing_command
          if (this.state === 'listening_for_command') {
            this.transitionTo('transcribing_command', 'Speech utterance detected');
          }

          // Check for Immediate Cancellation ("cancel", "never mind")
          const currentText = (this.currentFinalTranscript + ' ' + this.currentInterimTranscript).toLowerCase().trim();
          if (currentText === 'cancel' || currentText === 'never mind' || currentText === 'nevermind' || currentText === 'stop') {
            this.cleanupAllTimers();
            this.transitionTo('standby', 'User cancelled command verbally');
            return;
          }

          // Reset silence debounce timer
          this.resetSilenceDebounce();
        }
      };

      recognition.onerror = (event: any) => {
        const err = event?.error || 'recognition_error';
        if (err === 'no-speech') return;
        this.handleTransientRecognitionError(err);
      };

      recognition.onend = () => {
        this.isRecognitionRunning = false;
        // If recognition ends while in transcribing with final text, finalize it
        if (this.state === 'transcribing_command' && this.currentFinalTranscript.trim()) {
          this.finalizeCommand();
        } else if (this.state === 'listening_for_command') {
          this.transitionTo('standby', 'Speech recognition ended during listen phase');
        }
      };

      this.recognitionInstance = recognition;
      recognition.start();
    } catch (e: any) {
      this.handleTransientRecognitionError(e?.message || 'Command recognition start error');
    }
  }

  private stopSpeechRecognition(): void {
    if (this.recognitionInstance) {
      try {
        this.recognitionInstance.onend = null;
        this.recognitionInstance.onerror = null;
        this.recognitionInstance.onresult = null;
        this.recognitionInstance.abort();
      } catch (e) {}
      this.recognitionInstance = null;
    }
    this.isRecognitionRunning = false;
  }

  private resetSilenceDebounce(): void {
    if (this.silenceDebounceTimer) {
      clearTimeout(this.silenceDebounceTimer);
    }

    this.silenceDebounceTimer = setTimeout(() => {
      if (this.state === 'transcribing_command') {
        const fullUtterance = (this.currentFinalTranscript || this.currentInterimTranscript).trim();
        if (fullUtterance.length > 0) {
          this.currentFinalTranscript = fullUtterance;
          this.finalizeCommand();
        }
      }
    }, voiceConfig.silenceDebounceMs);
  }

  private finalizeCommand(): void {
    this.cleanupAllTimers();
    let text = this.currentFinalTranscript.trim();

    // Strip wake word from beginning of utterance only
    text = text.replace(/^(?:hey|ok|okay|yo|hi|hello)?\s*(?:jarvis|javis)\s*[,:\-–]?\s*/i, '').trim();

    if (!text) {
      this.transitionTo('standby', 'Empty command after wake word stripping');
      return;
    }

    this.currentFinalTranscript = text;
    this.currentInterimTranscript = '';
    this.transitionTo('processing_command', `Final command ready: "${text}"`, {
      commandTranscript: text
    });
  }

  // ---------------------------------------------------------------------------
  // COMMAND EXECUTION PIPELINE & STRUCTURED INTENT VALIDATION
  // ---------------------------------------------------------------------------
  private async executeCommandPipeline(commandText: string): Promise<void> {
    const sessionId = this.currentSessionId;

    try {
      if (this.commandHandler) {
        await this.commandHandler(commandText, sessionId);
      }
    } catch (err: any) {
      this.errorMessage = err?.message || 'Command execution encountered an error.';
      this.transitionTo('error', 'Execution error', { error: err?.message });
    }
  }

  // ---------------------------------------------------------------------------
  // CONFIRMATION CONTROLLER (Destructive / Write Actions)
  // ---------------------------------------------------------------------------
  public requestConfirmation(
    prompt: string, 
    action: () => Promise<void>
  ): void {
    this.pendingConfirmationPrompt = prompt;
    this.pendingConfirmationAction = action;
    this.transitionTo('confirmation_required', `Confirmation required for action: "${prompt}"`);
    this.speakResponse(prompt);
  }

  public async confirmPendingAction(): Promise<void> {
    if (this.pendingConfirmationAction) {
      const act = this.pendingConfirmationAction;
      this.pendingConfirmationAction = null;
      this.pendingConfirmationPrompt = null;
      this.cleanupAllTimers();
      await act();
      this.transitionTo('standby', 'Confirmed action executed');
    }
  }

  public cancelPendingAction(): void {
    this.pendingConfirmationAction = null;
    this.pendingConfirmationPrompt = null;
    this.cleanupAllTimers();
    this.speakResponse("Action cancelled, sir.");
    this.transitionTo('standby', 'User cancelled pending action');
  }

  private startConfirmationTimer(): void {
    if (this.confirmationTimeoutTimer) clearTimeout(this.confirmationTimeoutTimer);
    this.confirmationTimeoutTimer = setTimeout(() => {
      if (this.state === 'confirmation_required') {
        this.cancelPendingAction();
      }
    }, 10000);
  }

  // ---------------------------------------------------------------------------
  // TEXT-TO-SPEECH (TTS) & SELF-FEEDBACK GATING
  // ---------------------------------------------------------------------------
  public speakResponse(text: string, onComplete?: () => void): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.unduckAudio();
      this.transitionTo('standby', 'TTS unavailable in environment');
      return;
    }

    this.stopSpeechRecognition();
    this.isSpeakingTTS = true;
    this.duckAudio();

    this.transitionTo('speaking_response', `TTS speaking: "${text.slice(0, 35)}..."`);

    try {
      window.speechSynthesis.cancel();
      const cleaned = cleanJarvisOutput(text).replace(/\[ACTION:[\s\S]*?\]/g, '').trim();
      if (!cleaned) {
        this.isSpeakingTTS = false;
        this.unduckAudio();
        this.transitionTo('standby', 'Empty TTS text');
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.rate = 1.05;
      utterance.pitch = 0.96;
      utterance.volume = 1.0;

      // Select optimal voice
      const voices = window.speechSynthesis.getVoices();
      const premiumVoice = voices.find(v => 
        (v.name.includes('Daniel') || v.name.includes('George') || v.name.includes('Google UK English Male') || v.name.includes('Natural')) &&
        v.lang.startsWith('en')
      ) || voices.find(v => v.lang.startsWith('en'));

      if (premiumVoice) utterance.voice = premiumVoice;

      utterance.onend = () => {
        this.isSpeakingTTS = false;
        this.speechSynthesisUtterance = null;
        this.unduckAudio();
        if (onComplete) onComplete();
        // Safe acoustic buffer before resuming standby listening
        setTimeout(() => {
          if (this.state === 'speaking_response') {
            this.transitionTo('standby', 'TTS completed');
          }
        }, 500);
      };

      utterance.onerror = () => {
        this.isSpeakingTTS = false;
        this.speechSynthesisUtterance = null;
        this.unduckAudio();
        if (onComplete) onComplete();
        this.transitionTo('standby', 'TTS playback error');
      };

      this.speechSynthesisUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      this.isSpeakingTTS = false;
      this.unduckAudio();
      this.transitionTo('standby', 'TTS exception');
    }
  }

  public stopSpeaking(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeakingTTS = false;
    this.speechSynthesisUtterance = null;
    this.unduckAudio();
    this.transitionTo('standby', 'TTS stopped by user');
  }

  // ---------------------------------------------------------------------------
  // AUDIO DUCKING & RECOVERY
  // ---------------------------------------------------------------------------
  private duckAudio(): void {
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('jarvis-audio-duck', { detail: { volume: 0.2 } }));
      }
    } catch (e) {}
  }

  private unduckAudio(): void {
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('jarvis-audio-unduck', { detail: { volume: 1.0 } }));
      }
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // ERROR & RECOVERY CONTROLLER
  // ---------------------------------------------------------------------------
  private handleTransientRecognitionError(errorDetail: string): void {
    this.recognitionRestartAttempts++;
    if (this.recognitionRestartAttempts > this.maxRestartAttempts) {
      this.errorMessage = `Speech service failed after ${this.maxRestartAttempts} attempts: ${errorDetail}`;
      this.errorRecoveryHint = 'Click "Retry Voice" or enter commands via the keyboard.';
      this.transitionTo('error', `Max restarts exceeded: ${errorDetail}`);
      return;
    }

    this.scheduleRecognitionRestart();
  }

  private scheduleRecognitionRestart(): void {
    if (this.restartDebounceTimer) clearTimeout(this.restartDebounceTimer);
    const delay = Math.min(1000 * Math.pow(1.5, this.recognitionRestartAttempts), 4000);
    this.restartDebounceTimer = setTimeout(() => {
      if (this.state === 'standby' && !this.isSpeakingTTS) {
        this.startWakeWordRecognition();
      }
    }, delay);
  }

  public retryVoice(): void {
    this.recognitionRestartAttempts = 0;
    this.errorMessage = null;
    this.errorRecoveryHint = null;
    this.transitionTo('standby', 'Manual retry initiated');
  }

  public cancelCurrentAction(): void {
    this.stopSpeaking();
    this.cleanupAllTimers();
    this.transitionTo('standby', 'User cancelled current action');
  }

  public enableVoice(enabled: boolean): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jarvis-always-listening', String(enabled));
    }
    if (enabled) {
      this.transitionTo('standby', 'Voice explicitly enabled');
    } else {
      this.transitionTo('disabled', 'Voice explicitly disabled');
    }
  }

  public startManualPushToTalk(): void {
    this.transitionTo('activated', 'Manual push-to-talk button triggered');
  }

  private cleanupAllTimers(): void {
    if (this.commandTimeoutTimer) clearTimeout(this.commandTimeoutTimer);
    if (this.silenceDebounceTimer) clearTimeout(this.silenceDebounceTimer);
    if (this.confirmationTimeoutTimer) clearTimeout(this.confirmationTimeoutTimer);
    if (this.restartDebounceTimer) clearTimeout(this.restartDebounceTimer);
    if (this.wakeVerificationTimer) clearTimeout(this.wakeVerificationTimer);
  }

  // ---------------------------------------------------------------------------
  // TELEMETRY & SUBSCRIPTIONS
  // ---------------------------------------------------------------------------
  public subscribe(listener: VoiceStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getTelemetry());
    return () => this.listeners.delete(listener);
  }

  private notifyTelemetry(): void {
    const data = this.getTelemetry();
    this.listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (e) {}
    });
  }

  public getTelemetry(): VoiceEngineTelemetry {
    return {
      state: this.state,
      previousState: this.previousState,
      microphoneStatus: this.state === 'disabled' ? 'idle' : this.state === 'error' ? 'error' : this.isRecognitionRunning ? 'listening' : 'granted',
      isMicrophoneActive: this.isRecognitionRunning,
      wakeWordDetected: this.state === 'activated' || this.state === 'listening_for_command',
      wakeConfidence: this.lastWakeConfidence,
      lastWakeCandidateText: this.lastWakeCandidate,
      interimTranscript: this.currentInterimTranscript,
      finalCommandTranscript: this.currentFinalTranscript,
      intentConfidence: this.lastIntentConfidence,
      lastParsedIntent: this.lastParsedIntent,
      pendingConfirmationPrompt: this.pendingConfirmationPrompt,
      hasPendingConfirmation: this.state === 'confirmation_required',
      errorMessage: this.errorMessage,
      errorRecoveryHint: this.errorRecoveryHint,
      isTTSPlaying: this.isSpeakingTTS,
      audioUploaded: false,
      lastTransitionTimestamp: this.stateEntryTimestamp,
      stateHistory: [...this.diagnosticHistory],

      // Compatibility aliases
      phase: this.state,
      transcript: this.currentFinalTranscript || this.currentInterimTranscript,
      activeTool: this.lastParsedIntent || null,
      geminiStatus: 'idle',
      sessionId: this.currentSessionId,
      wakeWordEnabled: this.state !== 'disabled',
      audioSampleRate: 44100,
      activeListenerCount: this.listeners.size,
      activeTimers: 0,
      lastTransition: this.state,
      error: this.errorMessage
    };
  }

  public setCommandHandler(handler: CommandHandler): void {
    this.commandHandler = handler;
  }

  public getState(): VoiceState {
    return this.state;
  }

  // Backwards compatibility helpers
  public getStateData(): VoiceEngineTelemetry {
    return this.getTelemetry();
  }

  public startCommandListening(): void {
    this.startManualPushToTalk();
  }

  public stopCommandListening(): void {
    this.cancelCurrentAction();
  }

  public commitCommand(customText?: string): void {
    if (customText) {
      this.currentFinalTranscript = customText;
    }
    this.finalizeCommand();
  }

  public async warmupMicrophone(): Promise<boolean> {
    return true;
  }

  public setWakeWordEnabled(enabled: boolean): void {
    this.enableVoice(enabled);
  }

  public setHighSensitivity(enabled: boolean): void {
    // No-op or dynamic threshold adjust
  }

  public loadTrainedWakeWord(...args: any[]): void {
    // Custom wake word training compatibility stub
  }

  public startWakeWordDetection(): void {
    if (this.state === 'disabled') {
      this.enableVoice(true);
    } else {
      this.transitionTo('standby', 'Wake word detection started');
    }
  }

  public stopWakeWordDetection(): void {
    this.enableVoice(false);
  }

  public setIntentTelemetry(intent: string, confidence: number): void {
    this.lastParsedIntent = intent;
    this.lastIntentConfidence = confidence;
    this.notifyTelemetry();
  }

  public setGeminiStatus(status: any): void {
    // Backwards compatibility stub
  }

  public setActiveTool(tool: string): void {
    this.lastParsedIntent = tool;
  }
}

export const jarvisVoiceEngine = JarvisVoiceEngine.getInstance();
