import { create } from 'zustand';

export type ReadingMode = 'continuous' | 'single' | 'two-page' | 'presentation' | 'focus' | 'immersive';
export type FitMode = 'custom' | 'page' | 'width' | 'text' | 'actual';
export type ReaderTheme = 'oled' | 'paper' | 'warm' | 'dim' | 'midnight';
export type AnnotationTool = 'select' | 'highlight' | 'underline' | 'strikethrough' | 'pen' | 'marker' | 'rectangle' | 'circle' | 'arrow' | 'line' | 'text' | 'note';
export type SidebarTab = 'thumbnails' | 'outline' | 'annotations' | 'bookmarks' | 'search';
export type SplitViewMode = 'none' | 'notes' | 'compare';

export interface AnnotationItem {
  id: string;
  fileId: string;
  page: number;
  type: AnnotationTool;
  color: string;
  rects?: Array<{ x: number; y: number; width: number; height: number }>;
  points?: Array<{ x: number; y: number }>;
  strokeWidth?: number;
  content?: string;
  comment?: string;
  createdAt: number;
}

export interface BookmarkItem {
  id: string;
  page: number;
  title: string;
  createdAt: number;
}

export interface OutlineItem {
  title: string;
  pageNumber: number;
  items?: OutlineItem[];
}

export interface SearchMatch {
  page: number;
  snippet: string;
  matchIndex: number;
}

export interface RecentDoc {
  id: string;
  name: string;
  url?: string;
  lastPage: number;
  totalPages: number;
  lastReadAt: number;
  fileSize?: string;
}

interface PDFStore {
  // Document State
  file: string | File | null;
  fileName: string;
  fileId: string;
  currentPage: number;
  totalPages: number;
  zoomLevel: number;
  fitMode: FitMode;
  rotation: number; // 0, 90, 180, 270
  readingMode: ReadingMode;
  theme: ReaderTheme;
  forceDarkMode: boolean;
  studyMode: boolean;
  outline: OutlineItem[];
  
  // Split & Compare State
  splitView: SplitViewMode;
  compareFile: string | File | null;
  compareFileName: string;
  compareCurrentPage: number;
  compareTotalPages: number;
  syncScroll: boolean;

  // Navigation & History
  recentDocs: RecentDoc[];
  historyTrail: number[];

  // Annotations & Tools
  activeTool: AnnotationTool;
  activeColor: string;
  activeStrokeWidth: number;
  annotations: AnnotationItem[];
  undoStack: AnnotationItem[][];
  redoStack: AnnotationItem[][];
  bookmarks: BookmarkItem[];

  // Search
  searchQuery: string;
  searchResults: SearchMatch[];
  currentMatchIndex: number;
  isSearchCaseSensitive: boolean;
  isSearchWholeWord: boolean;

  // UI Panels & States
  isSidebarOpen: boolean;
  sidebarTab: SidebarTab;
  isCommandPaletteOpen: boolean;
  isSearchOpen: boolean;
  isControlsVisible: boolean;
  isDictionaryOpen: boolean;
  dictionaryWord: string;
  dictionaryDefinition: string;

  // Actions
  setDocument: (file: string | File | null, fileName?: string) => void;
  setCurrentPage: (page: number) => void;
  setTotalPages: (total: number) => void;
  setZoomLevel: (zoom: number) => void;
  setFitMode: (mode: FitMode) => void;
  setRotation: (rotation: number | ((prev: number) => number)) => void;
  rotateClockwise: () => void;
  setReadingMode: (mode: ReadingMode) => void;
  setTheme: (theme: ReaderTheme) => void;
  toggleForceDarkMode: () => void;
  setForceDarkMode: (val: boolean) => void;
  toggleStudyMode: () => void;
  setOutline: (outline: OutlineItem[]) => void;
  
  // Split View Actions
  setSplitView: (mode: SplitViewMode) => void;
  setCompareDocument: (file: string | File | null, fileName?: string) => void;
  setCompareCurrentPage: (page: number) => void;
  setCompareTotalPages: (total: number) => void;
  setSyncScroll: (sync: boolean) => void;

  // Annotation Actions
  setActiveTool: (tool: AnnotationTool) => void;
  setActiveColor: (color: string) => void;
  setActiveStrokeWidth: (width: number) => void;
  addAnnotation: (annotation: Omit<AnnotationItem, 'id' | 'createdAt' | 'fileId'>) => void;
  deleteAnnotation: (id: string) => void;
  undo: () => void;
  redo: () => void;
  
  // Bookmark Actions
  toggleBookmark: (page?: number, title?: string) => void;
  removeBookmark: (id: string) => void;

  // Search Actions
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SearchMatch[]) => void;
  setCurrentMatchIndex: (index: number) => void;
  nextMatch: () => void;
  prevMatch: () => void;
  toggleSearchCaseSensitive: () => void;
  toggleSearchWholeWord: () => void;

  // UI Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setSearchOpen: (open: boolean) => void;
  toggleSearch: () => void;
  setControlsVisible: (visible: boolean) => void;
  openDictionary: (word: string, definition?: string) => void;
  closeDictionary: () => void;
  addRecentDoc: (doc: RecentDoc) => void;
  loadSavedState: (fileId: string) => void;
}

export const HIGHLIGHT_COLORS = [
  { label: 'Amber Gold', hex: '#fbbf24', bg: 'rgba(251, 191, 36, 0.35)' },
  { label: 'Cyan Spark', hex: '#00f0ff', bg: 'rgba(0, 240, 255, 0.35)' },
  { label: 'Emerald Mint', hex: '#34d399', bg: 'rgba(52, 211, 153, 0.35)' },
  { label: 'Neon Rose', hex: '#f43f5e', bg: 'rgba(244, 63, 94, 0.35)' },
  { label: 'Violet Air', hex: '#a855f7', bg: 'rgba(168, 85, 247, 0.35)' },
];

function generateFileId(file: string | File | null, fileName: string): string {
  if (typeof file === 'string') {
    return `url_${encodeURIComponent(file.slice(-40))}`;
  }
  if (file instanceof File) {
    return `file_${file.name}_${file.size}_${file.lastModified}`;
  }
  return `doc_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

export const usePDFStore = create<PDFStore>((set, get) => ({
  // Document State
  file: null,
  fileName: 'document.pdf',
  fileId: 'default_doc',
  currentPage: 1,
  totalPages: 1,
  zoomLevel: 1.0,
  fitMode: 'custom',
  rotation: 0,
  readingMode: 'continuous',
  theme: 'oled',
  forceDarkMode: true,
  studyMode: false,
  outline: [],

  // Split State
  splitView: 'none',
  compareFile: null,
  compareFileName: 'compare.pdf',
  compareCurrentPage: 1,
  compareTotalPages: 1,
  syncScroll: true,

  // History & Recent
  recentDocs: [],
  historyTrail: [1],

  // Annotations
  activeTool: 'select',
  activeColor: '#fbbf24',
  activeStrokeWidth: 2,
  annotations: [],
  undoStack: [],
  redoStack: [],
  bookmarks: [],

  // Search
  searchQuery: '',
  searchResults: [],
  currentMatchIndex: 0,
  isSearchCaseSensitive: false,
  isSearchWholeWord: false,

  // UI States
  isSidebarOpen: false,
  sidebarTab: 'thumbnails',
  isCommandPaletteOpen: false,
  isSearchOpen: false,
  isControlsVisible: true,
  isDictionaryOpen: false,
  dictionaryWord: '',
  dictionaryDefinition: '',

  setDocument: (file, customName) => {
    let name = customName || 'document.pdf';
    if (!customName) {
      if (file instanceof File) {
        name = file.name;
      } else if (typeof file === 'string') {
        try {
          name = decodeURIComponent(new URL(file).pathname.split('/').pop() || 'document.pdf');
        } catch {
          name = file.split('/').pop() || 'document.pdf';
        }
      }
    }

    const fileId = generateFileId(file, name);

    set({
      file,
      fileName: name,
      fileId,
      currentPage: 1,
      totalPages: 1,
      rotation: 0,
      historyTrail: [1],
      searchResults: [],
      searchQuery: '',
      currentMatchIndex: 0,
      undoStack: [],
      redoStack: [],
    });

    // Try restoring saved progress
    get().loadSavedState(fileId);

    // Save to recents
    get().addRecentDoc({
      id: fileId,
      name,
      url: typeof file === 'string' ? file : undefined,
      lastPage: 1,
      totalPages: 1,
      lastReadAt: Date.now(),
      fileSize: file instanceof File ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : undefined,
    });
  },

  setCurrentPage: (page) => {
    const { totalPages, currentPage, historyTrail, fileId, zoomLevel, theme, readingMode, forceDarkMode } = get();
    const clamped = Math.max(1, Math.min(page, Math.max(1, totalPages)));
    if (clamped === currentPage) return;

    const newTrail = [clamped, ...historyTrail.filter(p => p !== clamped)].slice(0, 15);

    set({ currentPage: clamped, historyTrail: newTrail });

    // Persist position
    if (typeof window !== 'undefined' && fileId) {
      try {
        const saved = JSON.parse(localStorage.getItem(`focusforge_pdf_${fileId}`) || '{}');
        saved.currentPage = clamped;
        saved.zoomLevel = zoomLevel;
        saved.theme = theme;
        saved.readingMode = readingMode;
        saved.forceDarkMode = forceDarkMode;
        saved.lastUpdated = Date.now();
        localStorage.setItem(`focusforge_pdf_${fileId}`, JSON.stringify(saved));
      } catch (e) {
        console.error('Failed to save PDF position:', e);
      }
    }
  },

  setTotalPages: (total) => {
    const safeTotal = Math.max(1, total);
    set({ totalPages: safeTotal });
  },

  setZoomLevel: (zoom) => {
    const clamped = Math.max(0.4, Math.min(3.5, Math.round(zoom * 100) / 100));
    set({ zoomLevel: clamped, fitMode: 'custom' });
  },

  setFitMode: (mode) => {
    set({ fitMode: mode });
  },

  setRotation: (rotation) => {
    if (typeof rotation === 'function') {
      set(prev => ({ rotation: (rotation(prev.rotation) % 360 + 360) % 360 }));
    } else {
      set({ rotation: (rotation % 360 + 360) % 360 });
    }
  },

  rotateClockwise: () => {
    set(prev => ({ rotation: (prev.rotation + 90) % 360 }));
  },

  setReadingMode: (readingMode) => {
    set({ readingMode });
  },

  setTheme: (theme) => {
    set({ theme });
  },

  toggleForceDarkMode: () => {
    set(prev => {
      const next = !prev.forceDarkMode;
      if (typeof window !== 'undefined' && prev.fileId) {
        try {
          const saved = JSON.parse(localStorage.getItem(`focusforge_pdf_${prev.fileId}`) || '{}');
          saved.forceDarkMode = next;
          localStorage.setItem(`focusforge_pdf_${prev.fileId}`, JSON.stringify(saved));
        } catch {}
      }
      return { forceDarkMode: next };
    });
  },

  setForceDarkMode: (forceDarkMode) => {
    set({ forceDarkMode });
  },

  toggleStudyMode: () => {
    set(prev => ({ studyMode: !prev.studyMode, isSidebarOpen: !prev.studyMode ? true : prev.isSidebarOpen, sidebarTab: !prev.studyMode ? 'annotations' : prev.sidebarTab }));
  },

  setOutline: (outline) => {
    set({ outline });
  },

  setSplitView: (splitView) => {
    set({ splitView });
  },

  setCompareDocument: (file, customName) => {
    let name = customName || 'compare.pdf';
    if (!customName && file instanceof File) name = file.name;
    set({ compareFile: file, compareFileName: name, compareCurrentPage: 1 });
  },

  setCompareCurrentPage: (page) => {
    set({ compareCurrentPage: Math.max(1, Math.min(page, get().compareTotalPages || 1)) });
  },

  setCompareTotalPages: (total) => {
    set({ compareTotalPages: Math.max(1, total) });
  },

  setSyncScroll: (syncScroll) => {
    set({ syncScroll });
  },

  setActiveTool: (activeTool) => {
    set({ activeTool });
  },

  setActiveColor: (activeColor) => {
    set({ activeColor });
  },

  setActiveStrokeWidth: (activeStrokeWidth) => {
    set({ activeStrokeWidth });
  },

  addAnnotation: (item) => {
    const { annotations, undoStack, fileId } = get();
    const newAnnotation: AnnotationItem = {
      ...item,
      id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      fileId,
      createdAt: Date.now(),
    };

    const nextAnnotations = [...annotations, newAnnotation];
    set({
      annotations: nextAnnotations,
      undoStack: [...undoStack, annotations],
      redoStack: [],
    });

    // Persist
    if (typeof window !== 'undefined' && fileId) {
      try {
        const saved = JSON.parse(localStorage.getItem(`focusforge_pdf_${fileId}`) || '{}');
        saved.annotations = nextAnnotations;
        localStorage.setItem(`focusforge_pdf_${fileId}`, JSON.stringify(saved));
      } catch (e) {
        console.error('Failed to save annotations:', e);
      }
    }
  },

  deleteAnnotation: (id) => {
    const { annotations, undoStack, fileId } = get();
    const nextAnnotations = annotations.filter(a => a.id !== id);
    set({
      annotations: nextAnnotations,
      undoStack: [...undoStack, annotations],
      redoStack: [],
    });

    if (typeof window !== 'undefined' && fileId) {
      try {
        const saved = JSON.parse(localStorage.getItem(`focusforge_pdf_${fileId}`) || '{}');
        saved.annotations = nextAnnotations;
        localStorage.setItem(`focusforge_pdf_${fileId}`, JSON.stringify(saved));
      } catch (e) {
        console.error('Failed to save annotations:', e);
      }
    }
  },

  undo: () => {
    const { undoStack, redoStack, annotations, fileId } = get();
    if (undoStack.length === 0) return;

    const previous = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    set({
      annotations: previous,
      undoStack: newUndoStack,
      redoStack: [...redoStack, annotations],
    });

    if (typeof window !== 'undefined' && fileId) {
      try {
        const saved = JSON.parse(localStorage.getItem(`focusforge_pdf_${fileId}`) || '{}');
        saved.annotations = previous;
        localStorage.setItem(`focusforge_pdf_${fileId}`, JSON.stringify(saved));
      } catch (e) {
        console.error('Failed to persist undo:', e);
      }
    }
  },

  redo: () => {
    const { undoStack, redoStack, annotations, fileId } = get();
    if (redoStack.length === 0) return;

    const next = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    set({
      annotations: next,
      undoStack: [...undoStack, annotations],
      redoStack: newRedoStack,
    });

    if (typeof window !== 'undefined' && fileId) {
      try {
        const saved = JSON.parse(localStorage.getItem(`focusforge_pdf_${fileId}`) || '{}');
        saved.annotations = next;
        localStorage.setItem(`focusforge_pdf_${fileId}`, JSON.stringify(saved));
      } catch (e) {
        console.error('Failed to persist redo:', e);
      }
    }
  },

  toggleBookmark: (page, customTitle) => {
    const { currentPage, bookmarks, fileId } = get();
    const targetPage = page || currentPage;
    const existing = bookmarks.find(b => b.page === targetPage);

    let nextBookmarks: BookmarkItem[];
    if (existing) {
      nextBookmarks = bookmarks.filter(b => b.id !== existing.id);
    } else {
      nextBookmarks = [
        ...bookmarks,
        {
          id: `bm_${Date.now()}_${targetPage}`,
          page: targetPage,
          title: customTitle || `Page ${targetPage} Bookmark`,
          createdAt: Date.now(),
        },
      ];
    }

    set({ bookmarks: nextBookmarks });

    if (typeof window !== 'undefined' && fileId) {
      try {
        const saved = JSON.parse(localStorage.getItem(`focusforge_pdf_${fileId}`) || '{}');
        saved.bookmarks = nextBookmarks;
        localStorage.setItem(`focusforge_pdf_${fileId}`, JSON.stringify(saved));
      } catch (e) {
        console.error('Failed to save bookmarks:', e);
      }
    }
  },

  removeBookmark: (id) => {
    const { bookmarks, fileId } = get();
    const nextBookmarks = bookmarks.filter(b => b.id !== id);
    set({ bookmarks: nextBookmarks });

    if (typeof window !== 'undefined' && fileId) {
      try {
        const saved = JSON.parse(localStorage.getItem(`focusforge_pdf_${fileId}`) || '{}');
        saved.bookmarks = nextBookmarks;
        localStorage.setItem(`focusforge_pdf_${fileId}`, JSON.stringify(saved));
      } catch (e) {
        console.error('Failed to save bookmarks:', e);
      }
    }
  },

  setSearchQuery: (searchQuery) => {
    set({ searchQuery });
  },

  setSearchResults: (searchResults) => {
    set({ searchResults, currentMatchIndex: 0 });
  },

  setCurrentMatchIndex: (currentMatchIndex) => {
    set({ currentMatchIndex });
  },

  nextMatch: () => {
    const { searchResults, currentMatchIndex } = get();
    if (searchResults.length === 0) return;
    const next = (currentMatchIndex + 1) % searchResults.length;
    set({ currentMatchIndex: next });
    get().setCurrentPage(searchResults[next].page);
  },

  prevMatch: () => {
    const { searchResults, currentMatchIndex } = get();
    if (searchResults.length === 0) return;
    const prev = (currentMatchIndex - 1 + searchResults.length) % searchResults.length;
    set({ currentMatchIndex: prev });
    get().setCurrentPage(searchResults[prev].page);
  },

  toggleSearchCaseSensitive: () => {
    set(prev => ({ isSearchCaseSensitive: !prev.isSearchCaseSensitive }));
  },

  toggleSearchWholeWord: () => {
    set(prev => ({ isSearchWholeWord: !prev.isSearchWholeWord }));
  },

  setSidebarOpen: (isSidebarOpen) => {
    set({ isSidebarOpen });
  },

  toggleSidebar: () => {
    set(prev => ({ isSidebarOpen: !prev.isSidebarOpen }));
  },

  setSidebarTab: (sidebarTab) => {
    set({ sidebarTab, isSidebarOpen: true });
  },

  setCommandPaletteOpen: (isCommandPaletteOpen) => {
    set({ isCommandPaletteOpen });
  },

  toggleCommandPalette: () => {
    set(prev => ({ isCommandPaletteOpen: !prev.isCommandPaletteOpen }));
  },

  setSearchOpen: (isSearchOpen) => {
    set({ isSearchOpen });
  },

  toggleSearch: () => {
    set(prev => ({ isSearchOpen: !prev.isSearchOpen }));
  },

  setControlsVisible: (isControlsVisible) => {
    set({ isControlsVisible });
  },

  openDictionary: (word, definition) => {
    set({
      isDictionaryOpen: true,
      dictionaryWord: word,
      dictionaryDefinition: definition || `"${word}" — Core conceptual terminology in academic and research literature.`,
    });
  },

  closeDictionary: () => {
    set({ isDictionaryOpen: false });
  },

  addRecentDoc: (doc) => {
    const { recentDocs } = get();
    const filtered = recentDocs.filter(d => d.id !== doc.id);
    const updated = [doc, ...filtered].slice(0, 10);
    set({ recentDocs: updated });

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('focusforge_recent_pdfs', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save recents:', e);
      }
    }
  },

  loadSavedState: (fileId) => {
    if (typeof window === 'undefined') return;
    try {
      // Load recents
      const recents = JSON.parse(localStorage.getItem('focusforge_recent_pdfs') || '[]');
      if (Array.isArray(recents)) {
        set({ recentDocs: recents });
      }

      // Load document-specific settings
      const saved = JSON.parse(localStorage.getItem(`focusforge_pdf_${fileId}`) || '{}');
      if (saved) {
        if (saved.currentPage) set({ currentPage: saved.currentPage });
        if (saved.zoomLevel) set({ zoomLevel: saved.zoomLevel });
        if (saved.theme) set({ theme: saved.theme });
        if (saved.readingMode) set({ readingMode: saved.readingMode });
        if (Array.isArray(saved.annotations)) set({ annotations: saved.annotations });
        if (Array.isArray(saved.bookmarks)) set({ bookmarks: saved.bookmarks });
      }
    } catch (e) {
      console.error('Failed to load saved PDF state:', e);
    }
  },
}));
