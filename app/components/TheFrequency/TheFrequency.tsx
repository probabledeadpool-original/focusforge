"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Play, Pause, SkipForward, SkipBack, Plus, Trash2, 
  Music, ListMusic, Shuffle, Repeat, Repeat1, Volume2, VolumeX, Volume1,
  Maximize2, X, Sparkles, SlidersHorizontal, Check, Disc, 
  Clock, Share2, MoreHorizontal, ExternalLink, Cast, Heart, Eye,
  FolderPlus, Waves, Radio, Activity, ArrowRight, ArrowLeft, Headphones, Zap, RefreshCw, Layers
} from 'lucide-react';
import { useFrequencyStore, Track, Playlist, AudioEnhancementPreset } from '../../../hooks/useFrequencyStore';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [addingTrack, setAddingTrack] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  // Playlist Modals & Detailed View State
  const [selectedPlaylistDetailId, setSelectedPlaylistDetailId] = useState<string | null>(null);
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [trackToAddToPlaylist, setTrackToAddToPlaylist] = useState<Track | null>(null);
  const [showAllSongsModal, setShowAllSongsModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);

  // Creatives Tab State
  const [creativeVibeInput, setCreativeVibeInput] = useState('');
  const [isGeneratingVibe, setIsGeneratingVibe] = useState(false);

  // Timeline scrubber
  const [scrubberHoverPct, setScrubberHoverPct] = useState<number | null>(null);
  const [scrubberHoverTime, setScrubberHoverTime] = useState<string | null>(null);

  const currentTrack = store.getCurrentTrack();

  useEffect(() => {
    store.hydrate();
  }, []);

  // Active playlist (only if explicitly selected)
  const activePlaylist = store.activePlaylistId
    ? store.playlists.find(p => p.id === store.activePlaylistId) || null
    : null;

  // Active playlist tracks (if playlist selected, only its tracks; otherwise entire user library)
  const activePlaylistTracks = activePlaylist
    ? activePlaylist.trackIds
        .map(id => store.tracks.find(t => t.id === id))
        .filter((t): t is Track => Boolean(t))
    : store.tracks;

  // Total duration in minutes
  const totalDurationSeconds = activePlaylistTracks.reduce((acc, t) => acc + (t.duration || 180), 0);
  const totalDurationMinutes = Math.max(1, Math.round(totalDurationSeconds / 60));

  // Filtered tracks for search or playlist view
  const displayedTracks = searchQuery.trim()
    ? store.tracks.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.artist.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : activePlaylistTracks;

  // Most played tracks (sorted by lastPlayedAt or top added)
  const mostPlayedTracks = [...store.tracks]
    .sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0))
    .slice(0, 4);

  // Add YouTube track via search or URL input
  const handleAddTrack = async (e?: React.FormEvent, customUrl?: string) => {
    if (e) e.preventDefault();
    const query = (customUrl || searchQuery).trim();
    if (!query || addingTrack) return;

    setAddingTrack(true);
    setAddError(null);
    setAddSuccess(null);

    try {
      const meta = await fetchYouTubeMeta(query);
      if (!meta) {
        setAddError('Could not resolve YouTube track. Please enter a valid YouTube link or song name.');
        setAddingTrack(false);
        return;
      }

      const color = await extractDominantColor(meta.thumbnail);
      const newTrack: Track = {
        id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
        videoId: meta.videoId,
        title: meta.title,
        artist: meta.artist,
        year: String(new Date().getFullYear()),
        thumbnail: meta.thumbnail,
        dominantColor: color,
        addedAt: Date.now(),
        sourceUrl: query.startsWith('http') ? query : `https://www.youtube.com/watch?v=${meta.videoId}`,
      };

      store.addTrack(newTrack);
      setSearchQuery('');
      setAddSuccess(`Added "${newTrack.title.slice(0, 28)}..."`);
      setTimeout(() => setAddSuccess(null), 3500);
    } catch {
      setAddError('Failed to fetch track information.');
    } finally {
      setAddingTrack(false);
    }
  };

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const id = store.createPlaylist(newPlaylistName.trim(), newPlaylistDesc.trim());
    setNewPlaylistName('');
    setNewPlaylistDesc('');
    setShowNewPlaylistModal(false);
    store.setActivePlaylistId(id);
  };

  const handleAddStarterPack = async () => {
    const starters = [
      { url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', name: 'Lofi Girl - Study Beats' },
      { url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY', name: 'Synthwave Radio - Chill Beats' },
      { url: 'https://www.youtube.com/watch?v=WPni755-Krg', name: 'Deep Focus Ambient Flow' },
      { url: 'https://www.youtube.com/watch?v=S_MOd40zlSk', name: 'Tokyo Night Drive' },
    ];
    for (const item of starters) {
      await handleAddTrack(undefined, item.url);
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

  return (
    <div className="fixed inset-0 z-50 bg-[#08090d] text-white flex flex-col overflow-hidden font-sans select-none">
      
      {/* Hidden YouTube Audio Engine Player */}
      <FrequencyPlayer />

      {/* Main 3-Column Studio Grid */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* 1. LEFT SIDEBAR: Brand Navigation & Playlist Disc List */}
        <aside className="w-64 md:w-72 bg-[#090a0e] border-r border-white/10 flex flex-col justify-between shrink-0 p-5 overflow-y-auto no-scrollbar">
          <div className="space-y-6">
            
            {/* Header Brand */}
            <div className="flex items-center gap-3 px-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-yellow-400 p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                <div className="w-full h-full bg-black rounded-full flex items-center justify-center">
                  <Disc size={16} className={`text-cyan-400 ${store.isPlaying ? 'animate-spin-slow' : ''}`} />
                </div>
              </div>
              <span className="text-base font-heading font-extrabold text-white tracking-tight">
                Creativesplaylist
              </span>
            </div>

            {/* Navigation Tabs */}
            <nav className="space-y-1">
              <button
                onClick={() => {
                  store.setActivePlaylistId(null);
                  setSelectedPlaylistDetailId(null);
                  store.setActiveTab('home');
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl font-heading text-sm font-semibold transition-all flex items-center gap-3 cursor-pointer ${
                  store.activeTab === 'home'
                    ? 'text-white bg-white/10 shadow-sm'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => {
                  setSelectedPlaylistDetailId(null);
                  store.setActiveTab('playlists');
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl font-heading text-sm font-semibold transition-all flex items-center gap-3 cursor-pointer ${
                  store.activeTab === 'playlists'
                    ? 'text-white bg-white/10 shadow-sm'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                Playlists
              </button>
              <button
                onClick={() => store.setActiveTab('creatives')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl font-heading text-sm font-semibold transition-all flex items-center gap-3 cursor-pointer ${
                  store.activeTab === 'creatives'
                    ? 'text-white bg-white/10 shadow-sm'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                Creatives
              </button>
            </nav>

            {/* PLAYLIST SECTION */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 font-bold">
                  Playlist
                </span>
                <button
                  onClick={() => setShowNewPlaylistModal(true)}
                  className="text-white/40 hover:text-cyan-400 p-1 transition-colors cursor-pointer"
                  title="Create New Playlist"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Playlists List with Circular Artwork Badges */}
              <div className="space-y-1.5">
                {store.playlists.length === 0 ? (
                  <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-center space-y-2">
                    <p className="text-[11px] text-white/40 font-sans">No playlists yet</p>
                    <button
                      onClick={() => setShowNewPlaylistModal(true)}
                      className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 uppercase tracking-wider font-bold block mx-auto"
                    >
                      + Create Playlist
                    </button>
                  </div>
                ) : (
                  store.playlists.map((playlist) => {
                    const isSelected = selectedPlaylistDetailId === playlist.id && store.activeTab === 'playlists';
                    const isPlaying = store.activePlaylistId === playlist.id && store.isPlaying;
                    const trackCount = playlist.trackIds.length;

                    return (
                      <button
                        key={playlist.id}
                        onClick={() => {
                          setSelectedPlaylistDetailId(playlist.id);
                          store.setActiveTab('playlists');
                        }}
                        className={`w-full text-left p-2 rounded-2xl flex items-center gap-3 transition-all relative group cursor-pointer ${
                          isSelected
                            ? 'bg-white/[0.08] text-white'
                            : 'hover:bg-white/[0.04] text-white/70 hover:text-white'
                        }`}
                      >
                        {/* Left Active Line Indicator (Cyan) */}
                        {isSelected && (
                          <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                        )}

                        {/* Circular Artwork Avatar */}
                        <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border border-white/15 bg-black/60 shadow-md">
                          {playlist.coverThumbnail ? (
                            <img
                              src={playlist.coverThumbnail}
                              alt={playlist.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-white/40">
                              <Music size={14} />
                            </div>
                          )}
                          {isPlaying && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs font-heading font-bold text-white tracking-tight truncate">
                            {playlist.name}
                          </span>
                          <span className="text-[10px] font-sans text-white/40 truncate">
                            {trackCount} songs
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Add Playlist Action Button */}
              <button
                onClick={() => setShowNewPlaylistModal(true)}
                className="w-full mt-2 py-2 px-4 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/60 hover:text-white font-sans text-xs font-semibold transition-all text-center cursor-pointer"
              >
                + New Playlist
              </button>
            </div>
          </div>

          {/* Sidebar Footer Mini Branding */}
          <div className="pt-4 border-t border-white/5 text-[9px] font-mono text-white/20 uppercase tracking-widest flex items-center justify-between">
            <span>FOCUS FORGE</span>
            <span>PRO AUDIO</span>
          </div>
        </aside>

        {/* 2. CENTER MAIN CONTENT: Tab Controlled Dashboard */}
        <main className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-8 space-y-8 min-w-0 bg-gradient-to-b from-[#0e0f15] via-[#08090d] to-[#050608]">
          
          {/* Top Search Bar & Action Header */}
          <div className="flex items-center justify-between gap-4">
            <form onSubmit={handleAddTrack} className="relative flex-1 max-w-lg">
              <div className="relative flex items-center">
                <Search size={16} className="absolute left-4 text-white/30 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tell me your activity or paste YouTube URL..."
                  className="w-full bg-white/[0.05] hover:bg-white/[0.08] focus:bg-white/[0.1] border border-white/10 focus:border-white/25 rounded-full pl-11 pr-24 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none transition-all font-sans"
                />
                {searchQuery.trim() && (
                  <button
                    type="submit"
                    disabled={addingTrack}
                    className="absolute right-2 px-3 py-1 bg-white text-black hover:bg-white/90 font-sans font-bold text-[10px] uppercase tracking-wider rounded-full transition-all shadow-sm cursor-pointer"
                  >
                    {addingTrack ? "Adding..." : "+ Add"}
                  </button>
                )}
              </div>
              {addSuccess && (
                <span className="absolute -bottom-5 left-4 text-[10px] text-emerald-400 font-mono">{addSuccess}</span>
              )}
              {addError && (
                <span className="absolute -bottom-5 left-4 text-[10px] text-rose-400 font-mono">{addError}</span>
              )}
            </form>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => store.setStudioOpen(true)}
                className="w-9 h-9 rounded-full bg-white/[0.05] hover:bg-white/10 text-white/60 hover:text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer"
                title="Audio Studio DSP"
              >
                <SlidersHorizontal size={15} />
              </button>
              <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 bg-zinc-800 flex items-center justify-center text-xs font-bold text-white/80">
                FF
              </div>
            </div>
          </div>

          {/* TAB 1: HOME (Exact Reference Layout) */}
          {store.activeTab === 'home' && (
            <div className="space-y-8">
              {/* Massive Hero Playlist Header */}
              <section className="space-y-2 pt-2">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-heading font-extrabold text-white tracking-tight leading-none">
                  {activePlaylist?.name || (store.tracks.length > 0 ? "My Sound Vault" : "Moodboarding")}
                </h1>
                <p className="text-xs font-sans text-white/40 tracking-wide font-medium">
                  {activePlaylistTracks.length} songs • {totalDurationMinutes} mins
                </p>
              </section>

              {/* Zero Tracks Empty State (if no songs added) */}
              {store.tracks.length === 0 ? (
                <div className="p-8 md:p-12 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-4 max-w-xl mx-auto my-8">
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-cyan-400 shadow-inner">
                    <Music size={28} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-heading font-bold text-white">Your Frequency Vault is Ready</h3>
                    <p className="text-xs font-sans text-white/40 max-w-md mx-auto">
                      Paste any YouTube link or track search in the search bar above to start building your personal soundscape.
                    </p>
                  </div>
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button
                      onClick={handleAddStarterPack}
                      disabled={addingTrack}
                      className="px-5 py-2.5 rounded-full bg-white text-black font-sans font-bold text-xs uppercase tracking-wider hover:bg-white/90 transition-all cursor-pointer shadow-lg"
                    >
                      {addingTrack ? "Loading..." : "Load Focus Starter Pack"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Section: Most Played (Square Album Cards) */}
                  {mostPlayedTracks.length > 0 && (
                    <section className="space-y-4">
                      <h2 className="text-xl font-heading font-bold text-white tracking-tight">
                        Most Played
                      </h2>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {mostPlayedTracks.map((track) => {
                          const isPlayingThis = currentTrack?.id === track.id && store.isPlaying;

                          return (
                            <div
                              key={track.id}
                              onClick={() => store.playTrack(track.id)}
                              className="group flex flex-col gap-3 p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/15 transition-all cursor-pointer shadow-lg"
                            >
                              {/* Square Artwork */}
                              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black/50 border border-white/10">
                                <img
                                  src={track.thumbnail}
                                  alt={track.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                                  isPlayingThis ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`}>
                                  <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-transform">
                                    {isPlayingThis ? <Pause size={18} fill="black" /> : <Play size={18} fill="black" className="ml-0.5" />}
                                  </div>
                                </div>
                              </div>

                              {/* Metadata */}
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-heading font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                                  {track.title}
                                </span>
                                <span className="text-[11px] font-sans text-white/40 truncate mt-0.5">
                                  {track.artist} {track.year ? `• ${track.year}` : ''}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* Section: All Songs (2-Column Track List) */}
                  <section className="space-y-4 pb-20">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-heading font-bold text-white tracking-tight">
                        All Songs
                      </h2>
                      {displayedTracks.length > 8 && (
                        <button
                          onClick={() => setShowAllSongsModal(true)}
                          className="px-3.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/70 hover:text-white text-xs font-sans font-medium transition-all cursor-pointer"
                        >
                          Show All
                        </button>
                      )}
                    </div>

                    {/* 2-Column Track Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                      {displayedTracks.slice(0, 12).map((track) => {
                        const isPlayingThis = currentTrack?.id === track.id && store.isPlaying;

                        return (
                          <div
                            key={track.id}
                            onClick={() => store.playTrack(track.id)}
                            className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group ${
                              isPlayingThis
                                ? 'bg-white/[0.08] text-white border border-white/10'
                                : 'hover:bg-white/[0.04] text-white/80'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {/* Square Art */}
                              <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-black/40">
                                <img
                                  src={track.thumbnail}
                                  alt={track.title}
                                  className="w-full h-full object-cover"
                                />
                                <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                                  isPlayingThis ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`}>
                                  {isPlayingThis ? (
                                    <Pause size={14} fill="white" className="text-white" />
                                  ) : (
                                    <Play size={14} fill="white" className="text-white ml-0.5" />
                                  )}
                                </div>
                              </div>

                              {/* Song & Artist */}
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className={`text-xs font-heading font-bold truncate ${
                                  isPlayingThis ? 'text-cyan-300' : 'text-white group-hover:text-white'
                                }`}>
                                  {track.title}
                                </span>
                                <span className="text-[11px] font-sans text-white/40 truncate">
                                  {track.artist}
                                </span>
                              </div>
                            </div>

                            {/* Duration / Actions */}
                            <div className="flex items-center gap-2 pl-2">
                              <span className="text-xs font-mono text-white/40">
                                {formatTime(track.duration || 180)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTrackToAddToPlaylist(track);
                                  setShowAddToPlaylistModal(true);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-white/30 hover:text-cyan-400 transition-opacity cursor-pointer"
                                title="Add to playlist"
                              >
                                <FolderPlus size={13} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  store.removeTrack(track.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-white/30 hover:text-rose-400 transition-opacity cursor-pointer"
                                title="Remove track"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </>
              )}
            </div>
          )}

          {/* TAB 2: PLAYLISTS PAGE INTERFACE (Dedicated Studio & Luxury Vault) */}
          {store.activeTab === 'playlists' && (
            <div className="space-y-8 pb-24 relative">
              
              {/* Background ambient lighting auras for mad premium aesthetic */}
              <div className="absolute top-10 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
              <div className="absolute top-40 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

              {/* VIEW A: DEDICATED PLAYLIST STUDIO (When a playlist is opened for detailed inspection) */}
              {selectedPlaylistDetailId && store.playlists.some(p => p.id === selectedPlaylistDetailId) ? (() => {
                const targetPlaylist = store.playlists.find(p => p.id === selectedPlaylistDetailId)!;
                const playlistTracks = targetPlaylist.trackIds
                  .map(id => store.tracks.find(t => t.id === id))
                  .filter((t): t is Track => Boolean(t));
                const playlistDurationSec = playlistTracks.reduce((acc, t) => acc + (t.duration || 180), 0);
                const isThisPlaylistPlaying = store.activePlaylistId === targetPlaylist.id && store.isPlaying;

                return (
                  <div className="space-y-8">
                    {/* Navigation Top Bar */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setSelectedPlaylistDetailId(null)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-sans font-semibold transition-all cursor-pointer group"
                      >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform text-cyan-400" />
                        <span>Back to Playlists Vault</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowQuickAddModal(true)}
                          className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-xs font-sans font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                        >
                          <Plus size={14} />
                          <span>+ Add Songs from Vault</span>
                        </button>
                        <button
                          onClick={() => {
                            store.deletePlaylist(targetPlaylist.id);
                            setSelectedPlaylistDetailId(null);
                          }}
                          className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 border border-white/10 transition-colors cursor-pointer"
                          title="Delete Playlist"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Playlist Hero Studio Banner */}
                    <div className="relative p-6 md:p-8 rounded-3xl bg-gradient-to-r from-white/[0.05] via-white/[0.02] to-transparent border border-white/10 backdrop-blur-2xl overflow-hidden shadow-2xl">
                      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 relative z-10">
                        
                        {/* Vinyl Disc & Sleeve Visual */}
                        <div className="relative group shrink-0">
                          {/* Rotating Vinyl Disc Behind Sleeve */}
                          <div className={`absolute -top-2 -right-4 w-36 h-36 md:w-44 md:h-44 rounded-full bg-black border-2 border-zinc-800 flex items-center justify-center shadow-2xl transition-transform duration-700 ${
                            isThisPlaylistPlaying ? 'animate-spin-slow' : 'group-hover:translate-x-4'
                          }`}>
                            <div className="w-16 h-16 rounded-full border border-zinc-700/50 flex items-center justify-center">
                              <div className="w-6 h-6 rounded-full bg-cyan-400/80 border border-black" />
                            </div>
                          </div>

                          {/* Square Sleeve Artwork */}
                          <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-2xl overflow-hidden border border-white/20 bg-black/80 shadow-2xl z-10">
                            {targetPlaylist.coverThumbnail ? (
                              <img
                                src={targetPlaylist.coverThumbnail}
                                alt={targetPlaylist.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-cyan-900/50 to-purple-900/50 flex flex-col items-center justify-center text-white/40 gap-2">
                                <Disc size={36} className="text-cyan-400" />
                                <span className="text-[9px] font-mono tracking-widest uppercase">STUDIO</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Title, Details & Play Triggers */}
                        <div className="flex-1 space-y-3 text-center md:text-left min-w-0">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 text-[10px] font-mono uppercase tracking-widest font-bold">
                            <Sparkles size={11} />
                            <span>CURATED STUDIO PLAYLIST</span>
                          </div>

                          <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold text-white tracking-tight leading-tight truncate">
                            {targetPlaylist.name}
                          </h1>

                          <p className="text-xs md:text-sm font-sans text-white/60 line-clamp-2 max-w-2xl">
                            {targetPlaylist.description || "Bespoke sonic curation compiled for high-performance deep work and cognitive flow."}
                          </p>

                          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2 text-xs font-mono text-white/50">
                            <span className="text-white font-bold">{playlistTracks.length} tracks</span>
                            <span>•</span>
                            <span>{Math.max(1, Math.round(playlistDurationSec / 60))} mins runtime</span>
                            <span>•</span>
                            <span className="text-cyan-300 font-semibold">DSP Synchronized</span>
                          </div>

                          {/* Action Button Row */}
                          <div className="flex items-center justify-center md:justify-start gap-3 pt-3">
                            <button
                              onClick={() => store.playPlaylist(targetPlaylist.id)}
                              className="px-6 py-3 rounded-2xl bg-white text-black font-sans font-bold text-xs uppercase tracking-wider hover:bg-white/90 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-[0_4px_25px_rgba(255,255,255,0.2)]"
                            >
                              {isThisPlaylistPlaying ? (
                                <>
                                  <Pause size={15} fill="black" />
                                  <span>Playing Playlist</span>
                                </>
                              ) : (
                                <>
                                  <Play size={15} fill="black" className="ml-0.5" />
                                  <span>Play Studio Session</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => {
                                store.playPlaylist(targetPlaylist.id);
                                if (!store.shuffle) store.toggleShuffle();
                              }}
                              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-sans text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                            >
                              <Shuffle size={14} className={store.shuffle ? "text-yellow-400" : ""} />
                              <span>Shuffle</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Playlist Tracklist Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                          <ListMusic size={16} className="text-cyan-400" />
                          <h2 className="text-base font-heading font-bold text-white tracking-tight">Curated Tracklist</h2>
                        </div>
                        <span className="text-xs font-mono text-white/40">{playlistTracks.length} Tracks Enrolled</span>
                      </div>

                      {playlistTracks.length === 0 ? (
                        <div className="p-12 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-4">
                          <Music size={32} className="text-white/20 mx-auto" />
                          <div className="space-y-1">
                            <h4 className="text-base font-heading font-bold text-white">This Playlist is Empty</h4>
                            <p className="text-xs font-sans text-white/40">Add tracks from your vault library to populate this studio session.</p>
                          </div>
                          <button
                            onClick={() => setShowQuickAddModal(true)}
                            className="px-5 py-2.5 rounded-full bg-cyan-400 text-black font-sans font-bold text-xs uppercase tracking-wider hover:bg-cyan-300 transition-all cursor-pointer shadow-lg"
                          >
                            + Add Songs from Vault
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {playlistTracks.map((track, idx) => {
                            const isPlayingThis = currentTrack?.id === track.id && store.isPlaying;

                            return (
                              <div
                                key={track.id}
                                onClick={() => store.playTrack(track.id)}
                                className={`flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer group border ${
                                  isPlayingThis
                                    ? 'bg-cyan-500/10 border-cyan-400/30 text-white shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                                    : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/5 hover:border-white/15 text-white/80'
                                }`}
                              >
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                  
                                  {/* Index or Live Audio Visualizer Equalizer */}
                                  <div className="w-7 text-center shrink-0 flex items-center justify-center">
                                    {isPlayingThis ? (
                                      <div className="flex items-end gap-0.5 h-4">
                                        <span className="w-1 bg-cyan-400 rounded-full animate-[bounce_0.8s_infinite_100ms] h-full" />
                                        <span className="w-1 bg-cyan-400 rounded-full animate-[bounce_0.6s_infinite_200ms] h-3/4" />
                                        <span className="w-1 bg-cyan-400 rounded-full animate-[bounce_0.9s_infinite_300ms] h-full" />
                                      </div>
                                    ) : (
                                      <span className="text-xs font-mono text-white/30 group-hover:hidden">
                                        {String(idx + 1).padStart(2, '0')}
                                      </span>
                                    )}
                                    <Play size={12} fill="white" className="hidden group-hover:block text-white" />
                                  </div>

                                  {/* Artwork */}
                                  <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-black">
                                    <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                                  </div>

                                  {/* Title & Artist */}
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <span className={`text-xs font-heading font-bold truncate ${
                                      isPlayingThis ? 'text-cyan-300' : 'text-white'
                                    }`}>
                                      {track.title}
                                    </span>
                                    <span className="text-[11px] font-sans text-white/40 truncate">
                                      {track.artist} {track.year ? `• ${track.year}` : ''}
                                    </span>
                                  </div>
                                </div>

                                {/* Duration & Remove Action */}
                                <div className="flex items-center gap-3 pl-3">
                                  <span className="text-xs font-mono text-white/40">
                                    {formatTime(track.duration || 180)}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      store.removeFromPlaylist(targetPlaylist.id, track.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-white/30 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                                    title="Remove from playlist"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })() : (
                
                /* VIEW B: PLAYLISTS SHOWCASE VAULT (High-Level Overview Grid) */
                <div className="space-y-8">
                  {/* Premium HUD Header with Statistics */}
                  <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-cyan-950/30 via-black to-[#0c0e14] border border-white/10 backdrop-blur-2xl relative overflow-hidden shadow-2xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                          <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-widest">
                            STUDIO ARCHIVE • CURATOR SUITE
                          </span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-heading font-extrabold text-white tracking-tight">
                          Playlists Vault
                        </h1>
                        <p className="text-xs md:text-sm font-sans text-white/50 max-w-xl">
                          Architect dedicated moodboards, study sprints, and binaural session playlists with high-fidelity mastering.
                        </p>
                      </div>

                      {/* Stat Metrics & Create Action */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                          <span className="text-[9px] font-mono text-white/40 block uppercase tracking-wider">Playlists</span>
                          <span className="text-base font-mono font-bold text-white">{store.playlists.length}</span>
                        </div>
                        <div className="px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                          <span className="text-[9px] font-mono text-white/40 block uppercase tracking-wider">Tracks</span>
                          <span className="text-base font-mono font-bold text-cyan-300">
                            {store.playlists.reduce((acc, p) => acc + p.trackIds.length, 0)}
                          </span>
                        </div>
                        <button
                          onClick={() => setShowNewPlaylistModal(true)}
                          className="px-6 py-3 rounded-2xl bg-white text-black font-sans font-bold text-xs uppercase tracking-wider hover:bg-white/90 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-[0_4px_25px_rgba(255,255,255,0.25)]"
                        >
                          <Plus size={15} />
                          <span>Create Playlist</span>
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* Playlists 3D Showcase Grid */}
                  {store.playlists.length === 0 ? (
                    <div className="p-12 md:p-16 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-4 max-w-lg mx-auto">
                      <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center mx-auto text-cyan-400 shadow-inner">
                        <FolderPlus size={28} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-heading font-bold text-white">No Playlists Created Yet</h3>
                        <p className="text-xs font-sans text-white/40">
                          Create custom playlists to group and sequence tracks from your master audio vault.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowNewPlaylistModal(true)}
                        className="px-6 py-2.5 rounded-full bg-white text-black font-sans font-bold text-xs uppercase tracking-wider hover:bg-white/90 transition-all cursor-pointer shadow-lg"
                      >
                        + Create First Playlist
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {store.playlists.map((playlist) => {
                        const tracksInPlaylist = playlist.trackIds
                          .map(id => store.tracks.find(t => t.id === id))
                          .filter((t): t is Track => Boolean(t));
                        const isPlayingThis = store.activePlaylistId === playlist.id && store.isPlaying;

                        return (
                          <div
                            key={playlist.id}
                            className="group relative p-5 rounded-3xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] hover:from-white/[0.08] hover:to-white/[0.03] border border-white/10 hover:border-white/20 transition-all duration-300 flex flex-col justify-between gap-4 shadow-2xl overflow-hidden"
                          >
                            {/* Card Glow Layer */}
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/10 group-hover:bg-cyan-500/20 rounded-full blur-2xl transition-all pointer-events-none" />

                            <div className="space-y-4">
                              {/* Vinyl Disc Sticking Out Effect */}
                              <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-black/60 border border-white/10">
                                {playlist.coverThumbnail ? (
                                  <img
                                    src={playlist.coverThumbnail}
                                    alt={playlist.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center text-white/20">
                                    <Disc size={36} className={isPlayingThis ? "animate-spin-slow text-cyan-400" : ""} />
                                  </div>
                                )}

                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                                {/* Play Trigger Floating Button */}
                                <button
                                  onClick={() => store.playPlaylist(playlist.id)}
                                  className="absolute bottom-3 right-3 w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                                  title="Play Playlist"
                                >
                                  {isPlayingThis ? <Pause size={16} fill="black" /> : <Play size={16} fill="black" className="ml-0.5" />}
                                </button>

                                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-mono text-cyan-300 font-bold uppercase tracking-wider">
                                  {tracksInPlaylist.length} {tracksInPlaylist.length === 1 ? 'TRACK' : 'TRACKS'}
                                </div>
                              </div>

                              {/* Info */}
                              <div className="space-y-1">
                                <h3 className="text-lg font-heading font-bold text-white tracking-tight truncate group-hover:text-cyan-300 transition-colors">
                                  {playlist.name}
                                </h3>
                                <p className="text-xs font-sans text-white/40 line-clamp-2 leading-relaxed">
                                  {playlist.description || "Custom study moodboard and focus sequence."}
                                </p>
                              </div>
                            </div>

                            {/* Card Footer Actions */}
                            <div className="flex items-center justify-between pt-3 border-t border-white/10">
                              <button
                                onClick={() => setSelectedPlaylistDetailId(playlist.id)}
                                className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-sans text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <span>Open Studio</span>
                                <ArrowRight size={12} className="text-cyan-400" />
                              </button>

                              <button
                                onClick={() => store.deletePlaylist(playlist.id)}
                                className="p-2 rounded-xl text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Delete Playlist"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB 3: CREATIVES PAGE INTERFACE (Soundscape & Mood Generator) */}
          {store.activeTab === 'creatives' && (
            <div className="space-y-6 pb-20">
              <div className="border-b border-white/10 pb-4">
                <h1 className="text-4xl font-heading font-extrabold text-white tracking-tight">Creatives & Sonic Lab</h1>
                <p className="text-xs font-sans text-white/40 mt-1">Design ambient generative focus states, binaural tones, and moodboards</p>
              </div>

              {/* Quick Vibe Generators */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { title: "Binaural 40Hz Gamma", desc: "Pure focus wave harmonics for peak memory retention", url: "https://www.youtube.com/watch?v=WPni755-Krg", tag: "COGNITIVE" },
                  { title: "Neo-Tokyo Cyber Nocturne", desc: "Subtle synthesized dark ambient rain soundscapes", url: "https://www.youtube.com/watch?v=S_MOd40zlSk", tag: "NIGHT FLOW" },
                  { title: "Neoclassical Piano Solitude", desc: "Gentle felt piano acoustic keys with zero vocals", url: "https://www.youtube.com/watch?v=jfKfPfyJRdk", tag: "STUDY" },
                  { title: "Synthwave Horizon", desc: "Retro-futuristic analog pulses for fast-paced sprints", url: "https://www.youtube.com/watch?v=4xDzrJKXOOY", tag: "ENERGY" },
                  { title: "Ambient Lo-Fi Radio", desc: "Warm vinyl crackle and chill acoustic instruments", url: "https://www.youtube.com/watch?v=Ui7Hb4cvamY", tag: "CHILL" },
                  { title: "Atmospheric Deep Sleep & Calm", desc: "Sub-bass theta drone for deep recovery and reset", url: "https://www.youtube.com/watch?v=df4p7bP_MaY", tag: "RECOVERY" }
                ].map((preset, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-3xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-cyan-400/30 transition-all flex flex-col justify-between gap-4 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono font-bold text-cyan-400 uppercase tracking-widest px-2 py-0.5 rounded-full bg-cyan-400/10 border border-cyan-400/20">{preset.tag}</span>
                        <Waves size={16} className="text-white/30 group-hover:text-cyan-400 transition-colors" />
                      </div>
                      <h3 className="text-base font-heading font-bold text-white">{preset.title}</h3>
                      <p className="text-xs font-sans text-white/50">{preset.desc}</p>
                    </div>

                    <button
                      onClick={() => handleAddTrack(undefined, preset.url)}
                      className="w-full py-2.5 rounded-xl bg-white/5 group-hover:bg-white text-white/70 group-hover:text-black font-sans font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Import into Vault</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Hardware DSP & Edge Lighting Matrix CTA */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-black border border-cyan-500/20 flex items-center justify-between gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-cyan-400" />
                    <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-widest">Web Audio DSP Studio Pro</span>
                  </div>
                  <h3 className="text-xl font-heading font-bold text-white">Psychoacoustic Mastering & Screen Edge Lighting</h3>
                  <p className="text-xs font-sans text-white/50 max-w-xl">
                    Configure real-time 6-band parametric EQ, bass harmonic saturators, spatial 3D stereo expanders, and real-time screen perimeter ambient glow.
                  </p>
                </div>

                <button
                  onClick={() => store.setStudioOpen(true)}
                  className="px-6 py-3 rounded-2xl bg-cyan-400 text-black font-sans font-bold text-xs uppercase tracking-wider hover:bg-cyan-300 transition-all shrink-0 cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                >
                  Open DSP Studio
                </button>
              </div>
            </div>
          )}
        </main>

        {/* 3. RIGHT SIDEBAR: Now Playing Track Details (Replacing Andrew Smith) */}
        <aside className="w-80 lg:w-96 bg-[#090a0e] border-l border-white/10 p-6 flex flex-col justify-between shrink-0 overflow-y-auto no-scrollbar space-y-6">
          <div className="space-y-6">
            
            {/* Playing Track High-Res Artwork Card */}
            <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-black group/art">
              {currentTrack?.thumbnail ? (
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title || "Now Playing"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/20 gap-2">
                  <Disc size={40} className={store.isPlaying ? "animate-spin-slow text-cyan-400" : ""} />
                  <span className="text-[10px] font-mono uppercase tracking-widest">No Active Track</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
              
              {/* Floating Frosted Glass Full Screen Button on Artwork */}
              {currentTrack && (
                <button
                  onClick={() => store.setExpanded(true)}
                  className="absolute top-3 right-3 py-1.5 px-3 rounded-xl bg-black/40 hover:bg-white/20 active:scale-95 backdrop-blur-xl border border-white/20 text-white font-sans text-[11px] font-semibold transition-all flex items-center gap-1.5 shadow-lg cursor-pointer"
                  title="Open Full Screen Player"
                >
                  <Maximize2 size={12} className="text-cyan-300" />
                  <span>Full Screen</span>
                </button>
              )}

              <div className="absolute bottom-3 left-4 right-4 space-y-0.5">
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-cyan-300 font-bold flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${store.isPlaying ? 'bg-cyan-400 animate-ping' : 'bg-white/40'}`} />
                  {store.isPlaying ? "NOW PLAYING" : "STANDBY"}
                </span>
                <span className="text-base font-heading font-extrabold text-white tracking-tight truncate block">
                  {currentTrack?.artist || "The Frequency Radio"}
                </span>
              </div>
            </div>

            {/* Track Info & Sonic Analysis */}
            <div className="space-y-2">
              <span className="text-xs font-heading font-bold text-white tracking-wide block">
                {currentTrack?.title || "Ambient Lo-Fi & Neural Beats"}
              </span>
              <p className="text-xs font-sans text-white/60 leading-relaxed font-normal">
                {currentTrack 
                  ? `High-fidelity audio stream from ${currentTrack.artist}. Synchronized with Web Audio DSP ${store.audioPreset.toUpperCase()} filter and perimeter edge lighting.`
                  : "Finding clarity and concentration through music, even when everything around feels loud and distracting. Each note creates a small space of calm."
                }
              </p>
            </div>

            {/* Real Track Metrics Footer */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div className="space-y-0.5">
                <span className="text-[10px] font-sans text-white/40 block">Duration</span>
                <span className="text-sm font-mono font-bold text-white tracking-tight">
                  {currentTrack?.duration ? formatTime(currentTrack.duration) : "Live Stream"}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-sans text-white/40 block">DSP Profile</span>
                <span className="text-sm font-mono font-bold text-cyan-300 tracking-tight uppercase">
                  {store.audioPreset}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Track Actions */}
          <div className="space-y-2.5 pt-4 border-t border-white/5">
            {/* Frosted Glass Full Screen Button */}
            {currentTrack && (
              <button
                onClick={() => store.setExpanded(true)}
                className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-[0.98] backdrop-blur-xl border border-white/20 hover:border-white/35 text-white font-sans text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_8px_25px_rgba(0,0,0,0.4)] group"
              >
                <Maximize2 size={15} className="text-cyan-300 group-hover:scale-110 transition-transform" />
                <span>Full Screen</span>
              </button>
            )}

            {currentTrack && (
              <button
                onClick={() => {
                  setTrackToAddToPlaylist(currentTrack);
                  setShowAddToPlaylistModal(true);
                }}
                className="w-full py-2 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white font-sans text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <FolderPlus size={13} />
                <span>Save to Playlist</span>
              </button>
            )}

            <button
              onClick={() => store.setStudioOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-sans text-xs font-bold transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
            >
              <SlidersHorizontal size={14} />
              <span>Studio DSP & Edge Glow</span>
            </button>
          </div>
        </aside>
      </div>

      {/* 4. BOTTOM STICKY PLAYER BAR */}
      <footer className="h-20 bg-[#07080b] border-t border-white/10 px-6 flex items-center justify-between shrink-0 relative z-30">
        
        {/* Left: Current Track Thumbnail & Info */}
        <div className="flex items-center gap-3 min-w-0 w-1/4">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/15 bg-black">
            {currentTrack?.thumbnail ? (
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title || "Track"}
                className={`w-full h-full object-cover ${store.isPlaying ? 'animate-spin-slow' : ''}`}
              />
            ) : (
              <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-white/30">
                <Disc size={20} />
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-heading font-bold text-white truncate">
              {currentTrack?.title || "No Track Selected"}
            </span>
            <span className="text-[11px] font-sans text-white/40 truncate">
              {currentTrack?.artist || "The Frequency"} {currentTrack?.year ? `• ${currentTrack.year}` : ''}
            </span>
          </div>
        </div>

        {/* Center: Playback Controls & Timeline Scrubber */}
        <div className="flex flex-col items-center gap-1.5 flex-1 max-w-xl px-4">
          
          {/* Controls Buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => store.toggleShuffle()}
              className={`transition-colors p-1 cursor-pointer ${store.shuffle ? 'text-yellow-400' : 'text-white/30 hover:text-white'}`}
              title="Shuffle"
            >
              <Shuffle size={14} />
            </button>

            <button
              onClick={() => store.previous()}
              className="text-white/60 hover:text-white transition-colors p-1 cursor-pointer"
              title="Previous"
            >
              <SkipBack size={16} fill="currentColor" />
            </button>

            <button
              onClick={() => store.togglePlay()}
              className="w-9 h-9 rounded-full bg-white text-black hover:bg-white/90 flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
              title={store.isPlaying ? "Pause" : "Play"}
            >
              {store.isPlaying ? <Pause size={16} fill="black" /> : <Play size={16} fill="black" className="ml-0.5" />}
            </button>

            <button
              onClick={() => store.next()}
              className="text-white/60 hover:text-white transition-colors p-1 cursor-pointer"
              title="Next"
            >
              <SkipForward size={16} fill="currentColor" />
            </button>

            <button
              onClick={() => store.cycleRepeat()}
              className={`transition-colors p-1 cursor-pointer ${store.repeat !== 'none' ? 'text-yellow-400' : 'text-white/30 hover:text-white'}`}
              title="Repeat"
            >
              {store.repeat === 'one' ? <Repeat1 size={14} /> : <Repeat size={14} />}
            </button>
          </div>

          {/* Timeline Scrubber */}
          <div className="w-full flex items-center gap-3">
            <span className="text-[10px] font-mono text-white/40 w-9 text-right">
              {formatTime(store.currentTime)}
            </span>

            <div
              onClick={handleSeek}
              onMouseMove={handleScrubberMouseMove}
              onMouseLeave={() => { setScrubberHoverPct(null); setScrubberHoverTime(null); }}
              className="flex-1 h-1.5 bg-white/10 hover:h-2 rounded-full overflow-hidden cursor-pointer relative transition-all"
            >
              <div
                className="h-full bg-white rounded-full transition-[width] duration-150"
                style={{
                  width: store.duration > 0
                    ? `${Math.min(100, Math.max(0, (store.currentTime / store.duration) * 100))}%`
                    : '0%'
                }}
              />
            </div>

            <span className="text-[10px] font-mono text-white/40 w-9 text-left">
              {formatTime(store.duration)}
            </span>
          </div>
        </div>

        {/* Right: Volume, Full Screen & DSP EQ Modal Trigger */}
        <div className="flex items-center justify-end gap-3 w-1/4">
          {currentTrack && (
            <button
              onClick={() => store.setExpanded(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-xl border border-white/20 hover:border-white/30 text-white text-xs font-sans font-semibold transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)] cursor-pointer group"
              title="Switch to Full Screen Player"
            >
              <Maximize2 size={13} className="text-cyan-300 group-hover:scale-110 transition-transform" />
              <span>Full Screen</span>
            </button>
          )}

          <button
            onClick={() => store.setStudioOpen(true)}
            className="px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[9px] font-mono uppercase tracking-wider text-cyan-300 font-bold cursor-pointer"
            title="Open Audio Studio"
          >
            {store.audioPreset.toUpperCase()}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => store.setVolume(store.volume > 0 ? 0 : 80)}
              className="text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              {store.volume === 0 ? <VolumeX size={16} /> : store.volume < 50 ? <Volume1 size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={store.volume}
              onChange={(e) => store.setVolume(Number(e.target.value))}
              className="w-20 h-1 bg-white/20 rounded-full appearance-none accent-white cursor-pointer"
            />
          </div>
        </div>
      </footer>

      {/* New Playlist Modal */}
      <AnimatePresence>
        {showNewPlaylistModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0e0f15] border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-heading text-lg font-bold text-white">Create New Playlist</h3>
                <button onClick={() => setShowNewPlaylistModal(false)} className="text-white/40 hover:text-white cursor-pointer">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleCreatePlaylist} className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-white/40 block mb-1">Playlist Name</label>
                  <input
                    type="text"
                    required
                    value={newPlaylistName}
                    onChange={e => setNewPlaylistName(e.target.value)}
                    placeholder="e.g. Late Night Coding"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-sans"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-white/40 block mb-1">Description</label>
                  <textarea
                    value={newPlaylistDesc}
                    onChange={e => setNewPlaylistDesc(e.target.value)}
                    placeholder="Describe the sonic vibe..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-sans h-20 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-white text-black font-sans font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Create Playlist
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add To Playlist Modal */}
      <AnimatePresence>
        {showAddToPlaylistModal && trackToAddToPlaylist && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0e0f15] border border-white/15 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-heading text-base font-bold text-white truncate">Add to Playlist</h3>
                <button onClick={() => setShowAddToPlaylistModal(false)} className="text-white/40 hover:text-white cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                {store.playlists.length === 0 ? (
                  <p className="text-xs text-white/40 text-center py-4">No playlists yet. Create one first!</p>
                ) : (
                  store.playlists.map(pl => (
                    <button
                      key={pl.id}
                      onClick={() => {
                        store.addToPlaylist(pl.id, trackToAddToPlaylist.id);
                        setShowAddToPlaylistModal(false);
                      }}
                      className="w-full text-left p-2.5 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-bold text-white">{pl.name}</span>
                      <span className="text-[10px] text-white/40 font-mono">{pl.trackIds.length} tracks</span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Show All Songs Modal */}
      <AnimatePresence>
        {showAllSongsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0e0f15] border border-white/15 rounded-3xl p-6 max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div>
                  <h3 className="font-heading text-xl font-bold text-white">Full Library Vault</h3>
                  <p className="text-xs font-sans text-white/40">{store.tracks.length} tracks registered in memory</p>
                </div>
                <button onClick={() => setShowAllSongsModal(false)} className="text-white/40 hover:text-white p-2 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-1">
                {store.tracks.map((track) => (
                  <div
                    key={track.id}
                    onClick={() => {
                      store.playTrack(track.id);
                      setShowAllSongsModal(false);
                    }}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/10">
                        <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-heading font-bold text-white truncate group-hover:text-cyan-300">
                          {track.title}
                        </span>
                        <span className="text-[11px] font-sans text-white/40 truncate">
                          {track.artist}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-white/40">
                      {formatTime(track.duration || 180)}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Add Songs to Active Playlist Modal */}
      <AnimatePresence>
        {showQuickAddModal && selectedPlaylistDetailId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-xl">
            {(() => {
              const targetPlaylist = store.playlists.find(p => p.id === selectedPlaylistDetailId);
              if (!targetPlaylist) return null;

              return (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-[#0e0f15] border border-white/15 rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                    <div>
                      <h3 className="font-heading text-lg font-bold text-white">Add Songs to "{targetPlaylist.name}"</h3>
                      <p className="text-xs font-sans text-white/40">Select tracks from your vault library to include in this playlist</p>
                    </div>
                    <button onClick={() => setShowQuickAddModal(false)} className="text-white/40 hover:text-white p-2 cursor-pointer">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-1">
                    {store.tracks.length === 0 ? (
                      <p className="text-xs text-white/40 text-center py-8">No tracks found in your library vault.</p>
                    ) : (
                      store.tracks.map((track) => {
                        const isAlreadyIn = targetPlaylist.trackIds.includes(track.id);

                        return (
                          <div
                            key={track.id}
                            onClick={() => {
                              if (isAlreadyIn) {
                                store.removeFromPlaylist(targetPlaylist.id, track.id);
                              } else {
                                store.addToPlaylist(targetPlaylist.id, track.id);
                              }
                            }}
                            className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                              isAlreadyIn
                                ? 'bg-cyan-500/10 border-cyan-400/30 text-white'
                                : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5 text-white/80'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/10">
                                <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className={`text-xs font-heading font-bold truncate ${isAlreadyIn ? 'text-cyan-300' : 'text-white'}`}>
                                  {track.title}
                                </span>
                                <span className="text-[11px] font-sans text-white/40 truncate">
                                  {track.artist}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 pl-3">
                              <span className="text-xs font-mono text-white/40">
                                {formatTime(track.duration || 180)}
                              </span>
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                isAlreadyIn
                                  ? 'bg-cyan-400 text-black shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                                  : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white'
                              }`}>
                                {isAlreadyIn ? <Check size={14} /> : <Plus size={14} />}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="pt-4 border-t border-white/10 flex justify-end">
                    <button
                      onClick={() => setShowQuickAddModal(false)}
                      className="px-6 py-2.5 rounded-xl bg-white text-black font-sans font-bold text-xs uppercase tracking-wider hover:bg-white/90 transition-all cursor-pointer shadow-lg"
                    >
                      Done
                    </button>
                  </div>
                </motion.div>
              );
            })()}
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
