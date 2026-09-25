"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Play, Pause, Heart, Plus, ArrowLeft, ExternalLink,
  Disc, Music, Mic2, Radio, Sparkles, Clock, ChevronRight, Loader2,
  Headphones, TrendingUp, Zap, Globe2
} from 'lucide-react';
import {
  useSpotifyStore,
  SpotifyTrack,
  SpotifyAlbum,
  SpotifyArtist,
  SpotifyPlaylist,
  SpotifyCategory,
  formatSpotifyDuration,
  getSpotifyImage,
  spotifyTrackToYouTubeQuery,
} from '../../../hooks/useSpotifyStore';
import { useFrequencyStore, Track } from '../../../hooks/useFrequencyStore';
import { fetchYouTubeMeta, extractDominantColor } from '../SonicVaultUtils';

// ─── Helper: Import Spotify track to Frequency library ──────────────────────

async function importSpotifyTrack(track: SpotifyTrack): Promise<Track | null> {
  const query = spotifyTrackToYouTubeQuery(track);
  try {
    const meta = await fetchYouTubeMeta(query);
    if (!meta) return null;
    const color = await extractDominantColor(meta.thumbnail);
    return {
      id: `sp-${track.id}-${Date.now().toString(36)}`,
      videoId: meta.videoId,
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      thumbnail: getSpotifyImage(track.album.images, 'medium') || meta.thumbnail,
      dominantColor: color,
      addedAt: Date.now(),
      duration: Math.floor(track.duration_ms / 1000),
      sourceUrl: `https://www.youtube.com/watch?v=${meta.videoId}`,
      year: track.album.release_date?.split('-')[0],
    };
  } catch {
    return null;
  }
}

// ─── SpotifyBrowser Component ────────────────────────────────────────────────

export default function SpotifyBrowser() {
  const spotify = useSpotifyStore();
  const frequency = useFrequencyStore();
  const [localSearch, setLocalSearch] = useState('');
  const [importingTrackId, setImportingTrackId] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [viewHistory, setViewHistory] = useState<string[]>([]);

  // Initialize Spotify connection and load featured content
  useEffect(() => {
    spotify.checkConnection();
    spotify.fetchFeaturedPlaylists();
    spotify.fetchNewReleases();
    spotify.fetchCategories();
  }, []);

  // Handle search
  const handleSearch = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (localSearch.trim()) {
      pushHistory();
      spotify.search(localSearch.trim());
    }
  }, [localSearch]);

  // Navigation history
  const pushHistory = () => {
    setViewHistory(prev => [...prev, spotify.activeView]);
  };

  const goBack = () => {
    const prev = viewHistory[viewHistory.length - 1];
    if (prev) {
      spotify.setActiveView(prev as any);
      setViewHistory(h => h.slice(0, -1));
    }
  };

  // Import track
  const handleImportTrack = async (track: SpotifyTrack) => {
    setImportingTrackId(track.id);
    const imported = await importSpotifyTrack(track);
    if (imported) {
      frequency.addTrack(imported);
      setImportSuccess(track.name);
      setTimeout(() => setImportSuccess(null), 3000);
    }
    setImportingTrackId(null);
  };

  // Import and play
  const handleImportAndPlay = async (track: SpotifyTrack) => {
    setImportingTrackId(track.id);
    const imported = await importSpotifyTrack(track);
    if (imported) {
      frequency.addTrack(imported);
      setTimeout(() => frequency.playTrack(imported.id), 300);
    }
    setImportingTrackId(null);
  };

  // ─── Sub-Components ─────────────────────────────────────────────────────────

  // Track Row
  const TrackRow = ({ track, index, showAlbumArt = true }: { track: SpotifyTrack; index: number; showAlbumArt?: boolean }) => {
    const isImporting = importingTrackId === track.id;
    const isPreviewing = spotify.previewTrackId === track.id && spotify.isPreviewPlaying;

    return (
      <div className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer group">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Index */}
          <div className="w-5 text-center shrink-0">
            <span className="text-[11px] font-mono text-white/30 group-hover:hidden">{index + 1}</span>
            <button
              onClick={() => handleImportAndPlay(track)}
              className="hidden group-hover:block text-white cursor-pointer"
            >
              {isImporting ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} fill="white" />}
            </button>
          </div>

          {/* Album Art */}
          {showAlbumArt && (
            <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-black/40">
              {track.album?.images?.[0] ? (
                <img
                  src={getSpotifyImage(track.album.images, 'small')}
                  alt={track.album.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-white/30">
                  <Music size={12} />
                </div>
              )}
              {isPreviewing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="flex items-end gap-0.5 h-3">
                    <span className="w-0.5 bg-green-400 rounded-full animate-[bounce_0.8s_infinite_100ms] h-full" />
                    <span className="w-0.5 bg-green-400 rounded-full animate-[bounce_0.6s_infinite_200ms] h-3/4" />
                    <span className="w-0.5 bg-green-400 rounded-full animate-[bounce_0.9s_infinite_300ms] h-full" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Track Info */}
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-medium text-white truncate">
              {track.name}
            </span>
            <span className="text-[11px] text-white/40 truncate">
              {track.artists?.map(a => a.name).join(', ')}
              {track.explicit && <span className="ml-1 text-[8px] bg-white/10 px-1 py-0.5 rounded font-bold">E</span>}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pl-3 shrink-0">
          <span className="text-[11px] font-mono text-white/30 hidden sm:inline">
            {formatSpotifyDuration(track.duration_ms)}
          </span>

          {/* Preview */}
          {track.preview_url && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                isPreviewing ? spotify.stopPreview() : spotify.playPreview(track);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-green-400 transition-all cursor-pointer"
              title="30s preview"
            >
              <Headphones size={12} />
            </button>
          )}

          {/* Import */}
          <button
            onClick={(e) => { e.stopPropagation(); handleImportTrack(track); }}
            disabled={isImporting}
            className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-cyan-400 transition-all cursor-pointer disabled:opacity-50"
            title="Import to Frequency"
          >
            {isImporting ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          </button>

          {/* Open in Spotify */}
          {track.external_urls?.spotify && (
            <a
              href={track.external_urls.spotify}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-green-400 transition-all"
              title="Open in Spotify"
            >
              <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
    );
  };

  // Album Card
  const AlbumCard = ({ album }: { album: SpotifyAlbum }) => (
    <div
      onClick={() => { pushHistory(); spotify.fetchAlbumDetail(album.id); }}
      className="group flex flex-col gap-2 p-2.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-white/[0.1] transition-all cursor-pointer"
    >
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black/60 border border-white/10 shadow-md">
        {album.images?.[0] ? (
          <img
            src={getSpotifyImage(album.images, 'medium')}
            alt={album.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-white/20">
            <Disc size={28} />
          </div>
        )}
      </div>
      <div className="flex flex-col min-w-0 px-0.5">
        <span className="text-xs font-semibold text-white truncate group-hover:text-green-300 transition-colors">
          {album.name}
        </span>
        <span className="text-[11px] text-white/40 truncate">
          {album.artists?.map(a => a.name).join(', ')}
        </span>
        <span className="text-[9px] text-white/25 font-mono mt-0.5">
          {album.release_date?.split('-')[0]} • {album.album_type?.toUpperCase()}
        </span>
      </div>
    </div>
  );

  // Artist Card
  const ArtistCard = ({ artist }: { artist: SpotifyArtist }) => (
    <div
      onClick={() => { pushHistory(); spotify.fetchArtistDetail(artist.id); }}
      className="group flex flex-col items-center gap-2.5 p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-white/[0.1] transition-all cursor-pointer"
    >
      <div className="relative w-24 h-24 rounded-full overflow-hidden bg-black/60 border-2 border-white/10 shadow-lg group-hover:border-green-400/30 transition-all">
        {artist.images?.[0] ? (
          <img
            src={getSpotifyImage(artist.images!, 'medium')}
            alt={artist.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-white/20">
            <Mic2 size={24} />
          </div>
        )}
      </div>
      <div className="text-center min-w-0 w-full">
        <span className="text-xs font-semibold text-white truncate block group-hover:text-green-300 transition-colors">
          {artist.name}
        </span>
        <span className="text-[10px] text-white/30 font-mono">ARTIST</span>
      </div>
    </div>
  );

  // Playlist Card  
  const PlaylistCard = ({ playlist }: { playlist: SpotifyPlaylist }) => (
    <div
      onClick={() => { pushHistory(); spotify.fetchPlaylistDetail(playlist.id); }}
      className="group flex flex-col gap-2 p-2.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-white/[0.1] transition-all cursor-pointer"
    >
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black/60 border border-white/10 shadow-md">
        {playlist.images?.[0] ? (
          <img
            src={getSpotifyImage(playlist.images, 'medium')}
            alt={playlist.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-green-900/40 to-black flex items-center justify-center text-white/20">
            <Music size={28} />
          </div>
        )}
      </div>
      <div className="flex flex-col min-w-0 px-0.5">
        <span className="text-xs font-semibold text-white truncate group-hover:text-green-300 transition-colors">
          {playlist.name}
        </span>
        <span className="text-[11px] text-white/40 truncate">
          {playlist.tracks?.total || 0} tracks
        </span>
      </div>
    </div>
  );

  // Category Card
  const CategoryCard = ({ category }: { category: SpotifyCategory }) => (
    <div
      onClick={() => { pushHistory(); spotify.fetchCategoryPlaylists(category); }}
      className="group flex flex-col gap-2 p-2.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-white/[0.1] transition-all cursor-pointer"
    >
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-gradient-to-br from-green-900/20 to-black border border-white/10 shadow-md">
        {category.icons?.[0] ? (
          <img
            src={category.icons[0].url}
            alt={category.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20">
            <Globe2 size={28} />
          </div>
        )}
      </div>
      <span className="text-xs font-semibold text-white truncate px-0.5 group-hover:text-green-300 transition-colors">
        {category.name}
      </span>
    </div>
  );

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={24} className="animate-spin text-green-400" />
        <span className="text-xs text-white/40 font-mono">Loading from Spotify...</span>
      </div>
    </div>
  );

  // Back button
  const BackButton = ({ label }: { label?: string }) => (
    <button
      onClick={goBack}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white border border-white/[0.06] text-xs font-medium transition-all cursor-pointer"
    >
      <ArrowLeft size={13} className="text-green-400" />
      <span>{label || 'Back'}</span>
    </button>
  );

  // ─── Main Render ────────────────────────────────────────────────────────────

  // Connection error state
  if (spotify.error && !spotify.isConnected && spotify.activeView === 'search' && !spotify.searchResults.tracks.length) {
    return (
      <div className="space-y-6">
        <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-400/20 flex items-center justify-center mx-auto">
            <Zap size={20} className="text-red-400" />
          </div>
          <h3 className="text-base font-semibold text-white">Spotify Not Connected</h3>
          <p className="text-xs text-white/40 max-w-sm mx-auto">{spotify.error}</p>
          <button
            onClick={() => spotify.checkConnection()}
            className="px-4 py-2 rounded-full bg-green-500 text-black font-semibold text-xs hover:bg-green-400 transition-all cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Success toast */}
      <AnimatePresence>
        {importSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 right-4 z-[200] px-4 py-2.5 rounded-xl bg-green-500/20 border border-green-400/30 text-green-300 text-xs font-medium backdrop-blur-xl shadow-2xl"
          >
            ✓ Imported "{importSuccess}" to Frequency
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spotify Search Bar */}
      <form onSubmit={handleSearch} className="relative flex items-center max-w-lg">
        <Search size={14} className="absolute left-3.5 text-green-400/60 pointer-events-none" />
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search songs, artists, albums on Spotify..."
          className="w-full bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/[0.08] focus:border-green-400/40 rounded-full pl-9 pr-20 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none transition-all font-sans"
        />
        {localSearch.trim() && (
          <button
            type="submit"
            disabled={spotify.isLoading}
            className="absolute right-1.5 px-3 py-1 bg-green-500 text-black hover:bg-green-400 font-semibold text-[10px] rounded-full transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            {spotify.isLoading ? '...' : 'Search'}
          </button>
        )}
      </form>

      {/* Quick Browse Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { label: 'Featured', icon: Sparkles, action: () => { pushHistory(); spotify.fetchFeaturedPlaylists(); } },
          { label: 'New Releases', icon: TrendingUp, action: () => { pushHistory(); spotify.fetchNewReleases(); } },
          { label: 'Categories', icon: Globe2, action: () => { pushHistory(); spotify.fetchCategories(); } },
          { label: 'For You', icon: Radio, action: () => { pushHistory(); spotify.fetchRecommendations(); } },
        ].map(chip => (
          <button
            key={chip.label}
            onClick={chip.action}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer ${
              spotify.activeView === chip.label.toLowerCase().replace(' ', '-')
                ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                : 'bg-white/[0.04] text-white/50 hover:text-white border border-white/[0.06] hover:bg-white/[0.08]'
            }`}
          >
            <chip.icon size={12} />
            {chip.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {spotify.isLoading && <LoadingSkeleton />}

      {/* Error banner */}
      {spotify.error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-300 text-xs flex items-center justify-between">
          <span>{spotify.error}</span>
          <button onClick={() => spotify.clearError()} className="text-red-400 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* ─── VIEW: SEARCH RESULTS ───────────────────────────────────────────── */}
      {!spotify.isLoading && spotify.activeView === 'search' && spotify.searchResults.tracks.length > 0 && (
        <div className="space-y-6">
          {/* Tracks */}
          {spotify.searchResults.tracks.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                <Music size={14} className="text-green-400" /> Tracks
              </h2>
              <div className="space-y-0.5">
                {spotify.searchResults.tracks.slice(0, 10).map((track, i) => (
                  <TrackRow key={track.id} track={track} index={i} />
                ))}
              </div>
            </section>
          )}

          {/* Albums */}
          {spotify.searchResults.albums.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                <Disc size={14} className="text-green-400" /> Albums
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {spotify.searchResults.albums.slice(0, 8).map(album => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </div>
            </section>
          )}

          {/* Artists */}
          {spotify.searchResults.artists.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                <Mic2 size={14} className="text-green-400" /> Artists
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {spotify.searchResults.artists.slice(0, 6).map(artist => (
                  <ArtistCard key={artist.id} artist={artist} />
                ))}
              </div>
            </section>
          )}

          {/* Playlists */}
          {spotify.searchResults.playlists.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                <Radio size={14} className="text-green-400" /> Playlists
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {spotify.searchResults.playlists.slice(0, 8).map(pl => (
                  <PlaylistCard key={pl.id} playlist={pl} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ─── VIEW: FEATURED PLAYLISTS ───────────────────────────────────────── */}
      {!spotify.isLoading && spotify.activeView === 'featured' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight">Featured Playlists</h2>
            {viewHistory.length > 0 && <BackButton />}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {spotify.featuredPlaylists.map(pl => (
              <PlaylistCard key={pl.id} playlist={pl} />
            ))}
          </div>
        </div>
      )}

      {/* ─── VIEW: NEW RELEASES ────────────────────────────────────────────── */}
      {!spotify.isLoading && spotify.activeView === 'new-releases' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight">New Releases</h2>
            {viewHistory.length > 0 && <BackButton />}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {spotify.newReleases.map(album => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </div>
      )}

      {/* ─── VIEW: CATEGORIES ──────────────────────────────────────────────── */}
      {!spotify.isLoading && spotify.activeView === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight">Browse Categories</h2>
            {viewHistory.length > 0 && <BackButton />}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
            {spotify.categories.map(cat => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </div>
        </div>
      )}

      {/* ─── VIEW: CATEGORY DETAIL ─────────────────────────────────────────── */}
      {!spotify.isLoading && spotify.activeView === 'category-detail' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BackButton label="Categories" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                {spotify.selectedCategory?.name}
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {spotify.categoryPlaylists.map(pl => (
              <PlaylistCard key={pl.id} playlist={pl} />
            ))}
          </div>
        </div>
      )}

      {/* ─── VIEW: PLAYLIST DETAIL ─────────────────────────────────────────── */}
      {!spotify.isLoading && spotify.activeView === 'playlist-detail' && spotify.selectedPlaylist && (
        <div className="space-y-5">
          <BackButton />
          
          {/* Hero Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 p-5 rounded-3xl bg-white/[0.02] border border-white/[0.06]">
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden border border-white/15 bg-black shadow-2xl shrink-0">
              {spotify.selectedPlaylist.images?.[0] ? (
                <img
                  src={getSpotifyImage(spotify.selectedPlaylist.images, 'large')}
                  alt={spotify.selectedPlaylist.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-green-900/40 to-black flex items-center justify-center">
                  <Music size={32} className="text-green-400" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2 text-center sm:text-left min-w-0">
              <span className="text-[10px] font-mono text-green-400 font-semibold tracking-widest uppercase">
                SPOTIFY PLAYLIST
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight truncate">
                {spotify.selectedPlaylist.name}
              </h1>
              {spotify.selectedPlaylist.description && (
                <p className="text-xs text-white/50 line-clamp-2" 
                   dangerouslySetInnerHTML={{ __html: spotify.selectedPlaylist.description }} />
              )}
              <div className="text-xs text-white/40 font-mono">
                {spotify.selectedPlaylist.owner?.display_name} • {spotify.selectedPlaylist.tracks?.total} tracks
              </div>
            </div>
          </div>

          {/* Tracklist */}
          <div className="space-y-0.5">
            {spotify.selectedPlaylistTracks.map((track, i) => (
              <TrackRow key={`${track.id}-${i}`} track={track} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* ─── VIEW: ALBUM DETAIL ───────────────────────────────────────────── */}
      {!spotify.isLoading && spotify.activeView === 'album-detail' && spotify.selectedAlbum && (
        <div className="space-y-5">
          <BackButton />

          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 p-5 rounded-3xl bg-white/[0.02] border border-white/[0.06]">
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden border border-white/15 bg-black shadow-2xl shrink-0">
              {spotify.selectedAlbum.images?.[0] ? (
                <img
                  src={getSpotifyImage(spotify.selectedAlbum.images, 'large')}
                  alt={spotify.selectedAlbum.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-green-900/40 to-black flex items-center justify-center">
                  <Disc size={32} className="text-green-400" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2 text-center sm:text-left min-w-0">
              <span className="text-[10px] font-mono text-green-400 font-semibold tracking-widest uppercase">
                {spotify.selectedAlbum.album_type?.toUpperCase()}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight truncate">
                {spotify.selectedAlbum.name}
              </h1>
              <div className="text-xs text-white/50">
                {spotify.selectedAlbum.artists?.map(a => a.name).join(', ')}
              </div>
              <div className="text-xs text-white/40 font-mono">
                {spotify.selectedAlbum.release_date} • {spotify.selectedAlbum.total_tracks} tracks
              </div>
            </div>
          </div>

          <div className="space-y-0.5">
            {spotify.selectedAlbumTracks.map((track, i) => (
              <TrackRow key={`${track.id}-${i}`} track={track} index={i} showAlbumArt={false} />
            ))}
          </div>
        </div>
      )}

      {/* ─── VIEW: ARTIST DETAIL ──────────────────────────────────────────── */}
      {!spotify.isLoading && spotify.activeView === 'artist-detail' && spotify.selectedArtist && (
        <div className="space-y-6">
          <BackButton />

          {/* Artist Hero */}
          <div className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06]">
            <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-green-400/30 shadow-2xl">
              {spotify.selectedArtist.images?.[0] ? (
                <img
                  src={getSpotifyImage(spotify.selectedArtist.images!, 'large')}
                  alt={spotify.selectedArtist.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-white/30">
                  <Mic2 size={32} />
                </div>
              )}
            </div>
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{spotify.selectedArtist.name}</h1>
              {spotify.selectedArtist.genres && spotify.selectedArtist.genres.length > 0 && (
                <p className="text-xs text-white/40 mt-1">
                  {spotify.selectedArtist.genres.slice(0, 4).join(' • ')}
                </p>
              )}
              {spotify.selectedArtist.followers && (
                <p className="text-[11px] text-white/30 font-mono mt-1">
                  {(spotify.selectedArtist.followers.total / 1000).toFixed(0)}K followers
                </p>
              )}
            </div>
          </div>

          {/* Top Tracks */}
          {spotify.artistTopTracks.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-white/80">Popular Tracks</h2>
              <div className="space-y-0.5">
                {spotify.artistTopTracks.slice(0, 10).map((track, i) => (
                  <TrackRow key={track.id} track={track} index={i} />
                ))}
              </div>
            </section>
          )}

          {/* Albums */}
          {spotify.artistAlbums.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-white/80">Discography</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {spotify.artistAlbums.map(album => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ─── VIEW: RECOMMENDATIONS ──────────────────────────────────────────── */}
      {!spotify.isLoading && spotify.activeView === 'recommendations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Radio size={18} className="text-green-400" /> Made For You
            </h2>
            {viewHistory.length > 0 && <BackButton />}
          </div>
          <div className="space-y-0.5">
            {spotify.recommendations.map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* ─── DEFAULT HOME (No search, initial state) ────────────────────────── */}
      {!spotify.isLoading && spotify.activeView === 'search' && spotify.searchResults.tracks.length === 0 && (
        <div className="space-y-6">
          {/* Featured Section */}
          {spotify.featuredPlaylists.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                  <Sparkles size={14} className="text-green-400" /> Featured
                </h2>
                <button
                  onClick={() => { pushHistory(); spotify.fetchFeaturedPlaylists(); }}
                  className="text-[11px] text-green-400 hover:text-green-300 font-medium cursor-pointer flex items-center gap-1"
                >
                  See All <ChevronRight size={12} />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {spotify.featuredPlaylists.slice(0, 4).map(pl => (
                  <PlaylistCard key={pl.id} playlist={pl} />
                ))}
              </div>
            </section>
          )}

          {/* New Releases */}
          {spotify.newReleases.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                  <TrendingUp size={14} className="text-green-400" /> New Releases
                </h2>
                <button
                  onClick={() => { pushHistory(); spotify.fetchNewReleases(); }}
                  className="text-[11px] text-green-400 hover:text-green-300 font-medium cursor-pointer flex items-center gap-1"
                >
                  See All <ChevronRight size={12} />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {spotify.newReleases.slice(0, 4).map(album => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </div>
            </section>
          )}

          {/* Categories */}
          {spotify.categories.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                  <Globe2 size={14} className="text-green-400" /> Browse
                </h2>
                <button
                  onClick={() => { pushHistory(); spotify.fetchCategories(); }}
                  className="text-[11px] text-green-400 hover:text-green-300 font-medium cursor-pointer flex items-center gap-1"
                >
                  See All <ChevronRight size={12} />
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                {spotify.categories.slice(0, 5).map(cat => (
                  <CategoryCard key={cat.id} category={cat} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
