"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Plus, Search, Trash2, ChevronRight, 
  Hash, List, CheckSquare, Quote, Minus, Code, 
  Download, Zap, TrendingUp, DollarSign, Wallet, 
  Layers, Shield, ArrowUpRight, ArrowDownRight, 
  Calendar, PieChart, Sparkles, Filter, RefreshCw, Check
} from 'lucide-react';
import { MaybachLogo } from './Branding';
import { useAppStore } from '../../hooks/useAppStore';

// --- Types ---
type BlockType = 'h1' | 'h2' | 'p' | 'bullet' | 'todo' | 'quote' | 'divider' | 'code';

interface Block {
  id: string;
  type: BlockType;
  content: string;
  metadata?: any;
}

interface Note {
  id: string;
  title: string;
  category: string;
  blocks: Block[];
  updatedAt: number;
  tags: string[];
}

interface Transaction {
  id: string;
  title: string;
  category: 'Focus Yield' | 'Asset Staking' | 'Operations' | 'Market PnL' | 'Venture';
  amount: number;
  type: 'credit' | 'debit';
  date: string;
  note?: string;
}

interface AssetAllocation {
  name: string;
  allocation: number; // percentage
  value: number;
  color: string;
  change: string;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const INITIAL_ASSETS: AssetAllocation[] = [
  { name: 'Sovereign Treasury (USDC/Cash)', allocation: 42, value: 358000, color: 'bg-emerald-400', change: '+4.2%' },
  { name: 'Algorithmic Focus Staking', allocation: 28, value: 238670, color: 'bg-cyan-400', change: '+12.8%' },
  { name: 'High-Conviction Equities', allocation: 18, value: 153430, color: 'bg-purple-400', change: '+8.1%' },
  { name: 'Deep Work Liquidity Pool', allocation: 12, value: 102300, color: 'bg-amber-400', change: '+3.5%' },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 'tx-1', title: 'Focus Sprint Yield Multiplier (4.5h Deep Work)', category: 'Focus Yield', amount: 450.00, type: 'credit', date: 'Today, 10:45 AM', note: 'Session completed at 98% efficiency' },
  { id: 'tx-2', title: 'NVDA Long Position Staking Dividend', category: 'Market PnL', amount: 1250.00, type: 'credit', date: 'Yesterday, 04:30 PM', note: 'Take-profit target 1 hit' },
  { id: 'tx-3', title: 'AI Infrastructure & Neural API Compute', category: 'Operations', amount: 180.00, type: 'debit', date: 'Sep 14, 2026', note: 'Gemini-2.5 Pro cluster dedicated token pool' },
  { id: 'tx-4', title: 'Biometric Flow Protocol Subscription', category: 'Operations', amount: 65.00, type: 'debit', date: 'Sep 12, 2026', note: 'Hardware telemetry sync license' },
];

export default function Ledger() {
  const { maybachCoins, totalMinutesFocused } = useAppStore();
  
  // Tabs: notes | capital | journal
  const [activeTab, setActiveTab] = useState<'notes' | 'capital' | 'journal'>('notes');
  
  // Notes State
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('All');

  // Capital & Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [assets, setAssets] = useState<AssetAllocation[]>(INITIAL_ASSETS);
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [newTxTitle, setNewTxTitle] = useState('');
  const [newTxAmount, setNewTxAmount] = useState('');
  const [newTxCategory, setNewTxCategory] = useState<Transaction['category']>('Focus Yield');
  const [newTxType, setNewTxType] = useState<'credit' | 'debit'>('credit');

  // Load Notes & Transactions from LocalStorage
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem('maybach-ledger-notes');
      if (savedNotes) {
        const parsed = JSON.parse(savedNotes);
        setNotes(parsed);
        if (parsed.length > 0) setActiveNoteId(parsed[0].id);
      } else {
        const defaultNote: Note = {
          id: 'note-alpha',
          title: 'EXECUTIVE STRATEGY PROTOCOL',
          category: 'Strategy',
          blocks: [
            { id: 'b-1', type: 'h1', content: 'EXECUTIVE DISCIPLINE' },
            { id: 'b-2', type: 'p', content: 'Focus is asymmetric leverage. In the Maybach Protocol, time is not spent; it is allocated towards high-conviction compounding loops.' },
            { id: 'b-3', type: 'h2', content: 'Core Directives' },
            { id: 'b-4', type: 'todo', content: 'Protect first 4 hours of daylight from inbound digital communication.', metadata: { checked: true } },
            { id: 'b-5', type: 'todo', content: 'Allocate minimum 90 minutes to high-difficulty algorithmic development.', metadata: { checked: false } },
            { id: 'b-6', type: 'quote', content: '“The ultimate luxury is the sovereignty of your own attention.”' }
          ],
          updatedAt: Date.now(),
          tags: ['Discipline', 'Protocol', 'Leverage']
        };
        setNotes([defaultNote]);
        setActiveNoteId(defaultNote.id);
        localStorage.setItem('maybach-ledger-notes', JSON.stringify([defaultNote]));
      }

      const savedTx = localStorage.getItem('maybach-ledger-transactions');
      if (savedTx) {
        setTransactions(JSON.parse(savedTx));
      }
    } catch (e) {
      console.error("Ledger storage error", e);
    }
  }, []);

  const saveNotes = useCallback((updated: Note[]) => {
    setIsSyncing(true);
    setNotes(updated);
    try {
      localStorage.setItem('maybach-ledger-notes', JSON.stringify(updated));
    } catch (e) {}
    setTimeout(() => setIsSyncing(false), 500);
  }, []);

  const saveTransactions = (updated: Transaction[]) => {
    setTransactions(updated);
    try {
      localStorage.setItem('maybach-ledger-transactions', JSON.stringify(updated));
    } catch (e) {}
  };

  const createNote = () => {
    const newNote: Note = {
      id: generateId(),
      title: 'UNTITLED INTELLIGENCE',
      category: 'General',
      blocks: [
        { id: generateId(), type: 'h1', content: 'NEW INTELLIGENCE' },
        { id: generateId(), type: 'p', content: 'Input executive intelligence...' }
      ],
      updatedAt: Date.now(),
      tags: ['New']
    };
    const updated = [newNote, ...notes];
    setActiveNoteId(newNote.id);
    saveNotes(updated);
  };

  const deleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notes.filter(n => n.id !== id);
    saveNotes(updated);
    if (activeNoteId === id) {
      setActiveNoteId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const activeNote = notes.find(n => n.id === activeNoteId);

  const updateBlock = (blockId: string, content: string, metadata?: any) => {
    if (!activeNoteId) return;
    const updated = notes.map(n => {
      if (n.id === activeNoteId) {
        return {
          ...n,
          blocks: n.blocks.map(b => b.id === blockId ? { ...b, content, metadata: metadata || b.metadata } : b),
          updatedAt: Date.now()
        };
      }
      return n;
    });
    saveNotes(updated);
  };

  const addBlock = (afterIndex: number, type: BlockType = 'p') => {
    if (!activeNoteId || !activeNote) return;
    const newBlock: Block = { id: generateId(), type, content: '' };
    const newBlocks = [...activeNote.blocks];
    newBlocks.splice(afterIndex + 1, 0, newBlock);
    const updated = notes.map(n => n.id === activeNoteId ? { ...n, blocks: newBlocks, updatedAt: Date.now() } : n);
    saveNotes(updated);
  };

  const deleteBlock = (blockId: string) => {
    if (!activeNoteId || !activeNote || activeNote.blocks.length <= 1) return;
    const newBlocks = activeNote.blocks.filter(b => b.id !== blockId);
    const updated = notes.map(n => n.id === activeNoteId ? { ...n, blocks: newBlocks, updatedAt: Date.now() } : n);
    saveNotes(updated);
  };

  const exportNote = () => {
    if (!activeNote) return;
    const content = `# ${activeNote.title}\n\n` + activeNote.blocks.map(b => {
      if (b.type === 'h1') return `# ${b.content}`;
      if (b.type === 'h2') return `## ${b.content}`;
      if (b.type === 'bullet') return `- ${b.content}`;
      if (b.type === 'todo') return `[${b.metadata?.checked ? 'x' : ' '}] ${b.content}`;
      if (b.type === 'quote') return `> ${b.content}`;
      if (b.type === 'code') return `\`\`\`\n${b.content}\n\`\`\``;
      return b.content;
    }).join('\n\n');

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeNote.title.toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTxTitle.trim() || !newTxAmount) return;

    const amountNum = parseFloat(newTxAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const newTx: Transaction = {
      id: generateId(),
      title: newTxTitle.trim(),
      category: newTxCategory,
      amount: amountNum,
      type: newTxType,
      date: 'Just now'
    };

    const updated = [newTx, ...transactions];
    saveTransactions(updated);
    setNewTxTitle('');
    setNewTxAmount('');
    setShowAddTxModal(false);
  };

  // Calculations for Capital tab
  const totalNetWorth = assets.reduce((sum, a) => sum + a.value, 0) + (maybachCoins * 10);
  const totalCredits = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const totalDebits = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
  const focusYieldEstimate = ((totalMinutesFocused / 60) * 125).toFixed(2);

  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.blocks.some(b => b.content.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = activeCategoryFilter === 'All' || n.category === activeCategoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="w-full min-h-[calc(100vh-100px)] p-4 md:p-8 flex flex-col font-sans select-text">
      
      {/* Top Header & Tab Controls */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl">
            <MaybachLogo size={24} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-heading font-extrabold text-white lowercase">the ledger.</span>
              <span className="px-3 py-0.5 rounded-full bg-white/10 text-[9px] font-mono uppercase tracking-widest text-white/70 border border-white/10">
                Sovereign Capital OS
              </span>
            </div>
            <div className="text-[10px] text-white/40 tracking-widest uppercase mt-0.5 font-mono">
              INTELLIGENCE VAULT • ASSET TRACKING • FOCUS COMPOUNDING
            </div>
          </div>
        </div>

        {/* Executive Tab Switcher */}
        <div className="flex items-center gap-2 bg-zinc-950/80 p-1.5 rounded-2xl border border-white/10 shadow-xl">
          {[
            { id: 'notes', label: 'Intelligence Vault', icon: FileText },
            { id: 'capital', label: 'Capital & Yield', icon: Wallet },
            { id: 'journal', label: 'Execution Log', icon: Shield },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive 
                    ? 'bg-white text-black shadow-lg scale-105' 
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* ── TAB 1: INTELLIGENCE VAULT (Notes) ────────────────────────── */}
      {activeTab === 'notes' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
          
          {/* Left: Notes Navigator */}
          <div className="lg:col-span-4 flex flex-col bg-zinc-950/70 border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono">Intelligence Archive</span>
              <button
                onClick={createNote}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold transition-all"
              >
                <Plus size={13} />
                <span>New Record</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Search archive..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-2 pl-10 pr-4 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 font-mono"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {['All', 'Strategy', 'Discipline', 'General'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider transition-colors shrink-0 ${
                    activeCategoryFilter === cat ? 'bg-white/20 text-white border border-white/30' : 'bg-white/5 text-white/40 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar max-h-[450px]">
              {filteredNotes.map(note => (
                <div
                  key={note.id}
                  onClick={() => setActiveNoteId(note.id)}
                  className={`group p-4 rounded-2xl cursor-pointer border transition-all ${
                    activeNoteId === note.id 
                      ? 'bg-white/10 border-white/20 text-white shadow-lg' 
                      : 'bg-white/[0.02] border-white/5 text-white/50 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 truncate">
                      <h4 className="text-xs font-bold uppercase tracking-wide truncate">{note.title || 'Untitled'}</h4>
                      <p className="text-[10px] text-white/40 font-mono mt-1 truncate">
                        {note.blocks[0]?.content || 'Empty note'}
                      </p>
                    </div>
                    <button
                      onClick={(e) => deleteNote(note.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5 text-[9px] font-mono text-white/30">
                    <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5">{note.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Rich Block Editor */}
          <div className="lg:col-span-8 flex flex-col bg-zinc-950/70 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
            {activeNote ? (
              <>
                {/* Note Editor Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                      {isSyncing ? 'Syncing...' : 'Encrypted & Saved'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={exportNote}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/70 hover:text-white transition-colors"
                    >
                      <Download size={13} />
                      <span className="font-mono text-[10px] uppercase">Export .MD</span>
                    </button>
                  </div>
                </div>

                {/* Editable Title */}
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={e => {
                    const updated = notes.map(n => n.id === activeNoteId ? { ...n, title: e.target.value.toUpperCase(), updatedAt: Date.now() } : n);
                    saveNotes(updated);
                  }}
                  placeholder="UNTITLED RECORD"
                  className="w-full bg-transparent border-none outline-none text-2xl md:text-3xl font-heading font-extrabold tracking-tight text-white placeholder:text-white/20 uppercase"
                />

                {/* Blocks Container */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar max-h-[480px]">
                  {activeNote.blocks.map((block, idx) => (
                    <div key={block.id} className="group relative flex items-start gap-3 p-2 rounded-xl hover:bg-white/[0.02] transition-colors">
                      
                      {/* Block Type Prefix */}
                      <div className="mt-1 shrink-0">
                        {block.type === 'h1' && <span className="text-white/30 font-mono text-[10px] font-bold">#</span>}
                        {block.type === 'h2' && <span className="text-white/30 font-mono text-[10px] font-bold">##</span>}
                        {block.type === 'bullet' && <span className="text-cyan-400 text-xs">•</span>}
                        {block.type === 'todo' && (
                          <input
                            type="checkbox"
                            checked={block.metadata?.checked || false}
                            onChange={e => updateBlock(block.id, block.content, { checked: e.target.checked })}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 cursor-pointer"
                          />
                        )}
                        {block.type === 'quote' && <span className="text-purple-400 font-serif text-sm">“</span>}
                        {block.type === 'code' && <Code size={13} className="text-emerald-400" />}
                        {block.type === 'p' && <span className="text-white/20 font-mono text-[9px]">¶</span>}
                      </div>

                      {/* Block Input */}
                      <textarea
                        value={block.content}
                        onChange={e => updateBlock(block.id, e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            addBlock(idx, block.type);
                          }
                        }}
                        rows={block.type === 'code' ? 3 : 1}
                        className={`flex-1 bg-transparent border-none outline-none text-xs md:text-sm resize-none overflow-hidden ${
                          block.type === 'h1' 
                            ? 'font-bold text-base md:text-lg text-white uppercase tracking-wider' 
                            : block.type === 'h2'
                            ? 'font-bold text-sm md:text-base text-zinc-200'
                            : block.type === 'quote'
                            ? 'italic text-purple-200 font-serif'
                            : block.type === 'code'
                            ? 'font-mono bg-black/40 p-2.5 rounded-xl text-emerald-400 border border-emerald-500/20'
                            : block.metadata?.checked
                            ? 'line-through text-white/40'
                            : 'text-zinc-300'
                        }`}
                        placeholder="Type content..."
                      />

                      {/* Block Controls Hover */}
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
                        <button
                          onClick={() => addBlock(idx, 'p')}
                          className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"
                          title="Add block below"
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          onClick={() => deleteBlock(block.id)}
                          className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-red-400"
                          title="Delete block"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
                <MaybachLogo size={48} className="opacity-20" />
                <p className="text-white/40 font-mono text-xs uppercase tracking-widest">No Intelligence Record Selected</p>
                <button
                  onClick={createNote}
                  className="px-5 py-2.5 rounded-2xl bg-white text-black font-bold text-xs uppercase tracking-wider hover:scale-105 transition-all"
                >
                  Create Record
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: CAPITAL & ASSET LEDGER ───────────────────────────── */}
      {activeTab === 'capital' && (
        <div className="flex-1 space-y-6">
          
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-6 rounded-3xl bg-zinc-950/80 border border-white/10 shadow-2xl flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between text-white/40 text-xs font-mono uppercase tracking-widest">
                <span>Total Sovereign Net Worth</span>
                <DollarSign size={16} className="text-emerald-400" />
              </div>
              <div>
                <span className="text-3xl font-extrabold text-white font-mono">${totalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                <p className="text-emerald-400 text-xs font-mono mt-1 flex items-center gap-1">
                  <TrendingUp size={12} /> +9.4% Compounded Growth
                </p>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-zinc-950/80 border border-white/10 shadow-2xl flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between text-white/40 text-xs font-mono uppercase tracking-widest">
                <span>Focus Yield Multiplier</span>
                <Zap size={16} className="text-cyan-400" />
              </div>
              <div>
                <span className="text-3xl font-extrabold text-cyan-400 font-mono">${focusYieldEstimate}</span>
                <p className="text-white/40 text-xs font-mono mt-1">
                  {(totalMinutesFocused / 60).toFixed(1)}h Deep Work @ $125/hr
                </p>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-zinc-950/80 border border-white/10 shadow-2xl flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between text-white/40 text-xs font-mono uppercase tracking-widest">
                <span>Maybach Protocol Coins</span>
                <Sparkles size={16} className="text-amber-400" />
              </div>
              <div>
                <span className="text-3xl font-extrabold text-amber-400 font-mono">{maybachCoins} ℳ</span>
                <p className="text-white/40 text-xs font-mono mt-1">
                  Liquid internal capital staking
                </p>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-zinc-950/80 border border-white/10 shadow-2xl flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between text-white/40 text-xs font-mono uppercase tracking-widest">
                <span>Net Cash Inflow</span>
                <ArrowUpRight size={16} className="text-emerald-400" />
              </div>
              <div>
                <span className="text-3xl font-extrabold text-emerald-400 font-mono">+${(totalCredits - totalDebits).toLocaleString()}</span>
                <p className="text-white/40 text-xs font-mono mt-1">
                  {transactions.length} Verified Ledger Events
                </p>
              </div>
            </div>
          </div>

          {/* Asset Allocation Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 p-6 rounded-3xl bg-zinc-950/80 border border-white/10 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-xs font-bold text-white uppercase tracking-widest font-mono">Asset Allocation Vault</span>
                <PieChart size={15} className="text-white/40" />
              </div>

              {/* Progress Stack Bar */}
              <div className="w-full h-3 rounded-full bg-white/5 flex overflow-hidden">
                {assets.map((asset, i) => (
                  <div 
                    key={i} 
                    style={{ width: `${asset.allocation}%` }} 
                    className={`${asset.color} h-full transition-all`} 
                  />
                ))}
              </div>

              {/* Asset List */}
              <div className="space-y-3 pt-2">
                {assets.map((asset, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-md ${asset.color}`} />
                      <div>
                        <span className="text-xs font-bold text-white/90">{asset.name}</span>
                        <p className="text-[10px] text-white/40 font-mono">{asset.allocation}% of Portfolio</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold font-mono text-white">${asset.value.toLocaleString()}</span>
                      <p className="text-[10px] font-mono text-emerald-400">{asset.change}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction Logs */}
            <div className="lg:col-span-7 p-6 rounded-3xl bg-zinc-950/80 border border-white/10 shadow-2xl space-y-5 flex flex-col">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-xs font-bold text-white uppercase tracking-widest font-mono">Real-Time Transactions</span>
                <button
                  onClick={() => setShowAddTxModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all"
                >
                  <Plus size={13} />
                  <span>Add Transaction</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar max-h-[360px]">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        tx.type === 'credit' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {tx.type === 'credit' ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white/90">{tx.title}</h5>
                        <p className="text-[10px] text-white/40 font-mono mt-0.5">{tx.date} • {tx.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold font-mono ${tx.type === 'credit' ? 'text-emerald-400' : 'text-white/80'}`}>
                        {tx.type === 'credit' ? '+' : '-'}${tx.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: EXECUTION JOURNAL ────────────────────────────────── */}
      {activeTab === 'journal' && (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "HIGH-CONVICTION PRINCIPLE",
              tag: "DISCIPLINE",
              desc: "Execution without reflection produces exhaustion. Execution with brutal quantitative analysis produces exponential returns.",
              status: "ACTIVE"
            },
            {
              title: "ASYMMETRIC BET PROTOCOL",
              tag: "ALLOCATION",
              desc: "Cap downside risk at single-digit percentages; ensure upside capture has unbounded leverage across code and capital.",
              status: "ACTIVE"
            },
            {
              title: "SOVEREIGN TIME VAULT",
              tag: "FOCUS",
              desc: "Never trade deep work hours for synchronous meetings. Asynchronous coordination compounds velocity.",
              status: "ACTIVE"
            }
          ].map((item, idx) => (
            <div key={idx} className="p-6 rounded-3xl bg-zinc-950/80 border border-white/10 shadow-2xl space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-[9px] font-bold">
                  {item.tag}
                </span>
                <h4 className="text-base font-bold text-white tracking-wide font-mono mt-2">{item.title}</h4>
                <p className="text-xs text-white/60 leading-relaxed font-sans">{item.desc}</p>
              </div>
              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-white/40">
                <span>STATUS: {item.status}</span>
                <Check size={14} className="text-emerald-400" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {showAddTxModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-xl"
              onClick={() => setShowAddTxModal(false)}
            />
            <motion.form
              onSubmit={handleAddTransaction}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-zinc-950 border border-white/10 rounded-3xl p-6 shadow-2xl z-10 space-y-4"
            >
              <h3 className="text-lg font-heading font-extrabold text-white">Record Ledger Entry</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">Entry Title</label>
                  <input
                    type="text"
                    required
                    value={newTxTitle}
                    onChange={e => setNewTxTitle(e.target.value)}
                    placeholder="e.g. Focus Sprint Yield Bonus"
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-white/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newTxAmount}
                      onChange={e => setNewTxAmount(e.target.value)}
                      placeholder="500.00"
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-white/30 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">Flow Type</label>
                    <select
                      value={newTxType}
                      onChange={e => setNewTxType(e.target.value as any)}
                      className="w-full p-3 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none"
                    >
                      <option value="credit">Credit (+ Inflow)</option>
                      <option value="debit">Debit (- Outflow)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">Category</label>
                  <select
                    value={newTxCategory}
                    onChange={e => setNewTxCategory(e.target.value as any)}
                    className="w-full p-3 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none"
                  >
                    <option value="Focus Yield">Focus Yield</option>
                    <option value="Asset Staking">Asset Staking</option>
                    <option value="Market PnL">Market PnL</option>
                    <option value="Operations">Operations</option>
                    <option value="Venture">Venture</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTxModal(false)}
                  className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white/60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold uppercase tracking-wider"
                >
                  Record Entry
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
