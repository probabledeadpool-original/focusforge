"use client";

import { create } from 'zustand';

// ─── Spotify Data Models ─────────────────────────────────────────────────────

export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images?: SpotifyImage[];
  genres?: string[];
  followers?: { total: number };
  popularity?: number;
  external_urls?: { spotify: string };
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  release_date: string;
  total_tracks: number;
  artists: SpotifyArtist[];
  album_type: string;
  external_urls?: { spotify: string };
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  preview_url: string | null;
  popularity: number;
  track_number: number;
  explicit: boolean;
  external_urls?: { spotify: string };
  uri?: string;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: SpotifyImage[];
  tracks: { total: number; items?: Array<{ track: SpotifyTrack }> };
  owner: { display_name: string; id: string };
  external_urls?: { spotify: string };
}

export interface SpotifyCategory {
  id: string;
  name: string;
  icons: SpotifyImage[];
}

export type SpotifyBrowseView = 
  | 'search' 
  | 'new-releases' 
  | 'featured' 
  | 'categories' 
  | 'category-detail'
  | 'playlist-detail'
  | 'album-detail'
  | 'artist-detail'
  | 'recommendations';

interface SpotifyState {
  // Connection
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // Browse state
  activeView: SpotifyBrowseView;
  searchQuery: string;
  searchResults: {
    tracks: SpotifyTrack[];
    albums: SpotifyAlbum[];
    artists: SpotifyArtist[];
    playlists: SpotifyPlaylist[];
  };
  
  // Browsing data
  newReleases: SpotifyAlbum[];
  featuredPlaylists: SpotifyPlaylist[];
  categories: SpotifyCategory[];
  categoryPlaylists: SpotifyPlaylist[];
  selectedCategory: SpotifyCategory | null;
  
  // Detail views
  selectedPlaylist: SpotifyPlaylist | null;
  selectedPlaylistTracks: SpotifyTrack[];
  selectedAlbum: SpotifyAlbum | null;
  selectedAlbumTracks: SpotifyTrack[];
  selectedArtist: SpotifyArtist | null;
  artistTopTracks: SpotifyTrack[];
  artistAlbums: SpotifyAlbum[];

  // Recommendations
  recommendations: SpotifyTrack[];
  
  // Preview playback
  previewTrackId: string | null;
  previewAudio: HTMLAudioElement | null;
  isPreviewPlaying: boolean;

  // Actions
  setActiveView: (view: SpotifyBrowseView) => void;
  setSearchQuery: (query: string) => void;
  search: (query: string) => Promise<void>;
  fetchNewReleases: () => Promise<void>;
  fetchFeaturedPlaylists: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchCategoryPlaylists: (category: SpotifyCategory) => Promise<void>;
  fetchPlaylistDetail: (id: string) => Promise<void>;
  fetchAlbumDetail: (id: string) => Promise<void>;
  fetchArtistDetail: (id: string) => Promise<void>;
  fetchRecommendations: (seedGenres?: string) => Promise<void>;
  checkConnection: () => Promise<void>;
  
  // Custom API Credentials
  clientId: string;
  clientSecret: string;
  setCredentials: (clientId: string, clientSecret: string) => void;
  loadCredentials: () => void;
  
  // Preview controls
  playPreview: (track: SpotifyTrack) => void;
  stopPreview: () => void;
  
  // Reset
  clearError: () => void;
}

// ─── API Helper ──────────────────────────────────────────────────────────────

async function spotifyApi(params: Record<string, string>): Promise<any> {
  const query = new URLSearchParams(params).toString();
  const store = useSpotifyStore.getState();
  
  const headers: Record<string, string> = {};
  if (store.clientId) headers['x-spotify-client-id'] = store.clientId;
  if (store.clientSecret) headers['x-spotify-client-secret'] = store.clientSecret;

  const res = await fetch(`/api/spotify?${query}`, { headers });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useSpotifyStore = create<SpotifyState>((set, get) => ({
  clientId: '',
  clientSecret: '',
  setCredentials: (clientId, clientSecret) => {
    localStorage.setItem('focusforge_spotify_client_id', clientId);
    localStorage.setItem('focusforge_spotify_client_secret', clientSecret);
    set({ clientId, clientSecret });
  },
  loadCredentials: () => {
    const cid = localStorage.getItem('focusforge_spotify_client_id') || '';
    const sec = localStorage.getItem('focusforge_spotify_client_secret') || '';
    set({ clientId: cid, clientSecret: sec });
  },

  isConnected: false,
  isLoading: false,
  error: null,

  activeView: 'search',
  searchQuery: '',
  searchResults: { tracks: [], albums: [], artists: [], playlists: [] },

  newReleases: [],
  featuredPlaylists: [],
  categories: [],
  categoryPlaylists: [],
  selectedCategory: null,

  selectedPlaylist: null,
  selectedPlaylistTracks: [],
  selectedAlbum: null,
  selectedAlbumTracks: [],
  selectedArtist: null,
  artistTopTracks: [],
  artistAlbums: [],

  recommendations: [],

  previewTrackId: null,
  previewAudio: null,
  isPreviewPlaying: false,

  setActiveView: (view) => set({ activeView: view }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  checkConnection: async () => {
    try {
      set({ isLoading: true, error: null });
      await spotifyApi({ action: 'genres' });
      set({ isConnected: true, isLoading: false });
    } catch (err: any) {
      set({ isConnected: false, isLoading: false, error: err?.message || 'Connection failed' });
    }
  },

  search: async (query: string) => {
    if (!query.trim()) return;
    try {
      set({ isLoading: true, error: null, searchQuery: query });
      const data = await spotifyApi({
        action: 'search',
        q: query,
        type: 'track,album,artist,playlist',
        limit: '20',
      });
      set({
        searchResults: {
          tracks: data.tracks?.items || [],
          albums: data.albums?.items || [],
          artists: data.artists?.items || [],
          playlists: data.playlists?.items || [],
        },
        isLoading: false,
        activeView: 'search',
      });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message });
    }
  },

  fetchNewReleases: async () => {
    try {
      set({ isLoading: true, error: null });
      const data = await spotifyApi({ action: 'browse-new-releases', limit: '20' });
      set({
        newReleases: data.albums?.items || [],
        isLoading: false,
        activeView: 'new-releases',
      });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message });
    }
  },

  fetchFeaturedPlaylists: async () => {
    try {
      set({ isLoading: true, error: null });
      const data = await spotifyApi({ action: 'browse-featured-playlists', limit: '20' });
      set({
        featuredPlaylists: data.playlists?.items || [],
        isLoading: false,
        activeView: 'featured',
      });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message });
    }
  },

  fetchCategories: async () => {
    try {
      set({ isLoading: true, error: null });
      const data = await spotifyApi({ action: 'browse-categories', limit: '40' });
      set({
        categories: data.categories?.items || [],
        isLoading: false,
        activeView: 'categories',
      });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message });
    }
  },

  fetchCategoryPlaylists: async (category: SpotifyCategory) => {
    try {
      set({ isLoading: true, error: null, selectedCategory: category });
      const data = await spotifyApi({
        action: 'category-playlists',
        id: category.id,
        limit: '20',
      });
      set({
        categoryPlaylists: data.playlists?.items || [],
        isLoading: false,
        activeView: 'category-detail',
      });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message });
    }
  },

  fetchPlaylistDetail: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const data = await spotifyApi({ action: 'playlist', id });
      const tracks = (data.tracks?.items || [])
        .map((item: any) => item.track)
        .filter((t: any) => t && t.id);
      set({
        selectedPlaylist: data,
        selectedPlaylistTracks: tracks,
        isLoading: false,
        activeView: 'playlist-detail',
      });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message });
    }
  },

  fetchAlbumDetail: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const [albumData, tracksData] = await Promise.all([
        spotifyApi({ action: 'album', id }),
        spotifyApi({ action: 'album-tracks', id, limit: '50' }),
      ]);
      
      // Album tracks don't have album info, inject it
      const tracks = (tracksData.items || []).map((t: any) => ({
        ...t,
        album: {
          id: albumData.id,
          name: albumData.name,
          images: albumData.images,
          release_date: albumData.release_date,
          total_tracks: albumData.total_tracks,
          artists: albumData.artists,
          album_type: albumData.album_type,
        },
      }));

      set({
        selectedAlbum: albumData,
        selectedAlbumTracks: tracks,
        isLoading: false,
        activeView: 'album-detail',
      });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message });
    }
  },

  fetchArtistDetail: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const [artist, topTracks, albums] = await Promise.all([
        spotifyApi({ action: 'artist', id }),
        spotifyApi({ action: 'artist-top-tracks', id }),
        spotifyApi({ action: 'artist-albums', id, limit: '20' }),
      ]);
      set({
        selectedArtist: artist,
        artistTopTracks: topTracks.tracks || [],
        artistAlbums: albums.items || [],
        isLoading: false,
        activeView: 'artist-detail',
      });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message });
    }
  },

  fetchRecommendations: async (seedGenres?: string) => {
    try {
      set({ isLoading: true, error: null });
      const params: Record<string, string> = { action: 'recommendations', limit: '30' };
      if (seedGenres) params.seed_genres = seedGenres;
      else params.seed_genres = 'chill,study,ambient,lo-fi,electronic';
      
      const data = await spotifyApi(params);
      set({
        recommendations: data.tracks || [],
        isLoading: false,
        activeView: 'recommendations',
      });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message });
    }
  },

  playPreview: (track: SpotifyTrack) => {
    const state = get();
    
    // Stop current preview
    if (state.previewAudio) {
      state.previewAudio.pause();
      state.previewAudio.src = '';
    }

    if (!track.preview_url) {
      set({ previewTrackId: track.id, isPreviewPlaying: false, previewAudio: null });
      return;
    }

    const audio = new Audio(track.preview_url);
    audio.volume = 0.7;
    audio.onended = () => set({ isPreviewPlaying: false, previewTrackId: null });
    audio.play().catch(() => {});
    
    set({ previewTrackId: track.id, previewAudio: audio, isPreviewPlaying: true });
  },

  stopPreview: () => {
    const state = get();
    if (state.previewAudio) {
      state.previewAudio.pause();
      state.previewAudio.src = '';
    }
    set({ previewTrackId: null, previewAudio: null, isPreviewPlaying: false });
  },

  clearError: () => set({ error: null }),
}));

// ─── Utilities ───────────────────────────────────────────────────────────────

export function formatSpotifyDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function getSpotifyImage(images: SpotifyImage[], size: 'small' | 'medium' | 'large' = 'medium'): string {
  if (!images || images.length === 0) return '';
  if (size === 'large') return images[0]?.url || '';
  if (size === 'small') return images[images.length - 1]?.url || images[0]?.url || '';
  return images[Math.min(1, images.length - 1)]?.url || images[0]?.url || '';
}

/**
 * Convert a Spotify track to a format that can be searched on YouTube
 * for actual playback in The Frequency's YouTube-based player
 */
export function spotifyTrackToYouTubeQuery(track: SpotifyTrack): string {
  const artists = track.artists.map(a => a.name).join(' ');
  return `${track.name} ${artists} official audio`;
}
