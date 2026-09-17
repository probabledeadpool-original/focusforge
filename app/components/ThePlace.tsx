import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, X, Monitor, ChevronLeft, Zap, Target, Plus, Trash2, Clock, 
  List, Video, Search, ChevronRight, Info, Music, FolderPlus, 
  Shuffle, Repeat, Sparkles, Edit3, Check, Disc, Volume2
} from 'lucide-react';
import { CustomYouTubePlayer, YouTubePlayerRef } from './CustomYouTubePlayer';
import TheFrequency from './TheFrequency/TheFrequency';

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
  const [activeFilter, setActiveFilter] = useState<'All' | 'Playlists' | 'Streams' | 'Curated'>('All');
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    if (viewState === 'player') {
      window.addEventListener('mousemove', handleMouseMove);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      };
    }
  }, [viewState, isVoidShift]);

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
      {viewState === 'frequency' && <TheFrequency />}

      {viewState === 'frequency' && (
        <button
          onClick={() => setViewState('browse')}
          className="fixed top-20 right-8 z-[110] flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 backdrop-blur-xl rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all text-[10px] font-bold uppercase tracking-[0.2em]"
        >
          <ChevronLeft size={14} /> Back to Vault
        </button>
      )}

      <AnimatePresence mode="wait">
        {viewState === 'frequency' ? null : viewState === 'browse' ? (
          <motion.div 
            key="browse"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col pb-32 pt-36"
          >
            {/* Navigation Header */}
            <header className="fixed top-24 w-[calc(100%-48px)] left-6 right-6 z-[100] px-6 md:px-10 py-4 flex items-center justify-between bg-zinc-950/60 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl">
              <div className="flex items-center gap-8 md:gap-12">
                <div className="flex items-center gap-3">
                   <div className="w-9 h-9 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white shadow-inner">
                      <Monitor size={18} />
                   </div>
                   <div>
                     <span className="font-heading font-extrabold text-2xl tracking-tighter lowercase">the place.</span>
                     <span className="hidden sm:inline-block ml-3 text-[9px] font-mono uppercase tracking-[0.3em] text-white/40">Atmospheric Vault</span>
                   </div>
                </div>

                <nav className="hidden lg:flex items-center gap-6">
                  {(['All', 'Playlists', 'Streams', 'Curated'] as const).map(nav => (
                    <button 
                      key={nav} 
                      onClick={() => setActiveFilter(nav)}
                      className={`text-[10px] font-mono uppercase tracking-[0.3em] transition-all px-3 py-1.5 rounded-full ${activeFilter === nav ? 'bg-white text-black font-bold shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                      {nav}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="flex items-center gap-3 md:gap-4">
                <button
                  onClick={() => setShowNewPlaylistModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-xl rounded-full text-white text-[10px] font-bold uppercase tracking-[0.2em] transition-all shadow-lg hover:scale-105 active:scale-95"
                >
                  <FolderPlus size={14} className="text-cyan-400" />
                  <span className="hidden sm:inline">New Playlist</span>
                </button>

                <button
                  onClick={() => setViewState('frequency')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/10 border border-purple-500/20 backdrop-blur-xl rounded-full text-purple-300 hover:bg-purple-500/20 hover:text-purple-200 transition-all text-[10px] font-bold uppercase tracking-[0.2em]"
                >
                  <Music size={13} />
                  <span className="hidden sm:inline">Frequency</span>
                </button>

                <form onSubmit={addToLibrary} className="relative group hidden sm:block">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/70 transition-colors" />
                  <input 
                    type="text"
                    placeholder="Paste YouTube Link..."
                    value={videoUrl}
                    onChange={e => setVideoUrl(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-11 pr-5 text-xs w-[200px] md:w-[260px] focus:outline-none focus:w-[320px] focus:bg-white/10 focus:border-white/30 transition-all placeholder:text-white/20 font-mono text-white"
                  />
                </form>
              </div>
            </header>

            {/* Featured Billboard */}
            {featured && (
              <div className="relative w-full h-[65vh] min-h-[480px] overflow-hidden">
                <div className="absolute inset-0">
                  <img 
                    src={featured.thumbnail} 
                    className="w-full h-full object-cover brightness-[0.35] scale-105 transition-transform duration-1000"
                    alt={featured.title}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
                </div>

                <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-20 space-y-6 max-w-4xl">
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3"
                  >
                    <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-bold uppercase tracking-[0.3em] text-cyan-400 font-mono flex items-center gap-2">
                      <Sparkles size={11} /> Featured Focus Environment
                    </div>
                  </motion.div>

                  <motion.h1 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-4xl md:text-7xl font-heading font-extrabold tracking-tighter text-white lowercase leading-[0.95] drop-shadow-2xl"
                  >
                    {featured.title}
                  </motion.h1>

                  <motion.div 
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: 0.2 }}
                     className="flex items-center gap-4 pt-2"
                  >
                    <button 
                      onClick={() => playItem(featured)}
                      className="flex items-center gap-3 px-8 py-4 bg-white text-black rounded-2xl font-bold uppercase tracking-[0.1em] text-xs hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                    >
                      <Play fill="black" size={16} /> Stream Atmosphere
                    </button>
                    <button 
                      onClick={() => setShowNewPlaylistModal(true)}
                      className="flex items-center gap-2 px-6 py-4 bg-white/10 backdrop-blur-md border border-white/15 text-white rounded-2xl font-bold uppercase tracking-[0.1em] text-xs hover:bg-white/20 transition-all"
                    >
                      <Plus size={16} /> Add to Playlist
                    </button>
                  </motion.div>
                </div>
              </div>
            )}

            {/* Playlists & Vault Rows */}
            <div className="relative z-10 space-y-16 px-6 md:px-16 pt-8">
              
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

