"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Home, CheckSquare, BarChart2, ShoppingBag, Play, Pause, RotateCcw, SkipForward, Plus, X, Timer, Waves, Zap, Rocket, BookOpen, Palette, Flame, ShieldCheck, ArrowRight, ChevronRight, Sliders, SlidersHorizontal, User, Settings, Bell, Volume2, Maximize, Minimize, Bot, Monitor, Smartphone, History, Award, Cpu, Activity, Camera, Target, FileText, Eye, EyeOff, Check, RefreshCw, CheckCircle2, Hand, Mic, Radio, Sparkles, PictureInPicture2, Headphones, Layers, Globe, Coins, Copy, ChevronDown, ChevronUp, Terminal, Code2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CustomYouTubePlayer } from './components/CustomYouTubePlayer';
import { useAppStore } from '../hooks/useAppStore';
import { useFrequencyStore } from '../hooks/useFrequencyStore';
import { useJarvisStore } from '../hooks/useJarvisStore';
import { AuraSidebarWidget } from './components/aura/AuraSidebarWidget';
import { useAuraIntegration } from '../hooks/useAuraIntegration';
import ThePlace from './components/ThePlace';
import dynamic from 'next/dynamic';
const LearnFromPdf = dynamic(() => import('./components/LearnFromPdf'), { ssr: false });
const AuraAnalyticsPage = dynamic(() => import('./components/aura/AuraAnalyticsPage').then(m => m.AuraAnalyticsPage), { ssr: false });
const MaybachTerminal = dynamic(() => import('./components/MaybachTerminal').then(m => m.MaybachTerminal), { ssr: false });
const GesturesMode = dynamic(() => import('./components/GesturesMode'), { ssr: false });
import type { GestureRecognizer as GestureRecognizerType, FaceDetector as FaceDetectorType, FaceLandmarker as FaceLandmarkerType } from '@mediapipe/tasks-vision';
import Markets from './components/Markets';
import { SyllabusForge } from './components/SyllabusForge';
import { Subject } from './components/syllabus-types';
import { MaybachLogo, MaybachText } from './components/Branding';
import Ledger from './components/Ledger';
import FrequencyAudioEngine from './components/TheFrequency/FrequencyAudioEngine';
import WakeWordTraining from './components/WakeWordTraining';
import AiModelSelector from './components/AiModelSelector';
import YouTubeApiConfig from './components/YouTubeApiConfig';
import { SiriWave } from '@/components/ui/siri-wave';



// --- Types & Data ---
export type SubTask = { id: string; title: string; done: boolean };
export type Task = { 
  id: string; 
  title: string; 
  desc?: string; 
  priority: 'urgent'|'high'|'medium'|'low'; 
  tag?: string; 
  category?: 'deep-work'|'coding'|'study'|'admin';
  estimatedMinutes?: number;
  subtasks?: SubTask[];
  done: boolean; 
  created: number 
};
export type Preset = { id: string; name: string; icon: any; color: string; bg: string; cat: string; segs: any[]; cycles: number; desc: string; youtubeUrl?: string };
export type CustomCinematicTimer = {
  id: string;
  title: string;
  youtubeUrl: string;
  durationMinutes: number;
  tag: string;
  thumbnail?: string;
  custom?: boolean;
};

const PRESETS: Preset[] = [
  {id:'pomodoro',name:'Pomodoro',icon: Timer, color:'text-white', bg:'bg-zinc-900 border-white/10', cat:'work',
   segs:[{n:'Focus',d:25*60,t:'work'},{n:'Short Break',d:5*60,t:'rest'}],cycles:4,desc:'25m work, 5m rest'},
  {id:'deepflow',name:'Deep Flow',icon: Waves, color:'text-white', bg:'bg-zinc-900 border-white/10', cat:'work',
   segs:[{n:'Deep Work',d:55*60,t:'work'},{n:'Break',d:5*60,t:'rest'}],cycles:2,desc:'55m focus, 5m break'},
  {id:'ultradian',name:'Ultradian',icon: Zap, color:'text-white', bg:'bg-zinc-900 border-white/10', cat:'work',
   segs:[{n:'Power Focus',d:90*60,t:'work'},{n:'Recovery',d:20*60,t:'rest'}],cycles:2,desc:'90m sprint, 20m recovery'},
  {id:'sprint',name:'Quick Sprint',icon: Rocket, color:'text-white', bg:'bg-zinc-900 border-white/10', cat:'work',
   segs:[{n:'Sprint',d:10*60,t:'work'},{n:'Micro-break',d:2*60,t:'rest'}],cycles:3,desc:'10m burst × 3'},
  {id:'studymarathon',name:'Study Marathon',icon: BookOpen, color:'text-white', bg:'bg-zinc-900 border-white/10', cat:'study',
   segs:[{n:'Study',d:45*60,t:'work'},{n:'Rest',d:15*60,t:'rest'}],cycles:3,desc:'45m study × 3'},
  {id:'creative',name:'Creative Burst',icon: Palette, color:'text-white', bg:'bg-zinc-900 border-white/10', cat:'creative',
   segs:[{n:'Ideate',d:20*60,t:'work'},{n:'Walk',d:5*60,t:'rest'}],cycles:5,desc:'20m ideas × 5'},
];

const DEFAULT_CINEMATIC_VIDEOS = [
  { id: 'TIqsKXQHvFI', title: 'High Stakes', tag: 'NEO TOKYO', thumbnail: 'https://img.youtube.com/vi/TIqsKXQHvFI/maxresdefault.jpg' },
  { id: 'Ui7Hb4cvamY', title: 'Solving the unsolvable', tag: 'CYBERPUNK FLOW', thumbnail: 'https://img.youtube.com/vi/Ui7Hb4cvamY/maxresdefault.jpg' },
  { id: 'df4p7bP_MaY', title: 'Discipline', tag: 'MONOLITH', thumbnail: 'https://img.youtube.com/vi/df4p7bP_MaY/maxresdefault.jpg' },
  { id: '8ObcKYvrCpY', title: 'Symbol', tag: 'EXECUTIVE SUITE', thumbnail: 'https://img.youtube.com/vi/8ObcKYvrCpY/maxresdefault.jpg' },
  { id: 'NrMjwLKhGg4', title: 'Winning', tag: 'CHAMPION ENERGY', thumbnail: 'https://img.youtube.com/vi/NrMjwLKhGg4/maxresdefault.jpg' },
  { id: 'on40ISrPmIk', title: 'Pressure', tag: 'DEEP COGNITION', thumbnail: 'https://img.youtube.com/vi/on40ISrPmIk/maxresdefault.jpg' },
];

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const parseYoutubeUrl = (url: string) => {
  let videoId = null;
  let playlistId = null;

  const videoRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const videoMatch = url.match(videoRegExp);
  if (videoMatch && videoMatch[2].length === 11) {
    videoId = videoMatch[2];
  }

  const playlistRegExp = /[?&]list=([^#&?]+)/;
  const playlistMatch = url.match(playlistRegExp);
  if (playlistMatch && playlistMatch[1]) {
    playlistId = playlistMatch[1];
  }

  return { videoId, playlistId };
};

// CRED Signature Easing
const credEase = [0.8, 0, 0.2, 1] as const;
const smoothEase = [0.16, 1, 0.3, 1] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: smoothEase } }
};

const PremiumLoader = () => {
  const [text, setText] = useState('INITIALIZING MAYBACH PROTOCOL');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setText('CALIBRATING LUXURY CORE'), 800);
    const t2 = setTimeout(() => setText('SECURING VIP ENVIRONMENT'), 1600);
    const t3 = setTimeout(() => setText('SYSTEM GOATED'), 2200);
    
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 15, 100));
    }, 100);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearInterval(interval); };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0, transition: { duration: 0.6, ease: credEase } }} 
      className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      
      {/* Scanning line */}
      <motion.div 
        animate={{ y: ['-100vh', '100vh'] }} 
        transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }} 
        className="absolute left-0 right-0 h-[1px] bg-white/20 shadow-[0_0_20px_rgba(255,255,255,1)] z-0" 
      />
      
      {/* Concentric rotating rings */}
      <div className="relative w-64 h-64 flex items-center justify-center z-10">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }} 
          className="absolute inset-0 border border-white/10 rounded-full border-t-white/40 border-r-white/40" 
        />
        <motion.div 
          animate={{ rotate: -360 }} 
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }} 
          className="absolute inset-8 border border-white/10 rounded-full border-b-white/40 border-l-white/40" 
        />
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }} 
          className="absolute inset-16 border border-white/5 border-dashed rounded-full" 
        />
        <motion.div 
          animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.8, 1, 0.8] }} 
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} 
          className="w-24 h-24 bg-white rounded-full shadow-[0_0_50px_rgba(255,255,255,0.6)] flex items-center justify-center overflow-hidden"
        >
          <MaybachLogo className="text-black mt-2" size={72} />
        </motion.div>
      </div>

      <div className="mt-16 text-center z-10 w-full max-w-xs">
        <div className="flex justify-between items-end mb-3">
          <motion.div 
            key={text}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/70"
          >
            {text}
          </motion.div>
          <div className="font-mono text-[10px] text-white/50">
            {Math.floor(progress)}%
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-[2px] bg-white/10 relative overflow-hidden">
          <motion.div 
            className="absolute inset-y-0 left-0 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
            animate={{ width: `${progress}%` }}
            transition={{ ease: "easeOut" }}
          />
        </div>
        
        {/* Tech feel text */}
        <div className="mt-4 flex justify-between text-[8px] font-mono text-white/20 uppercase">
          <span>SYS.0XF8A2</span>
          <span>LINK.SECURE</span>
          <span>MEM.0X44B1</span>
        </div>
      </div>
    </motion.div>
  );
};

const Onboarding = ({ onComplete }: { onComplete: () => void }) => {
  const [phase, setPhase] = useState(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    if (onCompleteRef.current) {
      onCompleteRef.current();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSkip]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1200);
    const t2 = setTimeout(() => setPhase(2), 2600);
    const t3 = setTimeout(() => setPhase(3), 4000);
    const t4 = setTimeout(() => {
      if (onCompleteRef.current) onCompleteRef.current();
    }, 5500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  return (
    <motion.div 
      className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 1, ease: credEase } }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_100%)] pointer-events-none" />

      {/* Skip Button */}
      <motion.button
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        onClick={handleSkip}
        className="absolute top-8 right-8 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white text-xs font-mono tracking-wider transition-all duration-300 backdrop-blur-md cursor-pointer group"
      >
        <span>SKIP INTRO</span>
        <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
      </motion.button>

      <AnimatePresence mode="wait">
        {phase === 0 && (
          <motion.div key="intro" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -50 }} transition={{ duration: 0.8, ease: credEase }} className="text-center relative z-10 flex flex-col items-center">
            <MaybachLogo size={180} className="mb-12 text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.4)]" />
            <MaybachText size="text-4xl md:text-6xl" className="mb-4" />
            <div className="text-white/40 text-[10px] uppercase tracking-[0.5em] font-medium">ultimate focus engine</div>
          </motion.div>
        )}
        {phase === 1 && (
          <motion.div key="timer" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} transition={{ duration: 0.8, ease: credEase }} className="flex flex-col items-center text-center relative z-10">
             <div className="relative w-40 h-40 mb-8 flex items-center justify-center">
               <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                 <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                 <motion.circle cx="50" cy="50" r="48" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="301" initial={{ strokeDashoffset: 301 }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 1.2, ease: "linear" }} />
               </svg>
               <Timer size={32} className="text-white" />
             </div>
             <h2 className="font-heading text-4xl md:text-5xl font-extrabold tracking-tight lowercase">set your focus.</h2>
          </motion.div>
        )}
        {phase === 2 && (
          <motion.div key="tasks" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} transition={{ duration: 0.8, ease: credEase }} className="flex flex-col items-center text-center w-full max-w-sm px-6 relative z-10">
             <div className="w-full space-y-3 mb-8">
               {[0, 1, 2].map((i) => (
                 <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15, duration: 0.4 }} className="bg-zinc-900 border border-white/10 p-4 flex items-center gap-4">
                   <motion.div initial={{ backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.3)", color: "transparent" }} animate={{ backgroundColor: "#fff", borderColor: "#fff", color: "#000" }} transition={{ delay: i * 0.15 + 0.3, duration: 0.3 }} className="w-5 h-5 rounded-full border-2 flex items-center justify-center">
                     <CheckSquare size={10} fill="currentColor" />
                   </motion.div>
                   <div className="h-1.5 bg-white/20 rounded-full w-2/3" />
                 </motion.div>
               ))}
             </div>
             <h2 className="font-heading text-4xl md:text-5xl font-extrabold tracking-tight lowercase">conquer your tasks.</h2>
          </motion.div>
        )}
        {phase === 3 && (
          <motion.div key="rewards" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} transition={{ duration: 0.8, ease: credEase }} className="flex flex-col items-center text-center relative z-10">
             <motion.div animate={{ y: [0, -10, 0], filter: ["drop-shadow(0 0 0px rgba(255,255,255,0))", "drop-shadow(0 0 40px rgba(255,255,255,0.6))", "drop-shadow(0 0 0px rgba(255,255,255,0))"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} className="text-8xl mb-8">
               🐉
             </motion.div>
             <h2 className="font-heading text-4xl md:text-5xl font-extrabold tracking-tight lowercase">evolve your companion.</h2>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function FocusForge() {
  const { 
    view, setView, 
    timeLeft, setTimeLeft, 
    isRunning, setIsRunning, 
    activeTimer, setActiveTimer, 
    totalSegTime, setTotalSegTime 
  } = useAppStore();
  const frequencyStore = useFrequencyStore();
  const { recordSession } = useAuraIntegration();
  
  // --- All States ---
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [hubTab, setHubTab] = useState<'learning' | 'markets'>('learning');
  const [user, setUser] = useState({ name: 'Focus Explorer', level: 3, xp: 680, coins: 450, streak: 14, moniker: 'Sovereign Flow Architect' });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editUserName, setEditUserName] = useState('Focus Explorer');
  const [editUserMoniker, setEditUserMoniker] = useState('Sovereign Flow Architect');
  const [apiKey, setApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-3.7-flash');
  const [showApiKey, setShowApiKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState('');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Custom Cinematic Timers State
  const [customCinematics, setCustomCinematics] = useState<CustomCinematicTimer[]>([]);
  const [showAddCinematicModal, setShowAddCinematicModal] = useState(false);
  const [newCinematic, setNewCinematic] = useState({ title: '', youtubeUrl: '', durationMinutes: 60, tag: 'DEEP WORK' });

  // Task Filter States
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<'all' | 'urgent' | 'high' | 'medium' | 'low'>('all');
  const [taskCategoryFilter, setTaskCategoryFilter] = useState<'all' | 'deep-work' | 'coding' | 'study' | 'admin'>('all');
  const [newSubtaskInput, setNewSubtaskInput] = useState<{ [taskId: string]: string }>({});
  const [showMobileToolsSheet, setShowMobileToolsSheet] = useState(false);

  // Profile Sub-Tabs & Vector MCP Bridge States
  const [profileTab, setProfileTab] = useState<'identity' | 'vector'>('identity');
  const [isMcpGuideOpen, setIsMcpGuideOpen] = useState<boolean>(true);
  const [copiedMcpUrl, setCopiedMcpUrl] = useState<boolean>(false);
  const [copiedConfigType, setCopiedConfigType] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setApiKey(localStorage.getItem('gemini-api-key') || '');
      setGeminiModel(localStorage.getItem('gemini-model') || 'gemini-3.7-flash');
      
      const savedCinematics = localStorage.getItem('custom-cinematic-timers');
      if (savedCinematics) {
        try { setCustomCinematics(JSON.parse(savedCinematics)); } catch (e) {}
      }

      const savedUser = localStorage.getItem('focusforge-user-profile');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser(prev => ({ ...prev, ...parsed }));
          setEditUserName(parsed.name || 'Focus Explorer');
          setEditUserMoniker(parsed.moniker || 'Sovereign Flow Architect');
        } catch (e) {}
      }
    }
  }, []);

  const handleSaveApiKey = () => {
    localStorage.setItem('gemini-api-key', apiKey);
    localStorage.setItem('gemini-model', geminiModel);
    setKeyStatus('Key & Model preferences saved!');
    setTimeout(() => setKeyStatus(''), 3000);
    window.dispatchEvent(new CustomEvent('geminiKeyUpdated', { detail: { key: apiKey, model: geminiModel } }));
  };

  const handleTestGeminiConnection = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Please enter a Gemini API Key first.' });
      return;
    }
    setIsTestingKey(true);
    setTestResult(null);
    try {
      const startTime = Date.now();
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTest: true, apiKey: apiKey.trim(), model: geminiModel })
      });
      const data = await res.json();
      const latency = Date.now() - startTime;
      if (res.ok && data.success) {
        setTestResult({ success: true, message: `Connected to ${geminiModel} successfully! Latency: ${latency}ms` });
      } else {
        setTestResult({ success: false, message: data.error || 'Authentication failed. Check your API key.' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Network error during connection test.' });
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleSaveProfile = () => {
    const updated = { ...user, name: editUserName.trim() || 'Focus Explorer', moniker: editUserMoniker.trim() || 'Sovereign Flow Architect' };
    setUser(updated);
    localStorage.setItem('focusforge-user-profile', JSON.stringify(updated));
    setIsEditingProfile(false);
  };

  const handleAddCustomCinematic = () => {
    if (!newCinematic.title.trim() || !newCinematic.youtubeUrl.trim()) return;
    const parsed = parseYoutubeUrl(newCinematic.youtubeUrl);
    const videoId = parsed.videoId || (newCinematic.youtubeUrl.length === 11 ? newCinematic.youtubeUrl : 'TIqsKXQHvFI');
    const item: CustomCinematicTimer = {
      id: `custom-cinematic-${Date.now()}`,
      title: newCinematic.title.trim(),
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      durationMinutes: newCinematic.durationMinutes || 60,
      tag: newCinematic.tag.trim().toUpperCase() || 'CUSTOM FLOW',
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      custom: true
    };
    const updated = [item, ...customCinematics];
    setCustomCinematics(updated);
    localStorage.setItem('custom-cinematic-timers', JSON.stringify(updated));
    setNewCinematic({ title: '', youtubeUrl: '', durationMinutes: 60, tag: 'DEEP WORK' });
    setShowAddCinematicModal(false);
  };

  const handleDeleteCustomCinematic = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customCinematics.filter(c => c.id !== id);
    setCustomCinematics(updated);
    localStorage.setItem('custom-cinematic-timers', JSON.stringify(updated));
  };
  const [stats, setStats] = useState({ dayFocus: 125, dayTasksDone: 4, totalTimers: 24, totalTasks: 45 });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [segIdx, setSegIdx] = useState(0);
  const [cycleIdx, setCycleIdx] = useState(0);
  const [timerFilter, setTimerFilter] = useState('All');
  const [isStartingTimer, setIsStartingTimer] = useState(false);
  const [customConfig, setCustomConfig] = useState({ focus: 25, break: 5, cycles: 4 });
  const [customMode, setCustomMode] = useState<'work'|'learn'|'dopamine'>('work');
  const [learnTotalTime, setLearnTotalTime] = useState(60);
  const [dopamineConfig, setDopamineConfig] = useState({ focus: 25, youtubeUrl: '' });
  const [ghostShelf, setGhostShelf] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hubProtocols, setHubProtocols] = useState({ strict: true, zen: false, autoFull: true, haptic: true });
  const [lastFocusStatus, setLastFocusStatus] = useState<string>('initializing');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeBoosts, setActiveBoosts] = useState<string[]>([]);
  const [hubUrl, setHubUrl] = useState('');
  const [hubVideoData, setHubVideoData] = useState<{ videoId: string | null, playlistId: string | null } | null>(null);
  const [isFocusCamEnabled, setIsFocusCamEnabled] = useState(false);
  const [isFatigueCamEnabled, setIsFatigueCamEnabled] = useState(false);
  const [isMonitorCamEnabled, setIsMonitorCamEnabled] = useState(false);
  const [fatigueAlert, setFatigueAlert] = useState(false);
  const [showHubTimer, setShowHubTimer] = useState(false);
  const [hubTimerMode, setHubTimerMode] = useState<'pomodoro'|'ultradian'|'custom'>('pomodoro');
  const [hubTimerTime, setHubTimerTime] = useState(25 * 60);
  const [isHubTimerActive, setIsHubTimerActive] = useState(false);
  const [petLevel, setPetLevel] = useState(1);
  const [isHubVideoPlaying, setIsHubVideoPlaying] = useState(false);
  const [showFocusAlert, setShowFocusAlert] = useState(false);
  const [taskTab, setTaskTab] = useState('all');
  const [showAddTask, setShowAddTask] = useState(false);
  const [showCustomTimer, setShowCustomTimer] = useState(false);
  const [isGesturesModeOpen, setIsGesturesModeOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', desc: '', priority: 'medium' as any, tag: '' });
  const [showCinematicSelector, setShowCinematicSelector] = useState(false);
  const [selectedCinematicId, setSelectedCinematicId] = useState<string | null>(null);
  const [hoveredCinematic, setHoveredCinematic] = useState<string | null>(null);
  const [recentSessions, setRecentSessions] = useState([
    { id: '1', name: 'Deep Flow', date: 'Today', duration: '55m', xp: '+120', coins: '+30' },
    { id: '2', name: 'Pomodoro', date: 'Yesterday', duration: '25m', xp: '+40', coins: '+10' },
    { id: '3', name: 'Quick Sprint', date: '2 days ago', duration: '10m', xp: '+15', coins: '+5' },
  ]);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [gestureRecognizer, setGestureRecognizer] = useState<GestureRecognizerType | null>(null);
  const [faceDetector, setFaceDetector] = useState<FaceDetectorType | null>(null);
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarkerType | null>(null);
  const [currentGesture, setCurrentGesture] = useState<string | null>(null);

  // --- All Refs ---
  const camVideoRef = useRef<HTMLVideoElement>(null);
  const pipCanvasRef = useRef<HTMLCanvasElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const isPipActiveRef = useRef(false);
  const showFocusAlertRef = useRef(false);
  const hubPlayerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);
  const lastGestureTimeRef = useRef<number>(0);
  const noFaceTimeRef = useRef<number>(0);
  const monitorNoFaceTimeRef = useRef<number>(0);
  const microsleepTimeRef = useRef<number>(0);
  const fatigueYRef = useRef<{y: number, pitch: number, time: number}[]>([]);
  const audioCtxRef = useRef<any>(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playGoatedAlarm = useCallback(() => {
    try {
      const ctx = getAudioCtx();
      const playBeep = (time: number, freq: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(freq / 2, time + 0.15);
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.15);
      };
      const now = ctx.currentTime;
      // Siren effect
      for(let i=0; i<6; i++) {
        playBeep(now + i * 0.2, i % 2 === 0 ? 880 : 1200);
      }
    } catch(e) {}
  }, [getAudioCtx]);

  const playFatigueChime = useCallback(() => {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 1.5);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.5);
    } catch(e) {}
  }, [getAudioCtx]);

  // --- Persistence & Initialization ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const seen = localStorage.getItem('hasSeenOnboarding');
      const ghost = localStorage.getItem('ghost-shelf');
      const savedTasks = localStorage.getItem('focus-tasks');
      const savedSubjects = localStorage.getItem('syllabus-forge-data');
      
      setHasSeenOnboarding(seen === 'true');
      
      if (ghost) {
        try { 
          const parsed = JSON.parse(ghost);
          if (Array.isArray(parsed)) setGhostShelf(parsed);
        } catch (e) {}
      }
      
      if (savedTasks) {
        try { 
          const parsed = JSON.parse(savedTasks);
          if (Array.isArray(parsed)) setTasks(parsed);
        } catch(e){}
      }
      
      if (savedSubjects) {
        try {
          const parsed = JSON.parse(savedSubjects);
          if (Array.isArray(parsed)) setSubjects(parsed);
        } catch (e) {}
      }
    }
  }, []);

  useEffect(() => {
    // Default mode: Fullscreen on first user interaction (browser gesture requirement)
    const handleFirstInteraction = () => {
      const isAutoFullscreenDisabled = localStorage.getItem('focusforge-default-fullscreen') === 'false';
      if (!isAutoFullscreenDisabled && typeof document !== 'undefined' && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };

    window.addEventListener('pointerdown', handleFirstInteraction, { once: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  useEffect(() => {
    const handleGlobalLoading = (e: any) => setIsGlobalLoading(e.detail.loading);
    const handleTasksSync = (e?: any) => {
      const savedTasks = localStorage.getItem('focus-tasks');
      if (savedTasks) {
        try {
          const parsed = JSON.parse(savedTasks);
          if (Array.isArray(parsed)) setTasks(parsed);
        } catch (err) {}
      }
    };
    const handleChangeView = (e: any) => {
      if (e?.detail?.view) {
        setView(e.detail.view);
      }
    };

    window.addEventListener('global-loading', handleGlobalLoading);
    window.addEventListener('tasksUpdated', handleTasksSync);
    window.addEventListener('task-created', handleTasksSync);
    window.addEventListener('changeView', handleChangeView);

    return () => {
      window.removeEventListener('global-loading', handleGlobalLoading);
      window.removeEventListener('tasksUpdated', handleTasksSync);
      window.removeEventListener('task-created', handleTasksSync);
      window.removeEventListener('changeView', handleChangeView);
    };
  }, [setView]);

  const completeOnboarding = useCallback(() => {
    try {
      localStorage.setItem('hasSeenOnboarding', 'true');
    } catch (e) {}
    setHasSeenOnboarding(true);
  }, []);
  // Hub Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isHubTimerActive && hubTimerTime > 0) {
      interval = setInterval(() => {
        setHubTimerTime(prev => {
          if (prev <= 1) {
            // Timer complete
            setTimeout(() => {
              setIsHubTimerActive(false);
              setPetLevel(p => p + 1);
              hubPlayerRef.current?.pause();
              if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
              
              // Record video learning session to AURA
              recordSession({
                type: 'video',
                duration: hubTimerMode === 'pomodoro' ? 25 : hubTimerMode === 'ultradian' ? 90 : 15,
                quality: 0.9,
                completed: true,
                note: `Completed ${hubTimerMode} session with video motivation`
              });
            }, 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isHubTimerActive, hubTimerTime, hubTimerMode, recordSession]);

  // Sync Hub Video with Hub Timer
  useEffect(() => {
    if (isHubTimerActive) {
      hubPlayerRef.current?.play();
    } else {
      hubPlayerRef.current?.pause();
    }
  }, [isHubTimerActive]);


  useEffect(() => {
    const loadModels = async () => {
      try {
        const { FilesetResolver, GestureRecognizer, FaceDetector, FaceLandmarker } = await import('@mediapipe/tasks-vision');
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
            delegate: "GPU"
          },
          runningMode: "VIDEO"
        });
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          outputFaceBlendshapes: true,
          numFaces: 1
        });
        setGestureRecognizer(recognizer as GestureRecognizerType);
        setFaceDetector(detector as FaceDetectorType);
        setFaceLandmarker(landmarker as FaceLandmarkerType);
        setIsModelsLoaded(true);
      } catch (error) {
        console.error("Error loading MediaPipe models:", error);
      }
    };
    loadModels();
  }, []);

  const processVideo = useCallback(function processVideoLoop() {
    if (!camVideoRef.current || !gestureRecognizer || !faceDetector || (!isFocusCamEnabled && !isMonitorCamEnabled && !isFatigueCamEnabled) || view === 'music' || view === 'place') return;

    const video = camVideoRef.current;
    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      const nowInMs = Date.now();

      // Face Detection
      const faceResults = faceDetector.detectForVideo(video, nowInMs);
      
      let isFacePresent = faceResults.detections.length > 0;
      let isLookingAway = false;
      let currentPitch = 0.5;

      if (isFacePresent) {
        const keypoints = faceResults.detections[0].keypoints;
        if (keypoints && keypoints.length >= 4) {
          const rightEye = keypoints[0];
          const leftEye = keypoints[1];
          const nose = keypoints[2];
          const mouth = keypoints[3];
          
          const eyeDist = Math.abs(leftEye.x - rightEye.x);
          if (eyeDist > 0.01) {
            const yawRatio = Math.abs(nose.x - rightEye.x) / eyeDist;
            if (yawRatio < 0.2 || yawRatio > 0.8) {
              isLookingAway = true; // Looking far left or right
            }
          }

          const eyeY = (leftEye.y + rightEye.y) / 2;
          const faceHeight = Math.abs(mouth.y - eyeY);
          if (faceHeight > 0.01) {
            currentPitch = Math.abs(nose.y - eyeY) / faceHeight;
            // If pitch is too high, they are looking down at their lap
            // If pitch is too low, they are looking at the ceiling
            if (currentPitch < 0.15 || currentPitch > 0.85) {
              isLookingAway = true;
            }
          }
        }
      }

      if (!isFacePresent || isLookingAway) {
        if (isFocusCamEnabled) {
          if (noFaceTimeRef.current === 0) {
            noFaceTimeRef.current = nowInMs;
          } else if (nowInMs - noFaceTimeRef.current > 15000) { // 15 seconds of no face
            if (view === 'hub' && isHubTimerActive) {
              hubPlayerRef.current?.pause();
              setIsHubTimerActive(false);
              if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
              setShowFocusAlert(true);
              showFocusAlertRef.current = true;
            }
          }
        }
        
        if (isMonitorCamEnabled) {
          if (monitorNoFaceTimeRef.current === 0) {
            monitorNoFaceTimeRef.current = nowInMs;
          } else if (nowInMs - monitorNoFaceTimeRef.current > 3000) { // 3 seconds strict!
            playGoatedAlarm();
            setShowFocusAlert(true);
            showFocusAlertRef.current = true;
            monitorNoFaceTimeRef.current = nowInMs + 2000; // debounce
          }
        }
      } else {
        noFaceTimeRef.current = 0;
        monitorNoFaceTimeRef.current = 0;
        
        if (isFatigueCamEnabled) {
          const bb = faceResults.detections[0].boundingBox;
          const y = bb?.originY || 0;
          const h = bb?.height || 1;
          
          fatigueYRef.current.push({ y, pitch: currentPitch, time: nowInMs });
          
          // Keep a rolling window of ~2 seconds
          fatigueYRef.current = fatigueYRef.current.filter(f => nowInMs - f.time < 2000);
          
          if (fatigueYRef.current.length > 15) {
            const oldest = fatigueYRef.current[0];
            const dyNormalized = (y - oldest.y) / h;
            const dpitch = currentPitch - oldest.pitch;
            
            // If the head dropped by > 15% of face height AND pitch shifted downwards (nodding off)
            if (dyNormalized > 0.15 && dpitch > 0.1) {
              playFatigueChime();
              setFatigueAlert(true);
              setTimeout(() => setFatigueAlert(false), 5000);
              fatigueYRef.current = [];
            }
          }

          // Microsleep (Eye Closure) Detection via FaceLandmarker Blendshapes
          if (faceLandmarker) {
            const landmarkResults = faceLandmarker.detectForVideo(video, nowInMs);
            if (landmarkResults.faceBlendshapes && landmarkResults.faceBlendshapes.length > 0) {
              const categories = landmarkResults.faceBlendshapes[0].categories;
              const eyeBlinkLeft = categories.find(c => c.categoryName === 'eyeBlinkLeft')?.score || 0;
              const eyeBlinkRight = categories.find(c => c.categoryName === 'eyeBlinkRight')?.score || 0;
              
              // Score > 0.5 means the eye is physically closed
              if (eyeBlinkLeft > 0.5 && eyeBlinkRight > 0.5) {
                if (microsleepTimeRef.current === 0) {
                  microsleepTimeRef.current = nowInMs;
                } else if (nowInMs - microsleepTimeRef.current > 1500) { // 1.5 seconds of total eye closure
                  playFatigueChime();
                  setFatigueAlert(true);
                  setTimeout(() => setFatigueAlert(false), 5000);
                  microsleepTimeRef.current = nowInMs + 3000; // debounce
                }
              } else {
                microsleepTimeRef.current = 0;
              }
            }
          }
        }
      }

      // Gesture Recognition
      const gestureResults = gestureRecognizer.recognizeForVideo(video, nowInMs);
      if (gestureResults.gestures && gestureResults.gestures.length > 0 && gestureResults.gestures[0].length > 0) {
        const gesture = gestureResults.gestures[0][0].categoryName;
        setCurrentGesture(gesture);

        // Cooldown of 1.5 seconds between gestures
        if (nowInMs - lastGestureTimeRef.current > 1500) {
          if (gesture === "Open_Palm") {
            // Toggle Play/Pause
            if (isHubTimerActive) {
              setIsHubTimerActive(false);
              hubPlayerRef.current?.pause();
            } else {
              setIsHubTimerActive(true);
              hubPlayerRef.current?.play();
            }
            lastGestureTimeRef.current = nowInMs;
          } else if (gesture === "Thumb_Up") {
            // Skip 10s forward
            hubPlayerRef.current?.seekBy(10);
            lastGestureTimeRef.current = nowInMs;
          } else if (gesture === "Thumb_Down") {
            // Skip 10s backward
            hubPlayerRef.current?.seekBy(-10);
            lastGestureTimeRef.current = nowInMs;
          } else if (gesture === "Victory") {
            // 2x Speed
            hubPlayerRef.current?.setPlaybackRate(2);
            lastGestureTimeRef.current = nowInMs;
          } else if (gesture === "Closed_Fist") {
            // 1x Speed
            hubPlayerRef.current?.setPlaybackRate(1);
            lastGestureTimeRef.current = nowInMs;
          }
        }
      } else {
        setCurrentGesture(null);
      }

      // PiP Drawing
      if (isPipActiveRef.current && pipCanvasRef.current) {
        const ctx = pipCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, pipCanvasRef.current.width, pipCanvasRef.current.height);
          // Draw video
          ctx.drawImage(video, 0, 0, pipCanvasRef.current.width, pipCanvasRef.current.height);
          
          if (showFocusAlertRef.current) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
            ctx.fillRect(0, 0, pipCanvasRef.current.width, pipCanvasRef.current.height);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 30px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('LOOK AT THE SCREEN', pipCanvasRef.current.width / 2, pipCanvasRef.current.height / 2);
          }
        }
      }
    }

    requestRef.current = requestAnimationFrame(processVideoLoop);
  }, [gestureRecognizer, faceDetector, isFocusCamEnabled, isMonitorCamEnabled, isFatigueCamEnabled, isHubTimerActive, view]);

  useEffect(() => {
    if (isFocusCamEnabled || isMonitorCamEnabled || isFatigueCamEnabled) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          streamRef.current = stream;
          if (camVideoRef.current) {
            camVideoRef.current.srcObject = stream;
            camVideoRef.current.onloadedmetadata = () => {
              camVideoRef.current?.play();
              if (isModelsLoaded) {
                requestRef.current = requestAnimationFrame(processVideo);
              }
            };
          }
        })
        .catch(err => console.error("Cam error", err));
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (camVideoRef.current) {
        camVideoRef.current.srcObject = null;
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    }
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isFocusCamEnabled, isMonitorCamEnabled, isFatigueCamEnabled, isModelsLoaded, processVideo]);

  // Anti-Divert (Tab visibility & Mouse Leave)
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const triggerAlert = () => {
      if (view === 'hub' && hubVideoData && isHubTimerActive && isFocusCamEnabled) {
        hubPlayerRef.current?.pause();
        setIsHubTimerActive(false);
        if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
        setShowFocusAlert(true);
        showFocusAlertRef.current = true;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        timeout = setTimeout(triggerAlert, 5000);
      } else {
        clearTimeout(timeout);
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 || e.clientX <= 0 || (e.clientX >= window.innerWidth || e.clientY >= window.innerHeight)) {
        timeout = setTimeout(triggerAlert, 10000);
      }
    };

    const handleMouseEnter = () => {
      clearTimeout(timeout);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      clearTimeout(timeout);
    };
  }, [view, hubVideoData, isHubTimerActive, isFocusCamEnabled]);

  const handleHubUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = parseYoutubeUrl(hubUrl);
    if (data) setHubVideoData(data);
  };

  // --- Secondary Effects ---
  useEffect(() => {
    localStorage.setItem('focus-tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('syllabus-forge-data', JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    const handleStorageUpdate = (e: any) => {
      if (e.detail?.source === 'page') return; 
      const savedTasks = localStorage.getItem('focus-tasks');
      if (savedTasks) {
        try { setTasks(JSON.parse(savedTasks)); } catch(err){}
      }
      const savedSubjects = localStorage.getItem('syllabus-forge-data');
      if (savedSubjects) {
        try { setSubjects(JSON.parse(savedSubjects)); } catch(err){}
      }
    };
    
    const handleChangeView = (e: any) => {
      if (e.detail?.view) {
        setView(e.detail.view);
        if (e.detail.view === 'hub' && e.detail.subTab) {
          setHubTab(e.detail.subTab);
        }
      }
    };
    
    window.addEventListener('tasksUpdated', handleStorageUpdate);
    window.addEventListener('changeView', handleChangeView);
    return () => {
      window.removeEventListener('tasksUpdated', handleStorageUpdate);
      window.removeEventListener('changeView', handleChangeView);
    };
  }, []);

  const handleNextSegment = useCallback(() => {
    if (!activeTimer) return;
    const currentSeg = activeTimer.segs[segIdx];
    
    setStats(s => ({ ...s, dayFocus: s.dayFocus + Math.round(currentSeg.d / 60) }));
    setUser(u => ({ ...u, xp: u.xp + 20, coins: u.coins + 5 }));
    
    // Record to AURA when work segment completes
    if (currentSeg.t === 'work') {
      recordSession({
        type: 'timer',
        duration: Math.round(currentSeg.d / 60),
        quality: 0.85,
        completed: true,
        note: `Completed ${activeTimer.name} work session`
      });
    }
    
    if (segIdx + 1 < activeTimer.segs.length) {
      const nextSeg = activeTimer.segs[segIdx + 1];
      setSegIdx(segIdx + 1);
      setTimeLeft(nextSeg.d);
      setTotalSegTime(nextSeg.d > 0 ? nextSeg.d : 1);
      if (nextSeg.t === 'dopamine') {
        setIsRunning(false);
      }
    } else {
      if (cycleIdx + 1 < activeTimer.cycles) {
        setSegIdx(0);
        setCycleIdx(cycleIdx + 1);
        setTimeLeft(activeTimer.segs[0].d);
        setTotalSegTime(activeTimer.segs[0].d);
      } else {
        setIsRunning(false);
        setActiveTimer(null);
        setView('home');
      }
    }
  }, [activeTimer, segIdx, cycleIdx]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      handleNextSegment();
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft === 0, handleNextSegment]);

  // Sync isRunning with YouTube Player
  useEffect(() => {
    if (activeTimer) {
      if (isRunning) hubPlayerRef.current?.play();
      else hubPlayerRef.current?.pause();
    }
  }, [isRunning, !!activeTimer]);

  const startTimer = (preset: Preset) => {
    if (!preset) return;
    
    // Premium Loading State (CRED Garage style)
    setIsStartingTimer(true);
    setTimeout(() => {
      setActiveTimer(preset);
      setSegIdx(0);
      setCycleIdx(0);
      setTimeLeft(preset.segs[0].d);
      setTotalSegTime(preset.segs[0].d);
      setIsRunning(preset.id.startsWith('cinematic-'));
      setIsStartingTimer(false);
      setView('activeTimer');
    }, 1200);
  };

  const resetTimer = () => {
    if (!activeTimer) return;
    setSegIdx(0);
    setCycleIdx(0);
    setTimeLeft(activeTimer.segs[0].d);
    setTotalSegTime(activeTimer.segs[0].d);
    setIsRunning(false);
  };

  const addTask = () => {
    if (!newTask.title) return;
    setTasks([{ 
      id: Date.now().toString(), 
      ...newTask, 
      category: (newTask as any).category || 'deep-work',
      estimatedMinutes: (newTask as any).estimatedMinutes || 25,
      subtasks: [],
      done: false, 
      created: Date.now() 
    }, ...tasks]);
    setShowAddTask(false);
    setNewTask({ title: '', desc: '', priority: 'medium', tag: '' });
  };

  const deleteTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(tasks.filter(t => t.id !== id));
  };

  const toggleSubTask = (taskId: string, subtaskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTasks(tasks.map(t => {
      if (t.id === taskId) {
        const updatedSubs = (t.subtasks || []).map(st => st.id === subtaskId ? { ...st, done: !st.done } : st);
        return { ...t, subtasks: updatedSubs };
      }
      return t;
    }));
  };

  const handleAddSubTask = (taskId: string) => {
    const title = newSubtaskInput[taskId]?.trim();
    if (!title) return;
    setTasks(tasks.map(t => {
      if (t.id === taskId) {
        const subtasks = t.subtasks || [];
        return {
          ...t,
          subtasks: [...subtasks, { id: `st-${Date.now()}`, title, done: false }]
        };
      }
      return t;
    }));
    setNewSubtaskInput({ ...newSubtaskInput, [taskId]: '' });
  };

  const startFocusOnTask = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const durationMins = task.estimatedMinutes || (task.priority === 'urgent' ? 45 : task.priority === 'high' ? 30 : 25);
    const taskPreset: Preset = {
      id: `task-focus-${task.id}`,
      name: task.title,
      icon: Target,
      color: 'text-white',
      bg: 'bg-zinc-900 border-white/10',
      cat: 'work',
      segs: [
        { n: `Focus: ${task.title.slice(0, 24)}`, d: durationMins * 60, t: 'work' },
        { n: 'Victory Break', d: 5 * 60, t: 'rest' }
      ],
      cycles: 1,
      desc: `Deep Work Focus on ${task.title}`
    };
    startTimer(taskPreset);
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        if (!t.done) {
          setUser(u => ({ ...u, xp: u.xp + 25, coins: u.coins + 5 }));
          setStats(s => ({ ...s, dayTasksDone: s.dayTasksDone + 1 }));
          
          // Record task completion to AURA
          recordSession({
            type: 'reflection',
            quality: t.priority === 'urgent' || t.priority === 'high' ? 1 : t.priority === 'medium' ? 0.8 : 0.6,
            completed: true,
            note: `Completed task: ${t.title}`
          });
        }
        return { ...t, done: !t.done };
      }
      return t;
    }));
  };

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // --- Views ---

  const renderHome = () => (
    <motion.div key="home" variants={containerVariants} initial="hidden" animate="show" exit="hidden" className="p-4 sm:p-6 md:p-12 max-w-6xl mx-auto space-y-12 sm:space-y-20 pb-32 md:pb-12">
      
      {/* Header */}
      <motion.header variants={itemVariants} className="pt-4 sm:pt-8 md:pt-0 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-widest bg-white/5 border border-white/10 text-white/60">
            SYSTEM.0XF8A2 // SOVEREIGN OS
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-widest bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            MCP SERVER: /api/mcp
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            DOCUMENT PIP: ACTIVE
          </span>
        </div>

        <h1 className="font-heading text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-extrabold tracking-tight leading-[0.9] mb-4 sm:mb-6 lowercase">
          crafted for<br/>the focused.
        </h1>
        <p className="text-white/50 text-base sm:text-lg md:text-xl max-w-2xl font-sans leading-relaxed">
          Focus Forge is a members-only sovereign operating system that fuses deep work architectures, multimodal neural intelligence, spatial acoustic physics, and capital yield matrices.
        </p>
      </motion.header>

      {/* 1. Focus Summary */}
      <motion.section variants={itemVariants}>
        <div className="flex items-center justify-between mb-6 sm:mb-8 border-b border-white/10 pb-4">
          <h2 className="font-serif text-xl sm:text-2xl md:text-3xl lowercase">your focus summary</h2>
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><Flame size={16} /></div>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><Timer size={16} /></div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <motion.div animate={{ opacity: isGlobalLoading ? [0.4, 1, 0.4] : 1 }} transition={{ repeat: Infinity, duration: 1.5 }} className="bg-zinc-950 border border-white/10 p-6 sm:p-8 flex flex-col justify-between rounded-2xl md:rounded-none min-h-[140px] md:h-64 group hover:border-white/30 transition-colors duration-500">
            <div className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-medium">For Today</div>
            <div className="mt-4 md:mt-0">
              <div className="font-heading font-extrabold text-4xl sm:text-5xl md:text-6xl text-white mb-2 tracking-tight">{stats.dayFocus}</div>
              <div className="text-emerald-400 text-sm flex items-center gap-1">
                <span>↓</span> 15 mins from yesterday
              </div>
            </div>
          </motion.div>
          
          <motion.div animate={{ opacity: isGlobalLoading ? [0.4, 1, 0.4] : 1 }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="bg-zinc-950 border border-white/10 p-6 sm:p-8 flex flex-col justify-between rounded-2xl md:rounded-none min-h-[140px] md:h-64 group hover:border-white/30 transition-colors duration-500">
            <div className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-medium">Current Streak</div>
            <div className="mt-4 md:mt-0">
              <div className="font-heading font-extrabold text-4xl sm:text-5xl md:text-6xl text-white mb-2 tracking-tight">{user.streak}</div>
              <div className="text-white/50 text-sm">days of unbroken focus</div>
            </div>
          </motion.div>

          <motion.div animate={{ opacity: isGlobalLoading ? [0.4, 1, 0.4] : 1 }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="bg-zinc-950 border border-white/10 p-6 sm:p-8 flex flex-col justify-between rounded-2xl md:rounded-none min-h-[140px] md:h-64 group hover:border-white/30 transition-colors duration-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
              <div className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] transition-all duration-1000" style={{ width: `${(user.xp / 100) * 100}%` }} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-medium">Level {user.level}</span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">{user.coins} Coins</span>
            </div>
            <div className="mt-4 md:mt-0">
              <div className="font-serif text-2xl sm:text-3xl md:text-4xl text-white mb-2 lowercase">{user.moniker || 'Sovereign Architect'}</div>
              <div className="font-mono text-xs sm:text-sm text-white/50">{user.xp} / 100 XP to next level</div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* 2. The Sovereign Engines (Expanded Modules Showcase) */}
      <motion.section variants={itemVariants}>
        <div className="flex items-center justify-between mb-6 sm:mb-8 border-b border-white/10 pb-4">
          <h2 className="font-serif text-xl sm:text-2xl md:text-3xl lowercase">the sovereign engines</h2>
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">6 CORE PROTOCOLS</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* The Place */}
          <button 
            onClick={() => setView('place')} 
            className="text-left p-6 sm:p-8 bg-zinc-950 border border-white/10 hover:border-white/30 transition-all duration-500 hover:-translate-y-1 rounded-2xl md:rounded-none min-h-[220px] flex flex-col justify-between group relative overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div>
              <div className="flex justify-between items-start mb-4 sm:mb-6">
                <Monitor className="text-white/50 group-hover:text-cyan-400 transition-colors duration-500" size={28} />
                <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 text-cyan-300 border border-cyan-500/20">
                  Document PiP
                </span>
              </div>
              <div className="font-heading text-2xl sm:text-3xl font-extrabold mb-1 lowercase">the place.</div>
            </div>
            <div>
              <div className="font-mono text-xs text-white/40 mb-1">4K Atmospheric soundscapes, Tokyo rain, and floating Picture-in-Picture miniplayer.</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-400 font-medium group-hover:translate-x-1 transition-transform flex items-center gap-1">
                Enter Theatre <ChevronRight size={12} />
              </div>
            </div>
          </button>

          {/* The Frequency */}
          <button 
            onClick={() => {
              setView('place');
              frequencyStore.setStudioOpen(true);
            }} 
            className="text-left p-6 sm:p-8 bg-zinc-950 border border-white/10 hover:border-white/30 transition-all duration-500 hover:-translate-y-1 rounded-2xl md:rounded-none min-h-[220px] flex flex-col justify-between group relative overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div>
              <div className="flex justify-between items-start mb-4 sm:mb-6">
                <Waves className="text-white/50 group-hover:text-purple-400 transition-colors duration-500" size={28} />
                <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 text-purple-300 border border-purple-500/20">
                  432Hz DSP
                </span>
              </div>
              <div className="font-heading text-2xl sm:text-3xl font-extrabold mb-1 lowercase">the frequency.</div>
            </div>
            <div>
              <div className="font-mono text-xs text-white/40 mb-1">Acoustic harmonic engine, binaural wave generators, Vocal Air and Bass Titan modes.</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-purple-400 font-medium group-hover:translate-x-1 transition-transform flex items-center gap-1">
                Open DSP Studio <ChevronRight size={12} />
              </div>
            </div>
          </button>

          {/* J.A.R.V.I.S. Copilot */}
          <button 
            onClick={() => useJarvisStore.getState().openJarvis()} 
            className="text-left p-6 sm:p-8 bg-zinc-950 border border-white/10 hover:border-white/30 transition-all duration-500 hover:-translate-y-1 rounded-2xl md:rounded-none min-h-[220px] flex flex-col justify-between group relative overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div>
              <div className="flex justify-between items-start mb-4 sm:mb-6">
                <Sparkles className="text-white/50 group-hover:text-emerald-400 transition-colors duration-500" size={28} />
                <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 text-emerald-300 border border-emerald-500/20">
                  Voice HUD
                </span>
              </div>
              <div className="font-heading text-2xl sm:text-3xl font-extrabold mb-1 lowercase">j.a.r.v.i.s. voice.</div>
            </div>
            <div>
              <div className="font-mono text-xs text-white/40 mb-1">Continuous hotword detection, Spot UI widgets, voice-driven media and financial queries.</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-medium group-hover:translate-x-1 transition-transform flex items-center gap-1">
                Launch HUD (Ctrl+J) <ChevronRight size={12} />
              </div>
            </div>
          </button>

          {/* Markets & Global Intelligence */}
          <button 
            onClick={() => {
              setView('hub');
              setHubTab('markets');
            }} 
            className="text-left p-6 sm:p-8 bg-zinc-950 border border-white/10 hover:border-white/30 transition-all duration-500 hover:-translate-y-1 rounded-2xl md:rounded-none min-h-[220px] flex flex-col justify-between group relative overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div>
              <div className="flex justify-between items-start mb-4 sm:mb-6">
                <Activity className="text-white/50 group-hover:text-amber-400 transition-colors duration-500" size={28} />
                <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 text-amber-300 border border-amber-500/20">
                  NSE/BSE & US
                </span>
              </div>
              <div className="font-heading text-2xl sm:text-3xl font-extrabold mb-1 lowercase">markets & alpha.</div>
            </div>
            <div>
              <div className="font-mono text-xs text-white/40 mb-1">Real-time equities telemetry, momentum scans, macroeconomic news pulse, and crypto yields.</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-medium group-hover:translate-x-1 transition-transform flex items-center gap-1">
                View Markets <ChevronRight size={12} />
              </div>
            </div>
          </button>

          {/* The Ledger */}
          <button 
            onClick={() => setView('ledger')} 
            className="text-left p-6 sm:p-8 bg-zinc-950 border border-white/10 hover:border-white/30 transition-all duration-500 hover:-translate-y-1 rounded-2xl md:rounded-none min-h-[220px] flex flex-col justify-between group relative overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div>
              <div className="flex justify-between items-start mb-4 sm:mb-6">
                <FileText className="text-white/50 group-hover:text-rose-400 transition-colors duration-500" size={28} />
                <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 text-rose-300 border border-rose-500/20">
                  Sovereign Capital
                </span>
              </div>
              <div className="font-heading text-2xl sm:text-3xl font-extrabold mb-1 lowercase">the ledger.</div>
            </div>
            <div>
              <div className="font-mono text-xs text-white/40 mb-1">Deep work yield multipliers, asset staking treasury, structured modular notes & block workspace.</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-rose-400 font-medium group-hover:translate-x-1 transition-transform flex items-center gap-1">
                Open Ledger <ChevronRight size={12} />
              </div>
            </div>
          </button>

          {/* Everything Island & Aura Analytics */}
          <button 
            onClick={() => setView('stats')} 
            className="text-left p-6 sm:p-8 bg-zinc-950 border border-white/10 hover:border-white/30 transition-all duration-500 hover:-translate-y-1 rounded-2xl md:rounded-none min-h-[220px] flex flex-col justify-between group relative overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div>
              <div className="flex justify-between items-start mb-4 sm:mb-6">
                <BarChart2 className="text-white/50 group-hover:text-blue-400 transition-colors duration-500" size={28} />
                <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 text-blue-300 border border-blue-500/20">
                  Biometric Flow
                </span>
              </div>
              <div className="font-heading text-2xl sm:text-3xl font-extrabold mb-1 lowercase">aura intelligence.</div>
            </div>
            <div>
              <div className="font-mono text-xs text-white/40 mb-1">AI behavioral insights, momentum surge engine, deep work routine stability & identity evolution.</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-blue-400 font-medium group-hover:translate-x-1 transition-transform flex items-center gap-1">
                View Analytics <ChevronRight size={12} />
              </div>
            </div>
          </button>
        </div>
      </motion.section>

      {/* 3. Quick Start Protocols */}
      <motion.section variants={itemVariants}>
        <div className="flex items-center justify-between mb-6 sm:mb-8 border-b border-white/10 pb-4">
          <h2 className="font-serif text-xl sm:text-2xl md:text-3xl lowercase">quick start</h2>
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">FOCUS PROTOCOLS</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {PRESETS.slice(0, 4).map(p => (
            <button key={p.id} onClick={() => startTimer(p)} className={`text-left p-6 sm:p-8 bg-zinc-950 border border-white/10 hover:border-white/30 transition-all duration-500 hover:-translate-y-1 rounded-2xl md:rounded-none group relative overflow-hidden min-h-[140px] flex flex-col justify-between cursor-pointer`}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div>
                <p.icon className={`mb-4 sm:mb-6 text-white/50 group-hover:text-white transition-colors duration-500`} size={28} />
                <div className="font-heading text-xl sm:text-2xl font-extrabold mb-1 lowercase">{p.name}</div>
              </div>
              <div className="font-mono text-xs text-white/40 mt-2">{p.desc}</div>
            </button>
          ))}
        </div>
      </motion.section>

      {/* 4. Remote MCP Architecture Showcase */}
      <motion.section variants={itemVariants}>
        <div className="flex items-center justify-between mb-6 sm:mb-8 border-b border-white/10 pb-4">
          <h2 className="font-serif text-xl sm:text-2xl md:text-3xl lowercase">neural mcp matrix</h2>
          <span className="text-[10px] font-mono uppercase tracking-widest bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
            JSON-RPC 2.0 PROTOCOL
          </span>
        </div>

        <div className="bg-zinc-950 border border-white/10 p-6 sm:p-8 rounded-2xl md:rounded-none flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:border-white/30 transition-colors duration-500">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <Cpu size={20} className="text-cyan-400" />
              <h3 className="font-heading text-xl sm:text-2xl font-bold lowercase text-white">Remote Model Context Protocol (MCP)</h3>
            </div>
            <p className="text-white/50 text-xs sm:text-sm font-sans leading-relaxed">
              Expose Focus Forge's 12 read-only tools directly to Claude, Grok, and Manus over streamable HTTP. Enforces strict Zod validation, user isolation, and Bearer authentication.
            </p>
            <div className="flex items-center gap-3 pt-2 text-[10px] font-mono text-white/40 flex-wrap">
              <span className="text-cyan-300">Endpoint: /api/mcp</span>
              <span>•</span>
              <span className="text-emerald-300">Health: /api/health</span>
              <span>•</span>
              <span>12 Tools Active</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => {
                window.open('/api/health', '_blank');
              }}
              className="w-full md:w-auto px-5 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-white font-mono text-xs uppercase tracking-wider transition-all"
            >
              Verify Endpoint
            </button>
          </div>
        </div>
      </motion.section>

      {/* 5. End of Page Engagement (CRED Style) */}
      <motion.section variants={itemVariants} className="py-16 sm:py-24 border-t border-white/10 flex flex-col items-center text-center relative px-4">
        <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent pointer-events-none" />
        <Zap size={40} className="mb-6 text-white/20" />
        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4 lowercase">enter the hub</h2>
        <p className="text-white/50 mb-8 max-w-md text-base sm:text-lg">Configure your dopamine rewards and manage your focus environment in the central hub.</p>
        <button onClick={() => setView('hub')} className="relative group cursor-pointer min-h-[48px] flex items-center">
          <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />
          <div className="relative bg-white text-black px-8 sm:px-10 py-4 sm:py-5 rounded-full font-bold uppercase tracking-[0.2em] text-xs sm:text-sm flex items-center gap-3 hover:scale-95 transition-transform duration-500 ease-[cubic-bezier(0.8,0,0.2,1)] shadow-[0_0_30px_rgba(255,255,255,0.3)]">
            Go to Hub <ArrowRight size={16} />
          </div>
        </button>
      </motion.section>
    </motion.div>
  );

  const renderTimerList = () => (
    <motion.div key="timerList" variants={containerVariants} initial="hidden" animate="show" exit="hidden" className="p-4 sm:p-6 md:p-12 max-w-6xl mx-auto space-y-8 sm:space-y-12 pb-32 md:pb-12 min-h-screen">
      <motion.header variants={itemVariants} className="pt-4 sm:pt-8 md:pt-0 border-b border-white/10 pb-6 sm:pb-8">
        <h1 className="font-heading text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight lowercase">timers.</h1>
      </motion.header>

      <motion.div variants={itemVariants} className="flex gap-2 sm:gap-4 overflow-x-auto no-scrollbar pb-2">
        {['All', 'Work', 'Study', 'Creative', 'Custom'].map(f => (
          <button key={f} onClick={() => setTimerFilter(f)} className={`whitespace-nowrap px-4 sm:px-6 py-2.5 sm:py-3 rounded-full text-xs uppercase tracking-[0.2em] font-bold transition-all duration-500 min-h-[44px] cursor-pointer ${timerFilter === f ? 'bg-white text-black' : 'bg-zinc-950 border border-white/10 text-white/40 hover:text-white/70 hover:border-white/30'}`}>
            {f}
          </button>
        ))}
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {(timerFilter === 'All' || timerFilter === 'Custom') && (
          <button onClick={() => {
            setShowCustomTimer(true);
            setShowAddTask(false);
          }} className={`text-left p-6 sm:p-8 bg-zinc-950 border border-white/10 hover:border-white/30 transition-all duration-500 hover:-translate-y-1 flex flex-col justify-between rounded-2xl md:rounded-none min-h-[160px] sm:aspect-square group relative overflow-hidden cursor-pointer`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div>
              <Sliders className={`mb-4 sm:mb-6 text-white/50 group-hover:text-white transition-colors duration-500`} size={28} />
              <div className="font-heading text-2xl sm:text-3xl font-extrabold leading-tight mb-2 lowercase">Custom</div>
            </div>
            <div>
              <div className="font-mono text-xs sm:text-sm text-white/40 mb-1">Build your own</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium">Flexible</div>
            </div>
          </button>
        )}
        {(timerFilter === 'All' || timerFilter === 'Work') && (
          <button onClick={() => {
            setShowCinematicSelector(true);
            setShowAddTask(false);
            setShowCustomTimer(false);
          }} className={`text-left p-6 sm:p-8 bg-zinc-950 border border-white/10 hover:border-white/30 transition-all duration-500 hover:-translate-y-1 flex flex-col justify-between rounded-2xl md:rounded-none min-h-[160px] sm:aspect-square group relative overflow-hidden cursor-pointer`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div>
              <Monitor className={`mb-4 sm:mb-6 text-white/50 group-hover:text-white transition-colors duration-500`} size={28} />
              <div className="font-heading text-2xl sm:text-3xl font-extrabold leading-tight mb-2 lowercase">Cinematic</div>
            </div>
            <div>
              <div className="font-mono text-xs sm:text-sm text-white/40 mb-1">Immersive focus</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium">1.5h+ Deep Work</div>
            </div>
          </button>
        )}
        {PRESETS.filter(p => timerFilter === 'All' || p.cat === timerFilter.toLowerCase()).map(p => (
          <button key={p.id} onClick={() => startTimer(p)} className={`text-left p-6 sm:p-8 bg-zinc-950 border border-white/10 hover:border-white/30 transition-all duration-500 hover:-translate-y-1 flex flex-col justify-between rounded-2xl md:rounded-none min-h-[160px] sm:aspect-square group relative overflow-hidden cursor-pointer`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div>
              <p.icon className={`mb-4 sm:mb-6 text-white/50 group-hover:text-white transition-colors duration-500`} size={28} />
              <div className="font-heading text-2xl sm:text-3xl font-extrabold leading-tight mb-2 lowercase">{p.name}</div>
            </div>
            <div>
              <div className="font-mono text-xs sm:text-sm text-white/40 mb-1">{p.desc}</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium">{p.cycles} cycles</div>
            </div>
          </button>
        ))}
      </motion.div>
    </motion.div>
  );

  const renderActiveTimer = () => {
    if (!activeTimer) return null;
    const currentSeg = activeTimer.segs[segIdx];
    const progress = 1 - (timeLeft / totalSegTime);
    
    const isDopamine = currentSeg.t === 'dopamine';
    const videoData = activeTimer.youtubeUrl ? parseYoutubeUrl(activeTimer.youtubeUrl) : null;

    const isCinematic = activeTimer.id.startsWith('cinematic-');

    if (isCinematic) {
      return (
        <motion.div 
          key="activeTimer-cinematic" 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="fixed inset-0 z-0 bg-black flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Large Atmospheric Timer */}
          <div className="relative z-20 flex items-center justify-center w-[320px] h-[320px] md:w-[500px] md:h-[500px]">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 240 240">
              <circle cx="120" cy="120" r="116" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <circle cx="120" cy="120" r="116" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="728" strokeDashoffset={728 * (1 - progress)} className="transition-all duration-1000 ease-linear drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]" strokeLinecap="round" />
            </svg>
            <div className="text-center absolute flex flex-col items-center justify-center w-full h-full">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="font-heading font-extrabold mb-2 text-white/40 text-xl md:text-2xl lowercase tracking-widest">{activeTimer.name}</motion.div>
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="font-heading font-extrabold tracking-tighter drop-shadow-[0_0_50px_rgba(255,255,255,0.2)] text-8xl md:text-[10rem] text-white"
              >
                {formatTime(timeLeft)}
              </motion.div>
              <div className="mt-8 flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                <span className="text-[10px] font-mono uppercase tracking-[0.6em] text-white/30">Protocol Alpha Active</span>
              </div>
            </div>
          </div>

          {/* Subtle HUD Overlay Details */}
          <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-12">
            <div className="flex justify-between items-start">
              <div className="space-y-1 opacity-0"> {/* Hidden but keeping layout structure if needed */}
                <h2 className="font-heading text-3xl font-extrabold text-white lowercase tracking-tight">{activeTimer.name}</h2>
              </div>
            </div>

            {/* Bottom Progress HUD */}
            <div className="w-full space-y-4 max-w-4xl mx-auto">
              <div className="flex justify-between items-end">
                 <div className="text-[8px] font-mono uppercase tracking-[0.6em] text-white/20">System Clock Sync</div>
                 <div className="text-[8px] font-mono uppercase tracking-[0.6em] text-white/20">{Math.round(progress * 100)}% Protocol Progress</div>
              </div>
              <div className="w-full h-[1px] bg-white/5 relative overflow-hidden">
                <motion.div 
                  className="absolute inset-y-0 left-0 bg-white/40 shadow-[0_0_15px_white]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 1, ease: "linear" }}
                />
              </div>
            </div>
          </div>

          {/* Vignette */}
          <div className="absolute inset-0 z-[5] bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />
        </motion.div>
      );
    }

    return (
      <motion.div key="activeTimer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col min-h-[100dvh] p-6 md:p-12 max-w-6xl mx-auto bg-black justify-center items-center overflow-hidden relative">
        
        {/* Main Timer Display */}
        <div className={`relative flex items-center justify-center transition-all duration-500 w-[320px] h-[320px] md:w-[500px] md:h-[500px] ${videoData ? 'mb-40 md:mb-48' : 'mb-20'}`}>
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 240 240">
            <circle cx="120" cy="120" r="116" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            <circle cx="120" cy="120" r="116" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="728" strokeDashoffset={728 * (1 - progress)} className="transition-all duration-1000 ease-linear drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" strokeLinecap="round" />
          </svg>
          <div className="text-center absolute flex flex-col items-center justify-center w-full h-full">
            <motion.div layout className="font-heading font-extrabold mb-2 text-white/90 text-2xl md:text-4xl lowercase">{activeTimer.name}</motion.div>
            <motion.div layout className="text-white/40 text-[10px] md:text-xs uppercase tracking-[0.2em] mb-8 md:mb-12">Cycle {cycleIdx + 1} of {activeTimer.cycles}</motion.div>
            
            <motion.div layout className="font-heading font-extrabold tracking-tight drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] text-7xl md:text-9xl">{isDopamine ? '00:00' : formatTime(timeLeft)}</motion.div>
            <motion.div layout className="text-white/50 text-xs md:text-sm uppercase tracking-[0.3em] mt-8 md:mt-12">{currentSeg.n}</motion.div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderTasks = () => {
    const filteredTasks = tasks.filter(t => {
      const matchesTab = taskTab === 'all' ? true : taskTab === 'active' ? !t.done : t.done;
      const matchesSearch = taskSearchQuery.trim() === '' || 
        t.title.toLowerCase().includes(taskSearchQuery.toLowerCase()) || 
        (t.desc && t.desc.toLowerCase().includes(taskSearchQuery.toLowerCase())) ||
        (t.tag && t.tag.toLowerCase().includes(taskSearchQuery.toLowerCase()));
      const matchesPriority = taskPriorityFilter === 'all' ? true : t.priority === taskPriorityFilter;
      const matchesCategory = taskCategoryFilter === 'all' ? true : t.category === taskCategoryFilter;
      return matchesTab && matchesSearch && matchesPriority && matchesCategory;
    });

    const activeCount = tasks.filter(t => !t.done).length;
    const completedCount = tasks.filter(t => t.done).length;

    return (
      <motion.div key="tasks" variants={containerVariants} initial="hidden" animate="show" exit="hidden" className="p-4 sm:p-6 md:p-12 max-w-6xl mx-auto space-y-6 sm:space-y-10 pb-32 md:pb-12 min-h-screen">
        <motion.header variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-white/10 pb-6 sm:pb-8 pt-4 sm:pt-8 md:pt-0 gap-4 sm:gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="font-heading text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight lowercase">tasks.</h1>
              <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-white/5 border border-white/10 text-white/60">
                {activeCount} PENDING • {completedCount} DONE
              </span>
            </div>
            <p className="text-white/40 text-xs sm:text-sm mt-1">Sovereign task architecture with sub-checklists, focus timers, and XP yields.</p>
          </div>

          <button onClick={() => {
            setShowAddTask(true);
            setShowCustomTimer(false);
          }} className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white text-black font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-transform duration-300 min-h-[44px] cursor-pointer">
            <Plus size={18} />
            <span>New Task</span>
          </button>
        </motion.header>

        {/* Filter Controls & Search */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 sm:gap-4 justify-between items-stretch md:items-center">
            {/* Status Tabs */}
            <div className="flex gap-2 sm:gap-4 border-b border-white/10 pb-2 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: `All (${tasks.length})` },
                { id: 'active', label: `Active (${activeCount})` },
                { id: 'done', label: `Done (${completedCount})` }
              ].map(tab => (
                <button key={tab.id} onClick={() => setTaskTab(tab.id)} className={`pb-3 text-xs uppercase tracking-[0.2em] font-bold transition-all duration-300 relative whitespace-nowrap min-h-[40px] cursor-pointer ${taskTab === tab.id ? 'text-white' : 'text-white/40 hover:text-white/70'}`}>
                  {tab.label}
                  {taskTab === tab.id && <motion.div layoutId="taskTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-white" />}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-72">
              <input
                type="text"
                value={taskSearchQuery}
                onChange={e => setTaskSearchQuery(e.target.value)}
                placeholder="Search tasks, tags..."
                className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 font-mono transition-colors min-h-[40px]"
              />
              {taskSearchQuery && (
                <button onClick={() => setTaskSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Priority Quick Filter Chips */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-[10px] uppercase font-mono tracking-widest text-white/30 mr-1">Priority:</span>
            {(['all', 'urgent', 'high', 'medium', 'low'] as const).map(p => (
              <button
                key={p}
                onClick={() => setTaskPriorityFilter(p)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all min-h-[32px] cursor-pointer ${
                  taskPriorityFilter === p
                    ? 'bg-white text-black font-bold shadow'
                    : 'bg-white/5 text-white/40 hover:text-white border border-white/5'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tasks List */}
        <motion.div variants={itemVariants} className="space-y-4">
          {filteredTasks.length === 0 && (
            <div className="text-center py-16 sm:py-20 text-white/30 border border-dashed border-white/10 rounded-3xl space-y-3 bg-white/[0.01] px-4">
              <CheckSquare size={40} className="mx-auto opacity-40 text-white" />
              <div className="font-heading text-xl sm:text-2xl lowercase text-white/60">No matching tasks</div>
              <p className="text-xs text-white/40">Create a task or clear active filters to get started.</p>
            </div>
          )}

          {filteredTasks.map(task => {
            const isUrgent = task.priority === 'urgent' && !task.done;
            const isHigh = task.priority === 'high' && !task.done;
            const subtasks = task.subtasks || [];
            const completedSubs = subtasks.filter(s => s.done).length;
            const subProgress = subtasks.length > 0 ? (completedSubs / subtasks.length) * 100 : 0;

            return (
              <div 
                key={task.id} 
                className={`p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border transition-all duration-500 relative group overflow-hidden ${
                  task.done 
                    ? 'bg-white/[0.01] border-white/5 opacity-40' 
                    : isUrgent 
                      ? 'bg-gradient-to-r from-red-950/40 via-zinc-950 to-zinc-950 border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.1)]' 
                      : isHigh 
                        ? 'bg-zinc-950 border-white/20 shadow-[0_0_25px_rgba(255,255,255,0.05)]' 
                        : 'bg-zinc-950/80 border-white/10 hover:border-white/20'
                }`}
              >
                {/* Main Task Row */}
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Checkbox */}
                  <button 
                    onClick={() => toggleTask(task.id)} 
                    className={`mt-0.5 w-8 h-8 sm:w-7 sm:h-7 rounded-xl border-2 flex items-center justify-center transition-all duration-300 shrink-0 cursor-pointer ${
                      task.done 
                        ? 'bg-white border-white text-black' 
                        : isUrgent 
                          ? 'border-red-500/60 hover:bg-red-500/20' 
                          : 'border-white/30 hover:border-white text-transparent'
                    }`}
                  >
                    <CheckSquare size={15} fill="currentColor" className={task.done ? 'block' : 'hidden'} />
                  </button>

                  {/* Body */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className={`font-heading text-xl sm:text-2xl md:text-3xl font-extrabold lowercase truncate ${task.done ? 'line-through text-white/50' : 'text-white'}`}>
                        {task.title}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* 1-Click Focus Launcher */}
                        {!task.done && (
                          <button
                            onClick={(e) => startFocusOnTask(task, e)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer min-h-[36px]"
                            title="Start focus timer on this task"
                          >
                            <Play size={11} fill="currentColor" />
                            <span>Focus</span>
                          </button>
                        )}

                        <button
                          onClick={(e) => deleteTask(task.id, e)}
                          className="w-8 h-8 rounded-full bg-white/5 hover:bg-rose-500/20 text-white/30 hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer min-h-[36px]"
                          title="Delete task"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    {task.desc && (
                      <p className="text-xs text-white/50 leading-relaxed max-w-3xl">{task.desc}</p>
                    )}

                    {/* Metadata chips */}
                    <div className="flex items-center gap-2 sm:gap-3 pt-1 sm:pt-2 flex-wrap text-[10px] font-mono">
                      <span className={`px-2.5 py-0.5 rounded-full uppercase font-bold ${
                        task.priority === 'urgent' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        task.priority === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                        task.priority === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {task.priority}
                      </span>

                      {task.category && (
                        <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/5 uppercase">
                          {task.category}
                        </span>
                      )}

                      {task.tag && (
                        <span className="text-white/40">#{task.tag}</span>
                      )}

                      <span className="text-emerald-400 font-bold">+25 XP • +5 Coins</span>
                    </div>

                    {/* Subtasks Section */}
                    <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-white/5 space-y-2.5">
                      {subtasks.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                            <span>SUBTASKS CHECKLIST</span>
                            <span>{completedSubs}/{subtasks.length} COMPLETED</span>
                          </div>

                          {/* Mini Progress Bar */}
                          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                              animate={{ width: `${subProgress}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>

                          <div className="space-y-1.5 pt-1">
                            {subtasks.map(st => (
                              <div
                                key={st.id}
                                onClick={(e) => toggleSubTask(task.id, st.id, e)}
                                className="flex items-center gap-2.5 p-2.5 sm:p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 cursor-pointer text-xs transition-colors min-h-[40px]"
                              >
                                <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${st.done ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-white/30'}`}>
                                  {st.done && <Check size={11} strokeWidth={3} />}
                                </div>
                                <span className={`font-mono text-xs ${st.done ? 'line-through text-white/40' : 'text-white/90'}`}>{st.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add Subtask Input */}
                      {!task.done && (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="+ Add sub-step..."
                            value={newSubtaskInput[task.id] || ''}
                            onChange={(e) => setNewSubtaskInput({ ...newSubtaskInput, [task.id]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddSubTask(task.id);
                            }}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 font-mono min-h-[36px]"
                          />
                          <button
                            onClick={() => handleAddSubTask(task.id)}
                            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold transition-colors min-h-[36px] cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* SYLLABUS FORGE SECTION */}
        <motion.div variants={itemVariants} className="pt-16 border-t border-white/10">
          <SyllabusForge 
            subjects={subjects} 
            onUpdate={setSubjects} 
          />
        </motion.div>
      </motion.div>
    );
  };

  const renderStats = () => {
    return (
      <motion.div key="analytics" variants={containerVariants} initial="hidden" animate="show" exit="hidden" className="min-h-screen">
        <AuraAnalyticsPage isDarkMode={true} />
      </motion.div>
    );
  };

  const renderHub = () => {
    return (
      <motion.div key="hub" variants={containerVariants} initial="hidden" animate="show" exit="hidden" className="p-4 sm:p-6 md:p-12 max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-32 md:pb-12 min-h-screen">
        <motion.header variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/10 pb-6 sm:pb-8 pt-4 sm:pt-8 md:pt-0 gap-4">
          <div className="space-y-3 sm:space-y-4">
            <h1 className="font-heading text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight lowercase">focus hub.</h1>
            <div className="flex gap-4 sm:gap-6">
              <button 
                onClick={() => setHubTab('learning')}
                className={`text-xs uppercase tracking-[0.4em] font-bold transition-all min-h-[36px] cursor-pointer ${hubTab === 'learning' ? 'text-white' : 'text-white/20 hover:text-white/40'}`}
              >
                Learning
              </button>
              <button 
                onClick={() => setHubTab('markets')}
                className={`text-xs uppercase tracking-[0.4em] font-bold transition-all min-h-[36px] cursor-pointer ${hubTab === 'markets' ? 'text-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.2)]' : 'text-white/20 hover:text-white/40'}`}
              >
                Markets
              </button>
            </div>
          </div>
          {hubTab === 'learning' && (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full md:w-auto">
              <button 
                onClick={() => setView('pdf')}
                className="bg-blue-600/20 border border-blue-500/50 text-blue-400 px-5 sm:px-6 py-3 rounded-full font-bold text-xs sm:text-sm hover:bg-blue-600/30 transition-colors flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
              >
                <BookOpen size={16} /> Learn from PDF
              </button>
              <form onSubmit={handleHubUrlSubmit} className="w-full sm:w-auto flex gap-2">
                <input
                  type="text"
                  value={hubUrl}
                  onChange={(e) => setHubUrl(e.target.value)}
                  placeholder="Paste YouTube URL..."
                  className="bg-white/5 border border-white/10 rounded-full px-4 sm:px-6 py-3 text-xs sm:text-sm focus:outline-none focus:border-emerald-500/50 w-full sm:w-72 md:w-80 transition-all text-white font-mono min-h-[44px]"
                />
                <button type="submit" className="bg-emerald-500 text-black px-5 sm:px-6 py-3 rounded-full font-bold text-xs sm:text-sm hover:bg-emerald-400 transition-colors shrink-0 min-h-[44px] cursor-pointer">
                  Load
                </button>
              </form>
            </div>
          )}
        </motion.header>

        {hubTab === 'learning' ? (
          hubVideoData ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
              {/* Main Video Section */}
              <div className="lg:col-span-2 space-y-4">
                <div className={`relative aspect-video rounded-2xl sm:rounded-3xl border transition-all duration-500 ${isHubTimerActive ? 'border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.2)]' : 'border-white/10'}`}>
                  <CustomYouTubePlayer
                    ref={hubPlayerRef}
                    videoId={hubVideoData.videoId}
                    playlistId={hubVideoData.playlistId}
                    roundedClass="rounded-2xl sm:rounded-3xl"
                    onPlay={() => setIsHubVideoPlaying(true)}
                    onPause={() => setIsHubVideoPlaying(false)}
                    noCrop={true}
                  />
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-white/5 border border-white/10 rounded-2xl p-4 gap-3">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    <button onClick={() => setShowHubTimer(true)} className="bg-white text-black px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors min-h-[40px] cursor-pointer flex-1 sm:flex-none">
                      <Target size={16} />
                      Start Session
                    </button>
                    <button 
                      onClick={() => {
                        if (hubVideoData) {
                          const url = `https://www.youtube.com/watch?v=${hubVideoData.videoId}${hubVideoData.playlistId ? `&list=${hubVideoData.playlistId}` : ''}`;
                          // Dispatch event to ThePlace
                          window.dispatchEvent(new CustomEvent('start-theatre', { detail: { url } }));
                          // Switch view
                          setView('place');
                        }
                      }} 
                      className="bg-white/10 text-white px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-white/20 transition-colors border border-white/10 min-h-[40px] cursor-pointer flex-1 sm:flex-none"
                    >
                      <Monitor size={16} />
                      Theatre
                    </button>
                  </div>
                  <div className="text-white/50 text-xs sm:text-sm font-mono text-center sm:text-right">
                    Status: {isHubTimerActive ? <span className="text-emerald-400 font-bold">Focusing</span> : 'Idle'}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Anti-Divert Monitor */}
                <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2 text-sm sm:text-base"><Camera size={18} className="text-emerald-400" /> Focus Cam</h3>
                    <button
                      onClick={() => setIsFocusCamEnabled(!isFocusCamEnabled)}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${isFocusCamEnabled ? 'bg-emerald-500' : 'bg-white/20'}`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isFocusCamEnabled ? 'translate-x-6' : ''}`} />
                    </button>
                  </div>
                  <div className="aspect-video bg-black rounded-xl overflow-hidden relative border border-white/10">
                    <video 
                      ref={camVideoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className={`w-full h-full object-cover transform scale-x-[-1] ${(isFocusCamEnabled || isMonitorCamEnabled || isFatigueCamEnabled) ? 'opacity-100' : 'opacity-0'}`} 
                    />
                    {!(isFocusCamEnabled || isMonitorCamEnabled || isFatigueCamEnabled) && (
                      <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm pointer-events-none">Cam Disabled</div>
                    )}
                    {isFocusCamEnabled && currentGesture && currentGesture !== "None" && (
                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-emerald-400 border border-emerald-500/30">
                        ✋ {currentGesture}
                      </div>
                    )}
                    {isFocusCamEnabled && !isModelsLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm text-white/50 text-xs">
                        Loading AI Models...
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed">
                    Uses local camera to detect presence. Pauses video if you look away for &gt;15s. No data leaves your device.
                  </p>
                  <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Zap size={16} className={isMonitorCamEnabled ? "text-amber-400" : "text-white/40"} />
                        <div>
                          <span className="text-sm font-bold block">Monitor Cam</span>
                          <span className="text-[10px] text-white/40 block">Strict 3s distraction alarm</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsMonitorCamEnabled(!isMonitorCamEnabled)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${isMonitorCamEnabled ? 'bg-amber-500' : 'bg-white/20'}`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isMonitorCamEnabled ? 'translate-x-5' : ''}`} />
                      </button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Activity size={16} className={isFatigueCamEnabled ? "text-blue-400" : "text-white/40"} />
                        <div>
                          <span className="text-sm font-bold block">Fatigue Cam</span>
                          <span className="text-[10px] text-white/40 block">Detects head-nods / sleepiness</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsFatigueCamEnabled(!isFatigueCamEnabled)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${isFatigueCamEnabled ? 'bg-blue-500' : 'bg-white/20'}`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isFatigueCamEnabled ? 'translate-x-5' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Study Pet */}
                <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                    <div className="h-full bg-emerald-400 transition-all duration-1000" style={{ width: `${(petLevel % 5) * 20}%` }} />
                  </div>
                  <div className="text-6xl mb-4 animate-bounce" style={{ animationDuration: '3s' }}>
                    {petLevel < 5 ? '🥚' : petLevel < 10 ? '🐥' : '🦅'}
                  </div>
                  <div className="text-sm font-bold text-white/90">Study Pet (Lvl {petLevel})</div>
                  <div className="text-xs text-white/50 mt-1">Grows with focus streaks!</div>
                </div>

                {/* AURA Analytics Widget */}
                <AuraSidebarWidget />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center space-y-6 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                <Play size={32} className="text-white/20 ml-2" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Paste a YouTube URL to begin</h3>
                <p className="text-white/40 text-sm max-w-md mx-auto">
                  Enter focus mode with zero distractions. No recommendations, no comments, just you and the content.
                </p>
              </div>
            </div>
          )
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full h-full"
          >
            <Markets />
          </motion.div>
        )}

        {/* Dock Timer (Expandable) */}
        <AnimatePresence>
          {showHubTimer && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-3xl border-t border-white/10 p-6 md:p-8 z-50 rounded-t-[3rem] shadow-[0_-20px_100px_rgba(0,0,0,0.8)]"
            >
              <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 relative">
                <div className="flex gap-2 bg-white/5 p-1.5 rounded-full">
                  {(['pomodoro', 'ultradian', 'custom'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => {
                        setHubTimerMode(mode);
                        setHubTimerTime(mode === 'pomodoro' ? 25 * 60 : mode === 'ultradian' ? 90 * 60 : 15 * 60);
                        setIsHubTimerActive(false);
                      }}
                      className={`px-6 py-2.5 rounded-full text-sm font-bold capitalize transition-all ${hubTimerMode === mode ? 'bg-white text-black shadow-lg' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-6xl font-mono font-bold tracking-tighter">
                    {Math.floor(hubTimerTime / 60).toString().padStart(2, '0')}:{(hubTimerTime % 60).toString().padStart(2, '0')}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setIsHubTimerActive(!isHubTimerActive)}
                      className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-xl ${isHubTimerActive ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-emerald-500 text-black hover:bg-emerald-400'}`}
                    >
                      {isHubTimerActive ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current ml-1" />}
                    </button>
                    <button 
                      onClick={() => { setIsHubTimerActive(false); setHubTimerTime(hubTimerMode === 'pomodoro' ? 25 * 60 : hubTimerMode === 'ultradian' ? 90 * 60 : 15 * 60); }}
                      className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <RotateCcw size={18} />
                    </button>
                  </div>
                </div>

                <button onClick={() => setShowHubTimer(false)} className="absolute -top-4 -right-4 md:top-0 md:right-0 p-3 rounded-full bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                  <X size={20} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const renderProfile = () => {
    const mcpServerUrl = typeof window !== 'undefined' && window.location.origin
      ? `${window.location.origin}/api/mcp`
      : 'https://focusforge-dcxj.vercel.app/api/mcp';

    const claudeJsonSnippet = JSON.stringify({
      mcpServers: {
        focusforge: {
          command: "npx",
          args: [
            "-y",
            "mcp-remote",
            mcpServerUrl
          ]
        }
      }
    }, null, 2);

    const windsurfJsonSnippet = JSON.stringify({
      mcpServers: {
        focusforge: {
          command: "npx",
          args: [
            "-y",
            "mcp-remote",
            mcpServerUrl
          ]
        }
      }
    }, null, 2);

    const curlSnippet = `curl -X POST ${mcpServerUrl} \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'`;

    const copyMcpUrl = () => {
      navigator.clipboard.writeText(mcpServerUrl);
      setCopiedMcpUrl(true);
      setTimeout(() => setCopiedMcpUrl(false), 2500);
    };

    const copySnippet = (text: string, type: string) => {
      navigator.clipboard.writeText(text);
      setCopiedConfigType(type);
      setTimeout(() => setCopiedConfigType(null), 2500);
    };

    return (
      <motion.div key="profile" variants={containerVariants} initial="hidden" animate="show" exit="hidden" className="p-4 sm:p-6 md:p-12 max-w-6xl mx-auto space-y-8 sm:space-y-12 pb-32 md:pb-12 min-h-screen">
        {/* Header with Sub-Navigation Tabs */}
        <motion.header variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-white/10 pb-6 sm:pb-8 pt-4 sm:pt-8 md:pt-0 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight lowercase">
                {profileTab === 'vector' ? 'vector.' : 'profile.'}
              </h1>
              {profileTab === 'vector' && (
                <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  MCP PROTOCOL LIVE
                </span>
              )}
            </div>
            <p className="text-white/40 text-xs font-mono mt-1">
              {profileTab === 'vector' 
                ? 'MODEL CONTEXT PROTOCOL (MCP) • SOVEREIGN WORKSPACE BRIDGE' 
                : 'SOVEREIGN EXECUTIVE IDENTITY • COGNITIVE TELEMETRY'}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Tab Switcher */}
            <div className="flex items-center p-1 bg-white/5 border border-white/10 rounded-2xl">
              <button
                onClick={() => setProfileTab('identity')}
                className={`px-5 py-2 rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition-all duration-300 flex items-center gap-2 ${
                  profileTab === 'identity'
                    ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)]'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                <User size={13} />
                <span>Identity</span>
              </button>
              <button
                onClick={() => setProfileTab('vector')}
                className={`px-5 py-2 rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition-all duration-300 flex items-center gap-2 ${
                  profileTab === 'vector'
                    ? 'bg-gradient-to-r from-cyan-400 to-sky-400 text-black shadow-[0_0_25px_rgba(34,211,238,0.5)]'
                    : 'text-cyan-400/80 hover:text-cyan-400'
                }`}
              >
                <Zap size={13} />
                <span>Vector</span>
                <span className="text-[9px] px-1.5 py-0.2 bg-black/20 rounded font-mono font-black">MCP</span>
              </button>
            </div>

            {profileTab === 'identity' && (
              <button 
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className="px-4 py-2 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-2 min-h-[38px] cursor-pointer"
              >
                <Settings size={14} />
                <span>{isEditingProfile ? 'Cancel Edit' : 'Edit'}</span>
              </button>
            )}
          </div>
        </motion.header>

        {/* ================= IDENTITY TAB VIEW ================= */}
        {profileTab === 'identity' && (
          <div className="space-y-8 sm:space-y-16">
            {/* User Hero Section & Stats */}
            <motion.section variants={itemVariants} className="flex flex-col md:flex-row gap-6 sm:gap-8 items-center md:items-start bg-zinc-950/80 border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 backdrop-blur-2xl">
              <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-cyan-500/20 via-zinc-900 to-purple-500/20 border border-white/15 flex items-center justify-center font-heading font-extrabold text-3xl sm:text-5xl md:text-6xl shadow-[0_0_50px_rgba(255,255,255,0.05)] relative group overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="text-white drop-shadow-lg">{user.name[0] || 'F'}</span>
              </div>

              <div className="flex-1 text-center md:text-left space-y-4 w-full">
                {isEditingProfile ? (
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="text-[10px] uppercase font-mono tracking-widest text-white/40 block mb-1">Display Name</label>
                      <input
                        type="text"
                        value={editUserName}
                        onChange={e => setEditUserName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-white/40 font-mono"
                        placeholder="Your Name..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-mono tracking-widest text-white/40 block mb-1">Moniker / Title</label>
                      <input
                        type="text"
                        value={editUserMoniker}
                        onChange={e => setEditUserMoniker(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-white/40 font-mono"
                        placeholder="e.g. Sovereign Flow Architect"
                      />
                    </div>
                    <button
                      onClick={handleSaveProfile}
                      className="px-6 py-2 rounded-xl bg-white text-black text-xs font-mono font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
                    >
                      Save Identity
                    </button>
                  </div>
                ) : (
                  <div>
                    <h2 className="font-heading text-3xl md:text-4xl font-extrabold lowercase text-white">{user.name}</h2>
                    <p className="text-xs font-mono uppercase tracking-widest text-cyan-400 mt-1">{user.moniker || 'Sovereign Flow Architect'}</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                  <span className="px-3.5 py-1.5 rounded-full bg-white/10 text-xs font-mono uppercase tracking-[0.2em] font-bold text-white border border-white/10">
                    Level {user.level}
                  </span>
                  <span className="px-3.5 py-1.5 rounded-full bg-cyan-500/10 text-xs font-mono uppercase tracking-[0.2em] font-bold text-cyan-400 border border-cyan-500/20">
                    {user.xp} XP
                  </span>
                  <span className="px-3.5 py-1.5 rounded-full bg-amber-500/10 text-xs font-mono uppercase tracking-[0.2em] font-bold text-amber-400 border border-amber-500/20">
                    {user.coins} Focus Coins
                  </span>
                  <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-xs font-mono uppercase tracking-[0.2em] font-bold text-emerald-400 border border-emerald-500/20">
                    {user.streak}d Streak
                  </span>
                </div>
              </div>
            </motion.section>

            {/* 30-Day Activity Heatmap */}
            <motion.section variants={itemVariants} className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="font-heading text-xl md:text-2xl font-bold lowercase text-white">Focus Activity Matrix</h2>
                <span className="text-[10px] font-mono text-white/40 uppercase">30-Day Velocity</span>
              </div>
              <div className="bg-zinc-950/80 border border-white/10 rounded-3xl p-6 backdrop-blur-2xl space-y-3">
                <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-30 gap-1.5">
                  {Array.from({ length: 30 }).map((_, i) => {
                    const intensity = (i * 7 + 3) % 5;
                    return (
                      <div
                        key={i}
                        title={`Day ${30 - i}: ${intensity * 45} mins focus`}
                        className={`aspect-square rounded-md transition-all hover:scale-125 cursor-pointer ${
                          intensity === 4 ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]' :
                          intensity === 3 ? 'bg-cyan-600/80' :
                          intensity === 2 ? 'bg-cyan-800/60' :
                          intensity === 1 ? 'bg-white/10' :
                          'bg-white/5'
                        }`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between items-center text-[9px] font-mono text-white/30 pt-2 border-t border-white/5">
                  <span>30 DAYS AGO</span>
                  <div className="flex items-center gap-1.5">
                    <span>LESS</span>
                    <div className="w-2.5 h-2.5 rounded bg-white/5" />
                    <div className="w-2.5 h-2.5 rounded bg-cyan-800/60" />
                    <div className="w-2.5 h-2.5 rounded bg-cyan-600/80" />
                    <div className="w-2.5 h-2.5 rounded bg-cyan-400" />
                    <span>MORE</span>
                  </div>
                  <span>TODAY</span>
                </div>
              </div>
            </motion.section>

            {/* AI Model Architecture & Key Configuration */}
            <motion.section variants={itemVariants} className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <Bot size={22} className="text-cyan-400" />
                  <h2 className="font-heading text-xl md:text-2xl font-bold lowercase text-white">AI Engine & Model Architecture</h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-widest bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  GEMMA 4 26B & GEMINI LIVE
                </span>
              </div>

              <AiModelSelector />
            </motion.section>

            {/* YouTube Data API & Global Media Search Configuration */}
            <motion.section variants={itemVariants} className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <Monitor size={22} className="text-red-400" />
                  <h2 className="font-heading text-xl md:text-2xl font-bold lowercase text-white">YouTube Data Engine</h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/30">
                  DATA API V3 SEARCH
                </span>
              </div>

              <YouTubeApiConfig />
            </motion.section>

            {/* J.A.R.V.I.S. Voice AI & Wake Word Protocol */}
            <motion.section variants={itemVariants} className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <Sparkles size={20} className="text-cyan-400 animate-pulse" />
                  <h2 className="font-heading text-xl md:text-2xl font-bold lowercase text-white">J.A.R.V.I.S. Voice AI Protocol</h2>
                </div>
                <span className="text-xs font-mono text-cyan-400/80 uppercase tracking-widest font-bold">Wake Word: "JARVIS"</span>
              </div>

              <div className="bg-zinc-950/80 border border-cyan-500/20 rounded-3xl p-6 md:p-8 space-y-6 backdrop-blur-2xl shadow-[0_0_30px_rgba(34,211,238,0.05)]">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
                  <div>
                    <h3 className="font-bold text-white text-base">Continuous Hotword Detection</h3>
                    <p className="text-xs text-white/50 font-mono mt-1">
                      When active, simply say <span className="text-cyan-400 font-bold font-mono">"JARVIS"</span> or <span className="text-cyan-400 font-bold font-mono">"Hey JARVIS"</span> anywhere to trigger holographic voice mode.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const jarvisStore = useJarvisStore.getState();
                        jarvisStore.setIsHotwordEnabled(!jarvisStore.isHotwordEnabled);
                      }}
                      className={`px-5 py-2.5 rounded-2xl border text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                        useJarvisStore.getState().isHotwordEnabled
                          ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
                          : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                      }`}
                    >
                      <Radio size={14} className={useJarvisStore.getState().isHotwordEnabled ? "animate-pulse text-cyan-400" : ""} />
                      <span>{useJarvisStore.getState().isHotwordEnabled ? 'Hotword: ACTIVE' : 'Hotword: DISABLED'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-bold text-white/80 uppercase tracking-wider">Voice Speech Output (TTS)</span>
                      <button
                        onClick={() => {
                          const jarvisStore = useJarvisStore.getState();
                          jarvisStore.setVoiceFeedbackEnabled(!jarvisStore.voiceFeedbackEnabled);
                        }}
                        className={`px-3 py-1 rounded-xl text-[10px] font-mono uppercase font-bold border transition-colors ${
                          useJarvisStore.getState().voiceFeedbackEnabled
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'bg-white/5 text-white/40 border-white/10'
                        }`}
                      >
                        {useJarvisStore.getState().voiceFeedbackEnabled ? 'Audio Speech ON' : 'Audio Speech OFF'}
                      </button>
                    </div>
                    <p className="text-[11px] text-white/40 font-mono">
                      J.A.R.V.I.S. will speak aloud using high-fidelity synthesized executive voice.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-white/80 uppercase tracking-wider block">Direct HUD Launcher</span>
                      <p className="text-[11px] text-white/40 font-mono mt-0.5">
                        Shortcut: <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">Ctrl</kbd> + <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">J</kbd>
                      </p>
                    </div>
                    <button
                      onClick={() => useJarvisStore.getState().openJarvis()}
                      className="px-4 py-2.5 bg-cyan-400 text-black font-mono font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-cyan-300 transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)] flex items-center gap-1.5"
                    >
                      <Sparkles size={14} />
                      <span>Launch HUD</span>
                    </button>
                  </div>
                </div>

                {/* Interactive Wake-Word Training Studio */}
                <div className="pt-4 border-t border-white/10">
                  <WakeWordTraining />
                </div>
              </div>
            </motion.section>

            {/* Ghost Shelf Archive */}
            <motion.section variants={itemVariants} className="space-y-4 pb-12">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <BookOpen size={20} className="text-purple-400" />
                  <h2 className="font-heading text-xl md:text-2xl font-bold lowercase text-white">Ghost Shelf (Bookmarked Media)</h2>
                </div>
                <span className="text-xs font-mono text-white/40">{ghostShelf.length} ITEMS</span>
              </div>

              <div className="bg-zinc-950/80 border border-white/10 rounded-3xl p-6 backdrop-blur-2xl">
                {ghostShelf.length === 0 ? (
                  <div className="text-white/40 text-xs font-mono text-center py-10">
                    Your archive is empty. Siphon articles or videos in Everything Island to store them here.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ghostShelf.map((item, idx) => (
                      <a 
                        href={item.url} 
                        onClick={(e) => {
                          if (item.url && (item.url.includes('youtube.com') || item.url.includes('youtu.be'))) {
                            e.preventDefault();
                            window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'place' } }));
                            setTimeout(() => {
                              window.dispatchEvent(new CustomEvent('start-theatre', { detail: { url: item.url } }));
                            }, 50);
                          }
                        }} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        key={idx} 
                        className="block group"
                      >
                        <div className="bg-white/5 border border-white/10 p-4 group-hover:bg-white/10 group-hover:border-white/30 transition-all rounded-2xl relative overflow-hidden">
                          <h3 className="font-bold text-sm mb-1 text-white truncate max-w-full">{item.title}</h3>
                          <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                            <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                            <span className="uppercase tracking-widest text-cyan-400">{item.type}</span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </motion.section>
          </div>
        )}

        {/* ================= VECTOR TAB VIEW (MCP PROTOCOL) ================= */}
        {profileTab === 'vector' && (
          <div className="space-y-8 sm:space-y-12 pb-16">
            {/* 1. Master Connection Bar & 1-Click Copy MCP URL */}
            <motion.section 
              variants={itemVariants}
              className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-cyan-950/40 via-zinc-950 to-purple-950/30 border border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.1)] backdrop-blur-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
              
              <div className="relative z-10 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-[10px] font-mono uppercase tracking-[0.3em] font-bold text-emerald-400">MCP ENDPOINT ONLINE</span>
                    </div>
                    <h2 className="font-heading text-2xl sm:text-3xl font-extrabold lowercase text-white">
                      connect to external ai tools
                    </h2>
                    <p className="text-xs sm:text-sm text-white/60 font-sans max-w-2xl">
                      Bridge Focus Forge sovereign workspace tools directly into Claude Desktop, Cursor IDE, Windsurf, Grok, Manus, and custom autonomous agents.
                    </p>
                  </div>

                  {/* Copy MCP Server URL Hero Button */}
                  <button
                    onClick={copyMcpUrl}
                    className={`px-6 py-3.5 rounded-2xl font-mono text-xs uppercase tracking-wider font-bold transition-all duration-300 flex items-center gap-2.5 shrink-0 shadow-lg cursor-pointer ${
                      copiedMcpUrl
                        ? 'bg-emerald-400 text-black shadow-[0_0_30px_rgba(52,211,153,0.6)] scale-105'
                        : 'bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 text-black hover:scale-[1.02] shadow-[0_0_25px_rgba(34,211,238,0.4)]'
                    }`}
                  >
                    {copiedMcpUrl ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                    <span>{copiedMcpUrl ? 'Copied MCP Server URL!' : 'Copy MCP Server URL'}</span>
                  </button>
                </div>

                {/* Live URL Pill Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white/60 text-[10px] uppercase font-bold shrink-0">SSE / JSON-RPC</span>
                    <span className="text-cyan-300 truncate select-all">{mcpServerUrl}</span>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 text-[11px] text-white/40">
                    <span className="text-emerald-400 font-bold">12 Tools Active</span>
                    <span>•</span>
                    <span>No Auth Needed</span>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* 2. Interactive Collapsible Box: Step-by-Step AI Client Guide */}
            <motion.section variants={itemVariants} className="space-y-4">
              <div 
                onClick={() => setIsMcpGuideOpen(!isMcpGuideOpen)}
                className="flex items-center justify-between p-5 rounded-2xl bg-zinc-950/90 border border-white/15 hover:border-cyan-500/40 transition-all cursor-pointer select-none group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Code2 size={18} />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold lowercase text-white group-hover:text-cyan-300 transition-colors">
                      Step-by-Step AI Client Integration Guide
                    </h3>
                    <p className="text-[11px] font-mono text-white/40">
                      Claude Desktop • Cursor IDE • Windsurf / Cascade • Grok & Manus
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-white/40 group-hover:text-white transition-colors">
                  <span className="text-[10px] font-mono uppercase tracking-widest hidden sm:inline">
                    {isMcpGuideOpen ? 'Collapse Guide' : 'Expand Guide'}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    {isMcpGuideOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </div>

              {/* Animated Collapsible Body */}
              <AnimatePresence>
                {isMcpGuideOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35, ease: credEase }}
                    className="overflow-hidden space-y-6 pt-2"
                  >
                    {/* Client 1: Claude Desktop */}
                    <div className="p-6 rounded-3xl bg-zinc-950/80 border border-white/10 space-y-4 backdrop-blur-xl">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-white/10 pb-4">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-mono text-xs font-bold flex items-center justify-center">1</span>
                          <h4 className="font-bold text-white text-base">Claude Desktop Integration</h4>
                        </div>
                        <span className="text-[11px] font-mono text-white/40">claude_desktop_config.json</span>
                      </div>

                      <div className="space-y-3 text-xs text-white/70">
                        <p>
                          <strong className="text-white">Step 1:</strong> Locate or create your Claude Desktop configuration file:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-white/40 block text-[9px] uppercase">macOS</span>
                            <span className="text-white/90 select-all">~/Library/Application Support/Claude/claude_desktop_config.json</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-white/40 block text-[9px] uppercase">Windows</span>
                            <span className="text-white/90 select-all">%APPDATA%\Claude\claude_desktop_config.json</span>
                          </div>
                        </div>

                        <p className="pt-2">
                          <strong className="text-white">Step 2:</strong> Add the <code className="text-cyan-300 font-mono">focusforge</code> MCP server block:
                        </p>
                        <div className="relative group/code">
                          <pre className="p-4 rounded-2xl bg-black/90 border border-white/10 text-cyan-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
                            {claudeJsonSnippet}
                          </pre>
                          <button
                            onClick={() => copySnippet(claudeJsonSnippet, 'claude')}
                            className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-mono uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer"
                          >
                            {copiedConfigType === 'claude' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            <span>{copiedConfigType === 'claude' ? 'Copied' : 'Copy JSON'}</span>
                          </button>
                        </div>

                        <p className="text-white/50 text-[11px] pt-1">
                          <strong className="text-white">Step 3:</strong> Completely restart Claude Desktop. The hammer icon in Claude will light up with all 12 Focus Forge tools!
                        </p>
                      </div>
                    </div>

                    {/* Client 2: Cursor IDE */}
                    <div className="p-6 rounded-3xl bg-zinc-950/80 border border-white/10 space-y-4 backdrop-blur-xl">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-white/10 pb-4">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold flex items-center justify-center">2</span>
                          <h4 className="font-bold text-white text-base">Cursor IDE Integration</h4>
                        </div>
                        <span className="text-[11px] font-mono text-white/40">Cursor Settings → Features → MCP</span>
                      </div>

                      <div className="space-y-3 text-xs text-white/70">
                        <p>
                          <strong className="text-white">Step 1:</strong> Open Cursor Settings (<kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px]">Ctrl</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px]">Cmd</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px]">,</kbd>), navigate to <strong>Features</strong> → <strong>MCP</strong>, and click <strong>+ Add New MCP Server</strong>.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-[11px]">
                          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-white/40 block text-[9px] uppercase">Name</span>
                            <span className="text-white font-bold">focusforge</span>
                          </div>
                          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-white/40 block text-[9px] uppercase">Type</span>
                            <span className="text-cyan-300 font-bold">command</span>
                          </div>
                          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-white/40 block text-[9px] uppercase">Command</span>
                            <span className="text-white/90 truncate block select-all">npx -y mcp-remote {mcpServerUrl}</span>
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => copySnippet(`npx -y mcp-remote ${mcpServerUrl}`, 'cursor')}
                            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono uppercase tracking-wider font-bold transition-all flex items-center gap-2 border border-white/10 cursor-pointer"
                          >
                            {copiedConfigType === 'cursor' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                            <span>{copiedConfigType === 'cursor' ? 'Command Copied' : 'Copy Cursor Command'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Client 3: Windsurf / Cascade */}
                    <div className="p-6 rounded-3xl bg-zinc-950/80 border border-white/10 space-y-4 backdrop-blur-xl">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-white/10 pb-4">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 font-mono text-xs font-bold flex items-center justify-center">3</span>
                          <h4 className="font-bold text-white text-base">Windsurf (Cascade) Integration</h4>
                        </div>
                        <span className="text-[11px] font-mono text-white/40">~/.codeium/windsurf/mcp_config.json</span>
                      </div>

                      <div className="space-y-3 text-xs text-white/70">
                        <p>
                          Add the configuration to <code className="text-purple-300 font-mono">~/.codeium/windsurf/mcp_config.json</code>:
                        </p>
                        <div className="relative group/code">
                          <pre className="p-4 rounded-2xl bg-black/90 border border-white/10 text-purple-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
                            {windsurfJsonSnippet}
                          </pre>
                          <button
                            onClick={() => copySnippet(windsurfJsonSnippet, 'windsurf')}
                            className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-mono uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer"
                          >
                            {copiedConfigType === 'windsurf' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            <span>{copiedConfigType === 'windsurf' ? 'Copied' : 'Copy JSON'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Client 4: Grok, Manus & cURL */}
                    <div className="p-6 rounded-3xl bg-zinc-950/80 border border-white/10 space-y-4 backdrop-blur-xl">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-white/10 pb-4">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 font-mono text-xs font-bold flex items-center justify-center">4</span>
                          <h4 className="font-bold text-white text-base">Grok, Manus & Autonomous Agents (HTTP / cURL)</h4>
                        </div>
                        <span className="text-[11px] font-mono text-white/40">JSON-RPC 2.0 POST</span>
                      </div>

                      <div className="space-y-3 text-xs text-white/70">
                        <p>
                          Focus Forge implements full <strong>JSON-RPC 2.0</strong> protocol over standard HTTP POST and Server-Sent Events (SSE). Test the live endpoint instantly:
                        </p>
                        <div className="relative group/code">
                          <pre className="p-4 rounded-2xl bg-black/90 border border-white/10 text-rose-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
                            {curlSnippet}
                          </pre>
                          <button
                            onClick={() => copySnippet(curlSnippet, 'curl')}
                            className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-mono uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer"
                          >
                            {copiedConfigType === 'curl' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            <span>{copiedConfigType === 'curl' ? 'Copied' : 'Copy cURL'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            {/* 3. Catalog of 12 Exposed Live Tools */}
            <motion.section variants={itemVariants} className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <Terminal size={20} className="text-cyan-400" />
                  <h3 className="font-heading text-xl md:text-2xl font-bold lowercase text-white">
                    12 Live Sovereign MCP Tools
                  </h3>
                </div>
                <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  ALL CAPABILITIES EXPOSED
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'focusforge_get_tasks', desc: 'Fetch user tasks, filtered by status, priority, or category tag.', tag: 'TASK ENGINE' },
                  { name: 'focusforge_create_task', desc: 'Insert a new task into the sovereign task store with estimated minutes.', tag: 'TASK ENGINE' },
                  { name: 'focusforge_get_notes', desc: 'Read notes and ideas captured in The Ledger with tags and timestamps.', tag: 'THE LEDGER' },
                  { name: 'focusforge_create_note', desc: 'Append a new markdown thought or memo into The Ledger store.', tag: 'THE LEDGER' },
                  { name: 'focusforge_search_youtube', desc: 'Search YouTube Data API v3 for ambient focus audio, videos, and study tracks.', tag: 'MEDIA SEARCH' },
                  { name: 'focusforge_get_frequency_status', desc: 'Get live playback status, current track, and binaural sound frequency.', tag: 'FREQUENCY' },
                  { name: 'focusforge_control_frequency', desc: 'Control playback state (play, pause, next, prev, volume, switch frequency).', tag: 'FREQUENCY' },
                  { name: 'focusforge_get_market_quote', desc: 'Live market ticker quotes for US and Indian NSE/BSE stocks and crypto.', tag: 'FINANCIAL' },
                  { name: 'focusforge_get_weather', desc: 'Real-time meteorological conditions, temperature, humidity, and forecast.', tag: 'ATMOSPHERE' },
                  { name: 'focusforge_get_world_pulse', desc: 'Breaking world intelligence, geopolitical developments, and tech headlines.', tag: 'INTELLIGENCE' },
                  { name: 'focusforge_siphon_url', desc: 'Siphon web content into clean reader markdown directly into the Ghost Shelf.', tag: 'SIPHON' },
                  { name: 'focusforge_get_system_telemetry', desc: 'Retrieve executive telemetry: user XP, level, active timers, and velocity.', tag: 'SYSTEM' },
                ].map((tool, idx) => (
                  <div 
                    key={idx} 
                    className="p-5 rounded-2xl bg-zinc-950/70 border border-white/10 hover:border-cyan-500/30 transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-widest px-2 py-0.5 bg-cyan-500/10 rounded">
                        {tool.tag}
                      </span>
                    </div>
                    <h4 className="font-mono text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {tool.name}
                    </h4>
                    <p className="text-xs text-white/50 leading-relaxed font-sans">
                      {tool.desc}
                    </p>
                  </div>
                ))}
              </div>
            </motion.section>
          </div>
        )}
      </motion.div>
    );
  };

  // --- Global Dynamic Dock ---
  const GlobalDock = () => {
    const currentSeg = activeTimer?.segs[segIdx];
    const isDopamine = currentSeg?.t === 'dopamine';
    
    const getGlowStyle = () => {
      if (!isRunning || !currentSeg) return '0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.15)';
      if (currentSeg.t === 'work') {
        return '0 0 50px rgba(255,255,255,0.3), 0 0 0 1px rgba(255,255,255,0.3)';
      } else {
        return '0 0 50px rgba(100,255,100,0.3), 0 0 0 1px rgba(100,255,100,0.4)';
      }
    };

    const springConfig = { type: "spring" as const, stiffness: 500, damping: 25, mass: 1 };

    return (
      <div className="fixed bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-[200]">
        <motion.div 
          layout
          transition={springConfig}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1, boxShadow: getGlowStyle() }}
          className={`bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center overflow-hidden transition-all duration-500 ${showAddTask || showCustomTimer ? 'p-6 md:p-8 w-[90vw] md:w-[500px] flex-col items-stretch' : 'p-2'}`}
          style={{ borderRadius: showAddTask || showCustomTimer ? 32 : 9999 }}
        >
          {frequencyStore.isPlaying && !showAddTask && !showCustomTimer && (
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/5">
              <div 
                className="h-full bg-purple-500 transition-all duration-300" 
                style={{ 
                  width: `${frequencyStore.duration > 0 ? Math.min(100, Math.max(0, (frequencyStore.currentTime / frequencyStore.duration) * 100)) : 0}%`,
                  boxShadow: '0 -2px 10px 1px rgba(168, 85, 247, 0.7), 0 -4px 20px rgba(168, 85, 247, 0.4)'
                }} 
              />
            </div>
          )}
          <AnimatePresence mode="popLayout" initial={false}>
            {showAddTask ? (
              <motion.div
                key="add-task-form"
                initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                transition={springConfig}
                className="space-y-6 w-full"
              >
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="font-heading text-2xl font-extrabold lowercase">new task.</h2>
                  <button onClick={() => setShowAddTask(false)} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition-all duration-500"><X size={16} /></button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <input 
                      value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})}
                      className="w-full bg-transparent border-b border-white/20 py-2 text-xl font-heading font-extrabold text-white placeholder:text-white/20 focus:outline-none focus:border-white transition-colors"
                      placeholder="What needs to be done?"
                      autoFocus
                    />
                  </div>
                  <div>
                    <textarea 
                      value={newTask.desc} onChange={e => setNewTask({...newTask, desc: e.target.value})}
                      className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors h-24 resize-none"
                      placeholder="Add details..."
                    />
                  </div>
                  <div>
                    <div className="flex gap-2">
                      {['high', 'medium', 'low'].map(p => (
                        <button 
                          key={p} onClick={() => setNewTask({...newTask, priority: p as any})}
                          className={`flex-1 py-2 rounded-lg text-[10px] uppercase tracking-[0.2em] font-bold transition-all duration-500 border ${newTask.priority === p ? 'bg-white text-black border-white' : 'bg-transparent border-white/10 text-white/40 hover:border-white/30'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={addTask} className="w-full bg-white text-black font-bold uppercase tracking-[0.2em] text-xs py-4 rounded-xl mt-2 hover:scale-[0.98] active:scale-95 transition-transform duration-500 ease-[cubic-bezier(0.8,0,0.2,1)] shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                    Add Task
                  </button>
                </div>
              </motion.div>
            ) : showCustomTimer ? (
              <motion.div
                key="custom-timer-form"
                initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                transition={springConfig}
                className="space-y-6 w-full"
              >
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="font-heading text-2xl font-extrabold lowercase">custom timer.</h2>
                  <button onClick={() => setShowCustomTimer(false)} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition-all duration-500"><X size={16} /></button>
                </div>
                
                <div className="flex gap-2">
                  <button onClick={() => setCustomMode('work')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500 ${customMode === 'work' ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>Work</button>
                  <button onClick={() => setCustomMode('learn')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500 ${customMode === 'learn' ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>Learn</button>
                  <button onClick={() => setCustomMode('dopamine')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500 ${customMode === 'dopamine' ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>Dopamine</button>
                </div>

                {customMode === 'work' ? (
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-medium">Focus</label>
                        <span className="font-mono text-xs text-white">{customConfig.focus}m</span>
                      </div>
                      <input type="range" min="1" max="120" value={customConfig.focus} onChange={e => setCustomConfig({...customConfig, focus: parseInt(e.target.value)})} className="w-full accent-white h-1 bg-white/20 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-medium">Break</label>
                        <span className="font-mono text-xs text-white">{customConfig.break}m</span>
                      </div>
                      <input type="range" min="1" max="30" value={customConfig.break} onChange={e => setCustomConfig({...customConfig, break: parseInt(e.target.value)})} className="w-full accent-white h-1 bg-white/20 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-medium">Cycles</label>
                        <span className="font-mono text-xs text-white">{customConfig.cycles}</span>
                      </div>
                      <input type="range" min="1" max="10" value={customConfig.cycles} onChange={e => setCustomConfig({...customConfig, cycles: parseInt(e.target.value)})} className="w-full accent-white h-1 bg-white/20 rounded-lg appearance-none cursor-pointer" />
                    </div>

                    <button onClick={() => {
                      setShowCustomTimer(false);
                      startTimer({
                        id: 'custom',
                        name: 'Custom',
                        icon: Sliders,
                        color: 'text-white',
                        bg: 'bg-zinc-900 border-white/10',
                        cat: 'custom',
                        segs: [
                          { n: 'Focus', d: customConfig.focus * 60, t: 'work' },
                          { n: 'Break', d: customConfig.break * 60, t: 'rest' }
                        ],
                        cycles: customConfig.cycles,
                        desc: `${customConfig.focus}m focus, ${customConfig.break}m break`
                      });
                    }} className="w-full bg-white text-black font-bold uppercase tracking-[0.2em] text-xs py-4 rounded-xl mt-2 hover:scale-[0.98] active:scale-95 transition-transform duration-500 ease-[cubic-bezier(0.8,0,0.2,1)] shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                      Start Session
                    </button>
                  </div>
                ) : customMode === 'learn' ? (
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-medium">Total Time</label>
                        <span className="font-mono text-xs text-white">{learnTotalTime}m</span>
                      </div>
                      <input type="range" min="10" max="240" step="10" value={learnTotalTime} onChange={e => setLearnTotalTime(parseInt(e.target.value))} className="w-full accent-white h-1 bg-white/20 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white/60 text-[10px] uppercase tracking-[0.1em]">Research (10%)</span>
                        <span className="font-mono text-xs">{Math.round(learnTotalTime * 0.1)}m</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/60 text-[10px] uppercase tracking-[0.1em]">Learn (30%)</span>
                        <span className="font-mono text-xs">{Math.round(learnTotalTime * 0.3)}m</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/60 text-[10px] uppercase tracking-[0.1em]">Practice (60%)</span>
                        <span className="font-mono text-xs">{learnTotalTime - Math.round(learnTotalTime * 0.1) - Math.round(learnTotalTime * 0.3)}m</span>
                      </div>
                    </div>

                    <button onClick={() => {
                      setShowCustomTimer(false);
                      const researchTime = Math.round(learnTotalTime * 0.1);
                      const learnTime = Math.round(learnTotalTime * 0.3);
                      const practiceTime = learnTotalTime - researchTime - learnTime;
                      
                      const segs = [];
                      segs.push({ n: 'Research', d: researchTime * 60, t: 'work' });
                      if (researchTime >= 5) segs.push({ n: 'Break', d: 5 * 60, t: 'rest' });
                      segs.push({ n: 'Learn', d: learnTime * 60, t: 'work' });
                      if (learnTime >= 10) segs.push({ n: 'Break', d: 5 * 60, t: 'rest' });
                      segs.push({ n: 'Practice', d: practiceTime * 60, t: 'work' });

                      startTimer({
                        id: 'custom-learn',
                        name: 'Learn',
                        icon: BookOpen,
                        color: 'text-white',
                        bg: 'bg-zinc-900 border-white/10',
                        cat: 'custom',
                        segs: segs,
                        cycles: 1,
                        desc: `${learnTotalTime}m total learning`
                      });
                    }} className="w-full bg-white text-black font-bold uppercase tracking-[0.2em] text-xs py-4 rounded-xl mt-2 hover:scale-[0.98] active:scale-95 transition-transform duration-500 ease-[cubic-bezier(0.8,0,0.2,1)] shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                      Start Session
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-medium">Focus Time</label>
                        <span className="font-mono text-xs text-white">{dopamineConfig.focus}m</span>
                      </div>
                      <input type="range" min="1" max="120" value={dopamineConfig.focus} onChange={e => setDopamineConfig({...dopamineConfig, focus: parseInt(e.target.value)})} className="w-full accent-white h-1 bg-white/20 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div>
                      <label className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-medium block mb-2">YouTube URL</label>
                      <input 
                        type="text" 
                        value={dopamineConfig.youtubeUrl} 
                        onChange={e => setDopamineConfig({...dopamineConfig, youtubeUrl: e.target.value})} 
                        placeholder="https://youtube.com/watch?v=..." 
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
                      />
                    </div>
                    <button onClick={() => {
                      setShowCustomTimer(false);
                      startTimer({
                        id: 'custom-dopamine',
                        name: 'Dopamine Focus',
                        icon: Play,
                        color: 'text-white',
                        bg: 'bg-zinc-900 border-white/10',
                        cat: 'custom',
                        segs: [
                          { n: 'Focus', d: dopamineConfig.focus * 60, t: 'work' },
                          { n: 'Reward', d: 0, t: 'dopamine' }
                        ],
                        cycles: 1,
                        desc: `${dopamineConfig.focus}m focus + Video Reward`,
                        youtubeUrl: dopamineConfig.youtubeUrl
                      });
                    }} className="w-full bg-white text-black font-bold uppercase tracking-[0.2em] text-xs py-4 rounded-xl mt-2 hover:scale-[0.98] active:scale-95 transition-transform duration-500 ease-[cubic-bezier(0.8,0,0.2,1)] shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                      Start Session
                    </button>
                  </div>
                )}
              </motion.div>
            ) : view === 'activeTimer' ? (
              <motion.div 
                key="timer-controls"
                initial={{ opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
                transition={springConfig}
                className="flex items-center gap-1 md:gap-2 px-1"
              >
                {/* Close */}
                <motion.button 
                  layout 
                  transition={springConfig} 
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.15)" }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { 
                    setIsRunning(false); 
                    setView('timer'); 
                    if (document.fullscreenElement) document.exitFullscreen().catch(err => console.error(err));
                  }} 
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors duration-300"
                >
                  <X size={18} />
                </motion.button>
                
                <motion.div layout transition={springConfig} className="w-px h-6 md:h-8 bg-white/20 mx-1 md:mx-2" />
                
                {/* Reset */}
                <motion.button 
                  layout 
                  transition={springConfig} 
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.15)", rotate: -45 }}
                  whileTap={{ scale: 0.9, rotate: -90 }}
                  onClick={resetTimer} 
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors duration-300"
                >
                  <RotateCcw size={18} />
                </motion.button>
                
                {/* Play/Pause */}
                <motion.button 
                  layout 
                  transition={springConfig}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsRunning(!isRunning)} 
                  className={`relative h-12 md:h-14 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-colors duration-500 overflow-hidden ${isRunning ? 'w-12 md:w-14 bg-white/20 text-white hover:bg-white/30' : 'px-6 md:px-8 bg-white text-black hover:bg-white/90'}`}
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    {isRunning ? (
                      <motion.div 
                        key="pause" 
                        initial={{ opacity: 0, scale: 0.5, rotate: -90 }} 
                        animate={{ opacity: 1, scale: 1, rotate: 0 }} 
                        exit={{ opacity: 0, scale: 0.5, rotate: 90 }} 
                        transition={springConfig}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <Pause size={20} fill="currentColor" />
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="play" 
                        initial={{ opacity: 0, scale: 0.5, rotate: 90 }} 
                        animate={{ opacity: 1, scale: 1, rotate: 0 }} 
                        exit={{ opacity: 0, scale: 0.5, rotate: -90 }} 
                        transition={springConfig} 
                        className="flex items-center gap-2 whitespace-nowrap"
                      >
                        <Play size={18} fill="currentColor" />
                        <span className="text-xs md:text-sm font-bold uppercase tracking-widest">{isDopamine ? 'Finish' : 'Start'}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
                
                {/* Skip */}
                <motion.button 
                  layout 
                  transition={springConfig} 
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.15)", x: 5 }}
                  whileTap={{ scale: 0.9, x: 10 }}
                  onClick={handleNextSegment} 
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors duration-300"
                >
                  <SkipForward size={18} />
                </motion.button>

                <motion.div layout transition={springConfig} className="w-px h-6 md:h-8 bg-white/20 mx-1 md:mx-2" />

                {/* Fullscreen */}
                <motion.button 
                  layout 
                  transition={springConfig} 
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.15)" }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleFullscreen} 
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors duration-300"
                >
                  {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div 
                key="nav-items-container"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={springConfig}
                className="flex items-center w-full"
              >
                {/* 1. DESKTOP DOCK (≥ 768px): Protected Baseline */}
                <div className="hidden md:flex items-center gap-1 md:gap-2 px-2">
                  {[
                    { id: 'home', icon: Home, label: 'home', brand: false },
                    { id: 'timer', icon: Timer, label: 'timers', brand: false },
                    { id: 'tasks', icon: CheckSquare, label: 'tasks', brand: false },
                    { id: 'place', icon: Monitor, label: 'the place', brand: false },
                    { id: 'ledger', icon: FileText, label: 'the ledger', brand: false },
                    { id: 'stats', icon: BarChart2, label: 'analytics', brand: false },
                    { id: 'terminal', icon: Cpu, label: 'terminal', brand: false },
                    { id: 'hub', icon: Zap, label: 'the hub', brand: false },
                    { id: 'profile', icon: User, label: 'profile', brand: false }
                  ].map(item => (
                    <motion.button 
                      layout
                      transition={springConfig}
                      whileHover={{ scale: 1.05, backgroundColor: view === item.id ? "transparent" : "rgba(255,255,255,0.15)" }}
                      whileTap={{ scale: 0.95 }}
                      key={item.id} 
                      onClick={() => setView(item.id)} 
                      className={`relative group h-10 md:h-12 rounded-full flex items-center justify-center transition-colors duration-500 ${view === item.id ? 'text-black px-4 md:px-5' : 'w-10 md:w-12 text-white/70 hover:text-white'}`}
                    >
                      {view === item.id && (
                        <motion.div
                          layoutId="active-nav-bg"
                          className="absolute inset-0 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.5)]"
                          transition={springConfig}
                        />
                      )}
                      <motion.div layout transition={springConfig} className="relative z-10 flex items-center gap-2">
                        {item.brand ? (
                          <item.icon size={22} className={view === item.id ? 'text-black' : 'text-white'} />
                        ) : (
                          <item.icon size={18} />
                        )}
                        {view === item.id && (
                          <motion.span 
                            initial={{ opacity: 0, width: 0, scale: 0.5 }}
                            animate={{ opacity: 1, width: 'auto', scale: 1 }}
                            exit={{ opacity: 0, width: 0, scale: 0.5 }}
                            transition={springConfig}
                            className="text-xs font-bold uppercase tracking-widest overflow-hidden whitespace-nowrap"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </motion.div>
                    </motion.button>
                  ))}

                  {/* Gestures Mode Toggle */}
                  <motion.button
                    layout
                    transition={springConfig}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsGesturesModeOpen(!isGesturesModeOpen)}
                    className={`relative h-10 md:h-12 w-10 md:w-12 rounded-full flex items-center justify-center transition-colors ${
                      isGesturesModeOpen 
                        ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(34,211,238,0.6)]' 
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                    title="Hands-Free Gestures & Vision OS"
                  >
                    <Hand size={18} className={isGesturesModeOpen ? "animate-pulse text-black" : "text-cyan-400"} />
                  </motion.button>

                  {/* J.A.R.V.I.S. Voice AI Mode Launcher */}
                  <motion.button
                    layout
                    transition={springConfig}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => useJarvisStore.getState().toggleJarvis()}
                    className="relative h-10 md:h-12 w-10 md:w-12 rounded-full flex items-center justify-center bg-black/60 hover:bg-black/80 border border-cyan-500/40 hover:border-cyan-300 transition-all duration-500 shadow-[0_0_25px_rgba(34,211,238,0.3)] hover:shadow-[0_0_35px_rgba(34,211,238,0.65)] group overflow-hidden"
                    title="J.A.R.V.I.S. Voice AI Mode (Say 'JARVIS')"
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 via-purple-500/15 to-transparent rounded-full opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute -inset-[1px] rounded-full bg-gradient-to-r from-cyan-500/30 via-purple-500/20 to-cyan-500/30 opacity-40 group-hover:opacity-80 transition-opacity" />
                    <div className="relative z-10 w-full h-full flex items-center justify-center scale-95 group-hover:scale-105 transition-transform duration-300 pointer-events-none">
                      <SiriWave 
                        size={48} 
                        renderScale={1.0}
                        variant={useJarvisStore.getState().aiState === 'thinking' ? 'fluid-dots' : 'wave'} 
                        className="pointer-events-none"
                      />
                    </div>
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] border border-black z-20 animate-pulse" />
                  </motion.button>

                  {activeTimer && (
                    <motion.div key="active-timer-dock" layout transition={springConfig} className="flex items-center">
                      <div className="w-px h-6 md:h-8 bg-white/20 mx-1 md:mx-2" />
                      <motion.button 
                        layout
                        transition={springConfig}
                        whileHover={{ scale: 1.05, backgroundColor: isRunning ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.15)" }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setView('activeTimer')} 
                        className={`flex items-center gap-2 px-3 md:px-4 h-10 md:h-12 rounded-full transition-colors duration-300 ${isRunning ? 'bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-white/10 text-white/80'}`}
                      >
                        <Timer size={16} className={isRunning ? "animate-pulse text-green-400" : ""} />
                        <span className="font-mono text-xs md:text-sm font-bold">{formatTime(timeLeft)}</span>
                      </motion.button>
                    </motion.div>
                  )}
                </div>

                {/* 2. MOBILE DOCK (< 768px): Thumb-Friendly Native Layer */}
                <div className="flex md:hidden items-center justify-between gap-1 w-full px-1">
                  {[
                    { id: 'home', icon: Home, label: 'Home' },
                    { id: 'timer', icon: Timer, label: 'Timers' },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => { setView(item.id); setShowMobileToolsSheet(false); }}
                      className={`flex flex-col items-center justify-center p-1.5 min-w-[52px] min-h-[44px] rounded-xl transition-all ${
                        view === item.id ? 'text-white bg-white/15 shadow-sm' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <item.icon size={18} className={view === item.id ? 'text-cyan-400' : ''} />
                      <span className="text-[9px] font-mono tracking-wider mt-0.5">{item.label}</span>
                    </button>
                  ))}

                  {/* Centered Jarvis Live / Voice AI Core Button */}
                  <button
                    onClick={() => { setShowMobileToolsSheet(false); useJarvisStore.getState().toggleJarvis(); }}
                    className="relative w-12 h-12 rounded-full bg-black/80 border border-cyan-400/50 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.4)] mx-1 active:scale-95 transition-transform shrink-0"
                    title="J.A.R.V.I.S. Voice AI"
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-transparent rounded-full" />
                    <SiriWave 
                      size={44} 
                      renderScale={0.7}
                      variant={useJarvisStore.getState().aiState === 'thinking' ? 'fluid-dots' : 'wave'} 
                      className="pointer-events-none"
                    />
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  </button>

                  {[
                    { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
                    { id: 'hub', icon: Zap, label: 'Hub' }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => { setView(item.id); setShowMobileToolsSheet(false); }}
                      className={`flex flex-col items-center justify-center p-1.5 min-w-[52px] min-h-[44px] rounded-xl transition-all ${
                        view === item.id ? 'text-white bg-white/15 shadow-sm' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <item.icon size={18} className={view === item.id ? 'text-cyan-400' : ''} />
                      <span className="text-[9px] font-mono tracking-wider mt-0.5">{item.label}</span>
                    </button>
                  ))}

                  {/* More / Tools Sheet Trigger */}
                  <button
                    onClick={() => setShowMobileToolsSheet(!showMobileToolsSheet)}
                    className={`flex flex-col items-center justify-center p-1.5 min-w-[52px] min-h-[44px] rounded-xl transition-all ${
                      showMobileToolsSheet || ['place', 'ledger', 'stats', 'terminal', 'profile'].includes(view)
                        ? 'text-cyan-300 bg-cyan-500/15 border border-cyan-500/30'
                        : 'text-white/60 hover:text-white'
                    }`}
                    title="Tools & Secondary Pages"
                  >
                    <SlidersHorizontal size={18} />
                    <span className="text-[9px] font-mono tracking-wider mt-0.5">Tools</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Mobile Slide-Up Tools & Secondary Views Sheet */}
        <AnimatePresence>
          {showMobileToolsSheet && (
            <div key="mobile-tools-modal-container">
              <motion.div
                key="mobile-tools-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMobileToolsSheet(false)}
                className="fixed inset-0 z-[190] bg-black/60 backdrop-blur-sm md:hidden"
              />
              <motion.div
                key="mobile-tools-sheet"
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="fixed bottom-20 left-3 right-3 z-[195] bg-[#0c0d13]/98 border border-white/15 rounded-3xl p-5 shadow-2xl backdrop-blur-3xl md:hidden space-y-4"
              >
                {/* Drag Handle & Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span className="text-xs font-mono font-bold uppercase tracking-widest text-white">FocusForge Suites</span>
                  </div>
                  <button onClick={() => setShowMobileToolsSheet(false)} className="p-1 rounded-full text-white/50 hover:text-white">
                    <X size={16} />
                  </button>
                </div>

                {/* Grid of Tools */}
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'place', icon: Monitor, label: 'The Place', desc: 'Zen Visuals' },
                    { id: 'ledger', icon: FileText, label: 'The Ledger', desc: 'Deep Writing' },
                    { id: 'stats', icon: BarChart2, label: 'Analytics', desc: 'Focus Data' },
                    { id: 'terminal', icon: Cpu, label: 'Terminal', desc: 'Console' },
                    { id: 'profile', icon: User, label: 'Profile', desc: 'Rank & XP' },
                  ].map(tool => (
                    <button
                      key={tool.id}
                      onClick={() => {
                        setView(tool.id);
                        setShowMobileToolsSheet(false);
                      }}
                      className={`p-3 rounded-2xl border flex flex-col items-center text-center transition-all cursor-pointer ${
                        view === tool.id
                          ? 'bg-cyan-500/15 border-cyan-400/40 text-white shadow-sm'
                          : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10 text-white/70 hover:text-white'
                      }`}
                    >
                      <tool.icon size={20} className={view === tool.id ? 'text-cyan-400' : 'text-white/60 mb-1'} />
                      <span className="text-[11px] font-semibold text-white mt-1 truncate max-w-full">{tool.label}</span>
                      <span className="text-[8px] font-mono text-white/30 truncate max-w-full">{tool.desc}</span>
                    </button>
                  ))}

                  {/* Gestures Tool in Sheet */}
                  <button
                    onClick={() => {
                      setIsGesturesModeOpen(true);
                      setShowMobileToolsSheet(false);
                    }}
                    className="p-3 rounded-2xl border bg-white/[0.03] hover:bg-white/[0.07] border-white/10 text-white/70 hover:text-white flex flex-col items-center text-center transition-all cursor-pointer"
                  >
                    <Hand size={20} className="text-cyan-400 mb-1" />
                    <span className="text-[11px] font-semibold text-white mt-1">Vision OS</span>
                    <span className="text-[8px] font-mono text-white/30">Gestures</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/30 font-sans flex flex-col">
      <AnimatePresence>
        {hasSeenOnboarding === false && <Onboarding onComplete={completeOnboarding} />}
      </AnimatePresence>
      
      {/* Premium Loading State (CRED Garage Style) */}
      <AnimatePresence>
        {isStartingTimer && <PremiumLoader />}
      </AnimatePresence>

      {/* Persistent Audio Engine for The Frequency */}
      <FrequencyAudioEngine />

      {/* Hands-Free Gestures & Vision OS */}
      <AnimatePresence>
        {isGesturesModeOpen && (
          <GesturesMode onClose={() => setIsGesturesModeOpen(false)} />
        )}
      </AnimatePresence>

      {/* Global Watermark */}
      <div className="fixed top-8 left-8 z-[200] opacity-20 hover:opacity-100 transition-opacity duration-700 flex items-center gap-4 pointer-events-none select-none">
        <MaybachLogo size={24} />
        <div className="text-[10px] uppercase tracking-[0.6em] font-bold">MAYBACH</div>
      </div>

      {view !== 'pdf' && GlobalDock()}

      <main className="flex-1 relative transition-all duration-500 ease-[cubic-bezier(0.8,0,0.2,1)] overflow-x-hidden pb-32">
        <AnimatePresence mode="popLayout">
          {view === 'home' && <motion.div key="home-view" className="w-full min-h-screen">{renderHome()}</motion.div>}
          {view === 'timer' && <motion.div key="timer-view" className="w-full min-h-screen">{renderTimerList()}</motion.div>}
          {view === 'activeTimer' && <motion.div key="activeTimer-view" className="w-full min-h-screen">{renderActiveTimer()}</motion.div>}
          {view === 'tasks' && <motion.div key="tasks-view" className="w-full min-h-screen">{renderTasks()}</motion.div>}
          {view === 'stats' && <motion.div key="stats-view" className="w-full min-h-screen">{renderStats()}</motion.div>}
          {view === 'terminal' && <motion.div key="terminal-view" className="w-full min-h-screen"><MaybachTerminal /></motion.div>}
          {view === 'hub' && <motion.div key="hub-view" className="w-full min-h-screen">{renderHub()}</motion.div>}
          {view === 'pdf' && <motion.div key="pdf-view" className="w-full min-h-screen"><LearnFromPdf onBack={() => setView('hub')} /></motion.div>}
          {view === 'place' && <motion.div key="place-view" className="w-full min-h-screen"><ThePlace /></motion.div>}
          {view === 'ledger' && <motion.div key="ledger-view" className="w-full min-h-screen"><Ledger /></motion.div>}
          {view === 'profile' && <motion.div key="profile-view" className="w-full min-h-screen">{renderProfile()}</motion.div>}
        </AnimatePresence>

        {/* Cinematic Selector Overlay */}
        <AnimatePresence>
          {showCinematicSelector && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] flex items-center justify-center bg-black overflow-hidden"
            >
              {/* Dynamic Immersive Background */}
              <AnimatePresence mode="popLayout">
                <motion.div 
                  key={hoveredCinematic || 'default'}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 0.3, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 z-0"
                >
                  {hoveredCinematic ? (
                    <img 
                      src={[...customCinematics, ...DEFAULT_CINEMATIC_VIDEOS].find(v => v.id === hoveredCinematic)?.thumbnail} 
                      className="w-full h-full object-cover blur-[60px] saturate-[1.5] brightness-[0.5]"
                      alt="" 
                    />
                  ) : (
                    <div className="w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_70%)]" />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Grid Lines */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] pointer-events-none opacity-50" />

              <div className="max-w-7xl w-full h-full relative z-10 flex flex-col p-8 md:p-12">
                <div className="flex justify-between items-start mb-8 md:mb-12">
                  <div className="space-y-4">
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_white]" />
                      <span className="text-[10px] font-mono uppercase tracking-[0.6em] text-white/40">Atmospheric Focus Protocols</span>
                    </motion.div>
                    <motion.h2 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="font-heading text-5xl md:text-8xl font-extrabold tracking-tighter lowercase leading-[0.85]"
                    >
                      choose your<br/>atmosphere.
                    </motion.h2>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowAddCinematicModal(true)}
                      className="px-5 py-3 rounded-full bg-white text-black font-mono font-bold text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-transform flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    >
                      <Plus size={15} />
                      <span>+ Custom Atmosphere</span>
                    </button>

                    <motion.button 
                      whileHover={{ scale: 0.9, rotate: 90 }}
                      whileTap={{ scale: 0.8 }}
                      onClick={() => {
                        setShowCinematicSelector(false);
                        setHoveredCinematic(null);
                      }} 
                      className="p-4 md:p-5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 transition-all backdrop-blur-xl group"
                    >
                      <X size={24} className="group-hover:text-white transition-colors" />
                    </motion.button>
                  </div>
                </div>

                {/* Grid of default and custom cinematic timers */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 pb-12 overflow-y-auto no-scrollbar">
                  {[...customCinematics, ...DEFAULT_CINEMATIC_VIDEOS].map((video, idx) => (
                    <motion.button
                      key={video.id}
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + idx * 0.05, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      onMouseEnter={() => setHoveredCinematic(video.id)}
                      onMouseLeave={() => setHoveredCinematic(null)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        const cinematicPreset: Preset = {
                          id: video.id.startsWith('custom-') ? video.id : `cinematic-${video.id}`,
                          name: video.title,
                          icon: Monitor,
                          color: 'text-white',
                          bg: 'bg-zinc-900 border-white/10',
                          cat: 'work',
                          segs: [{ n: video.title, d: (video as any).durationMinutes ? (video as any).durationMinutes * 60 : 3600, t: 'work' }], 
                          cycles: 1,
                          desc: `${video.tag || 'Cinematic Focus'} Session`,
                          youtubeUrl: (video as any).youtubeUrl || `https://www.youtube.com/watch?v=${video.id}`
                        };
                        setShowCinematicSelector(false);
                        setHoveredCinematic(null);
                        startTimer(cinematicPreset);
                      }}
                      className="group relative bg-zinc-950/40 backdrop-blur-md border border-white/5 overflow-hidden text-left aspect-[16/10] flex flex-col justify-end transition-all duration-700 hover:border-white/20 shadow-2xl rounded-3xl"
                    >
                      <img 
                        src={video.thumbnail || `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`} 
                        alt={video.title} 
                        className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale group-hover:grayscale-0 group-hover:opacity-40 transition-all duration-1000 scale-110 group-hover:scale-100" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                      
                      {/* Delete button if custom */}
                      {(video as any).custom && (
                        <button
                          onClick={(e) => handleDeleteCustomCinematic(video.id, e)}
                          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-rose-500/40 text-white/50 hover:text-rose-300 border border-white/10 flex items-center justify-center transition-colors"
                          title="Delete atmosphere"
                        >
                          <X size={14} />
                        </button>
                      )}

                      <div className="relative p-6 md:p-8 space-y-3 z-10">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <motion.div 
                              animate={hoveredCinematic === video.id ? { width: 20 } : { width: 0 }}
                              className="h-px bg-cyan-400"
                            />
                            <span className="text-[8px] font-mono uppercase tracking-[0.4em] text-cyan-400 font-bold">{video.tag || 'ATMOSPHERE'}</span>
                          </div>
                          <div className="font-heading text-2xl md:text-3xl font-extrabold text-white lowercase leading-tight group-hover:text-white transition-colors drop-shadow-2xl">{video.title}</div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-500">
                               <Play size={12} fill="currentColor" />
                             </div>
                             <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest group-hover:text-white/70 transition-colors">Launch Environment</span>
                          </div>
                          <Monitor size={14} className="text-white/20 group-hover:text-white/60 transition-colors" />
                        </div>
                      </div>

                      {/* Animated Glow on Hover */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Add Custom Cinematic Modal */}
              <AnimatePresence>
                {showAddCinematicModal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-6"
                  >
                    <motion.div
                      initial={{ scale: 0.95, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.95, y: 20 }}
                      className="bg-zinc-950 border border-white/15 rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl relative"
                    >
                      <div className="flex justify-between items-center border-b border-white/10 pb-4">
                        <h3 className="font-heading text-2xl font-bold lowercase text-white">New Atmosphere</h3>
                        <button onClick={() => setShowAddCinematicModal(false)} className="text-white/40 hover:text-white"><X size={18} /></button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] uppercase font-mono tracking-widest text-white/40 block mb-1">YouTube URL or ID</label>
                          <input
                            type="text"
                            placeholder="https://youtube.com/watch?v=... or ID"
                            value={newCinematic.youtubeUrl}
                            onChange={e => setNewCinematic({ ...newCinematic, youtubeUrl: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400/50 font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-mono tracking-widest text-white/40 block mb-1">Atmosphere Title</label>
                          <input
                            type="text"
                            placeholder="e.g. Blade Runner 2049 Rainy City"
                            value={newCinematic.title}
                            onChange={e => setNewCinematic({ ...newCinematic, title: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400/50 font-mono"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] uppercase font-mono tracking-widest text-white/40 block mb-1">Tag / Category</label>
                            <input
                              type="text"
                              placeholder="e.g. CYBER LO-FI"
                              value={newCinematic.tag}
                              onChange={e => setNewCinematic({ ...newCinematic, tag: e.target.value })}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400/50 font-mono uppercase"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-mono tracking-widest text-white/40 block mb-1">Duration (Mins)</label>
                            <input
                              type="number"
                              value={newCinematic.durationMinutes}
                              onChange={e => setNewCinematic({ ...newCinematic, durationMinutes: parseInt(e.target.value) || 60 })}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400/50 font-mono"
                            />
                          </div>
                        </div>

                        <button
                          onClick={handleAddCustomCinematic}
                          className="w-full py-3.5 rounded-2xl bg-white text-black font-mono font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity mt-2"
                        >
                          Save Atmosphere
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Persistent Miniplayer / Full Player */}
      <div 
        className={`transition-all duration-500 ease-[cubic-bezier(0.8,0,0.2,1)] z-[100] ${
          !activeTimer ? 'opacity-0 pointer-events-none fixed bottom-0' :
          view === 'activeTimer' 
            ? (activeTimer.id.startsWith('cinematic-')
              ? 'fixed inset-0 z-0 flex items-center justify-center p-8 md:p-20 lg:p-32'
              : 'fixed bottom-12 md:bottom-16 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-[560px]')
            : 'fixed bottom-24 md:bottom-8 right-6 md:right-8 w-72 cursor-pointer'
        }`}
        onClick={() => {
          if (view !== 'activeTimer' && activeTimer) setView('activeTimer');
        }}
      >
        {activeTimer && (
          <div className={`relative w-full h-full transition-all duration-700 ${view !== 'activeTimer' ? 'bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl hover:border-white/30' : activeTimer.id.startsWith('cinematic-') ? 'bg-black shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8),0_0_120px_rgba(255,255,255,0.05)]' : 'bg-zinc-900'}`}>
            {/* Miniplayer Header */}
            {view !== 'activeTimer' && (
              <div className="p-3 border-b border-white/10 flex items-center justify-between bg-black/80 backdrop-blur-md rounded-t-2xl relative z-20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <Timer size={14} className="text-white" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="text-xs font-bold text-white truncate max-w-[100px] leading-tight">{activeTimer.name}</div>
                    <div className="text-[10px] text-white/50 leading-tight mt-0.5">{formatTime(timeLeft)} • {activeTimer.segs[segIdx]?.n}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsRunning(!isRunning); }}
                    className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    {isRunning ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                  </button>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setActiveTimer(null); 
                      setIsRunning(false); 
                      setView('home'); 
                    }}
                    className="w-8 h-8 rounded-full text-white/50 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* YouTube Player */}
            {activeTimer.youtubeUrl && parseYoutubeUrl(activeTimer.youtubeUrl) && (
              <div className={`${view === 'activeTimer' ? 'w-full' : 'w-full aspect-video relative rounded-b-2xl'}`}>
                <CustomYouTubePlayer 
                  ref={hubPlayerRef}
                  videoId={parseYoutubeUrl(activeTimer.youtubeUrl)?.videoId} 
                  playlistId={parseYoutubeUrl(activeTimer.youtubeUrl)?.playlistId}
                  autoplay={activeTimer.segs[segIdx]?.t === 'dopamine' || activeTimer.id.startsWith('cinematic-')} 
                  muted={activeTimer.segs[segIdx]?.t !== 'dopamine' && !activeTimer.id.startsWith('cinematic-')}
                  onPlay={() => setIsRunning(true)}
                  onPause={() => setIsRunning(false)}
                  onVideoDurationChange={(dur) => {
                    if (activeTimer.id.startsWith('cinematic-')) {
                      setTimeLeft(Math.floor(dur));
                      setTotalSegTime(Math.floor(dur));
                    }
                  }}
                  title={activeTimer.name}
                  dimmed={view === 'activeTimer' && activeTimer.id.startsWith('cinematic-')}
                  className={activeTimer.segs[segIdx]?.t === 'dopamine' ? '' : activeTimer.id.startsWith('cinematic-') ? (view === 'activeTimer' ? 'h-full w-full object-cover' : 'w-full aspect-video brightness-[0.7]') : 'grayscale pointer-events-none opacity-50'}
                  roundedClass={view === 'activeTimer' && activeTimer.id.startsWith('cinematic-') ? 'rounded-[40px]' : 'rounded-2xl'}
                />
                {/* Overlay to prevent clicks on iframe in miniplayer mode */}
                {view !== 'activeTimer' && (
                  <div className="absolute inset-0 z-10 rounded-b-2xl" />
                )}
              </div>
            )}
            
            {/* Progress bar for miniplayer */}
            {view !== 'activeTimer' && (
               <div className="w-full h-1 bg-white/5 absolute bottom-0 left-0 z-20 rounded-b-2xl overflow-hidden">
                 <div className="h-full bg-white transition-all duration-1000" style={{ width: `${(1 - timeLeft / totalSegTime) * 100}%` }} />
               </div>
            )}
          </div>
        )}
      </div>

      {/* Goated Focus Alert */}
      <AnimatePresence>
        {showFocusAlert && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative max-w-md w-full mx-4 p-1 rounded-3xl overflow-hidden"
            >
              {/* Animated Border */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-[spin_3s_linear_infinite]" style={{ margin: '-50%' }} />
              
              <div className="relative bg-zinc-950 rounded-[22px] p-8 flex flex-col items-center text-center border border-white/10">
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(239,68,68,0.4)]">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <Monitor size={40} className="text-red-500" />
                  </motion.div>
                </div>
                
                <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">EYES UP!</h2>
                <p className="text-white/60 mb-8 text-lg">
                  Focus session paused due to inactivity. Get back to work!
                </p>
                
                <button
                  onClick={() => {
                    setShowFocusAlert(false);
                    showFocusAlertRef.current = false;
                    setIsHubTimerActive(true);
                    hubPlayerRef.current?.play();
                  }}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-lg shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:shadow-[0_0_50px_rgba(239,68,68,0.5)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Resume Focus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
