"use client";

import { useFrequencyStore, Playlist, Track } from '../hooks/useFrequencyStore';
import { useAppStore } from '../hooks/useAppStore';

/**
 * Text normalization: lowercase, unicode NFKD strip, remove punctuation, collapse whitespace.
 */
export function normalizeText(value: string): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Levenshtein distance for fuzzy misspelling similarity (returns 0.0 to 1.0).
 */
export function calculateFuzzySimilarity(s1: string, s2: string): number {
  const a = normalizeText(s1);
  const b = normalizeText(s2);
  if (!a && !b) return 1.0;
  if (!a || !b) return 0.0;
  if (a === b) return 1.0;
  if (a.includes(b) || b.includes(a)) return 0.9;

  const matrix: number[][] = [];
  const lenA = a.length;
  const lenB = b.length;

  for (let i = 0; i <= lenA; i++) matrix[i] = [i];
  for (let j = 0; j <= lenB; j++) matrix[0][j] = j;

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[lenA][lenB];
  const maxLen = Math.max(lenA, lenB);
  return Math.max(0, 1 - distance / maxLen);
}

export interface PlaylistMatchCandidate {
  playlistId: string;
  title: string;
  score: number;
  matchReasons: string[];
  trackCount: number;
  playlist: Playlist;
}

export interface SongMatchCandidate {
  songId: string;
  title: string;
  artist: string;
  score: number;
  matchReasons: string[];
  track: Track;
}

export interface PendingMusicClarification {
  type: 'PLAYLIST_CHOICE' | 'QUEUE_REPLACE_CONFIRMATION' | 'ACTION_CONFIRMATION';
  candidates?: PlaylistMatchCandidate[];
  actionPayload?: any;
  prompt: string;
  createdAt: number;
}

// Global short-lived pending clarification state for follow-up turns
let pendingClarification: PendingMusicClarification | null = null;

export function setPendingMusicClarification(clarification: PendingMusicClarification | null) {
  pendingClarification = clarification;
}

export function getPendingMusicClarification(): PendingMusicClarification | null {
  if (!pendingClarification) return null;
  // Expire pending clarification after 45 seconds
  if (Date.now() - pendingClarification.createdAt > 45000) {
    pendingClarification = null;
    return null;
  }
  return pendingClarification;
}

export function clearPendingMusicClarification() {
  pendingClarification = null;
}

// Mood, activity, & theme keyword dictionary mapping
const THEME_KEYWORDS: Record<string, string[]> = {
  study: ['study', 'study music', 'studying', 'homework', 'focus', 'deep work', 'reading', 'learn', 'revision'],
  workout: ['workout', 'gym', 'training', 'fitness', 'exercise', 'lifting', 'cardio', 'pump', 'energy', 'beast'],
  chill: ['chill', 'relax', 'calm', 'ambient', 'peaceful', 'lofi', 'sleep', 'rest', 'soothing'],
  night: ['night', 'late night', 'midnight', 'night drive', 'dark', 'evening', 'after hours', 'moon'],
  gaming: ['game', 'gaming', 'arcade', 'cyberpunk', 'synthwave', 'electronic', 'stream'],
  party: ['party', 'dance', 'club', 'hype', 'upbeat', 'celebration', 'weekend'],
  focus: ['focus', 'deep focus', 'alpha', 'brainwave', 'binaural', 'coding', 'session']
};

// Color name dictionary for cover color matching
const COLOR_KEYWORDS: Record<string, string[]> = {
  purple: ['purple', 'violet', 'magenta', 'indigo', 'lavender', 'plum'],
  cyan: ['cyan', 'blue', 'teal', 'azure', 'aqua', 'sky'],
  emerald: ['emerald', 'green', 'mint', 'lime', 'nature'],
  solar: ['solar', 'gold', 'yellow', 'amber', 'orange', 'sun'],
  rose: ['rose', 'red', 'crimson', 'pink', 'ruby'],
  midnight: ['black', 'dark', 'midnight', 'obsidian', 'night']
};

/**
 * Dedicated Multi-Factor Playlist Resolver
 */
export function resolvePlaylist(
  query: string,
  options: {
    playlists?: Playlist[];
    tracks?: Track[];
    currentPlaylistId?: string | null;
    currentView?: string;
  } = {}
): PlaylistMatchCandidate[] {
  const store = useFrequencyStore.getState();
  const appStore = useAppStore.getState();

  const playlists = options.playlists ?? store.playlists ?? [];
  const tracks = options.tracks ?? store.tracks ?? [];
  const currentPlaylistId = options.currentPlaylistId ?? store.activePlaylistId;
  const currentView = options.currentView ?? appStore.view;

  if (playlists.length === 0) return [];

  const normQuery = normalizeText(query);
  if (!normQuery) return [];

  // Contextual query: "this playlist", "current playlist", "playlist I'm viewing"
  const isContextualThis =
    normQuery.includes('this') ||
    normQuery.includes('current') ||
    normQuery.includes('here') ||
    normQuery.includes('viewing');

  if (isContextualThis && currentPlaylistId) {
    const activePl = playlists.find(p => p.id === currentPlaylistId);
    if (activePl) {
      return [{
        playlistId: activePl.id,
        title: activePl.name,
        score: 0.99,
        matchReasons: ['Currently viewed playlist on screen'],
        trackCount: activePl.trackIds?.length || 0,
        playlist: activePl
      }];
    }
  }

  // Strip conversational wrappers: "my ... playlist", "the playlist called ...", "playlist that has ..."
  const cleanQuery = normQuery
    .replace(/\b(play|playlist|the playlist|my playlist|called|named|with|that has|in it|i made for)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const queryTerms = (cleanQuery || normQuery).split(' ').filter(Boolean);

  const candidates: PlaylistMatchCandidate[] = [];

  for (const pl of playlists) {
    let score = 0.0;
    const matchReasons: string[] = [];

    const plName = pl.name || 'Untitled';
    const normPlName = normalizeText(plName);
    const plDesc = normalizeText(pl.description || '');

    // 1. Exact Name Match
    if (normPlName === normQuery || normPlName === cleanQuery) {
      score = Math.max(score, 1.0);
      matchReasons.push(`Exact title match: "${plName}"`);
    }
    // 2. Substring Name Match
    else if (cleanQuery && (normPlName.includes(cleanQuery) || cleanQuery.includes(normPlName))) {
      score = Math.max(score, 0.94);
      matchReasons.push(`Title contains "${cleanQuery}"`);
    }
    // 3. Word Permutations Match
    else if (queryTerms.length > 0) {
      const allWordsPresent = queryTerms.every(term => normPlName.includes(term));
      const someWordsPresent = queryTerms.some(term => normPlName.includes(term));
      if (allWordsPresent) {
        score = Math.max(score, 0.90);
        matchReasons.push(`All search words match title`);
      } else if (someWordsPresent) {
        score = Math.max(score, 0.72);
        matchReasons.push(`Partial word match in title`);
      }
    }

    // 4. Fuzzy / Spelling Similarity on Title
    const fuzzySim = calculateFuzzySimilarity(cleanQuery || normQuery, normPlName);
    if (fuzzySim >= 0.75) {
      if (fuzzySim > score) {
        score = Math.max(score, fuzzySim * 0.92);
        matchReasons.push(`Spelling similarity (${Math.round(fuzzySim * 100)}%)`);
      }
    }

    // 5. Description & Tag Matching
    if (plDesc && (normQuery.includes(plDesc) || (cleanQuery && plDesc.includes(cleanQuery)))) {
      score = Math.max(score, 0.85);
      matchReasons.push(`Matches playlist description`);
    }

    // 6. Mood / Activity Keyword Matching
    for (const [category, keywords] of Object.entries(THEME_KEYWORDS)) {
      const userAskedCategory = keywords.some(k => normQuery.includes(k) || cleanQuery.includes(k));
      const plHasCategory = keywords.some(k => normPlName.includes(k) || plDesc.includes(k));
      if (userAskedCategory && plHasCategory) {
        score = Math.max(score, 0.88);
        matchReasons.push(`Matches mood category: "${category}"`);
      }
    }

    // 7. Song Contained within Playlist Matching (e.g. "playlist that has Blinding Lights in it")
    const plTracks = (pl.trackIds || [])
      .map(id => tracks.find(t => t.id === id))
      .filter((t): t is Track => Boolean(t));

    for (const t of plTracks) {
      const normSongTitle = normalizeText(t.title);
      const normArtist = normalizeText(t.artist);

      if (cleanQuery && (normSongTitle.includes(cleanQuery) || calculateFuzzySimilarity(cleanQuery, normSongTitle) > 0.8)) {
        score = Math.max(score, 0.86);
        matchReasons.push(`Contains matching song: "${t.title}"`);
      }
      if (cleanQuery && (normArtist.includes(cleanQuery) || calculateFuzzySimilarity(cleanQuery, normArtist) > 0.8)) {
        score = Math.max(score, 0.80);
        matchReasons.push(`Contains songs by artist: "${t.artist}"`);
      }
    }

    // 8. Cover Color Matching (e.g. "purple cover", "blue playlist")
    for (const [colorName, colorKeywords] of Object.entries(COLOR_KEYWORDS)) {
      const userAskedColor = colorKeywords.some(c => normQuery.includes(c));
      if (userAskedColor) {
        const coverMatches =
          normPlName.includes(colorName) ||
          plDesc.includes(colorName) ||
          (pl.coverThumbnail && pl.coverThumbnail.toLowerCase().includes(colorName));
        if (coverMatches) {
          score = Math.max(score, 0.84);
          matchReasons.push(`Matches cover color theme: "${colorName}"`);
        }
      }
    }

    // 9. Recency Weighting Boost (up to +0.05)
    if (pl.updatedAt) {
      const ageHours = (Date.now() - pl.updatedAt) / (1000 * 60 * 60);
      if (ageHours < 24) {
        score = Math.min(1.0, score + 0.04);
        matchReasons.push(`Recently modified`);
      }
    }

    if (score > 0.45) {
      candidates.push({
        playlistId: pl.id,
        title: pl.name,
        score: Math.min(1.0, Number(score.toFixed(2))),
        matchReasons,
        trackCount: pl.trackIds?.length || 0,
        playlist: pl
      });
    }
  }

  // Rank by score descending
  return candidates.sort((a, b) => b.score - a.score);
}

/**
 * Dedicated Song Resolver across tracks
 */
export function resolveSong(
  query: string,
  tracks?: Track[]
): SongMatchCandidate[] {
  const store = useFrequencyStore.getState();
  const allTracks = tracks ?? store.tracks ?? [];
  if (allTracks.length === 0) return [];

  const normQuery = normalizeText(query);
  if (!normQuery) return [];

  const cleanQuery = normQuery
    .replace(/\b(play|song|track|stream|listen to|by|the)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const candidates: SongMatchCandidate[] = [];

  for (const track of allTracks) {
    let score = 0.0;
    const matchReasons: string[] = [];

    const normTitle = normalizeText(track.title);
    const normArtist = normalizeText(track.artist);

    // Exact title
    if (normTitle === normQuery || normTitle === cleanQuery) {
      score = 1.0;
      matchReasons.push(`Exact song title match`);
    }
    // Substring title
    else if (cleanQuery && normTitle.includes(cleanQuery)) {
      score = 0.92;
      matchReasons.push(`Title contains "${cleanQuery}"`);
    }
    // Substring artist
    else if (cleanQuery && normArtist.includes(cleanQuery)) {
      score = 0.85;
      matchReasons.push(`Artist contains "${cleanQuery}"`);
    }
    // Fuzzy match
    else {
      const titleSim = calculateFuzzySimilarity(cleanQuery || normQuery, normTitle);
      const artistSim = calculateFuzzySimilarity(cleanQuery || normQuery, normArtist);
      const maxSim = Math.max(titleSim, artistSim);
      if (maxSim >= 0.70) {
        score = maxSim * 0.88;
        matchReasons.push(`Fuzzy match (${Math.round(maxSim * 100)}%)`);
      }
    }

    if (score > 0.5) {
      candidates.push({
        songId: track.id,
        title: track.title,
        artist: track.artist,
        score: Math.min(1.0, Number(score.toFixed(2))),
        matchReasons,
        track
      });
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

/**
 * Play a fully resolved playlist with optional start index and shuffle mode
 */
export async function playResolvedPlaylist(params: {
  playlistId: string;
  startIndex?: number;
  shuffle?: boolean;
  startFromBeginning?: boolean;
}): Promise<{ success: boolean; playlistName: string; trackCount: number; message: string }> {
  const store = useFrequencyStore.getState();
  const playlist = store.playlists.find(p => p.id === params.playlistId);

  if (!playlist) {
    throw new Error('Playlist not found');
  }

  const trackIds = playlist.trackIds || [];
  if (trackIds.length === 0) {
    throw new Error('This playlist has no playable songs');
  }

  // Load all tracks from playlist into queue
  const startIndex = params.startFromBeginning ? 0 : (params.startIndex ?? 0);
  const clampedIndex = Math.max(0, Math.min(startIndex, trackIds.length - 1));

  // If shuffle requested, enable store shuffle
  if (params.shuffle && !store.shuffle) {
    store.toggleShuffle();
  } else if (params.shuffle === false && store.shuffle) {
    store.toggleShuffle();
  }

  store.setActivePlaylistId(playlist.id);
  store.playPlaylist(playlist.id, clampedIndex);

  // Verify playback state
  const currentTrack = store.getCurrentTrack();

  return {
    success: true,
    playlistName: playlist.name,
    trackCount: trackIds.length,
    message: `Playing "${playlist.name}" (${trackIds.length} tracks).`
  };
}

/**
 * Play a resolved song directly
 */
export async function playResolvedSong(params: {
  songId: string;
  insertNext?: boolean;
}): Promise<{ success: boolean; title: string; artist: string; message: string }> {
  const store = useFrequencyStore.getState();
  const track = store.tracks.find(t => t.id === params.songId);

  if (!track) {
    throw new Error('Track not found in library');
  }

  if (params.insertNext) {
    store.addToQueue(track.id, true);
    return {
      success: true,
      title: track.title,
      artist: track.artist,
      message: `Added "${track.title}" to play next.`
    };
  }

  store.playTrack(track.id);
  return {
    success: true,
    title: track.title,
    artist: track.artist,
    message: `Playing "${track.title}" by ${track.artist}.`
  };
}
