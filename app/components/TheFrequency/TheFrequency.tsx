"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Play, Pause, SkipForward, SkipBack, Plus, Trash2, 
  Music, ListMusic, Shuffle, Repeat, Repeat1, Volume2, VolumeX, Volume1,
  Maximize2, X, Sparkles, SlidersHorizontal, Check, Disc, 
  Clock, Share2, MoreHorizontal, ExternalLink, Cast, Heart, Eye
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

  // Playlist state
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'playlists' | 'creatives'>('home');
  const [showAllSongsModal, setShowAllSongsModal] = useState(false);

  // Timeline scrubber
  const [scrubberHoverPct, setScrubberHoverPct] = useState<number | null>(null);
  const [scrubberHoverTime, setScrubberHoverTime] = useState<string | null>(null);

  const currentTrack = store.getCurrentTrack();

  useEffect(() => {
    store.hydrate();
  }, []);

  // Determine active playlist
  const activePlaylist = store.playlists.find(p => p.id === store.activePlaylistId) || store.playlists[0] || null;

  // Active playlist tracks
  const activePlaylistTracks = activePlaylist
    ? activePlaylist.trackIds
        .map(id => store.tracks.find(t => t.id === id))
        .filter((t): t is Track => Boolean(t))
    : store.tracks;

  // Total duration in minutes
  const totalDurationSeconds = activePlaylistTracks.reduce((acc, t) => acc + (t.duration || 180), 0);
  const totalDurationMinutes = Math.max(1, Math.round(totalDurationSeconds / 60));

  // Filtered tracks for search
  const displayedTracks = searchQuery.trim()
    ? store.tracks.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.artist.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : activePlaylistTracks.length > 0 ? activePlaylistTracks : store.tracks;

  // Most played tracks (sorted by lastPlayedAt or top 4)
  const mostPlayedTracks = [...store.tracks]
    .sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0))
    .slice(0, 4);

  // Add YouTube track via search or URL input
  const handleAddTrack = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
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
                  <Disc size={16} className="text-cyan-400 animate-spin-slow" />
                </div>
              </div>
              <span className="text-base font-heading font-extrabold text-white tracking-tight">
                Creativesplaylist
              </span>
            </div>

            {/* Navigation Tabs */}
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('home')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl font-heading text-sm font-semibold transition-all flex items-center gap-3 ${
                  activeTab === 'home'
                    ? 'text-white bg-white/10 shadow-sm'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => setActiveTab('playlists')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl font-heading text-sm font-semibold transition-all flex items-center gap-3 ${
                  activeTab === 'playlists'
                    ? 'text-white bg-white/10 shadow-sm'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                Playlists
              </button>
              <button
                onClick={() => setActiveTab('creatives')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl font-heading text-sm font-semibold transition-all flex items-center gap-3 ${
                  activeTab === 'creatives'
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
                  className="text-white/40 hover:text-cyan-400 p-1 transition-colors"
                  title="Create New Playlist"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Playlists List with Circular Artwork Badges */}
              <div className="space-y-1.5">
                {store.playlists.map((playlist) => {
                  const isSelected = activePlaylist?.id === playlist.id;
                  const trackCount = playlist.trackIds.length;

                  return (
                    <button
                      key={playlist.id}
                      onClick={() => store.setActivePlaylistId(playlist.id)}
                      className={`w-full text-left p-2 rounded-2xl flex items-center gap-3 transition-all relative group cursor-pointer ${
                        isSelected
                          ? 'bg-white/[0.08] text-white'
                          : 'hover:bg-white/[0.04] text-white/70 hover:text-white'
                      }`}
                    >
                      {/* Left Active Line Indicator (Gold / Cyan) */}
                      {isSelected && (
                        <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
                      )}

                      {/* Circular Artwork Avatar */}
                      <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border border-white/15 bg-black/60 shadow-md">
                        <img
                          src={playlist.coverThumbnail || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=300&auto=format&fit=crop'}
                          alt={playlist.name}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && store.isPlaying && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
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
                })}
              </div>

              {/* See More / Add Playlist Action Button */}
              <button
                onClick={() => setShowNewPlaylistModal(true)}
                className="w-full mt-2 py-2 px-4 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/60 hover:text-white font-sans text-xs font-semibold transition-all text-center"
              >
                See More
              </button>
            </div>
          </div>

          {/* Sidebar Footer Mini Branding */}
          <div className="pt-4 border-t border-white/5 text-[9px] font-mono text-white/20 uppercase tracking-widest flex items-center justify-between">
            <span>FOCUS FORGE</span>
            <span>V2.4</span>
          </div>
        </aside>

        {/* 2. CENTER MAIN CONTENT: Hero Banner, Most Played, & All Songs */}
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
                    className="absolute right-2 px-3 py-1 bg-white text-black hover:bg-white/90 font-sans font-bold text-[10px] uppercase tracking-wider rounded-full transition-all shadow-sm"
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
                className="w-9 h-9 rounded-full bg-white/[0.05] hover:bg-white/10 text-white/60 hover:text-white border border-white/10 flex items-center justify-center transition-all"
                title="Audio Studio DSP"
              >
                <SlidersHorizontal size={15} />
              </button>
              <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 bg-zinc-800">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop"
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Massive Hero Playlist Header */}
          <section className="space-y-2 pt-2">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-heading font-extrabold text-white tracking-tight leading-none">
              {activePlaylist?.name || "Moodboarding"}
            </h1>
            <p className="text-xs font-sans text-white/40 tracking-wide font-medium">
              {activePlaylistTracks.length} songs • {totalDurationMinutes} mins
            </p>
          </section>

          {/* Section: Most Played (Square Album Cards) */}
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

          {/* Section: All Songs (2-Column Track List) */}
          <section className="space-y-4 pb-20">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-heading font-bold text-white tracking-tight">
                All Songs
              </h2>
              <button
                onClick={() => setShowAllSongsModal(true)}
                className="px-3.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/70 hover:text-white text-xs font-sans font-medium transition-all"
              >
                Show All
              </button>
            </div>

            {/* 2-Column Track Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              {displayedTracks.slice(0, 10).map((track) => {
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

                    {/* Duration / Options */}
                    <div className="flex items-center gap-3 pl-2">
                      <span className="text-xs font-mono text-white/40">
                        {formatTime(track.duration || 180)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          store.removeTrack(track.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-white/30 hover:text-rose-400 transition-opacity"
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
        </main>

        {/* 3. RIGHT SIDEBAR: Featured Workspace Card & Curator Info */}
        <aside className="w-80 lg:w-96 bg-[#090a0e] border-l border-white/10 p-6 flex flex-col justify-between shrink-0 overflow-y-auto no-scrollbar space-y-6">
          <div className="space-y-6">
            
            {/* Featured Workspace / Setup Image */}
            <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-black">
              <img
                src="https://images.unsplash.com/photo-1587620962725-abab7fe55159?q=80&w=800&auto=format&fit=crop"
                alt="Workspace Atmosphere"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/50 block">
                  Playlist by
                </span>
                <span className="text-sm font-heading font-extrabold text-white tracking-tight">
                  {activePlaylist?.curator || "Andrew Smith"}
                </span>
              </div>
            </div>

            {/* About the playlist */}
            <div className="space-y-2">
              <span className="text-xs font-heading font-bold text-white tracking-wide block">
                About the playlist
              </span>
              <p className="text-xs font-sans text-white/60 leading-relaxed font-normal">
                {activePlaylist?.description || "Finding clarity and concentration through music, even when everything around feels loud and distracting. Each note creates a small space of calm, helping me stay grounded, focused, and connected to what truly matters."}
              </p>
            </div>

            {/* Playlist Stats Footer */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div className="space-y-0.5">
                <span className="text-[10px] font-sans text-white/40 block">Listeners</span>
                <span className="text-sm font-mono font-bold text-white tracking-tight">12,750,908</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-sans text-white/40 block">Saved</span>
                <span className="text-sm font-mono font-bold text-white tracking-tight">25,739</span>
              </div>
            </div>
          </div>

          {/* Curator Quick Actions */}
          <div className="space-y-2 pt-4 border-t border-white/5">
            <button
              onClick={() => store.setStudioOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-sans text-xs font-bold transition-all text-center flex items-center justify-center gap-2"
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
            <img
              src={currentTrack?.thumbnail || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=200&auto=format&fit=crop'}
              alt={currentTrack?.title || "Track"}
              className={`w-full h-full object-cover ${store.isPlaying ? 'animate-spin-slow' : ''}`}
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-heading font-bold text-white truncate">
              {currentTrack?.title || "The Roughest Trade"}
            </span>
            <span className="text-[11px] font-sans text-white/40 truncate">
              {currentTrack?.artist || "Nils Frahm"} {currentTrack?.year ? `• ${currentTrack.year}` : '• 2019'}
            </span>
          </div>
        </div>

        {/* Center: Playback Controls & Timeline Scrubber */}
        <div className="flex flex-col items-center gap-1.5 flex-1 max-w-xl px-4">
          
          {/* Controls Buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => store.toggleShuffle()}
              className={`transition-colors p-1 ${store.shuffle ? 'text-yellow-400' : 'text-white/30 hover:text-white'}`}
              title="Shuffle"
            >
              <Shuffle size={14} />
            </button>

            <button
              onClick={() => store.previous()}
              className="text-white/60 hover:text-white transition-colors p-1"
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
              className="text-white/60 hover:text-white transition-colors p-1"
              title="Next"
            >
              <SkipForward size={16} fill="currentColor" />
            </button>

            <button
              onClick={() => store.cycleRepeat()}
              className={`transition-colors p-1 ${store.repeat !== 'none' ? 'text-yellow-400' : 'text-white/30 hover:text-white'}`}
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

        {/* Right: Volume & DSP EQ Modal Trigger */}
        <div className="flex items-center justify-end gap-3 w-1/4">
          <button
            onClick={() => store.setStudioOpen(true)}
            className="px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[9px] font-mono uppercase tracking-wider text-cyan-300 font-bold"
            title="Open Audio Studio"
          >
            {store.audioPreset.toUpperCase()}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => store.setVolume(store.volume > 0 ? 0 : 80)}
              className="text-white/50 hover:text-white transition-colors"
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
                <button onClick={() => setShowNewPlaylistModal(false)} className="text-white/40 hover:text-white">
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
                  className="w-full py-3 rounded-xl bg-white text-black font-sans font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity"
                >
                  Create Playlist
                </button>
              </form>
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
                <button onClick={() => setShowAllSongsModal(false)} className="text-white/40 hover:text-white p-2">
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

    </div>
  );
}
