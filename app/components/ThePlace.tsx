import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, X, Monitor, ChevronLeft, Zap, Target, Plus, Trash2, Clock, 
  List, Video, Search, ChevronRight, Info, Music, FolderPlus, 
  Shuffle, Repeat, Sparkles, Edit3, Check, Disc, Volume2, Youtube,
  RefreshCw, ExternalLink, AlertCircle
} from 'lucide-react';
import { CustomYouTubePlayer, YouTubePlayerRef } from './CustomYouTubePlayer';
import TheFrequency from './TheFrequency/TheFrequency';
import { searchYouTube, YouTubeSearchResult } from '../../lib/youtubeSearch';

export interface LibraryItem {
  id: string;
  type: 'video' | 'playlist';
  title: string;
  thumbnail: string;
  addedAt: number;
  lastPlayedAt?: number;
  progress?: number;
  duration?: number;
  playlistId?: string;
  channelTitle?: string;
}

export interface CustomPlaylist {
  id: string;
  name: string;
  desc?: string;
  category: 'Ambient' | 'Music' | 'Lecture' | 'Binaural' | 'Custom';
  items: LibraryItem[];
  coverThumbnail?: string;
  createdAt: number;
}

const DEFAULT_CURATED_PLAYLISTS: CustomPlaylist[] = [
  {
    id: 'curated-cyberpunk',
    name: 'Neo-Tokyo Cyberpunk Ambient',
    desc: 'Deep synthesized nocturnal soundscapes with zero cognitive load.',
    category: 'Ambient',
    createdAt: Date.now() - 86400000 * 3,
    coverThumbnail: 'https://img.youtube.com/vi/TIqsKXQHvFI/maxresdefault.jpg',
    items: [
      { id: 'TIqsKXQHvFI', type: 'video', title: 'High Stakes Ambient Drive', thumbnail: 'https://img.youtube.com/vi/TIqsKXQHvFI/maxresdefault.jpg', addedAt: Date.now() },
      { id: 'Ui7Hb4cvamY', type: 'video', title: 'Solving the Unsolvable (Focus Core)', thumbnail: 'https://img.youtube.com/vi/Ui7Hb4cvamY/maxresdefault.jpg', addedAt: Date.now() },
      { id: 'df4p7bP_MaY', type: 'video', title: 'Discipline Over Motivation', thumbnail: 'https://img.youtube.com/vi/df4p7bP_MaY/maxresdefault.jpg', addedAt: Date.now() },
    ]
  },
  {
    id: 'curated-binaural',
    name: 'Alpha & Gamma Wave Siphon',
    desc: '40Hz Gamma and 10Hz Alpha frequencies tuned for elite flow state retention.',
    category: 'Binaural',
    createdAt: Date.now() - 86400000 * 2,
    coverThumbnail: 'https://img.youtube.com/vi/8ObcKYvrCpY/maxresdefault.jpg',
    items: [
      { id: '8ObcKYvrCpY', type: 'video', title: 'Symbol of Focus & Execution', thumbnail: 'https://img.youtube.com/vi/8ObcKYvrCpY/maxresdefault.jpg', addedAt: Date.now() },
      { id: 'on40ISrPmIk', type: 'video', title: 'Pressure Makes Diamonds', thumbnail: 'https://img.youtube.com/vi/on40ISrPmIk/maxresdefault.jpg', addedAt: Date.now() },
    ]
  },
  {
    id: 'curated-lofi',
    name: 'Lofi Study Vault',
    desc: 'Warm analog beats and rain textures for extended study marathons.',
    category: 'Music',
    createdAt: Date.now() - 86400000,
    coverThumbnail: 'https://img.youtube.com/vi/NrMjwLKhGg4/maxresdefault.jpg',
    items: [
      { id: 'NrMjwLKhGg4', type: 'video', title: 'Winning in Silence', thumbnail: 'https://img.youtube.com/vi/NrMjwLKhGg4/maxresdefault.jpg', addedAt: Date.now() },
      { id: 'jfKfPfyJRdk', type: 'video', title: 'Lofi Girl - Beats to Relax/Study to', thumbnail: 'https://img.youtube.com/vi/jfKfPfyJRdk/maxresdefault.jpg', addedAt: Date.now() },
    ]
  }
];

const parseYouTubeUrl = (url: string) => {
  const videoRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const playlistRegExp = /[&?]list=([^#&?]*)/;
  
  const videoMatch = url.match(videoRegExp);
  const playlistMatch = url.match(playlistRegExp);
  
  const videoId = (videoMatch && videoMatch[2].length === 11) ? videoMatch[2] : null;
  const playlistId = playlistMatch ? playlistMatch[1] : null;
  
  return { videoId, playlistId };
};

export default function ThePlace() {
  const [viewState, setViewState] = useState<'browse' | 'player' | 'frequency'>('browse');
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [customPlaylists, setCustomPlaylists] = useState<CustomPlaylist[]>([]);
  const [activeItem, setActiveItem] = useState<LibraryItem | null>(null);
  const [activePlaylist, setActivePlaylist] = useState<CustomPlaylist | null>(null);
  const [activePlaylistTrackIdx, setActivePlaylistTrackIdx] = useState<number>(0);
  const [videoUrl, setVideoUrl] = useState('');
  const [isVoidShift, setIsVoidShift] = useState(false);
  const [isAmbientActive, setIsAmbientActive] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Playlists' | 'Streams' | 'Curated' | 'YouTube'>('All');
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Live YouTube Search State
  const [ytSearchResults, setYtSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [isSearchingYt, setIsSearchingYt] = useState(false);
  const [ytSearchError, setYtSearchError] = useState<string | null>(null);
  const [hasSearchedYt, setHasSearchedYt] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Custom Playlist Modal State
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [newPlaylistCategory, setNewPlaylistCategory] = useState<'Ambient' | 'Music' | 'Lecture' | 'Binaural' | 'Custom'>('Custom');
  const [newPlaylistInitialUrl, setNewPlaylistInitialUrl] = useState('');

  // Add Item to Playlist Modal
  const [targetPlaylistId, setTargetPlaylistId] = useState<string | null>(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [itemToAddUrl, setItemToAddUrl] = useState('');
  const [itemToAddTitle, setItemToAddTitle] = useState('');

  const playerRef = useRef<YouTubePlayerRef>(null);

  // Persistence
  useEffect(() => {
    const savedLib = localStorage.getItem('focusforge-theplace-library');
    const savedPlaylists = localStorage.getItem('focusforge-theplace-playlists');

    if (savedLib) {
      try { setLibrary(JSON.parse(savedLib)); } catch (e) {}
    } else {
      const initialItems: LibraryItem[] = DEFAULT_CURATED_PLAYLISTS.flatMap(p => p.items);
      setLibrary(initialItems);
      localStorage.setItem('focusforge-theplace-library', JSON.stringify(initialItems));
    }

    if (savedPlaylists) {
      try { setCustomPlaylists(JSON.parse(savedPlaylists)); } catch (e) {}
    } else {
      setCustomPlaylists(DEFAULT_CURATED_PLAYLISTS);
      localStorage.setItem('focusforge-theplace-playlists', JSON.stringify(DEFAULT_CURATED_PLAYLISTS));
    }
  }, []);

  const saveLibrary = (newLib: LibraryItem[]) => {
    setLibrary(newLib);
    localStorage.setItem('focusforge-theplace-library', JSON.stringify(newLib));
  };

  const savePlaylists = (newPlaylists: CustomPlaylist[]) => {
    setCustomPlaylists(newPlaylists);
    localStorage.setItem('focusforge-theplace-playlists', JSON.stringify(newPlaylists));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isVoidShift) {
          setIsVoidShift(false);
        } else if (viewState === 'player') {
          exitPlayer();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVoidShift, viewState]);

  const handleMouseMove = () => {
    if (viewState !== 'player') return;
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (!isVoidShift) setShowControls(false);
    }, 3500);
  };

  // External event listener for start-theatre (Jarvis, Everything Island, Hub)
  useEffect(() => {
    const handleStartTheatre = (e: any) => {
      const detail = e?.detail;
      if (!detail) return;
      const url = detail.url || '';
      const { videoId, playlistId } = parseYouTubeUrl(url);
      const finalId = detail.videoId || videoId || playlistId;
      if (finalId) {
        const item: LibraryItem = {
          id: finalId,
          type: playlistId ? 'playlist' : 'video',
          title: detail.title || detail.query || 'Atmosphere Stream',
          thumbnail: detail.thumbnail || `https://img.youtube.com/vi/${finalId}/maxresdefault.jpg`,
          addedAt: Date.now()
        };
        setActiveItem(item);
        setActivePlaylist(null);
        setViewState('player');
      }
    };

    window.addEventListener('start-theatre' as any, handleStartTheatre);
    return () => window.removeEventListener('start-theatre' as any, handleStartTheatre);
  }, []);

  const handleSearchOrAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = videoUrl.trim();
    if (!query) return;

    const { videoId, playlistId } = parseYouTubeUrl(query);
    if (videoId || playlistId) {
      await addToLibrary(e || { preventDefault: () => {} } as any);
      return;
    }

    setIsSearchingYt(true);
    setYtSearchError(null);
    setHasSearchedYt(true);
    setActiveFilter('YouTube');

    try {
      const resp = await searchYouTube(query, 16);
      if (resp.error) {
        setYtSearchError(resp.error);
        setYtSearchResults([]);
      } else {
        setYtSearchResults(resp.results || []);
      }
    } catch (err: any) {
      setYtSearchError(err?.message || 'Failed to search YouTube');
    } finally {
      setIsSearchingYt(false);
    }
  };

  const addYouTubeResultToLibrary = (result: YouTubeSearchResult) => {
    const newItem: LibraryItem = {
      id: result.id,
      type: 'video',
      title: result.title,
      thumbnail: result.thumbnail,
      addedAt: Date.now(),
      channelTitle: result.channelTitle
    };
    if (!library.find(item => item.id === result.id)) {
      saveLibrary([newItem, ...library]);
    }
    setAddedIds(prev => new Set(prev).add(result.id));
  };

  const clearYouTubeSearch = () => {
    setVideoUrl('');
    setHasSearchedYt(false);
    setYtSearchResults([]);
    setYtSearchError(null);
    setActiveFilter('All');
  };

  const addToLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    const { videoId, playlistId } = parseYouTubeUrl(videoUrl);
    if (!videoId && !playlistId) return;

    setIsAdding(true);
    const id = playlistId || videoId!;
    const type = playlistId ? 'playlist' : 'video';
    
    try {
      const targetUrl = type === 'playlist' 
        ? `https://www.youtube.com/playlist?list=${id}`
        : `https://www.youtube.com/watch?v=${id}`;
        
      let title = type === 'playlist' ? 'Custom YouTube Playlist' : 'High-Stakes Atmosphere';
      let thumbnail = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;

      try {
        const oembed = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`).then(r => r.json());
        if (oembed.title) title = oembed.title;
        if (oembed.thumbnail_url) thumbnail = oembed.thumbnail_url;
      } catch (e) {}
      
      const newItem: LibraryItem = {
        id,
        type,
        title,
        thumbnail,
        addedAt: Date.now()
      };
      
      if (!library.find(item => item.id === id)) {
        saveLibrary([newItem, ...library]);
      }
      setVideoUrl('');
    } catch (err) {
      console.error("Failed to add to library", err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    const playlistId = 'pl-' + Date.now().toString(36);
    let items: LibraryItem[] = [];
    let cover = 'https://img.youtube.com/vi/TIqsKXQHvFI/maxresdefault.jpg';

    if (newPlaylistInitialUrl.trim()) {
      const { videoId, playlistId: ytPlaylistId } = parseYouTubeUrl(newPlaylistInitialUrl);
      const id = ytPlaylistId || videoId;
      if (id) {
        cover = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
        items.push({
          id,
          type: ytPlaylistId ? 'playlist' : 'video',
          title: newPlaylistName + ' - Track 1',
          thumbnail: cover,
          addedAt: Date.now(),
        });
      }
    }

    const newPlaylist: CustomPlaylist = {
      id: playlistId,
      name: newPlaylistName.trim(),
      desc: newPlaylistDesc.trim() || 'Curated custom focus atmosphere.',
      category: newPlaylistCategory,
      items,
      coverThumbnail: cover,
      createdAt: Date.now(),
    };

    savePlaylists([newPlaylist, ...customPlaylists]);
    setNewPlaylistName('');
    setNewPlaylistDesc('');
    setNewPlaylistInitialUrl('');
    setShowNewPlaylistModal(false);
  };

  const handleAddItemToPlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPlaylistId || !itemToAddUrl.trim()) return;

    const { videoId, playlistId: ytPlaylistId } = parseYouTubeUrl(itemToAddUrl);
    const id = ytPlaylistId || videoId;
    if (!id) return;

    const thumbnail = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
    const newItem: LibraryItem = {
      id,
      type: ytPlaylistId ? 'playlist' : 'video',
      title: itemToAddTitle.trim() || (ytPlaylistId ? 'Custom Playlist' : 'Atmosphere Stream'),
      thumbnail,
      addedAt: Date.now(),
      playlistId: targetPlaylistId,
    };

    const updated = customPlaylists.map(pl => {
      if (pl.id === targetPlaylistId) {
        return {
          ...pl,
          items: [...pl.items, newItem],
          coverThumbnail: pl.coverThumbnail || thumbnail,
        };
      }
      return pl;
    });

    savePlaylists(updated);
    setItemToAddUrl('');
    setItemToAddTitle('');
    setShowAddItemModal(false);
  };

  const deletePlaylist = (playlistId: string) => {
    savePlaylists(customPlaylists.filter(pl => pl.id !== playlistId));
  };

  const deleteFromLibrary = (id: string) => {
    saveLibrary(library.filter(item => item.id !== id));
  };

  const playItem = (item: LibraryItem) => {
    setActiveItem(item);
    setActivePlaylist(null);
    setViewState('player');
    const updated = library.map(i => i.id === item.id ? { ...i, lastPlayedAt: Date.now() } : i);
    saveLibrary(updated);
  };

  const playCustomPlaylist = (playlist: CustomPlaylist, startIndex: number = 0) => {
    if (!playlist.items || playlist.items.length === 0) return;
    setActivePlaylist(playlist);
    setActivePlaylistTrackIdx(startIndex);
    setActiveItem(playlist.items[startIndex]);
    setViewState('player');
  };

  const nextTrack = () => {
    if (!activePlaylist || !activePlaylist.items.length) return;
    const nextIdx = (activePlaylistTrackIdx + 1) % activePlaylist.items.length;
    setActivePlaylistTrackIdx(nextIdx);
    setActiveItem(activePlaylist.items[nextIdx]);
  };

  const prevTrack = () => {
    if (!activePlaylist || !activePlaylist.items.length) return;
    const prevIdx = (activePlaylistTrackIdx - 1 + activePlaylist.items.length) % activePlaylist.items.length;
    setActivePlaylistTrackIdx(prevIdx);
    setActiveItem(activePlaylist.items[prevIdx]);
  };

  const updateProgress = (time: number, duration: number) => {
    if (!activeItem) return;
    setLibrary(prev => prev.map(item => 
      item.id === activeItem.id ? { ...item, progress: time, duration } : item
    ));
  };

  const exitPlayer = () => {
    setViewState('browse');
    setActiveItem(null);
    setActivePlaylist(null);
    setIsVoidShift(false);
  };

  const featured = library[0] || (customPlaylists[0]?.items[0]) || null;

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto no-scrollbar selection:bg-white/20 text-[#E0E0E0]">
      {/* The Frequency full-screen overlay */}
      {viewState === 'frequency' && <TheFrequency onBack={() => setViewState('browse')} />}

      <AnimatePresence mode="wait">
        {viewState === 'frequency' ? null : viewState === 'browse' ? (
          <motion.div 
            key="browse"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col pb-32 pt-24 sm:pt-28"
          >
            {/* Ultra-Luxury Navigation Header */}
            <header className="fixed top-3 sm:top-4 w-[calc(100%-24px)] sm:w-[calc(100%-32px)] md:w-[calc(100%-48px)] left-3 sm:left-4 md:left-6 right-3 sm:right-4 md:right-6 z-[100] px-4 sm:px-6 md:px-7 py-2.5 sm:py-3 flex flex-wrap xl:flex-nowrap items-center justify-between gap-3 md:gap-4 bg-zinc-950/80 backdrop-blur-3xl border border-white/10 rounded-2xl md:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.15)] relative overflow-hidden group">
              {/* Ambient Specular Highlight */}
              <div className="absolute inset-x-12 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 via-purple-400/30 to-transparent pointer-events-none" />

              {/* Left Brand & Subnav Filter */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-6 md:gap-8">
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/15 flex items-center justify-center text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] shrink-0 relative overflow-hidden group/badge">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_14px_#22d3ee] animate-pulse" />
                    <div className="absolute inset-0 bg-cyan-400/10 opacity-0 group-hover/badge:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-heading font-black text-sm sm:text-base tracking-wider uppercase text-white leading-none">The Place</span>
                    <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-white/40 leading-none mt-1">Immersive Cinema</span>
                  </div>
                </div>

                {/* Subnav Filter Tabs */}
                <nav className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.08] shadow-inner overflow-x-auto no-scrollbar">
                  {(['All', 'Playlists', 'Streams', 'Curated', 'YouTube'] as const).map(nav => (
                    <button 
                      key={nav} 
                      onClick={() => setActiveFilter(nav)}
                      className={`text-[9px] sm:text-[10px] font-mono uppercase tracking-[0.2em] transition-all px-3 py-1.5 rounded-lg whitespace-nowrap min-h-[30px] cursor-pointer flex items-center gap-1.5 ${
                        activeFilter === nav 
                          ? (nav === 'YouTube' 
                              ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white font-extrabold shadow-[0_0_18px_rgba(239,68,68,0.6)]' 
                              : 'bg-white text-black font-extrabold shadow-[0_2px_10px_rgba(255,255,255,0.3)]') 
                          : 'text-white/45 hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      {nav === 'YouTube' && <Youtube size={12} className={activeFilter === nav ? "text-white" : "text-red-400"} />}
                      <span>{nav}</span>
                      {nav === 'YouTube' && ytSearchResults.length > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-bold ${activeFilter === 'YouTube' ? 'bg-black/40 text-white' : 'bg-red-500/20 text-red-300'}`}>
                          {ytSearchResults.length}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Right Action Buttons & YouTube Search */}
              <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-1 xl:flex-none">
                <button
                  onClick={() => setShowNewPlaylistModal(true)}
                  className="flex items-center justify-center gap-2 px-3.5 py-2 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-cyan-400/40 rounded-xl text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 shadow-sm hover:shadow-[0_0_16px_rgba(34,211,238,0.2)] hover:scale-[1.02] active:scale-[0.98] min-h-[36px] cursor-pointer shrink-0"
                >
                  <FolderPlus size={13} className="text-cyan-400" />
                  <span className="hidden sm:inline">New</span>
                  <span>Playlist</span>
                </button>

                <button
                  onClick={() => setViewState('frequency')}
                  className="flex items-center justify-center gap-2 px-3.5 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 hover:border-purple-400/60 rounded-xl text-purple-200 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 shadow-sm hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:scale-[1.02] active:scale-[0.98] min-h-[36px] cursor-pointer shrink-0"
                >
                  <Music size={13} className="text-purple-400" />
                  <span className="hidden sm:inline">The</span>
                  <span>Frequency</span>
                </button>

                <form onSubmit={handleSearchOrAdd} className="relative group flex-1 sm:flex-none flex items-center min-w-[180px]">
                  <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-red-400 transition-colors pointer-events-none" />
                  <input 
                    type="text"
                    placeholder="Search YouTube or paste URL..."
                    value={videoUrl}
                    onChange={e => setVideoUrl(e.target.value)}
                    className="bg-black/40 hover:bg-black/60 focus:bg-black/85 border border-white/10 hover:border-white/20 focus:border-red-500/60 focus:shadow-[0_0_20px_rgba(239,68,68,0.3)] rounded-xl py-2 pl-9 pr-9 text-xs w-full sm:w-[220px] md:w-[260px] lg:w-[300px] focus:sm:w-[280px] focus:md:w-[340px] focus:outline-none transition-all placeholder:text-white/25 font-mono text-white min-h-[36px]"
                  />
                  {videoUrl && !isSearchingYt && (
                    <button
                      type="button"
                      onClick={clearYouTubeSearch}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                  {isSearchingYt && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 animate-spin pointer-events-none">
                      <RefreshCw size={12} />
                    </div>
                  )}
                </form>
              </div>
            </header>

            {/* Featured Billboard */}
            {featured && (
              <div className="relative w-full h-[50vh] sm:h-[65vh] min-h-[340px] sm:min-h-[480px] overflow-hidden">
                <div className="absolute inset-0">
                  <img 
                    src={featured.thumbnail} 
                    className="w-full h-full object-cover brightness-[0.35] scale-105 transition-transform duration-1000"
                    alt={featured.title}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
                </div>

                <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8 md:p-20 space-y-4 sm:space-y-6 max-w-4xl">
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 sm:gap-3"
                  >
                    <div className="px-2.5 sm:px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.25em] sm:tracking-[0.3em] text-cyan-400 font-mono flex items-center gap-1.5 sm:gap-2">
                      <Sparkles size={11} /> Featured Environment
                    </div>
                  </motion.div>

                  <motion.h1 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-2xl sm:text-4xl md:text-7xl font-heading font-extrabold tracking-tighter text-white lowercase leading-[0.95] drop-shadow-2xl line-clamp-2 sm:line-clamp-none"
                  >
                    {featured.title}
                  </motion.h1>

                  <motion.div 
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: 0.2 }}
                     className="flex flex-wrap items-center gap-2.5 sm:gap-4 pt-1 sm:pt-2"
                  >
                    <button 
                      onClick={() => playItem(featured)}
                      className="flex items-center justify-center gap-2.5 sm:gap-3 px-5 sm:px-8 py-3 sm:py-4 bg-white text-black rounded-xl sm:rounded-2xl font-bold uppercase tracking-[0.1em] text-xs hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)] min-h-[44px] cursor-pointer"
                    >
                      <Play fill="black" size={14} /> Stream Atmosphere
                    </button>
                    <button 
                      onClick={() => setShowNewPlaylistModal(true)}
                      className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 bg-white/10 backdrop-blur-md border border-white/15 text-white rounded-xl sm:rounded-2xl font-bold uppercase tracking-[0.1em] text-xs hover:bg-white/20 transition-all min-h-[44px] cursor-pointer"
                    >
                      <Plus size={15} /> Add to Playlist
                    </button>
                  </motion.div>
                </div>
              </div>
            )}

            {/* Playlists & Vault Rows */}
            <div className="relative z-10 space-y-10 sm:space-y-16 px-4 sm:px-6 md:px-16 pt-6 sm:pt-8">
              
              {/* YouTube Search Results Section */}
              {(activeFilter === 'All' || activeFilter === 'YouTube' || ytSearchResults.length > 0 || isSearchingYt || ytSearchError) && (hasSearchedYt || ytSearchResults.length > 0 || isSearchingYt || ytSearchError) && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-red-500/20 pb-4 gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                        <Youtube size={20} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-heading font-extrabold text-white lowercase">YouTube Live Results</h2>
                        <p className="text-[10px] font-mono text-white/40 uppercase">
                          {isSearchingYt ? 'Querying YouTube Data API...' : `Found ${ytSearchResults.length} results for "${videoUrl}"`}
                        </p>
                      </div>
                      {ytSearchResults.length > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-mono font-bold border border-red-500/30">
                          {ytSearchResults.length}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={clearYouTubeSearch}
                        className="text-xs font-mono uppercase tracking-widest text-white/50 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <X size={13} /> Clear Results
                      </button>
                    </div>
                  </div>

                  {/* Error / Missing Key State */}
                  {ytSearchError && (
                    <div className="p-6 rounded-3xl bg-red-950/30 border border-red-500/30 text-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-xl">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={20} />
                        <div>
                          <h4 className="font-bold font-mono text-sm uppercase">YouTube Data Search Notice</h4>
                          <p className="text-xs font-mono text-white/70 mt-1">{ytSearchError}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'profile' } }));
                        }}
                        className="px-4 py-2 bg-red-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-red-400 transition-all shrink-0 cursor-pointer shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                      >
                        Configure API Key in Profile
                      </button>
                    </div>
                  )}

                  {/* Loading skeletons */}
                  {isSearchingYt && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {Array.from({ length: 4 }).map((_, idx) => (
                        <div key={idx} className="bg-zinc-950/60 border border-white/10 rounded-3xl p-4 space-y-3 animate-pulse">
                          <div className="aspect-video rounded-2xl bg-white/5" />
                          <div className="h-4 bg-white/10 rounded-md w-3/4" />
                          <div className="h-3 bg-white/5 rounded-md w-1/2" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Results Grid */}
                  {!isSearchingYt && ytSearchResults.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {ytSearchResults.map((ytItem) => {
                        const isAdded = addedIds.has(ytItem.id) || library.some(l => l.id === ytItem.id);
                        return (
                          <motion.div
                            key={ytItem.id}
                            whileHover={{ y: -4 }}
                            className="group relative bg-zinc-950/70 border border-white/10 hover:border-red-500/40 rounded-3xl p-4 transition-all duration-500 shadow-2xl flex flex-col justify-between"
                          >
                            <div className="space-y-3">
                              {/* Thumbnail preview */}
                              <div 
                                onClick={() => playItem({
                                  id: ytItem.id,
                                  type: 'video',
                                  title: ytItem.title,
                                  thumbnail: ytItem.thumbnail,
                                  addedAt: Date.now(),
                                  channelTitle: ytItem.channelTitle
                                })}
                                className="relative aspect-video rounded-2xl overflow-hidden bg-zinc-900 cursor-pointer group/thumb"
                              >
                                <img 
                                  src={ytItem.thumbnail} 
                                  className="w-full h-full object-cover brightness-[0.75] group-hover/thumb:brightness-100 group-hover/thumb:scale-105 transition-all duration-500" 
                                  alt={ytItem.title} 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-300" />
                                <div className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-all duration-300 shadow-[0_0_25px_rgba(239,68,68,0.8)] hover:scale-110">
                                  <Play size={18} fill="white" className="ml-0.5" />
                                </div>
                                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[8px] font-mono uppercase text-white/90 border border-white/10">
                                  YouTube Video
                                </div>
                              </div>

                              {/* Info */}
                              <div className="space-y-1">
                                <span className="text-[9px] font-mono text-red-400 font-bold uppercase tracking-wider block truncate">
                                  {ytItem.channelTitle}
                                </span>
                                <h4 
                                  onClick={() => playItem({
                                    id: ytItem.id,
                                    type: 'video',
                                    title: ytItem.title,
                                    thumbnail: ytItem.thumbnail,
                                    addedAt: Date.now(),
                                    channelTitle: ytItem.channelTitle
                                  })}
                                  title={ytItem.title} 
                                  className="font-heading text-sm font-bold text-white lowercase line-clamp-2 leading-snug cursor-pointer hover:text-red-300 transition-colors"
                                >
                                  {ytItem.title}
                                </h4>
                              </div>
                            </div>

                            {/* Actions bar */}
                            <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between gap-2">
                              <button
                                onClick={() => playItem({
                                  id: ytItem.id,
                                  type: 'video',
                                  title: ytItem.title,
                                  thumbnail: ytItem.thumbnail,
                                  addedAt: Date.now(),
                                  channelTitle: ytItem.channelTitle
                                })}
                                className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black transition-all text-[9px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                              >
                                <Play size={10} fill="currentColor" /> Stream
                              </button>

                              <button
                                onClick={() => addYouTubeResultToLibrary(ytItem)}
                                title={isAdded ? "Already in Vault" : "Save to Atmosphere Vault"}
                                className={`p-2 rounded-xl border transition-all text-[9px] font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer ${
                                  isAdded 
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                                    : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border-white/10'
                                }`}
                              >
                                {isAdded ? <Check size={13} className="text-emerald-400" /> : <Plus size={13} />}
                              </button>

                              <button
                                onClick={() => {
                                  setTargetPlaylistId(customPlaylists[0]?.id || null);
                                  setItemToAddUrl(ytItem.url);
                                  setItemToAddTitle(ytItem.title);
                                  setShowAddItemModal(true);
                                }}
                                title="Add to Custom Playlist"
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-cyan-300 border border-white/10 transition-all cursor-pointer"
                              >
                                <FolderPlus size={13} />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {!isSearchingYt && ytSearchResults.length === 0 && !ytSearchError && hasSearchedYt && (
                    <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 text-center font-mono text-xs text-white/40">
                      No YouTube videos found matching "{videoUrl}". Try a different keyword.
                    </div>
                  )}
                </div>
              )}

              {/* Custom Playlists Section */}
              {(activeFilter === 'All' || activeFilter === 'Playlists' || activeFilter === 'Curated') && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      <List className="text-cyan-400" size={20} />
                      <h2 className="text-2xl font-heading font-extrabold text-white lowercase">Custom Playlists</h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 text-[10px] font-mono">{customPlaylists.length}</span>
                    </div>
                    <button 
                      onClick={() => setShowNewPlaylistModal(true)}
                      className="text-xs font-mono uppercase tracking-widest text-cyan-400 hover:text-cyan-300 flex items-center gap-2"
                    >
                      <Plus size={14} /> New Playlist
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {customPlaylists.map(playlist => (
                      <motion.div
                        key={playlist.id}
                        whileHover={{ y: -4 }}
                        className="group bg-zinc-950/60 border border-white/10 hover:border-white/25 rounded-3xl p-6 transition-all duration-500 shadow-2xl relative overflow-hidden flex flex-col justify-between"
                      >
                        <div className="space-y-4">
                          <div className="relative aspect-video rounded-2xl overflow-hidden bg-zinc-900 border border-white/5">
                            <img 
                              src={playlist.coverThumbnail || 'https://img.youtube.com/vi/TIqsKXQHvFI/maxresdefault.jpg'} 
                              alt={playlist.name}
                              className="w-full h-full object-cover brightness-[0.7] group-hover:brightness-100 group-hover:scale-105 transition-all duration-700" 
                            />
                            <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[9px] font-mono uppercase text-white/80">
                              {playlist.items.length} Tracks
                            </div>
                            <button
                              onClick={() => playCustomPlaylist(playlist)}
                              className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-white text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-2xl hover:scale-110"
                            >
                              <Play size={18} fill="black" className="ml-0.5" />
                            </button>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[8px] font-mono uppercase tracking-[0.3em] text-cyan-400">{playlist.category}</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setTargetPlaylistId(playlist.id);
                                    setShowAddItemModal(true);
                                  }}
                                  title="Add track to playlist"
                                  className="p-1 text-white/40 hover:text-white transition-colors"
                                >
                                  <Plus size={14} />
                                </button>
                                {!playlist.id.startsWith('curated-') && (
                                  <button
                                    onClick={() => deletePlaylist(playlist.id)}
                                    title="Delete playlist"
                                    className="p-1 text-white/40 hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <h3 className="font-heading text-xl font-bold text-white lowercase leading-tight">{playlist.name}</h3>
                            {playlist.desc && <p className="text-white/40 text-xs mt-1 line-clamp-2">{playlist.desc}</p>}
                          </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between">
                          <button
                            onClick={() => playCustomPlaylist(playlist)}
                            className="text-[10px] font-mono uppercase tracking-widest text-white/70 group-hover:text-white flex items-center gap-2"
                          >
                            <Play size={12} fill="currentColor" /> Launch Atmosphere
                          </button>
                          <span className="text-[9px] font-mono text-white/30 uppercase">{new Date(playlist.createdAt).toLocaleDateString()}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Individual Captured Streams */}
              {(activeFilter === 'All' || activeFilter === 'Streams') && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      <Video className="text-white/60" size={20} />
                      <h2 className="text-2xl font-heading font-extrabold text-white lowercase">Atmosphere Vault</h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 text-[10px] font-mono">{library.length}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {library.map((item, idx) => (
                      <motion.div
                        key={item.id + idx}
                        whileHover={{ y: -4 }}
                        className="group relative bg-zinc-950/60 border border-white/10 hover:border-white/25 rounded-3xl p-4 transition-all duration-500 shadow-2xl cursor-pointer"
                        onClick={() => playItem(item)}
                      >
                        <div className="relative aspect-video rounded-2xl overflow-hidden bg-zinc-900 mb-4">
                          <img src={item.thumbnail} className="w-full h-full object-cover brightness-[0.7] group-hover:brightness-100 transition-all duration-500" alt="" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          <div className="absolute top-3 right-3">
                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteFromLibrary(item.id); }}
                              className="p-2 rounded-full bg-black/60 backdrop-blur-md text-red-400/60 hover:text-red-400 hover:bg-black/90 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1 px-1">
                          <span className="text-[8px] font-mono uppercase tracking-[0.3em] text-white/40">{item.type}</span>
                          <h4 className="font-heading text-lg font-bold text-white lowercase truncate leading-snug">{item.title}</h4>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Create Playlist Modal */}
            <AnimatePresence>
              {showNewPlaylistModal && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-6"
                >
                  <motion.div 
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    className="bg-zinc-950 border border-white/15 rounded-3xl p-8 max-w-md w-full space-y-6 shadow-[0_0_80px_rgba(0,0,0,0.8)]"
                  >
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                      <div className="flex items-center gap-3">
                        <FolderPlus className="text-cyan-400" size={20} />
                        <h3 className="font-heading text-2xl font-bold text-white lowercase">Create Playlist</h3>
                      </div>
                      <button onClick={() => setShowNewPlaylistModal(false)} className="p-2 text-white/40 hover:text-white">
                        <X size={18} />
                      </button>
                    </div>

                    <form onSubmit={handleCreatePlaylist} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-white/50 mb-2">Playlist Title *</label>
                        <input 
                          type="text"
                          required
                          placeholder="e.g. Deep Coding Flow"
                          value={newPlaylistName}
                          onChange={e => setNewPlaylistName(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400 font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-white/50 mb-2">Description</label>
                        <input 
                          type="text"
                          placeholder="Short atmospheric summary..."
                          value={newPlaylistDesc}
                          onChange={e => setNewPlaylistDesc(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400 font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-white/50 mb-2">Category</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['Ambient', 'Music', 'Binaural', 'Lecture', 'Custom'] as const).map(cat => (
                            <button
                              type="button"
                              key={cat}
                              onClick={() => setNewPlaylistCategory(cat)}
                              className={`py-2 px-3 rounded-xl text-xs font-mono uppercase transition-all ${newPlaylistCategory === cat ? 'bg-cyan-500 text-black font-bold' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-white/50 mb-2">Initial YouTube Stream / Video URL (Optional)</label>
                        <input 
                          type="text"
                          placeholder="https://youtube.com/watch?v=..."
                          value={newPlaylistInitialUrl}
                          onChange={e => setNewPlaylistInitialUrl(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                        />
                      </div>

                      <div className="flex gap-3 pt-4 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => setShowNewPlaylistModal(false)}
                          className="flex-1 py-3 rounded-2xl bg-white/5 text-white/70 hover:bg-white/10 text-xs font-mono uppercase"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-3 rounded-2xl bg-cyan-500 text-black font-bold text-xs font-mono uppercase hover:bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)]"
                        >
                          Create Playlist
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Add Item to Playlist Modal */}
            <AnimatePresence>
              {showAddItemModal && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-6"
                >
                  <motion.div 
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    className="bg-zinc-950 border border-white/15 rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl"
                  >
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                      <h3 className="font-heading text-2xl font-bold text-white lowercase">Add Track to Playlist</h3>
                      <button onClick={() => setShowAddItemModal(false)} className="p-2 text-white/40 hover:text-white">
                        <X size={18} />
                      </button>
                    </div>

                    <form onSubmit={handleAddItemToPlaylist} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-white/50 mb-2">YouTube URL *</label>
                        <input 
                          type="text"
                          required
                          placeholder="https://youtube.com/watch?v=..."
                          value={itemToAddUrl}
                          onChange={e => setItemToAddUrl(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-white/50 mb-2">Custom Title (Optional)</label>
                        <input 
                          type="text"
                          placeholder="e.g. Rainy Night in Shibuya"
                          value={itemToAddTitle}
                          onChange={e => setItemToAddTitle(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400"
                        />
                      </div>

                      <div className="flex gap-3 pt-4 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => setShowAddItemModal(false)}
                          className="flex-1 py-3 rounded-2xl bg-white/5 text-white/70 hover:bg-white/10 text-xs font-mono uppercase"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-3 rounded-2xl bg-cyan-500 text-black font-bold text-xs font-mono uppercase hover:bg-cyan-400"
                        >
                          Add Track
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        ) : (
          /* High-Fidelity Custom Player View */
          <motion.div 
            key="player"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[200] flex items-center justify-center p-6 md:p-12 transition-all duration-1000 ${(isVoidShift || isAmbientActive) ? 'overflow-visible' : 'overflow-hidden'} ${isVoidShift ? 'bg-black' : 'bg-black/30 backdrop-blur-[100px]'}`}
          >
             {activeItem && (
               <motion.div 
                 layoutId="morphic-theatre"
                 className={`relative w-full max-w-[92vw] aspect-video rounded-[36px] shadow-[0_0_120px_rgba(0,0,0,0.8)] border border-white/10 ${(isVoidShift || isAmbientActive) ? 'overflow-visible' : 'overflow-hidden'}`}
               >
                 <CustomYouTubePlayer
                    ref={playerRef}
                    videoId={activeItem.type === 'video' ? activeItem.id : null}
                    playlistId={activeItem.type === 'playlist' ? activeItem.id : null}
                    autoplay={true}
                    initialTime={activeItem.progress || 0}
                    onProgress={updateProgress}
                    title={activeItem.title}
                    className="w-full h-full"
                    roundedClass="rounded-[36px]"
                    isVoidShift={isVoidShift}
                    onEnterVoid={() => setIsVoidShift(!isVoidShift)}
                    isAmbientActive={isAmbientActive}
                    onToggleAmbient={() => setIsAmbientActive(!isAmbientActive)}
                    dimmed={false}
                 />
               </motion.div>
             )}

             {/* Exit & Playlist Controls */}
             <AnimatePresence>
               {!isVoidShift && showControls && (
                 <>
                   <motion.div
                     initial={{ y: -50, opacity: 0 }}
                     animate={{ y: 0, opacity: 1 }}
                     exit={{ y: -50, opacity: 0 }}
                     className="absolute top-8 left-8 md:left-14 z-[210] flex items-center gap-4"
                   >
                     <button 
                       onClick={exitPlayer}
                       className="group flex items-center gap-3 text-white/70 hover:text-white transition-all bg-black/60 backdrop-blur-2xl border border-white/15 px-6 py-3 rounded-full uppercase text-[10px] font-mono font-bold tracking-widest shadow-2xl hover:scale-105"
                     >
                       <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Vault
                     </button>
                   </motion.div>

                   {/* Playlist Track Switcher Bar */}
                   {activePlaylist && activePlaylist.items.length > 1 && (
                     <motion.div
                       initial={{ y: -50, opacity: 0 }}
                       animate={{ y: 0, opacity: 1 }}
                       exit={{ y: -50, opacity: 0 }}
                       className="absolute top-8 right-8 md:right-14 z-[210] flex items-center gap-2 bg-black/60 backdrop-blur-2xl border border-white/15 px-4 py-2.5 rounded-full"
                     >
                       <button onClick={prevTrack} className="p-2 hover:text-white text-white/50 transition-colors">
                         <ChevronLeft size={16} />
                       </button>
                       <span className="text-[10px] font-mono uppercase text-white/70 tracking-widest px-2">
                         Track {activePlaylistTrackIdx + 1} / {activePlaylist.items.length}
                       </span>
                       <button onClick={nextTrack} className="p-2 hover:text-white text-white/50 transition-colors">
                         <ChevronRight size={16} />
                       </button>
                     </motion.div>
                   )}

                   <motion.div
                     initial={{ x: -50, opacity: 0 }}
                     animate={{ x: 0, opacity: 1 }}
                     exit={{ x: -50, opacity: 0 }}
                     className="absolute bottom-8 left-8 md:left-14 z-[210] pointer-events-none hidden md:block"
                   >
                     <div className="flex flex-col bg-black/50 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl max-w-md">
                       <span className="text-cyan-400 text-[9px] font-mono uppercase tracking-[0.4em] font-black mb-1">
                         {activePlaylist ? `Playlist: ${activePlaylist.name}` : 'Atmosphere Stream'}
                       </span>
                       <h2 className="text-white font-bold text-lg leading-tight truncate drop-shadow-2xl">{activeItem?.title}</h2>
                     </div>
                   </motion.div>
                 </>
               )}
             </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

