"use client";

export type VoiceState =
  | "disabled"
  | "standby"
  | "wake_candidate"
  | "activated"
  | "listening_for_command"
  | "transcribing_command"
  | "processing_command"
  | "speaking_response"
  | "confirmation_required"
  | "error";

export interface VoiceConfig {
  wakeWord: string;
  wakeConfidenceThreshold: number;
  intentConfidenceThreshold: number;
  activationTimeoutMs: number;
  commandTimeoutMs: number;
  silenceDebounceMs: number;
  maxCommandDurationMs: number;
  requireConfirmationForWrites: boolean;
  enableBargeIn: boolean;
  alwaysListeningEnabled: boolean;
  soundFeedbackEnabled: boolean;
}

export const voiceConfig: VoiceConfig = {
  wakeWord: "Jarvis",
  wakeConfidenceThreshold: 0.85,
  intentConfidenceThreshold: 0.80,
  activationTimeoutMs: 4000,
  commandTimeoutMs: 6000,
  silenceDebounceMs: 800,
  maxCommandDurationMs: 15000,
  requireConfirmationForWrites: true,
  enableBargeIn: false,
  alwaysListeningEnabled: true,
  soundFeedbackEnabled: true,
};

export interface DiagnosticEvent {
  id: string;
  timestamp: number;
  fromState: VoiceState;
  toState: VoiceState;
  reason: string;
  wakeConfidence?: number;
  candidateText?: string;
  commandTranscript?: string;
  intentConfidence?: number;
  intent?: string;
  actionExecuted?: string | null;
  error?: string | null;
  durationMs?: number;
  audioUploaded: boolean;
}

export interface StructuredIntentResult {
  intent: string;
  confidence: number;
  entities: Record<string, any>;
  response: string;
  requiresConfirmation: boolean;
  action: string | null;
  rawAction?: any;
}
