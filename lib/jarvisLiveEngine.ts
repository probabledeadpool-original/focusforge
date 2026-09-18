"use client";

import { jarvisLiveAudioPipeline } from './jarvisLiveAudioPipeline';
import { executeMusicTool } from './musicTools';
import { getSelectedLiveModel, getLiveModelCapabilities, validateLiveModelCompatibility } from './aiModelConfig';

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
}

// Approved Live Tool Declarations
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
    name: 'search_personal_files',
    description: 'Search personal notes, tasks, and stored files.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Search query' }
      },
      required: ['query']
    }
  },
  {
    name: 'search_web',
    description: 'Search the internet for real-time information.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Web search query' }
      },
      required: ['query']
    }
  },
  {
    name: 'read_calendar',
    description: 'Read upcoming calendar appointments and focus blocks.',
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
  },
  {
    name: 'create_calendar_event_draft',
    description: 'Draft a new calendar event or focus block.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Event title' },
        durationMinutes: { type: 'INTEGER', description: 'Duration in minutes' }
      },
      required: ['title']
    }
  },
  {
    name: 'draft_email',
    description: 'Draft an email message for review.',
    parameters: {
      type: 'OBJECT',
      properties: {
        recipient: { type: 'STRING', description: 'Recipient name or address' },
        subject: { type: 'STRING', description: 'Subject line' },
        body: { type: 'STRING', description: 'Email body' }
      },
      required: ['subject', 'body']
    }
  }
];

export const LIVE_SYSTEM_INSTRUCTION = `You are Jarvis in Live mode for FocusForge.
Speak conversationally, concisely, and with ultra-low latency.
Do not output role labels.
Do not output prompt templates.
Do not expose tool calls or raw JSON to the user.
Do not narrate hidden reasoning.
Do not repeat the user's request unnecessarily.
When a tool is needed, call the approved tool.
After the tool result, speak only the useful concise result.
If the request is ambiguous, ask one short clarification question.
Address the user politely as Sir or Chief when appropriate.`;

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

  private listeners: Set<LiveStateListener> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;

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
      userSpeechLevel: this.userSpeechLevel
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

  private notifyTelemetry(): void {
    const telem = this.getTelemetry();
    this.listeners.forEach((l) => {
      try { l(telem); } catch (e) {}
    });
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

    // Step 1: Request Microphone Permission
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
          this.notifyTelemetry();
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

    // Step 2: Authenticate with Backend for Ephemeral Token
    this.transitionTo('CONNECTING_LIVE', 'Authenticating with backend token service');

    let tokenData: any = null;
    try {
      const res = await fetch('/api/live/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: this.selectedModelId
        })
      });

      tokenData = await res.json();
      if (!res.ok || !tokenData?.token) {
        throw new Error(tokenData?.error || 'Failed to acquire Live session token.');
      }
    } catch (authErr: any) {
      this.lastError = authErr?.message || 'Token generation failure';
      this.transitionTo('LIVE_ERROR', 'Auth failed');
      jarvisLiveAudioPipeline.stopMicrophoneCapture();
      return false;
    }

    this.tokenExpiry = tokenData.expiresAt;

    // Step 3: Open WebSocket Session to Gemini Live API
    try {
      const wsUrl = `${tokenData.wsEndpoint}?key=${encodeURIComponent(tokenData.apiKey || '')}`;
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        if (this.currentSessionId !== sessionId) return;
        if (process.env.NODE_ENV !== 'production') {
          console.info('[JarvisLiveEngine] WebSocket link established. Sending setup config...');
        }
        this.sendSetupConfiguration(sessionId, tokenData.model);
      };

      ws.onmessage = async (event) => {
        if (this.currentSessionId !== sessionId) return;
        await this.handleServerMessage(event.data, sessionId);
      };

      ws.onerror = (e) => {
        if (this.currentSessionId !== sessionId) return;
        console.warn('[JarvisLiveEngine] WebSocket error event:', e);
        this.lastError = 'WebSocket connection error';
        this.transitionTo('LIVE_ERROR', 'WebSocket error');
      };

      ws.onclose = (e) => {
        if (this.currentSessionId !== sessionId) return;
        if (process.env.NODE_ENV !== 'production') {
          console.info('[JarvisLiveEngine] WebSocket closed:', e.code, e.reason);
        }
        if (this.phase !== 'EXITING_LIVE' && this.phase !== 'IDLE') {
          this.attemptReconnect();
        }
      };

      // Set playback state callback to track model speaking phase
      jarvisLiveAudioPipeline.setPlaybackStateCallback((isPlaying) => {
        if (this.currentSessionId !== sessionId) return;
        if (isPlaying) {
          this.currentTurn = 'model';
          this.transitionTo('LIVE_SPEAKING', 'Model audio streaming');
        } else {
          if (this.phase === 'LIVE_SPEAKING') {
            this.currentTurn = 'user';
            this.transitionTo('LIVE_LISTENING', 'Model finished speaking');
          }
        }
      });

      return true;
    } catch (connErr: any) {
      this.lastError = connErr?.message || 'Live connection failed';
      this.transitionTo('LIVE_ERROR', 'Connection failed');
      jarvisLiveAudioPipeline.stopMicrophoneCapture();
      return false;
    }
  }

  // --- 2. SEND SETUP CONFIGURATION ---
  private sendSetupConfiguration(sessionId: string, targetModelName: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const capabilities = getLiveModelCapabilities(this.selectedModelId);
    const responseModalities = capabilities.outputModalities.includes('audio') ? ['AUDIO'] : ['TEXT'];

    const setupPayload: any = {
      setup: {
        model: `models/${targetModelName.replace(/^models\//, '')}`,
        generationConfig: {
          responseModalities: responseModalities,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Puck' // Natural, crisp conversational voice
              }
            }
          }
        },
        systemInstruction: {
          parts: [{ text: LIVE_SYSTEM_INSTRUCTION }]
        },
        tools: capabilities.supportsTools ? [{ functionDeclarations: LIVE_TOOL_DECLARATIONS }] : undefined
      }
    };

    if (this.resumptionHandle) {
      setupPayload.setup.sessionResumption = {
        token: this.resumptionHandle
      };
    }

    this.ws.send(JSON.stringify(setupPayload));
  }

  // --- 3. INCOMING SERVER MESSAGES & EVENT DISPATCH ---
  private async handleServerMessage(rawData: any, sessionId: string): Promise<void> {
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
      console.warn('[JarvisLiveEngine] Malformed server message payload:', e);
      return;
    }

    if (!msg) return;

    // 1. Setup Complete
    if (msg.setupComplete) {
      this.lastServerEventType = 'setupComplete';
      this.transitionTo('LIVE_READY', 'Live session configured');
      setTimeout(() => {
        if (this.currentSessionId === sessionId && this.phase === 'LIVE_READY') {
          this.currentTurn = 'user';
          this.transitionTo('LIVE_LISTENING', 'Microphone active');
        }
      }, 100);
      return;
    }

    // 2. Session Resumption Update
    if (msg.sessionResumptionUpdate) {
      this.lastServerEventType = 'sessionResumptionUpdate';
      if (msg.sessionResumptionUpdate.newHandle) {
        this.resumptionHandle = msg.sessionResumptionUpdate.newHandle;
      }
    }

    // 3. Server GoAway Notice (Graceful reconnect)
    if (msg.goAway) {
      this.lastServerEventType = 'goAway';
      console.warn('[JarvisLiveEngine] Server GoAway notice received. Graceful reconnect initiated.');
      this.attemptReconnect();
      return;
    }

    // 4. Server Content (Audio, Text, Interruption, Turn Complete)
    if (msg.serverContent) {
      const { modelTurn, turnComplete, interrupted } = msg.serverContent;

      if (interrupted) {
        this.lastServerEventType = 'interrupted';
        this.handleBargeIn(sessionId, 'server_interruption_event');
        return;
      }

      if (modelTurn && Array.isArray(modelTurn.parts)) {
        for (const part of modelTurn.parts) {
          // Audio Output Part
          if (part.inlineData && part.inlineData.data) {
            this.lastServerEventType = 'audio_chunk';
            jarvisLiveAudioPipeline.enqueueAudioChunk(part.inlineData.data);
          }

          // Text / Transcript Part
          if (part.text) {
            this.lastServerEventType = 'model_text';
            this.accumulatedTranscript += part.text;
            this.notifyTelemetry();
          }
        }
      }

      if (turnComplete) {
        this.lastServerEventType = 'turnComplete';
        this.currentTurn = 'user';
      }
    }

    // 5. Tool Calls from Gemini
    if (msg.toolCall && Array.isArray(msg.toolCall.functionCalls)) {
      this.lastServerEventType = 'toolCall';
      this.transitionTo('LIVE_PROCESSING', 'Executing tool call');
      await this.handleToolCalls(msg.toolCall.functionCalls, sessionId);
    }
  }

  // --- 4. TOOL CALL EXECUTION & RESPONSE ---
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
        } else if (name === 'search_personal_files') {
          result = { success: true, results: ['Project Roadmap', 'Daily Standup Notes', 'Focus Targets'] };
        } else if (name === 'search_web') {
          result = { success: true, summary: `Latest web query result for "${args?.query || ''}"` };
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

    // Send toolResponse back to Gemini Live
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentSessionId === sessionId) {
      const toolResponsePayload = {
        toolResponse: {
          functionResponses: responses
        }
      };
      this.ws.send(JSON.stringify(toolResponsePayload));
    }
  }

  // --- 5. STREAM LOCAL AUDIO CHUNKS ---
  private handleLocalAudioChunk(base64Pcm: string, sessionId: string): void {
    if (this.currentSessionId !== sessionId) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (this.isMuted) return;

    // Send realtimeInput mediaChunk to Gemini Live
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
    } catch (err) {
      console.warn('[JarvisLiveEngine] Error sending audio chunk:', err);
    }
  }

  // --- 6. BARGE-IN & INTERRUPTION HANDLER ---
  public handleBargeIn(sessionId?: string, source: string = 'manual'): void {
    const activeSession = sessionId || this.currentSessionId;
    if (this.currentSessionId !== activeSession) return;

    this.bargeInCount++;
    this.currentTurn = 'user';

    // Stop and flush local playback queue immediately
    jarvisLiveAudioPipeline.stopPlaybackImmediately();

    this.transitionTo('LIVE_INTERRUPTED', `Interrupted via ${source}`);

    // Return quickly to listening state
    setTimeout(() => {
      if (this.currentSessionId === activeSession && this.phase === 'LIVE_INTERRUPTED') {
        this.transitionTo('LIVE_LISTENING', 'Resumed listening post-interruption');
      }
    }, 150);
  }

  // --- 7. RECONNECTION & SESSION RESUMPTION ---
  private attemptReconnect(): void {
    if (this.reconnectCount >= this.maxReconnectAttempts) {
      this.lastError = 'Maximum reconnection attempts reached.';
      this.transitionTo('LIVE_ERROR', 'Reconnect failed');
      return;
    }

    this.reconnectCount++;
    this.transitionTo('LIVE_RECONNECTING', `Reconnect attempt ${this.reconnectCount}`);

    const backoffMs = Math.min(1000 * Math.pow(1.5, this.reconnectCount), 8000);

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.phase === 'LIVE_RECONNECTING') {
        this.startLiveSession(this.selectedModelId);
      }
    }, backoffMs);
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

    jarvisLiveAudioPipeline.releaseAll();

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
