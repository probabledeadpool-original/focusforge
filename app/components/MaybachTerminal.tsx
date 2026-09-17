"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal as TerminalIcon, Cpu, Activity, Zap, Shield, 
  Flame, Radio, Database, RefreshCw, Volume2, VolumeX, 
  Layers, Maximize2, Minimize2, Sparkles, TrendingUp, Lock,
  ChevronRight, Play, CheckCircle2, AlertCircle, Bot, Plus,
  DollarSign, ArrowUpRight, Check
} from 'lucide-react';
import { MaybachLogo } from './Branding';
import { useAppStore } from '../../hooks/useAppStore';
import { useAuraStore } from '../../hooks/useAuraStore';
import { useIncinerator, IncinerationOverlay } from './Incinerator';

type ThemeColor = 'maybach' | 'cyan' | 'emerald' | 'amber' | 'monochrome';

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'system' | 'ai' | 'ascii';
  content: string | React.ReactNode;
  timestamp: string;
}

const THEME_STYLES: Record<ThemeColor, {
  text: string;
  glow: string;
  border: string;
  accent: string;
  badge: string;
}> = {
  maybach: {
    text: 'text-white',
    glow: 'shadow-[0_0_20px_rgba(255,255,255,0.15)]',
    border: 'border-white/10',
    accent: 'text-white/80',
    badge: 'bg-white/10 text-white border-white/20',
  },
  cyan: {
    text: 'text-cyan-400',
    glow: 'shadow-[0_0_20px_rgba(34,211,238,0.2)]',
    border: 'border-cyan-500/20',
    accent: 'text-cyan-300',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  },
  emerald: {
    text: 'text-emerald-400',
    glow: 'shadow-[0_0_20px_rgba(52,211,153,0.2)]',
    border: 'border-emerald-500/20',
    accent: 'text-emerald-300',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  amber: {
    text: 'text-amber-400',
    glow: 'shadow-[0_0_20px_rgba(251,191,36,0.2)]',
    border: 'border-amber-500/20',
    accent: 'text-amber-300',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  monochrome: {
    text: 'text-zinc-300',
    glow: 'shadow-none',
    border: 'border-zinc-800',
    accent: 'text-zinc-100',
    badge: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  },
};

const QUOTES = [
  "“Pain + Reflection = Progress.” — Ray Dalio",
  "“The impediment to action advances action. What stands in the way becomes the way.” — Marcus Aurelius",
  "“Simplicity is the ultimate sophistication.” — Leonardo da Vinci",
  "“He who has a why to live can bear almost any how.” — Friedrich Nietzsche",
  "“Focus is a muscle. Train it with high stakes and zero compromise.” — Maybach Protocol",
  "“Work with people whose work you admire and whose character you respect.” — Charlie Munger",
  "“If you're not embarrassed by the first version of your product, you've launched too late.” — Reid Hoffman"
];

export const MaybachTerminal = () => {
  const { setView, setTimeLeft, setIsRunning, maybachCoins, setMaybachCoins } = useAppStore();
  const auraStore = useAuraStore();
  const { incinerate, canvasRef } = useIncinerator();

  const [theme, setTheme] = useState<ThemeColor>('maybach');
  const currentTheme = THEME_STYLES[theme] || THEME_STYLES.maybach;
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isMatrixActive, setIsMatrixActive] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [activeTab, setActiveTab] = useState<'cli' | 'telemetry' | 'mastery'>('cli');

  // Simulated live telemetry
  const [cpuUsage, setCpuUsage] = useState(42);
  const [vramUsage, setVramUsage] = useState(68);
  const [treasury, setTreasury] = useState({
    netWorth: 852400.00,
    maybachFund: 42500.00,
    liquidity: 124000.00
  });

  const [habits, setHabits] = useState([
    { id: 1, title: 'DEEP WORK', streak: 24, icon: '⚡', completedToday: true },
    { id: 2, title: '0500 START', streak: 15, icon: '🌅', completedToday: false },
    { id: 3, title: 'PHYSICAL LOAD', streak: 32, icon: '🦾', completedToday: true },
    { id: 4, title: 'DOPAMINE FAST', streak: 7, icon: '🧬', completedToday: false },
    { id: 5, title: 'ZERO DISTRACTION', streak: 22, icon: '🧊', completedToday: true },
    { id: 6, title: 'HIGH CONVICTION', streak: 12, icon: '🎯', completedToday: false },
  ]);

  const [masteredDomains, setMasteredDomains] = useState([
    { id: 0, name: "MARKET LOGIC", code: "MB-01", mastery: 94, insight: "Market liquidity flow precedes narrative consensus." },
    { id: 1, name: "WEALTH RETENTION", code: "MB-02", mastery: 88, insight: "Asymmetric risk posture with zero emotional drawdown." },
    { id: 2, name: "SOVEREIGN OPS", code: "MB-03", mastery: 91, insight: "Autonomy over calendar, capital, and mental energy." },
    { id: 3, name: "DEEP FOCUS FLOW", code: "MB-04", mastery: 96, insight: "90-minute ultradian cycles compound into generational output." },
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Synthesizer acoustic feedback
  const playBeep = useCallback((freq = 800, duration = 0.04, type: OscillatorType = 'sine') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }, [soundEnabled]);

  const addLine = useCallback((type: TerminalLine['type'], content: string | React.ReactNode) => {
    const time = new Date().toLocaleTimeString();
    setLines(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), type, content, timestamp: time }]);
  }, []);

  // Initial welcome sequence
  useEffect(() => {
    const time = new Date().toLocaleTimeString();
    setLines([
      {
        id: '1',
        type: 'ascii',
        timestamp: time,
        content: `
 ███╗   ███╗ █████╗ ██╗   ██╗██████╗  █████╗  ██████╗██╗  ██╗
 ████╗ ████║██╔══██╗╚██╗ ██╔╝██╔══██╗██╔══██╗██╔════╝██║  ██║
 ██╔████╔██║███████║ ╚████╔╝ ██████╔╝███████║██║     ███████║
 ██║╚██╔╝██║██╔══██║  ╚██╔╝  ██╔══██╗██╔══██║██║     ██╔══██║
 ██║ ╚═╝ ██║██║  ██║   ██║   ██████╔╝██║  ██║╚██████╗██║  ██║
 ╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
                [ PROTOCOL OS // V4.8.2 ]
        Type 'help' or click any command below to execute.`
      },
      {
        id: '2',
        type: 'system',
        timestamp: time,
        content: 'System Initialized. Neural link secure. Low-latency telemetry stream active.'
      }
    ]);
  }, []);

  // Telemetry fluctuation simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage(prev => Math.min(98, Math.max(18, prev + Math.floor((Math.random() - 0.5) * 8))));
      setVramUsage(prev => Math.min(92, Math.max(40, prev + Math.floor((Math.random() - 0.5) * 6))));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  // Command Execution Engine
  const executeCommand = async (rawCmd: string) => {
    const cmd = rawCmd.trim();
    if (!cmd) return;

    playBeep(1200, 0.05, 'triangle');
    addLine('input', `❯ ${cmd}`);
    setHistory(prev => [...prev, cmd]);
    setHistoryIdx(-1);

    const parts = cmd.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
      case 'help':
      case '?':
        addLine('output', (
          <div className="space-y-2 py-2 font-mono text-xs">
            <div className="text-white/40 uppercase tracking-widest text-[10px] pb-1 border-b border-white/10">MAYBACH EXECUTIVE COMMAND MATRIX</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 pt-1">
              <div><span className="text-cyan-400 font-bold">help / ?</span> <span className="text-white/50">- Display command matrix</span></div>
              <div><span className="text-cyan-400 font-bold">focus &lt;mins&gt; [tag]</span> <span className="text-white/50">- Launch rapid focus session</span></div>
              <div><span className="text-cyan-400 font-bold">status / sysinfo</span> <span className="text-white/50">- System telemetry & biometric score</span></div>
              <div><span className="text-cyan-400 font-bold">aura / eval</span> <span className="text-white/50">- Instant discipline & momentum check</span></div>
              <div><span className="text-cyan-400 font-bold">matrix</span> <span className="text-white/50">- Toggle CRT digital rain</span></div>
              <div><span className="text-cyan-400 font-bold">market [symbol]</span> <span className="text-white/50">- Real-time quote & price tape</span></div>
              <div><span className="text-cyan-400 font-bold">crypto</span> <span className="text-white/50">- Live crypto telemetry ticker</span></div>
              <div><span className="text-cyan-400 font-bold">quote / wisdom</span> <span className="text-white/50">- Executive mental models & aphorisms</span></div>
              <div><span className="text-cyan-400 font-bold">burn &lt;note&gt;</span> <span className="text-white/50">- Trigger incinerator protocol</span></div>
              <div><span className="text-cyan-400 font-bold">theme &lt;name&gt;</span> <span className="text-white/50">- maybach | cyan | emerald | amber | mono</span></div>
              <div><span className="text-cyan-400 font-bold">sound &lt;on|off&gt;</span> <span className="text-white/50">- Toggle acoustic feedback</span></div>
              <div><span className="text-cyan-400 font-bold">ai &lt;prompt&gt;</span> <span className="text-white/50">- Query Gemini intelligence in CLI</span></div>
              <div><span className="text-cyan-400 font-bold">clear / cls</span> <span className="text-white/50">- Clear terminal screen buffer</span></div>
            </div>
          </div>
        ));
        break;

      case 'clear':
      case 'cls':
        setLines([]);
        break;

      case 'status':
      case 'sysinfo':
        addLine('output', (
          <div className="space-y-2 py-2 font-mono text-xs bg-white/[0.02] p-4 rounded-xl border border-white/5">
            <div className="text-white/40 uppercase tracking-widest text-[9px] flex justify-between">
              <span>SYSTEM DIAGNOSTIC REPORT</span>
              <span>NODE: MB-CORE-01</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div><div className="text-white/30 text-[9px] uppercase">CPU Load</div><div className="text-cyan-400 font-bold text-sm">{cpuUsage}% (Active)</div></div>
              <div><div className="text-white/30 text-[9px] uppercase">VRAM Allocation</div><div className="text-purple-400 font-bold text-sm">{vramUsage}% (Opt)</div></div>
              <div><div className="text-white/30 text-[9px] uppercase">AURA Score</div><div className="text-lime-400 font-bold text-sm">{auraStore.score.total} pts</div></div>
              <div><div className="text-white/30 text-[9px] uppercase">Discipline Streak</div><div className="text-amber-400 font-bold text-sm">{auraStore.momentum.streakDays} Days</div></div>
            </div>
          </div>
        ));
        break;

      case 'aura':
      case 'eval':
        playBeep(950, 0.1, 'sine');
        addLine('success', `[AURA EVALUATION] Score: ${auraStore.score.total} / 999 | Momentum: ${(auraStore.momentum.current * 100).toFixed(1)}% | Focus Quality: High | Burnout Factor: Low.`);
        break;

      case 'focus':
        const mins = parseInt(args[0]) || 25;
        const tag = args[1] || 'Terminal Sprint';
        addLine('success', `Initiating focus session: ${mins} minutes [${tag}]...`);
        setTimeout(() => {
          setTimeLeft(mins * 60);
          setIsRunning(true);
          setView('activeTimer');
        }, 800);
        break;

      case 'matrix':
        setIsMatrixActive(prev => !prev);
        addLine('system', `Matrix CRT Digital Rain: ${!isMatrixActive ? 'ACTIVATED' : 'DEACTIVATED'}`);
        break;

      case 'quote':
      case 'wisdom':
        const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
        addLine('output', <span className="italic text-amber-200">{randomQuote}</span>);
        break;

      case 'crypto':
      case 'market':
        const sym = args[0]?.toUpperCase() || 'BTC';
        const simulatedPrices: Record<string, { price: string; chg: string; vol: string }> = {
          BTC: { price: '$94,230.50', chg: '+3.42%', vol: '28.4B' },
          ETH: { price: '$3,480.10', chg: '+1.85%', vol: '14.2B' },
          SOL: { price: '$188.75', chg: '+6.12%', vol: '6.8B' },
          NVDA: { price: '$132.40', chg: '+2.10%', vol: '42.1B' },
          AAPL: { price: '$224.80', chg: '+0.75%', vol: '18.9B' },
          TSLA: { price: '$218.60', chg: '-1.20%', vol: '22.3B' },
        };
        const data = simulatedPrices[sym] || { price: '$100.00', chg: '+0.00%', vol: '1.0B' };
        addLine('output', (
          <div className="font-mono text-xs py-1 flex items-center gap-6">
            <span className="font-bold text-white uppercase">{sym}/USD</span>
            <span className="text-cyan-400 font-bold">{data.price}</span>
            <span className={data.chg.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}>{data.chg}</span>
            <span className="text-white/40 text-[10px]">24h Vol: {data.vol}</span>
          </div>
        ));
        break;

      case 'theme':
        const newTheme = args[0]?.toLowerCase() as ThemeColor;
        if (['maybach', 'cyan', 'emerald', 'amber', 'monochrome'].includes(newTheme)) {
          setTheme(newTheme);
          addLine('success', `Theme switched to '${newTheme}'.`);
        } else {
          addLine('error', "Invalid theme. Options: maybach, cyan, emerald, amber, monochrome");
        }
        break;

      case 'sound':
        const state = args[0]?.toLowerCase();
        if (state === 'on') {
          setSoundEnabled(true);
          addLine('success', "Acoustic feedback enabled.");
        } else if (state === 'off') {
          setSoundEnabled(false);
          addLine('system', "Acoustic feedback disabled.");
        } else {
          addLine('error', "Usage: sound on | sound off");
        }
        break;

      case 'burn':
        const noteTarget = args.join(' ') || 'Session Draft';
        addLine('system', `Engaging Incineration Protocol on '${noteTarget}'...`);
        const targetEl = document.getElementById('terminal-hud-box');
        if (targetEl) incinerate(targetEl);
        break;

      case 'ai':
        const prompt = args.join(' ');
        if (!prompt) {
          addLine('error', "Usage: ai <your prompt here>");
          break;
        }
        addLine('system', "Connecting to Gemini Intelligence...");
        const key = localStorage.getItem('gemini-api-key') || '';
        const model = localStorage.getItem('gemini-model') || 'gemini-3.7-flash';
        try {
          const res = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, apiKey: key, model }),
          });
          const resData = await res.json();
          if (!res.ok || resData.error) {
            addLine('error', `AI Error: ${resData.error || 'Connection failed'}`);
          } else {
            addLine('ai', (
              <div className="bg-cyan-950/20 border border-cyan-500/20 p-3 rounded-xl space-y-1">
                <div className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                  <Bot size={12} /> AURA INTELLIGENCE ({resData.model || model})
                </div>
                <div className="text-white text-xs leading-relaxed whitespace-pre-wrap">{resData.reply || resData.text}</div>
              </div>
            ));
          }
        } catch (e: any) {
          addLine('error', `Network Error: ${e.message}`);
        }
        break;

      default:
        addLine('error', `Command not recognized: '${command}'. Type 'help' for command list.`);
        break;
    }
  };

  // Interactive Habit Click Handler
  const handleHabitClick = (habitId: number) => {
    playBeep(1100, 0.06, 'sine');
    setHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        const nextCompleted = !h.completedToday;
        const nextStreak = nextCompleted ? h.streak + 1 : Math.max(0, h.streak - 1);
        addLine('success', `HABIT [${h.title}]: ${nextCompleted ? 'COMPLETED' : 'UNCHECKED'} // STREAK: ${nextStreak} DAYS`);
        return { ...h, completedToday: nextCompleted, streak: nextStreak };
      }
      return h;
    }));
  };

  // Interactive Mastery Domain Click Handler
  const handleMasteryClick = (nodeId: number) => {
    playBeep(1400, 0.08, 'triangle');
    setMasteredDomains(prev => prev.map(m => {
      if (m.id === nodeId) {
        const nextMastery = Math.min(100, m.mastery + 1);
        addLine('ai', (
          <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs">
            <span className="font-bold text-purple-300 uppercase">[{m.name} // {m.code}]</span>
            <p className="text-white/80 mt-1 italic">&ldquo;{m.insight}&rdquo;</p>
            <span className="text-[10px] text-cyan-400 block mt-1 font-mono">Mastery Level: {nextMastery}%</span>
          </div>
        ));
        return { ...m, mastery: nextMastery };
      }
      return m;
    }));
  };

  // Interactive Treasury Actions
  const handleDepositYield = () => {
    playBeep(1600, 0.08, 'sine');
    setTreasury(prev => {
      const added = 1250.00;
      const updated = {
        ...prev,
        netWorth: prev.netWorth + added,
        liquidity: prev.liquidity + added
      };
      setMaybachCoins(maybachCoins + 10);
      addLine('success', `TREASURY YIELD HARVESTED: +$${added.toLocaleString()} USD (+10 Maybach Coins)`);
      return updated;
    });
  };

  const handleSiphonFund = () => {
    playBeep(1300, 0.06, 'triangle');
    setTreasury(prev => {
      const transfer = 5000.00;
      if (prev.liquidity >= transfer) {
        const updated = {
          ...prev,
          maybachFund: prev.maybachFund + transfer,
          liquidity: prev.liquidity - transfer
        };
        addLine('system', `CAPITAL SIPHONED TO MAYBACH ACQUISITION FUND: $${transfer.toLocaleString()} USD`);
        return updated;
      }
      addLine('error', "Insufficient liquidity for siphon allocation.");
      return prev;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(inputVal);
      setInputVal('');
      setHistoryIdx(-1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIdx + 1 < history.length ? historyIdx + 1 : historyIdx;
        setHistoryIdx(nextIdx);
        setInputVal(history[history.length - 1 - nextIdx] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        setInputVal(history[history.length - 1 - nextIdx] || '');
      } else if (historyIdx === 0) {
        setHistoryIdx(-1);
        setInputVal('');
      }
    }
  };

  return (
    <div className="relative w-full min-h-[calc(100vh-100px)] p-4 md:p-8 flex flex-col font-mono selection:bg-white/20">
      <IncinerationOverlay canvasRef={canvasRef} />

      {/* Matrix digital rain overlay */}
      {isMatrixActive && (
        <div className="fixed inset-0 pointer-events-none z-0 opacity-20 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.1)_1px,transparent_1px)] bg-[size:20px_20px] animate-pulse" />
        </div>
      )}

      {/* Top Status HUD Bar */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl">
            <TerminalIcon size={20} className={currentTheme.text} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-heading font-extrabold text-white lowercase">maybach terminal.</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-widest border ${currentTheme.badge}`}>
                CLI // LIVE
              </span>
            </div>
            <div className="text-[10px] text-white/40 tracking-widest uppercase">
              NODE: MAYBACH-PRIME-01 • QUANTUM LATENCY: 0.2MS
            </div>
          </div>
        </div>

        {/* Quick controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => {
              playBeep(800, 0.05);
              setSoundEnabled(!soundEnabled);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/70 transition-all active:scale-95 cursor-pointer"
          >
            {soundEnabled ? <Volume2 size={13} className="text-emerald-400" /> : <VolumeX size={13} className="text-white/40" />}
            <span className="text-[10px] uppercase font-bold">{soundEnabled ? 'Acoustic ON' : 'Muted'}</span>
          </button>

          <button
            onClick={() => {
              playBeep(1000, 0.05);
              setIsMatrixActive(!isMatrixActive);
            }}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all active:scale-95 cursor-pointer border ${isMatrixActive ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
          >
            Matrix Mode
          </button>

          <div className="flex bg-white/5 border border-white/10 rounded-full p-1">
            {(['cli', 'telemetry', 'mastery'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  playBeep(700, 0.04);
                  setActiveTab(tab);
                }}
                className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase transition-all cursor-pointer ${activeTab === tab ? 'bg-white text-black font-bold shadow' : 'text-white/40 hover:text-white'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Terminal Window Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[550px]">
        
        {/* Left Column: Interactive REPL CLI Buffer */}
        <div 
          onClick={() => inputRef.current?.focus()}
          className={`${activeTab === 'cli' ? 'lg:col-span-8 flex' : 'hidden lg:flex lg:col-span-8'} flex-col bg-zinc-950/80 backdrop-blur-2xl border ${currentTheme.border} rounded-3xl p-6 shadow-2xl relative overflow-hidden cursor-text`}
        >
          
          {/* Terminal Screen Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4 text-[10px] text-white/40 uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-bold text-white/60">bash - maybach-os</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-cyan-400">CLICK ANY BUTTON TO RUN</span>
              <span>• UTF-8 // TTY-01</span>
            </div>
          </div>

          {/* Quick Command Action Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
            {[
              { label: 'help', cmd: 'help' },
              { label: 'focus 25', cmd: 'focus 25' },
              { label: 'aura', cmd: 'aura' },
              { label: 'crypto', cmd: 'crypto' },
              { label: 'market NVDA', cmd: 'market NVDA' },
              { label: 'matrix', cmd: 'matrix' },
              { label: 'wisdom', cmd: 'wisdom' },
              { label: 'burn', cmd: 'burn' },
              { label: 'theme cyan', cmd: 'theme cyan' },
              { label: 'clear', cmd: 'clear' }
            ].map(item => (
              <button
                key={item.label}
                onClick={(e) => {
                  e.stopPropagation();
                  executeCommand(item.cmd);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[9px] font-mono uppercase text-white/70 hover:text-white transition-all shrink-0 cursor-pointer active:scale-95"
              >
                ${item.label}
              </button>
            ))}
          </div>

          {/* Scrollable CLI Stream */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 text-xs leading-relaxed max-h-[460px]">
            {lines.map((line) => (
              <div key={line.id} className="space-y-1">
                {line.type === 'ascii' ? (
                  <pre className={`font-mono text-[10px] sm:text-xs leading-tight ${currentTheme.text} overflow-x-auto select-none opacity-90`}>
                    {line.content}
                  </pre>
                ) : line.type === 'input' ? (
                  <div className="flex items-center gap-2 text-white/90 font-bold">
                    <span className="text-white/30 text-[10px]">{line.timestamp}</span>
                    <span className={currentTheme.text}>{line.content}</span>
                  </div>
                ) : line.type === 'error' ? (
                  <div className="text-red-400 flex items-start gap-2">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span>{line.content}</span>
                  </div>
                ) : line.type === 'success' ? (
                  <div className="text-emerald-400 flex items-start gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                    <span>{line.content}</span>
                  </div>
                ) : line.type === 'system' ? (
                  <div className="text-white/40 text-[11px] font-mono italic">
                    [SYS] {line.content}
                  </div>
                ) : (
                  <div className="text-white/80">{line.content}</div>
                )}
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>

          {/* Command Input Bar */}
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3">
            <span className={`text-xs font-bold ${currentTheme.text}`}>MAYBACH ❯</span>
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="type command (e.g. 'help', 'focus 25', 'aura', 'crypto')..."
              className="flex-1 bg-transparent border-none text-xs text-white focus:outline-none placeholder:text-white/20 font-mono"
              autoFocus
            />
          </div>
        </div>

        {/* Right Column: Telemetry & Mastery HUD */}
        <div id="terminal-hud-box" className={`${activeTab !== 'cli' ? 'lg:col-span-4 flex' : 'hidden lg:flex lg:col-span-4'} flex-col gap-6`}>
          
          {/* Sovereign Treasury Box with interactive action buttons */}
          <div className="bg-zinc-950/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <span className="text-[10px] uppercase font-mono tracking-widest text-white/40">Sovereign Treasury</span>
              <Shield size={14} className="text-emerald-400" />
            </div>
            <div>
              <div className="text-[9px] uppercase font-mono text-white/30">Net Capital Pool</div>
              <div className="text-2xl font-bold font-mono text-white">${treasury.netWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                <div className="text-[8px] uppercase font-mono text-white/40">Maybach Fund</div>
                <div className="text-sm font-bold text-cyan-400">${treasury.maybachFund.toLocaleString()}</div>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                <div className="text-[8px] uppercase font-mono text-white/40">Liquidity Siphon</div>
                <div className="text-sm font-bold text-emerald-400">${treasury.liquidity.toLocaleString()}</div>
              </div>
            </div>
            
            {/* Interactive Treasury Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
              <button
                onClick={handleDepositYield}
                className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-[9px] font-bold font-mono text-emerald-400 transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
              >
                <Plus size={11} /> Harvest Yield
              </button>
              <button
                onClick={handleSiphonFund}
                className="px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-[9px] font-bold font-mono text-cyan-400 transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
              >
                <ArrowUpRight size={11} /> Siphon to Fund
              </button>
            </div>
          </div>

          {/* Discipline Habits Tracker */}
          <div className="bg-zinc-950/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-white/40">Discipline Protocol</span>
                <span className="text-[9px] text-white/30 block">Click habit to complete / increment</span>
              </div>
              <Zap size={14} className="text-amber-400" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {habits.map(habit => (
                <button
                  key={habit.id}
                  onClick={() => handleHabitClick(habit.id)}
                  className={`p-2.5 rounded-2xl border text-left transition-all active:scale-95 cursor-pointer flex items-center justify-between ${
                    habit.completedToday 
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-white' 
                      : 'bg-white/5 border-white/5 text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{habit.icon}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider">{habit.title}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {habit.completedToday && <Check size={10} className="text-emerald-400" />}
                    <span className={`text-[10px] font-bold ${habit.completedToday ? 'text-emerald-400' : 'text-white/40'}`}>
                      {habit.streak}d
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sovereign Domain Mastery Nodes */}
          <div className="bg-zinc-950/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-3">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-white/40">Mastery Nodes</span>
                <span className="text-[9px] text-white/30 block">Click node to inspect insight</span>
              </div>
              <Layers size={14} className="text-purple-400" />
            </div>
            <div className="space-y-2">
              {masteredDomains.map(node => (
                <button
                  key={node.id}
                  onClick={() => handleMasteryClick(node.id)}
                  className="w-full text-left p-2.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.07] border border-white/5 transition-all active:scale-98 cursor-pointer space-y-1.5 group"
                >
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="font-bold text-white/90 uppercase group-hover:text-cyan-400 transition-colors">
                      {node.name} <span className="text-white/30 font-normal">[{node.code}]</span>
                    </span>
                    <span className="text-cyan-400 font-bold">{node.mastery}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-400 transition-all duration-500" 
                      style={{ width: `${node.mastery}%` }} 
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MaybachTerminal;
