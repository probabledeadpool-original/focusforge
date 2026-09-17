"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Play, Pause, SkipForward, SkipBack, Plus, Trash2, 
  Music, ListMusic, Shuffle, Repeat, Repeat1, Volume2, VolumeX, 
  ChevronUp, Maximize2, X, Sparkles, Waves, SlidersHorizontal, 
  Check, Heart, Radio, Disc3, Layers, Compass, ArrowRight,
  Clock, Share2, MoreHorizontal, ExternalLink, GripVertical
} from 'lucide-react';
import { useFrequencyStore, Track, AudioEnhancementPreset } from '../../../hooks/useFrequencyStore';
import FrequencyPlayer from './FrequencyPlayer';
import { fetchYouTubeMeta, extractDominantColor } from '../SonicVaultUtils';

const formatTime = (s: number) => {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
};

export default function TheFrequency() {
  const store = useFrequencyStore();
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [playlistPickerTrack, setPlaylistPickerTrack] = useState<Track | null>(null);
  const [playlistPickerNewName, setPlaylistPickerNewName] = useState('');
  const [playlistLibraryPickerPlaylistId, setPlaylistLibraryPickerPlaylistId] = useState<string | null>(null);
  const [librarySearch, setLibrarySearch] = useState('');
  const [renamePlaylistId, setRenamePlaylistId] = useState<string | null>(null);
  const [renamePlaylistName, setRenamePlaylistName] = useState('');
  const [draggedQueueId, setDraggedQueueId] = useState<string | null>(null);
  const [dragOverQueueId, setDragOverQueueId] = useState<string | null>(null);
  const [scrubberHoverTime, setScrubberHoverTime] = useState<string | null>(null);
  const [scrubberHoverPct, setScrubberHoverPct] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(80);

  const current = store.getCurrentTrack();

  useEffect(() => {
    store.hydrate();
  }, []);

  const queueItems = store.queue
    .map(id => store.tracks.find(track => track.id === id))
    .filter((track): track is Track => Boolean(track));

  const filteredLibraryTracks = store.tracks.filter(track => {
    if (!librarySearch.trim()) return true;
    const query = librarySearch.toLowerCase();
    return track.title.toLowerCase().includes(query) || track.artist.toLowerCase().includes(query);
  });

  const recentPlayedTracks = store.tracks
    .filter(track => track.lastPlayedAt)
    .sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0))
    .slice(0, 8);

  const handleAdd = async (e?: React.FormEvent, customUrl?: string) => {
    if (e) e.preventDefault();
    const targetUrl = customUrl || url;
    if (!targetUrl.trim() || adding) return;
    setAdding(true);
    setAddError(null);
    setAddSuccess(null);
    try {
      const meta = await fetchYouTubeMeta(targetUrl);
      if (!meta) {
        setAddError('Could not resolve YouTube track. Please check the URL.');
        setAdding(false);
        return;
      }
      const color = await extractDominantColor(meta.thumbnail);
      const track: Track = {
        id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
        videoId: meta.videoId,
        title: meta.title,
        artist: meta.artist,
        thumbnail: meta.thumbnail,
        dominantColor: color,
        addedAt: Date.now(),
        sourceUrl: targetUrl,
      };
      store.addTrack(track);
      setUrl('');
      setAddSuccess(`Added "${track.title.slice(0, 32)}..."`);
      setTimeout(() => setAddSuccess(null), 4000);
    } catch {
      setAddError('Failed to fetch track information.');
    } finally {
      setAdding(false);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const time = pct * (store.duration || 1);
    store.seek(time);
  };

  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!store.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setScrubberHoverPct(pct * 100);
    setScrubberHoverTime(formatTime(pct * store.duration));
  };

  const toggleMute = () => {
    if (isMuted) {
      store.setVolume(prevVolume || 80);
      setIsMuted(false);
    } else {
      setPrevVolume(store.volume);
      store.setVolume(0);
      setIsMuted(true);
    }
  };

  const dominantGlow = current?.dominantColor || 'rgba(147, 51, 234, 0.5)';

  // ==========================================
  // SIDEBAR COMPONENT (Apple Music Style)
  // ==========================================
  const sidebar = (
    <div className="w-[260px] shrink-0 border-r border-white/10 bg-zinc-950/60 backdrop-blur-3xl flex flex-col h-full select-none z-20">
      {/* Brand Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-[1px] shadow-[0_0_20px_rgba(147,51,234,0.3)]">
              <div className="w-full h-full bg-zinc-950 rounded-[15px] flex items-center justify-center">
                <Music size={17} className="text-cyan-300 animate-pulse" />
              </div>
            </div>
            <div>
              <span className="font-heading font-extrabold text-sm tracking-tight text-white block">
                The Frequency
              </span>
              <span className="text-[9px] font-mono uppercase tracking-widest text-cyan-400/80 font-bold">
                Spatial Audio OS
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="space-y-1">
          {[
            { id: 'home', label: 'Listen Now', icon: Sparkles, badge: null },
            { id: 'search', label: 'Discover & Add', icon: Search, badge: null },
            { id: 'queue', label: 'Live Queue', icon: ListMusic, badge: store.queue.length > 0 ? store.queue.length : null },
            { id: 'playlists', label: 'Playlists', icon: Disc3, badge: store.playlists.length > 0 ? store.playlists.length : null },
            { id: 'library', label: 'Songs Library', icon: Layers, badge: store.tracks.length },
          ].map(item => {
            const Icon = item.icon;
            const isActive = store.activeTab === item.id && (item.id !== 'playlists' || store.activePlaylistId === null);
            return (
              <button
                key={item.id}
                onClick={() => {
                  store.setActiveTab(item.id as any);
                  if (item.id === 'playlists') store.setActivePlaylistId(null);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-semibold tracking-wide flex items-center justify-between transition-all duration-200 group ${
                  isActive
                    ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] border border-white/10'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={16} className={isActive ? "text-cyan-400" : "text-white/40 group-hover:text-white/80 transition-colors"} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'bg-white/5 text-white/40'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/5 mx-5 my-1" />

      {/* Playlists List */}
      <div className="flex-1 overflow-y-auto px-5 py-3 custom-scrollbar">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">Your Playlists</span>
          <button
            onClick={() => setShowCreatePlaylist(true)}
            className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 text-white/50 hover:text-white flex items-center justify-center transition-all"
            title="Create New Playlist"
          >
            <Plus size={13} />
          </button>
        </div>

        {showCreatePlaylist && (
          <form
            onSubmit={e => {
              e.preventDefault();
              if (newPlaylistName.trim()) {
                store.createPlaylist(newPlaylistName.trim());
                setNewPlaylistName('');
                setShowCreatePlaylist(false);
              }
            }}
            className="mb-3"
          >
            <input
              value={newPlaylistName}
              onChange={e => setNewPlaylistName(e.target.value)}
              autoFocus
              placeholder="Playlist name..."
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-400 focus:bg-white/10 transition-all"
            />
          </form>
        )}

        <div className="space-y-1">
          {store.playlists.map(p => {
            const isActive = store.activePlaylistId === p.id && store.activeTab === 'playlists';
            return (
              <button
                key={p.id}
                onClick={() => {
                  store.setActivePlaylistId(p.id);
                  store.setActiveTab('playlists');
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between group transition-all ${
                  isActive
                    ? 'bg-purple-500/15 text-purple-200 border border-purple-500/30 font-semibold'
                    : 'text-white/40 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-purple-400' : 'bg-white/20'}`} />
                  <span className="truncate">{p.name}</span>
                </div>
                <span className="text-[10px] font-mono text-white/20 group-hover:text-white/40">
                  {p.trackIds.length}
                </span>
              </button>
            );
          })}
          {store.playlists.length === 0 && !showCreatePlaylist && (
            <div className="text-[11px] text-white/20 px-2 py-3 text-center">
              No playlists yet
            </div>
          )}
        </div>
      </div>

      {/* Acoustic & Photon Bottom Controls */}
      <div className="p-4 border-t border-white/10 space-y-2.5 bg-black/20">
        {/* DSP Preset Chip */}
        <div className="flex gap-1.5">
          <button
            onClick={() => {
              const presets: AudioEnhancementPreset[] = ['original', 'enhanced', 'immersive', 'bass-titan', 'vocal-air'];
              const idx = presets.indexOf(store.audioPreset);
              const next = presets[(idx + 1) % presets.length];
              store.setAudioPreset(next);
            }}
            className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-mono uppercase tracking-wider transition-all border ${
              store.audioPreset === 'enhanced'
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                : store.audioPreset === 'immersive'
                ? 'bg-purple-500/10 border-purple-500/40 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.15)]'
                : store.audioPreset === 'bass-titan'
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                : store.audioPreset === 'vocal-air'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
            }`}
            title="Cycle DSP Acoustic Preset"
          >
            <div className="flex items-center gap-2">
              <Waves size={13} className={store.audioPreset === 'original' ? "text-white/40" : "text-cyan-400 animate-pulse"} />
              <span className="font-bold">DSP</span>
            </div>
            <span className="text-[9px] font-bold truncate max-w-[80px]">
              {store.audioPreset.toUpperCase()}
            </span>
          </button>

          <button
            onClick={() => store.setStudioOpen(true)}
            className="px-3 py-2 rounded-xl text-[10px] font-mono uppercase tracking-wider bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all"
            title="Open Acoustic & Photon Studio"
          >
            <SlidersHorizontal size={12} />
            <span>Studio</span>
          </button>
        </div>

        {/* Edge Glow Toggle */}
        <button
          onClick={() => store.toggleEdgeLighting()}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-mono uppercase tracking-wider transition-all border ${
            store.edgeLighting
              ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
              : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
          }`}
          title="Toggle Physical Edge Lighting"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={13} className={store.edgeLighting ? "text-cyan-400" : "text-white/40"} />
            <span>Edge Aura</span>
          </div>
          <span className="text-[9px] font-bold">
            [{store.edgeLightingMode.toUpperCase()}] {store.edgeLighting ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>
    </div>
  );

  // ==========================================
  // TRACK ROW ITEM
  // ==========================================
  const renderTrackRow = (track: Track, idx: number, showDelete = true, showAddToPlaylist = true, showQueueAction = true) => {
    const isCurrent = current?.id === track.id;
    const isPlayingCurrent = isCurrent && store.isPlaying;
    const inQueue = store.queue.includes(track.id);

    return (
      <motion.div
        key={track.id}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => store.playTrack(track.id)}
        className={`group flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200 cursor-pointer border ${
          isCurrent
            ? 'bg-white/[0.08] border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
            : 'bg-transparent border-transparent hover:bg-white/[0.04] hover:border-white/5'
        }`}
      >
        {/* Track Index or Playing Waveform */}
        <div className="w-7 text-center shrink-0 flex items-center justify-center">
          {isPlayingCurrent ? (
            <div className="flex items-end justify-center gap-0.5 h-4">
              <div className="w-1 bg-cyan-400 rounded-full animate-[bounce_1s_infinite_100ms] h-full" />
              <div className="w-1 bg-purple-400 rounded-full animate-[bounce_1s_infinite_300ms] h-3/4" />
              <div className="w-1 bg-cyan-300 rounded-full animate-[bounce_1s_infinite_200ms] h-1/2" />
            </div>
          ) : (
            <span className={`text-xs font-mono group-hover:hidden ${isCurrent ? 'text-cyan-400 font-bold' : 'text-white/30'}`}>
              {idx + 1}
            </span>
          )}
          <Play size={13} className={`hidden group-hover:block ${isCurrent ? 'text-cyan-400' : 'text-white'}`} fill="currentColor" />
        </div>

        {/* Squircle Thumbnail */}
        <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 relative bg-zinc-900 shadow-md">
          <img src={track.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="" />
          {isCurrent && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className={`w-2 h-2 rounded-full ${store.isPlaying ? 'bg-cyan-400 animate-ping' : 'bg-white/60'}`} />
            </div>
          )}
        </div>

        {/* Title & Artist */}
        <div className="flex-1 min-w-0 pr-2">
          <div className={`text-sm font-semibold truncate ${isCurrent ? 'text-cyan-300' : 'text-white/90 group-hover:text-white'}`}>
            {track.title}
          </div>
          <div className="text-[11px] text-white/40 truncate mt-0.5">
            {track.artist}
          </div>
        </div>

        {/* Dominant Color Badge */}
        <div 
          className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0 hidden md:block" 
          style={{ backgroundColor: track.dominantColor }}
          title={`Dominant: ${track.dominantColor}`}
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {showAddToPlaylist && (
            <button
              onClick={e => {
                e.stopPropagation();
                setPlaylistPickerTrack(track);
              }}
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              title="Add to Playlist"
            >
              <Disc3 size={15} />
            </button>
          )}

          {showQueueAction && (
            <button
              onClick={e => {
                e.stopPropagation();
                if (!inQueue) {
                  store.addToQueue(track.id, true);
                }
              }}
              className={`p-2 rounded-xl transition-colors ${
                inQueue ? 'text-cyan-400' : 'text-white/40 hover:text-white hover:bg-white/10'
              }`}
              title={inQueue ? 'In Queue' : 'Play Next'}
            >
              <ListMusic size={15} />
            </button>
          )}

          {showDelete && (
            <button
              onClick={e => {
                e.stopPropagation();
                store.removeTrack(track.id);
              }}
              className="p-2 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Delete Track"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  // ==========================================
  // TAB 1: LISTEN NOW (HOME TAB)
  // ==========================================
  const homeTab = (
    <div className="p-8 lg:p-10 space-y-10 max-w-7xl mx-auto">
      {/* Hero Showcase Card */}
      {store.tracks.length > 0 && store.tracks[0] && (
        <div
          onClick={() => store.playTrack(current ? current.id : store.tracks[0].id)}
          className="relative h-[340px] md:h-[400px] rounded-[36px] overflow-hidden cursor-pointer group border border-white/15 shadow-[0_30px_90px_rgba(0,0,0,0.6)]"
        >
          {/* Background Poster Image */}
          <img
            src={current ? current.thumbnail : store.tracks[0].thumbnail}
            className="w-full h-full object-cover brightness-[0.45] group-hover:brightness-[0.55] scale-100 group-hover:scale-105 transition-all duration-700"
            alt=""
          />

          {/* Frosted Atmospheric Mesh Overlay */}
          <div
            className="absolute inset-0 opacity-40 mix-blend-screen transition-opacity duration-1000"
            style={{
              backgroundImage: `radial-gradient(circle at 70% 30%, ${dominantGlow} 0%, transparent 60%)`
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

          {/* Hero Content */}
          <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-end">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[10px] font-mono uppercase tracking-widest text-white font-bold border border-white/20">
                FEATURED FLOW
              </span>
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 backdrop-blur-md text-[10px] font-mono uppercase tracking-widest text-cyan-300 font-bold border border-cyan-500/30 flex items-center gap-1.5">
                <Waves size={11} className="animate-pulse" /> SPATIAL AUDIO
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-heading font-black tracking-tight text-white mb-2 max-w-2xl line-clamp-2">
              {current ? current.title : store.tracks[0].title}
            </h1>
            <p className="text-sm md:text-base text-white/60 font-medium mb-6">
              {current ? current.artist : store.tracks[0].artist}
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (current && store.isPlaying) {
                    store.togglePlay();
                  } else {
                    store.playTrack(current ? current.id : store.tracks[0].id);
                  }
                }}
                className="px-6 py-3.5 bg-white text-black hover:bg-white/90 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2.5 shadow-xl hover:scale-105 transition-all duration-200"
              >
                {store.isPlaying ? <Pause size={16} fill="black" /> : <Play size={16} fill="black" />}
                <span>{store.isPlaying ? 'Pause' : 'Play Flow'}</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  store.toggleShuffle();
                  store.next();
                }}
                className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 border border-white/15 backdrop-blur-xl transition-all"
              >
                <Shuffle size={15} />
                <span>Shuffle Mix</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Curated Stations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-heading font-extrabold tracking-tight text-white">Focus Stations</h2>
            <p className="text-xs text-white/40">Hand-curated soundscapes engineered for deep study and flow.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {store.tracks.slice(0, 4).map(track => (
            <div
              key={track.id}
              onClick={() => store.playTrack(track.id)}
              className="group p-4 rounded-3xl bg-zinc-900/50 hover:bg-white/[0.06] border border-white/10 hover:border-white/25 transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-lg"
            >
              <div className="aspect-video rounded-2xl overflow-hidden mb-3 relative bg-black">
                <img src={track.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">
                    <Play size={16} fill="white" className="ml-0.5 text-white" />
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                  {track.title}
                </div>
                <div className="text-[10px] text-white/40 truncate mt-0.5">
                  {track.artist}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recently Played */}
      {recentPlayedTracks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-heading font-extrabold tracking-tight text-white">Recently Played</h2>
              <p className="text-xs text-white/40">Pick up right where you left off.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            {recentPlayedTracks.map((track, i) => renderTrackRow(track, i))}
          </div>
        </div>
      )}
    </div>
  );

  // ==========================================
  // TAB 2: DISCOVER & ADD (SEARCH TAB)
  // ==========================================
  const searchTab = (
    <div className="p-8 lg:p-10 max-w-5xl mx-auto space-y-10">
      {/* Apple Spotlight Search Box */}
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-heading font-black tracking-tight text-white">
          Discover & Add Music
        </h1>
        <p className="text-sm text-white/40 max-w-md mx-auto">
          Paste any YouTube video or playlist URL. The Frequency will automatically parse, extract artwork colors, and enhance it with DSP.
        </p>

        <form onSubmit={handleAdd} className="relative max-w-2xl mx-auto pt-2">
          <div className="relative group">
            <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-cyan-400 transition-colors" />
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="Paste YouTube link (e.g. https://www.youtube.com/watch?v=...)"
              className="w-full bg-zinc-900/80 border border-white/15 rounded-3xl py-4 pl-14 pr-32 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-400 focus:bg-zinc-900 focus:shadow-[0_0_30px_rgba(6,182,212,0.2)] transition-all"
            />
            {url && (
              <button
                type="submit"
                disabled={adding}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-50 shadow-md"
              >
                {adding ? 'Fetching...' : 'Add Track'}
              </button>
            )}
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-[11px] text-white/40">
            <span>Try these:</span>
            {[
              { label: 'Lofi Girl Live', link: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' },
              { label: 'Synthwave Night', link: 'https://www.youtube.com/watch?v=4xDzrJKXOOY' },
              { label: 'Deep Focus Ambient', link: 'https://www.youtube.com/watch?v=WPni755-Krg' },
              { label: 'Cyberpunk Drive', link: 'https://www.youtube.com/watch?v=S_MOd40zlSk' },
            ].map(item => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleAdd(undefined, item.link)}
                disabled={adding}
                className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Success / Error Banners */}
          {addSuccess && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2">
              <Check size={14} /> {addSuccess}
            </motion.div>
          )}
          {addError && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-3 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center justify-center gap-2">
              <X size={14} /> {addError}
            </motion.div>
          )}
        </form>
      </div>

      {/* All Tracks in Library */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-heading font-extrabold tracking-tight text-white">
            Library Tracks ({store.tracks.length})
          </h2>
          <span className="text-xs text-white/40">Saved permanently in memory</span>
        </div>

        <div className="space-y-1.5">
          {store.tracks.map((t, i) => renderTrackRow(t, i, true, true, true))}
        </div>
      </div>
    </div>
  );

  // ==========================================
  // TAB 3: LIVE QUEUE (UP NEXT)
  // ==========================================
  const queueTab = (
    <div className="p-8 lg:p-10 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl font-heading font-black tracking-tight text-white">Up Next</h1>
          <p className="text-xs text-white/40">Drag and reorder tracks to tailor your live flow.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => store.toggleShuffle()}
            className={`px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 border transition-all ${
              store.shuffle
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
            }`}
          >
            <Shuffle size={14} />
            <span>Shuffle</span>
          </button>
        </div>
      </div>

      {queueItems.length > 0 ? (
        <div className="space-y-2">
          {queueItems.map((track, index) => {
            const isPlayingThis = current?.id === track.id && store.isPlaying;
            return (
              <div
                key={track.id}
                draggable
                onDragStart={() => setDraggedQueueId(track.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverQueueId(track.id);
                }}
                onDragLeave={() => setDragOverQueueId(null)}
                onDrop={() => {
                  if (!draggedQueueId || draggedQueueId === track.id) return;
                  const queueIds = [...store.queue];
                  const from = queueIds.indexOf(draggedQueueId);
                  const to = queueIds.indexOf(track.id);
                  queueIds.splice(from, 1);
                  queueIds.splice(to, 0, draggedQueueId);
                  store.reorderQueue(queueIds);
                  setDragOverQueueId(null);
                  setDraggedQueueId(null);
                }}
                onClick={() => store.playTrack(track.id)}
                className={`group flex items-center gap-4 rounded-2xl border px-4 py-3.5 transition-all duration-200 cursor-pointer ${
                  dragOverQueueId === track.id
                    ? 'border-cyan-400 bg-cyan-500/10'
                    : current?.id === track.id
                    ? 'border-white/20 bg-white/[0.08]'
                    : 'border-white/5 bg-zinc-900/40 hover:bg-white/[0.04]'
                }`}
              >
                <div className="text-white/20 group-hover:text-white/50 cursor-grab">
                  <GripVertical size={16} />
                </div>

                <div className="w-11 h-11 rounded-xl overflow-hidden relative shrink-0 bg-black">
                  <img src={track.thumbnail} className="w-full h-full object-cover" alt="" />
                  {isPlayingThis && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold truncate ${current?.id === track.id ? 'text-cyan-300' : 'text-white'}`}>
                    {track.title}
                  </div>
                  <div className="text-xs text-white/40 truncate mt-0.5">
                    {track.artist}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    store.removeFromQueue(track.id);
                  }}
                  className="p-2 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Remove from Queue"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 text-white/30 space-y-3">
          <ListMusic size={40} className="mx-auto text-white/10" />
          <p className="text-sm">Queue is empty. Select songs from your library to queue.</p>
        </div>
      )}
    </div>
  );

  // ==========================================
  // TAB 4: PLAYLISTS
  // ==========================================
  const activePlaylist = store.playlists.find(p => p.id === store.activePlaylistId);
  const playlistTab = (
    <div className="p-8 lg:p-10 max-w-6xl mx-auto">
      {activePlaylist ? (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
            <div className="space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                PLAYLIST · {activePlaylist.trackIds.length} TRACKS
              </span>
              {renamePlaylistId === activePlaylist.id ? (
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    if (renamePlaylistName.trim()) {
                      store.renamePlaylist(activePlaylist.id, renamePlaylistName.trim());
                      setRenamePlaylistId(null);
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={renamePlaylistName}
                    onChange={e => setRenamePlaylistName(e.target.value)}
                    autoFocus
                    className="bg-white/10 border border-white/20 rounded-2xl px-4 py-2 text-xl font-bold text-white focus:outline-none"
                  />
                  <button type="submit" className="px-4 py-2 bg-cyan-500 text-black font-bold rounded-2xl text-xs">Save</button>
                  <button type="button" onClick={() => setRenamePlaylistId(null)} className="px-4 py-2 bg-white/10 text-white rounded-2xl text-xs">Cancel</button>
                </form>
              ) : (
                <h1 className="text-4xl font-heading font-black tracking-tight text-white">
                  {activePlaylist.name}
                </h1>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setPlaylistLibraryPickerPlaylistId(activePlaylist.id)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-semibold tracking-wide border border-white/15 transition-all"
                >
                  + Add from Library
                </button>
                <button
                  onClick={() => {
                    setRenamePlaylistId(activePlaylist.id);
                    setRenamePlaylistName(activePlaylist.name);
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-2xl text-xs font-semibold border border-white/10 transition-all"
                >
                  Rename
                </button>
                <button
                  onClick={() => store.deletePlaylist(activePlaylist.id)}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-2xl text-xs font-semibold border border-red-500/20 transition-all"
                >
                  Delete
                </button>
              </div>
            </div>

            <button
              onClick={() => store.playPlaylist(activePlaylist.id)}
              disabled={activePlaylist.trackIds.length === 0}
              className="px-8 py-4 bg-white text-black hover:bg-white/90 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-2xl transition-all disabled:opacity-40"
            >
              <Play size={16} fill="black" /> Play Playlist
            </button>
          </div>

          <div className="space-y-1.5">
            {activePlaylist.trackIds.map((tid, idx) => {
              const t = store.tracks.find(track => track.id === tid);
              return t ? renderTrackRow(t, idx, true, true, true) : null;
            })}
            {activePlaylist.trackIds.length === 0 && (
              <div className="text-center py-20 text-white/30 space-y-3">
                <Disc3 size={40} className="mx-auto text-white/10" />
                <p className="text-sm">This playlist has no songs yet. Click "+ Add from Library" above.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between border-b border-white/10 pb-5">
            <div>
              <h1 className="text-3xl font-heading font-black tracking-tight text-white">Playlists</h1>
              <p className="text-xs text-white/40">Custom mixes and mood collections.</p>
            </div>
            <button
              onClick={() => setShowCreatePlaylist(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-2xl text-xs font-bold uppercase tracking-wider shadow-lg hover:opacity-90 transition-all"
            >
              + New Playlist
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {store.playlists.map(p => {
              const pTracks = p.trackIds
                .map(id => store.tracks.find(t => t.id === id))
                .filter((t): t is Track => Boolean(t));

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    store.setActivePlaylistId(p.id);
                    store.setActiveTab('playlists');
                  }}
                  className="group p-5 rounded-3xl bg-zinc-900/60 hover:bg-white/[0.06] border border-white/10 hover:border-white/25 transition-all duration-300 cursor-pointer shadow-xl flex flex-col justify-between"
                >
                  <div className="grid grid-cols-2 gap-1.5 aspect-square rounded-2xl overflow-hidden mb-4 bg-black/40 p-1">
                    {pTracks.slice(0, 4).map(track => (
                      <div key={track.id} className="overflow-hidden rounded-xl bg-zinc-800">
                        <img src={track.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="" />
                      </div>
                    ))}
                    {pTracks.length === 0 && (
                      <div className="col-span-2 flex items-center justify-center text-white/20 text-xs">
                        Empty Playlist
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                        {p.name}
                      </div>
                      <div className="text-xs text-white/40 mt-0.5 font-mono">
                        {p.trackIds.length} tracks
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={14} fill="white" className="ml-0.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // ==========================================
  // TAB 5: SONGS LIBRARY
  // ==========================================
  const libraryTab = (
    <div className="p-8 lg:p-10 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-3xl font-heading font-black tracking-tight text-white">All Songs</h1>
          <p className="text-xs text-white/40">Complete collection saved permanently in memory.</p>
        </div>

        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={librarySearch}
            onChange={e => setLibrarySearch(e.target.value)}
            placeholder="Search titles or artists..."
            className="w-full bg-zinc-900/80 border border-white/15 rounded-2xl py-2.5 pl-11 pr-4 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-400 focus:bg-zinc-900 transition-all"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        {filteredLibraryTracks.map((track, i) => renderTrackRow(track, i, true, true, true))}
        {filteredLibraryTracks.length === 0 && (
          <div className="text-center py-20 text-white/30">
            No tracks match your search filter.
          </div>
        )}
      </div>
    </div>
  );

  // ==========================================
  // MODAL 1: ADD TO PLAYLIST PICKER
  // ==========================================
  const playlistPickerModal = playlistPickerTrack ? (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] grid place-items-center bg-black/80 backdrop-blur-xl p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setPlaylistPickerTrack(null)}
      >
        <motion.div
          className="w-full max-w-md rounded-[32px] border border-white/15 bg-zinc-950/95 p-6 shadow-2xl"
          initial={{ scale: 0.95, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 15 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">Add to Playlist</span>
              <h3 className="text-lg font-bold text-white truncate max-w-[280px]">{playlistPickerTrack.title}</h3>
            </div>
            <button onClick={() => setPlaylistPickerTrack(null)} className="p-2 text-white/40 hover:text-white rounded-full">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1 mb-5">
            {store.playlists.map(playlist => {
              const inPlaylist = playlist.trackIds.includes(playlistPickerTrack.id);
              return (
                <div key={playlist.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-sm font-semibold text-white truncate">{playlist.name}</span>
                  <button
                    onClick={() => {
                      if (inPlaylist) {
                        store.removeFromPlaylist(playlist.id, playlistPickerTrack.id);
                      } else {
                        store.addToPlaylist(playlist.id, playlistPickerTrack.id);
                      }
                    }}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      inPlaylist ? 'bg-red-500/20 text-red-300' : 'bg-cyan-500 text-black font-bold'
                    }`}
                  >
                    {inPlaylist ? 'Remove' : 'Add'}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                value={playlistPickerNewName}
                onChange={e => setPlaylistPickerNewName(e.target.value)}
                placeholder="Or create new playlist..."
                className="flex-1 bg-white/5 border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={() => {
                  if (playlistPickerNewName.trim()) {
                    const id = store.createPlaylist(playlistPickerNewName.trim());
                    store.addToPlaylist(id, playlistPickerTrack.id);
                    setPlaylistPickerNewName('');
                    setPlaylistPickerTrack(null);
                  }
                }}
                disabled={!playlistPickerNewName.trim()}
                className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-2xl text-xs font-bold uppercase disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  ) : null;

  // ==========================================
  // MODAL 2: PLAYLIST LIBRARY PICKER
  // ==========================================
  const playlistLibraryPickerModal = playlistLibraryPickerPlaylistId ? (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] grid place-items-center bg-black/80 backdrop-blur-xl p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setPlaylistLibraryPickerPlaylistId(null)}
      >
        <motion.div
          className="w-full max-w-2xl rounded-[32px] border border-white/15 bg-zinc-950/95 p-6 shadow-2xl"
          initial={{ scale: 0.95, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 15 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">Add Songs</span>
              <h3 className="text-xl font-bold text-white">
                {store.playlists.find(p => p.id === playlistLibraryPickerPlaylistId)?.name}
              </h3>
            </div>
            <button onClick={() => setPlaylistLibraryPickerPlaylistId(null)} className="p-2 text-white/40 hover:text-white rounded-full">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
            {store.tracks.map(track => {
              const targetPlaylist = store.playlists.find(p => p.id === playlistLibraryPickerPlaylistId);
              const alreadyAdded = targetPlaylist?.trackIds.includes(track.id);
              return (
                <div key={track.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    <img src={track.thumbnail} className="w-10 h-10 rounded-xl object-cover" alt="" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{track.title}</div>
                      <div className="text-xs text-white/40 truncate">{track.artist}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (alreadyAdded) {
                        store.removeFromPlaylist(playlistLibraryPickerPlaylistId, track.id);
                      } else {
                        store.addToPlaylist(playlistLibraryPickerPlaylistId, track.id);
                      }
                    }}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
                      alreadyAdded ? 'bg-white/10 text-white/40' : 'bg-cyan-500 text-black font-bold'
                    }`}
                  >
                    {alreadyAdded ? 'Added' : 'Add'}
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  ) : null;

  // Progress computation
  const progressPercent = store.duration > 0 && !isNaN(store.currentTime)
    ? Math.min(100, Math.max(0, (store.currentTime / store.duration) * 100))
    : 0;

  return (
    <div className="fixed inset-0 z-50 h-screen bg-[#060608] text-white flex flex-col overflow-hidden select-none">
      {/* Top Ambient Glow Field */}
      <div
        className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full pointer-events-none opacity-20 blur-[140px]"
        style={{ background: dominantGlow }}
      />
      <div
        className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full pointer-events-none opacity-15 blur-[120px]"
        style={{ background: 'rgba(6, 182, 212, 0.4)' }}
      />

      {/* Main Workspace Frame */}
      <div className="flex flex-1 overflow-hidden pt-16 pb-24">
        {sidebar}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
          <AnimatePresence mode="wait">
            {store.activeTab === 'home' && (
              <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {homeTab}
              </motion.div>
            )}
            {store.activeTab === 'search' && (
              <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {searchTab}
              </motion.div>
            )}
            {store.activeTab === 'queue' && (
              <motion.div key="queue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {queueTab}
              </motion.div>
            )}
            {store.activeTab === 'playlists' && (
              <motion.div key="playlists" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {playlistTab}
              </motion.div>
            )}
            {store.activeTab === 'library' && (
              <motion.div key="library" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {libraryTab}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ========================================== */}
      {/* APPLE MUSIC PERMANENT BOTTOM PLAYER DOCK */}
      {/* ========================================== */}
      <div className="fixed bottom-0 left-0 right-0 z-40 h-24 backdrop-blur-3xl bg-zinc-950/85 border-t border-white/10 px-6 flex items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
        {/* Left: Now Playing Song Details */}
        <div className="flex items-center gap-4 w-[280px] lg:w-[340px] shrink-0 min-w-0">
          {current ? (
            <>
              <div
                onClick={() => store.setExpanded(true)}
                className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 relative cursor-pointer group shadow-lg bg-zinc-900 border border-white/10"
                title="Expand Full Screen Player"
              >
                <img src={current.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="" />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 size={16} className="text-white" />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    onClick={() => store.setExpanded(true)}
                    className="text-sm font-bold text-white truncate hover:underline cursor-pointer"
                  >
                    {current.title}
                  </span>
                </div>
                <div className="text-xs text-white/40 truncate mt-0.5">
                  {current.artist}
                </div>
              </div>

              <button
                onClick={() => setPlaylistPickerTrack(current)}
                className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                title="Add to Playlist"
              >
                <Disc3 size={16} />
              </button>
            </>
          ) : (
            <div className="text-xs text-white/30">
              No track currently selected
            </div>
          )}
        </div>

        {/* Center: Playback Controls & Scrubber */}
        <div className="flex flex-col items-center gap-2 max-w-xl w-full px-4">
          <div className="flex items-center gap-6">
            <button
              onClick={() => store.toggleShuffle()}
              className={`transition-colors ${store.shuffle ? 'text-cyan-400' : 'text-white/40 hover:text-white'}`}
              title="Shuffle"
            >
              <Shuffle size={16} />
            </button>

            <button
              onClick={() => store.previous()}
              className="text-white/60 hover:text-white transition-colors"
              title="Previous"
            >
              <SkipBack size={19} fill="currentColor" />
            </button>

            <button
              onClick={() => store.togglePlay()}
              className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              title={store.isPlaying ? 'Pause' : 'Play'}
            >
              {store.isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
            </button>

            <button
              onClick={() => store.next()}
              className="text-white/60 hover:text-white transition-colors"
              title="Next"
            >
              <SkipForward size={19} fill="currentColor" />
            </button>

            <button
              onClick={() => store.cycleRepeat()}
              className={`transition-colors ${store.repeat !== 'none' ? 'text-cyan-400' : 'text-white/40 hover:text-white'}`}
              title={`Repeat: ${store.repeat}`}
            >
              {store.repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
            </button>
          </div>

          {/* Scrubber Timeline */}
          <div className="w-full flex items-center gap-3">
            <span className="text-[10px] font-mono text-white/40 w-8 text-right">
              {formatTime(store.currentTime)}
            </span>

            <div
              onClick={handleSeek}
              onMouseMove={handleScrubberMouseMove}
              onMouseLeave={() => { setScrubberHoverTime(null); setScrubberHoverPct(null); }}
              className="relative flex-1 h-1.5 bg-white/10 hover:h-2 rounded-full cursor-pointer transition-all group overflow-hidden"
            >
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
              {scrubberHoverPct !== null && (
                <div
                  className="absolute inset-y-0 left-0 bg-white/20 rounded-full"
                  style={{ width: `${scrubberHoverPct}%` }}
                />
              )}
            </div>

            <span className="text-[10px] font-mono text-white/40 w-8">
              {formatTime(store.duration)}
            </span>
          </div>
        </div>

        {/* Right: Master Volume, DSP Chip, Edge Lighting & Full Screen */}
        <div className="flex items-center gap-4 w-[280px] lg:w-[340px] justify-end shrink-0">
          {/* DSP Preset Chip */}
          <button
            onClick={() => store.setStudioOpen(true)}
            className={`hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-mono uppercase tracking-widest transition-all ${
              store.audioPreset === 'enhanced'
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                : store.audioPreset === 'immersive'
                ? 'bg-purple-500/10 border-purple-500/40 text-purple-300'
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
            }`}
            title="Open Audio Studio"
          >
            <Waves size={12} className="text-cyan-400" />
            <span>{store.audioPreset}</span>
          </button>

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="text-white/40 hover:text-white transition-colors">
              {isMuted || store.volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                store.setVolume(pct);
                if (isMuted) setIsMuted(false);
              }}
              className="w-20 h-1.5 bg-white/10 hover:h-2 rounded-full cursor-pointer transition-all relative overflow-hidden"
            >
              <div
                className="h-full bg-white/60 hover:bg-white rounded-full transition-all"
                style={{ width: `${isMuted ? 0 : store.volume}%` }}
              />
            </div>
          </div>

          {/* Full Screen Expander */}
          <button
            onClick={() => store.setExpanded(true)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/60 hover:text-white border border-white/10 transition-all"
            title="Expand Spatial Full-Screen Player"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* Full Screen Player Modal */}
      <FrequencyPlayer />

      {/* Interactive Sheets & Modals */}
      {playlistPickerModal}
      {playlistLibraryPickerModal}
    </div>
  );
}
