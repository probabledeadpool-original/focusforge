"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactPlayer from 'react-player';
import { Play, Pause, Volume2, VolumeX, Maximize, X, Camera, Repeat, Volume1, PlayCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "00:00";
  const date = new Date(seconds * 1000);
  const hh = date.getUTCHours();
  const mm = date.getUTCMinutes();
  const ss = date.getUTCSeconds().toString().padStart(2, "0");
  if (hh) {
    return `${hh}:${mm.toString().padStart(2, "0")}:${ss}`;
  }
  return `${mm}:${ss}`;
};

export function VideoPlayerController({ url, onClose, onAddNote }: { url: string, onClose: () => void, onAddNote?: (n: any) => void }) {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [played, setPlayed] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);

  const [duration, setDuration] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePlayPause = () => setPlaying(!playing);
  
  const handleToggleMuted = () => {
     if (volume === 0 && muted) {
        setVolume(0.8);
     }
     setMuted(!muted);
  };
  
  const handleSeekChange = (e: any) => {
    setPlayed(parseFloat(e.target.value));
  };
  
  const handleSeekMouseUp = (e: any) => {
    if (playerRef.current) {
       playerRef.current.seekTo(parseFloat(e.target.value));
    }
  };
  
  const handleProgress = (state: any) => {
     if (!playing) return;
     setPlayed(state.played);
     
     if (loopA !== null && loopB !== null && playerRef.current) {
        const currentTime = playerRef.current.getCurrentTime();
        if (currentTime >= loopB) {
           playerRef.current.seekTo(loopA);
        }
     }
  };

  const setLoopPoint = () => {
    if (!playerRef.current) return;
    const time = playerRef.current.getCurrentTime();
    if (loopA === null) {
      setLoopA(time);
    } else if (loopB === null && time > loopA) {
      setLoopB(time);
    } else {
      setLoopA(null);
      setLoopB(null);
    }
  };

  const handleSnapshot = () => {
     if (!playerRef.current || !onAddNote) return;
     const time = playerRef.current.getCurrentTime();
     
     onAddNote({
       id: Date.now().toString(),
       type: 'video-snapshot',
       content: "Bookmarked video segment.",
       timestamp: time,
       createdAt: Date.now(),
       sourceUrl: url
     });
     
     setPlaying(false);
  };

  const handleFullscreen = async () => {
     if (containerRef.current) {
        if (!document.fullscreenElement) {
           await containerRef.current.requestFullscreen().catch(err => {
             console.error(`Error attempting to enable fullscreen: ${err.message}`);
           });
        } else {
           if (document.exitFullscreen) {
             await document.exitFullscreen();
           }
        }
     }
  };

  const changeSpeed = () => {
     const rates = [1, 1.25, 1.5, 2];
     const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
     setPlaybackRate(rates[nextIdx]);
  }

  const handleMouseMove = () => {
    setIsHovering(true);
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      if (playing) setIsHovering(false);
    }, 2500);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const currentTime = Math.floor(played * duration);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300">
        <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl" onClick={onClose} />
        
        <div 
          ref={containerRef} 
          className={`overflow-hidden relative shadow-[0_0_80px_rgba(0,0,0,0.8)] bg-black transition-all duration-300 ${
            isFullscreen ? 'fixed inset-0 z-[100] rounded-none w-[100vw] h-[100vh]' : 'w-full max-w-6xl aspect-video rounded-2xl'
          }`}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => playing && setIsHovering(false)}
        >
           {/* Close Button overlay */}
           <div className={`absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 to-transparent flex justify-end z-30 transition-opacity duration-300 ${
              isHovering || !playing ? 'opacity-100' : 'opacity-0 pointer-events-none'
           }`}>
             <button onClick={onClose} className="p-3 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-brand/50 hover:text-brand transition-all text-white/70">
               <X className="w-6 h-6"/>
             </button>
           </div>
           
           {!isReady && !error && (
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                 <div className="flex flex-col items-center gap-4">
                   <div className="w-12 h-12 border-2 border-brand/20 border-t-brand rounded-full animate-spin glow-brand" />
                   <div className="tracking-widest text-[10px] font-mono text-brand/70 glow-text drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">INITIALIZING STREAM</div>
                 </div>
              </div>
           )}

           {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none gap-3">
                 <div className="p-4 rounded-full bg-red-500/10 border border-red-500/30 text-red-500">
                   <X className="w-8 h-8" />
                 </div>
                 <div className="tracking-widest pr-[2px] text-[10px] font-mono text-red-500 glow-text">{error}</div>
              </div>
           )}

           <ReactPlayer 
             src={url}
             playing={playing}
             volume={muted ? 0 : volume}
             playbackRate={playbackRate}
             onProgress={handleProgress}
             onReady={() => {
               setIsReady(true);
               setPlaying(true);
               if (playerRef.current && playerRef.current.getDuration) {
                 setDuration(playerRef.current.getDuration());
               }
             }}
             onPlay={() => setPlaying(true)}
             onPause={() => setPlaying(false)}
             onError={(e: any) => {
                console.error("ReactPlayer Error:", e);
                setError("UNABLE TO PLAY THIS MEDIA FORMAT.");
             }}
             width="100%"
             height="100%"
             controls={false}
             config={{
                youtube: {
                   playerVars: { modestbranding: 1, controls: 0, rel: 0, showinfo: 0, disablekb: 1, origin: typeof window !== 'undefined' ? window.location.origin : '' }
                },
                vimeo: {
                   playerOptions: { controls: false, title: false, byline: false, portrait: false }
                }
             } as any}
             className="absolute top-0 left-0"
             ref={playerRef}
             style={{ opacity: isReady ? 1 : 0, transition: 'opacity 0.6s ease' }}
           />

           {/* Click overlay for play/pause */}
           <div className="absolute inset-0 flex items-center justify-center cursor-pointer pointer-events-auto" onClick={handlePlayPause}>
             <AnimatePresence>
                {!playing && isReady && (
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.8 }} 
                     animate={{ opacity: 1, scale: 1 }} 
                     exit={{ opacity: 0, scale: 0.8 }}
                     className="w-24 h-24 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl hover:bg-brand/20 hover:border-brand/50 transition-all text-white group"
                   >
                     <Play className="w-10 h-10 ml-2 group-hover:text-brand transition-colors drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]" fill="currentColor"/>
                   </motion.div>
                )}
             </AnimatePresence>
           </div>

           {/* Control Bar */}
           <div 
             className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col justify-end px-6 pt-16 pointer-events-auto z-10 transition-all duration-300 ${
               isFullscreen ? 'pb-10' : 'pb-6'
             } ${
               isHovering || !playing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
             }`}
           >
              
              <div className="w-full relative group/seek flex items-center h-4 mb-4" onMouseUp={handleSeekMouseUp}>
                 <div className="absolute inset-x-0 h-1 bg-white/20 rounded-full overflow-hidden transition-all group-hover/seek:scale-y-150 origin-bottom">
                   <div className="h-full bg-brand rounded-full transition-all duration-100 ease-out shadow-[0_0_10px_rgba(var(--brand),0.8)]" style={{ width: `${played * 100}%` }} />
                 </div>
                 <input 
                   type="range" min={0} max={0.999999} step="any"
                   value={played}
                   onChange={handleSeekChange}
                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                 />
              </div>

              <div className="flex items-center justify-between text-white/90">
                  <div className="flex items-center gap-6">
                      <button onClick={handlePlayPause} className="hover:text-brand transition-colors transform hover:scale-110">
                         {playing ? <Pause className="w-6 h-6" fill="currentColor"/> : <Play className="w-6 h-6" fill="currentColor"/>}
                      </button>

                      <div className="flex items-center gap-3 group/volume">
                         <button onClick={handleToggleMuted} className="hover:text-brand transition-colors">
                            {muted || volume === 0 ? <VolumeX className="w-5 h-5"/> : volume < 0.5 ? <Volume1 className="w-5 h-5"/> : <Volume2 className="w-5 h-5"/>}
                         </button>
                         <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-300 ease-out flex items-center h-5">
                           <input 
                             type="range" min={0} max={1} step={0.05}
                             value={muted ? 0 : volume}
                             onChange={e => {
                               setVolume(parseFloat(e.target.value));
                               if (muted) setMuted(false);
                             }}
                             className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer outline-none accent-brand"
                           />
                         </div>
                      </div>

                      <div className="font-mono text-xs opacity-70 flex items-center gap-1 select-none">
                        <span>{formatTime(currentTime)}</span>
                        <span>/</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                  </div>

                  <div className="flex items-center gap-5">
                      <button onClick={setLoopPoint} className={`text-[10px] font-mono font-bold tracking-widest px-2 py-1 rounded bg-white/5 hover:bg-white/10 border transition-all ${loopA !== null ? 'text-brand border-brand/50 shadow-[0_0_10px_rgba(var(--brand),0.2)]' : 'text-white/70 border-white/10 hover:text-white'}`}>
                         {loopA !== null && loopB === null ? 'SET B' : loopB !== null ? 'LOOPING' : 'LOOP'}
                      </button>

                      <button onClick={handleSnapshot} className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all group/snap relative">
                         <Camera className="w-5 h-5"/>
                         <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-[10px] font-bold tracking-wide py-1 px-2 rounded opacity-0 group-hover/snap:opacity-100 border border-white/10 pointer-events-none transition-opacity">SNAPSHOT</span>
                      </button>

                      <button onClick={changeSpeed} className="w-10 text-[11px] font-mono font-bold tracking-wider hover:text-brand transition-all text-center">
                         {playbackRate}x
                      </button>

                      <button onClick={handleFullscreen} className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all">
                         <Maximize className="w-5 h-5" />
                      </button>
                  </div>
              </div>
           </div>
        </div>
    </div>
  )
}
