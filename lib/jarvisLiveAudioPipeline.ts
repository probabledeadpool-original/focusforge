"use client";

export interface AudioPipelineConfig {
  inputSampleRate: number;    // 16000 Hz for Gemini Live
  outputSampleRate: number;   // 24000 Hz for Gemini Live Audio
  chunkDurationMs: number;    // ~100ms per audio chunk
}

export const LIVE_AUDIO_CONFIG: AudioPipelineConfig = {
  inputSampleRate: 16000,
  outputSampleRate: 24000,
  chunkDurationMs: 100
};

// Convert Float32Array to 16-bit linear PCM Little-Endian ArrayBuffer
export function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const output = new DataView(new ArrayBuffer(input.length * 2));
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return output.buffer;
}

// Resample audio buffer to target sample rate
export function downsampleBuffer(
  buffer: Float32Array,
  inputRate: number,
  outputRate: number
): Float32Array {
  if (inputRate === outputRate) {
    return buffer;
  }
  if (outputRate > inputRate) {
    return buffer; // no upsampling required
  }
  const ratio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

// Base64 helper for ArrayBuffer
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Decode base64 to 16-bit PCM Float32Array for Web Audio playback
export function base64ToFloat32Array(base64: string): Float32Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768.0;
  }
  return float32;
}

export class JarvisLiveAudioPipeline {
  private mediaStream: MediaStream | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSourceNode: MediaStreamAudioSourceNode | null = null;
  private scriptProcessorNode: ScriptProcessorNode | null = null;

  private onAudioChunkCallback: ((pcmBase64: string) => void) | null = null;
  private onInputLevelCallback: ((level: number) => void) | null = null;
  private onOutputLevelCallback: ((level: number) => void) | null = null;
  private onPlaybackStateChange: ((isPlaying: boolean) => void) | null = null;

  // Audio Playback Queue
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private nextPlayTime: number = 0;
  private isMuted: boolean = false;
  private isRecording: boolean = false;
  private inputChunkCount: number = 0;
  private outputChunkCount: number = 0;

  private currentInputLevel: number = 0;
  private currentOutputLevel: number = 0;

  public getInputLevel(): number {
    return this.currentInputLevel;
  }

  public getOutputLevel(): number {
    return this.currentOutputLevel;
  }

  public async startMicrophoneCapture(
    onChunk: (pcmBase64: string) => void,
    onLevel?: (level: number) => void
  ): Promise<MediaStream> {
    this.stopMicrophoneCapture();
    this.onAudioChunkCallback = onChunk;
    this.onInputLevelCallback = onLevel || null;
    this.inputChunkCount = 0;
    this.currentInputLevel = 0;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    this.mediaStream = stream;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const inputCtx = new AudioContextClass();
    this.inputAudioContext = inputCtx;

    if (inputCtx.state === 'suspended') {
      await inputCtx.resume();
    }

    const source = inputCtx.createMediaStreamSource(stream);
    this.inputSourceNode = source;

    // Use 4096 buffer size for ~90ms latency at 44.1/48kHz
    const bufferSize = 4096;
    const processor = inputCtx.createScriptProcessor(bufferSize, 1, 1);
    this.scriptProcessorNode = processor;

    processor.onaudioprocess = (e) => {
      if (!this.isRecording || this.isMuted) {
        this.currentInputLevel = 0;
        return;
      }

      const inputData = e.inputBuffer.getChannelData(0);

      // Compute RMS level for Sound-reactive VoiceBeam UI
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      const normalizedLevel = Math.min(1.0, Math.max(0, rms * 5.5));
      this.currentInputLevel = normalizedLevel;

      if (this.onInputLevelCallback) {
        this.onInputLevelCallback(normalizedLevel);
      }

      // Resample from browser hardware rate to Gemini 16kHz
      const downsampled = downsampleBuffer(
        inputData,
        inputCtx.sampleRate,
        LIVE_AUDIO_CONFIG.inputSampleRate
      );

      // Convert to 16-bit PCM Little-Endian
      const pcm16 = floatTo16BitPCM(downsampled);
      const base64 = arrayBufferToBase64(pcm16);

      this.inputChunkCount++;

      if (this.onAudioChunkCallback) {
        this.onAudioChunkCallback(base64);
      }
    };

    source.connect(processor);
    processor.connect(inputCtx.destination);
    this.isRecording = true;

    // Safe dev logging (metadata only)
    if (process.env.NODE_ENV !== 'production') {
      console.info('[JarvisLiveAudioPipeline] Microphone pipeline active:', {
        inputSampleRate: inputCtx.sampleRate,
        targetRate: LIVE_AUDIO_CONFIG.inputSampleRate,
        bufferSize,
        channelCount: 1,
        format: 'PCM 16-bit Little-Endian'
      });
    }

    return stream;
  }

  public getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  public stopMicrophoneCapture(): void {
    this.isRecording = false;
    if (this.scriptProcessorNode) {
      try {
        this.scriptProcessorNode.disconnect();
      } catch (e) {}
      this.scriptProcessorNode = null;
    }
    if (this.inputSourceNode) {
      try {
        this.inputSourceNode.disconnect();
      } catch (e) {}
      this.inputSourceNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.inputAudioContext) {
      try {
        this.inputAudioContext.close();
      } catch (e) {}
      this.inputAudioContext = null;
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // --- AUDIO OUTPUT & PLAYBACK QUEUE ---
  public setOutputLevelCallback(cb: (level: number) => void): void {
    this.onOutputLevelCallback = cb;
  }

  public setPlaybackStateCallback(cb: (isPlaying: boolean) => void): void {
    this.onPlaybackStateChange = cb;
  }

  private ensureOutputAudioContext(): AudioContext {
    if (!this.outputAudioContext || this.outputAudioContext.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.outputAudioContext = new AudioContextClass({
        sampleRate: LIVE_AUDIO_CONFIG.outputSampleRate
      });
      this.nextPlayTime = 0;
    }
    if (this.outputAudioContext.state === 'suspended') {
      this.outputAudioContext.resume().catch(() => {});
    }
    return this.outputAudioContext;
  }

  public enqueueAudioChunk(pcmBase64: string): void {
    if (!pcmBase64) return;
    try {
      const ctx = this.ensureOutputAudioContext();
      const float32Data = base64ToFloat32Array(pcmBase64);
      if (float32Data.length === 0) return;

      const audioBuffer = ctx.createBuffer(
        1,
        float32Data.length,
        LIVE_AUDIO_CONFIG.outputSampleRate
      );
      audioBuffer.getChannelData(0).set(float32Data);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      // Connect to destination
      source.connect(ctx.destination);

      // Schedule gapless playback
      const currentTime = ctx.currentTime;
      const startTime = Math.max(currentTime, this.nextPlayTime);
      source.start(startTime);

      this.nextPlayTime = startTime + audioBuffer.duration;
      this.activeSources.add(source);
      this.outputChunkCount++;

      if (this.onPlaybackStateChange) {
        this.onPlaybackStateChange(true);
      }

      // Compute RMS for speaking visualization
      let sum = 0;
      for (let i = 0; i < Math.min(500, float32Data.length); i++) {
        sum += float32Data[i] * float32Data[i];
      }
      const level = Math.min(1.0, Math.sqrt(sum / Math.min(500, float32Data.length)) * 4.0);
      if (this.onOutputLevelCallback) {
        this.onOutputLevelCallback(level);
      }

      source.onended = () => {
        this.activeSources.delete(source);
        if (this.activeSources.size === 0) {
          if (this.onPlaybackStateChange) {
            this.onPlaybackStateChange(false);
          }
          if (this.onOutputLevelCallback) {
            this.onOutputLevelCallback(0);
          }
        }
      };
    } catch (err) {
      console.warn('[JarvisLiveAudioPipeline] Error enqueuing audio playback chunk:', err);
    }
  }

  // Barge-in / Interruption: immediately stop and flush playback queue
  public stopPlaybackImmediately(): void {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {}
    });
    this.activeSources.clear();
    if (this.outputAudioContext) {
      this.nextPlayTime = this.outputAudioContext.currentTime;
    }
    if (this.onPlaybackStateChange) {
      this.onPlaybackStateChange(false);
    }
    if (this.onOutputLevelCallback) {
      this.onOutputLevelCallback(0);
    }
  }

  public releaseAll(): void {
    this.stopMicrophoneCapture();
    this.stopPlaybackImmediately();
    if (this.outputAudioContext) {
      try {
        this.outputAudioContext.close();
      } catch (e) {}
      this.outputAudioContext = null;
    }
  }

  public getTelemetry(): {
    inputSampleRate: number;
    outputSampleRate: number;
    inputChunkCount: number;
    outputChunkCount: number;
    isRecording: boolean;
    isMuted: boolean;
    activePlaybackNodes: number;
  } {
    return {
      inputSampleRate: this.inputAudioContext?.sampleRate || LIVE_AUDIO_CONFIG.inputSampleRate,
      outputSampleRate: this.outputAudioContext?.sampleRate || LIVE_AUDIO_CONFIG.outputSampleRate,
      inputChunkCount: this.inputChunkCount,
      outputChunkCount: this.outputChunkCount,
      isRecording: this.isRecording,
      isMuted: this.isMuted,
      activePlaybackNodes: this.activeSources.size
    };
  }
}

export const jarvisLiveAudioPipeline = new JarvisLiveAudioPipeline();
