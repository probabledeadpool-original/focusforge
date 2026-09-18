"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Play, Pause, SkipForward, SkipBack, Plus, Trash2, 
  Music, ListMusic, Shuffle, Repeat, Repeat1, Volume2, VolumeX, Volume1,
  Maximize2, X, Sparkles, SlidersHorizontal, Check, Disc, 
  FolderPlus, Waves, ArrowLeft, ChevronLeft
} from 'lucide-react';
import { useFrequencyStore, Track } from '../../../hooks/useFrequencyStore';
import FrequencyPlayer from './FrequencyPlayer';
import { fetchYouTubeMeta, extractDominantColor } from '../SonicVaultUtils';

const formatTime = (s: number) => {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
};

interface TheFrequencyProps {
  onBack?: () => void;
}

export default function TheFrequency({ onBack }: TheFrequencyProps) {
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
        setAddError('Could not resolve track. Please enter a valid YouTube link or song name.');
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
      setAddSuccess(`Added "${newTrack.title.slice(0, 24)}..."`);
      setTimeout(() => setAddSuccess(null), 3000);
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
    setSelectedPlaylistDetailId(id);
    store.setActiveTab('playlists');
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

  return (
    <div className="fixed inset-0 z-50 bg-[#06070a] text-white flex flex-col overflow-hidden font-sans select-none">
      
      {/* Hidden YouTube Audio Engine Player */}
      <FrequencyPlayer />

      {/* Main Apple Pro 2-Column Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* 1. LEFT SIDEBAR: Clean Apple Frosted Glass Navigation */}
        <aside className="w-56 lg:w-64 bg-[#0a0b10]/95 border-r border-white/[0.06] backdrop-blur-2xl flex flex-col justify-between shrink-0 p-4 lg:p-5 overflow-y-auto no-scrollbar">
          <div className="space-y-6">
            
            {/* Header Brand */}
            <div className="flex items-center gap-3 px-1 pt-1">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-500 p-0.5 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                <div className="w-full h-full bg-black rounded-[10px] flex items-center justify-center">
                  <Disc size={14} className={`text-cyan-400 ${store.isPlaying ? 'animate-spin-slow' : ''}`} />
                </div>
              </div>
              <span className="text-sm font-semibold text-white tracking-tight">
                The Frequency
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
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2.5 cursor-pointer ${
                  store.activeTab === 'home'
                    ? 'text-white bg-white/[0.1] shadow-sm font-semibold'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Music size={15} className={store.activeTab === 'home' ? 'text-cyan-400' : ''} />
                <span>Library</span>
              </button>

              <button
                onClick={() => {
                  setSelectedPlaylistDetailId(null);
                  store.setActiveTab('playlists');
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2.5 cursor-pointer ${
                  store.activeTab === 'playlists'
                    ? 'text-white bg-white/[0.1] shadow-sm font-semibold'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <ListMusic size={15} className={store.activeTab === 'playlists' ? 'text-cyan-400' : ''} />
                <span>Playlists</span>
              </button>

              <button
                onClick={() => store.setActiveTab('creatives')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2.5 cursor-pointer ${
                  store.activeTab === 'creatives'
                    ? 'text-white bg-white/[0.1] shadow-sm font-semibold'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Waves size={15} className={store.activeTab === 'creatives' ? 'text-cyan-400' : ''} />
                <span>Creatives Lab</span>
              </button>
            </nav>

            {/* PLAYLISTS SECTION */}
            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
              <div className="flex items-center justify-between px-1 py-1">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 font-semibold">
                  Playlists
                </span>
                <button
                  onClick={() => setShowNewPlaylistModal(true)}
                  className="text-white/40 hover:text-cyan-400 p-0.5 transition-colors cursor-pointer"
                  title="Create New Playlist"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Playlists List */}
              <div className="space-y-1">
                {store.playlists.length === 0 ? (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center space-y-1.5">
                    <p className="text-[11px] text-white/40 font-sans">No playlists yet</p>
                    <button
                      onClick={() => setShowNewPlaylistModal(true)}
                      className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
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
                        className={`w-full text-left p-2 rounded-xl flex items-center gap-2.5 transition-all relative group cursor-pointer ${
                          isSelected
                            ? 'bg-white/[0.08] text-white'
                            : 'hover:bg-white/[0.04] text-white/70 hover:text-white'
                        }`}
                      >
                        {/* Artwork Avatar */}
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-black/60">
                          {playlist.coverThumbnail ? (
                            <img
                              src={playlist.coverThumbnail}
                              alt={playlist.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-white/40">
                              <Music size={12} />
                            </div>
                          )}
                          {isPlaying && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs font-medium text-white truncate">
                            {playlist.name}
                          </span>
                          <span className="text-[10px] text-white/40 truncate">
                            {trackCount} {trackCount === 1 ? 'song' : 'songs'}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <button
                onClick={() => setShowNewPlaylistModal(true)}
                className="w-full mt-2 py-1.5 px-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-white/50 hover:text-white text-[11px] font-medium transition-all text-center cursor-pointer"
              >
                + New Playlist
              </button>
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="pt-3 border-t border-white/[0.04] text-[9px] font-mono text-white/25 uppercase tracking-wider flex items-center justify-between">
            <span>PRO AUDIO</span>
            <span>{store.tracks.length} TRACKS</span>
          </div>
        </aside>

        {/* 2. CENTER MAIN STAGE: Expansive, Uncluttered Apple Canvas */}
        <main className="flex-1 overflow-y-auto no-scrollbar p-6 lg:p-8 space-y-7 min-w-0 pb-48 md:pb-52 bg-gradient-to-b from-[#0a0b10] via-[#06070a] to-[#040406]">
          
          {/* Top Bar: Clean Search & Action Pills */}
          <div className="flex items-center justify-between gap-4">
            <form onSubmit={handleAddTrack} className="relative flex-1 max-w-md">
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-3.5 text-white/30 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search music or paste YouTube link..."
                  className="w-full bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/[0.08] focus:border-white/20 rounded-full pl-9 pr-20 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none transition-all font-sans"
                />
                {searchQuery.trim() && (
                  <button
                    type="submit"
                    disabled={addingTrack}
                    className="absolute right-1.5 px-2.5 py-1 bg-white text-black hover:bg-white/90 font-medium text-[10px] rounded-full transition-all cursor-pointer shadow-sm"
                  >
                    {addingTrack ? "..." : "+ Add"}
                  </button>
                )}
              </div>
              {addSuccess && (
                <span className="absolute -bottom-4 left-4 text-[10px] text-emerald-400 font-mono">{addSuccess}</span>
              )}
              {addError && (
                <span className="absolute -bottom-4 left-4 text-[10px] text-rose-400 font-mono">{addError}</span>
              )}
            </form>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => store.setStudioOpen(true)}
                className="px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border border-white/[0.08] text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                title="Studio DSP Equalizer"
              >
                <SlidersHorizontal size={13} className="text-cyan-400" />
                <span>DSP Studio</span>
              </button>

              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white border border-white/[0.08] text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                  title="Back to Vault"
                >
                  <ChevronLeft size={14} />
                  <span>Exit</span>
                </button>
              )}
            </div>
          </div>

          {/* TAB 1: HOME (Master Library Lounge) */}
          {store.activeTab === 'home' && (
            <div className="space-y-7">
              
              {/* Clean Library Header */}
              <section className="space-y-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  Master Library
                </h1>
                <p className="text-xs text-white/40 font-normal">
                  {store.tracks.length} {store.tracks.length === 1 ? 'track' : 'tracks'} • {totalDurationMinutes} mins total audio
                </p>
              </section>

              {/* Zero Tracks Empty State */}
              {store.tracks.length === 0 ? (
                <div className="p-10 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-3 max-w-md mx-auto my-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-cyan-400">
                    <Music size={22} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-white">Your Audio Library is Empty</h3>
                    <p className="text-xs text-white/40">
                      Paste any YouTube link or track name in the search bar above to start listening.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={handleAddStarterPack}
                      disabled={addingTrack}
                      className="px-4 py-2 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 transition-all cursor-pointer shadow-md"
                    >
                      {addingTrack ? "Loading..." : "Load Focus Starter Pack"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Section: Most Played (Clean Squircle Cards) */}
                  {mostPlayedTracks.length > 0 && (
                    <section className="space-y-3">
                      <h2 className="text-sm font-semibold text-white/80 tracking-tight">
                        Recently Played
                      </h2>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                        {mostPlayedTracks.map((track) => {
                          const isPlayingThis = currentTrack?.id === track.id && store.isPlaying;

                          return (
                            <div
                              key={track.id}
                              onClick={() => store.playTrack(track.id)}
                              className="group flex flex-col gap-2.5 p-2.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-white/[0.1] transition-all cursor-pointer"
                            >
                              {/* Square Artwork */}
                              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black/60 border border-white/10 shadow-md">
                                <img
                                  src={track.thumbnail}
                                  alt={track.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                                  isPlayingThis ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`}>
                                  <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform">
                                    {isPlayingThis ? <Pause size={16} fill="black" /> : <Play size={16} fill="black" className="ml-0.5" />}
                                  </div>
                                </div>
                              </div>

                              {/* Metadata */}
                              <div className="flex flex-col min-w-0 px-0.5">
                                <span className="text-xs font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
                                  {track.title}
                                </span>
                                <span className="text-[11px] text-white/40 truncate">
                                  {track.artist}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* Section: All Songs Catalog */}
                  <section className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-white/80 tracking-tight">
                        All Tracks ({displayedTracks.length})
                      </h2>
                      {displayedTracks.length > 8 && (
                        <button
                          onClick={() => setShowAllSongsModal(true)}
                          className="px-3 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/60 hover:text-white text-[11px] font-medium transition-all cursor-pointer"
                        >
                          View Full List
                        </button>
                      )}
                    </div>

                    {/* Apple Music Style Track Rows */}
                    <div className="space-y-1">
                      {displayedTracks.slice(0, 16).map((track, idx) => {
                        const isPlayingThis = currentTrack?.id === track.id && store.isPlaying;

                        return (
                          <div
                            key={track.id}
                            onClick={() => store.playTrack(track.id)}
                            className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group ${
                              isPlayingThis
                                ? 'bg-cyan-500/10 text-white border border-cyan-400/20'
                                : 'hover:bg-white/[0.04] text-white/80'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {/* Index / Visualizer */}
                              <div className="w-5 text-center shrink-0 flex items-center justify-center">
                                {isPlayingThis ? (
                                  <div className="flex items-end gap-0.5 h-3">
                                    <span className="w-0.5 bg-cyan-400 rounded-full animate-[bounce_0.8s_infinite_100ms] h-full" />
                                    <span className="w-0.5 bg-cyan-400 rounded-full animate-[bounce_0.6s_infinite_200ms] h-3/4" />
                                    <span className="w-0.5 bg-cyan-400 rounded-full animate-[bounce_0.9s_infinite_300ms] h-full" />
                                  </div>
                                ) : (
                                  <span className="text-[11px] font-mono text-white/30 group-hover:hidden">
                                    {idx + 1}
                                  </span>
                                )}
                                <Play size={11} fill="white" className="hidden group-hover:block text-white" />
                              </div>

                              {/* Square Art */}
                              <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-black/40">
                                <img
                                  src={track.thumbnail}
                                  alt={track.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>

                              {/* Song & Artist */}
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className={`text-xs font-medium truncate ${
                                  isPlayingThis ? 'text-cyan-300 font-semibold' : 'text-white'
                                }`}>
                                  {track.title}
                                </span>
                                <span className="text-[11px] text-white/40 truncate">
                                  {track.artist}
                                </span>
                              </div>
                            </div>

                            {/* Duration / Actions */}
                            <div className="flex items-center gap-3 pl-3">
                              <span className="text-xs font-mono text-white/40">
                                {formatTime(track.duration || 180)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTrackToAddToPlaylist(track);
                                  setShowAddToPlaylistModal(true);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-cyan-400 transition-opacity cursor-pointer"
                                title="Add to playlist"
                              >
                                <FolderPlus size={13} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  store.removeTrack(track.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-rose-400 transition-opacity cursor-pointer"
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

          {/* TAB 2: PLAYLISTS PAGE (Apple Music Style Studio & Vault) */}
          {store.activeTab === 'playlists' && (
            <div className="space-y-6">

              {/* VIEW A: DEDICATED PLAYLIST STUDIO */}
              {selectedPlaylistDetailId && store.playlists.some(p => p.id === selectedPlaylistDetailId) ? (() => {
                const targetPlaylist = store.playlists.find(p => p.id === selectedPlaylistDetailId)!;
                const playlistTracks = targetPlaylist.trackIds
                  .map(id => store.tracks.find(t => t.id === id))
                  .filter((t): t is Track => Boolean(t));
                const playlistDurationSec = playlistTracks.reduce((acc, t) => acc + (t.duration || 180), 0);
                const isThisPlaylistPlaying = store.activePlaylistId === targetPlaylist.id && store.isPlaying;

                return (
                  <div className="space-y-6">
                    {/* Top Navigation */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setSelectedPlaylistDetailId(null)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white border border-white/[0.06] text-xs font-medium transition-all cursor-pointer"
                      >
                        <ArrowLeft size={13} className="text-cyan-400" />
                        <span>All Playlists</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowQuickAddModal(true)}
                          className="px-3.5 py-1.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-400/25 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>Add Songs</span>
                        </button>
                        <button
                          onClick={() => {
                            store.deletePlaylist(targetPlaylist.id);
                            setSelectedPlaylistDetailId(null);
                          }}
                          className="p-1.5 rounded-full bg-white/[0.04] hover:bg-rose-500/20 text-white/40 hover:text-rose-400 border border-white/[0.06] transition-colors cursor-pointer"
                          title="Delete Playlist"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Apple Music Hero Header */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl">
                      
                      {/* Album Cover Art */}
                      <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden border border-white/15 bg-black shadow-2xl shrink-0">
                        {targetPlaylist.coverThumbnail ? (
                          <img
                            src={targetPlaylist.coverThumbnail}
                            alt={targetPlaylist.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-cyan-900/40 via-blue-900/30 to-purple-900/40 flex flex-col items-center justify-center text-white/30 gap-2">
                            <Disc size={32} className="text-cyan-400" />
                          </div>
                        )}
                      </div>

                      {/* Info & Apple Controls */}
                      <div className="flex-1 space-y-2.5 text-center sm:text-left min-w-0">
                        <span className="text-[10px] font-mono text-cyan-400 font-semibold tracking-widest uppercase block">
                          PLAYLIST
                        </span>

                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight truncate">
                          {targetPlaylist.name}
                        </h1>

                        <p className="text-xs text-white/50 line-clamp-2 max-w-xl">
                          {targetPlaylist.description || "Curated playlist for deep focus and study sessions."}
                        </p>

                        <div className="text-xs text-white/40 font-mono">
                          <span>{playlistTracks.length} {playlistTracks.length === 1 ? 'song' : 'songs'}</span>
                          <span className="mx-2">•</span>
                          <span>{Math.max(1, Math.round(playlistDurationSec / 60))} mins</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-center sm:justify-start gap-2.5 pt-2">
                          <button
                            onClick={() => store.playPlaylist(targetPlaylist.id)}
                            className="px-5 py-2.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-md"
                          >
                            {isThisPlaylistPlaying ? (
                              <>
                                <Pause size={14} fill="black" />
                                <span>Pause</span>
                              </>
                            ) : (
                              <>
                                <Play size={14} fill="black" className="ml-0.5" />
                                <span>Play</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => {
                              store.playPlaylist(targetPlaylist.id);
                              if (!store.shuffle) store.toggleShuffle();
                            }}
                            className="px-4 py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.08] text-white font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Shuffle size={13} className={store.shuffle ? "text-yellow-400" : ""} />
                            <span>Shuffle</span>
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Tracklist */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-2 text-[11px] font-mono text-white/40 uppercase tracking-wider border-b border-white/[0.04] pb-2">
                        <span># TRACK</span>
                        <span>DURATION</span>
                      </div>

                      {playlistTracks.length === 0 ? (
                        <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.04] text-center space-y-3">
                          <Music size={24} className="text-white/20 mx-auto" />
                          <p className="text-xs text-white/40">This playlist is currently empty.</p>
                          <button
                            onClick={() => setShowQuickAddModal(true)}
                            className="px-4 py-2 rounded-full bg-cyan-400 text-black font-medium text-xs hover:bg-cyan-300 transition-all cursor-pointer"
                          >
                            + Add Songs from Vault
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {playlistTracks.map((track, idx) => {
                            const isPlayingThis = currentTrack?.id === track.id && store.isPlaying;

                            return (
                              <div
                                key={track.id}
                                onClick={() => store.playTrack(track.id)}
                                className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group ${
                                  isPlayingThis
                                    ? 'bg-cyan-500/10 text-white border border-cyan-400/20'
                                    : 'hover:bg-white/[0.04] text-white/80'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  {/* Index / Visualizer */}
                                  <div className="w-5 text-center shrink-0 flex items-center justify-center">
                                    {isPlayingThis ? (
                                      <div className="flex items-end gap-0.5 h-3">
                                        <span className="w-0.5 bg-cyan-400 rounded-full animate-[bounce_0.8s_infinite_100ms] h-full" />
                                        <span className="w-0.5 bg-cyan-400 rounded-full animate-[bounce_0.6s_infinite_200ms] h-3/4" />
                                        <span className="w-0.5 bg-cyan-400 rounded-full animate-[bounce_0.9s_infinite_300ms] h-full" />
                                      </div>
                                    ) : (
                                      <span className="text-[11px] font-mono text-white/30 group-hover:hidden">
                                        {idx + 1}
                                      </span>
                                    )}
                                    <Play size={11} fill="white" className="hidden group-hover:block text-white" />
                                  </div>

                                  <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-black">
                                    <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                                  </div>

                                  <div className="flex flex-col min-w-0 flex-1">
                                    <span className={`text-xs font-medium truncate ${
                                      isPlayingThis ? 'text-cyan-300 font-semibold' : 'text-white'
                                    }`}>
                                      {track.title}
                                    </span>
                                    <span className="text-[11px] text-white/40 truncate">
                                      {track.artist}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 pl-3">
                                  <span className="text-xs font-mono text-white/40">
                                    {formatTime(track.duration || 180)}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      store.removeFromPlaylist(targetPlaylist.id, track.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-white/30 hover:text-rose-400 transition-colors cursor-pointer"
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
                
                /* VIEW B: PLAYLISTS SHOWCASE VAULT GRID */
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                    <div>
                      <h1 className="text-3xl font-bold text-white tracking-tight">Playlists</h1>
                      <p className="text-xs text-white/40 mt-0.5">Your personal music collections</p>
                    </div>
                    <button
                      onClick={() => setShowNewPlaylistModal(true)}
                      className="px-4 py-2 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Plus size={14} />
                      <span>New Playlist</span>
                    </button>
                  </div>

                  {store.playlists.length === 0 ? (
                    <div className="p-10 rounded-2xl bg-white/[0.02] border border-white/[0.04] text-center space-y-3 max-w-sm mx-auto">
                      <FolderPlus size={28} className="text-white/20 mx-auto" />
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold text-white">No Playlists Yet</h3>
                        <p className="text-xs text-white/40">Organize your study tracks into custom playlists.</p>
                      </div>
                      <button
                        onClick={() => setShowNewPlaylistModal(true)}
                        className="px-4 py-2 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 transition-all cursor-pointer shadow-md"
                      >
                        Create Playlist
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {store.playlists.map((playlist) => {
                        const tracksInPlaylist = playlist.trackIds
                          .map(id => store.tracks.find(t => t.id === id))
                          .filter((t): t is Track => Boolean(t));
                        const isPlayingThis = store.activePlaylistId === playlist.id && store.isPlaying;

                        return (
                          <div
                            key={playlist.id}
                            onClick={() => setSelectedPlaylistDetailId(playlist.id)}
                            className="group flex flex-col gap-2.5 p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-white/[0.1] transition-all cursor-pointer shadow-md"
                          >
                            <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black/60 border border-white/10 shadow-lg">
                              {playlist.coverThumbnail ? (
                                <img
                                  src={playlist.coverThumbnail}
                                  alt={playlist.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center text-white/20">
                                  <Disc size={32} className={isPlayingThis ? "animate-spin-slow text-cyan-400" : ""} />
                                </div>
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  store.playPlaylist(playlist.id);
                                }}
                                className="absolute bottom-2.5 right-2.5 w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform opacity-0 group-hover:opacity-100 cursor-pointer"
                                title="Play Playlist"
                              >
                                {isPlayingThis ? <Pause size={14} fill="black" /> : <Play size={14} fill="black" className="ml-0.5" />}
                              </button>
                            </div>

                            <div className="flex flex-col min-w-0 px-0.5">
                              <span className="text-xs font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
                                {playlist.name}
                              </span>
                              <span className="text-[11px] text-white/40 truncate">
                                {tracksInPlaylist.length} {tracksInPlaylist.length === 1 ? 'song' : 'songs'}
                              </span>
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

          {/* TAB 3: CREATIVES LAB */}
          {store.activeTab === 'creatives' && (
            <div className="space-y-6">
              <div className="border-b border-white/[0.06] pb-4">
                <h1 className="text-3xl font-bold text-white tracking-tight">Creatives & Sonic Lab</h1>
                <p className="text-xs text-white/40 mt-0.5">Generative ambient tones, binaural waves, and focus soundscapes</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {[
                  { title: "Binaural 40Hz Gamma", desc: "Pure focus wave harmonics for cognitive flow", url: "https://www.youtube.com/watch?v=WPni755-Krg", tag: "FOCUS" },
                  { title: "Neo-Tokyo Nocturne", desc: "Subtle analog synth ambient rain soundscapes", url: "https://www.youtube.com/watch?v=S_MOd40zlSk", tag: "NIGHT" },
                  { title: "Neoclassical Felt Piano", desc: "Gentle felt piano acoustic keys with zero vocals", url: "https://www.youtube.com/watch?v=jfKfPfyJRdk", tag: "STUDY" },
                  { title: "Synthwave Horizon", desc: "Retro-futuristic analog pulses for fast sprints", url: "https://www.youtube.com/watch?v=4xDzrJKXOOY", tag: "SPRINT" },
                  { title: "Ambient Lo-Fi Radio", desc: "Warm vinyl crackle and chill melodic beats", url: "https://www.youtube.com/watch?v=Ui7Hb4cvamY", tag: "CHILL" },
                  { title: "Deep Theta Calm", desc: "Sub-bass theta drone for mental reset and calm", url: "https://www.youtube.com/watch?v=df4p7bP_MaY", tag: "RESET" }
                ].map((preset, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-cyan-400/20 transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono font-semibold text-cyan-400 uppercase tracking-widest px-2 py-0.5 rounded-full bg-cyan-400/10 border border-cyan-400/20">{preset.tag}</span>
                        <Waves size={14} className="text-white/30 group-hover:text-cyan-400 transition-colors" />
                      </div>
                      <h3 className="text-sm font-semibold text-white">{preset.title}</h3>
                      <p className="text-xs text-white/50 leading-relaxed">{preset.desc}</p>
                    </div>

                    <button
                      onClick={() => handleAddTrack(undefined, preset.url)}
                      className="w-full py-2 rounded-xl bg-white/[0.04] group-hover:bg-white text-white/70 group-hover:text-black font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Import into Vault</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* 3. FLOATING APPLE-GRADE PLAYER BAR (Positioned along Y-axis ABOVE the bottom navigation dock) */}
      <footer className="fixed bottom-24 md:bottom-28 left-4 right-4 md:left-8 md:right-8 max-w-5xl mx-auto z-40 bg-[#0c0e14]/95 backdrop-blur-3xl border border-white/15 rounded-2xl md:rounded-3xl px-4 md:px-6 py-2.5 md:py-3 shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex items-center justify-between">
        
        {/* Left: Track Info */}
        <div className="flex items-center gap-3 min-w-0 w-1/4">
          <div className="relative w-10 h-10 md:w-11 md:h-11 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-black">
            {currentTrack?.thumbnail ? (
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title || "Track"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-white/30">
                <Music size={16} />
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-white truncate">
              {currentTrack?.title || "No Track Selected"}
            </span>
            <span className="text-[11px] text-white/40 truncate">
              {currentTrack?.artist || "The Frequency"}
            </span>
          </div>
        </div>

        {/* Center: Apple Transport Controls & Timeline */}
        <div className="flex flex-col items-center gap-1 flex-1 max-w-lg px-4">
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => store.toggleShuffle()}
              className={`p-1 cursor-pointer transition-colors ${store.shuffle ? 'text-yellow-400' : 'text-white/30 hover:text-white'}`}
              title="Shuffle"
            >
              <Shuffle size={13} />
            </button>

            <button
              onClick={() => store.previous()}
              className="text-white/60 hover:text-white transition-colors p-1 cursor-pointer"
              title="Previous"
            >
              <SkipBack size={15} fill="currentColor" />
            </button>

            <button
              onClick={() => store.togglePlay()}
              className="w-8 h-8 rounded-full bg-white text-black hover:bg-white/90 flex items-center justify-center shadow-md transition-transform active:scale-95 cursor-pointer"
              title={store.isPlaying ? "Pause" : "Play"}
            >
              {store.isPlaying ? <Pause size={14} fill="black" /> : <Play size={14} fill="black" className="ml-0.5" />}
            </button>

            <button
              onClick={() => store.next()}
              className="text-white/60 hover:text-white transition-colors p-1 cursor-pointer"
              title="Next"
            >
              <SkipForward size={15} fill="currentColor" />
            </button>

            <button
              onClick={() => store.cycleRepeat()}
              className={`p-1 cursor-pointer transition-colors ${store.repeat !== 'none' ? 'text-yellow-400' : 'text-white/30 hover:text-white'}`}
              title="Repeat"
            >
              {store.repeat === 'one' ? <Repeat1 size={13} /> : <Repeat size={13} />}
            </button>
          </div>

          {/* Timeline Scrubber */}
          <div className="w-full flex items-center gap-2.5">
            <span className="text-[10px] font-mono text-white/40 w-8 text-right">
              {formatTime(store.currentTime)}
            </span>

            <div
              onClick={handleSeek}
              className="flex-1 h-1 bg-white/10 hover:h-1.5 rounded-full overflow-hidden cursor-pointer relative transition-all"
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

            <span className="text-[10px] font-mono text-white/40 w-8 text-left">
              {formatTime(store.duration)}
            </span>
          </div>
        </div>

        {/* Right: Full Screen & Volume */}
        <div className="flex items-center justify-end gap-3 w-1/4">
          {currentTrack && (
            <button
              onClick={() => store.setExpanded(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.1] text-white text-xs font-medium transition-all cursor-pointer"
              title="Open Full Screen Player"
            >
              <Maximize2 size={12} className="text-cyan-300" />
              <span className="hidden sm:inline">Full Screen</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => store.setVolume(store.volume > 0 ? 0 : 80)}
              className="text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              {store.volume === 0 ? <VolumeX size={15} /> : store.volume < 50 ? <Volume1 size={15} /> : <Volume2 size={15} />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={store.volume}
              onChange={(e) => store.setVolume(Number(e.target.value))}
              className="w-16 md:w-20 h-1 bg-white/20 rounded-full appearance-none accent-white cursor-pointer"
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
                <h3 className="text-base font-semibold text-white">Create New Playlist</h3>
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
                    placeholder="e.g. Deep Study Focus"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-sans"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-white/40 block mb-1">Description (Optional)</label>
                  <textarea
                    value={newPlaylistDesc}
                    onChange={e => setNewPlaylistDesc(e.target.value)}
                    placeholder="Describe the sonic vibe..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-sans h-16 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer"
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
              className="bg-[#0e0f15] border border-white/15 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-3"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-semibold text-white truncate">Add to Playlist</h3>
                <button onClick={() => setShowAddToPlaylistModal(false)} className="text-white/40 hover:text-white cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar">
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
                      <span className="text-xs font-medium text-white">{pl.name}</span>
                      <span className="text-[10px] text-white/40 font-mono">{pl.trackIds.length} tracks</span>
                    </button>
                  ))
                )}
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
                  className="bg-[#0e0f15] border border-white/15 rounded-3xl p-6 max-w-xl w-full max-h-[80vh] flex flex-col shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Add Songs to "{targetPlaylist.name}"</h3>
                      <p className="text-[11px] text-white/40">Select tracks to include in this playlist</p>
                    </div>
                    <button onClick={() => setShowQuickAddModal(false)} className="text-white/40 hover:text-white p-1 cursor-pointer">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5 pr-1">
                    {store.tracks.length === 0 ? (
                      <p className="text-xs text-white/40 text-center py-6">No tracks in library.</p>
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
                            className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                              isAlreadyIn
                                ? 'bg-cyan-500/10 border-cyan-400/30 text-white'
                                : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/5 text-white/80'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-white/10">
                                <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className={`text-xs font-medium truncate ${isAlreadyIn ? 'text-cyan-300' : 'text-white'}`}>
                                  {track.title}
                                </span>
                                <span className="text-[10px] text-white/40 truncate">
                                  {track.artist}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 pl-2">
                              <span className="text-[11px] font-mono text-white/40">
                                {formatTime(track.duration || 180)}
                              </span>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                isAlreadyIn
                                  ? 'bg-cyan-400 text-black'
                                  : 'bg-white/10 text-white/50 hover:bg-white/20'
                              }`}>
                                {isAlreadyIn ? <Check size={12} /> : <Plus size={12} />}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/10 flex justify-end">
                    <button
                      onClick={() => setShowQuickAddModal(false)}
                      className="px-5 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-white/90 transition-all cursor-pointer"
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

      {/* Show All Songs Modal */}
      <AnimatePresence>
        {showAllSongsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0e0f15] border border-white/15 rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                <div>
                  <h3 className="text-base font-semibold text-white">Full Library Vault</h3>
                  <p className="text-xs text-white/40">{store.tracks.length} tracks registered</p>
                </div>
                <button onClick={() => setShowAllSongsModal(false)} className="text-white/40 hover:text-white p-1 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5 pr-1">
                {store.tracks.map((track) => (
                  <div
                    key={track.id}
                    onClick={() => {
                      store.playTrack(track.id);
                      setShowAllSongsModal(false);
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-white/10">
                        <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-white truncate group-hover:text-cyan-300">
                          {track.title}
                        </span>
                        <span className="text-[11px] text-white/40 truncate">
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
