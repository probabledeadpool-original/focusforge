import { create } from 'zustand';
import { AudioEnhancementEngine, AudioEnhancementPreset, AudioEnhancementParams } from '../app/components/TheFrequency/AudioEnhancementEngine';

export type { AudioEnhancementPreset, AudioEnhancementParams };

// --- Data Models ---
export interface Track {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  dominantColor: string;
  addedAt: number;
  lastPlayedAt?: number;
  duration?: number;
  sourceUrl: string;
  year?: string | number;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverThumbnail?: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
  curator?: string;
  linkedTimerId?: string;
}

export type EdgeLightingMode = 'ambient' | 'pulse' | 'flow' | 'spectrum' | 'cinematic' | 'energy' | 'reactive' | 'custom';
export type EdgeLightingColorSource = 'dominant' | 'cover' | 'adaptive' | 'custom';
export type EdgeLightingColorTheme = 'adaptive' | 'cyberpunk' | 'midnight' | 'solar' | 'emerald' | 'prismatic' | 'ice';

export interface CoverPalette {
  primary: string;
  secondary: string;
  accent: string;
  ambient: string;
  highlight: string;
}

export interface CustomLightingConfig {
  intensity: number;      // 10 to 100
  motion: number;         // 0 to 100 (Still -> Fluid)
  bassResponse: number;   // 0 to 100 (Low -> High)
  colorReactivity: number;// 0 to 100 (Subtle -> Dynamic)
  glowSpread: number;     // 10 to 100 (Tight -> Wide)
  speed: number;          // 10 to 100 (Slow -> Fast)
}

interface FrequencyState {
  // Library
  tracks: Track[];
  playlists: Playlist[];

  // Playback
  currentTrackId: string | null;
  queue: string[];
  originalQueue: string[];
  queueIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';

  // UI
  isExpanded: boolean;
  isStudioOpen: boolean;
  activeTab: 'home' | 'playlists' | 'creatives';
  activePlaylistId: string | null;

  // Hydrated flag
  _hydrated: boolean;

  // Visual Effects - Edge Lighting Matrix
  edgeLighting: boolean;
  edgeLightingMode: EdgeLightingMode;
  edgeLightingColorSource: EdgeLightingColorSource;
  edgeLightingColorTheme: EdgeLightingColorTheme;
  coverPalette: CoverPalette | null;
  edgeLightingIntensity: number;
  edgeLightingSpread: number;
  edgeLightingSensitivity: number;
  customLighting: CustomLightingConfig;
  setEdgeLighting: (enabled: boolean) => void;
  toggleEdgeLighting: () => void;
  setEdgeLightingMode: (mode: EdgeLightingMode) => void;
  setEdgeLightingColorSource: (source: EdgeLightingColorSource) => void;
  setEdgeLightingColorTheme: (theme: EdgeLightingColorTheme) => void;
  setCoverPalette: (palette: CoverPalette | null) => void;
  setEdgeLightingIntensity: (val: number) => void;
  setEdgeLightingSpread: (val: number) => void;
  setEdgeLightingSensitivity: (val: number) => void;
  setCustomLighting: (config: Partial<CustomLightingConfig>) => void;
  setStudioOpen: (open: boolean) => void;

  // Audio Enhancement Engine
  audioPreset: AudioEnhancementPreset;
  audioParams: AudioEnhancementParams;
  setAudioPreset: (preset: AudioEnhancementPreset) => void;
  setAudioParams: (params: Partial<AudioEnhancementParams>) => void;

  // Actions
  addTrack: (track: Track) => void;
  removeTrack: (id: string) => void;
  playTrack: (id: string) => void;
  playPlaylist: (playlistId: string, startIndex?: number) => void;
  playQueue: (trackIds: string[], startIndex?: number) => void;
  togglePlay: () => void;
  next: (isAuto?: boolean) => void;
  previous: () => void;
  seek: (time: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (vol: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setExpanded: (expanded: boolean) => void;
  setActiveTab: (tab: 'home' | 'playlists' | 'creatives') => void;
  setActivePlaylistId: (id: string | null) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;

  // Queue management
  addToQueue: (trackId: string, insertAfterCurrent?: boolean) => void;
  removeFromQueue: (trackId: string) => void;
  reorderQueue: (trackIds: string[]) => void;

  // Playlist CRUD
  createPlaylist: (name: string, description?: string, coverThumbnail?: string) => string;
  deletePlaylist: (id: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  addToPlaylist: (playlistId: string, trackId: string) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  reorderPlaylist: (playlistId: string, trackIds: string[]) => void;
  linkPlaylistToTimer: (playlistId: string, timerId: string | undefined) => void;

  // Helpers
  getCurrentTrack: () => Track | null;
  hydrate: () => void;
  playbackTrigger: number;
}

const STORAGE_KEY = 'focusforge-frequency-v3';
const TRACKS_VAULT_KEY = 'focusforge-frequency-tracks-vault-v3';
const PLAYLISTS_VAULT_KEY = 'focusforge-frequency-playlists-vault-v3';

const generateId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function saveToStorage(state: FrequencyState) {
  if (typeof window === 'undefined') return;

  try {
    const data = {
      tracks: state.tracks,
      playlists: state.playlists,
      volume: state.volume,
      shuffle: state.shuffle,
      repeat: state.repeat,
      queue: state.queue,
      originalQueue: state.originalQueue,
      queueIndex: state.queueIndex,
      currentTrackId: state.currentTrackId,
      activePlaylistId: state.activePlaylistId,
      edgeLighting: state.edgeLighting,
      edgeLightingMode: state.edgeLightingMode,
      edgeLightingColorSource: state.edgeLightingColorSource,
      edgeLightingColorTheme: state.edgeLightingColorTheme,
      coverPalette: state.coverPalette,
      edgeLightingIntensity: state.edgeLightingIntensity,
      edgeLightingSpread: state.edgeLightingSpread,
      edgeLightingSensitivity: state.edgeLightingSensitivity,
      customLighting: state.customLighting,
      audioPreset: state.audioPreset,
      audioParams: state.audioParams,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    
    // Permanent multi-vault sync
    localStorage.setItem(TRACKS_VAULT_KEY, JSON.stringify(state.tracks));
    localStorage.setItem(PLAYLISTS_VAULT_KEY, JSON.stringify(state.playlists));
  } catch (err) {
    console.debug('Failed to save frequency store to localStorage:', err);
  }
}

// Initial state loader (Pure real user data only - Zero Mock Data)
const getInitialStateFromStorage = () => {
  if (typeof window === 'undefined') {
    return {
      tracks: [] as Track[],
      playlists: [] as Playlist[],
      currentTrackId: null as string | null,
      queue: [] as string[],
      originalQueue: [] as string[],
      activePlaylistId: null as string | null,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const rawVaultTracks = localStorage.getItem(TRACKS_VAULT_KEY);
    const rawVaultPlaylists = localStorage.getItem(PLAYLISTS_VAULT_KEY);

    let tracks: Track[] = [];
    let playlists: Playlist[] = [];

    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.tracks)) {
        tracks = parsed.tracks;
      }
      if (Array.isArray(parsed.playlists)) {
        playlists = parsed.playlists;
      }
    } else if (rawVaultTracks) {
      const parsedTracks = JSON.parse(rawVaultTracks);
      if (Array.isArray(parsedTracks)) {
        tracks = parsedTracks;
      }
      if (rawVaultPlaylists) {
        const parsedPlaylists = JSON.parse(rawVaultPlaylists);
        if (Array.isArray(parsedPlaylists)) {
          playlists = parsedPlaylists;
        }
      }
    }

    return {
      tracks,
      playlists,
      currentTrackId: tracks[0]?.id || null,
      queue: tracks.map(t => t.id),
      originalQueue: tracks.map(t => t.id),
      activePlaylistId: null as string | null,
    };
  } catch {
    return {
      tracks: [] as Track[],
      playlists: [] as Playlist[],
      currentTrackId: null as string | null,
      queue: [] as string[],
      originalQueue: [] as string[],
      activePlaylistId: null as string | null,
    };
  }
};

const initial = getInitialStateFromStorage();

export const useFrequencyStore = create<FrequencyState>((set, get) => ({
  tracks: initial.tracks,
  playlists: initial.playlists,
  currentTrackId: initial.currentTrackId,
  queue: initial.queue,
  originalQueue: initial.originalQueue,
  queueIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 80,
  shuffle: false,
  repeat: 'none',
  isExpanded: false,
  isStudioOpen: false,
  activeTab: 'home',
  activePlaylistId: initial.activePlaylistId,
  edgeLighting: true,
  edgeLightingMode: 'ambient',
  edgeLightingColorSource: 'cover',
  edgeLightingColorTheme: 'adaptive',
  coverPalette: null,
  edgeLightingIntensity: 75,
  edgeLightingSpread: 70,
  edgeLightingSensitivity: 75,
  customLighting: {
    intensity: 75,
    motion: 60,
    bassResponse: 70,
    colorReactivity: 65,
    glowSpread: 70,
    speed: 50,
  },
  audioPreset: 'enhanced',
  audioParams: {
    bass: 70,
    clarity: 65,
    spatial: 60,
    intensity: 80,
  },
  _hydrated: typeof window !== 'undefined',
  playbackTrigger: 0,

  hydrate: () => {
    if (typeof window === 'undefined') return;
    try {
      let tracksToUse: Track[] = [];
      let playlistsToUse: Playlist[] = [];
      
      const raw = localStorage.getItem(STORAGE_KEY);
      const rawVaultTracks = localStorage.getItem(TRACKS_VAULT_KEY);
      const rawVaultPlaylists = localStorage.getItem(PLAYLISTS_VAULT_KEY);

      let data: any = {};
      if (raw) {
        try {
          data = JSON.parse(raw);
          if (Array.isArray(data.tracks)) {
            tracksToUse = data.tracks;
          }
          if (Array.isArray(data.playlists)) {
            playlistsToUse = data.playlists;
          }
        } catch {}
      }

      // Vault fallback
      if (tracksToUse.length === 0 && rawVaultTracks) {
        try {
          const vaultTracks = JSON.parse(rawVaultTracks);
          if (Array.isArray(vaultTracks)) {
            tracksToUse = vaultTracks;
          }
        } catch {}
      }

      if (playlistsToUse.length === 0 && rawVaultPlaylists) {
        try {
          const vaultPlaylists = JSON.parse(rawVaultPlaylists);
          if (Array.isArray(vaultPlaylists)) {
            playlistsToUse = vaultPlaylists;
          }
        } catch {}
      }

      const preset = data.audioPreset || 'enhanced';
      const params = data.audioParams || { bass: 70, clarity: 65, spatial: 60, intensity: 80 };
      AudioEnhancementEngine.setPreset(preset);
      AudioEnhancementEngine.setParams(params);

      const queueToUse = Array.isArray(data.queue) && data.queue.length > 0 
        ? data.queue 
        : tracksToUse.map(t => t.id);
      const currentTrackIdToUse = data.currentTrackId && tracksToUse.some(t => t.id === data.currentTrackId)
        ? data.currentTrackId
        : tracksToUse[0]?.id || null;

      const activePlaylistIdToUse = (data.activePlaylistId && playlistsToUse.some(p => p.id === data.activePlaylistId))
        ? data.activePlaylistId
        : null;

      set({
        tracks: tracksToUse,
        playlists: playlistsToUse,
        volume: data.volume ?? 80,
        shuffle: data.shuffle ?? false,
        repeat: data.repeat ?? 'none',
        queue: queueToUse,
        originalQueue: Array.isArray(data.originalQueue) && data.originalQueue.length > 0 ? data.originalQueue : queueToUse,
        queueIndex: data.queueIndex ?? 0,
        currentTrackId: currentTrackIdToUse,
        activePlaylistId: activePlaylistIdToUse,
        edgeLighting: data.edgeLighting ?? true,
        edgeLightingMode: data.edgeLightingMode || 'ambient',
        edgeLightingColorSource: data.edgeLightingColorSource || 'cover',
        edgeLightingColorTheme: data.edgeLightingColorTheme || 'adaptive',
        coverPalette: data.coverPalette || null,
        edgeLightingIntensity: data.edgeLightingIntensity ?? 75,
        edgeLightingSpread: data.edgeLightingSpread ?? 70,
        edgeLightingSensitivity: data.edgeLightingSensitivity ?? 75,
        customLighting: data.customLighting || {
          intensity: 75,
          motion: 60,
          bassResponse: 70,
          colorReactivity: 65,
          glowSpread: 70,
          speed: 50,
        },
        audioPreset: preset,
        audioParams: params,
        _hydrated: true,
      });

      // Synchronize to vault
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...data,
        tracks: tracksToUse,
        playlists: playlistsToUse,
        activePlaylistId: activePlaylistIdToUse
      }));
      localStorage.setItem(TRACKS_VAULT_KEY, JSON.stringify(tracksToUse));
      localStorage.setItem(PLAYLISTS_VAULT_KEY, JSON.stringify(playlistsToUse));
    } catch {
      set({ _hydrated: true });
    }
  },

  setEdgeLighting: (enabled: boolean) => {
    set({ edgeLighting: enabled });
    saveToStorage(get());
  },

  toggleEdgeLighting: () => {
    const state = get();
    const next = !state.edgeLighting;
    set({ edgeLighting: next });
    saveToStorage({ ...state, edgeLighting: next });
  },

  setEdgeLightingMode: (mode: EdgeLightingMode) => {
    set({ edgeLightingMode: mode });
    saveToStorage(get());
  },

  setEdgeLightingColorSource: (source: EdgeLightingColorSource) => {
    set({ edgeLightingColorSource: source });
    saveToStorage(get());
  },

  setEdgeLightingColorTheme: (theme: EdgeLightingColorTheme) => {
    set({ edgeLightingColorTheme: theme });
    saveToStorage(get());
  },

  setCoverPalette: (palette: CoverPalette | null) => {
    set({ coverPalette: palette });
    saveToStorage(get());
  },

  setEdgeLightingIntensity: (val: number) => {
    set({ edgeLightingIntensity: Math.max(10, Math.min(100, val)) });
    saveToStorage(get());
  },

  setEdgeLightingSpread: (val: number) => {
    set({ edgeLightingSpread: Math.max(10, Math.min(100, val)) });
    saveToStorage(get());
  },

  setEdgeLightingSensitivity: (val: number) => {
    set({ edgeLightingSensitivity: Math.max(10, Math.min(100, val)) });
    saveToStorage(get());
  },

  setCustomLighting: (config: Partial<CustomLightingConfig>) => {
    const current = get().customLighting;
    const next = { ...current, ...config };
    set({ customLighting: next });
    saveToStorage(get());
  },

  setStudioOpen: (open: boolean) => {
    set({ isStudioOpen: open });
  },

  setAudioPreset: (preset: AudioEnhancementPreset) => {
    AudioEnhancementEngine.setPreset(preset);
    set({ audioPreset: preset });
    saveToStorage(get());
  },

  setAudioParams: (params: Partial<AudioEnhancementParams>) => {
    const current = get().audioParams;
    const next = { ...current, ...params };
    AudioEnhancementEngine.setParams(next);
    set({ audioParams: next });
    saveToStorage(get());
  },

  addTrack: (track) => {
    const state = get();
    const existingIndex = state.tracks.findIndex(t => t.videoId === track.videoId || t.id === track.id);
    let newTracks: Track[];
    if (existingIndex >= 0) {
      newTracks = [...state.tracks];
      newTracks[existingIndex] = { ...newTracks[existingIndex], ...track };
    } else {
      newTracks = [track, ...state.tracks];
    }
    
    // Automatically set current track and queue if empty
    const newQueue = state.queue.length === 0 ? [track.id] : state.queue;
    const newCurrent = state.currentTrackId || track.id;

    set({ 
      tracks: newTracks,
      queue: newQueue,
      currentTrackId: newCurrent,
      _hydrated: true
    });

    saveToStorage({ ...state, tracks: newTracks, queue: newQueue, currentTrackId: newCurrent, _hydrated: true });
  },

  removeTrack: (id) => {
    const state = get();
    const nextTracks = state.tracks.filter(t => t.id !== id);
    const nextPlaylists = state.playlists.map(p => ({
      ...p,
      trackIds: p.trackIds.filter(tid => tid !== id),
    }));
    const nextQueue = state.queue.filter(qid => qid !== id);
    const nextCurrent = state.currentTrackId === id ? (nextQueue[0] || null) : state.currentTrackId;

    set({ 
      tracks: nextTracks, 
      playlists: nextPlaylists,
      queue: nextQueue,
      currentTrackId: nextCurrent
    });

    saveToStorage({ 
      ...state, 
      tracks: nextTracks, 
      playlists: nextPlaylists,
      queue: nextQueue,
      currentTrackId: nextCurrent,
      _hydrated: true
    });
  },

  playTrack: (id) => {
    const state = get();
    const track = state.tracks.find(t => t.id === id);
    if (!track) return;
    const isSameTrack = state.currentTrackId === id;
    const updatedTracks = state.tracks.map(t =>
      t.id === id ? { ...t, lastPlayedAt: Date.now() } : t
    );
    
    // Put track in queue if not already in queue
    let newQueue = state.queue;
    let newIdx = state.queue.indexOf(id);
    if (newIdx === -1) {
      newQueue = [id, ...state.queue];
      newIdx = 0;
    }

    set({
      currentTrackId: id,
      queue: newQueue,
      queueIndex: newIdx,
      isPlaying: true,
      currentTime: 0,
      tracks: updatedTracks,
      playbackTrigger: state.playbackTrigger + 1,
    });
    saveToStorage(get());
    if (isSameTrack) {
      get().seek(0);
    }
  },

  playPlaylist: (playlistId, startIndex = 0) => {
    const state = get();
    const playlist = state.playlists.find(p => p.id === playlistId);
    if (!playlist || playlist.trackIds.length === 0) return;
    let ids = [...playlist.trackIds];
    const originalIds = [...playlist.trackIds];
    if (state.shuffle) ids = shuffleArray(ids);
    const idx = Math.min(startIndex, ids.length - 1);
    const nextTrackId = ids[idx];
    const isSameTrack = state.currentTrackId === nextTrackId;
    set({
      activePlaylistId: playlistId,
      currentTrackId: nextTrackId,
      queue: ids,
      originalQueue: originalIds,
      queueIndex: idx,
      isPlaying: true,
      currentTime: 0,
      playbackTrigger: state.playbackTrigger + 1,
    });
    saveToStorage(get());
    if (isSameTrack) {
      get().seek(0);
    }
  },

  playQueue: (trackIds, startIndex = 0) => {
    const state = get();
    if (trackIds.length === 0) return;
    let ids = [...trackIds];
    const originalIds = [...trackIds];
    if (state.shuffle) ids = shuffleArray(ids);
    const idx = Math.min(startIndex, ids.length - 1);
    const nextTrackId = ids[idx];
    const isSameTrack = state.currentTrackId === nextTrackId;
    set({
      currentTrackId: nextTrackId,
      queue: ids,
      originalQueue: originalIds,
      queueIndex: idx,
      isPlaying: true,
      currentTime: 0,
      playbackTrigger: state.playbackTrigger + 1,
    });
    saveToStorage(get());
    if (isSameTrack) {
      get().seek(0);
    }
  },

  togglePlay: () => {
    const state = get();
    if (!state.currentTrackId && state.tracks.length > 0) {
      get().playTrack(state.tracks[0].id);
      return;
    }
    set({ isPlaying: !state.isPlaying });
  },

  next: (isAuto = false) => {
    const state = get();
    if (state.queue.length === 0) return;
    if (isAuto && state.repeat === 'one') {
      get().seek(0);
      return;
    }
    let nextIdx = state.queueIndex + 1;
    if (nextIdx >= state.queue.length) {
      if (state.repeat === 'all') {
        nextIdx = 0;
      } else {
        set({ isPlaying: false });
        return;
      }
    }
    const nextId = state.queue[nextIdx];
    const updatedTracks = state.tracks.map(t =>
      t.id === nextId ? { ...t, lastPlayedAt: Date.now() } : t
    );
    set({
      queueIndex: nextIdx,
      currentTrackId: nextId,
      currentTime: 0,
      isPlaying: true,
      tracks: updatedTracks,
    });
    saveToStorage(get());
  },

  previous: () => {
    const state = get();
    if (state.queue.length === 0) return;
    if (state.currentTime > 3) {
      get().seek(0);
      return;
    }
    let prevIdx = state.queueIndex - 1;
    if (prevIdx < 0) {
      if (state.repeat === 'all') {
        prevIdx = state.queue.length - 1;
      } else {
        get().seek(0);
        return;
      }
    }
    set({
      queueIndex: prevIdx,
      currentTrackId: state.queue[prevIdx],
      currentTime: 0,
      isPlaying: true,
    });
  },

  seek: (time) => {
    set({ currentTime: time });
    if (typeof window !== 'undefined' && (window as any).__frequencySeek) {
      (window as any).__frequencySeek(time);
    }
  },
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setVolume: (vol) => {
    set({ volume: Math.max(0, Math.min(100, vol)) });
    saveToStorage(get());
  },
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setExpanded: (expanded) => set({ isExpanded: expanded }),
  setActiveTab: (tab: 'home' | 'playlists' | 'creatives') => set({ activeTab: tab }),
  setActivePlaylistId: (id) => {
    set({ activePlaylistId: id });
    saveToStorage(get());
  },

  addToQueue: (trackId, insertAfterCurrent = false) => {
    const state = get();
    if (!state.tracks.some(t => t.id === trackId)) return;
    const queue = [...state.queue];
    if (queue.includes(trackId)) return;
    if (insertAfterCurrent && state.currentTrackId) {
      const insertAt = queue.indexOf(state.currentTrackId) + 1;
      queue.splice(insertAt, 0, trackId);
    } else {
      queue.push(trackId);
    }
    set({ queue });
    saveToStorage({ ...state, queue });
  },

  removeFromQueue: (trackId) => {
    const state = get();
    const queue = state.queue.filter(id => id !== trackId);
    let queueIndex = state.queueIndex;
    if (queueIndex >= queue.length) {
      queueIndex = Math.max(0, queue.length - 1);
    }
    if (state.currentTrackId === trackId) {
      const nextId = queue[queueIndex] || null;
      set({ queue, queueIndex, currentTrackId: nextId, isPlaying: Boolean(nextId) });
    } else {
      set({ queue, queueIndex });
    }
    saveToStorage({ ...state, queue, queueIndex, currentTrackId: state.currentTrackId });
  },

  reorderQueue: (trackIds) => {
    const state = get();
    const valid = trackIds.filter(id => state.queue.includes(id));
    if (valid.length !== trackIds.length) return;
    const queueIndex = state.currentTrackId ? valid.indexOf(state.currentTrackId) : 0;
    set({ queue: valid, queueIndex: queueIndex !== -1 ? queueIndex : 0 });
    saveToStorage({ ...state, queue: valid, queueIndex: queueIndex !== -1 ? queueIndex : 0 });
  },

  toggleShuffle: () => {
    const state = get();
    const nextShuffle = !state.shuffle;
    if (nextShuffle) {
      if (state.queue.length > 0) {
        const currentId = state.currentTrackId;
        const remaining = state.queue.filter(id => id !== currentId);
        const shuffled = shuffleArray(remaining);
        const newQueue = currentId ? [currentId, ...shuffled] : shuffled;
        set({
          shuffle: nextShuffle,
          originalQueue: state.queue,
          queue: newQueue,
          queueIndex: 0,
        });
      } else {
        set({ shuffle: nextShuffle });
      }
    } else {
      const orig = state.originalQueue.length > 0 ? state.originalQueue : state.queue;
      const currentId = state.currentTrackId;
      const newIdx = currentId ? orig.indexOf(currentId) : 0;
      set({
        shuffle: nextShuffle,
        queue: orig,
        queueIndex: newIdx !== -1 ? newIdx : 0,
      });
    }
    saveToStorage(get());
  },

  cycleRepeat: () => {
    const state = get();
    const order: FrequencyState['repeat'][] = ['none', 'all', 'one'];
    const idx = order.indexOf(state.repeat);
    const next = order[(idx + 1) % order.length];
    set({ repeat: next });
    saveToStorage({ ...state, repeat: next });
  },

  // Playlist CRUD
  createPlaylist: (name, description = '', coverThumbnail?: string) => {
    const id = generateId();
    const state = get();
    const playlist: Playlist = {
      id,
      name,
      description,
      curator: 'You',
      trackIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      coverThumbnail: coverThumbnail || (state.tracks[0]?.thumbnail) || undefined,
    };
    const next = { ...state, playlists: [...state.playlists, playlist], activePlaylistId: id };
    set({ playlists: next.playlists, activePlaylistId: id });
    saveToStorage(next);
    return id;
  },

  deletePlaylist: (id) => {
    const state = get();
    const next = { 
      ...state, 
      playlists: state.playlists.filter(p => p.id !== id),
      activePlaylistId: state.activePlaylistId === id ? (state.playlists.find(p => p.id !== id)?.id || null) : state.activePlaylistId
    };
    set({ playlists: next.playlists, activePlaylistId: next.activePlaylistId });
    saveToStorage(next);
  },

  renamePlaylist: (id, name) => {
    const state = get();
    const next = {
      ...state,
      playlists: state.playlists.map(p =>
        p.id === id ? { ...p, name, updatedAt: Date.now() } : p
      ),
    };
    set({ playlists: next.playlists });
    saveToStorage(next);
  },

  addToPlaylist: (playlistId, trackId) => {
    const state = get();
    const next = {
      ...state,
      playlists: state.playlists.map(p => {
        if (p.id !== playlistId) return p;
        if (p.trackIds.includes(trackId)) return p;
        return { 
          ...p, 
          trackIds: [...p.trackIds, trackId], 
          coverThumbnail: p.coverThumbnail || state.tracks.find(t => t.id === trackId)?.thumbnail,
          updatedAt: Date.now() 
        };
      }),
    };
    set({ playlists: next.playlists });
    saveToStorage(next);
  },

  removeFromPlaylist: (playlistId, trackId) => {
    const state = get();
    const next = {
      ...state,
      playlists: state.playlists.map(p =>
        p.id === playlistId
          ? { ...p, trackIds: p.trackIds.filter(id => id !== trackId), updatedAt: Date.now() }
          : p
      ),
    };
    set({ playlists: next.playlists });
    saveToStorage(next);
  },

  reorderPlaylist: (playlistId, trackIds) => {
    const state = get();
    const next = {
      ...state,
      playlists: state.playlists.map(p =>
        p.id === playlistId ? { ...p, trackIds, updatedAt: Date.now() } : p
      ),
    };
    set({ playlists: next.playlists });
    saveToStorage(next);
  },

  linkPlaylistToTimer: (playlistId, timerId) => {
    const state = get();
    const next = {
      ...state,
      playlists: state.playlists.map(p =>
        p.id === playlistId ? { ...p, linkedTimerId: timerId, updatedAt: Date.now() } : p
      ),
    };
    set({ playlists: next.playlists });
    saveToStorage(next);
  },

  getCurrentTrack: () => {
    const state = get();
    if (!state.currentTrackId) return null;
    return state.tracks.find(t => t.id === state.currentTrackId) || null;
  },
}));
