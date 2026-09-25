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
 * 
 * CRITICAL DESIGN PRINCIPLES:
 * 1. Recognition must ALWAYS be restarted if it stops unexpectedly in any active state
 * 2. Self-echo suppression uses a generous 1200ms window after TTS ends
 * 3. Network errors are ALWAYS transient and never brick the engine
 * 4. The watchdog heartbeat monitors ALL active states, not just standby
 * 5. Post-TTS restart always forces a fresh recognition instance
 * 6. Recognition is explicitly STOPPED before TTS to prevent self-listening
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
  private maxRestartAttempts: number = 12;

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
  private ttsResumeTimer: any = null;

  // Audio Gating & Self-Echo Suppression
  private isSpeakingTTS: boolean = false;
  private lastTtsEndTime: number = 0;
  private speechSynthesisUtterance: SpeechSynthesisUtterance | null = null;
  private errorMessage: string | null = null;
  private errorRecoveryHint: string | null = null;
  private isStartingRecognition: boolean = false;

  // Post-TTS restart lock
  private postTtsRestartScheduled: boolean = false;

  private constructor() {
    if (typeof window !== 'undefined') {
      const storedEnabled = localStorage.getItem('jarvis-always-listening') !== 'false';
      this.state = storedEnabled ? 'standby' : 'disabled';
      this.previousState = 'disabled';
      
      if (this.state === 'standby') {
        setTimeout(() => this.ensureRecognitionRunning(), 300);
      }

      // Aggressive watchdog heartbeat - monitors ALL active states
      this.watchdogTimer = setInterval(() => {
        if (this.state === 'disabled') return;
        if (this.isSpeakingTTS) return;
        
        const activeStates: VoiceState[] = [
          'standby', 'wake_candidate', 'activated', 
          'listening_for_command', 'transcribing_command'
        ];
        
        if (activeStates.includes(this.state) && !this.isRecognitionRunning) {
          voiceLog('WATCHDOG', `Recognition dead in ${this.state} state, force-restarting`);
          this.recognitionRestartAttempts = 0;
          this.ensureRecognitionRunning();
        }
      }, 3000);
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

    this.handleStateEntry(nextState, prevState, reason);
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
        // Delayed start to avoid overlap with stale recognition instances
        setTimeout(() => {
          if (this.state === 'standby' && !this.isSpeakingTTS) {
            this.ensureRecognitionRunning();
          }
        }, 150);
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

        if (this.currentFinalTranscript.trim().length > 0) {
          setTimeout(() => {
            if (this.state === 'activated') {
              this.transitionTo('transcribing_command', 'Pre-roll trailing command captured; listening for complete thought');
              this.resetSilenceDebounce();
            }
          }, 80);
        } else {
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
        
        // 10 second timeout for silence
        this.commandTimeoutTimer = setTimeout(() => {
          if (this.state === 'listening_for_command' && !this.currentInterimTranscript && !this.currentFinalTranscript) {
            this.transitionTo('standby', 'Command timeout reached (10s silence)');
          }
        }, 10000);
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
        // Auto-recover from error state after 3 seconds
        setTimeout(() => {
          if (this.state === 'error') {
            this.recognitionRestartAttempts = 0;
            this.errorMessage = null;
            this.errorRecoveryHint = null;
            this.transitionTo('standby', 'Auto-recovery from error state');
          }
        }, 3000);
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
    if (this.state === 'disabled') return;
    if (this.isSpeakingTTS) return;
    if (typeof window === 'undefined') return;

    if (this.isStartingRecognition) return;
    if (this.isRecognitionRunning && this.recognitionInstance) {
      return;
    }
    this.isStartingRecognition = true;

    const SpeechRecognition = this.getSpeechRecognitionAPI();
    if (!SpeechRecognition) {
      this.errorMessage = 'Web Speech API is not supported in this browser.';
      this.errorRecoveryHint = 'Use Google Chrome, Microsoft Edge, or text fallback.';
      this.transitionTo('error', 'Browser unsupported');
      return;
    }

    try {
      // Always destroy stale instances first
      this.stopSpeechRecognition();

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 4;

      recognition.onstart = () => {
        this.isStartingRecognition = false;
        this.isRecognitionRunning = true;
        this.recognitionRestartAttempts = 0;
        voiceLog('RECOGNITION', 'Started successfully');
        this.notifyTelemetry();
      };

      recognition.onresult = (event: any) => {
        // ═══════════════════════════════════════════════════════════════════
        // SELF-ECHO PROTECTION: 1200ms guard after TTS ends
        // 250ms was way too short - the mic easily captures TTS residual audio
        // ═══════════════════════════════════════════════════════════════════
        const echoGuardMs = 1200;
        if (this.isSpeakingTTS || Date.now() - this.lastTtsEndTime < echoGuardMs) {
          voiceLog('ECHO_GUARD', 'Suppressed input during echo guard window');
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

          for (let j = 0; j < Math.min(res.length, 3); j++) {
            if (res[j]?.transcript) {
              alternativeTexts.push(res[j].transcript.trim());
            }
          }
        }

        const candidateText = (finalCombined || interimCombined).trim();
        if (!candidateText) return;

        // -------------------------------------------------------------------
        // 1. STANDBY / WAKE_CANDIDATE: WAKE WORD DETECTION
        // -------------------------------------------------------------------
        if (this.state === 'standby' || this.state === 'wake_candidate') {
          this.lastWakeCandidate = candidateText;

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

        // -------------------------------------------------------------------
        // 2. LISTENING / TRANSCRIBING: MULTI-WORD COMMAND CAPTURE
        // -------------------------------------------------------------------
        if (this.state === 'listening_for_command' || this.state === 'transcribing_command') {
          let cleanUtterance = (finalCombined || interimCombined).trim();
          cleanUtterance = cleanUtterance.replace(/^(?:hey|ok|okay|yo|hi|hello|sup)?\s*(?:jarvis|javis|jarves|jervis|travis)\s*[,:\-–]?\s*/i, '').trim();

          if (cleanUtterance.length > 0) {
            this.currentFinalTranscript = cleanUtterance;
            this.currentInterimTranscript = interimCombined.trim();

            if (this.state === 'listening_for_command') {
              this.transitionTo('transcribing_command', 'Speech utterance detected');
            }

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
        
        if (err === 'no-speech') return;
        if (err === 'aborted') return;

        if (err === 'not-allowed' || err === 'service-not-allowed') {
          this.errorMessage = 'Microphone access was denied or blocked.';
          this.errorRecoveryHint = 'Please grant microphone permissions in your browser URL bar.';
          this.transitionTo('error', `Microphone permission denied (${err})`);
          return;
        }

        // ALL other errors (network, audio-capture, etc.) are transient
        this.isStartingRecognition = false;
        voiceLog('TRANSIENT_ERROR', err);
        this.handleTransientRecognitionError(`Recognition error: ${err}`);
      };

      recognition.onend = () => {
        this.isStartingRecognition = false;
        this.isRecognitionRunning = false;
        voiceLog('RECOGNITION_END', `State: ${this.state}, TTS: ${this.isSpeakingTTS}`);
        
        // ═══════════════════════════════════════════════════════════════════
        // CRITICAL: Restart recognition in ALL active states.
        // Chrome's SpeechRecognition frequently fires onend mid-conversation.
        // We must seamlessly restart to maintain continuous listening.
        // ═══════════════════════════════════════════════════════════════════
        
        // If transcribing and we have text, finalize the command
        if (this.state === 'transcribing_command') {
          const text = (this.currentFinalTranscript || this.currentInterimTranscript).trim();
          if (text.length > 0) {
            this.currentFinalTranscript = text;
            this.finalizeCommand();
            return;
          }
        }
        
        // For ALL active states: seamlessly restart recognition
        const restartableStates: VoiceState[] = [
          'standby', 'wake_candidate', 'listening_for_command', 
          'activated', 'transcribing_command'
        ];
        
        if (restartableStates.includes(this.state) && !this.isSpeakingTTS) {
          setTimeout(() => {
            if (restartableStates.includes(this.state) && !this.isSpeakingTTS && !this.isRecognitionRunning) {
              voiceLog('AUTO_RESTART', `Restarting recognition in ${this.state} state`);
              this.ensureRecognitionRunning();
            }
          }, 80);
        }
      };

      this.recognitionInstance = recognition;
      recognition.start();
    } catch (e: any) {
      this.isStartingRecognition = false;
      voiceLog('START_ERROR', e?.message);
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

    // 2200ms adaptive debounce - generous enough for multi-word commands,
    // natural breathing pauses, and thinking gaps
    const dynamicDebounceMs = 2200;

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
  // CONFIRMATION CONTROLLER
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

    // ═══════════════════════════════════════════════════════════════════════
    // CRITICAL: Stop recognition BEFORE speaking to prevent self-listening
    // This is the #1 fix for the "Jarvis listens to itself" bug
    // ═══════════════════════════════════════════════════════════════════════
    this.stopSpeechRecognition();
    
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
        this.schedulePostTtsRestart();
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

      // Chrome bug workaround: speechSynthesis hangs on long utterances
      if (this.ttsResumeTimer) clearInterval(this.ttsResumeTimer);
      this.ttsResumeTimer = setInterval(() => {
        if (this.isSpeakingTTS && typeof window !== 'undefined') {
          window.speechSynthesis.resume();
        }
      }, 10000);

      const finishSpeech = () => {
        if (this.ttsResumeTimer) {
          clearInterval(this.ttsResumeTimer);
          this.ttsResumeTimer = null;
        }

        this.isSpeakingTTS = false;
        this.lastTtsEndTime = Date.now();
        this.speechSynthesisUtterance = null;
        this.unduckAudio();
        
        if (onComplete) onComplete();
        
        // Schedule clean recognition restart after echo guard
        this.schedulePostTtsRestart();

        // Auto-minimize after 2.5s grace period
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('jarvis-auto-minimize'));
          }
        }, 2500);
      };

      utterance.onend = finishSpeech;
      utterance.onerror = (e: any) => {
        voiceLog('TTS_ERROR', e?.error);
        finishSpeech();
      };

      this.speechSynthesisUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      if (this.ttsResumeTimer) {
        clearInterval(this.ttsResumeTimer);
        this.ttsResumeTimer = null;
      }
      this.isSpeakingTTS = false;
      this.lastTtsEndTime = Date.now();
      this.unduckAudio();
      this.schedulePostTtsRestart();
    }
  }

  /**
   * Schedule a clean recognition restart after TTS finishes.
   * Uses a delay matching the echo guard window (1200ms) + safety margin
   * to ensure the mic doesn't pick up residual TTS audio from speakers.
   */
  private schedulePostTtsRestart(): void {
    if (this.postTtsRestartScheduled) return;
    this.postTtsRestartScheduled = true;

    const restartDelay = 1400;
    
    setTimeout(() => {
      this.postTtsRestartScheduled = false;
      
      if (this.state === 'speaking_response' || this.state === 'processing_command') {
        this.recognitionRestartAttempts = 0;
        this.transitionTo('standby', 'TTS completed - resuming continuous listener');
      } else if (this.state === 'standby') {
        this.recognitionRestartAttempts = 0;
        this.ensureRecognitionRunning();
      }
    }, restartDelay);
  }

  public stopSpeaking(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.ttsResumeTimer) {
      clearInterval(this.ttsResumeTimer);
      this.ttsResumeTimer = null;
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

    // Stop the dead instance
    this.stopSpeechRecognition();

    // Exponential backoff: 200ms, 400ms, 800ms, 1600ms...
    const backoffMs = Math.min(200 * Math.pow(2, this.recognitionRestartAttempts - 1), 5000);
    
    if (this.restartDebounceTimer) clearTimeout(this.restartDebounceTimer);
    this.restartDebounceTimer = setTimeout(() => {
      // ═══════════════════════════════════════════════════════════════════
      // CRITICAL FIX: Restart in ANY active state, not just standby.
      // The old code only recovered when state === 'standby', which meant
      // network errors during listening_for_command bricked the engine.
      // ═══════════════════════════════════════════════════════════════════
      if (this.state !== 'disabled' && this.state !== 'error' && !this.isSpeakingTTS) {
        voiceLog('RECOVERY', `Attempt ${this.recognitionRestartAttempts}, backoff ${backoffMs}ms`);
        this.ensureRecognitionRunning();
      }
    }, backoffMs);
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
