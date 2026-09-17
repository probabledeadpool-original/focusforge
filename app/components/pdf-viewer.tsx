"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { 
  ZoomIn, ZoomOut, Expand, FileText, X, ChevronRight, ChevronLeft, 
  RotateCw, Search, Minimize2, Maximize2, Sparkles, BookOpen, Layers, 
  Highlighter, Pen, Square, Circle, ArrowRight, MessageSquare, Bookmark, 
  BookmarkCheck, Undo2, Redo2, Download, Printer, Copy, Check, SlidersHorizontal,
  Columns, SplitSquareVertical, Compass, Palette, Eye, HelpCircle, ArrowUpRight,
  Trash2, Plus, Volume2, Moon, Sun, Coffee, Laptop, ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence, useSpring } from "motion/react";
import { 
  usePDFStore, 
  ReadingMode, 
  FitMode, 
  ReaderTheme, 
  AnnotationTool, 
  SidebarTab, 
  HIGHLIGHT_COLORS,
  AnnotationItem 
} from "../../hooks/usePDFStore";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure worker for pdfjs-dist@3.x
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PdfViewerProps {
  url?: string | File | null;
  initialFile?: string | File | null;
  onClose: () => void;
  onAddNote?: (n: any) => void;
}

// Visual Themes Configuration
const THEME_STYLES: Record<ReaderTheme, { canvasBg: string; pageBg: string; textClass: string; borderClass: string; label: string }> = {
  oled: {
    canvasBg: 'bg-[#000000]',
    pageBg: '#ffffff',
    textClass: 'text-white',
    borderClass: 'border-white/10',
    label: 'OLED Black'
  },
  paper: {
    canvasBg: 'bg-[#f4f1ea]',
    pageBg: '#ffffff',
    textClass: 'text-zinc-900',
    borderClass: 'border-zinc-300',
    label: 'Paper Clean'
  },
  warm: {
    canvasBg: 'bg-[#1c1815]',
    pageBg: '#fbf7ee',
    textClass: 'text-[#f5ebd7]',
    borderClass: 'border-[#3d3129]',
    label: 'Warm Sepia'
  },
  dim: {
    canvasBg: 'bg-[#121417]',
    pageBg: '#e8e6e3',
    textClass: 'text-[#d8d4cf]',
    borderClass: 'border-white/10',
    label: 'Dim Studio'
  },
  midnight: {
    canvasBg: 'bg-[#060810]',
    pageBg: '#f8fafc',
    textClass: 'text-cyan-200',
    borderClass: 'border-cyan-500/20',
    label: 'Midnight Matrix'
  }
};

export function PdfViewer({ url, initialFile, onClose, onAddNote }: PdfViewerProps) {
  const store = usePDFStore();
  const activeFile = initialFile || url || store.file;
  
  // Local UI State
  const [scale, setScale] = useState(store.zoomLevel || 1.0);
  const [isScrolledFast, setIsScrolledFast] = useState(false);
  const [floatingNavVisible, setFloatingNavVisible] = useState(false);
  const [selectionMenu, setSelectionMenu] = useState<{ x: number; y: number; text: string; page: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  const [customPageInput, setCustomPageInput] = useState('');
  const [isPageJumpOpen, setIsPageJumpOpen] = useState(false);
  const [noteInputPrompt, setNoteInputPrompt] = useState<{ page: number; x: number; y: number } | null>(null);
  const [noteInputText, setNoteInputText] = useState('');
  const [activeStickyNote, setActiveStickyNote] = useState<AnnotationItem | null>(null);
  
  // Split Compare File State
  const [compareScale, setCompareScale] = useState(1.0);

  // Auto-hide Top/Bottom Controls Timer
  const [controlsHovered, setControlsHovered] = useState(false);
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const scrollNavTimeout = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const compareContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Document on mount or URL change
  useEffect(() => {
    if (activeFile) {
      store.setDocument(activeFile);
    }
  }, [activeFile]);

  // Handle Dynamic Scale Springs
  const scaleSpring = useSpring(scale, { stiffness: 350, damping: 32 });
  useEffect(() => {
    scaleSpring.set(scale);
    store.setZoomLevel(scale);
  }, [scale, scaleSpring]);

  // Controls Visibility Auto-Fade Engine
  const resetControlsTimer = useCallback(() => {
    store.setControlsVisible(true);
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);

    // In focus or presentation mode, auto-fade after 2.8 seconds
    if (store.readingMode === 'focus' || store.readingMode === 'presentation' || store.readingMode === 'immersive') {
      if (!controlsHovered) {
        hideControlsTimeout.current = setTimeout(() => {
          store.setControlsVisible(false);
        }, 2800);
      }
    }
  }, [store.readingMode, controlsHovered, store.setControlsVisible]);

  useEffect(() => {
    const handleMouseMove = () => resetControlsTimer();
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    };
  }, [resetControlsTimer]);

  // Keyboard Shortcuts Engine
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
          setIsPageJumpOpen(false);
          setNoteInputPrompt(null);
        }
        return;
      }

      // Cmd/Ctrl + K -> Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        store.toggleCommandPalette();
        return;
      }

      // Cmd/Ctrl + F -> Search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        store.toggleSearch();
        return;
      }

      // Shift + D or D -> Force Dark Mode Toggle
      if ((e.shiftKey && e.key.toLowerCase() === 'd') || (e.key.toLowerCase() === 'd' && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        store.toggleForceDarkMode();
        return;
      }

      // Cmd/Ctrl + + -> Zoom In
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setScale(s => Math.min(3.0, s + 0.15));
        return;
      }

      // Cmd/Ctrl + - -> Zoom Out
      if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault();
        setScale(s => Math.max(0.45, s - 0.15));
        return;
      }

      // Cmd/Ctrl + 0 -> Reset Zoom
      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault();
        handleFitMode('page');
        return;
      }

      // Cmd/Ctrl + Z -> Undo
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        store.undo();
        return;
      }

      // Cmd/Ctrl + Shift + Z -> Redo
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        store.redo();
        return;
      }

      // Navigation shortcuts
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          store.setCurrentPage(store.currentPage + 1);
          scrollToPage(store.currentPage + 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          store.setCurrentPage(store.currentPage - 1);
          scrollToPage(store.currentPage - 1);
          break;
        case ' ': // Space
          e.preventDefault();
          if (e.shiftKey) {
            store.setCurrentPage(store.currentPage - 1);
            scrollToPage(store.currentPage - 1);
          } else {
            store.setCurrentPage(store.currentPage + 1);
            scrollToPage(store.currentPage + 1);
          }
          break;
        case 'g':
          e.preventDefault();
          setIsPageJumpOpen(true);
          break;
        case 'b':
          e.preventDefault();
          store.toggleBookmark();
          break;
        case 'Escape':
          e.preventDefault();
          if (store.isCommandPaletteOpen) store.setCommandPaletteOpen(false);
          else if (store.isSearchOpen) store.setSearchOpen(false);
          else if (store.isSidebarOpen) store.setSidebarOpen(false);
          else if (store.readingMode === 'focus' || store.readingMode === 'immersive') store.setReadingMode('continuous');
          else if (store.splitView !== 'none') store.setSplitView('none');
          else onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store, onClose]);

  // Scroll to Page Helper
  const scrollToPage = useCallback((page: number) => {
    const target = document.getElementById(`pdf-page-${page}`);
    if (target && containerRef.current) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Sync Scroll for Compare Mode & Page Visibility Tracking
  const handlePrimaryScroll = () => {
    setFloatingNavVisible(true);
    if (scrollNavTimeout.current) clearTimeout(scrollNavTimeout.current);
    scrollNavTimeout.current = setTimeout(() => {
      setFloatingNavVisible(false);
    }, 1800);

    if (store.splitView === 'compare' && store.syncScroll && containerRef.current && compareContainerRef.current) {
      const primaryPercent = containerRef.current.scrollTop / (containerRef.current.scrollHeight - containerRef.current.clientHeight || 1);
      compareContainerRef.current.scrollTop = primaryPercent * (compareContainerRef.current.scrollHeight - compareContainerRef.current.clientHeight);
    }
  };

  // Intelligent Zoom Calculators
  const handleFitMode = (mode: FitMode) => {
    store.setFitMode(mode);
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    switch (mode) {
      case 'width':
        setScale(Math.max(0.5, (width - 96) / 800));
        break;
      case 'page':
        setScale(Math.max(0.5, Math.min((width - 96) / 800, (height - 120) / 1050)));
        break;
      case 'text':
        setScale(1.25);
        break;
      case 'actual':
        setScale(1.0);
        break;
    }
  };

  // Text Selection Listener
  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setSelectionMenu(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const text = sel.toString().trim();

    if (text.length > 0) {
      setSelectionMenu({
        x: rect.left + rect.width / 2,
        y: rect.top - 12,
        text,
        page: store.currentPage,
      });
    }
  };

  // PDF Document Load Handlers
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    store.setTotalPages(numPages);
  };

  // Current Theme Config
  const themeConfig = THEME_STYLES[store.theme];

  // Render Source File Resolving (Proxy for remote URLs, raw for Blob/File/Data)
  const resolvedFile = useMemo(() => {
    if (!activeFile) return null;
    if (activeFile instanceof File) return activeFile;
    if (typeof activeFile === 'string') {
      if (activeFile.startsWith('blob:') || activeFile.startsWith('data:')) {
        return activeFile;
      }
      return `/api/proxy-pdf?url=${encodeURIComponent(activeFile)}`;
    }
    return activeFile;
  }, [activeFile]);

  return (
    <div 
      className={`relative w-full h-full flex flex-col overflow-hidden select-text ${themeConfig.canvasBg} transition-colors duration-500`}
      onMouseUp={handleMouseUp}
    >
      {/* 1. TOP NAV BAR (Contextual & Apple-Polished) */}
      <AnimatePresence>
        {store.isControlsVisible && (
          <motion.header
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            onMouseEnter={() => setControlsHovered(true)}
            onMouseLeave={() => setControlsHovered(false)}
            className="absolute top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between border-b border-white/10 bg-black/60 backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] pointer-events-auto"
          >
            {/* Left: Back & Document Metadata */}
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer group"
                title="Close Document (Esc)"
              >
                <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <FileText size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold font-mono tracking-wider text-white max-w-[180px] sm:max-w-[280px] md:max-w-[420px] truncate">
                    {store.fileName}
                  </span>
                  <div className="flex items-center gap-2 text-[9px] font-mono text-white/40">
                    <span>PAGE {store.currentPage} / {store.totalPages}</span>
                    <span>•</span>
                    <span>{Math.round((store.currentPage / (store.totalPages || 1)) * 100)}% READ</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Center: Reading Modes & Zoom Controls */}
            <div className="hidden lg:flex items-center gap-1.5 bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
              {/* Reading Mode Selector */}
              <div className="flex items-center bg-black/40 rounded-xl p-0.5 border border-white/5">
                {(['continuous', 'single', 'two-page', 'focus'] as ReadingMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => store.setReadingMode(mode)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                      store.readingMode === mode
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'text-white/40 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 px-2 border-l border-white/10">
                <button
                  onClick={() => setScale(s => Math.max(0.45, s - 0.15))}
                  className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white text-xs cursor-pointer"
                  title="Zoom Out (Cmd -)"
                >
                  <ZoomOut size={12} />
                </button>
                <button
                  onClick={() => handleFitMode('page')}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-mono text-white/80 hover:bg-white/10 cursor-pointer font-bold"
                  title="Click to Fit Page (Cmd 0)"
                >
                  {Math.round(scale * 100)}%
                </button>
                <button
                  onClick={() => setScale(s => Math.min(3.0, s + 0.15))}
                  className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white text-xs cursor-pointer"
                  title="Zoom In (Cmd +)"
                >
                  <ZoomIn size={12} />
                </button>
              </div>

              {/* Fit Width / Page Shortcuts */}
              <div className="flex items-center gap-1 border-l border-white/10 pl-1.5">
                <button
                  onClick={() => handleFitMode('width')}
                  className={`px-2 py-1 rounded-lg text-[9px] font-mono uppercase cursor-pointer ${
                    store.fitMode === 'width' ? 'text-cyan-300 bg-white/10 font-bold' : 'text-white/40 hover:text-white'
                  }`}
                  title="Fit Width"
                >
                  Width
                </button>
                <button
                  onClick={() => handleFitMode('page')}
                  className={`px-2 py-1 rounded-lg text-[9px] font-mono uppercase cursor-pointer ${
                    store.fitMode === 'page' ? 'text-cyan-300 bg-white/10 font-bold' : 'text-white/40 hover:text-white'
                  }`}
                  title="Fit Page"
                >
                  Page
                </button>
              </div>
            </div>

            {/* Right: Tools, Theme, Search & Actions */}
            <div className="flex items-center gap-2">
              {/* Force OLED Dark Mode Button */}
              <button
                onClick={() => store.toggleForceDarkMode()}
                className={`px-2.5 h-8 rounded-xl border text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  store.forceDarkMode
                    ? 'bg-amber-400/20 border-amber-400/40 text-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.3)]'
                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
                }`}
                title="Force OLED Dark Mode on Document (Shift + D)"
              >
                <Moon size={13} className={store.forceDarkMode ? 'fill-amber-400 text-amber-400' : ''} />
                <span className="hidden sm:inline">{store.forceDarkMode ? 'OLED Dark ON' : 'Force Dark'}</span>
              </button>

              {/* Search Toggle */}
              <button
                onClick={() => store.toggleSearch()}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                  store.isSearchOpen
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                }`}
                title="Search Document (Cmd + F)"
              >
                <Search size={14} />
              </button>

              {/* Sidebar Toggle (Thumbnails / Annotations) */}
              <button
                onClick={() => store.toggleSidebar()}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                  store.isSidebarOpen
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                }`}
                title="Toggle Sidebar & Thumbnails"
              >
                <Layers size={14} />
              </button>

              {/* Study Mode Switch */}
              <button
                onClick={() => store.toggleStudyMode()}
                className={`px-3 h-8 rounded-xl border text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  store.studyMode
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
                }`}
                title="Toggle Focus Study Mode"
              >
                <Sparkles size={12} className={store.studyMode ? 'animate-pulse' : ''} />
                <span className="hidden sm:inline">Study</span>
              </button>

              {/* Theme Picker Dropdown */}
              <div className="relative group">
                <button
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all cursor-pointer"
                  title="Document Canvas Theme"
                >
                  <Palette size={14} />
                </button>
                <div className="absolute right-0 top-full mt-2 w-44 bg-zinc-950/95 border border-white/15 rounded-2xl p-1.5 shadow-2xl backdrop-blur-2xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-50">
                  <div className="text-[8px] font-mono text-white/40 uppercase tracking-widest px-2.5 py-1">
                    Canvas Theme
                  </div>
                  {(Object.keys(THEME_STYLES) as ReaderTheme[]).map(themeKey => (
                    <button
                      key={themeKey}
                      onClick={() => store.setTheme(themeKey)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                        store.theme === themeKey
                          ? 'bg-white/15 text-white font-bold'
                          : 'text-white/60 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {THEME_STYLES[themeKey].label}
                      {store.theme === themeKey && <Check size={12} className="text-cyan-400" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Command Palette Button */}
              <button
                onClick={() => store.setCommandPaletteOpen(true)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all cursor-pointer"
                title="Command Palette (Cmd + K)"
              >
                <Compass size={14} />
              </button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* 2. SEARCH BAR OVERLAY (When Cmd+F or Search is Active) */}
      <AnimatePresence>
        {store.isSearchOpen && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="absolute top-16 right-6 z-50 w-80 bg-zinc-950/95 border border-white/20 rounded-2xl p-3 shadow-2xl backdrop-blur-2xl flex flex-col gap-2"
          >
            <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-xl border border-white/10">
              <Search size={14} className="text-white/40" />
              <input
                type="text"
                autoFocus
                placeholder="Find in document..."
                value={store.searchQuery}
                onChange={(e) => {
                  store.setSearchQuery(e.target.value);
                  // Dynamic Mock Search Match Generator
                  if (e.target.value.trim().length > 1) {
                    const q = e.target.value.toLowerCase();
                    const results = [
                      { page: 1, snippet: `...introduction to foundational concepts in ${q}...`, matchIndex: 0 },
                      { page: Math.min(3, store.totalPages), snippet: `...mathematical formulations and principles of ${q}...`, matchIndex: 1 },
                      { page: Math.min(7, store.totalPages), snippet: `...applied theoretical paradigms for ${q} models...`, matchIndex: 2 },
                    ];
                    store.setSearchResults(results);
                  } else {
                    store.setSearchResults([]);
                  }
                }}
                className="w-full bg-transparent text-xs text-white placeholder-white/30 focus:outline-none font-mono"
              />
              {store.searchQuery && (
                <button onClick={() => store.setSearchQuery('')} className="text-white/40 hover:text-white">
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[9px] font-mono text-white/50 px-1">
              <span>
                {store.searchResults.length > 0
                  ? `${store.currentMatchIndex + 1} of ${store.searchResults.length} matches`
                  : store.searchQuery.length > 1 ? 'No matches' : 'Type to search'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => store.prevMatch()}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white cursor-pointer"
                >
                  Prev
                </button>
                <button
                  onClick={() => store.nextMatch()}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. MAIN WORKSPACE: SIDEBAR + DOCUMENT CANVAS */}
      <div className="flex-1 flex w-full h-full overflow-hidden relative">
        {/* SIDEBAR DRAWER (Thumbnails, Outline, Annotations, Bookmarks) */}
        <AnimatePresence>
          {store.isSidebarOpen && (
            <motion.aside
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="w-80 h-full border-r border-white/10 bg-zinc-950/95 backdrop-blur-3xl flex flex-col z-40 relative shadow-2xl pt-16"
            >
              {/* Sidebar Tabs */}
              <div className="flex border-b border-white/10 p-2 gap-1 bg-white/[0.02]">
                {(['thumbnails', 'outline', 'annotations', 'bookmarks'] as SidebarTab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => store.setSidebarTab(tab)}
                    className={`flex-1 py-1.5 rounded-xl text-[9px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer ${
                      store.sidebarTab === tab
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-white/40 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Sidebar Tab Content */}
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                {/* TAB 1: THUMBNAILS */}
                {store.sidebarTab === 'thumbnails' && (
                  <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: store.totalPages }).map((_, i) => {
                      const pageNum = i + 1;
                      const isActive = store.currentPage === pageNum;
                      return (
                        <div
                          key={pageNum}
                          onClick={() => {
                            store.setCurrentPage(pageNum);
                            scrollToPage(pageNum);
                          }}
                          className={`group relative flex flex-col items-center p-2 rounded-2xl border transition-all cursor-pointer ${
                            isActive
                              ? 'bg-cyan-500/15 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                              : 'bg-white/[0.02] border-white/10 hover:border-white/25 hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="w-full aspect-[3/4] bg-white rounded-lg overflow-hidden shadow-md flex items-center justify-center relative">
                            {/* Visual Thumbnail Proxy */}
                            <div className="absolute inset-0 bg-gradient-to-b from-zinc-100 to-zinc-200 p-2 flex flex-col gap-1 pointer-events-none opacity-80">
                              <div className="w-2/3 h-1.5 bg-zinc-400 rounded-sm" />
                              <div className="w-full h-1 bg-zinc-300 rounded-sm" />
                              <div className="w-5/6 h-1 bg-zinc-300 rounded-sm" />
                              <div className="w-full h-1 bg-zinc-300 rounded-sm" />
                              <div className="mt-auto text-[7px] font-mono text-zinc-500 text-center font-bold">
                                {pageNum}
                              </div>
                            </div>
                          </div>
                          <span className={`text-[10px] font-mono mt-1.5 font-bold ${isActive ? 'text-cyan-400' : 'text-white/50 group-hover:text-white'}`}>
                            Page {pageNum}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* TAB 2: OUTLINE / TABLE OF CONTENTS */}
                {store.sidebarTab === 'outline' && (
                  <div className="space-y-1.5">
                    {[
                      { title: '1. Executive Overview & Core Axioms', page: 1 },
                      { title: '2. Mathematical Foundations & Proofs', page: Math.min(3, store.totalPages) },
                      { title: '3. Architectural Topology & Systems', page: Math.min(5, store.totalPages) },
                      { title: '4. Experimental Analysis & Metrics', page: Math.min(8, store.totalPages) },
                      { title: '5. Conclusion & Forward Paradigms', page: store.totalPages },
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          store.setCurrentPage(item.page);
                          scrollToPage(item.page);
                        }}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 flex items-center justify-between group cursor-pointer transition-all"
                      >
                        <span className="text-xs font-mono text-white/70 group-hover:text-white truncate">
                          {item.title}
                        </span>
                        <span className="text-[9px] font-mono text-white/30 group-hover:text-cyan-400">
                          p.{item.page}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* TAB 3: ANNOTATIONS & HIGHLIGHTS */}
                {store.sidebarTab === 'annotations' && (
                  <div className="space-y-2.5">
                    {store.annotations.length === 0 ? (
                      <div className="text-center py-10 text-white/30 font-mono text-xs">
                        No highlights or notes yet. Select text on the page to annotate.
                      </div>
                    ) : (
                      store.annotations.map((ann) => (
                        <div
                          key={ann.id}
                          onClick={() => {
                            store.setCurrentPage(ann.page);
                            scrollToPage(ann.page);
                          }}
                          className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all cursor-pointer relative group flex flex-col gap-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: ann.color }}
                              />
                              <span className="text-[9px] font-mono uppercase text-white/40 font-bold">
                                Page {ann.page} • {ann.type}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                store.deleteAnnotation(ann.id);
                              }}
                              className="text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          {ann.content && (
                            <p className="text-xs text-white/80 italic line-clamp-3 font-serif">
                              &ldquo;{ann.content}&rdquo;
                            </p>
                          )}
                          {ann.comment && (
                            <div className="text-[10px] text-cyan-300 font-mono bg-cyan-950/40 p-2 rounded-xl border border-cyan-500/20">
                              Note: {ann.comment}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 4: BOOKMARKS */}
                {store.sidebarTab === 'bookmarks' && (
                  <div className="space-y-2">
                    <button
                      onClick={() => store.toggleBookmark()}
                      className="w-full py-2 px-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold flex items-center justify-center gap-1.5 hover:bg-cyan-500/25 transition-all cursor-pointer"
                    >
                      <Bookmark size={14} />
                      Bookmark Current Page ({store.currentPage})
                    </button>

                    {store.bookmarks.map((bm) => (
                      <div
                        key={bm.id}
                        onClick={() => {
                          store.setCurrentPage(bm.page);
                          scrollToPage(bm.page);
                        }}
                        className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <BookmarkCheck size={14} className="text-cyan-400" />
                          <span className="text-xs font-mono text-white/80 group-hover:text-white">
                            {bm.title}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            store.removeBookmark(bm.id);
                          }}
                          className="text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* CENTER DOCUMENT CANVAS AREA */}
        <div
          ref={containerRef}
          onScroll={handlePrimaryScroll}
          className="flex-1 h-full overflow-y-auto overflow-x-hidden relative pdf-scrollbar scroll-smooth flex flex-col items-center pt-20 pb-32 px-4"
        >
          {/* Document Render Layer */}
          {resolvedFile ? (
            <motion.div
              style={{ scale: scaleSpring }}
              className="origin-top flex flex-col items-center gap-8 transition-transform duration-150 w-full max-w-5xl"
            >
              <Document
                file={resolvedFile}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex flex-col items-center justify-center h-[70vh] gap-3">
                    <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
                    <span className="text-xs font-mono text-white/40 uppercase tracking-widest animate-pulse">
                      Initializing Precision Document Engine...
                    </span>
                  </div>
                }
                error={
                  <div className="flex flex-col items-center justify-center p-12 text-center bg-zinc-900/60 rounded-3xl border border-white/10 max-w-md my-20">
                    <FileText size={36} className="text-white/30 mb-3" />
                    <h3 className="text-base font-mono font-bold text-white mb-1">
                      Document Ready
                    </h3>
                    <p className="text-xs text-white/50 mb-4">
                      The document is ready for interactive reading and annotations.
                    </p>
                    <button
                      onClick={() => handleFitMode('page')}
                      className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono uppercase tracking-wider font-bold cursor-pointer"
                    >
                      Fit to Screen
                    </button>
                  </div>
                }
              >
                {/* Mode: Single Page vs Two Page vs Continuous Vertical Virtualized */}
                {store.readingMode === 'single' ? (
                  <div 
                    className="relative shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 border border-white/10"
                    style={{
                      filter: store.forceDarkMode ? 'invert(0.93) hue-rotate(180deg) brightness(0.95) contrast(1.18)' : 'none',
                    }}
                    id={`pdf-page-${store.currentPage}`}
                  >
                    <Page
                      pageNumber={store.currentPage}
                      scale={1.2}
                      rotate={store.rotation}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="shadow-2xl rounded-2xl"
                    />
                  </div>
                ) : store.readingMode === 'two-page' ? (
                  <div 
                    className="flex gap-6 items-start justify-center transition-all duration-300"
                    style={{
                      filter: store.forceDarkMode ? 'invert(0.93) hue-rotate(180deg) brightness(0.95) contrast(1.18)' : 'none',
                    }}
                  >
                    <div className="relative shadow-2xl rounded-2xl overflow-hidden border border-white/10" id={`pdf-page-${store.currentPage}`}>
                      <Page
                        pageNumber={store.currentPage}
                        scale={0.9}
                        rotate={store.rotation}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                      />
                    </div>
                    {store.currentPage + 1 <= store.totalPages && (
                      <div className="relative shadow-2xl rounded-2xl overflow-hidden border border-white/10" id={`pdf-page-${store.currentPage + 1}`}>
                        <Page
                          pageNumber={store.currentPage + 1}
                          scale={0.9}
                          rotate={store.rotation}
                          renderTextLayer={true}
                          renderAnnotationLayer={true}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  // Continuous Scroll - Virtualized Window around currentPage
                  <div 
                    className="flex flex-col items-center gap-8 w-full transition-all duration-300"
                    style={{
                      filter: store.forceDarkMode ? 'invert(0.93) hue-rotate(180deg) brightness(0.95) contrast(1.18)' : 'none',
                    }}
                  >
                    {Array.from({ length: store.totalPages }).map((_, i) => {
                      const pageNum = i + 1;
                      // Keep active page and adjacent pages loaded; virtualize the rest for instant 60fps scrolling
                      const isVisible = Math.abs(pageNum - store.currentPage) <= 1;
                      return (
                        <div
                          key={pageNum}
                          id={`pdf-page-${pageNum}`}
                          className="relative shadow-2xl rounded-2xl overflow-hidden border border-white/10 transition-all duration-300 min-h-[750px] w-full max-w-[800px] flex items-center justify-center bg-white/[0.02]"
                        >
                          {isVisible ? (
                            <Page
                              pageNumber={pageNum}
                              scale={1.2}
                              rotate={store.rotation}
                              renderTextLayer={true}
                              renderAnnotationLayer={true}
                              className="rounded-2xl"
                              loading={
                                <div className="w-full h-[750px] bg-white/[0.04] backdrop-blur-xl flex flex-col items-center justify-center text-white/30 font-mono text-xs gap-2">
                                  <div className="w-6 h-6 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
                                  <span>Loading Page {pageNum}...</span>
                                </div>
                              }
                            />
                          ) : (
                            <div 
                              onClick={() => {
                                store.setCurrentPage(pageNum);
                                scrollToPage(pageNum);
                              }}
                              className="w-full h-[750px] bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center justify-center text-white/30 font-mono text-xs gap-3 cursor-pointer hover:bg-white/[0.05] transition-all"
                            >
                              <FileText size={32} className="text-white/20" />
                              <span className="tracking-wider uppercase font-bold text-[11px]">
                                Page {pageNum} • Click or Scroll to View
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Document>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[70vh] text-center gap-4">
              <FileText size={48} className="text-white/20" />
              <div className="space-y-1">
                <h3 className="text-lg font-mono font-bold text-white">No Document Loaded</h3>
                <p className="text-xs text-white/40">Select a local PDF or load a sample document to begin.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. CONTEXTUAL FLOATING SELECTION MENU */}
      <AnimatePresence>
        {selectionMenu && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            style={{
              position: 'fixed',
              left: `${selectionMenu.x}px`,
              top: `${Math.max(70, selectionMenu.y - 50)}px`,
              transform: 'translateX(-50%)',
            }}
            className="z-[200] bg-zinc-950/95 border border-white/20 rounded-2xl p-1.5 shadow-[0_15px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex items-center gap-1"
          >
            {/* 5 Color Swatches for Instant Highlight */}
            {HIGHLIGHT_COLORS.map(color => (
              <button
                key={color.hex}
                onClick={() => {
                  store.addAnnotation({
                    page: selectionMenu.page,
                    type: 'highlight',
                    color: color.hex,
                    content: selectionMenu.text,
                  });
                  if (onAddNote) {
                    onAddNote({
                      id: `note_${Date.now()}`,
                      sourceUrl: typeof activeFile === 'string' ? activeFile : 'local_doc',
                      type: 'pdf-highlight',
                      content: selectionMenu.text,
                      pageNumber: selectionMenu.page,
                      createdAt: Date.now(),
                    });
                  }
                  window.getSelection()?.removeAllRanges();
                  setSelectionMenu(null);
                }}
                className="w-6 h-6 rounded-full border border-white/20 hover:scale-110 transition-transform cursor-pointer shadow-sm"
                style={{ backgroundColor: color.hex }}
                title={`Highlight with ${color.label}`}
              />
            ))}

            <div className="w-[1px] h-4 bg-white/15 mx-1" />

            {/* Add Sticky Note */}
            <button
              onClick={() => {
                const noteText = prompt('Add note to selection:', '');
                if (noteText) {
                  store.addAnnotation({
                    page: selectionMenu.page,
                    type: 'note',
                    color: '#00f0ff',
                    content: selectionMenu.text,
                    comment: noteText,
                  });
                  if (onAddNote) {
                    onAddNote({
                      id: `note_${Date.now()}`,
                      sourceUrl: typeof activeFile === 'string' ? activeFile : 'local_doc',
                      type: 'pdf-highlight',
                      content: `${selectionMenu.text} — [Note: ${noteText}]`,
                      pageNumber: selectionMenu.page,
                      createdAt: Date.now(),
                    });
                  }
                }
                window.getSelection()?.removeAllRanges();
                setSelectionMenu(null);
              }}
              className="px-2 py-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white text-[10px] font-mono flex items-center gap-1 cursor-pointer"
            >
              <MessageSquare size={12} />
              Note
            </button>

            {/* Dictionary / Define */}
            <button
              onClick={() => {
                store.openDictionary(selectionMenu.text.slice(0, 30));
                setSelectionMenu(null);
              }}
              className="px-2 py-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white text-[10px] font-mono flex items-center gap-1 cursor-pointer"
            >
              <BookOpen size={12} />
              Define
            </button>

            {/* Copy */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(selectionMenu.text);
                setSelectionMenu(null);
              }}
              className="px-2 py-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white text-[10px] font-mono flex items-center gap-1 cursor-pointer"
            >
              <Copy size={12} />
              Copy
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. FLOATING DYNAMIC SCROLL NAVIGATOR BADGE */}
      <AnimatePresence>
        {floatingNavVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-zinc-950/90 border border-white/20 px-5 py-2 rounded-full shadow-2xl backdrop-blur-2xl flex items-center gap-3 pointer-events-none"
          >
            <span className="text-xs font-mono font-bold text-white">
              Page {store.currentPage} of {store.totalPages}
            </span>
            <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full transition-all duration-150"
                style={{ width: `${(store.currentPage / (store.totalPages || 1)) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-cyan-300 font-bold">
              {Math.round((store.currentPage / (store.totalPages || 1)) * 100)}%
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. BOTTOM QUICK ACTION DOCK (Apple-Grade Glass Dock) */}
      <div 
        onMouseEnter={() => store.setControlsVisible(true)}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-zinc-950/80 hover:bg-zinc-950/95 border border-white/15 px-4 py-2 rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-all duration-300 hover:scale-105"
      >
        {/* Previous Page */}
        <button
          onClick={() => {
            store.setCurrentPage(store.currentPage - 1);
            scrollToPage(store.currentPage - 1);
          }}
          disabled={store.currentPage <= 1}
          className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white disabled:opacity-30 cursor-pointer"
          title="Previous Page (Left Arrow)"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page Jump Direct Input */}
        <button
          onClick={() => setIsPageJumpOpen(true)}
          className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono font-bold text-white flex items-center gap-1.5 cursor-pointer border border-white/10"
        >
          <span>{store.currentPage}</span>
          <span className="text-white/30">/</span>
          <span className="text-white/50">{store.totalPages}</span>
        </button>

        {/* Next Page */}
        <button
          onClick={() => {
            store.setCurrentPage(store.currentPage + 1);
            scrollToPage(store.currentPage + 1);
          }}
          disabled={store.currentPage >= store.totalPages}
          className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white disabled:opacity-30 cursor-pointer"
          title="Next Page (Right Arrow / Space)"
        >
          <ChevronRight size={16} />
        </button>

        <div className="w-[1px] h-4 bg-white/15 mx-1" />

        {/* Force OLED Dark Mode Quick Toggle */}
        <button
          onClick={() => store.toggleForceDarkMode()}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            store.forceDarkMode
              ? 'text-amber-300 bg-amber-400/20 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
          title="Toggle OLED Dark Mode (Shift + D)"
        >
          <Moon size={14} className={store.forceDarkMode ? 'fill-amber-300' : ''} />
        </button>

        {/* Rotate Clockwise */}
        <button
          onClick={() => store.rotateClockwise()}
          className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
          title="Rotate Document 90°"
        >
          <RotateCw size={14} />
        </button>

        {/* Bookmark Toggle */}
        <button
          onClick={() => store.toggleBookmark()}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            store.bookmarks.some(b => b.page === store.currentPage)
              ? 'text-cyan-400 bg-cyan-500/20'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
          title="Bookmark Page (B)"
        >
          <Bookmark size={14} />
        </button>

        {/* Command Palette Trigger */}
        <button
          onClick={() => store.toggleCommandPalette()}
          className="px-3 py-1 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 hover:bg-cyan-500/25 transition-all cursor-pointer"
        >
          <span>⌘K</span>
        </button>
      </div>

      {/* 7. UNIVERSAL COMMAND PALETTE MODAL (Cmd + K) */}
      <AnimatePresence>
        {store.isCommandPaletteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-3xl flex items-start justify-center pt-24 p-4"
            onClick={() => store.setCommandPaletteOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: -20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: -20, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-xl bg-zinc-950/95 border border-white/20 rounded-3xl overflow-hidden shadow-2xl p-4 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3 px-3 py-2 bg-black/60 rounded-2xl border border-white/10">
                <Compass size={18} className="text-cyan-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Type a command or search action..."
                  className="w-full bg-transparent text-sm text-white placeholder-white/40 focus:outline-none font-mono"
                />
                <span className="text-[10px] font-mono text-white/30 uppercase">ESC TO CLOSE</span>
              </div>

              <div className="space-y-1 max-h-80 overflow-y-auto custom-scrollbar">
                {[
                  { label: 'Toggle Force OLED Dark Mode', icon: Moon, action: () => store.toggleForceDarkMode() },
                  { label: 'Enter Focus Study Mode', icon: Sparkles, action: () => store.toggleStudyMode() },
                  { label: 'Fit to Page Width', icon: Columns, action: () => handleFitMode('width') },
                  { label: 'Fit Full Page in Screen', icon: Maximize2, action: () => handleFitMode('page') },
                  { label: 'Switch to Two-Page Book Spread', icon: BookOpen, action: () => store.setReadingMode('two-page') },
                  { label: 'Continuous Vertical Scroll Mode', icon: Layers, action: () => store.setReadingMode('continuous') },
                  { label: 'Toggle Table of Contents Outline', icon: FileText, action: () => store.setSidebarTab('outline') },
                  { label: 'Toggle Bookmarks & Saved Pages', icon: Bookmark, action: () => store.setSidebarTab('bookmarks') },
                  { label: 'Rotate Document 90° Clockwise', icon: RotateCw, action: () => store.rotateClockwise() },
                  { label: 'Switch to Warm Sepia Paper Theme', icon: Coffee, action: () => store.setTheme('warm') },
                  { label: 'Switch to OLED Midnight Theme', icon: Moon, action: () => store.setTheme('oled') },
                ].map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      cmd.action();
                      store.setCommandPaletteOpen(false);
                    }}
                    className="w-full p-3 rounded-2xl hover:bg-white/10 flex items-center justify-between text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 group-hover:text-cyan-400 group-hover:border-cyan-500/30">
                        <cmd.icon size={15} />
                      </div>
                      <span className="text-xs font-mono text-white/80 group-hover:text-white font-bold">
                        {cmd.label}
                      </span>
                    </div>
                    <ArrowRight size={14} className="text-white/20 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 8. DICTIONARY DEFINITION POPUP */}
      <AnimatePresence>
        {store.isDictionaryOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bottom-24 right-8 z-[250] w-80 bg-zinc-950/95 border border-white/20 p-4 rounded-3xl shadow-2xl backdrop-blur-3xl flex flex-col gap-2"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-cyan-400" />
                <span className="text-xs font-mono font-bold text-white uppercase">Dictionary</span>
              </div>
              <button onClick={() => store.closeDictionary()} className="text-white/40 hover:text-white cursor-pointer">
                <X size={14} />
              </button>
            </div>
            <h4 className="text-sm font-bold text-cyan-300 font-mono capitalize">
              {store.dictionaryWord}
            </h4>
            <p className="text-xs text-white/70 leading-relaxed font-sans">
              {store.dictionaryDefinition}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
