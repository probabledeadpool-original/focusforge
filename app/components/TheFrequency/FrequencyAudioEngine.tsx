"use client";

import { useEffect, useRef, useCallback } from 'react';
import { useFrequencyStore } from '../../../hooks/useFrequencyStore';

/**
 * FrequencyAudioEngine
 * 
 * A hidden, persistent YouTube IFrame player that lives at the app root.
 * It subscribes to useFrequencyStore and controls playback accordingly.
 * This component renders NO visible UI — it only manages audio state.
 */
export default function FrequencyAudioEngine() {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isReadyRef = useRef(false);
  const lastVideoIdRef = useRef<string | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const seekRequestRef = useRef<number | null>(null);
  const volumeRef = useRef(80);

  const {
    currentTrackId,
    tracks,
    isPlaying,
    volume,
    currentTime,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    next,
    playbackTrigger,
  } = useFrequencyStore();

  const currentTrack = currentTrackId
    ? tracks.find(t => t.id === currentTrackId) || null
    : null;

  // Load YT IFrame API
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }

    // Check if script already loading
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const check = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(check);
          initPlayer();
        }
      }, 100);
      return () => clearInterval(check);
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      initPlayer();
    };

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, []);

  const initPlayer = useCallback(() => {
    if (playerRef.current || !containerRef.current) return;

    playerRef.current = new window.YT.Player(containerRef.current, {
      height: '1',
      width: '1',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          isReadyRef.current = true;
          playerRef.current?.setVolume(volumeRef.current);
        },
        onStateChange: (event: any) => {
          const state = event.data;
          if (state === window.YT.PlayerState.ENDED) {
            next(true);
          } else if (state === window.YT.PlayerState.PLAYING) {
            const dur = Number(playerRef.current?.getDuration?.() ?? 0);
            if (!Number.isNaN(dur) && dur > 0) setDuration(dur);
          }
        },
        onError: () => {
          // Skip to next on error
          next(true);
        },
      },
    });

    // Start sync interval
    syncIntervalRef.current = setInterval(() => {
      if (!playerRef.current || !isReadyRef.current) return;
      try {
        const time = Number(playerRef.current.getCurrentTime?.() ?? 0);
        const dur = Number(playerRef.current.getDuration?.() ?? 0);
        if (!Number.isNaN(time)) {
          setCurrentTime(Math.floor(time));
        }
        if (!Number.isNaN(dur) && dur > 0) {
          setDuration(Math.floor(dur));
        }
      } catch {}
    }, 500);
  }, [next, setCurrentTime, setDuration]);

  // React to track changes
  useEffect(() => {
    if (!isReadyRef.current || !playerRef.current || !currentTrack) return;

    if (lastVideoIdRef.current !== currentTrack.videoId) {
      lastVideoIdRef.current = currentTrack.videoId;
      playerRef.current.loadVideoById({
        videoId: currentTrack.videoId,
        startSeconds: 0,
      });
    }
  }, [currentTrack?.videoId]);

  // React to play/pause
  useEffect(() => {
    if (!isReadyRef.current || !playerRef.current) return;
    if (!currentTrack) return;

    try {
      if (isPlaying) {
        const state = playerRef.current.getPlayerState?.();
        if (state !== window.YT.PlayerState.PLAYING) {
          playerRef.current.playVideo();
        }
      } else {
        const state = playerRef.current.getPlayerState?.();
        if (state === window.YT.PlayerState.PLAYING) {
          playerRef.current.pauseVideo();
        }
      }
    } catch {}
  }, [isPlaying, currentTrack?.videoId]);

  // React to volume
  useEffect(() => {
    volumeRef.current = volume;
    if (isReadyRef.current && playerRef.current) {
      try {
        playerRef.current.setVolume(volume);
      } catch {}
    }
  }, [volume]);

  // React to seek requests (detect large jumps in currentTime from UI)
  useEffect(() => {
    if (seekRequestRef.current !== null) {
      seekRequestRef.current = null;
    }
  }, [currentTime]);

  // React to explicit playback requests (e.g. clicking a song to replay it)
  useEffect(() => {
    if (!isReadyRef.current || !playerRef.current || !currentTrack) return;
    
    // Seek to 0 on explicit play requests for the current video
    if (lastVideoIdRef.current === currentTrack.videoId) {
      try {
        playerRef.current.seekTo(0, true);
        if (isPlaying) {
          playerRef.current.playVideo();
        }
      } catch (e) {
        console.error("Playback trigger seek error:", e);
      }
    }
  }, [playbackTrigger]);

  // Expose a global seek function
  useEffect(() => {
    (window as any).__frequencySeek = (time: number) => {
      if (isReadyRef.current && playerRef.current) {
        try {
          playerRef.current.seekTo(time, true);
        } catch {}
      }
    };
    return () => {
      delete (window as any).__frequencySeek;
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        left: -9999,
        top: -9999,
        width: 1,
        height: 1,
        overflow: 'hidden',
        pointerEvents: 'none',
        opacity: 0,
      }}
      aria-hidden="true"
    >
      <div ref={containerRef} />
    </div>
  );
}
