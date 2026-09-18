"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ArrowUp, Globe, FileText, CheckSquare, LineChart, Play, Pause, Activity, Flame, Trash2, Cloud, Sun, SunDim, CloudRain, CloudLightning, CloudSnow, Wind, MapPin, Plus, Square, X, CloudFog, BookOpen, Target, Zap, Loader2, SkipForward, SkipBack, Shuffle, Repeat, Repeat1, Check, Maximize2, Minimize2, Radio, Bot, Sparkles, Mic, MicOff, Copy, CheckCheck, RefreshCw, Volume2, Volume1, VolumeX, ChevronDown, ChevronRight, SlidersHorizontal, RotateCcw, Monitor, AtSign, Send, Headphones } from 'lucide-react';
import { BorderBeam } from '@/components/ui/border-beam';
import { AIMessage } from '@/components/ui/ai-message';
import { MaybachLogo } from './Branding';
import { SiriWave } from '@/components/ui/siri-wave';


import { useAppStore } from '../../hooks/useAppStore';
import { useMarketsStore } from '../../hooks/useMarketsStore';

import { useFrequencyStore } from '../../hooks/useFrequencyStore';
import { useJarvisStore } from '../../hooks/useJarvisStore';
import { getSelectedTextModel, recordAiUsage } from '../../lib/aiModelConfig';
import { QuickSettingsPanel } from './quick-settings';

type MainState = 'mini' | 'search' | 'shelf' | 'fog' | 'wiki' | 'syphon' | 'youtube' | 'frequency' | 'media-grand' | 'media-mini' | 'ai' | 'settings';

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "0:00";
  const mm = Math.floor(seconds / 60);
  const ss = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
};

export default function EverythingIsland() {
  const { view, currentSegmentIndex, totalSegments } = useAppStore();
  const { setSymbol } = useMarketsStore();
  const frequencyStore = useFrequencyStore();
  const jarvisStore = useJarvisStore();
  
  const [islandState, setIslandState] = useState<MainState>('mini');
  const [isIslandMusicExpanded, setIsIslandMusicExpanded] = useState(false);
  const [time, setTime] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputTint, setInputTint] = useState<string | null>(null);
  const [isUrl, setIsUrl] = useState(false);
  const [isStressed, setIsStressed] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'tasks' | 'market' | 'media' | 'weather'>('notes');
  const [notes, setNotes] = useState('');
  const [tasks, setTasks] = useState<{id: string, title: string, done: boolean}[]>([]);
  const [isPlayingMedia, setIsPlayingMedia] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [weatherData, setWeatherData] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Quick Settings Hardware States
  const [screenBrightness, setScreenBrightness] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const prevVolumeRef = useRef<number>(80);

  const applyBrightness = (val: number) => {
    const clamped = Math.max(15, Math.min(100, val));
    setScreenBrightness(clamped);
    if (typeof window !== 'undefined') {
      localStorage.setItem('maybach-screen-brightness', String(clamped));
    }
  };

  const toggleMute = () => {
    if (frequencyStore.volume > 0) {
      prevVolumeRef.current = frequencyStore.volume;
      frequencyStore.setVolume(0);
    } else {
      frequencyStore.setVolume(prevVolumeRef.current > 0 ? prevVolumeRef.current : 80);
    }
  };

  const toggleFullscreen = () => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn("Fullscreen request failed", err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.warn("Exit fullscreen failed", err);
        });
      }
    }
  };

  const [autoFullscreenEnabled, setAutoFullscreenEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('focusforge-default-fullscreen') !== 'false';
    }
    return true;
  });

  const toggleAutoFullscreen = () => {
    const nextVal = !autoFullscreenEnabled;
    setAutoFullscreenEnabled(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('focusforge-default-fullscreen', String(nextVal));
    }
  };

  // Audio Hardware Devices (Microphone & Speaker Selectors)
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('default');
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>('default');
  const [showMicPicker, setShowMicPicker] = useState<boolean>(false);
  const [showSpeakerPicker, setShowSpeakerPicker] = useState<boolean>(false);
  const [isTestingSpeaker, setIsTestingSpeaker] = useState<boolean>(false);
  const [micPermissionGranted, setMicPermissionGranted] = useState<boolean>(false);

  const refreshAudioDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter(d => d.kind === 'audioinput');
      const outputs = devices.filter(d => d.kind === 'audiooutput');
      setAudioInputDevices(inputs);
      setAudioOutputDevices(outputs);
      const hasLabels = inputs.some(d => d.label && d.label.length > 0);
      setMicPermissionGranted(hasLabels);
    } catch (err) {
      console.debug('Failed to enumerate audio devices:', err);
    }
  }, []);

  const requestMicAccess = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMicPermissionGranted(true);
      refreshAudioDevices();
    } catch (e) {
      console.warn("Mic access request rejected", e);
    }
  };

  const handleSelectMic = (deviceId: string) => {
    setSelectedMicId(deviceId);
    setShowMicPicker(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('focusforge-audio-input-device', deviceId);
      window.dispatchEvent(new CustomEvent('audio-input-device-changed', { detail: { deviceId } }));
    }
  };

  const handleSelectSpeaker = (deviceId: string) => {
    setSelectedSpeakerId(deviceId);
    setShowSpeakerPicker(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('focusforge-audio-output-device', deviceId);
      window.dispatchEvent(new CustomEvent('audio-output-device-changed', { detail: { deviceId } }));
      if (typeof (HTMLMediaElement.prototype as any).setSinkId === 'function') {
        document.querySelectorAll('audio, video').forEach((el: any) => {
          try { el.setSinkId(deviceId); } catch (e) {}
        });
      }
    }
  };

  const testSpeakerChime = (targetDeviceId?: string) => {
    setIsTestingSpeaker(true);
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.12); // G5
      osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.25); // C6
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.55);
    } catch (e) {}
    setTimeout(() => setIsTestingSpeaker(false), 600);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedBrightness = localStorage.getItem('maybach-screen-brightness');
      if (savedBrightness) {
        const parsed = Number(savedBrightness);
        if (!isNaN(parsed)) setScreenBrightness(parsed);
      }
      const savedMic = localStorage.getItem('focusforge-audio-input-device');
      if (savedMic) setSelectedMicId(savedMic);
      const savedSpeaker = localStorage.getItem('focusforge-audio-output-device');
      if (savedSpeaker) setSelectedSpeakerId(savedSpeaker);
    }

    refreshAudioDevices();

    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', refreshAudioDevices);
    }

    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    handleFsChange();

    const handleOpenSettings = () => {
      setIslandState('settings');
      refreshAudioDevices();
    };
    window.addEventListener('open-island-settings', handleOpenSettings);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('open-island-settings', handleOpenSettings);
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        navigator.mediaDevices.removeEventListener('devicechange', refreshAudioDevices);
      }
    };
  }, [refreshAudioDevices]);
  
  // Fresh AI Copilot States
  const [aiStatus, setAiStatus] = useState<'idle' | 'thinking' | 'error'>('idle');
  const [textPromptValue, setTextPromptValue] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'assistant'; text: string; timestamp?: string}[]>([]);
  const [chatSubmitting, setChatSubmitting] = useState(false);
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null);
  const [isSpeakingAi, setIsSpeakingAi] = useState(false);
  const [isDictatingPrompt, setIsDictatingPrompt] = useState(false);
  const [isHandsFreeVoice, setIsHandsFreeVoice] = useState(false);
  const [voiceInterimText, setVoiceInterimText] = useState('');
  const [activeModel, setActiveModel] = useState<string>('gemini-3.7-flash');
  const [activeMode, setActiveMode] = useState<string>('Auto');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const promptRecognitionRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (islandState === 'ai') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, chatSubmitting, islandState]);
  
  // FOG MODE STATES
  const [fogTimer, setFogTimer] = useState(25 * 60);
  const [fogTimerRunning, setFogTimerRunning] = useState(true);
  const [fogNote, setFogNote] = useState('');
  const [kanyeQuote, setKanyeQuote] = useState('');
  const prevIslandState = useRef<MainState>('mini');

  const islandRef = useRef<HTMLDivElement>(null);
  const tradingViewRef = useRef<HTMLDivElement>(null);

  // Universal Search States
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isShooting, setIsShooting] = useState(false);
  const [isPreparingShoot, setIsPreparingShoot] = useState(false);

  const [isSiphoning, setIsSiphoning] = useState(false);
  const [isSiphoningToMarkets, setIsSiphoningToMarkets] = useState(false);
  const [wikiData, setWikiData] = useState<any>(null);
  const [wikiHistory, setWikiHistory] = useState<string[]>([]);
  const [currentSyllabusTopic, setCurrentSyllabusTopic] = useState<string | null>(null);
  const [syllabusSubtopics, setSyllabusSubtopics] = useState<any[]>([]);
  const [ytEmbedId, setYtEmbedId] = useState<string | null>(null);

  const [isSyncingLedger, setIsSyncingLedger] = useState(false);
  const [ledgerVelocity, setLedgerVelocity] = useState(0);
  const [isFlickering, setIsFlickering] = useState(false);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    const start = () => setIsFlickering(true);
    const end = () => setIsFlickering(false);
    window.addEventListener('maybach-incineration-start', start);
    window.addEventListener('maybach-incineration-end', end);
    return () => {
      window.removeEventListener('maybach-incineration-start', start);
      window.removeEventListener('maybach-incineration-end', end);
    };
  }, []);

  useEffect(() => {
    if (frequencyStore.isPlaying && frequencyStore.currentTrackId && islandState === 'mini') {
      setIslandState('frequency');
    } else if (!frequencyStore.currentTrackId && islandState === 'frequency') {
      setIslandState('mini');
    }
  }, [frequencyStore.currentTrackId, islandState, frequencyStore.isPlaying]);



  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (islandState === 'settings') {
          setIslandState('mini');
          event.preventDefault();
        } else if (islandState === 'frequency' && isIslandMusicExpanded) {
          setIsIslandMusicExpanded(false);
          event.preventDefault();
        } else if (islandState !== 'mini') {
          setIslandState('mini');
          event.preventDefault();
        }
      } else if (event.ctrlKey && event.key === ',') {
        event.preventDefault();
        setIslandState(prev => prev === 'settings' ? 'mini' : 'settings');
      }
    };

    const handleOpenSettings = () => {
      setIslandState('settings');
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-quick-settings', handleOpenSettings);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-quick-settings', handleOpenSettings);
    };
  }, [islandState, isIslandMusicExpanded]);

  useEffect(() => {
    if (islandState !== 'frequency') {
      setIsIslandMusicExpanded(false);
      return;
    }

    if (!frequencyStore.isExpanded) {
      setIsIslandMusicExpanded(false);
    }
  }, [frequencyStore.isExpanded, islandState]);

  const processInput = async (query: string) => {
    setIsSiphoning(true);
    // Pulse global UI
    window.dispatchEvent(new CustomEvent('global-loading', { detail: { loading: true } }));

    try {
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|.*[?&]list=)|youtu\.be\/|music\.youtube\.com\/watch\?v=)([^"&?\/\s]{11}|[^"&?\/\s]{34})/i;
      const match = query.match(youtubeRegex);
      let videoId = null;
      let playlistId = null;

      if (match) {
        if (match[1].length === 11) videoId = match[1];
        else playlistId = match[1];
      }

      let title = "Unknown Title";
      let thumbnail = "https://picsum.photos/400";
      let artist = "Unknown Artist";

      if (videoId || playlistId) {
        const targetUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : `https://www.youtube.com/playlist?list=${playlistId}`;
        // Fetch via oembed
        const oembed = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`).then(r => r.json()).catch(() => null);
        if (oembed) {
           title = oembed.title;
           thumbnail = oembed.thumbnail_url;
           artist = oembed.author_name;
        } else {
           title = videoId ? `Video ${videoId}` : `Playlist ${playlistId}`;
        }
      } else {
        // Fallback or search
        const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
        if (apiKey) {
           const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`).then(r => r.json());
           if (res.items && res.items.length > 0) {
             const snippet = res.items[0].snippet;
             videoId = res.items[0].id.videoId;
             title = snippet.title;
             artist = snippet.channelTitle;
             thumbnail = snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url;
           }
        } else {
            // Mock fallback
            await new Promise(r => setTimeout(r, 2000));
            videoId = "jfKfPfyJRdk"; // default lofi
            title = `Search: ${query}`;
            artist = "Generated Stream";
            thumbnail = "https://img.youtube.com/vi/jfKfPfyJRdk/maxresdefault.jpg";
        }
      }

      if (videoId) {
          window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'place' } }));
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('start-theatre', { detail: { url: `https://youtube.com/watch?v=${videoId}` } }));
          }, 50);
      }
    } catch(e) {
      console.error(e);
    } finally {
      setIsSiphoning(false);
      window.dispatchEvent(new CustomEvent('global-loading', { detail: { loading: false } }));
      setIslandState('mini');
    }
  };

  const fetchWiki = async (query: string, addToHistory = true) => {
    setIsSiphoning(true);
    
    try {
      const summaryResPromise = fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
      // Use the action API to get full structured HTML extracts
      const extractResPromise = fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&titles=${encodeURIComponent(query)}&format=json&origin=*`);
      
      const [summaryRes, extractRes] = await Promise.all([summaryResPromise, extractResPromise]);
      
      if (summaryRes.ok && extractRes.ok && (await summaryRes.clone().json()).type !== 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') {
        const data = await summaryRes.json();
        const fullData = await extractRes.json();
        
        let fullHtml = data.extract_html;
        const pages = fullData?.query?.pages;
        if (pages && !pages['-1']) { // '-1' means missing page in mediawiki API
          const pageId = Object.keys(pages)[0];
          if (pages[pageId] && pages[pageId].extract) {
            fullHtml = pages[pageId].extract;
          }
        } else if (pages && pages['-1']) {
           // Page missing
           throw new Error("Page missing");
        }
        
        setWikiData({ ...data, extract_html: fullHtml });
        
        if (addToHistory && data.title) {
          setWikiHistory(prev => [...prev, data.title]);
        }
        
        // Artificial delay to let the insane animation play
        await new Promise(r => setTimeout(r, 1800));
        
        setIslandState('wiki');
      } else {
        throw new Error("Wikipedia article not found.");
      }
    } catch (e) {
      console.error(e);
      // Fallback to Google Search
      executeSearchAction({ type: 'google', subtitle: query, action: 'google' });
    } finally {
      setIsSiphoning(false);
    }
  };

  // Internal Hopping Logic for Wikipedia Links
  const handleWikiHtmlClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'a') {
      e.preventDefault();
      const href = target.getAttribute('href');
      if (href) {
         const titleMatch = href.match(/\/wiki\/(.+)/);
         if (titleMatch) {
            const nextTitle = decodeURIComponent(titleMatch[1]);
            fetchWiki(nextTitle);
         } else {
            // It might be a regular link starting with ./ or something else
            const titleMatchFallback = href.match(/^\.?\/?(.+)/);
            if (titleMatchFallback) {
              fetchWiki(decodeURIComponent(titleMatchFallback[1]));
            }
         }
      }
    }
  };

  const saveWikiToLibrary = () => {
    if (!wikiData) return;
    const item = {
       type: 'wiki',
       title: wikiData.title,
       url: wikiData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${wikiData.title}`,
       timestamp: Date.now()
    };
    const shelf = JSON.parse(localStorage.getItem('ghost-shelf') || '[]');
    shelf.push(item);
    localStorage.setItem('ghost-shelf', JSON.stringify(shelf));
    // Provide some feedback to the user, perhaps a small toast or visual state change. Just a log for now.
    console.log("Saved to Ghost Shelf!");
  };

  // Search Logic Router
  useEffect(() => {
    if (islandState === 'search') {
      const qRaw = inputValue;
      const q = qRaw.trim().toLowerCase();
      
      const results: any[] = [];
      
      const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;
      const tickerRegex = /^\$?([A-Z]{1,10})$/i;

      const tickerMatch = qRaw.trim().match(tickerRegex);
      if (tickerMatch) {
         const symbol = tickerMatch[1].toUpperCase();
         results.push({ type: 'market', title: `$${symbol}`, subtitle: 'View Market Chart', action: symbol });
      }

      if (q.startsWith('/g ')) {
         results.push({ type: 'google', title: 'Search Google', subtitle: qRaw.substring(3), action: 'google' });
      } else if (q.startsWith('/yt ')) {
         results.push({ type: 'youtube', title: 'Play YouTube Embed', subtitle: qRaw.substring(4), action: qRaw.substring(4) });
      } else if (q.startsWith('/settings') || q.startsWith('/quick') || q.startsWith('/config') || q.startsWith('/brightness') || q.startsWith('/volume') || q.startsWith('/fullscreen')) {
         results.push({ type: 'settings', title: 'Quick Settings // Hardware', subtitle: 'Display Luminance, Master Acoustics, Canvas Immersion', action: 'settings' });
      } else if (q.startsWith('/ai ') || q.startsWith('/ask ') || q.startsWith('/gemini ')) {
         const prompt = q.startsWith('/ai ') ? qRaw.substring(4) : q.startsWith('/ask ') ? qRaw.substring(5) : qRaw.substring(8);
         results.push({ type: 'ai', title: 'Ask Aura Copilot', subtitle: prompt, action: prompt });
      } else if (q.startsWith('/wiki ')) {
         results.push({ type: 'wiki', title: `Wikipedia Info`, subtitle: qRaw.substring(6), action: qRaw.substring(6) });
      } else if (q.startsWith('/theatre ')) {
         results.push({ type: 'theatre', title: `Start Theatre`, subtitle: qRaw.substring(9), action: qRaw.substring(9) });
      } else if (q.startsWith('/play ')) {
         results.push({ type: 'media', title: `Play ${qRaw.substring(6)}`, subtitle: 'Search & Stream', action: qRaw.substring(6) });
      } else if (q) {
         if (urlRegex.test(q)) {
            results.push({ type: 'media', title: 'Play URL', subtitle: qRaw, action: qRaw });
         }

         const routes = [
           { name: 'Home', view: 'home' },
           { name: 'Tasks', view: 'tasks' },
           { name: 'The Hub', view: 'hub' },
           { name: 'Analytics', view: 'stats' },
           { name: 'Profile', view: 'profile' }
         ];
         routes.forEach(r => {
           if (r.name.toLowerCase().includes(q)) {
             results.push({ type: 'route', title: r.name, subtitle: 'App Section', action: r.view });
           }
         });

         tasks.forEach(t => {
           if (t.title.toLowerCase().includes(q)) {
             results.push({ type: 'task', title: t.title, subtitle: 'Task', action: 'tasks' });
           }
         });

         if (notes.toLowerCase().includes(q)) {
           results.push({ type: 'note', title: 'Notes match', subtitle: 'Snippet matches in notes', action: 'notes' });
         }

         if (results.length === 0) {
            results.push({ type: 'google', title: 'Search Web', subtitle: qRaw, action: 'google' });
         }
      }
      setSearchResults(results);
      setSelectedIndex(0);
    } else {
      setSearchResults([]);
    }
  }, [inputValue, islandState, tasks, notes]);

  const executeSearchAction = (result: any) => {
     if (result.type === 'google') {
        setIsPreparingShoot(true);
        setTimeout(() => {
           setIsPreparingShoot(false);
           setIsShooting(true);
           setTimeout(() => {
               window.open(`https://www.google.com/search?q=${encodeURIComponent(result.subtitle.trim())}`, '_blank');
               setTimeout(() => {
                  setIsShooting(false);
                  setIslandState('mini');
                  setInputValue('');
               }, 100);
           }, 400); // Shooting animation wait
        }, 150); // Anticipation squash wait
     } else if (result.type === 'route') {
        window.dispatchEvent(new CustomEvent('changeView', { detail: { view: result.action }}));
        setIslandState('mini');
        setInputValue('');
     } else if (result.type === 'task') {
        window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'tasks' }}));
        setIslandState('mini');
        setInputValue('');
     } else if (result.type === 'theatre') {
        window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'place' } }));
        setTimeout(() => {
           window.dispatchEvent(new CustomEvent('start-theatre', { detail: { url: result.action } }));
        }, 50);
        setIslandState('mini');
        setInputValue('');
     } else if (result.type === 'note') {
        setIslandState('shelf');
        setActiveTab('notes');
        setInputValue('');
     } else if (result.type === 'wiki') {
        fetchWiki(result.action);
        setInputValue('');
     } else if (result.type === 'media') {
        processInput(result.action);
        setInputValue('');
     } else if (result.type === 'market') {
        setIsSiphoningToMarkets(true);
        setTimeout(() => {
           setSymbol(result.action);
            window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'hub', subTab: 'markets' }}));
           setIsSiphoningToMarkets(false);
           setIslandState('mini');
           setInputValue('');
        }, 1000);
     } else if (result.type === 'youtube') {
         let videoId = result.action;
         const match = result.action.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
         if (match) videoId = match[1];
         setYtEmbedId(videoId);
         setIslandState('youtube');
         setInputValue('');
      } else if (result.type === 'ai') {
         setIslandState('ai');
         handleSubmitToGemini(result.subtitle);
         setInputValue('');
      } else if (result.type === 'settings') {
         setIslandState('settings');
         setInputValue('');
      }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
     if (e.key === 'Enter') {
        const selected = searchResults[selectedIndex];
        if (selected) executeSearchAction(selected);
     } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (searchResults.length > 0) setSelectedIndex(s => (s + 1) % searchResults.length);
     } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (searchResults.length > 0) setSelectedIndex(s => (s - 1 + searchResults.length) % searchResults.length);
     }
  };

  const isGoogleMode = searchResults.length > 0 && searchResults[0].type === 'google';

  // Initialize data
  useEffect(() => {
    const savedNotes = localStorage.getItem('island-notes');
    if (savedNotes) {
      setTimeout(() => setNotes(savedNotes), 0);
    }

    const checkTasks = (e?: any) => {
      if (e?.detail?.source === 'island') return; // Prevent local feedback loop
      const savedTasks = localStorage.getItem('focus-tasks');
      if (savedTasks) {
        try { 
          const parsed = JSON.parse(savedTasks);
          setTimeout(() => setTasks(parsed), 0); 
        } catch(err){}
      }
    };
    checkTasks();
    
    const handleSiphon = (e: any) => {
      setCurrentSyllabusTopic(e.detail.topic);
      setSyllabusSubtopics(e.detail.subtopics || []);
      setIslandState('syphon');
    };
    window.addEventListener('siphon-topic', handleSiphon);
    
    const handleOpenSearch = () => {
      setIslandState('search');
    };
    window.addEventListener('open-island-search', handleOpenSearch);
    
    const handleLedgerSync = (e: any) => {
      setIsSyncingLedger(e.detail.syncing);
    };
    const handleLedgerVelocity = (e: any) => {
      setLedgerVelocity(e.detail.velocity);
      // Reset velocity after 2 seconds of inactivity
      const timer = setTimeout(() => setLedgerVelocity(0), 2000);
      return () => clearTimeout(timer);
    };
    const handleJarvisDisplayMode = (e: any) => {
      const mode = e?.detail?.mode;
      if (mode === 'expanded') {
        setIslandState('ai');
      } else if (mode === 'minimized' || mode === 'fullscreen') {
        setIslandState('mini');
      }
    };
    window.addEventListener('ledger-sync', handleLedgerSync);
    window.addEventListener('ledger-velocity', handleLedgerVelocity);
    window.addEventListener('jarvis-display-mode', handleJarvisDisplayMode);
    
    window.addEventListener('tasksUpdated', checkTasks);
    return () => {
      window.removeEventListener('tasksUpdated', checkTasks);
      window.removeEventListener('siphon-topic', handleSiphon);
      window.removeEventListener('open-island-search', handleOpenSearch);
      window.removeEventListener('ledger-sync', handleLedgerSync);
      window.removeEventListener('ledger-velocity', handleLedgerVelocity);
      window.removeEventListener('jarvis-display-mode', handleJarvisDisplayMode);
    };
  }, []);

  // FOG Interception & Selection
  useEffect(() => {
    if (islandState === 'fog' && prevIslandState.current !== 'fog') {
      // Entered fog
      setTimeout(() => {
        setKanyeQuote("Focus on the process.");
        setFogTimer(25 * 60);
        setFogTimerRunning(true);
      }, 0);
    } else if (islandState !== 'fog' && prevIslandState.current === 'fog') {
      // Exited fog
      if (fogNote.trim() !== '') {
        const newTimestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const newNotes = `[${newTimestamp} - Fog Session]\n${fogNote}\n\n` + notes;
        setTimeout(() => {
          setNotes(newNotes);
          setFogNote('');
        }, 0);
        localStorage.setItem('island-notes', newNotes);
      }
    }
    prevIslandState.current = islandState;
  }, [islandState, fogNote, notes]);

  // Pomodoro Engine
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (islandState === 'fog' && fogTimerRunning && fogTimer > 0) {
      interval = setInterval(() => setFogTimer(p => p - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [islandState, fogTimerRunning, fogTimer]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    localStorage.setItem('island-notes', e.target.value);
  };

  const toggleTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTasks(newTasks);
    localStorage.setItem('focus-tasks', JSON.stringify(newTasks));
    window.dispatchEvent(new CustomEvent('tasksUpdated', { detail: { source: 'island' } }));
  };

  const removeTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTasks = tasks.filter(t => t.id !== id);
    setTasks(newTasks);
    localStorage.setItem('focus-tasks', JSON.stringify(newTasks));
    window.dispatchEvent(new CustomEvent('tasksUpdated', { detail: { source: 'island' } }));
  };

  const handleAddTask = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      const newTask = { id: Date.now().toString(), title: newTaskTitle.trim(), priority: 'medium', done: false, created: Date.now() };
      const newTasks = [newTask, ...tasks];
      setTasks(newTasks as any);
      localStorage.setItem('focus-tasks', JSON.stringify(newTasks));
      window.dispatchEvent(new CustomEvent('tasksUpdated', { detail: { source: 'island' } }));
      setNewTaskTitle('');
    }
  };

  // Weather Fetch Loop
  useEffect(() => {
    if (activeTab === 'weather' && !weatherData && !weatherLoading) {
      setTimeout(() => setWeatherLoading(true), 0);
      fetch('https://get.geojs.io/v1/ip/geo.json')
        .then(res => res.json())
        .then(geo => {
          const { latitude, longitude, city } = geo;
          return fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`)
            .then(res => res.json())
            .then(w => {
              setTimeout(() => {
                setWeatherData({ temp: w.current_weather.temperature, code: w.current_weather.weathercode, windspeed: w.current_weather.windspeed, city });
                setWeatherLoading(false);
              }, 0);
            });
        }).catch(err => {
          console.error("Weather failed", err);
          setTimeout(() => setWeatherLoading(false), 0);
        });
    }
  }, [activeTab, weatherData, weatherLoading]);

  // Setup TradingView Widget
  useEffect(() => {
    if (islandState === 'shelf' && activeTab === 'market' && tradingViewRef.current) {
      // Clear previous
      tradingViewRef.current.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
      const script = document.createElement('script');
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = JSON.stringify({
        "displayMode": "adaptive",
        "feedMode": "all_symbols",
        "colorTheme": "dark",
        "isTransparent": true,
        "locale": "en",
        "width": "100%",
        "height": "100%"
      });
      tradingViewRef.current.appendChild(script);
    }
  }, [islandState, activeTab]);

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard Shortcuts (Ctrl/Cmd actions & Alt navigation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Modifiers
      if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
          case 'k': e.preventDefault(); setIslandState(prev => prev === 'search' ? 'mini' : 'search'); break;
          case 'i': e.preventDefault(); setIslandState(prev => prev === 'ai' ? 'mini' : 'ai'); break;
          case ',': e.preventDefault(); setIslandState(prev => prev === 'settings' ? 'mini' : 'settings'); break;
          case 'o': e.preventDefault(); setIslandState('shelf'); setActiveTab('notes'); break;
          case 't': e.preventDefault(); setIslandState('shelf'); setActiveTab('tasks'); break;
          case 'm': e.preventDefault(); setIslandState('shelf'); setActiveTab('market'); break;
          case 'w': e.preventDefault(); setIslandState('shelf'); setActiveTab('weather'); break;
        }
      }
      
      // Fog toggle (Alt + Shift + F)
      if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIslandState(prev => prev === 'fog' ? 'mini' : 'fog');
      }

      // Universal Search shortcut (Alt + Shift + S)
      if (e.altKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setIslandState(prev => prev === 'search' ? 'mini' : 'search');
      }

      // Escape minimize
      if (e.key === 'Escape') {
        setIslandState('mini');
      }

      // App global navigation (Alt + 1,2,3... / Option + 1,2,3...)
      if (e.altKey) {
        switch(e.key) {
          case '1': e.preventDefault(); window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'home' }})); break;
          case '2': e.preventDefault(); window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'tasks' }})); break;
          case '3': e.preventDefault(); window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'hub' }})); break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Drag events - The Wormhole
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      // Only remove visual if we leave the window
      if (e.clientX === 0 || e.clientY === 0) {
        setIsDragOver(false);
      }
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      setIslandState('shelf'); // open shelf on drop
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  // Input parsing (Snippet Shredder)
  useEffect(() => {
    // Check for hex
    const hexRegex = /^#([0-9A-F]{3}){1,2}$/i;
    setTimeout(() => {
      if (hexRegex.test(inputValue)) {
        setInputTint(inputValue);
      } else {
        setInputTint(null);
      }

      // Check for URL
      const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;
      if (urlRegex.test(inputValue) && inputValue.length > 4) {
        setIsUrl(true);
      } else {
        setIsUrl(false);
      }
    }, 0);
  }, [inputValue]);

  // Load saved model preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gemini-model') || 'gemini-2.5-flash';
      setActiveModel(saved);
    }
  }, []);

  // AI Helpers
  const copyMessageText = (text: string, idx: number) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedMsgIdx(idx);
      setTimeout(() => setCopiedMsgIdx(null), 2000);
    }
  };

  const speakMessageText = (text: string, restartListeningAfter = false) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (isSpeakingAi) {
      window.speechSynthesis.cancel();
      setIsSpeakingAi(false);
      return;
    }
    const cleanText = text.replace(/[#*`_~]/g, '').slice(0, 350);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.onend = () => {
      setIsSpeakingAi(false);
      if (restartListeningAfter && isHandsFreeVoice) {
        setTimeout(() => {
          startVoiceRecognition();
        }, 400);
      }
    };
    utterance.onerror = () => setIsSpeakingAi(false);
    setIsSpeakingAi(true);
    window.speechSynthesis.speak(utterance);
  };

  const startVoiceRecognition = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    try {
      if (promptRecognitionRef.current) {
        try { promptRecognitionRef.current.stop(); } catch(e){}
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsDictatingPrompt(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setTextPromptValue(transcript);
        setVoiceInterimText(transcript);

        if (event.results[0].isFinal) {
          setIsDictatingPrompt(false);
          if (transcript.trim()) {
            setTextPromptValue('');
            setVoiceInterimText('');
            handleSubmitToGemini(transcript.trim(), isHandsFreeVoice);
          }
        }
      };

      recognition.onerror = () => {
        setIsDictatingPrompt(false);
      };

      recognition.onend = () => {
        setIsDictatingPrompt(false);
      };

      recognition.start();
      promptRecognitionRef.current = recognition;
    } catch (e) {
      setIsDictatingPrompt(false);
    }
  };

  const togglePromptDictation = () => {
    if (isDictatingPrompt && promptRecognitionRef.current) {
      try { promptRecognitionRef.current.stop(); } catch(e){}
      setIsDictatingPrompt(false);
      return;
    }
    startVoiceRecognition();
  };

  const toggleHandsFreeVoice = () => {
    if (!isHandsFreeVoice) {
      setIsHandsFreeVoice(true);
      startVoiceRecognition();
    } else {
      setIsHandsFreeVoice(false);
      if (promptRecognitionRef.current) {
        try { promptRecognitionRef.current.stop(); } catch(e){}
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsSpeakingAi(false);
      setIsDictatingPrompt(false);
    }
  };

  const convertAiToTask = (text: string) => {
    const title = text
      .split('\n')
      .find(line => line.trim().length > 5)
      ?.replace(/[#*`\-•0-9.]/g, '')
      .trim()
      .slice(0, 55) || 'Aura Deep Focus Sprint';

    const currentTasks = JSON.parse(localStorage.getItem('focus-tasks') || '[]');
    const newTask = {
      id: Math.random().toString(36).substr(2, 9),
      title: title.toUpperCase(),
      priority: 'high',
      estimatedMinutes: 45,
      subtasks: [],
      done: false,
      created: Date.now()
    };
    localStorage.setItem('focus-tasks', JSON.stringify([newTask, ...currentTasks]));
    window.dispatchEvent(new CustomEvent('task-created'));
    window.dispatchEvent(new CustomEvent('tasksUpdated'));
  };

  const handleSubmitToGemini = async (query: string, autoSpeak = false) => {
    if (!query.trim()) return;
    setAiStatus('thinking');
    setChatSubmitting(true);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatHistory(prev => [...prev, { role: 'user', text: query, timestamp: timeStr }]);

    const key = typeof window !== 'undefined' ? localStorage.getItem('gemini-api-key') || '' : '';
    const model = getSelectedTextModel();
    const startTime = Date.now();

    try {
      let modePrompt = "";
      if (activeMode === 'Flow Architect') modePrompt = "Focus purely on flow states, time blocks, and optimal cognitive rhythms.";
      else if (activeMode === 'Task Atomizer') modePrompt = "Decompose any objective into atomic, actionable, 15-to-45 minute steps.";
      else if (activeMode === 'Strategy') modePrompt = "Provide executive, high-conviction decision frameworks and clarity.";

      const systemInstruction = `You are an executive AI assistant for Focus Forge. ${modePrompt}
Answer directly, clearly, and concisely in normal natural language. Provide direct factual responses without internal thinking drafts, persona breakdowns, or conversational fluff.`;

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          apiKey: key,
          model,
          systemInstruction,
        }),
      });

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      if (!response.ok || data.error) {
        recordAiUsage({
          model,
          error: data.error,
          latencyMs
        });
        throw new Error(data.error || 'Failed to connect to Gemini API. Please configure your key in Profile.');
      }

      const reply = data.reply || data.text || "I'm ready to assist your focus.";
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      recordAiUsage({
        model: data.model || model,
        inputTokens: data.usage?.promptTokens || Math.round(query.length / 4),
        outputTokens: data.usage?.completionTokens || Math.round(reply.length / 4),
        isFallback: data.isFallback,
        latencyMs
      });

      setChatHistory(prev => [...prev, { role: 'assistant', text: reply, timestamp: replyTime }]);
      setAiStatus('idle');

      if (autoSpeak || isHandsFreeVoice) {
        speakMessageText(reply, true);
      }
    } catch (err: any) {
      setAiStatus('error');
      const errTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChatHistory(prev => [...prev, { role: 'assistant', text: `⚠️ ${err.message || 'Gemini connection issue. Please configure your Gemini API Key in Profile.'}`, timestamp: errTime }]);
    } finally {
      setChatSubmitting(false);
    }
  };

  const formatInlineText = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-white tracking-tight">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-mono text-[11px] border border-white/10 mx-0.5">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const renderFormattedAiText = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 leading-relaxed font-sans text-xs md:text-sm">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1" />;
          
          if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
            const headerText = trimmed.replace(/^#+\s*/, '');
            return (
              <div key={idx} className="text-xs md:text-sm font-bold text-white tracking-wide mt-2.5 mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                <span className="metallic-gradient-text font-sans">{headerText}</span>
              </div>
            );
          }

          if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
            const bulletText = trimmed.replace(/^[-•*]\s*/, '');
            return (
              <div key={idx} className="flex items-start gap-2 pl-1 py-0.5 text-white/90">
                <span className="text-cyan-400 text-[9px] mt-1 shrink-0">◆</span>
                <span>{formatInlineText(bulletText)}</span>
              </div>
            );
          }

          const numMatch = trimmed.match(/^(\d+)\.\s*(.*)/);
          if (numMatch) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-1 py-0.5 text-white/90">
                <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-1 rounded border border-cyan-500/20 shrink-0 mt-0.5">
                  {numMatch[1]}
                </span>
                <span>{formatInlineText(numMatch[2])}</span>
              </div>
            );
          }

          return <p key={idx} className="text-white/90">{formatInlineText(line)}</p>;
        })}
      </div>
    );
  };

  // Click outside to minimize
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (islandRef.current && !islandRef.current.contains(e.target as Node)) {
        if (islandState === 'search' || islandState === 'shelf' || islandState === 'ai' || islandState === 'settings') {
          setIslandState('mini');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [islandState]);

  // physics profile matching the precise Apple-style interaction
  const customTween: any = {
     type: "spring",
     stiffness: 300,
     damping: 25
  };

  const getTransition = () => {
    if (isPreparingShoot) return { type: "spring", stiffness: 500, damping: 25 };
    if (isShooting) return { type: "tween", ease: "backIn", duration: 0.35 };
    if (islandState === 'search') return { type: "spring", stiffness: 400, damping: 30 };
    if (islandState === 'ai') return { type: "spring", stiffness: 360, damping: 28 };
    if (islandState === 'settings') return { type: "spring", stiffness: 380, damping: 28 };
    return customTween;
  };

  const getWidth = () => {
    if (isPreparingShoot) return 620; // Squash horizontally
    if (isShooting) return 6; // Tiny dot
    if (islandState === 'media-grand') return 380;
    if (islandState === 'media-mini') return 320;
    if (islandState === 'wiki') return 800;
    if (islandState === 'youtube') return 800;
    if (islandState === 'ai') return 680;
    if (islandState === 'settings') return typeof window !== 'undefined' ? Math.min(540, window.innerWidth - 24) : 540;
    if (jarvisStore.isOpen && (jarvisStore.isMinimized || jarvisStore.displayMode === 'minimized') && islandState === 'mini') return 58;
    if (islandState === 'mini') return 250;
    if (islandState === 'search') return 600;
    if (islandState === 'shelf') return 400;
    if (islandState === 'fog') return 320;
    if (islandState === 'syphon') return 340;
    if (islandState === 'frequency') return isIslandMusicExpanded ? 500 : 400;
    return 220;
  };

  const getHeight = () => {
    if (isPreparingShoot) return 40; // Squash vertically
    if (isShooting) return 60; // Stretch vertically while shooting up
    if (islandState === 'media-grand') return 460;
    if (islandState === 'media-mini') return 64;
    if (islandState === 'wiki') return 600;
    if (islandState === 'youtube') return 450;
    if (islandState === 'ai') return chatHistory.length > 0 ? 560 : 440;
    if (islandState === 'settings') return typeof window !== 'undefined' ? Math.min(680, window.innerHeight - 50) : 680;
    if (jarvisStore.isOpen && (jarvisStore.isMinimized || jarvisStore.displayMode === 'minimized') && islandState === 'mini') return 58;
    if (islandState === 'mini') return 40;
    if (islandState === 'search') {
      return 60 + (searchResults.length > 0 ? (Math.min(searchResults.length, 5) * 60 + 12) : 0);
    }
    if (islandState === 'shelf') return 300;
    if (islandState === 'fog') return 160;
    if (islandState === 'syphon') return 400;
    if (islandState === 'frequency') return isIslandMusicExpanded ? 220 : 64;
    return 40;
  };

  const getScale = () => {
    if (isPreparingShoot) return 0.95;
    if (isShooting) return 1;
    if (isDragOver) return 1.2;
    // Velocity Reactivity: Island stretches slightly based on typing speed
    if (ledgerVelocity > 0) return 1 + Math.min(ledgerVelocity / 1500, 0.05);
    return 1;
  };

  const getY = () => {
    if (isPreparingShoot) return 10; // Drop down slightly
    if (isShooting) return -400; // Shoot up offscreen
    return 0;
  };

  const getShadow = () => {
    if (isShooting) return "0 0 80px rgba(66, 133, 244, 1), 0 0 30px rgba(255, 255, 255, 1)";
    if (isPreparingShoot) return "0 10px 30px rgba(66, 133, 244, 0.8), 0 0 20px rgba(139, 92, 246, 0.8)";
    if (jarvisStore.isOpen && (jarvisStore.isMinimized || jarvisStore.displayMode === 'minimized') && islandState === 'mini') {
      return "0 8px 25px rgba(0, 0, 0, 0.7)";
    }
    if (islandState === 'ai') return "0 35px 80px rgba(0,0,0,0.85), 0 0 50px rgba(0, 240, 255, 0.15)";
    if (islandState === 'settings') return "0 30px 70px rgba(0,0,0,0.85), 0 0 40px rgba(255, 255, 255, 0.06)";
    if (islandState === 'search' && isGoogleMode) return "0 30px 60px rgba(0,0,0,0.6), 0 0 80px rgba(66, 133, 244, 0.4)";
    const isYouTubeMode = inputValue.startsWith('/yt');
    if ((islandState === 'search' && isYouTubeMode) || islandState === 'youtube') return "0 30px 60px rgba(0,0,0,0.6), 0 0 80px rgba(239, 68, 68, 0.5)";
    if (islandState === 'search' && !isGoogleMode && !isYouTubeMode) return "0 30px 60px rgba(0,0,0,0.6), 0 0 40px rgba(255,255,255,0.05)";
    if (islandState === 'fog') return "0 20px 60px rgba(0,0,0,0.5)";
    if (isDragOver) return "0 0 40px rgba(168, 85, 247, 0.8)"; 
    if (isStressed) return "0 0 30px rgba(239, 68, 68, 0.8)";
    // Velocity Pulse: Emerald glow when typing
    if (ledgerVelocity > 50) return `0 0 ${Math.min(ledgerVelocity / 5, 40)}px rgba(16, 185, 129, 0.3)`;
    return "0 10px 40px rgba(0, 0, 0, 0.3)"; 
  };

  if (view === 'pdf') return null;

  return (
    <>
      {/* Fog Background - Moved outside the island wrapper to cover fullscreen */}
      <AnimatePresence>
        {islandState === 'fog' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="fixed inset-0 z-[9998] pointer-events-auto flex items-center justify-center overflow-hidden"
            style={{ backdropFilter: 'blur(30px)' }}
          >
            <div className="absolute inset-0 bg-black/60" />
            
            {/* Atmospheric animated fog elements */}
            <div className="absolute w-[60vw] h-[60vw] rounded-full bg-blue-900/20 blur-[100px] animate-blob1" />
            <div className="absolute w-[50vw] h-[50vw] rounded-full bg-purple-900/20 blur-[120px] animate-blob2" />
            <div className="absolute w-[70vw] h-[70vw] rounded-full bg-emerald-900/10 blur-[150px] animate-blob3" />
            
            {/* Quote */}
            <motion.div 
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.5, duration: 1.5, ease: [0.32, 2, 0.55, 0.27] }}
               className="relative z-10 max-w-5xl text-center px-12"
            >
               <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl italic text-white/90 drop-shadow-2xl leading-tight opacity-80 mix-blend-overlay">
                 &ldquo;{kanyeQuote}&rdquo;
               </h1>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Outside Click Backdrop for Quick Settings */}
      <AnimatePresence>
        {islandState === 'settings' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIslandState('mini')}
            className="fixed inset-0 z-[9990] bg-black/50 backdrop-blur-sm pointer-events-auto"
          />
        )}
      </AnimatePresence>

      {/* Global Screen Dimmer Overlay for Brightness Control */}
      <div 
        id="maybach-screen-dimmer"
        className="fixed inset-0 bg-black pointer-events-none z-[9990] transition-opacity duration-300"
        style={{ opacity: Math.max(0, (100 - screenBrightness) / 100) }}
      />

      <div className="fixed top-6 left-0 right-0 z-[9999] flex justify-center pointer-events-none perspective-[1000px]">
        <style>{`
          @keyframes shine {
            to { background-position: 200% center; }
          }
          @keyframes island-shake {
            10%, 90% { transform: translate3d(-1px, 0, 0); }
            20%, 80% { transform: translate3d(2px, 0, 0); }
            30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
            40%, 60% { transform: translate3d(4px, 0, 0); }
          }
          @keyframes blob1 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
          }
          @keyframes blob2 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(-50px, 30px) scale(0.9); }
            66% { transform: translate(20px, -40px) scale(1.1); }
          }
          @keyframes blob3 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(40px, 40px) scale(1.2); }
            66% { transform: translate(-40px, -20px) scale(0.8); }
          }
          @keyframes rotate-gradient {
            to { background-position: 200% center; }
          }
          @keyframes border-flicker {
            0%, 100% { border-color: rgba(255,255,255,0.1); box-shadow: 0 0 0px transparent; }
            50% { border-color: rgba(255,255,255,0.9); box-shadow: 0 0 30px rgba(255,255,255,0.5); }
          }
          .animate-border-flicker { animation: border-flicker 0.15s infinite; }
          .animate-shine { animation: shine 4s linear infinite; }
          .animate-island-shake { animation: island-shake 0.5s cubic-bezier(.36,.07,.19,.97) infinite; }
          .animate-blob1 { animation: blob1 20s infinite alternate cubic-bezier(0.4, 0, 0.2, 1); }
          .animate-blob2 { animation: blob2 25s infinite alternate cubic-bezier(0.4, 0, 0.2, 1); }
          .animate-blob3 { animation: blob3 30s infinite alternate cubic-bezier(0.4, 0, 0.2, 1); }
          .google-glow-border {
            position: absolute;
            inset: 0;
            border-radius: inherit;
            padding: 2px;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6, #3b82f6, #8b5cf6, #3b82f6);
            background-size: 200% auto;
            animation: rotate-gradient 3s linear infinite;
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            pointer-events: none;
          }
          .google-glow-back1 {
             position: absolute;
             inset: -20px;
             border-radius: 60px;
             background: linear-gradient(90deg, rgba(59,130,246,0.8), rgba(139,92,246,0.8), rgba(59,130,246,0.8));
             background-size: 200% auto;
             animation: rotate-gradient 3s linear infinite;
             filter: blur(30px);
             z-index: -1;
          }
          .google-glow-back2 {
             position: absolute;
             inset: -40px;
             border-radius: 80px;
             background: linear-gradient(90deg, rgba(139,92,246,0.6), rgba(59,130,246,0.6), rgba(139,92,246,0.6));
             background-size: 200% auto;
             animation: rotate-gradient 4s linear infinite reverse;
             filter: blur(60px);
             z-index: -2;
             mix-blend-mode: screen;
          }
          .prismatic-glow-border {
            position: absolute;
            inset: 0;
            border-radius: inherit;
            padding: 1.5px;
            background: linear-gradient(90deg, #ffffff, #00f0ff, #8b5cf6, #ff7a00, #ffffff);
            background-size: 200% auto;
            animation: rotate-gradient 4s linear infinite;
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            pointer-events: none;
          }
          .prismatic-glow-back1 {
             position: absolute;
             inset: -15px;
             border-radius: 60px;
             background: linear-gradient(90deg, rgba(0,240,255,0.7), rgba(255,255,255,0.8), rgba(255,122,0,0.7), rgba(139,92,246,0.7));
             background-size: 200% auto;
             animation: rotate-gradient 5s linear infinite;
             filter: blur(25px);
             z-index: -1;
          }
          .prismatic-glow-back2 {
             position: absolute;
             inset: -30px;
             border-radius: 80px;
             background: linear-gradient(90deg, rgba(139,92,246,0.5), rgba(0,240,255,0.5), rgba(255,122,0,0.5), rgba(255,255,255,0.6));
             background-size: 200% auto;
             animation: rotate-gradient 6s linear infinite reverse;
             filter: blur(50px);
             z-index: -2;
             mix-blend-mode: screen;
          }
          .aura-glow-ring {
            position: absolute;
            inset: 0;
            border-radius: inherit;
            background: radial-gradient(circle at 20% 20%, rgba(56,189,248,0.18), transparent 22%),
                        radial-gradient(circle at 80% 24%, rgba(168,85,247,0.14), transparent 18%),
                        radial-gradient(circle at 50% 80%, rgba(56,189,248,0.08), transparent 24%);
            filter: blur(24px);
            opacity: 0.85;
            pointer-events: none;
          }
          .siri-wave {
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at 28% 18%, rgba(14,165,233,0.18), transparent 18%),
                        radial-gradient(circle at 75% 25%, rgba(168,85,247,0.16), transparent 18%),
                        radial-gradient(circle at 50% 55%, rgba(59,130,246,0.04), transparent 30%);
            filter: blur(18px);
            opacity: 0.75;
            animation: pulseGlow 9s ease-in-out infinite;
            pointer-events: none;
          }
          .expressive-beam-aura {
             position: absolute;
             inset: -3px;
             border-radius: 26px;
             background: linear-gradient(90deg, rgba(0, 240, 255, 0.9), rgba(255, 0, 128, 0.9), rgba(139, 92, 246, 0.9), rgba(0, 240, 255, 0.9));
             background-size: 300% 300%;
             animation: rotate-gradient 3s linear infinite;
             filter: blur(10px);
             opacity: 0.8;
             pointer-events: none;
             z-index: 0;
          }
          .voice-wave-bar {
             width: 3px;
             border-radius: 9999px;
             background: linear-gradient(180deg, #38bdf8, #a855f7);
             animation: voiceWave 1s ease-in-out infinite alternate;
          }
          @keyframes voiceWave {
             0% { height: 6px; opacity: 0.4; }
             50% { height: 22px; opacity: 1; }
             100% { height: 10px; opacity: 0.7; }
          }
          @keyframes neuralPulseGlow {
            0%, 100% { transform: scale(1); opacity: 0.7; filter: drop-shadow(0 0 16px rgba(34, 211, 238, 0.4)); }
            50% { transform: scale(1.08); opacity: 1; filter: drop-shadow(0 0 28px rgba(168, 85, 247, 0.6)); }
          }
          .neural-core-pulse {
            animation: neuralPulseGlow 4s ease-in-out infinite;
          }
          .hover\:animate-marquee:hover {
            animation: scroll-marquee 6s linear infinite;
          }
          @keyframes scroll-marquee {
            0% { transform: translateX(0%); }
            50% { transform: translateX(calc(-100% + 150px)); }
            100% { transform: translateX(0%); }
          }
          .hover\\:animate-marquee:hover {
            animation: scroll-marquee 6s linear infinite;
          }
        `}</style>

        {/* Background Glow Leak */}
        <AnimatePresence>
           {((islandState === 'search' && isGoogleMode && !isShooting) || isSiphoning || islandState === 'youtube' || islandState === 'ai' || (islandState === 'search' && inputValue.startsWith('/yt '))) && (
             <motion.div
               initial={{ opacity: 0, width: getWidth(), height: getHeight(), x: "-50%" }}
               animate={{ 
                 opacity: islandState === 'ai' ? 0.6 : 1, 
                 width: getWidth(), 
                 height: getHeight(), 
                 x: "-50%" 
               }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="absolute top-0 left-1/2 pointer-events-none z-[-1]"
               transition={{ ...getTransition(), opacity: { duration: 0.5, ease: "easeInOut" } }}
             >
               <div className={islandState === 'ai' ? "prismatic-glow-back1" : islandState === 'youtube' || inputValue.startsWith('/yt ') ? "youtube-glow-back1" : "google-glow-back1"} />
               <div className={islandState === 'ai' ? "prismatic-glow-back2" : islandState === 'youtube' || inputValue.startsWith('/yt ') ? "youtube-glow-back2" : "google-glow-back2"} />
             </motion.div>
           )}
        </AnimatePresence>

        <motion.div
          ref={islandRef}
          className={`pointer-events-auto overflow-hidden relative cursor-pointer group ${isStressed ? 'animate-island-shake' : ''} ${isFlickering ? 'animate-border-flicker' : ''}`}
          style={{
            background: isShooting ? '#fff' : (jarvisStore.isOpen && (jarvisStore.isMinimized || jarvisStore.displayMode === 'minimized') && islandState === 'mini')
              ? "#000000"
              : islandState === 'ai' 
              ? "linear-gradient(135deg, rgba(12, 12, 16, 0.75) 0%, rgba(18, 18, 26, 0.65) 100%)"
              : islandState === 'settings'
              ? "linear-gradient(135deg, rgba(12, 12, 15, 0.95) 0%, rgba(18, 18, 24, 0.92) 100%)"
              : inputTint 
              ? `linear-gradient(135deg, rgba(20,20,20,0.6) 0%, ${inputTint}40 100%)`
              : "rgba(20, 20, 20, 0.5)",
            backdropFilter: islandState === 'search' || islandState === 'ai' || islandState === 'settings' || (jarvisStore.isOpen && (jarvisStore.isMinimized || jarvisStore.displayMode === 'minimized') && islandState === 'mini') ? "blur(40px) saturate(180%)" : "blur(20px) saturate(160%)",
            WebkitBackdropFilter: islandState === 'search' || islandState === 'ai' || islandState === 'settings' || (jarvisStore.isOpen && (jarvisStore.isMinimized || jarvisStore.displayMode === 'minimized') && islandState === 'mini') ? "blur(40px) saturate(180%)" : "blur(20px) saturate(160%)",
            borderRadius: isShooting ? 20 : (jarvisStore.isOpen && (jarvisStore.isMinimized || jarvisStore.displayMode === 'minimized') && islandState === 'mini') ? 9999 : (islandState === 'ai' || islandState === 'settings') ? 32 : (islandState === 'shelf' || islandState === 'fog') ? 32 : 40,
            border: isStressed ? "1px solid rgba(239, 68, 68, 0.8)" : 
                    (jarvisStore.isOpen && (jarvisStore.isMinimized || jarvisStore.displayMode === 'minimized') && islandState === 'mini') ? "1px solid rgba(255, 255, 255, 0.12)" :
                    islandState === 'ai' ? "1px solid rgba(255, 255, 255, 0.15)" :
                    islandState === 'settings' ? "1px solid rgba(255, 255, 255, 0.18)" :
                    ((islandState === 'search' && (isGoogleMode || inputValue.startsWith('/yt '))) || isShooting || isSiphoning || islandState === 'youtube') ? "1px solid transparent" : 
                    "0.5px solid rgba(255, 255, 255, 0.2)",
            boxShadow: getShadow(),
          }}
          initial={false}
          animate={{
            width: getWidth(),
            height: getHeight(),
            scale: getScale(),
            x: 0,
            y: getY(),
          }}
          transition={getTransition()}
          onClick={() => {
            if (jarvisStore.isOpen && (jarvisStore.isMinimized || jarvisStore.displayMode === 'minimized') && islandState === 'mini') {
              jarvisStore.setDisplayMode('expanded');
              setIslandState('ai');
            }
            else if (islandState === 'mini') setIslandState('search');
            else if (islandState === 'search') setIslandState('shelf');
            else if (islandState === 'frequency') setIsIslandMusicExpanded(!isIslandMusicExpanded);
          }}
        >
        <AnimatePresence>
           {((islandState === 'search' && isGoogleMode && !isShooting) || isSiphoning || islandState === 'youtube' || (islandState === 'search' && inputValue.startsWith('/yt '))) && (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               transition={{ duration: 0.5, ease: "easeInOut" }}
               className={islandState === 'youtube' || inputValue.startsWith('/yt ') ? "youtube-glow-border z-0" : "google-glow-border z-0"} 
             />
           )}
        </AnimatePresence>

        {/* State A: Mini */}
        <AnimatePresence mode="wait">
          {/* State: Frequency (Music Pill) */}
          {islandState === 'frequency' && (
            <motion.div
              key="frequency"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={`w-full h-full flex ${isIslandMusicExpanded ? 'flex-col justify-between p-6' : 'items-center justify-between px-4'}`}
            >
              {isIslandMusicExpanded ? (
                <>
                  {/* Top Bar: Art and Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-2xl">
                      <img src={frequencyStore.getCurrentTrack()?.thumbnail} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-lg font-bold text-white/90 truncate">{frequencyStore.getCurrentTrack()?.title}</span>
                      <span className="text-sm text-white/40 truncate">{frequencyStore.getCurrentTrack()?.artist}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setIslandState('search'); }}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all animate-pulse"
                        title="Search Portal"
                      >
                        <Search size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setIslandState('shelf'); }}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all"
                        title="Open Shelf Dashboard"
                      >
                        <Activity size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setIsIslandMusicExpanded(false); }}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all"
                        title="Collapse"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden cursor-pointer">
                      <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: frequencyStore.duration > 0 ? `${Math.min(100, Math.max(0, (frequencyStore.currentTime / frequencyStore.duration) * 100))}%` : '0%' }} />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-white/20">
                      <span>{formatTime(frequencyStore.currentTime)}</span>
                      <span>{formatTime(frequencyStore.duration)}</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between">
                    <button onClick={(e) => { e.stopPropagation(); frequencyStore.toggleShuffle(); }} className={`transition-colors ${frequencyStore.shuffle ? 'text-purple-400' : 'text-white/20 hover:text-white/50'}`}>
                      <Shuffle size={16} />
                    </button>
                    <div className="flex items-center gap-6">
                      <button onClick={(e) => { e.stopPropagation(); frequencyStore.previous(); }} className="text-white/40 hover:text-white transition-colors">
                        <SkipBack size={20} fill="currentColor" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); frequencyStore.togglePlay(); }} className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform">
                        {frequencyStore.isPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" className="ml-0.5" />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); frequencyStore.next(); }} className="text-white/40 hover:text-white transition-colors">
                        <SkipForward size={20} fill="currentColor" />
                      </button>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); frequencyStore.cycleRepeat(); }} className={`transition-colors ${frequencyStore.repeat !== 'none' ? 'text-purple-400' : 'text-white/20 hover:text-white/50'}`}>
                      {frequencyStore.repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10">
                      <img src={frequencyStore.getCurrentTrack()?.thumbnail} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white/90 truncate max-w-[150px]">{frequencyStore.getCurrentTrack()?.title}</span>
                      <span className="text-[10px] text-white/40 truncate max-w-[150px]">{frequencyStore.getCurrentTrack()?.artist}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIslandState('search'); }}
                      className="text-white/50 hover:text-white transition-colors"
                      title="Search Portal"
                    >
                      <Search size={14} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIslandState('shelf'); }}
                      className="text-white/50 hover:text-white transition-colors"
                      title="Open Shelf Dashboard"
                    >
                      <Activity size={14} />
                    </button>
                    <div className="w-[1px] h-3 bg-white/10 mx-1" />
                    <button onClick={(e) => { e.stopPropagation(); frequencyStore.togglePlay(); }} className="text-white/70 hover:text-white transition-colors">
                      {frequencyStore.isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); frequencyStore.next(); }} className="text-white/70 hover:text-white transition-colors">
                      <SkipForward size={16} />
                    </button>
                    {frequencyStore.getCurrentTrack() && (
                      <button onClick={(e) => { e.stopPropagation(); frequencyStore.setExpanded(true); }} className="text-white/70 hover:text-white transition-colors" title="Open full-screen player">
                        <Maximize2 size={16} />
                      </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'place' } })); }} 
                      className="text-white/30 hover:text-white transition-colors ml-1"
                    >
                      <ArrowUp size={14} />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {islandState === 'mini' && (
            <motion.div
              key={jarvisStore.isOpen && (jarvisStore.isMinimized || jarvisStore.displayMode === 'minimized') ? "jarvis-orb" : "mini"}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className={`w-full h-full flex items-center ${
                jarvisStore.isOpen && (jarvisStore.isMinimized || jarvisStore.displayMode === 'minimized') 
                  ? 'justify-center p-0 overflow-hidden' 
                  : 'justify-between px-3'
              }`}
            >
              {jarvisStore.isOpen && (jarvisStore.isMinimized || jarvisStore.displayMode === 'minimized') ? (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    jarvisStore.setDisplayMode('expanded');
                    setIslandState('ai');
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    jarvisStore.setDisplayMode('fullscreen');
                  }}
                  className="relative w-full h-full rounded-full flex items-center justify-center cursor-pointer group select-none overflow-hidden"
                  title="J.A.R.V.I.S. Neural Core (Click to Expand • Double-click for Fullscreen)"
                >
                  {/* Pure SiriWave & Fluid-Dots Core */}
                  <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center pointer-events-none">
                    <SiriWave
                      variant={jarvisStore.aiState === 'thinking' || jarvisStore.voiceState === 'PROCESSING_COMMAND' ? 'fluid-dots' : 'wave'}
                      size={58}
                      renderScale={1.0}
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    {isSyncingLedger || ledgerVelocity > 0 ? (
                      <div className="flex items-center gap-4">
                        {isSyncingLedger && (
                          <div className="flex items-center gap-2">
                            <motion.div 
                              animate={{ rotate: 360 }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            >
                              <MaybachLogo size={12} className="text-white/40" />
                            </motion.div>
                            <span className="text-[9px] font-bold text-white/40 tracking-[0.2em] uppercase">Syncing</span>
                          </div>
                        )}
                        {ledgerVelocity > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="w-[1px] h-3 bg-white/10" />
                            <span className="text-[9px] font-bold text-white/60 tracking-[0.2em] uppercase">{ledgerVelocity} WPM</span>
                            <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                               <motion.div 
                                 className="h-full bg-white shadow-[0_0_8px_white]" 
                                 animate={{ width: `${Math.min(ledgerVelocity, 120) / 1.2}%` }}
                               />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center">
                          <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-20" />
                          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)]" />
                        </div>
                        <span className="text-xs font-semibold text-white/90 tracking-wide font-sans">{time}</span>
                        {currentSegmentIndex > 0 && (
                          <div className="flex items-center gap-3">
                            <div className="w-[1px] h-3 bg-white/10" />
                            <span className="text-[9px] font-bold metallic-gradient-text tracking-[0.3em] uppercase">
                              SEQ // {String(currentSegmentIndex).padStart(2, '0')} OF {String(totalSegments).padStart(2, '0')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                     <button 
                      onClick={(e) => { e.stopPropagation(); useJarvisStore.getState().openJarvis(); }} 
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-all bg-cyan-500/10 hover:bg-cyan-400 text-cyan-400 hover:text-black border border-cyan-500/30 hover:border-cyan-300 relative group shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                      title="J.A.R.V.I.S. Voice AI (Say 'JARVIS')"
                    >
                       <Mic size={12} className="group-hover:scale-110 transition-transform" />
                       <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_4px_#22d3ee]" />
                     </button>
                     <button 
                      onClick={(e) => { e.stopPropagation(); setIslandState('ai'); }} 
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-all bg-white/5 text-cyan-400 hover:text-cyan-300 hover:bg-white/10 relative group"
                      title="Ask Aura AI Copilot (Ctrl+I)"
                    >
                       <Sparkles size={13} className="animate-pulse" />
                     </button>
                     <button 
                      onClick={(e) => { e.stopPropagation(); setIslandState('settings'); }} 
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-all text-white/50 hover:text-white hover:bg-white/10"
                      title="Quick Settings (Ctrl+,)"
                    >
                       <SlidersHorizontal size={13} strokeWidth={1.5} />
                     </button>
                     <button 
                      onClick={(e) => { e.stopPropagation(); setIslandState('search'); }} 
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-all text-white/50 hover:text-white hover:bg-white/10"
                      title="Search (Ctrl+K)"
                    >
                       <Search size={13} strokeWidth={1.5} />
                     </button>
                  </div>
                </>
              )}
            </motion.div>
          )}



          {/* State B: Search (Portal Mode) */}
          {islandState === 'search' && !isShooting && (
            <motion.div
              key="search"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full flex flex-col relative z-10"
            >
              {/* Search Header */}
              {isSiphoning ? (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-3xl rounded-inherit overflow-hidden">
                    <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/30 via-black to-black opacity-80" />
                    <motion.div 
                      className="absolute inset-0 flex flex-col items-center justify-center z-10"
                    >
                      {/* Rotating holographic rings */}
                      <div className="relative w-28 h-28 flex items-center justify-center perspective-[800px]">
                        <motion.div 
                           animate={{ rotateX: [0, 360], rotateY: [0, 180] }} 
                           transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                           className="absolute rounded-full border border-cyan-400/40 w-full h-full shadow-[inset_0_0_20px_rgba(34,211,238,0.2)]"
                        />
                        <motion.div 
                           animate={{ rotateY: [0, -360], rotateZ: [0, 180] }} 
                           transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                           className="absolute rounded-full border border-purple-500/60 w-24 h-24 shadow-[0_0_30px_rgba(168,85,247,0.4)]"
                        />
                        <motion.div 
                           animate={{ rotateZ: [0, 360] }} 
                           transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                           className="absolute rounded-full border-2 border-t-blue-400 border-r-transparent border-b-blue-500 border-l-transparent w-16 h-16"
                        />
                        <BookOpen className="text-white/80 absolute w-6 h-6 animate-pulse" />
                      </div>

                      {/* Text scanning effect */}
                      <div className="absolute flex flex-col items-center gap-2 mt-48 z-20 pointer-events-none">
                         <div className="text-[10px] uppercase tracking-[0.4em] font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 animate-pulse">
                           Extracting Knowledge
                         </div>
                         <div className="w-56 h-1 bg-white/10 rounded-full overflow-hidden relative">
                           <motion.div 
                              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-400 to-purple-500 shadow-[0_0_10px_rgba(59,130,246,1)]" 
                              initial={{ width: "0%" }} 
                              animate={{ width: "100%" }} 
                              transition={{ duration: 1.8, ease: "anticipate" }} 
                           />
                         </div>
                      </div>

                      {/* Quantum Particles */}
                      {Array.from({length: 30}).map((_, i) => (
                         <motion.div
                            key={i}
                            className="absolute rounded-full bg-white blend-screen"
                            style={{ 
                              width: (i % 3) + 2 + 'px',
                              height: (i % 3) + 2 + 'px',
                              background: i % 3 === 0 ? '#22d3ee' : i % 3 === 1 ? '#c084fc' : '#ffffff',
                              boxShadow: `0 0 ${Math.random() * 10 + 5}px currentColor`
                            }}
                            initial={{ 
                               x: 0, 
                               y: 0, 
                               scale: 0, 
                               opacity: 0,
                            }}
                            animate={{
                               x: (Math.random() - 0.5) * 300,
                               y: (Math.random() - 0.5) * 150,
                               scale: [0, Math.random() + 1, 0],
                               opacity: [0, 0.8, 0]
                            }}
                            transition={{ 
                               duration: 1 + Math.random(), 
                               repeat: Infinity, 
                               ease: "easeInOut",
                               delay: Math.random()
                            }}
                         />
                      ))}
                    </motion.div>
                 </div>
              ) : (
                <>
                <div className="h-[60px] flex flex-col justify-center px-5 shrink-0 relative">
                  <div className="absolute top-[8px] left-5 text-[8px] font-extrabold tracking-[0.2em] uppercase metallic-gradient-text animate-shine opacity-60 pointer-events-none">
                     Everything Island
                  </div>
                  <div className="mt-3 flex w-full items-center gap-4 relative">
                     <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 relative">
                       <AnimatePresence mode="popLayout">
                         {isGoogleMode ? (
                            <motion.div 
                              key="google-icon"
                              initial={{ scale: 0, rotate: -180, opacity: 0 }}
                              animate={{ scale: 1, rotate: 0, opacity: 1 }}
                              exit={{ scale: 0, rotate: 180, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 300, damping: 20 }}
                              className="absolute inset-0 rounded-full bg-white flex items-center justify-center"
                            >
                               <span className="text-black font-extrabold text-[10px]">G</span>
                            </motion.div>
                         ) : (
                            <motion.div
                              key="search-icon"
                              initial={{ scale: 0, rotate: 180, opacity: 0 }}
                              animate={{ scale: 1, rotate: 0, opacity: 1 }}
                              exit={{ scale: 0, rotate: -180, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 300, damping: 20 }}
                              className="absolute inset-0 flex items-center justify-center"
                            >
                              <Search size={18} className="text-white/60" strokeWidth={1.5} />
                            </motion.div>
                         )}
                       </AnimatePresence>
                     </div>
                     <input
                         autoFocus
                         type="text"
                         placeholder="Search internal or type /g for web..."
                         value={inputValue}
                         onChange={(e) => setInputValue(e.target.value)}
                         onKeyDown={handleInputKeyDown}
                         onClick={(e) => e.stopPropagation()}
                         className="bg-transparent border-none outline-none text-white w-full text-[17px] font-medium placeholder:text-white/30 tracking-tight"
                     />
                     <button
                       onClick={(e) => { e.stopPropagation(); setIslandState('shelf'); }}
                       className="text-white/40 hover:text-white transition-colors flex-shrink-0"
                       title="Open Shelf Dashboard"
                     >
                       <Activity size={16} strokeWidth={1.5} />
                     </button>
                  </div>
                </div>

                {searchResults.length > 0 && (
                   <div className="flex-1 px-3 pb-3 overflow-hidden flex flex-col gap-1">
                     {searchResults.map((res, i) => (
                       <motion.div 
                         key={i}
                         initial={{ opacity: 0, scale: 0.98, y: 10 }}
                         animate={{ opacity: 1, scale: 1, y: 0 }}
                         transition={{ duration: 0.3, delay: i * 0.04, ease: [0.32, 2, 0.55, 0.27] }}
                         onClick={(e) => { e.stopPropagation(); executeSearchAction(res); }}
                         onMouseEnter={() => setSelectedIndex(i)}
                         className={`flex items-center gap-4 px-4 h-[56px] rounded-2xl transition-all duration-300 cursor-pointer relative overflow-hidden group ${
                           selectedIndex === i 
                             ? 'bg-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] ring-1 ring-white/10 scale-[0.99] z-10' 
                             : 'hover:bg-white/5 opacity-80 hover:opacity-100 z-0'
                         }`}
                       >
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300 ${selectedIndex === i ? 'bg-white/10 border-white/20 shadow-inner' : 'bg-white/5 border-white/5'}`}>
                             {res.type === 'route' && <ArrowUp size={16} className={selectedIndex === i ? "text-blue-300" : "text-blue-400"} style={{ transform: 'rotate(45deg)' }} />}
                             {res.type === 'task' && <CheckSquare size={16} className={selectedIndex === i ? "text-emerald-300" : "text-emerald-400"} />}
                             {res.type === 'note' && <FileText size={16} className={selectedIndex === i ? "text-yellow-300" : "text-yellow-400"} />}
                             {res.type === 'google' && <Globe size={16} className={selectedIndex === i ? "text-rose-300" : "text-rose-400"} />}
                             {res.type === 'media' && <Play size={16} className={selectedIndex === i ? "text-purple-300" : "text-purple-400 fill-current"} />}
                          </div>
                          <div className="flex flex-col justify-center min-w-0">
                            <span className={`text-[15px] font-medium leading-tight truncate transition-colors duration-300 ${selectedIndex === i ? 'text-white' : 'text-white/80'}`}>{res.title}</span>
                            {res.subtitle && <span className="text-xs text-white/40 leading-tight truncate mt-0.5">{res.subtitle}</span>}
                          </div>
                       </motion.div>
                     ))}
                   </div>
                )}
                </>
              )}
            </motion.div>
          )}

          {/* State: Syphon (Syllabus Tracker) */}
          {islandState === 'syphon' && (
            <motion.div
              key="syphon"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full h-full flex flex-col p-6 z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-400/20 flex items-center justify-center border border-cyan-400/30">
                    <Target size={16} className="text-cyan-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30">Currently Studying</span>
                    <h3 className="text-xl font-heading font-extrabold text-white lowercase tracking-tight truncate max-w-[180px]">
                      {currentSyllabusTopic}
                    </h3>
                  </div>
                </div>
                <button 
                  onClick={() => setIslandState('mini')}
                  className="p-2 text-white/20 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-2">
                {syllabusSubtopics.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <Zap size={32} className="text-white/10 mb-2" />
                    <p className="text-xs text-white/20 font-mono">No subtopics defined for this node.</p>
                  </div>
                ) : (
                  syllabusSubtopics.map((st: any) => (
                    <motion.div 
                      key={st.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 bg-white/5 border border-white/5 p-3 rounded-2xl group hover:bg-white/10 transition-all"
                    >
                      <div 
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${st.completed ? 'bg-cyan-400 border-cyan-400' : 'border-white/20 group-hover:border-white/40'}`}
                        onClick={() => {
                          const updated = syllabusSubtopics.map(item => item.id === st.id ? { ...item, completed: !item.completed } : item);
                          setSyllabusSubtopics(updated);
                        }}
                      >
                        {st.completed && <Check size={12} className="text-black" />}
                      </div>
                      <span className={`text-sm font-bold flex-1 ${st.completed ? 'text-white/30 line-through' : 'text-white/80'}`}>
                        {st.title}
                      </span>
                    </motion.div>
                  ))
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-white/5">
                <button 
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'tasks' } }));
                    setIslandState('mini');
                  }}
                  className="w-full bg-white/5 hover:bg-white/10 text-white/60 py-3 rounded-xl text-[10px] font-mono uppercase tracking-[0.2em] transition-all"
                >
                  Back to Syllabus Hub
                </button>
              </div>
            </motion.div>
          )}

          {/* State C: Shelf */}
          {islandState === 'shelf' && (
            <motion.div
              key="shelf"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="w-full h-full flex flex-col p-6 relative"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-extrabold tracking-[0.2em] text-xs uppercase metallic-gradient-text animate-shine">EVERYTHING ISLAND</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIslandState('settings'); }} 
                    title="Quick Settings (Ctrl+,)" 
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-all bg-white/5 text-white/50 hover:text-white"
                  >
                    <SlidersHorizontal size={14} strokeWidth={1.5} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIslandState('fog'); }} 
                    title="Enter Deep Fog (Alt+Shift+F)" 
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-all bg-white/5 text-white/50 hover:text-white"
                  >
                    <CloudFog size={14} strokeWidth={1.5} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsStressed(!isStressed); }} 
                    title="Stress Test (System Pulse)" 
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isStressed ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-white/5 text-white/50 hover:text-white'}`}
                  >
                    <Flame size={14} strokeWidth={isStressed ? 2.5 : 1.5} />
                  </button>
                </div>
              </div>
              
              <div className="flex gap-5 border-b border-white/10 pb-3 mb-5">
                {[
                  { id: 'notes', label: 'Notes' },
                  { id: 'tasks', label: 'Tasks' },
                  { id: 'market', label: 'Market' },
                  { id: 'weather', label: 'Weather' }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={(e) => { e.stopPropagation(); setActiveTab(tab.id as any); }}
                    className={`text-sm font-semibold transition-colors relative ${activeTab === tab.id ? 'text-white after:absolute after:bottom-[-13px] after:left-0 after:w-full after:h-[2px] after:bg-white' : 'text-white/40 hover:text-white/70'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
                {activeTab === 'notes' && (
                  <textarea 
                    value={notes}
                    onChange={handleNotesChange}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Capture thoughts instantly..."
                    className="w-full h-full min-h-[180px] bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-white/20 resize-none font-sans placeholder:text-white/30"
                  />
                )}

                {activeTab === 'tasks' && (
                  <div className="flex flex-col h-full space-y-3">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                      <Plus size={16} className="text-white/40" />
                      <input 
                        type="text" 
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={handleAddTask}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Add new task... (Press Enter)"
                        className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-white/30"
                      />
                    </div>
                    <div className="space-y-2 flex-1 overflow-y-auto no-scrollbar pb-2">
                      {tasks.length === 0 ? (
                        <div className="text-center text-white/40 text-sm py-8 font-sans font-medium">No tasks found.</div>
                      ) : (
                        tasks.map(task => (
                          <div 
                            key={task.id} 
                            onClick={(e) => toggleTask(task.id, e)}
                            className={`bg-white/5 border border-white/10 rounded-xl p-3 flex gap-3 items-center group hover:bg-white/10 transition-colors cursor-pointer ${task.done ? 'opacity-50' : ''}`}
                          >
                            <div className={`w-5 h-5 flex-shrink-0 rounded flex items-center justify-center border transition-colors ${task.done ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-white/30 text-transparent'}`}>
                              <CheckSquare size={14} className={task.done ? "fill-current" : ""} />
                            </div>
                            <div className={`text-sm font-medium flex-1 truncate ${task.done ? 'line-through text-white/50' : 'text-white'}`}>
                              {task.title}
                            </div>
                            <button 
                              onClick={(e) => removeTask(task.id, e)}
                              className="w-7 h-7 rounded-md flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'market' && (
                  <div className="w-full h-[200px] bg-black/40 rounded-2xl overflow-hidden border border-white/10 relative">
                    <div ref={tradingViewRef} className="tradingview-widget-container absolute top-0 left-0 w-full h-full" />
                  </div>
                )}

                {activeTab === 'weather' && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center gap-4 h-[200px] relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-[-50%] left-[-10%] w-[150%] h-[150%] bg-gradient-to-br from-blue-500/10 to-transparent blur-3xl pointer-events-none" />
                    
                    {weatherLoading ? (
                      <div className="text-white/40 text-sm font-medium animate-pulse">Scanning atmosphere...</div>
                    ) : weatherData ? (
                      <>
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/10">
                          <MapPin size={12} className="text-white/60" />
                          <span className="text-xs font-semibold text-white/90">{weatherData.city || 'Local Sector'}</span>
                        </div>
                        
                        <div className="flex items-center gap-6 mt-2 relative z-10">
                          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/5 border border-white/10 shadow-inner">
                            {weatherData.code <= 3 ? <Sun size={32} className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" /> : 
                             weatherData.code <= 48 ? <Cloud size={32} className="text-blue-200" /> : 
                             weatherData.code <= 69 ? <CloudRain size={32} className="text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]" /> : 
                             weatherData.code <= 79 ? <CloudSnow size={32} className="text-white" /> : 
                             <CloudLightning size={32} className="text-purple-400 drop-shadow-[0_0_10px_rgba(192,132,252,0.5)]" />}
                          </div>
                          
                          <div className="flex flex-col">
                            <div className="flex items-start">
                              <span className="text-5xl font-black tracking-tighter text-white drop-shadow-md">
                                {Math.round(weatherData.temp)}
                              </span>
                              <span className="text-xl font-bold text-white/50 mt-1">°C</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-white/50 font-medium mt-1">
                              <Wind size={12} />
                              <span>{weatherData.windspeed} km/h</span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-white/40 text-sm font-medium">Telemetry unavailable.</div>
                    )}
                  </div>
                )}


              </div>
            </motion.div>
          )}
          {/* State D: Fog Timer */}
          {islandState === 'fog' && (
            <motion.div
              key="fog"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="w-full h-full flex flex-col p-5 relative"
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${fogTimerRunning ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`} />
                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Focus Mode</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setIslandState('mini'); }}
                  className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <div className="font-mono text-4xl font-light tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                  {Math.floor(fogTimer / 60).toString().padStart(2, '0')}:{(fogTimer % 60).toString().padStart(2, '0')}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFogTimerRunning(!fogTimerRunning); }}
                  className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
                >
                  {fogTimerRunning ? <Square size={16} className="fill-current" /> : <Play size={18} className="fill-current ml-1" />}
                </button>
              </div>

              <input
                type="text"
                placeholder="Quick focus note..."
                value={fogNote}
                onChange={(e) => setFogNote(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-colors"
              />
            </motion.div>
          )}
          {/* State E: Wikipedia Reader (Knowledge Monolith) */}
          {islandState === 'wiki' && (
            <motion.div
              key="wiki"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full flex flex-col p-6 overflow-hidden relative"
            >
              <div className="flex justify-between items-center mb-4 shrink-0">
                 <div className="flex items-center gap-2">
                    <Globe size={16} className="text-white/50" />
                    <span className="text-xs font-bold text-white/50 tracking-widest uppercase">Knowledge Monolith</span>
                 </div>
                 <button
                    onClick={(e) => { e.stopPropagation(); setIslandState('mini'); }}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all shadow-inner"
                 >
                    <X size={14} />
                 </button>
              </div>

              {wikiData && (
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col pointer-events-auto"
                     onClick={(e) => e.stopPropagation()}>
                  {/* Velocity Indicator */}
            {ledgerVelocity > 20 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute -right-2 -top-2 px-2 py-0.5 bg-emerald-500 rounded-full flex items-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
              >
                <Activity size={8} className="text-white animate-pulse" />
                <span className="text-[7px] font-black text-white uppercase tracking-tighter">{ledgerVelocity} WPM</span>
              </motion.div>
            )}
            
            <AnimatePresence mode="wait">
                    <motion.div
                      key={wikiData.title}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h1 className="text-3xl lg:text-4xl font-extrabold mb-6 tracking-tight metallic-gradient-text" style={{ WebkitTextStroke: '1.5px rgba(255,255,255,0.1)' }}>
                        {wikiData.title}
                      </h1>
                      
                      {wikiData.thumbnail && (
                        <div className="mb-6 rounded-xl overflow-hidden shadow-2xl relative inline-block p-1 bg-gradient-to-br from-white/10 to-white/0 border border-white/5">
                           <div className="absolute inset-0 blur-2xl opacity-40 bg-zinc-500 pointer-events-none" />
                           <img 
                             src={wikiData.thumbnail.source} 
                             alt={wikiData.title} 
                             className="relative z-10 max-h-64 object-contain rounded-lg border border-white/10" 
                           />
                        </div>
                      )}

                      <div 
                        className="text-[#a1a1a1] leading-relaxed text-sm lg:text-base font-serif wiki-content"
                        dangerouslySetInnerHTML={{ __html: wikiData.extract_html }}
                        onClick={handleWikiHtmlClick}
                      />
                    </motion.div>
                  </AnimatePresence>

                  <div className="mt-8 pt-4 border-t border-white/10">
                     <button
                        onClick={saveWikiToLibrary}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/80 hover:text-white text-sm font-bold uppercase transition-all active:scale-95"
                     >
                       <BookOpen size={16} /> Save to Archive
                     </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}



          {/* State: JARVIS Expanded Island Mode (Mode 2) */}
          {islandState === 'ai' && (
            <motion.div
              key="ai-morphed"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full h-full flex flex-col p-5 md:p-6 relative overflow-hidden bg-[#050608]/95 border border-cyan-500/25 backdrop-blur-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(6,182,212,0.15)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* JARVIS High-Precision Header */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10 shrink-0 relative z-20">
                <div className="flex items-center gap-2.5">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden border border-cyan-400/40 bg-black/80 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.35)]">
                    <SiriWave
                      variant={jarvisStore.aiState === 'thinking' || aiStatus === 'thinking' ? 'fluid-dots' : 'wave'}
                      size={44}
                      renderScale={0.7}
                      className="w-full h-full object-cover scale-125 pointer-events-none"
                    />
                  </div>
                  <div className="h-4 w-[1px] bg-white/20" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-extrabold tracking-tight text-sm lowercase text-white flex items-center gap-1">
                        jarvis<span className="text-cyan-400">.</span>copilot
                      </h3>
                      <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 uppercase font-bold tracking-widest">
                        Island Mode
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-mono text-white/40 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        jarvisStore.aiState === 'speaking' || isSpeakingAi
                          ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.9)]' 
                          : jarvisStore.aiState === 'listening' || isDictatingPrompt 
                          ? 'bg-rose-400 animate-ping shadow-[0_0_8px_rgba(248,113,113,0.9)]' 
                          : jarvisStore.aiState === 'thinking' || aiStatus === 'thinking' 
                          ? 'bg-purple-400 animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.9)]' 
                          : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                      }`} />
                      <span className="tracking-wider uppercase">
                        {jarvisStore.aiState === 'speaking' || isSpeakingAi 
                          ? 'VOICE NARRATION LIVE' 
                          : jarvisStore.aiState === 'listening' || isDictatingPrompt 
                          ? 'LISTENING TO DIRECTIVE' 
                          : jarvisStore.aiState === 'thinking' || aiStatus === 'thinking' 
                          ? 'PROCESSING COGNITION' 
                          : 'NEURAL LINK ACTIVE'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Top Action Pills */}
                <div className="flex items-center gap-1.5">
                  {/* Model Selector Pill */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowModelDropdown(!showModelDropdown);
                        setShowModeDropdown(false);
                      }}
                      className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-mono tracking-wider uppercase text-white/70 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                      title="Select Gemini Architecture"
                    >
                      <span className="w-1 h-1 rounded-full bg-cyan-400" />
                      <span>{activeModel.replace('gemini-', '')}</span>
                      <ChevronDown size={10} className="opacity-50" />
                    </button>

                    {showModelDropdown && (
                      <div className="absolute top-8 right-0 z-50 w-52 rounded-xl bg-black/95 border border-white/15 shadow-2xl p-1 space-y-0.5 backdrop-blur-2xl ring-1 ring-white/5 animate-fade-in">
                        {[
                          { id: 'gemini-3.7-flash', label: '3.7 FLASH', tag: 'LATEST REASONING' },
                          { id: 'gemini-3.6-flash', label: '3.6 FLASH', tag: 'TURBO' },
                          { id: 'gemini-3.0-pro', label: '3.0 PRO', tag: 'COMPLEX LOGIC' },
                          { id: 'gemini-2.5-flash', label: '2.5 FLASH', tag: 'FAST & PROVEN' },
                          { id: 'gemini-2.0-flash', label: '2.0 FLASH', tag: 'REALTIME' }
                        ].map((m) => (
                          <button
                            key={m.id}
                            onClick={() => {
                              setActiveModel(m.id);
                              localStorage.setItem('gemini-model', m.id);
                              setShowModelDropdown(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-colors flex items-center justify-between cursor-pointer ${
                              activeModel === m.id ? 'bg-white/10 text-white font-bold border border-white/15' : 'text-white/60 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <div className="flex flex-col">
                              <span>{m.label}</span>
                              <span className="text-[8px] text-white/30 tracking-widest">{m.tag}</span>
                            </div>
                            {activeModel === m.id && <Check size={11} className="text-cyan-400" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Mode 1 Switcher: Minimize to Island Capsule */}
                  <button
                    onClick={() => {
                      jarvisStore.setDisplayMode('minimized');
                      setIslandState('mini');
                    }}
                    className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
                    title="Minimize to Island Capsule (Mode 1)"
                  >
                    <Minimize2 size={12} />
                  </button>

                  {/* Mode 3 Switcher: Expand to Fullscreen HUD */}
                  <button
                    onClick={() => {
                      jarvisStore.setDisplayMode('fullscreen');
                    }}
                    className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-cyan-300 transition-all cursor-pointer"
                    title="Expand to Fullscreen Neural HUD (Mode 3)"
                  >
                    <Maximize2 size={12} />
                  </button>

                  {/* Reset Stream */}
                  {(chatHistory.length > 0 || jarvisStore.messages.length > 1) && (
                    <button
                      onClick={() => {
                        setChatHistory([]);
                        jarvisStore.clearMessages();
                        setAiStatus('idle');
                        if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
                        setIsSpeakingAi(false);
                      }}
                      className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all cursor-pointer"
                      title="Reset Stream"
                    >
                      <RefreshCw size={12} strokeWidth={1.5} />
                    </button>
                  )}

                  {/* Close / Dismiss */}
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
                      setIsSpeakingAi(false);
                      jarvisStore.closeJarvis();
                      setIslandState('mini');
                    }}
                    className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all cursor-pointer"
                    title="Close"
                  >
                    <X size={12} strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Hands-Free Voice Equalizer Strip */}
              {(isDictatingPrompt || isSpeakingAi) && (
                <div className="mb-2 p-2.5 rounded-xl bg-black/60 border border-cyan-500/20 backdrop-blur-2xl flex items-center justify-between shadow-[0_0_20px_rgba(0,0,0,0.5)] shrink-0 animate-fade-in relative z-20">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 h-5 px-1 bg-white/5 rounded-full border border-white/10">
                      {[0.1, 0.3, 0.5, 0.7, 0.4, 0.2, 0.6].map((delay, idx) => (
                        <div
                          key={idx}
                          className="voice-wave-bar"
                          style={{ animationDelay: `${delay}s`, animationDuration: `${0.7 + delay * 0.3}s` }}
                        />
                      ))}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono tracking-widest text-white uppercase flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                        {isSpeakingAi ? 'VOICE NARRATION LIVE' : 'LISTENING TO VOCAL DIRECTIVE'}
                      </span>
                      <span className="text-[9px] font-mono text-white/40 truncate max-w-sm">
                        {voiceInterimText || (isSpeakingAi ? 'Audio telemetry active' : 'Speak naturally — automatic synthesis on pause')}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (promptRecognitionRef.current) {
                        try { promptRecognitionRef.current.stop(); } catch(e){}
                      }
                      if (typeof window !== 'undefined' && window.speechSynthesis) {
                        window.speechSynthesis.cancel();
                      }
                      setIsSpeakingAi(false);
                      setIsDictatingPrompt(false);
                    }}
                    className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[9px] font-mono uppercase tracking-wider text-white transition-colors cursor-pointer border border-white/10 active:scale-95"
                  >
                    Mute
                  </button>
                </div>
              )}

              {/* Chat Stream & Monolith Hero State */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 my-1 relative z-10">
                {chatHistory.length === 0 ? (
                  <div className="h-full flex flex-col justify-between items-center text-center px-2 py-2 space-y-3">
                    {/* SiriWave Aperture Hero */}
                    <div className="flex flex-col items-center space-y-2 mt-1">
                      <div className="relative w-16 h-16 rounded-full overflow-hidden border border-cyan-400/40 bg-black/80 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.35)]">
                        <SiriWave
                          variant="wave"
                          size={70}
                          renderScale={0.8}
                          className="w-full h-full object-cover scale-125 pointer-events-none"
                        />
                      </div>

                      <div className="space-y-0.5">
                        <div className="text-[9px] font-mono tracking-[0.4em] text-cyan-400 uppercase font-bold">
                          AURA // COGNITIVE COPILOT
                        </div>
                        <h4 className="text-sm font-semibold tracking-wide text-white/90 font-sans">
                          Architect High-Conviction Flow
                        </h4>
                        <p className="text-[11px] text-white/40 font-sans max-w-sm mx-auto leading-relaxed">
                          Deconstruct complex goals into ultradian sprints, eliminate cognitive drag, and sustain elite momentum.
                        </p>
                      </div>
                    </div>

                    {/* 4 Monolithic Directive Cards */}
                    <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                      {[
                        { 
                          tag: '01',
                          title: 'ULTRADIAN CADENCE', 
                          prompt: 'Architect an optimal 90-minute ultradian deep work session with cognitive phase transitions.', 
                          desc: '90m focus & transition rhythm' 
                        },
                        { 
                          tag: '02',
                          title: 'TASK ATOMIZATION', 
                          prompt: 'Decompose complex high-stakes objectives into 4 high-leverage atomic milestones with time boundaries.', 
                          desc: '4 atomic milestone decomposition' 
                        },
                        { 
                          tag: '03',
                          title: 'STRATEGIC POSTURE', 
                          prompt: 'Formulate executive, high-conviction decision frameworks and eliminate execution ambiguity.', 
                          desc: 'Executive priority frameworks' 
                        },
                        { 
                          tag: '04',
                          title: 'FRICTION DEFENSE', 
                          prompt: 'Execute a rapid 3-step dopamine reset protocol to eliminate distraction and restore momentum.', 
                          desc: 'Instant attention reset' 
                        }
                      ].map((card, i) => (
                        <button
                          key={i}
                          onClick={() => handleSubmitToGemini(card.prompt)}
                          className="group p-2.5 rounded-xl bg-black/40 hover:bg-white/[0.04] border border-white/[0.08] hover:border-cyan-500/30 transition-all duration-200 cursor-pointer text-left relative overflow-hidden backdrop-blur-md active:scale-[0.98]"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[8px] font-mono text-white/40 group-hover:text-cyan-400 transition-colors tracking-widest uppercase">
                              [{card.tag}]
                            </span>
                            <ChevronRight size={11} className="text-white/20 group-hover:text-cyan-300 transition-transform group-hover:translate-x-0.5" />
                          </div>
                          <div className="text-[11px] font-bold font-mono tracking-wider uppercase text-white/80 group-hover:text-white transition-colors truncate">
                            {card.title}
                          </div>
                          <p className="text-[9px] text-white/35 font-mono tracking-tight group-hover:text-white/60 transition-colors truncate mt-0.5">
                            {card.desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  chatHistory.map((msg, i) => (
                    <AIMessage
                      key={i}
                      from={msg.role}
                      timestamp={msg.timestamp || "Just now"}
                      copyText={msg.text}
                      onRetry={
                        msg.role === 'assistant'
                          ? () => {
                              const lastUser = [...chatHistory].slice(0, i).reverse().find(m => m.role === 'user');
                              if (lastUser) handleSubmitToGemini(lastUser.text);
                            }
                          : undefined
                      }
                      avatar={
                        msg.role === 'assistant' ? (
                          <div className="w-6 h-6 rounded-full bg-white/5 border border-white/15 flex items-center justify-center shadow-sm shrink-0">
                            <MaybachLogo size={14} glow={false} className="opacity-80" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shadow-sm shrink-0">
                            <span className="text-[9px] font-bold text-white font-mono">U</span>
                          </div>
                        )
                      }
                      customActions={
                        msg.role === 'assistant' ? (
                          <>
                            <button
                              onClick={() => speakMessageText(msg.text)}
                              className="ai-message-action cursor-pointer rounded-lg p-1 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                              title={isSpeakingAi ? "Stop Audio" : "Voice Read Aloud"}
                              type="button"
                            >
                              {isSpeakingAi ? <VolumeX size={11} /> : <Volume2 size={11} />}
                            </button>
                            <button
                              onClick={() => convertAiToTask(msg.text)}
                              className="ai-message-action cursor-pointer rounded-md px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest text-white/70 bg-white/5 hover:bg-white/10 border border-white/15 transition-colors flex items-center gap-1 shadow-sm"
                              title="Convert to Focus Task"
                              type="button"
                            >
                              <Plus size={9} /> Task
                            </button>
                          </>
                        ) : null
                      }
                    >
                      {msg.role === 'assistant' ? (
                        renderFormattedAiText(msg.text)
                      ) : (
                        <div className="whitespace-pre-wrap leading-relaxed font-sans text-xs font-medium">
                          {msg.text}
                        </div>
                      )}
                    </AIMessage>
                  ))
                )}

                {chatSubmitting && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-black/60 border border-white/15 text-white/80 text-xs font-mono animate-pulse shadow-sm">
                    <Loader2 size={13} className="animate-spin text-cyan-400 shrink-0" />
                    <span className="tracking-wide">Aura synthesizing cognitive directive...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Bottom Precision Input Dock */}
              <div className="pt-2 mt-auto shrink-0 relative z-20">
                <BorderBeam
                  size="md"
                  colorVariant="colorful"
                  theme="dark"
                  brightness={1.6}
                  saturation={1.4}
                  strength={0.85}
                  duration={2.5}
                  borderRadius={16}
                >
                  <div className="w-full bg-[#09090c]/95 border border-white/15 rounded-2xl p-1.5 pl-3 flex items-center gap-2.5 focus-within:bg-[#0e0e12] focus-within:border-white/30 transition-all backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.8)] relative z-10">
                    <button
                      onClick={togglePromptDictation}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        isDictatingPrompt
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.4)] animate-pulse'
                          : 'text-white/50 hover:text-white hover:bg-white/10'
                      }`}
                      title={isDictatingPrompt ? "Listening... Click to stop" : "Vocal Directive (Speech-to-Text)"}
                    >
                      {isDictatingPrompt ? <Mic size={14} className="animate-bounce text-red-400" /> : <Mic size={14} />}
                    </button>

                    <input
                      type="text"
                      value={textPromptValue}
                      onChange={(e) => setTextPromptValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && textPromptValue.trim() && !chatSubmitting) {
                          e.preventDefault();
                          const q = textPromptValue.trim();
                          setTextPromptValue('');
                          handleSubmitToGemini(q);
                        }
                      }}
                      placeholder={isHandsFreeVoice ? "Voice assistant listening... (or type here)..." : "Enter cognitive directive or speak..."}
                      className="bg-transparent border-none outline-none text-xs md:text-sm text-white placeholder:text-white/30 font-sans w-full tracking-tight"
                      autoFocus
                    />

                    <button
                      disabled={chatSubmitting || !textPromptValue.trim()}
                      onClick={() => {
                        if (!textPromptValue.trim() || chatSubmitting) return;
                        const q = textPromptValue.trim();
                        setTextPromptValue('');
                        handleSubmitToGemini(q);
                      }}
                      className="w-7 h-7 rounded-full bg-white hover:bg-zinc-200 text-black flex items-center justify-center shrink-0 transition-transform disabled:opacity-20 hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                      title="Execute Directive"
                    >
                      <ArrowUp size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </BorderBeam>
              </div>
            </motion.div>
          )}

          {/* State: Quick Settings (Apple Control Center & Samsung Quick Panel Polish) */}
          {islandState === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full flex flex-col p-1 sm:p-2 relative z-10 overflow-hidden"
            >
              <QuickSettingsPanel 
                isOpen={islandState === 'settings'} 
                onClose={() => setIslandState('mini')} 
                isEmbeddedInIsland={true} 
              />
            </motion.div>
          )}

        {/* YouTube Embed State */}
        <AnimatePresence>
          {islandState === 'youtube' && ytEmbedId && (
            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="w-full h-full flex flex-col p-6 overflow-hidden relative pointer-events-auto bg-black"
            >
               {/* Island Branding Header */}
               <div className="flex justify-between items-center mb-4 shrink-0 z-10">
                 <div className="flex items-center gap-2">
                    <Play size={16} className="text-red-500" />
                    <span className="text-xs font-bold text-white/50 tracking-widest uppercase">Theatre Island</span>
                 </div>
                 <button 
                    onClick={(e) => { e.stopPropagation(); setIslandState('mini'); }}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all shadow-inner pointer-events-auto"
                 >
                   <X size={14} />
                 </button>
               </div>
               
               <div className="flex-1 w-full rounded-2xl overflow-hidden shadow-2xl relative border border-white/10">
                 <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${ytEmbedId}?autoplay=1`} 
                    title="YouTube Embed" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    className="absolute inset-0"
                 ></iframe>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        </AnimatePresence>

        {/* End of island content */}
      </motion.div>
    </div>
    </>
  );
}

