"use client";

import { jarvisLiveAudioPipeline } from './jarvisLiveAudioPipeline';
import { executeMusicTool } from './musicTools';
import { executeLocalCommand } from './jarvisCommandDispatcher';
import { getSelectedLiveModel, getLiveModelCapabilities } from './aiModelConfig';
import { cleanJarvisOutput } from './jarvisOutputCleaner';

export type LivePhase =
  | 'IDLE'
  | 'REQUESTING_MICROPHONE'
  | 'CONNECTING_LIVE'
  | 'LIVE_READY'
  | 'LIVE_LISTENING'
  | 'LIVE_PROCESSING'
  | 'LIVE_SPEAKING'
  | 'LIVE_INTERRUPTED'
  | 'LIVE_RECONNECTING'
  | 'LIVE_ERROR'
  | 'EXITING_LIVE';

export interface LiveTelemetry {
  phase: LivePhase;
  sessionId: string;
  selectedModel: string;
  modelCapabilities: any;
  tokenExpiry: string | null;
  wsState: 'CLOSED' | 'CONNECTING' | 'OPEN' | 'CLOSING';
  isMicrophoneActive: boolean;
  isMuted: boolean;
  inputSampleRate: number;
  outputSampleRate: number;
  inputChunkCount: number;
  outputChunkCount: number;
  currentTurn: 'user' | 'model' | 'idle';
  bargeInCount: number;
  reconnectCount: number;
  lastServerEventType: string | null;
  lastError: string | null;
  activeTool: string | null;
  transcript: string;
  interimTranscript: string;
  userSpeechLevel: number;
  lastUserQuery: string | null;
  lastModelResponse: string | null;
}

// Approved Live Tool Declarations for Gemini Live WebSocket
export const LIVE_TOOL_DECLARATIONS = [
  {
    name: 'search_frequency',
    description: 'Search The Frequency music library for tracks, artists, or genres.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Artist, song title, or genre' }
      },
      required: ['query']
    }
  },
  {
    name: 'find_playlist',
    description: 'Find playlists in The Frequency library by name, mood, artist, or contents.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Search term or playlist name' }
      },
      required: ['query']
    }
  },
  {
    name: 'play_playlist',
    description: 'Start playing a playlist in The Frequency.',
    parameters: {
      type: 'OBJECT',
      properties: {
        playlistId: { type: 'STRING', description: 'ID or title of the playlist' },
        startIndex: { type: 'INTEGER', description: 'Index to start from (0-based)' },
        shuffle: { type: 'BOOLEAN', description: 'Whether to shuffle' }
      },
      required: ['playlistId']
    }
  },
  {
    name: 'pause_playback',
    description: 'Pause music and audio playback in The Frequency.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },
  {
    name: 'resume_playback',
    description: 'Resume paused music playback in The Frequency.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },
  {
    name: 'skip_next',
    description: 'Skip to the next song in the playback queue.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },
  {
    name: 'skip_previous',
    description: 'Play the previous song in the playback queue.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },
  {
    name: 'get_current_playback',
    description: 'Get current playing track title, artist, and status.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },
  {
    name: 'create_task_draft',
    description: 'Create a new focus objective or task draft in FocusForge.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Task title' },
        priority: { type: 'STRING', description: 'Priority level (urgent, high, medium)' }
      },
      required: ['title']
    }
  }
];

export const LIVE_SYSTEM_INSTRUCTION = `You are Jarvis in Live mode for FocusForge.
Speak conversationally, concisely, and with ultra-low latency.
Provide direct, concise answers in 1 to 2 short sentences.
Do not output role labels or formatting symbols.
Do not output prompt templates.
Do not expose tool calls or raw JSON to the user.
Do not narrate hidden internal reasoning.
When a tool is needed, call the tool. After the result, speak the concise result.
Address the user politely as Sir, Boss, or Chief when appropriate.`;

export type LiveStateListener = (telemetry: LiveTelemetry) => void;

class JarvisLiveEngine {
  private static instance: JarvisLiveEngine;

  private phase: LivePhase = 'IDLE';
  private currentSessionId: string = '';
  private selectedModelId: string = getSelectedLiveModel();
  private ws: WebSocket | null = null;
  private tokenExpiry: string | null = null;
  private resumptionHandle: string | null = null;

  private activeTool: string | null = null;
  private lastError: string | null = null;
  private lastServerEventType: string | null = null;
  private bargeInCount: number = 0;
  private reconnectCount: number = 0;
  private maxReconnectAttempts: number = 5;
  private isMuted: boolean = false;
  private currentTurn: 'user' | 'model' | 'idle' = 'idle';

  private accumulatedTranscript: string = '';
  private interimTranscript: string = '';
  private userSpeechLevel: number = 0;
  private lastUserQuery: string | null = null;
  private lastModelResponse: string | null = null;
  private conversationHistory: { role: 'user' | 'model'; text: string }[] = [];

  private listeners: Set<LiveStateListener> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;

  // Speech recognition fallback / augmentation
  private speechRecognition: any = null;
  private silenceTimer: NodeJS.Timeout | null = null;
  private speechBuffer: string = '';
  private isWebSocketActive: boolean = false;
  private lastSpeechTimestamp: number = 0;
  private lastSpeechText: string = '';
  private previousFrequencyVolume: number | null = null;

  private duckAudio(): void {
    try {
      if (typeof window !== 'undefined') {
        const store = (window as any).__frequencyStore;
        if (store && typeof store.getState === 'function') {
          const state = store.getState();
          if (state.isPlaying && state.volume > 0.15 && this.previousFrequencyVolume === null) {
            this.previousFrequencyVolume = state.volume;
            state.setVolume(Math.min(0.12, state.volume * 0.18));
          }
        }
      }
    } catch (e) {}
  }

  private unduckAudio(): void {
    try {
      if (this.previousFrequencyVolume !== null && typeof window !== 'undefined') {
        const store = (window as any).__frequencyStore;
        if (store && typeof store.getState === 'function') {
          store.getState().setVolume(this.previousFrequencyVolume);
        }
        this.previousFrequencyVolume = null;
      }
    } catch (e) {}
  }

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('jarvis-live-model-changed', (e: any) => {
        if (e?.detail?.modelId) {
          this.selectedModelId = e.detail.modelId;
          this.notifyTelemetry();
        }
      });
    }
  }

  public static getInstance(): JarvisLiveEngine {
    if (!JarvisLiveEngine.instance) {
      JarvisLiveEngine.instance = new JarvisLiveEngine();
    }
    return JarvisLiveEngine.instance;
  }

  public subscribe(listener: LiveStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getTelemetry());
    return () => this.listeners.delete(listener);
  }

  public getTelemetry(): LiveTelemetry {
    const audioTelem = jarvisLiveAudioPipeline.getTelemetry();
    let wsStateStr: 'CLOSED' | 'CONNECTING' | 'OPEN' | 'CLOSING' = 'CLOSED';
    if (this.ws) {
      switch (this.ws.readyState) {
        case WebSocket.CONNECTING: wsStateStr = 'CONNECTING'; break;
        case WebSocket.OPEN: wsStateStr = 'OPEN'; break;
        case WebSocket.CLOSING: wsStateStr = 'CLOSING'; break;
        case WebSocket.CLOSED: wsStateStr = 'CLOSED'; break;
      }
    }

    return {
      phase: this.phase,
      sessionId: this.currentSessionId,
      selectedModel: this.selectedModelId,
      modelCapabilities: getLiveModelCapabilities(this.selectedModelId),
      tokenExpiry: this.tokenExpiry,
      wsState: wsStateStr,
      isMicrophoneActive: audioTelem.isRecording,
      isMuted: this.isMuted,
      inputSampleRate: audioTelem.inputSampleRate,
      outputSampleRate: audioTelem.outputSampleRate,
      inputChunkCount: audioTelem.inputChunkCount,
      outputChunkCount: audioTelem.outputChunkCount,
      currentTurn: this.currentTurn,
      bargeInCount: this.bargeInCount,
      reconnectCount: this.reconnectCount,
      lastServerEventType: this.lastServerEventType,
      lastError: this.lastError,
      activeTool: this.activeTool,
      transcript: this.accumulatedTranscript,
      interimTranscript: this.interimTranscript,
      userSpeechLevel: this.userSpeechLevel,
      lastUserQuery: this.lastUserQuery,
      lastModelResponse: this.lastModelResponse
    };
  }

  private transitionTo(nextPhase: LivePhase, reason?: string): boolean {
    const prev = this.phase;
    if (prev === nextPhase) return false;

    this.phase = nextPhase;
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[JarvisLiveEngine] State transition: ${prev} -> ${nextPhase} (${reason || 'normal'})`);
    }

    this.notifyTelemetry();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jarvis-live-state', { detail: this.getTelemetry() }));
    }
    return true;
  }

  private telemetryScheduled = false;

  private notifyTelemetry(immediate: boolean = false): void {
    if (immediate) {
      const telem = this.getTelemetry();
      this.listeners.forEach((l) => {
        try { l(telem); } catch (e) {}
      });
      return;
    }

    if (this.telemetryScheduled) return;
    this.telemetryScheduled = true;
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        this.telemetryScheduled = false;
        const telem = this.getTelemetry();
        this.listeners.forEach((l) => {
          try { l(telem); } catch (e) {}
        });
      });
    } else {
      this.telemetryScheduled = false;
      const telem = this.getTelemetry();
      this.listeners.forEach((l) => {
        try { l(telem); } catch (e) {}
      });
    }
  }

  // Map requested model to a verified Gemini Live model
  private resolveLiveModelName(modelId: string): string {
    const id = modelId.toLowerCase();
    if (id.includes('3-flash') || id.includes('3-live') || id.includes('3.8-live')) {
      return 'gemini-2.0-flash-exp';
    }
    if (id.includes('2.5-flash-native-audio') || id.includes('2.5-flash') || id.includes('2.0-flash')) {
      return 'gemini-2.0-flash-exp';
    }
    return 'gemini-2.0-flash-exp';
  }

  // --- 1. START LIVE SESSION ---
  public async startLiveSession(targetModelId?: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // Invalidate any previous session
    this.cleanupSession(false);

    const sessionId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `live-${Date.now()}`;
    this.currentSessionId = sessionId;
    this.selectedModelId = targetModelId || getSelectedLiveModel();
    this.lastError = null;
    this.accumulatedTranscript = '';
    this.interimTranscript = '';
    this.lastUserQuery = null;
    this.lastModelResponse = null;
    this.conversationHistory = [];
    this.isWebSocketActive = false;

    // Step 1: Request Microphone Permission & Start Audio Capture Pipeline
    this.transitionTo('REQUESTING_MICROPHONE', 'Requesting microphone access');
    
    let stream: MediaStream | null = null;
    try {
      stream = await jarvisLiveAudioPipeline.startMicrophoneCapture(
        (base64Pcm) => this.handleLocalAudioChunk(base64Pcm, sessionId),
        (level) => {
          this.userSpeechLevel = level;
          // Local voice activity check during model response triggers natural barge-in
          if (this.phase === 'LIVE_SPEAKING' && level > 0.35) {
            this.handleBargeIn(sessionId, 'local_voice_activity');
          }
          // Note: VoiceBeam reads level directly from pipeline getter, avoiding 20+ React state re-renders / sec
        }
      );
    } catch (micErr: any) {
      this.lastError = micErr?.message || 'Microphone permission denied';
      this.transitionTo('LIVE_ERROR', 'Microphone failed');
      return false;
    }

    if (!stream) {
      this.lastError = 'Unable to open microphone stream';
      this.transitionTo('LIVE_ERROR', 'No stream');
      return false;
    }

    // Step 2: Establish Gemini Live WebSocket Connection or Fallback Assistant Pipeline
    this.transitionTo('CONNECTING_LIVE', 'Connecting to Gemini Live WebSocket');

    let apiKey = (typeof window !== 'undefined' ? localStorage.getItem('gemini-api-key') || '' : '').trim();
    if (!apiKey) {
      try {
        const keyRes = await fetch('/api/gemini/key');
        if (keyRes.ok) {
          const keyData = await keyRes.json();
          if (keyData.key) {
            apiKey = keyData.key;
            localStorage.setItem('gemini-api-key', apiKey);
          }
        }
      } catch (e) {}
    }

    const liveModelName = this.resolveLiveModelName(this.selectedModelId);

    // Also set up playback state callback on audio pipeline to track model speaking phase
    jarvisLiveAudioPipeline.setPlaybackStateCallback((isPlaying) => {
      if (this.currentSessionId !== sessionId) return;
      if (isPlaying) {
        this.currentTurn = 'model';
        this.transitionTo('LIVE_SPEAKING', 'Model audio streaming');
      } else {
        if (this.phase === 'LIVE_SPEAKING') {
          this.currentTurn = 'user';
          this.lastSpeechTimestamp = Date.now();
          this.transitionTo('LIVE_LISTENING', 'Model finished speaking');
        }
      }
    });

    // If an API key is present, attempt live bidirectional WebSocket
    if (apiKey) {
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(apiKey)}`;

      try {
        const ws = new WebSocket(wsUrl);
        this.ws = ws;

        let setupTimeout = setTimeout(() => {
          if (this.currentSessionId === sessionId && this.phase === 'CONNECTING_LIVE') {
            if (process.env.NODE_ENV !== 'production') {
              console.info('[JarvisLiveEngine] WebSocket handshake timeout, engaging continuous assistant pipeline.');
            }
            this.engageContinuousPipeline(sessionId);
          }
        }, 3000);

        ws.onopen = () => {
          if (this.currentSessionId !== sessionId) return;
          if (setupTimeout) clearTimeout(setupTimeout);
          if (process.env.NODE_ENV !== 'production') {
            console.info('[JarvisLiveEngine] WebSocket connection established. Sending BidiGenerateContentSetup message...');
          }
          this.sendWebSocketSetup(sessionId, liveModelName);
        };

        ws.onmessage = async (event) => {
          if (this.currentSessionId !== sessionId) return;
          if (setupTimeout) clearTimeout(setupTimeout);
          await this.handleWebSocketMessage(event.data, sessionId);
        };

        ws.onerror = (e) => {
          if (this.currentSessionId !== sessionId) return;
          if (setupTimeout) clearTimeout(setupTimeout);
          console.warn('[JarvisLiveEngine] WebSocket notice. Engaging continuous speech pipeline:', e);
          this.engageContinuousPipeline(sessionId);
        };

        ws.onclose = (e) => {
          if (this.currentSessionId !== sessionId) return;
          if (setupTimeout) clearTimeout(setupTimeout);
          this.isWebSocketActive = false;
          if (this.phase !== 'EXITING_LIVE' && this.phase !== 'IDLE') {
            this.engageContinuousPipeline(sessionId);
          }
        };

        this.initContinuousSpeechRecognition(sessionId);
        return true;
      } catch (connErr: any) {
        console.warn('[JarvisLiveEngine] WebSocket initiation notice:', connErr);
        this.engageContinuousPipeline(sessionId);
        return true;
      }
    } else {
      // Server-backed intelligent conversational live pipeline
      this.engageContinuousPipeline(sessionId);
      return true;
    }
  }

  // Engage continuous assistant pipeline with state transition
  private engageContinuousPipeline(sessionId: string): void {
    if (this.currentSessionId !== sessionId) return;
    this.transitionTo('LIVE_READY', 'Continuous assistant pipeline active');
    setTimeout(() => {
      if (this.currentSessionId === sessionId) {
        this.currentTurn = 'user';
        this.transitionTo('LIVE_LISTENING', 'Live listening active');
      }
    }, 150);
    this.initContinuousSpeechRecognition(sessionId);
  }

  // --- 2. SEND BidiGenerateContentSetup MESSAGE ---
  private sendWebSocketSetup(sessionId: string, modelName: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const setupMessage = {
      setup: {
        model: `models/${modelName.replace(/^models\//, '')}`,
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Puck"
              }
            }
          }
        },
        systemInstruction: {
          parts: [{ text: LIVE_SYSTEM_INSTRUCTION }]
        },
        tools: [
          {
            functionDeclarations: LIVE_TOOL_DECLARATIONS
          }
        ]
      }
    };

    try {
      this.ws.send(JSON.stringify(setupMessage));
      if (process.env.NODE_ENV !== 'production') {
        console.info('[JarvisLiveEngine] Setup message sent successfully:', setupMessage);
      }
    } catch (err) {
      console.error('[JarvisLiveEngine] Failed to send setup message:', err);
    }
  }

  // --- 3. INCOMING SERVER MESSAGES (BidiGenerateContentServerMessage) ---
  private async handleWebSocketMessage(rawData: any, sessionId: string): Promise<void> {
    if (this.currentSessionId !== sessionId) return;

    let msg: any = null;
    try {
      if (typeof rawData === 'string') {
        msg = JSON.parse(rawData);
      } else if (rawData instanceof Blob) {
        const text = await rawData.text();
        msg = JSON.parse(text);
      }
    } catch (e) {
      console.warn('[JarvisLiveEngine] Malformed WebSocket message payload:', e);
      return;
    }

    if (!msg) return;

    // 1. Setup Complete
    if (msg.setupComplete) {
      this.lastServerEventType = 'setupComplete';
      this.isWebSocketActive = true;
      this.transitionTo('LIVE_READY', 'Live session configured');
      setTimeout(() => {
        if (this.currentSessionId === sessionId) {
          this.currentTurn = 'user';
          this.transitionTo('LIVE_LISTENING', 'Live WebSocket listening');
        }
      }, 100);
      return;
    }

    // 2. Server Content (Audio parts, Transcripts, Turn Complete, Interruption)
    if (msg.serverContent) {
      const { modelTurn, turnComplete, interrupted, inputTranscription, outputTranscription } = msg.serverContent;

      if (interrupted) {
        this.lastServerEventType = 'interrupted';
        this.handleBargeIn(sessionId, 'server_interruption_event');
        return;
      }

      // Live user transcription from model
      if (inputTranscription?.text) {
        this.lastUserQuery = inputTranscription.text;
        this.interimTranscript = inputTranscription.text;
        this.notifyTelemetry();
      }

      // Live model output transcription
      if (outputTranscription?.text) {
        this.lastModelResponse = (this.lastModelResponse || '') + outputTranscription.text;
        this.notifyTelemetry();
      }

      // Audio and Text parts
      if (modelTurn && Array.isArray(modelTurn.parts)) {
        for (const part of modelTurn.parts) {
          // Audio Output Part: 24kHz PCM Little-Endian
          if (part.inlineData && part.inlineData.data) {
            this.lastServerEventType = 'audio_chunk';
            jarvisLiveAudioPipeline.enqueueAudioChunk(part.inlineData.data);
          }

          // Text Part
          if (part.text) {
            this.lastServerEventType = 'model_text';
            this.lastModelResponse = (this.lastModelResponse || '') + part.text;
            this.accumulatedTranscript += part.text;
            this.notifyTelemetry();
          }
        }
      }

      if (turnComplete) {
        this.lastServerEventType = 'turnComplete';
        this.currentTurn = 'user';
        this.interimTranscript = '';
        this.notifyTelemetry();
      }
    }

    // 3. Tool Calls from Gemini (Function Calling)
    if (msg.toolCall && Array.isArray(msg.toolCall.functionCalls)) {
      this.lastServerEventType = 'toolCall';
      this.transitionTo('LIVE_PROCESSING', 'Executing tool call');
      await this.handleToolCalls(msg.toolCall.functionCalls, sessionId);
    }
  }

  // --- 4. TOOL CALL EXECUTION & BidiGenerateContentToolResponse ---
  private async handleToolCalls(functionCalls: any[], sessionId: string): Promise<void> {
    const responses: any[] = [];

    for (const call of functionCalls) {
      const { name, args, id } = call;
      this.activeTool = name;
      this.notifyTelemetry();

      let result: any = { status: 'success' };

      try {
        if (
          name === 'search_frequency' ||
          name === 'find_playlist' ||
          name === 'play_playlist' ||
          name === 'pause_playback' ||
          name === 'resume_playback' ||
          name === 'skip_next' ||
          name === 'skip_previous' ||
          name === 'get_current_playback'
        ) {
          const res = await executeMusicTool(name, args || {});
          result = { success: res.success, message: res.message, data: res.data || null };
        } else if (name === 'create_task_draft') {
          const title = args?.title || 'New Live Task';
          const tasks = JSON.parse(localStorage.getItem('focus-tasks') || '[]');
          const newTask = {
            id: `task-${Date.now()}`,
            title,
            priority: args?.priority || 'high',
            done: false,
            created: Date.now()
          };
          localStorage.setItem('focus-tasks', JSON.stringify([newTask, ...tasks]));
          window.dispatchEvent(new CustomEvent('task-created', { detail: newTask }));
          result = { success: true, message: `Task "${title}" created.` };
        } else {
          result = { success: true, message: `Executed ${name} successfully.` };
        }
      } catch (err: any) {
        result = { success: false, error: err?.message || 'Tool execution error' };
      }

      responses.push({
        name,
        id: id || `call-${Date.now()}`,
        response: { result }
      });
    }

    this.activeTool = null;

    // Send toolResponse back to Gemini Live WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentSessionId === sessionId) {
      const toolResponseMessage = {
        toolResponse: {
          functionResponses: responses
        }
      };
      this.ws.send(JSON.stringify(toolResponseMessage));
    }
  }

  // --- 5. CONTINUOUS SPEECH RECOGNITION PIPELINE ---
  private initContinuousSpeechRecognition(sessionId: string): void {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (this.speechRecognition) {
      try { this.speechRecognition.abort(); } catch (e) {}
      this.speechRecognition = null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        if (this.currentSessionId !== sessionId || this.isMuted) return;

        // Echo Suppression: Ignore incoming audio if TTS is currently speaking or in reverberation drain window (850ms)
        const isBrowserSpeaking = typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking;
        const isDrainPeriod = Date.now() - this.lastSpeechTimestamp < 850;

        if (this.phase === 'LIVE_SPEAKING' || isBrowserSpeaking || isDrainPeriod) {
          return;
        }

        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            final += item[0].transcript + ' ';
          } else {
            interim += item[0].transcript;
          }
        }

        const combined = (final + interim).trim();
        if (!combined) return;

        // Filter out self-speech echo matching last spoken model response
        const cleanCombined = combined.toLowerCase();
        if (this.lastSpeechText && cleanCombined.length > 5 && (
          this.lastSpeechText.includes(cleanCombined) ||
          cleanCombined.includes(this.lastSpeechText.slice(0, 30))
        )) {
          return;
        }

        this.speechBuffer = combined;
        this.interimTranscript = combined;
        this.notifyTelemetry();

        // If WebSocket is open, we also send text chunks if desired
        if (this.ws && this.ws.readyState === WebSocket.OPEN && final.trim()) {
          try {
            this.ws.send(JSON.stringify({
              realtimeInput: { text: final.trim() }
            }));
          } catch (e) {}
        }

        if (this.silenceTimer) clearTimeout(this.silenceTimer);

        // Turn detection with natural 800ms silence window
        if (combined.length > 1 && (this.phase === 'LIVE_LISTENING' || this.phase === 'LIVE_READY' || this.phase === 'LIVE_INTERRUPTED')) {
          this.silenceTimer = setTimeout(() => {
            if (this.currentSessionId === sessionId && this.speechBuffer.trim()) {
              const utterance = this.speechBuffer.trim();
              this.handleUserVoiceDirective(utterance, sessionId);
            }
          }, 800);
        }
      };

      recognition.onend = () => {
        if (this.currentSessionId === sessionId && this.phase !== 'EXITING_LIVE' && this.phase !== 'IDLE' && this.phase !== 'LIVE_SPEAKING') {
          try { recognition.start(); } catch (e) {}
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn('[JarvisLiveEngine] Speech recognition notice:', e.error);
        }
      };

      try {
        recognition.start();
      } catch (e) {}
      this.speechRecognition = recognition;
    } catch (err) {
      console.warn('[JarvisLiveEngine] Speech recognition initialization notice:', err);
    }
  }

  // Handle Turn: Local Command Fast-Path + Conversational Gemini Reasoning
  private async handleUserVoiceDirective(utterance: string, sessionId: string): Promise<void> {
    if (this.currentSessionId !== sessionId) return;
    this.speechBuffer = '';
    this.interimTranscript = '';
    this.lastUserQuery = utterance;
    
    this.accumulatedTranscript += (this.accumulatedTranscript ? '\n' : '') + `You: ${utterance}`;
    this.transitionTo('LIVE_PROCESSING', 'Executing cognition');
    this.notifyTelemetry();

    // 1. FAST-PATH: Check deterministic local commands (music, volume, timers, navigation, tasks)
    try {
      const isLocalHandled = await executeLocalCommand(utterance);
      if (isLocalHandled) {
        if (this.currentSessionId === sessionId) {
          this.currentTurn = 'user';
          this.transitionTo('LIVE_LISTENING', 'Local command finished');
        }
        return;
      }
    } catch (cmdErr) {
      console.warn('[JarvisLiveEngine] Local command checker note:', cmdErr);
    }

    // 2. CONVERSATIONAL PATH: Query Gemini with multi-turn context
    try {
      const userKey = (typeof window !== 'undefined' ? (localStorage.getItem('gemini-api-key') || '') : '').trim();
      
      const historyPayload = [
        ...this.conversationHistory.slice(-6),
        { role: 'user', text: utterance }
      ];

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: utterance,
          messages: historyPayload,
          apiKey: userKey,
          model: this.selectedModelId || 'gemini-2.5-flash',
          systemInstruction: LIVE_SYSTEM_INSTRUCTION
        })
      });

      const data = await res.json();
      if (this.currentSessionId !== sessionId) return;

      let reply = '';
      if (!res.ok || data.error) {
        if (data.errorType === 'AUTH_FAILED' || data.error?.toLowerCase().includes('key') || !userKey) {
          reply = "I need your Gemini API Key to answer questions. Please click Set Key on the Live pill, sir.";
          this.lastError = 'API Key Required';
        } else if (data.errorType === 'QUOTA_EXHAUSTED') {
          reply = "Daily rate limit reached for this model. Please select Gemini 2.5 Flash in Live Models.";
          this.lastError = 'Quota Limit Reached';
        } else {
          reply = data.error || "I was unable to retrieve a response, sir.";
          this.lastError = data.error;
        }
      } else {
        reply = cleanJarvisOutput(data.reply || data.text || "Standing by, Chief.");
        this.lastError = null;
      }

      this.lastModelResponse = reply;
      this.accumulatedTranscript += `\nJarvis: ${reply}`;
      this.conversationHistory.push({ role: 'user', text: utterance });
      this.conversationHistory.push({ role: 'model', text: reply });
      if (this.conversationHistory.length > 12) {
        this.conversationHistory = this.conversationHistory.slice(-12);
      }
      this.notifyTelemetry();

      this.speakAudioResponse(reply, sessionId);
    } catch (err: any) {
      console.error('[JarvisLiveEngine] Turn execution error:', err);
      if (this.currentSessionId === sessionId) {
        const errorReply = "Network connection interrupted, sir. Standing by.";
        this.lastModelResponse = errorReply;
        this.accumulatedTranscript += `\nJarvis: ${errorReply}`;
        this.notifyTelemetry();
        this.speakAudioResponse(errorReply, sessionId);
      }
    }
  }

  private speakAudioResponse(text: string, sessionId: string): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.unduckAudio();
      this.transitionTo('LIVE_LISTENING', 'Speech complete');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      this.lastSpeechText = text.toLowerCase();
      this.lastSpeechTimestamp = Date.now();
      this.duckAudio();

      if (this.speechRecognition) {
        try { this.speechRecognition.abort(); } catch(e){}
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.12;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((v) =>
        v.lang.startsWith('en') && (
          v.name.includes('UK English Male') ||
          v.name.includes('Daniel') ||
          v.name.includes('George') ||
          v.name.includes('Natural') ||
          v.name.includes('Google UK English')
        )
      ) || voices.find(v => v.lang.startsWith('en'));

      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => {
        if (this.currentSessionId !== sessionId) return;
        this.currentTurn = 'model';
        this.transitionTo('LIVE_SPEAKING', 'Jarvis speaking');
      };

      utterance.onend = () => {
        if (this.currentSessionId !== sessionId) return;
        this.lastSpeechTimestamp = Date.now();
        this.unduckAudio();
        this.currentTurn = 'user';
        this.transitionTo('LIVE_LISTENING', 'Jarvis finished speaking');

        setTimeout(() => {
          if (this.currentSessionId === sessionId && this.phase === 'LIVE_LISTENING') {
            this.initContinuousSpeechRecognition(sessionId);
          }
        }, 700);
      };

      utterance.onerror = (e) => {
        if (this.currentSessionId !== sessionId) return;
        this.lastSpeechTimestamp = Date.now();
        this.unduckAudio();
        console.warn('[JarvisLiveEngine] Speech synthesis note:', e);
        this.currentTurn = 'user';
        this.transitionTo('LIVE_LISTENING', 'Speech fallback');

        setTimeout(() => {
          if (this.currentSessionId === sessionId) {
            this.initContinuousSpeechRecognition(sessionId);
          }
        }, 700);
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      this.unduckAudio();
      this.transitionTo('LIVE_LISTENING', 'Speech exception');
    }
  }

  // --- 6. SEND AUDIO TO GEMINI LIVE WEBSOCKET (16kHz PCM) ---
  private handleLocalAudioChunk(base64Pcm: string, sessionId: string): void {
    if (this.currentSessionId !== sessionId) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (this.isMuted) return;

    // Echo Suppression: Ignore incoming audio if TTS is currently speaking or in reverberation drain window (1500ms)
    // This prevents Jarvis from hearing itself and going into an infinite loop.
    const isBrowserSpeaking = typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking;
    const isDrainPeriod = Date.now() - this.lastSpeechTimestamp < 1500;
    
    if (this.phase === 'LIVE_SPEAKING' || isBrowserSpeaking || isDrainPeriod) {
      return;
    }

    // Conforms to Gemini Live API realtimeInput audio specification
    const chunkMessage = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Pcm
          }
        ]
      }
    };

    try {
      this.ws.send(JSON.stringify(chunkMessage));
    } catch (err) {}
  }

  // --- 7. BARGE-IN & INTERRUPTION HANDLER ---
  public handleBargeIn(sessionId?: string, source: string = 'manual'): void {
    const activeSession = sessionId || this.currentSessionId;
    if (this.currentSessionId !== activeSession) return;

    this.bargeInCount++;
    this.currentTurn = 'user';

    // Stop and cancel speech immediately
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    jarvisLiveAudioPipeline.stopPlaybackImmediately();

    this.transitionTo('LIVE_INTERRUPTED', `Interrupted via ${source}`);

    // Return quickly to listening state
    setTimeout(() => {
      if (this.currentSessionId === activeSession && this.phase === 'LIVE_INTERRUPTED') {
        this.transitionTo('LIVE_LISTENING', 'Resumed listening post-interruption');
      }
    }, 150);
  }

  // --- 8. CONTROLS: MUTE, STOP SPEAKING, EXIT ---
  public toggleMute(): void {
    this.isMuted = !this.isMuted;
    jarvisLiveAudioPipeline.setMuted(this.isMuted);
    this.notifyTelemetry();
  }

  public stopSpeaking(): void {
    this.handleBargeIn(this.currentSessionId, 'user_stop_speaking_button');
  }

  public exitLiveSession(): void {
    this.transitionTo('EXITING_LIVE', 'User exited Live mode');
    this.cleanupSession(true);
    this.transitionTo('IDLE', 'Live mode off');
  }

  private cleanupSession(resetCounts: boolean = true): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.speechRecognition) {
      try {
        this.speechRecognition.onend = null;
        this.speechRecognition.abort();
      } catch (e) {}
      this.speechRecognition = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }

    jarvisLiveAudioPipeline.releaseAll();

    this.isWebSocketActive = false;
    this.speechBuffer = '';
    this.activeTool = null;
    this.currentTurn = 'idle';
    this.userSpeechLevel = 0;

    if (resetCounts) {
      this.reconnectCount = 0;
      this.bargeInCount = 0;
      this.resumptionHandle = null;
    }
  }

  public getPhase(): LivePhase {
    return this.phase;
  }
}

export const jarvisLiveEngine = JarvisLiveEngine.getInstance();
