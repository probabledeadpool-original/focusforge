"use client";

import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipForward, SkipBack, Maximize, Minimize, RotateCcw, Target, X, Sparkles, List, Activity, Radio, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValue } from 'motion/react';
import { useAppStore } from '../../hooks/useAppStore';
import { useFrequencyStore, AudioEnhancementPreset } from '../../hooks/useFrequencyStore';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export interface YouTubePlayerRef {
  play: () => void;
  pause: () => void;
  nextVideo: () => void;
  previousVideo: () => void;
  seekBy: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  playVideoAt: (index: number) => void;
}


type Props = {
  videoId?: string | null;
  playlistId?: string | null;
  autoplay?: boolean;
  muted?: boolean;
  onEnd?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onVideoDurationChange?: (duration: number) => void;
  title?: string;
  dimmed?: boolean;
  className?: string;
  roundedClass?: string;
  isVoidShift?: boolean;
  onEnterVoid?: () => void;
  isAmbientActive?: boolean;
  onToggleAmbient?: () => void;
  initialTime?: number;
  onProgress?: (currentTime: number, duration: number) => void;
  noCrop?: boolean;
};


export const CustomYouTubePlayer = forwardRef<YouTubePlayerRef, Props>(({ videoId, playlistId, autoplay = false, muted = false, onEnd, onPlay, onPause, onVideoDurationChange, title, dimmed = false, className = "", roundedClass = "rounded-2xl", isVoidShift = false, onEnterVoid, isAmbientActive: propAmbientActive, onToggleAmbient, initialTime = 0, onProgress, noCrop }, ref) => {
  const { setCurrentSegmentIndex, setTotalSegments, setIsVideoPlaying } = useAppStore();
  const frequencyStore = useFrequencyStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [isHovering, setIsHovering] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showAudioDspMenu, setShowAudioDspMenu] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [localAmbientActive, setLocalAmbientActive] = useState(true);
  const activeAmbient = propAmbientActive !== undefined ? propAmbientActive : localAmbientActive;
  const toggleAmbient = onToggleAmbient || (() => setLocalAmbientActive(!localAmbientActive));
  
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [gestureFeedback, setGestureFeedback] = useState<{ type: 'vol' | 'seek', text: string, x: number, y: number } | null>(null);
  const interactionRef = useRef({ startX: 0, startY: 0, isDragging: false });
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const durationRef = useRef(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mainPlayerRef = useRef<HTMLDivElement>(null);
  const ambientPlayerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ambientPlayers = useRef<any[]>([]);
  const isPlayingRef = useRef(false);
  const targetPlaybackRateRef = useRef(1);
  const [playlistVideos, setPlaylistVideos] = useState<string[]>([]);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);
  const [showPlaylistSidebar, setShowPlaylistSidebar] = useState(false);
  const vaultRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useImperativeHandle(ref, () => ({
    play: () => {
      if (playerRef.current && typeof playerRef.current.playVideo === 'function') playerRef.current.playVideo();
    },
    pause: () => {
      if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') playerRef.current.pauseVideo();
    },
    nextVideo: () => {
      if (playerRef.current && typeof playerRef.current.nextVideo === 'function') playerRef.current.nextVideo();
    },
    previousVideo: () => {
      if (playerRef.current && typeof playerRef.current.previousVideo === 'function') playerRef.current.previousVideo();
    },
    seekBy: (seconds: number) => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function' && typeof playerRef.current.seekTo === 'function') {
        const currentTime = playerRef.current.getCurrentTime();
        const targetTime = currentTime + seconds;
        playerRef.current.seekTo(targetTime, true);
        ambientPlayers.current.forEach(p => {
          if (typeof p.seekTo === 'function') p.seekTo(targetTime, true);
        });
      }
    },
    setPlaybackRate: (rate: number) => {
      if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
        playerRef.current.setPlaybackRate(rate);
        setPlaybackRate(rate);
      }
    },
    playVideoAt: (index: number) => {
      if (playerRef.current && typeof playerRef.current.playVideoAt === 'function') {
        playerRef.current.playVideoAt(index);
        setCurrentPlaylistIndex(index);
      }
    }
  }));


  const togglePlay = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!playerRef.current) return;
    if (isPlaying) {
      if (typeof playerRef.current.pauseVideo === 'function') playerRef.current.pauseVideo();
    } else {
      if (typeof playerRef.current.playVideo === 'function') playerRef.current.playVideo();
    }
  }, [isPlaying]);

  const toggleMute = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!playerRef.current) return;
    if (isMuted) {
      if (typeof playerRef.current.unMute === 'function') playerRef.current.unMute();
      setIsMuted(false);
    } else {
      if (typeof playerRef.current.mute === 'function') playerRef.current.mute();
      setIsMuted(true);
    }
  }, [isMuted]);

  const nextVideo = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (playerRef.current && typeof playerRef.current.nextVideo === 'function') {
      playerRef.current.nextVideo();
    }
  }, []);

  const previousVideo = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (playerRef.current && typeof playerRef.current.previousVideo === 'function') {
      playerRef.current.previousVideo();
    }
  }, []);

  const changePlaybackRate = useCallback((rate: number) => {
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      const availableRates = playerRef.current.getAvailablePlaybackRates ? playerRef.current.getAvailablePlaybackRates() : [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
      // Find the closest available rate
      const closestRate = availableRates.reduce((prev: number, curr: number) => Math.abs(curr - rate) < Math.abs(prev - rate) ? curr : prev);
      
      playerRef.current.setPlaybackRate(closestRate);
      targetPlaybackRateRef.current = closestRate;
      setPlaybackRate(closestRate);
      setShowSpeedMenu(false);

      ambientPlayers.current.forEach(p => {
        if (p && typeof p.setPlaybackRate === 'function') p.setPlaybackRate(closestRate);
      });
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ([' ', 'ArrowRight', 'ArrowLeft'].includes(e.key)) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        
        if (e.key === ' ') {
          togglePlay();
        } else if (e.key === 'ArrowRight') {
          if (playerRef.current?.getCurrentTime && playerRef.current?.seekTo) {
            playerRef.current.seekTo(playerRef.current.getCurrentTime() + 10, true);
            setGestureFeedback({ type: 'seek', text: '+10s', x: window.innerWidth / 2, y: window.innerHeight / 2 });
            setTimeout(() => setGestureFeedback(null), 800);
          }
        } else if (e.key === 'ArrowLeft') {
          if (playerRef.current?.getCurrentTime && playerRef.current?.seekTo) {
            playerRef.current.seekTo(playerRef.current.getCurrentTime() - 10, true);
            setGestureFeedback({ type: 'seek', text: '-10s', x: window.innerWidth / 2, y: window.innerHeight / 2 });
            setTimeout(() => setGestureFeedback(null), 800);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  const toggleFullscreen = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  const syncAmbientPlayer = useCallback(() => {
    if (!playerRef.current || ambientPlayers.current.length === 0) return;
    if (typeof playerRef.current.getPlayerState !== 'function' || 
        typeof playerRef.current.getCurrentTime !== 'function' || 
        typeof playerRef.current.getDuration !== 'function' ||
        typeof playerRef.current.getPlaybackRate !== 'function') {
      return;
    }
    
    const state = playerRef.current.getPlayerState();
    const cTime = playerRef.current.getCurrentTime();
    const dur = playerRef.current.getDuration();
    const desiredRate = targetPlaybackRateRef.current;
    const actualRate = playerRef.current.getPlaybackRate();
    
    // Enforce the playback rate on the main player to prevent auto-resets, but only if it's available
    if (Math.abs(actualRate - desiredRate) > 0.01) {
      const availableRates = playerRef.current.getAvailablePlaybackRates ? playerRef.current.getAvailablePlaybackRates() : [];
      if (availableRates.includes(desiredRate)) {
        playerRef.current.setPlaybackRate(desiredRate);
      } else {
        targetPlaybackRateRef.current = actualRate;
        setPlaybackRate(actualRate);
      }
    }
    
    if (dur > 0) {
      if (Math.abs(dur - durationRef.current) > 0.1 && onVideoDurationChange) {
        onVideoDurationChange(dur);
        durationRef.current = dur;
      }
      setProgress((cTime / dur) * 100);
      setCurrentTime(cTime);
      setDuration(dur);
      if (onProgress) onProgress(cTime, dur);
    }

    
    ambientPlayers.current.forEach(p => {
      if (typeof p.getCurrentTime === 'function') {
        const ambientTime = p.getCurrentTime();
        if (Math.abs(cTime - ambientTime) > 0.1) {
          p.seekTo(cTime, true);
        }
      }
      
      if (typeof p.getPlaybackRate === 'function' && Math.abs(p.getPlaybackRate() - desiredRate) > 0.01) {
        p.setPlaybackRate(desiredRate);
      }
      
      if (state === window.YT.PlayerState.PLAYING) {
        if (typeof p.playVideo === 'function' && p.getPlayerState() !== window.YT.PlayerState.PLAYING) p.playVideo();
      } else if (state === window.YT.PlayerState.PAUSED) {
        if (typeof p.pauseVideo === 'function' && p.getPlayerState() !== window.YT.PlayerState.PAUSED) p.pauseVideo();
      }
    });

    if (playlistId && playerRef.current && typeof playerRef.current.getPlaylist === 'function') {
      const list = playerRef.current.getPlaylist();
      if (list && list.length !== playlistVideos.length) {
        setPlaylistVideos(list);
        setTotalSegments(list.length);
      }
      
      try {
        const idx = playerRef.current.getPlaylistIndex();
        if (idx !== -1 && idx !== currentPlaylistIndex) {
          setCurrentPlaylistIndex(idx);
          setCurrentSegmentIndex(idx + 1);
          
          // CRITICAL: Force ambient players to the same index
          ambientPlayers.current.forEach(p => {
            if (p && typeof p.getPlaylistIndex === 'function') {
              const pIdx = p.getPlaylistIndex();
              if (pIdx !== idx) {
                if (typeof p.playVideoAt === 'function') {
                  p.playVideoAt(idx);
                } else if (typeof p.loadPlaylist === 'function') {
                  p.loadPlaylist({ list: playlistId, index: idx });
                }
              }
            } else if (p && typeof p.playVideoAt === 'function') {
               p.playVideoAt(idx);
            }
          });
        }
      } catch (e) {
        // Silently handle cases where index isn't available yet
      }
    }

  }, [onVideoDurationChange, playlistId, playlistVideos.length, currentPlaylistIndex]);


  const onAmbientPlayerReady = useCallback((event: any) => {
    event.target.mute();
    event.target.setVolume(0);
    if (isPlayingRef.current) {
      event.target.playVideo();
    }
  }, []);

  const onPlayerReady = useCallback((event: any) => {
    setIsReady(true);
    if (autoplay) {
      event.target.playVideo();
    }
    if (muted) {
      event.target.mute();
    }
  }, [autoplay, muted]);

  const onPlayerStateChange = useCallback((event: any) => {
    if (!window.YT || !window.YT.PlayerState) return;
    
    if (event.data === window.YT.PlayerState.PLAYING) {
      setIsPlaying(true);
      setHasStarted(true);
      setIsVideoPlaying(true);
      ambientPlayers.current.forEach(p => {
        if (p && typeof p.playVideo === 'function') p.playVideo();
      });
      if (onPlay) onPlay();
    } else if (event.data === window.YT.PlayerState.PAUSED) {
      setIsPlaying(false);
      setIsVideoPlaying(false);
      ambientPlayers.current.forEach(p => {
        if (p && typeof p.pauseVideo === 'function') p.pauseVideo();
      });
      if (onPause) onPause();
    } else if (event.data === window.YT.PlayerState.ENDED) {
      setIsPlaying(false);
      setIsVideoPlaying(false);
      ambientPlayers.current.forEach(p => p?.pauseVideo());
      if (onEnd) onEnd();
      if (onPause) onPause();
    }
  }, [onEnd, onPlay, onPause, setIsVideoPlaying]);

  useEffect(() => {
    let checkReady: NodeJS.Timeout;
    let syncInterval: NodeJS.Timeout;

    const loadAPI = () => {
      if (window.YT && window.YT.Player) {
        initPlayers();
        return;
      }

      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        if (firstScriptTag && firstScriptTag.parentNode) {
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else {
          document.head.appendChild(tag);
        }
      }

      checkReady = setInterval(() => {
        if (window.YT && window.YT.Player) {
          initPlayers();
          clearInterval(checkReady);
        }
      }, 100);
    };

    const initPlayers = () => {
      if (!window.YT || !window.YT.Player || !containerRef.current) return;
      
      const commonPlayerVars: any = {
        autoplay: autoplay ? 1 : 0,
        mute: muted ? 1 : 0,
        controls: 0,
        rel: 0,
        showinfo: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        disablekb: 1,
        fs: 0,
        start: initialTime ? Math.floor(initialTime) : 0,
        origin: typeof window !== 'undefined' ? window.location.origin : undefined,
        enablejsapi: 1,
        widget_referrer: typeof window !== 'undefined' ? window.location.href : undefined,
      };


      if (playlistId) {
        commonPlayerVars.listType = 'playlist';
        commonPlayerVars.list = playlistId;
      }

      if (mainPlayerRef.current) {
        if (playerRef.current) {
          try { playerRef.current.destroy(); } catch(e) {}
        }
        
        const mainOptions: any = {
          height: '100%',
          width: '100%',
          host: 'https://www.youtube-nocookie.com',
          playerVars: { ...commonPlayerVars, enablejsapi: 1 },
          events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
            onError: (e: any) => {
              if (e.data === 150 || e.data === 101) {
                console.error('YouTube Error 150/101: This video is restricted from being embedded. Try another video or check playback permissions.');
              } else {
                console.error('YouTube Player Error:', e.data);
              }
            },
          },
        };
        if (videoId) mainOptions.videoId = videoId;
        playerRef.current = new window.YT.Player(mainPlayerRef.current, mainOptions);
      }

      ambientPlayers.current.forEach(p => { try { p?.destroy(); } catch(e) {} });
      ambientPlayers.current = [];

      for (let i = 0; i < 3; i++) {
        const targetRef = ambientPlayerRefs.current[i];
        if (targetRef) {
          // Stagger ambient player creation to avoid simultaneous resource lock
          setTimeout(() => {
            if (!targetRef) return;
            const ambientOptions: any = {
              height: '100%',
              width: '100%',
              host: 'https://www.youtube-nocookie.com',
              playerVars: { 
                ...commonPlayerVars, 
                mute: 1,
                enablejsapi: 1,
              },
              events: { 
                onReady: onAmbientPlayerReady,
                onError: (e: any) => console.warn(`Ambient Player ${i} Error:`, e.data)
              },
            };
            if (videoId) ambientOptions.videoId = videoId;
            if (playlistId) {
              ambientOptions.playerVars.listType = 'playlist';
              ambientOptions.playerVars.list = playlistId;
            }
            try {
              const p = new window.YT.Player(targetRef, ambientOptions);
              ambientPlayers.current.push(p);
            } catch (err) {
              console.warn("Failed to create ambient player instance", err);
            }
          }, 500 + (i * 200));
        }
      }

    };

    loadAPI();

    durationRef.current = 0;
    setHasStarted(false);
    syncInterval = setInterval(syncAmbientPlayer, 50);

    return () => {
      setIsVideoPlaying(false);
      if (checkReady) clearInterval(checkReady);
      if (syncInterval) clearInterval(syncInterval);
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch(e) {}
      }
      ambientPlayers.current.forEach(p => {
        try { p?.destroy(); } catch(e) {}
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, playlistId, autoplay, muted]);


  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || typeof playerRef.current.getDuration !== 'function' || typeof playerRef.current.seekTo !== 'function') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const dur = playerRef.current.getDuration();
    const targetTime = dur * percentage;
    playerRef.current.seekTo(targetTime, true);
    ambientPlayers.current.forEach(p => {
      if (typeof p.seekTo === 'function') p.seekTo(targetTime, true);
    });
    setProgress(percentage * 100);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full aspect-video group ${className} ${isFullscreen ? 'bg-black' : ''} ${isVoidShift ? 'cursor-none' : ''} ${(isVoidShift || activeAmbient) ? 'overflow-visible' : 'overflow-hidden'}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={(e) => {
        if (isVoidShift) {
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          }
        }
      }}
    >
      {/* Triple-Layer Ambient Glow System (Nebula Overdrive) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-visible">
        {/* Static Base Glow (Foundation) */}
        <motion.div 
          animate={{ opacity: activeAmbient ? 0.3 : 0 }}
          className="absolute -inset-24 blur-[100px] bg-gradient-to-br from-white/10 via-transparent to-white/5 rounded-full"
        />
        {/* Deep Well Background */}
        {isVoidShift && <div className="absolute -inset-64 bg-black z-[-1] pointer-events-none" />}
        
        <motion.div 
          animate={{ 
            opacity: activeAmbient ? (isVoidShift ? [0.4, 0.6, 0.4] : (isPlaying ? 0.5 : 0.2)) : 0,
            scale: activeAmbient ? [1.1, 1.15, 1.1] : 1.1
          }}
          transition={{ repeat: activeAmbient ? Infinity : 0, duration: 10, ease: "easeInOut" }}
          className={`absolute ${isVoidShift ? '-inset-[400px] blur-[200px] saturate-[200%] brightness-[100%]' : '-inset-[200px] blur-[150px] saturate-[150%]'} transition-all duration-[3000ms]`}
        >
          <div ref={el => { ambientPlayerRefs.current[0] = el; }} className="w-full h-full scale-[1.3] opacity-50" />
        </motion.div>
        
        <motion.div 
          animate={{ 
            opacity: activeAmbient ? (isVoidShift ? [0.6, 0.8, 0.6] : (isPlaying ? 0.7 : 0.3)) : 0,
            scale: activeAmbient ? [1.05, 1.1, 1.05] : 1.05
          }}
          transition={{ repeat: activeAmbient ? Infinity : 0, duration: 7, ease: "easeInOut", delay: 1 }}
          className={`absolute ${isVoidShift ? '-inset-[200px] blur-[120px] saturate-[180%] brightness-[110%]' : '-inset-[100px] blur-[80px] saturate-[130%]'} transition-all duration-[2000ms]`}
        >
          <div ref={el => { ambientPlayerRefs.current[1] = el; }} className="w-full h-full scale-[1.2] opacity-70" />
        </motion.div>
        
        <motion.div 
          animate={{ 
            opacity: activeAmbient ? (isVoidShift ? [0.7, 0.9, 0.7] : (isPlaying ? 0.8 : 0.4)) : 0,
            scale: activeAmbient ? [1, 1.05, 1] : 1
          }}
          transition={{ repeat: activeAmbient ? Infinity : 0, duration: 5, ease: "easeInOut", delay: 0.5 }}
          className={`absolute ${isVoidShift ? '-inset-12 blur-[60px] saturate-[150%]' : '-inset-8 blur-[40px] saturate-[120%]'} transition-all duration-[1500ms]`}
        >
          <div ref={el => { ambientPlayerRefs.current[2] = el; }} className="w-full h-full scale-[1.1]" />
        </motion.div>

      </div>

      {/* Main Player Container */}
      <div 
        className={`relative z-10 transition-all duration-1000 flex items-center justify-center w-full h-full ${roundedClass} overflow-hidden ${isVoidShift ? 'bg-transparent' : 'bg-black'}`}
        style={{
          border: isVoidShift ? 'none' : '1px solid rgba(255,255,255,0.2)',
          boxShadow: isVoidShift ? 'none' : '0 40px 100px rgba(0,0,0,0.8), 0 0 20px rgba(255,255,255,0.05)'
        }}
      >
        {/* The YouTube Iframe Wrapper - Soft-Body Mask */}
        <div 
          className={`absolute inset-0 yt-main-wrapper pointer-events-none transition-all duration-1000 ${dimmed ? 'brightness-[0.4]' : 'brightness-100'}`}
          style={{
            WebkitMaskImage: isVoidShift 
              ? 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)'
              : 'none',
            WebkitMaskComposite: 'source-in',
            maskImage: isVoidShift 
              ? 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)'
              : 'none',
            maskComposite: 'intersect'
          }}
        >
          <div ref={mainPlayerRef} className={`w-full h-full origin-center transition-transform duration-700 ${isVoidShift ? 'scale-[1.02]' : 'scale-100'}`} />
        </div>
        
        <div 
          className="absolute inset-0 z-10 cursor-pointer touch-none"
          onPointerDown={(e) => {
            interactionRef.current = { startX: e.clientX, startY: e.clientY, isDragging: true };
          }}
          onPointerUp={(e) => {
            if (!interactionRef.current.isDragging) return;
            const dx = e.clientX - interactionRef.current.startX;
            const dy = e.clientY - interactionRef.current.startY;
            interactionRef.current.isDragging = false;

            if (isVoidShift) {
              if (Math.abs(dx) > 100) {
                // Horizontal Flick
                const seconds = dx > 0 ? 10 : -10;
                if (playerRef.current?.getCurrentTime && playerRef.current?.seekTo) {
                  playerRef.current.seekTo(playerRef.current.getCurrentTime() + seconds, true);
                  setGestureFeedback({ type: 'seek', text: dx > 0 ? '+10s' : '-10s', x: e.clientX, y: e.clientY });
                  setTimeout(() => setGestureFeedback(null), 800);
                }
                return;
              }
              if (Math.abs(dy) > 100) {
                // Vertical Drag Right (Volume)
                if (e.clientX > window.innerWidth / 2 && playerRef.current?.setVolume) {
                  const volChange = dy < 0 ? 20 : -20; // Up is negative dy
                  let currentVol = 100;
                  if (playerRef.current.getVolume) currentVol = playerRef.current.getVolume();
                  const newVol = Math.max(0, Math.min(100, currentVol + volChange));
                  playerRef.current.setVolume(newVol);
                  if (newVol > 0 && isMuted) toggleMute();
                  setGestureFeedback({ type: 'vol', text: `${Math.round(newVol)}%`, x: e.clientX, y: e.clientY });
                  setTimeout(() => setGestureFeedback(null), 800);
                }
                return;
              }
            }
            
            // Standard click
            if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
               togglePlay();
            }
          }}
        />
        
        {/* Ghost Control System: Custom Prismatic Cursor */}
        <AnimatePresence>
          {isVoidShift && isHovering && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1, x: mousePos.x, y: mousePos.y }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ type: "tween", ease: "backOut", duration: 0.15 }}
              className="absolute w-2 h-2 -ml-1 -mt-1 rounded-full bg-cyan-300 pointer-events-none z-[100] mix-blend-screen shadow-[0_0_15px_3px_rgba(34,211,238,0.8),0_0_30px_10px_rgba(255,255,255,0.4)]"
            />
          )}
        </AnimatePresence>

        {/* Gesture Feedback System */}
        <AnimatePresence>
          {gestureFeedback && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.2, filter: 'blur(10px)' }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="absolute pointer-events-none z-50 text-white/50 font-heading font-black text-6xl mix-blend-screen drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]"
              style={{ left: gestureFeedback.x - 50, top: gestureFeedback.y - 50 }}
            >
              {gestureFeedback.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ghost Control System for Void Shift */}
        <AnimatePresence>
          {isVoidShift && isHovering && (
            <motion.div 
              initial={{ opacity: 0, filter: 'blur(20px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(20px)' }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 z-30 pointer-events-none mix-blend-screen"
            >
              {/* Peripheral Shadows */}
              <div className="absolute top-10 left-10 text-white/50 font-mono text-[10px] tracking-[0.4em] uppercase">
                4K // FORGE <br/>
                <span className="text-white/30 text-[8px]">{title?.substring(0, 30)}...</span>
              </div>
              
              <button 
                onClick={() => {
                  if (onEnterVoid) onEnterVoid();
                  else window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                }}
                className="absolute top-10 right-10 pointer-events-auto text-white/30 hover:text-white transition-all hover:rotate-90 hover:scale-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                title="Exit Void Shift (Esc)"
              >
                <X size={24} />
              </button>

              <div className="absolute bottom-16 left-10 pointer-events-auto">
                <button onClick={togglePlay} className="text-white/40 hover:text-white transition-all hover:scale-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                  {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                </button>
              </div>

              {/* Floating Lumen Scrubber */}
              <div className="absolute bottom-0 left-0 w-full group/ghost-scrubber pointer-events-auto">
                <div className="absolute bottom-6 w-full px-12 opacity-0 group-hover/ghost-scrubber:opacity-100 transition-opacity duration-300">
                  <span className="text-[10px] text-silver-300 font-mono tracking-widest bg-black/20 px-2 py-1 backdrop-blur-md rounded border border-white/5 absolute -translate-x-1/2" style={{ left: `${progress}%` }}>
                    {formatTime(currentTime)}
                  </span>
                </div>
                <div 
                  className="w-full h-[1px] group-hover/ghost-scrubber:h-[3px] bg-white/10 transition-all cursor-ew-resize relative"
                  onClick={handleSeek}
                >
                  <motion.div 
                    className="absolute inset-y-0 left-0 bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] mix-blend-screen transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Netflix-Style HUD */}
        <AnimatePresence>
          {(!isVoidShift && (isHovering || !isPlaying)) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col justify-between pointer-events-none"
            >
              <div className="p-12 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
                <motion.div initial={{ y: -20 }} animate={{ y: 0 }} className="flex flex-col">
                  <span className="text-white/40 font-mono text-[10px] uppercase tracking-[0.4em] mb-2">Now Playing</span>
                  <h1 className="text-white font-heading font-extrabold text-4xl tracking-tight drop-shadow-2xl">{title || 'Cinematic Focus Session'}</h1>
                </motion.div>
              </div>

              <div className="p-12 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col gap-6 pointer-events-auto">
                {/* Progress Bar */}
                <div className="flex flex-col gap-2 group/progress-container">
                  <div 
                    className="relative w-full h-1.5 bg-white/20 cursor-pointer overflow-hidden rounded-full transition-all hover:h-2.5"
                    onClick={handleSeek}
                  >
                    <motion.div 
                      className="absolute inset-y-0 left-0 bg-white shadow-[0_0_15px_white] rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center opacity-0 group-hover/progress-container:opacity-100 transition-opacity">
                    <span className="text-[10px] font-mono text-white/50">{formatTime(currentTime)}</span>
                    <span className="text-[10px] font-mono text-white/50">{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Main Controls Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-10">
                    <div className="flex items-center gap-6">
                      <button onClick={previousVideo} className="text-white/70 hover:text-white transition-all outline-none" title="Previous">
                        <SkipBack size={32} fill="currentColor" />
                      </button>
                      
                      <button onClick={togglePlay} className="text-white hover:scale-110 transition-all outline-none drop-shadow-2xl">
                        {isPlaying ? <Pause size={48} fill="currentColor" /> : <Play size={48} fill="currentColor" className="ml-1" />}
                      </button>

                      <button onClick={nextVideo} className="text-white/70 hover:text-white transition-all outline-none" title="Next">
                        <SkipForward size={32} fill="currentColor" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-8">
                      <button onClick={(e) => { e.stopPropagation(); playerRef.current?.seekTo(playerRef.current.getCurrentTime() - 10, true); }} className="text-white/70 hover:text-white transition-all relative flex flex-col items-center group">
                        <RotateCcw size={28} />
                        <span className="absolute -bottom-1 text-[9px] font-mono font-bold">10</span>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); playerRef.current?.seekTo(playerRef.current.getCurrentTime() + 10, true); }} className="text-white/70 hover:text-white transition-all relative flex flex-col items-center group">
                        <div className="rotate-180 scale-x-[-1]"><RotateCcw size={28} /></div>
                        <span className="absolute -bottom-1 text-[9px] font-mono font-bold">10</span>
                      </button>
                    </div>

                    <div className="relative">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(!showSpeedMenu); }} 
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold uppercase tracking-widest text-white/80 transition-all border border-white/5 backdrop-blur-md"
                      >
                        {playbackRate}x
                      </button>
                      <AnimatePresence>
                        {showSpeedMenu && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-zinc-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden min-w-[100px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100]"
                          >
                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                              <button
                                key={rate}
                                onClick={(e) => { e.stopPropagation(); changePlaybackRate(rate); }}
                                className={`w-full px-6 py-3 text-center text-xs font-bold hover:bg-white/10 transition-colors ${playbackRate === rate ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/60'}`}
                              >
                                {rate}x
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Audio DSP Mode Control */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAudioDspMenu(!showAudioDspMenu);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all border backdrop-blur-md flex items-center gap-2 ${
                          frequencyStore.audioPreset === 'immersive'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                            : frequencyStore.audioPreset === 'enhanced'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                            : 'bg-white/10 text-white/70 hover:text-white border-white/5'
                        }`}
                        title="Audio Enhancement Engine (DSP Mode)"
                      >
                        <Activity size={14} className={frequencyStore.audioPreset !== 'original' ? 'animate-pulse text-cyan-400' : 'text-white/40'} />
                        <span className="hidden sm:inline">Audio ·</span> {frequencyStore.audioPreset}
                      </button>

                      <AnimatePresence>
                        {showAudioDspMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-zinc-950/95 backdrop-blur-2xl border border-white/15 rounded-2xl overflow-hidden min-w-[210px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[100] p-1.5"
                          >
                            <div className="px-3 py-1.5 border-b border-white/10 mb-1 flex items-center justify-between">
                              <span className="text-[9px] font-mono uppercase tracking-widest text-white/40 font-bold">Audio Engine DSP</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  frequencyStore.setStudioOpen(true);
                                  setShowAudioDspMenu(false);
                                }}
                                className="text-[8px] font-mono uppercase text-cyan-400 hover:text-white font-bold tracking-widest"
                              >
                                Studio ↗
                              </button>
                            </div>
                            {[
                              { id: 'original', label: 'Original', desc: 'Direct unaltered audio' },
                              { id: 'enhanced', label: 'Enhanced', desc: 'Balanced warmth & clarity' },
                              { id: 'immersive', label: 'Immersive', desc: 'Deep spatial acoustic depth' },
                              { id: 'bass-titan', label: 'Bass Titan', desc: 'Heavyweight punch & 808s' },
                              { id: 'vocal-air', label: 'Vocal Air', desc: 'Pristine dialogue & acoustic' },
                            ].map((preset) => (
                              <button
                                key={preset.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  frequencyStore.setAudioPreset(preset.id as any);
                                  setShowAudioDspMenu(false);
                                }}
                                className={`w-full px-3 py-1.5 text-left rounded-xl transition-all flex flex-col cursor-pointer ${
                                  frequencyStore.audioPreset === preset.id
                                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                <span className="text-xs font-mono uppercase tracking-wider flex items-center justify-between">
                                  {preset.label}
                                  {frequencyStore.audioPreset === preset.id && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                                </span>
                                <span className="text-[8px] font-mono text-white/40 font-normal">{preset.desc}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="hidden md:flex flex-col items-end mr-4">
                       <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Remaining</span>
                       <span className="text-white font-mono text-sm tabular-nums">{formatTime(duration - currentTime)}</span>
                    </div>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        toggleAmbient(); 
                      }} 
                      className={`hover:text-white transition-all drop-shadow-lg ${activeAmbient ? 'text-amber-300 shadow-amber-300/50' : 'text-white/40'}`} 
                      title={activeAmbient ? "Ambient Glow Enabled" : "Enable Ambient Glow"}
                    >
                      <Sparkles size={28} className={activeAmbient ? "animate-pulse" : ""} />
                    </button>
                    {onEnterVoid && (
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          onEnterVoid(); 
                        }} 
                        className={`transition-all drop-shadow-lg flex items-center justify-center relative group ${isVoidShift ? 'text-amber-400' : 'text-cyan-400 hover:text-white'}`} 
                        title={isVoidShift ? "Exit Void Shift" : "Enter Void Shift (Pure Immersion)"}
                      >
                        <Target size={28} className={`${isVoidShift ? 'rotate-180' : 'group-hover:rotate-90'} transition-transform duration-500`} />
                      </button>
                    )}
                    <button onClick={toggleMute} className="text-white/70 hover:text-white transition-all drop-shadow-lg">
                      {isMuted ? <VolumeX size={28} className="opacity-40" /> : <Volume2 size={28} />}
                    </button>
                    {playlistVideos.length > 0 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowPlaylistSidebar(!showPlaylistSidebar); }} 
                        className={`transition-all drop-shadow-lg ${showPlaylistSidebar ? 'text-cyan-400' : 'text-white/70 hover:text-white'}`}
                        title="Playlist Content"
                      >
                        <List size={28} />
                      </button>
                    )}
                    <button onClick={toggleFullscreen} className="text-white/70 hover:text-white transition-all drop-shadow-lg">
                      {isFullscreen ? <Minimize size={28} /> : <Maximize size={28} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Playlist Selection Sidebar */}
              <AnimatePresence>
                {showPlaylistSidebar && playlistVideos.length > 0 && (
                  <motion.div
                    initial={{ x: 450, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 450, opacity: 0 }}
                    className="absolute top-0 right-0 h-full w-[400px] bg-zinc-950/60 backdrop-blur-[50px] border-l border-white/5 z-[200] flex flex-col overflow-hidden shadow-[-40px_0_100px_rgba(0,0,0,0.8)] pointer-events-auto"
                  >
                    <div className="p-12 pb-6 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold uppercase tracking-[0.6em] text-white/20 maybach-mono">Intelligence Archive</span>
                        <h2 className="text-white font-heading font-black text-3xl tracking-tighter lowercase">Sequence.</h2>
                      </div>
                      <button 
                        onClick={() => {
                          setShowPlaylistSidebar(false);
                          setCurrentSegmentIndex(0); // Clear from island
                        }} 
                        className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div 
                      ref={vaultRef}
                      className="flex-1 overflow-y-auto custom-scrollbar px-10 pb-40 space-y-4 perspective-[1200px] scroll-smooth snap-y snap-mandatory playlist-vault" 
                      style={{ scrollbarWidth: 'none' }}
                    >
                      <div className="h-[20vh]" /> {/* Top Spacer for Centering */}
                      {playlistVideos.map((id, index) => (
                        <PlaylistItem 
                          key={id + index}
                          id={id}
                          index={index}
                          total={playlistVideos.length}
                          isActive={currentPlaylistIndex === index}
                          containerRef={vaultRef}
                          onClick={() => {
                             if (playerRef.current?.playVideoAt) {
                               playerRef.current.playVideoAt(index);
                               setCurrentPlaylistIndex(index);
                               setCurrentSegmentIndex(index + 1);
                             }
                          }}
                        />
                      ))}
                      <div className="h-[40vh]" /> {/* Bottom Spacer for Centering */}
                    </div>
                    
                    <div className="p-8 border-t border-white/5 bg-black/40 backdrop-blur-xl">
                       <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-[0.4em] text-white/20 maybach-mono">
                          <span>Total Segments</span>
                          <span>{playlistVideos.length}</span>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>


          )}
        </AnimatePresence>

        {!hasStarted && autoplay && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-[25] transition-opacity duration-1000">
            <motion.div 
              animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 border-t-2 border-white/20 rounded-full animate-spin" />
              <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/30">Syncing Environment</span>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
});

CustomYouTubePlayer.displayName = 'CustomYouTubePlayer';

const PlaylistItem = ({ id, index, total, isActive, containerRef, onClick }: { id: string, index: number, total: number, isActive: boolean, containerRef: React.RefObject<HTMLDivElement | null>, onClick: () => void }) => {
  const ref = useRef<HTMLButtonElement>(null);
  const { scrollYProgress } = useScroll({
    container: containerRef,
    target: ref,
    offset: ["center end", "center start"]
  });

  // Simplified Magnification Logic (Scale & Opacity only for performance)
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.85, 1.1, 0.85]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.4, 1, 0.4]);
  
  const springScale = useSpring(scale, { stiffness: 150, damping: 25 });
  const springOpacity = useSpring(opacity, { stiffness: 150, damping: 25 });

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      style={{ 
        scale: springScale, 
        opacity: springOpacity,
      }}
      className={`w-full flex flex-col gap-4 p-6 rounded-[24px] transition-colors relative group overflow-hidden border snap-center scroll-mt-20 shrink-0 ${isActive ? 'bg-white/10 border-white/30 shadow-xl' : 'bg-transparent border-white/5'}`}
    >
      <div className="relative w-full aspect-video rounded-[16px] overflow-hidden">
        <img src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`} className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700" alt="" />
        
        {isActive && (
           <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                 <Play size={20} fill="currentColor" />
              </div>
           </div>
        )}

        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
           <span className="text-[10px] font-bold text-white tabular-nums tracking-widest font-mono">0{index + 1}</span>
        </div>
      </div>

      <div className="flex flex-col items-start px-2">
        <span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.4em] mb-1 font-mono font-bold">Segment Intelligence</span>
        <h3 className="text-white font-bold text-xl tracking-tight lowercase">
           {index + 1}. Sequence Module
        </h3>
        
        {isActive && (
          <p className="text-white/40 text-[11px] leading-relaxed mt-2 line-clamp-2 italic">
            Analyzing high-frequency metadata for extraction...
          </p>
        )}
      </div>
    </motion.button>
  );
};
