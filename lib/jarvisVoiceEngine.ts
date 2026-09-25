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
 * Universal High-Reliability Continuous-Stream Finite State Machine Voice Engine for JARVIS
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
  private maxRestartAttempts: number = 5;

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
  private watchdogTimer: any = null;

  // Audio Gating & Self-Echo Suppression
  private isSpeakingTTS: boolean = false;
  private lastTtsEndTime: number = 0;
  private speechSynthesisUtterance: SpeechSynthesisUtterance | null = null;
  private errorMessage: string | null = null;
  private errorRecoveryHint: string | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      const storedEnabled = localStorage.getItem('jarvis-always-listening') !== 'false';
      this.state = storedEnabled ? 'standby' : 'disabled';
      this.previousState = 'disabled';
      
      if (this.state === 'standby') {
        setTimeout(() => this.ensureRecognitionRunning(), 300);
      }

      // Keep recognition alive with a watchdog heartbeat
      this.watchdogTimer = setInterval(() => {
        if (this.state !== 'disabled' && !this.isSpeakingTTS && !this.isRecognitionRunning) {
          this.ensureRecognitionRunning();
        }
      }, 5000);
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
        this.recognitionRestartAttempts = 0;
        this.unduckAudio();
        this.ensureRecognitionRunning();
        break;

      case 'wake_candidate':
        break;

      case 'activated':
        this.currentSessionId = `session-${Date.now()}`;
        this.cleanupAllTimers();
        this.duckAudio();

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('jarvis-hotword-triggered', {
            detail: { trailingCommand: this.currentFinalTranscript }
          }));
        }

        if (voiceConfig.soundFeedbackEnabled) {
          jarvisAudio.playWake();
        }

        // If trailing command words were present in the single utterance, transition to transcribing and debounce
        // without prematurely cutting off remaining speech!
        if (this.currentFinalTranscript.trim().length > 0) {
          setTimeout(() => {
            if (this.state === 'activated') {
              this.transitionTo('transcribing_command', 'Pre-roll trailing command captured; listening for complete thought');
              this.resetSilenceDebounce();
            }
          }, 80);
        } else {
          // Transition immediately to listening for command
          setTimeout(() => {
            if (this.state === 'activated') {
              this.transitionTo('listening_for_command', 'Waiting for user command utterance');
            }
          }, 80);
        }
        break;

      case 'listening_for_command':
        this.currentInterimTranscript = '';
        this.currentFinalTranscript = '';
        this.ensureRecognitionRunning();
        
        // Command Timeout (8 seconds of silence -> returns quietly to standby)
        this.commandTimeoutTimer = setTimeout(() => {
          if (this.state === 'listening_for_command' && !this.currentInterimTranscript && !this.currentFinalTranscript) {
            this.transitionTo('standby', `Command timeout reached (${voiceConfig.commandTimeoutMs}ms silence)`);
          }
        }, 8000);
        break;

      case 'transcribing_command':
        this.resetSilenceDebounce();
        break;

      case 'processing_command':
        this.cleanupAllTimers();
        this.executeCommandPipeline(this.currentFinalTranscript);
        break;

      case 'confirmation_required':
        this.startConfirmationTimer();
        break;

      case 'speaking_response':
        this.cleanupAllTimers();
        break;

      case 'error':
        this.cleanupAllTimers();
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // CONTINUOUS WEB SPEECH RECOGNITION PIPELINE
  // ---------------------------------------------------------------------------
  private getSpeechRecognitionAPI(): any {
    if (typeof window === 'undefined') return null;
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
  }

  private ensureRecognitionRunning(): void {
    if (this.state === 'disabled' || this.isSpeakingTTS) return;
    if (typeof window === 'undefined') return;

    if (this.isRecognitionRunning && this.recognitionInstance) {
      return; // Already actively streaming
    }

    const SpeechRecognition = this.getSpeechRecognitionAPI();
    if (!SpeechRecognition) {
      this.errorMessage = 'Web Speech API is not supported in this browser.';
      this.errorRecoveryHint = 'Use Google Chrome, Microsoft Edge, or text fallback.';
      this.transitionTo('error', 'Browser unsupported');
      return;
    }

    try {
      this.stopSpeechRecognition();

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 4; // Multiple alternatives to catch accents reliably

      recognition.onstart = () => {
        this.isRecognitionRunning = true;
        this.recognitionRestartAttempts = 0;
        this.notifyTelemetry();
      };

      recognition.onresult = (event: any) => {
        // Self-echo protection: ignore microphone while Jarvis is speaking or immediately after
        if (this.isSpeakingTTS || Date.now() - this.lastTtsEndTime < 250) {
          return;
        }

        let interimCombined = '';
        let finalCombined = '';
        const alternativeTexts: string[] = [];

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          const primaryPiece = res[0]?.transcript || '';

          if (res.isFinal) {
            finalCombined += ' ' + primaryPiece;
          } else {
            interimCombined += ' ' + primaryPiece;
          }

          // Gather all alternatives
          for (let j = 0; j < Math.min(res.length, 3); j++) {
            if (res[j]?.transcript) {
              alternativeTexts.push(res[j].transcript.trim());
            }
          }
        }

        const candidateText = (finalCombined || interimCombined).trim();
        if (!candidateText) return;

        // ---------------------------------------------------------------------
        // 1. STANDBY / WAKE_CANDIDATE STATE: WAKE WORD DETECTION
        // ---------------------------------------------------------------------
        if (this.state === 'standby' || this.state === 'wake_candidate') {
          this.lastWakeCandidate = candidateText;

          // Check primary candidate + all alternatives
          const candidatesToTest = [candidateText, ...alternativeTexts];
          let bestVerification: WakeWordVerificationResult | null = null;

          for (const cand of candidatesToTest) {
            const verification = wakeWordDetector.verifyWakeWord(cand, voiceConfig.wakeConfidenceThreshold);
            if (verification.matched) {
              bestVerification = verification;
              break;
            }
            if (!bestVerification || verification.confidence > bestVerification.confidence) {
              bestVerification = verification;
            }
          }

          if (bestVerification && bestVerification.matched) {
            this.lastWakeConfidence = bestVerification.confidence;
            this.transitionTo('wake_candidate', `Candidate wake phrase: "${bestVerification.wakePhrase}"`, {
              wakeConfidence: bestVerification.confidence,
              candidateText
            });

            if (wakeWordDetector.verifyTemporalStability(candidateText)) {
              this.currentFinalTranscript = bestVerification.trailingCommand;
              this.transitionTo('activated', `Wake word verified with confidence ${bestVerification.confidence.toFixed(2)}`, {
                wakeConfidence: bestVerification.confidence,
                commandTranscript: bestVerification.trailingCommand
              });
            }
          }
          return;
        }

        // ---------------------------------------------------------------------
        // 2. LISTENING / TRANSCRIBING COMMAND STATE: MULTI-WORD COMMAND CAPTURE
        // ---------------------------------------------------------------------
        if (this.state === 'listening_for_command' || this.state === 'transcribing_command') {
          // Strip leading wake-word from captured phrase if still present
          let cleanUtterance = (finalCombined || interimCombined).trim();
          cleanUtterance = cleanUtterance.replace(/^(?:hey|ok|okay|yo|hi|hello|sup)?\s*(?:jarvis|javis|jarves|jervis|travis)\s*[,:\-–]?\s*/i, '').trim();

          if (cleanUtterance.length > 0) {
            this.currentFinalTranscript = cleanUtterance;
            this.currentInterimTranscript = interimCombined.trim();

            if (this.state === 'listening_for_command') {
              this.transitionTo('transcribing_command', 'Speech utterance detected');
            }

            // Check Verbal Cancellation
            const lower = cleanUtterance.toLowerCase();
            if (lower === 'cancel' || lower === 'never mind' || lower === 'nevermind' || lower === 'stop') {
              this.cleanupAllTimers();
              this.transitionTo('standby', 'User cancelled command verbally');
              return;
            }

            this.resetSilenceDebounce();
          }
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

        this.handleTransientRecognitionError(err);
      };

      recognition.onend = () => {
        this.isRecognitionRunning = false;
        
        // If in command mode with finalized text, complete execution
        if (this.state === 'transcribing_command') {
          const text = (this.currentFinalTranscript || this.currentInterimTranscript).trim();
          if (text.length > 0) {
            this.currentFinalTranscript = text;
            this.finalizeCommand();
            return;
          }
        }
        
        // If in standby, immediately and seamlessly restart recognition
        if (this.state === 'standby' && !this.isSpeakingTTS) {
          setTimeout(() => {
            if (this.state === 'standby' && !this.isSpeakingTTS) {
              this.ensureRecognitionRunning();
            }
          }, 100);
        }
      };

      this.recognitionInstance = recognition;
      recognition.start();
    } catch (e: any) {
      this.handleTransientRecognitionError(e?.message || 'Failed to start recognition');
    }
  }

  private stopSpeechRecognition(): void {
    if (this.recognitionInstance) {
      try {
        this.recognitionInstance.onstart = null;
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

    const fullUtterance = (this.currentFinalTranscript || this.currentInterimTranscript).trim();
    if (!fullUtterance) return;

    // Generous adaptive debounce (1800ms) allows complete sentences, complex commands,
    // and natural breathing pauses without prematurely cutting off the user!
    const dynamicDebounceMs = 1800;

    this.silenceDebounceTimer = setTimeout(() => {
      if (this.state === 'transcribing_command') {
        const text = (this.currentFinalTranscript || this.currentInterimTranscript).trim();
        if (text.length > 0) {
          this.currentFinalTranscript = text;
          this.currentInterimTranscript = '';
          this.finalizeCommand();
        }
      }
    }, dynamicDebounceMs);
  }

  private finalizeCommand(): void {
    this.cleanupAllTimers();
    let text = this.currentFinalTranscript.trim();

    // Strip wake word from beginning of utterance
    text = text.replace(/^(?:hey|ok|okay|yo|hi|hello|sup)?\s*(?:jarvis|javis|jarves|jervis|travis)\s*[,:\-–]?\s*/i, '').trim();

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
  // COMMAND EXECUTION PIPELINE
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

    this.isSpeakingTTS = true;
    this.duckAudio();
    this.transitionTo('speaking_response', `TTS speaking: "${text.slice(0, 35)}..."`);

    try {
      window.speechSynthesis.cancel();
      const cleaned = cleanJarvisOutput(text).replace(/\[ACTION:[\s\S]*?\]/g, '').trim();
      if (!cleaned) {
        this.isSpeakingTTS = false;
        this.lastTtsEndTime = Date.now();
        this.unduckAudio();
        this.transitionTo('standby', 'Empty TTS text');
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.rate = 1.05;
      utterance.pitch = 0.96;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const premiumVoice = voices.find(v => 
        (v.name.includes('Daniel') || v.name.includes('George') || v.name.includes('Google UK English Male') || v.name.includes('Natural')) &&
        v.lang.startsWith('en')
      ) || voices.find(v => v.lang.startsWith('en'));

      if (premiumVoice) utterance.voice = premiumVoice;

      const finishSpeech = () => {
        this.isSpeakingTTS = false;
        this.lastTtsEndTime = Date.now();
        this.speechSynthesisUtterance = null;
        this.unduckAudio();
        if (onComplete) onComplete();
        setTimeout(() => {
          if (this.state === 'speaking_response') {
            this.recognitionRestartAttempts = 0;
            this.transitionTo('standby', 'TTS completed - resuming continuous listener');
            this.ensureRecognitionRunning();
          }
        }, 150);

        // Auto-minimize after 2.5s grace period if no Spot UI elements are active on screen
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('jarvis-auto-minimize'));
          }
        }, 2500);
      };

      utterance.onend = finishSpeech;
      utterance.onerror = finishSpeech;

      this.speechSynthesisUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      this.isSpeakingTTS = false;
      this.lastTtsEndTime = Date.now();
      this.unduckAudio();
      this.transitionTo('standby', 'TTS exception');
    }
  }

  public stopSpeaking(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeakingTTS = false;
    this.lastTtsEndTime = Date.now();
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
      this.errorMessage = `Speech service interrupted: ${errorDetail}`;
      this.errorRecoveryHint = 'Click "Retry Voice" or enter commands via the keyboard.';
      this.transitionTo('error', `Max restarts exceeded: ${errorDetail}`);
      return;
    }

    if (this.restartDebounceTimer) clearTimeout(this.restartDebounceTimer);
    this.restartDebounceTimer = setTimeout(() => {
      if (this.state === 'standby' && !this.isSpeakingTTS) {
        this.ensureRecognitionRunning();
      }
    }, 400);
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
      wakeWordDetected: this.state === 'activated' || this.state === 'listening_for_command' || this.state === 'transcribing_command',
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
    // Dynamic threshold adjust
  }

  public loadTrainedWakeWord(...args: any[]): void {}

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

  public setGeminiStatus(status: any): void {}

  public setActiveTool(tool: string): void {
    this.lastParsedIntent = tool;
  }
}

export const jarvisVoiceEngine = JarvisVoiceEngine.getInstance();
