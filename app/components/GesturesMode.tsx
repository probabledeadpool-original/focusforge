"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, CameraOff, Mic, MicOff, Hand, Sparkles, 
  Bot, Play, Pause, X, ChevronRight, CheckCircle2, 
  Volume2, Eye, EyeOff, Radio, Maximize2, Minimize2,
  MousePointer, Zap, Target, RefreshCw
} from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';

interface GesturesModeProps {
  onClose: () => void;
}

export default function GesturesMode({ onClose }: GesturesModeProps) {
  const { setView, setIsRunning, isRunning, setTimeLeft } = useAppStore();
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorRef = useRef<{ x: number; y: number }>({ x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500, y: typeof window !== 'undefined' ? window.innerHeight / 2 : 400 });
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [detectedGesture, setDetectedGesture] = useState<string>('INITIALIZING VISION...');
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500, y: typeof window !== 'undefined' ? window.innerHeight / 2 : 400 });
  const [isPinching, setIsPinching] = useState(false);
  const [pinchDistance, setPinchDistance] = useState<number>(100);
  const [lastActionText, setLastActionText] = useState<string>('');
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [isHUDMinimized, setIsHUDMinimized] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [trackingConfidence, setTrackingConfidence] = useState<number>(0);

  const recognitionRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const handLandmarkerRef = useRef<any>(null);
  const lastVideoTimeRef = useRef<number>(-1);

  // Synthesize acoustic click sound on pinch
  const playLaserSound = useCallback((frequency = 1200) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  }, []);

  // Dispatch virtual click on element beneath cursor
  const triggerVirtualClick = useCallback((x: number, y: number) => {
    playLaserSound(1500);
    const elem = document.elementFromPoint(x, y);
    if (elem) {
      elem.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
      if (elem instanceof HTMLElement) {
        elem.focus();
      }
      const tagName = elem.tagName.toLowerCase();
      const textPreview = elem.textContent?.slice(0, 15).trim() || tagName;
      setLastActionText(`CLICKED // <${tagName}> "${textPreview}"`);
    }
  }, [playLaserSound]);

  // Process Voice Commands
  const handleVoiceCommand = useCallback((rawTranscript: string) => {
    const text = rawTranscript.toLowerCase().trim();
    setVoiceTranscript(text);

    if (text.includes('go to task') || text.includes('open task') || text.includes('show task')) {
      setView('tasks');
      setLastActionText('VOICE: OPEN TASKS');
    } else if (text.includes('go to timer') || text.includes('open timer') || text.includes('show timer')) {
      setView('timer');
      setLastActionText('VOICE: OPEN TIMERS');
    } else if (text.includes('start timer') || text.includes('start focus') || text.includes('start sprint')) {
      setTimeLeft(25 * 60);
      setIsRunning(true);
      setView('activeTimer');
      setLastActionText('VOICE: START 25M FOCUS');
    } else if (text.includes('pause timer') || text.includes('stop timer')) {
      setIsRunning(false);
      setLastActionText('VOICE: PAUSE TIMER');
    } else if (text.includes('resume timer') || text.includes('continue')) {
      setIsRunning(true);
      setLastActionText('VOICE: RESUME TIMER');
    } else if (text.includes('go to ledger') || text.includes('open ledger')) {
      setView('ledger');
      setLastActionText('VOICE: OPEN LEDGER');
    } else if (text.includes('open terminal') || text.includes('go to terminal') || text.includes('command line')) {
      setView('terminal');
      setLastActionText('VOICE: OPEN TERMINAL');
    } else if (text.includes('open market') || text.includes('go to market') || text.includes('trading')) {
      setView('hub');
      setLastActionText('VOICE: OPEN MARKETS');
    } else if (text.includes('open place') || text.includes('the place') || text.includes('play music')) {
      setView('place');
      setLastActionText('VOICE: OPEN THE PLACE');
    } else if (text.includes('go to analytics') || text.includes('open stats') || text.includes('aura')) {
      setView('stats');
      setLastActionText('VOICE: OPEN ANALYTICS');
    } else if (text.includes('go to profile') || text.includes('open profile')) {
      setView('profile');
      setLastActionText('VOICE: OPEN PROFILE');
    } else if (text.includes('go to home') || text.includes('return home')) {
      setView('home');
      setLastActionText('VOICE: RETURN HOME');
    } else if (text.startsWith('add task') || text.startsWith('create task')) {
      const taskTitle = text.replace(/^add task|^create task/i, '').trim();
      if (taskTitle) {
        const current = JSON.parse(localStorage.getItem('focus-tasks') || '[]');
        const newTask = {
          id: Math.random().toString(36).substr(2, 9),
          title: taskTitle.toUpperCase(),
          priority: 'high',
          estimatedMinutes: 30,
          subtasks: [],
          done: false,
          created: Date.now()
        };
        localStorage.setItem('focus-tasks', JSON.stringify([newTask, ...current]));
        window.dispatchEvent(new CustomEvent('task-created'));
        setLastActionText(`TASK CREATED: ${taskTitle}`);
      }
    }
  }, [setView, setIsRunning, setTimeLeft]);

  // Start / Stop Speech Recognition
  const toggleSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition is not supported in this browser. Use Chrome or Edge.");
      return;
    }

    if (isMicActive && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsMicActive(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        handleVoiceCommand(transcript);
      };

      recognition.onerror = (e: any) => {
        console.warn("Speech recognition warning:", e);
      };

      recognition.onstart = () => {
        setIsMicActive(true);
      };

      recognition.onend = () => {
        // Auto reconnect if user intended mic to stay active
        if (isMicActive) {
          try {
            recognition.start();
          } catch (e) {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsMicActive(true);
    } catch (err) {
      console.warn("Failed to activate microphone:", err);
    }
  }, [isMicActive, handleVoiceCommand]);

  // Initialize Speech on Mount
  useEffect(() => {
    toggleSpeechRecognition();
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // Initialize MediaPipe Vision & Camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isCancelled = false;

    const initMediaPipeAndCamera = async () => {
      try {
        // Initialize MediaPipe Tasks Vision Hand Landmarker
        const visionModule = await import('@mediapipe/tasks-vision');
        const { FilesetResolver, HandLandmarker } = visionModule;

        const wasmFileset = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm"
        );

        if (isCancelled) return;

        const handLandmarker = await HandLandmarker.createFromOptions(wasmFileset, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });

        if (isCancelled) return;
        handLandmarkerRef.current = handLandmarker;
      } catch (e) {
        console.warn("MediaPipe wasm loading fallback to optical centroid tracking:", e);
      }

      // Request Webcam stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' }
        });
        if (videoRef.current && !isCancelled) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsCameraActive(true);
            setCameraError(null);
          };
        }
      } catch (err: any) {
        console.warn("Camera access denied or unavailable", err);
        setCameraError("Camera access required for vision tracking");
        setIsCameraActive(false);
      }
    };

    initMediaPipeAndCamera();

    return () => {
      isCancelled = true;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // High Precision Real-Time Detection Loop
  useEffect(() => {
    let pinchCooldown = false;
    let gestureDebounce = 0;

    const HAND_CONNECTIONS = [
      [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8],       // Index
      [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
      [9, 13], [13, 14], [14, 15], [15, 16],// Ring
      [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
      [0, 17]                               // Palm base
    ];

    const processVisionFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(processVisionFrame);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrameRef.current = requestAnimationFrame(processVisionFrame);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(video, 0, 0, w, h);

      // ── OPTION A: MediaPipe Neural 21-Landmark Tracking ─────────────
      if (handLandmarkerRef.current && video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        const results = handLandmarkerRef.current.detectForVideo(video, performance.now());

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          setTrackingConfidence(95);

          // Draw Skeletal Mesh on Canvas
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 2.5;
          HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
            const start = landmarks[startIdx];
            const end = landmarks[endIdx];
            ctx.beginPath();
            ctx.moveTo(start.x * w, start.y * h);
            ctx.lineTo(end.x * w, end.y * h);
            ctx.stroke();
          });

          // Draw Joints
          landmarks.forEach((pt: any, idx: number) => {
            ctx.beginPath();
            ctx.arc(pt.x * w, pt.y * h, idx === 8 || idx === 4 ? 6 : 3, 0, 2 * Math.PI);
            ctx.fillStyle = idx === 8 ? '#f43f5e' : idx === 4 ? '#eab308' : '#34d399';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
          });

          // Coordinates of Index Tip (8) & Thumb Tip (4)
          const indexTip = landmarks[8];
          const thumbTip = landmarks[4];
          const middleTip = landmarks[12];
          const ringTip = landmarks[16];
          const pinkyTip = landmarks[20];
          const wrist = landmarks[0];

          // Normalized coordinates (Mirrored for natural user movement)
          const rawTargetX = (1 - indexTip.x) * window.innerWidth;
          const rawTargetY = indexTip.y * window.innerHeight;

          // Smooth Exponential LERP (alpha = 0.35)
          cursorRef.current.x += (rawTargetX - cursorRef.current.x) * 0.35;
          cursorRef.current.y += (rawTargetY - cursorRef.current.y) * 0.35;
          setCursorPos({ x: cursorRef.current.x, y: cursorRef.current.y });

          // Calculate Euclidean Pinch Distance (Index Tip <-> Thumb Tip)
          const dx = (thumbTip.x - indexTip.x) * w;
          const dy = (thumbTip.y - indexTip.y) * h;
          const dist = Math.sqrt(dx * dx + dy * dy);
          setPinchDistance(Math.round(dist));

          // Finger Extension Analysis
          const isIndexExtended = indexTip.y < landmarks[6].y;
          const isMiddleExtended = middleTip.y < landmarks[10].y;
          const isRingExtended = ringTip.y < landmarks[14].y;
          const isPinkyExtended = pinkyTip.y < landmarks[18].y;
          const isThumbUp = thumbTip.y < indexTip.y && !isIndexExtended && !isMiddleExtended;

          // 1. PINCH DETECTION (Click)
          if (dist < 26) {
            setDetectedGesture('PINCH [CLICK]');
            if (!pinchCooldown) {
              setIsPinching(true);
              triggerVirtualClick(cursorRef.current.x, cursorRef.current.y);
              pinchCooldown = true;
              setTimeout(() => {
                pinchCooldown = false;
                setIsPinching(false);
              }, 400);
            }
          } 
          // 2. PEACE / VICTORY SIGN (Index + Middle extended)
          else if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
            setDetectedGesture('PEACE // QUICK NEXT');
            if (Date.now() - gestureDebounce > 1500) {
              gestureDebounce = Date.now();
              playLaserSound(900);
              setLastActionText('GESTURE: VICTORY SIGN');
            }
          }
          // 3. THUMBS UP
          else if (isThumbUp) {
            setDetectedGesture('THUMBS UP // FOCUS');
            if (Date.now() - gestureDebounce > 2000) {
              gestureDebounce = Date.now();
              setTimeLeft(25 * 60);
              setIsRunning(true);
              setView('activeTimer');
              setLastActionText('GESTURE: START FOCUS');
            }
          }
          // 4. FIST (All curled)
          else if (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
            setDetectedGesture('FIST [HOLD]');
          }
          // 5. OPEN HAND / POINTER
          else {
            setDetectedGesture('LASER POINTER ACTIVE');
          }

          animationFrameRef.current = requestAnimationFrame(processVisionFrame);
          return;
        }
      }

      // ── OPTION B: High-Sensitivity Optical Foreground Motion Tracking ────────
      const frame = ctx.getImageData(0, 0, w, h);
      const data = frame.data;
      let skinPixels = 0;
      let skinCenterX = 0;
      let skinCenterY = 0;

      for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const pixelIdx = i / 4;
        const px = (pixelIdx % w);
        const py = Math.floor(pixelIdx / w);

        const isSkin = r > 80 && g > 35 && b > 20 && r > g && r > b && (r - Math.min(g, b)) > 10;
        if (isSkin) {
          skinPixels++;
          skinCenterX += px;
          skinCenterY += py;
        }
      }

      if (skinPixels > 60) {
        const avgX = skinCenterX / skinPixels;
        const avgY = skinCenterY / skinPixels;
        const normalizedX = 1 - (avgX / w);
        const normalizedY = avgY / h;

        const targetX = normalizedX * window.innerWidth;
        const targetY = normalizedY * window.innerHeight;

        cursorRef.current.x += (targetX - cursorRef.current.x) * 0.3;
        cursorRef.current.y += (targetY - cursorRef.current.y) * 0.3;
        setCursorPos({ x: cursorRef.current.x, y: cursorRef.current.y });
        setTrackingConfidence(70);

        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.strokeRect(avgX - 20, avgY - 20, 40, 40);
        ctx.beginPath();
        ctx.arc(avgX, avgY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#34d399';
        ctx.fill();

        setDetectedGesture('OPTICAL TRACKING');
      } else {
        setTrackingConfidence(10);
        setDetectedGesture('SEARCHING FOR HAND...');
      }

      animationFrameRef.current = requestAnimationFrame(processVisionFrame);
    };

    animationFrameRef.current = requestAnimationFrame(processVisionFrame);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [triggerVirtualClick, playLaserSound, setTimeLeft, setIsRunning, setView]);

  return (
    <>
      {/* ── VIRTUAL LASER CURSOR RETICLE OVERLAY ─────────────────── */}
      <div 
        className="fixed pointer-events-none z-[99999] transition-transform duration-75 ease-out"
        style={{
          left: `${cursorPos.x}px`,
          top: `${cursorPos.y}px`,
          transform: 'translate(-50%, -50%)'
        }}
      >
        {/* Glow Core */}
        <div className={`relative flex items-center justify-center transition-all duration-150 ${isPinching ? 'scale-150' : 'scale-100'}`}>
          <div className="w-10 h-10 rounded-full border border-cyan-400/80 animate-ping opacity-70 absolute" />
          <div className="w-6 h-6 rounded-full border-2 border-cyan-400 flex items-center justify-center bg-cyan-500/20 backdrop-blur-sm shadow-[0_0_25px_rgba(34,211,238,1)]">
            <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_white]" />
          </div>
          
          {/* Cyberpunk Coordinates Reticle Badge */}
          <div className="absolute left-8 top-0 px-2.5 py-1 rounded-lg bg-black/90 border border-cyan-500/40 text-[9px] font-mono text-cyan-400 whitespace-nowrap backdrop-blur-xl shadow-2xl flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>{detectedGesture}</span>
          </div>
        </div>
      </div>

      {/* ── FLOATING GESTURES HUD & CAMERA PIP ─────────────────── */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed bottom-24 right-6 z-[9000] w-84 max-w-[90vw] bg-zinc-950/95 border border-cyan-500/40 rounded-3xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.9)] backdrop-blur-3xl space-y-3 font-mono selection:bg-cyan-500/30"
      >
        {/* HUD Top Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_12px_rgba(34,211,238,1)]" />
            <span className="text-[11px] font-bold text-white tracking-widest uppercase">Gestures Vision OS</span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-[8px] font-bold">PRO</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsHUDMinimized(!isHUDMinimized)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/50 hover:text-white transition-colors"
              title="Minimize HUD"
            >
              {isHUDMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
              title="Close Gesture Mode"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {!isHUDMinimized && (
          <>
            {/* Camera Video / Canvas Feed */}
            <div className="relative w-full h-40 bg-black rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center group">
              <video 
                ref={videoRef} 
                playsInline 
                muted 
                className="hidden" 
              />
              <canvas 
                ref={canvasRef} 
                width={320} 
                height={240} 
                className="w-full h-full object-cover transform -scale-x-100" 
              />
              
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-black/85 space-y-2 z-10">
                  <CameraOff size={24} className="text-red-400 animate-bounce" />
                  <p className="text-[10px] text-white/80 font-bold">{cameraError}</p>
                  <p className="text-[9px] text-white/40">You can still trigger actions via buttons below.</p>
                </div>
              )}

              {/* Live Telemetry Badges */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-black/70 border border-white/10 text-[8px] text-cyan-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  60 FPS LIVE
                </span>
                <span className="px-2 py-0.5 rounded-md bg-black/70 border border-white/10 text-[8px] text-emerald-400 font-bold">
                  {trackingConfidence}% LOCK
                </span>
              </div>

              {/* Pinch Distance indicator */}
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 border border-white/10 text-[8px] text-white/60">
                DELTA: {pinchDistance}px
              </div>
            </div>

            {/* Gesture & Voice Engine Readout */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5 text-[10px]">
              <div className="flex justify-between items-center">
                <span className="text-white/40">VISION STATE:</span>
                <span className="text-cyan-400 font-bold flex items-center gap-1">
                  <Target size={11} /> {detectedGesture}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/40">VOICE ENGINE:</span>
                <button
                  onClick={toggleSpeechRecognition}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase transition-all ${
                    isMicActive 
                      ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400" 
                      : "bg-white/5 border border-white/10 text-white/40 hover:text-white"
                  }`}
                >
                  {isMicActive ? <Mic size={10} className="animate-pulse" /> : <MicOff size={10} />}
                  {isMicActive ? "MIC ACTIVE" : "TAP TO UNMUTE"}
                </button>
              </div>
              {lastActionText && (
                <div className="pt-1.5 border-t border-white/5 flex items-center gap-1.5 text-purple-400">
                  <CheckCircle2 size={11} className="shrink-0" />
                  <span className="truncate">{lastActionText}</span>
                </div>
              )}
            </div>

            {/* Voice Transcript Bar */}
            {voiceTranscript && (
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-[10px] text-purple-300 italic truncate flex items-center gap-2">
                <Sparkles size={11} className="text-purple-400 shrink-0" />
                <span className="truncate">&ldquo;{voiceTranscript}&rdquo;</span>
              </div>
            )}

            {/* Interactive Voice & Gesture Triggers */}
            <div className="space-y-1 pt-1">
              <div className="text-[9px] text-white/40 uppercase tracking-wider font-bold">Quick Voice Triggers</div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: 'Tasks', cmd: 'go to tasks' },
                  { label: 'Start Focus', cmd: 'start 25m focus' },
                  { label: 'Ledger', cmd: 'go to ledger' },
                  { label: 'Terminal', cmd: 'open terminal' },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => handleVoiceCommand(item.cmd)}
                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/5 text-[9px] text-white/70 hover:text-white transition-all text-left flex items-center justify-between"
                  >
                    <span>{item.label}</span>
                    <ChevronRight size={10} className="text-white/30" />
                  </button>
                ))}
              </div>
            </div>

            {/* Gesture Guide */}
            <div className="text-[9px] text-white/40 space-y-0.5 border-t border-white/5 pt-2">
              <p>• <span className="text-cyan-300">Pinch Index & Thumb</span> = Click Element</p>
              <p>• <span className="text-white/70">Open Palm</span> = Virtual Laser Pointer</p>
              <p>• <span className="text-amber-300">Thumbs Up</span> = Start 25m Focus Session</p>
              <p>• <span className="text-emerald-300">Speak "Go to [View]"</span> = Instant Voice Jump</p>
            </div>
          </>
        )}
      </motion.div>
    </>
  );
}
