"use client";

import { useFrequencyStore, Track } from '../hooks/useFrequencyStore';
import { useAppStore } from '../hooks/useAppStore';
import { 
  resolvePlaylist, 
  resolveSong, 
  playResolvedPlaylist, 
  playResolvedSong,
  setPendingMusicClarification,
  getPendingMusicClarification,
  clearPendingMusicClarification
} from './musicResolver';
import { voiceLog } from './jarvisVoiceEngine';

/**
 * Validated Music Tools Suite for The Frequency & Gemini Live / AI Tool Invocations
 */

export interface MusicToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description?: string; enum?: string[] }>;
    required?: string[];
  };
}

export const MUSIC_TOOLS_DECLARATIONS: MusicToolDeclaration[] = [
  {
    name: 'open_frequency',
    description: 'Navigate to The Frequency music page in FocusForge.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'search_frequency',
    description: 'Search The Frequency library for songs, artists, or playlists by query.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Artist, song title, or genre to search for' }
      },
      required: ['query']
    }
  },
  {
    name: 'find_playlist',
    description: 'Find playlists in The Frequency using exact name, partial name, description, mood, artist, or contained songs.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term, mood, or contained song title' },
        limit: { type: 'number', description: 'Maximum number of results to return' }
      },
      required: ['query']
    }
  },
  {
    name: 'play_playlist',
    description: 'Start playing a resolved playlist in The Frequency with optional shuffle or start position.',
    parameters: {
      type: 'object',
      properties: {
        playlistId: { type: 'string', description: 'ID of the resolved playlist' },
        startIndex: { type: 'number', description: 'Index of track to start playing from (0-based)' },
        shuffle: { type: 'boolean', description: 'Whether to shuffle the playlist' },
        startFromBeginning: { type: 'boolean', description: 'Whether to play the entire playlist from track 0' }
      },
      required: ['playlistId']
    }
  },
  {
    name: 'play_playlist_from_start',
    description: 'Play a resolved playlist starting from the very first track (index 0).',
    parameters: {
      type: 'object',
      properties: {
        playlistId: { type: 'string', description: 'ID of the playlist' },
        shuffle: { type: 'boolean', description: 'Whether to shuffle the playlist' }
      },
      required: ['playlistId']
    }
  },
  {
    name: 'play_song',
    description: 'Start playing a resolved song in The Frequency.',
    parameters: {
      type: 'object',
      properties: {
        songId: { type: 'string', description: 'ID of the song to play' },
        insertNext: { type: 'boolean', description: 'Whether to queue the song immediately after the current playing track' }
      },
      required: ['songId']
    }
  },
  {
    name: 'pause_playback',
    description: 'Pause music and audio playback in The Frequency.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'resume_playback',
    description: 'Resume paused music and audio playback in The Frequency.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'skip_next',
    description: 'Skip to the next song in the playback queue.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'skip_previous',
    description: 'Return to the previous song in the playback queue or replay the current track.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'set_volume',
    description: 'Set playback volume (between 0.0 and 1.0 or relative percentage).',
    parameters: {
      type: 'object',
      properties: {
        volume: { type: 'number', description: 'Volume level from 0.0 to 1.0 or 0 to 100' },
        relativeChange: { type: 'string', enum: ['up', 'down'], description: 'Relative volume adjustment' }
      }
    }
  },
  {
    name: 'toggle_shuffle',
    description: 'Enable, disable, or toggle shuffle mode for playback.',
    parameters: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', description: 'Explicit shuffle mode state' }
      }
    }
  },
  {
    name: 'set_repeat_mode',
    description: 'Set repeat mode in The Frequency.',
    parameters: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['none', 'one', 'all'], description: 'Repeat mode' }
      },
      required: ['mode']
    }
  },
  {
    name: 'add_to_queue',
    description: 'Add a song to the current playback queue.',
    parameters: {
      type: 'object',
      properties: {
        songId: { type: 'string', description: 'ID of the song to queue' },
        playNext: { type: 'boolean', description: 'If true, insert after currently playing track' }
      },
      required: ['songId']
    }
  },
  {
    name: 'clear_queue',
    description: 'Clear the upcoming playback queue.',
    parameters: {
      type: 'object',
      properties: {
        confirmed: { type: 'boolean', description: 'Whether the user explicitly confirmed clearing the queue' }
      }
    }
  },
  {
    name: 'get_current_playback',
    description: 'Get details about the currently playing song, artist, duration, progress, and player state.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_queue',
    description: 'Get the list of upcoming tracks in the queue.',
    parameters: {
      type: 'object',
      properties: {}
    }
  }
];

// Debouncer cache to prevent duplicate actions from repeated voice events
const recentActionCache = new Set<string>();

export function isDuplicateAction(actionKey: string, ttlMs: number = 2000): boolean {
  if (recentActionCache.has(actionKey)) {
    return true;
  }
  recentActionCache.add(actionKey);
  setTimeout(() => recentActionCache.delete(actionKey), ttlMs);
  return false;
}

export interface MusicToolExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  needsClarification?: boolean;
}

/**
 * Centralized Music Tool Executor with Strict Argument Validation
 */
export async function executeMusicTool(
  toolName: string,
  args: Record<string, any> = {},
  actionId?: string
): Promise<MusicToolExecutionResult> {
  const store = useFrequencyStore.getState();
  const appStore = useAppStore.getState();

  // Deduplication check
  const dedupeKey = actionId || `${toolName}-${JSON.stringify(args)}`;
  if (actionId && isDuplicateAction(dedupeKey)) {
    return { success: true, message: 'Action already processed.' };
  }

  voiceLog("EXECUTING_MUSIC_TOOL", { toolName, args });

  try {
    switch (toolName) {
      case 'open_frequency': {
        appStore.setView('frequency');
        window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'frequency' } }));
        return { success: true, message: 'Opened The Frequency acoustic studio.' };
      }

      case 'search_frequency': {
        const query = typeof args.query === 'string' ? args.query.trim() : '';
        if (!query) {
          return { success: false, message: 'Please specify a search query for The Frequency.' };
        }
        appStore.setView('frequency');
        window.dispatchEvent(new CustomEvent('frequency-search', { detail: { query } }));
        return { success: true, message: `Searching The Frequency for "${query}".` };
      }

      case 'find_playlist': {
        const query = typeof args.query === 'string' ? args.query.trim() : '';
        if (!query) {
          return { success: false, message: 'Search query required.' };
        }
        const candidates = resolvePlaylist(query);
        return {
          success: candidates.length > 0,
          message: candidates.length > 0 ? `Found ${candidates.length} candidate playlists.` : 'No playlists matched.',
          data: candidates
        };
      }

      case 'play_playlist':
      case 'play_playlist_from_start': {
        const playlistId = args.playlistId;
        if (!playlistId || typeof playlistId !== 'string') {
          return { success: false, message: 'Invalid or missing playlist ID.' };
        }
        const result = await playResolvedPlaylist({
          playlistId,
          startIndex: args.startIndex ?? 0,
          shuffle: args.shuffle,
          startFromBeginning: toolName === 'play_playlist_from_start' || Boolean(args.startFromBeginning)
        });
        return { success: true, message: result.message, data: result };
      }

      case 'play_song': {
        const songId = args.songId;
        if (!songId || typeof songId !== 'string') {
          return { success: false, message: 'Invalid or missing song ID.' };
        }
        const result = await playResolvedSong({
          songId,
          insertNext: Boolean(args.insertNext)
        });
        return { success: true, message: result.message, data: result };
      }

      case 'pause_playback': {
        store.setIsPlaying(false);
        appStore.setIsVideoPlaying(false);
        return { success: true, message: 'Paused.' };
      }

      case 'resume_playback': {
        store.setIsPlaying(true);
        appStore.setIsVideoPlaying(true);
        const current = store.getCurrentTrack();
        return {
          success: true,
          message: current ? `Resuming "${current.title}".` : 'Resuming playback.'
        };
      }

      case 'skip_next': {
        store.next();
        const current = store.getCurrentTrack();
        return {
          success: true,
          message: current ? `Skipping to "${current.title}".` : 'Skipped to next song.'
        };
      }

      case 'skip_previous': {
        store.previous();
        const current = store.getCurrentTrack();
        return {
          success: true,
          message: current ? `Playing "${current.title}".` : 'Playing previous song.'
        };
      }

      case 'set_volume': {
        let currentVol = store.volume ?? 0.8;
        let newVol = currentVol;

        if (args.relativeChange === 'up') {
          newVol = Math.min(1.0, currentVol + 0.15);
        } else if (args.relativeChange === 'down') {
          newVol = Math.max(0.0, currentVol - 0.15);
        } else if (typeof args.volume === 'number') {
          const raw = args.volume;
          newVol = raw > 1 ? raw / 100 : raw;
          newVol = Math.max(0, Math.min(1, newVol));
        }

        store.setVolume(newVol);
        const pct = Math.round(newVol * 100);
        return { success: true, message: `Volume set to ${pct} percent.` };
      }

      case 'toggle_shuffle': {
        if (typeof args.enabled === 'boolean') {
          if (store.shuffle !== args.enabled) store.toggleShuffle();
        } else {
          store.toggleShuffle();
        }
        return {
          success: true,
          message: store.shuffle ? 'Shuffle turned on.' : 'Shuffle turned off.'
        };
      }

      case 'set_repeat_mode': {
        const mode = args.mode;
        if (mode === 'none' || mode === 'one' || mode === 'all') {
          // cycle until target mode reached
          let attempts = 0;
          while (useFrequencyStore.getState().repeat !== mode && attempts < 4) {
            useFrequencyStore.getState().cycleRepeat();
            attempts++;
          }
          const label = mode === 'one' ? 'Repeating current song' : mode === 'all' ? 'Repeating playlist' : 'Repeat off';
          return { success: true, message: `${label}.` };
        }
        return { success: false, message: 'Invalid repeat mode.' };
      }

      case 'add_to_queue': {
        const songId = args.songId;
        if (!songId || typeof songId !== 'string') {
          return { success: false, message: 'Song ID required.' };
        }
        const track = store.tracks.find(t => t.id === songId);
        if (!track) {
          return { success: false, message: 'Track not found.' };
        }
        store.addToQueue(songId, Boolean(args.playNext));
        return {
          success: true,
          message: args.playNext ? `Playing "${track.title}" next.` : `Added "${track.title}" to queue.`
        };
      }

      case 'clear_queue': {
        if (!args.confirmed && (store.queue?.length || 0) > 3) {
          setPendingMusicClarification({
            type: 'QUEUE_REPLACE_CONFIRMATION',
            prompt: `This will clear ${store.queue.length} upcoming songs from your queue. Proceed?`,
            createdAt: Date.now()
          });
          return {
            success: false,
            needsClarification: true,
            message: `This will clear ${store.queue.length} upcoming songs from your queue. Proceed?`
          };
        }
        store.reorderQueue([]);
        clearPendingMusicClarification();
        return { success: true, message: 'Playback queue cleared.' };
      }

      case 'get_current_playback': {
        const current = store.getCurrentTrack();
        if (!current) {
          return { success: true, message: 'No music is currently playing.' };
        }
        const state = store.isPlaying ? 'Playing' : 'Paused';
        return {
          success: true,
          message: `${state} "${current.title}" by ${current.artist}.`,
          data: {
            title: current.title,
            artist: current.artist,
            isPlaying: store.isPlaying,
            currentTime: store.currentTime,
            duration: store.duration || current.duration || 0,
            volume: store.volume,
            shuffle: store.shuffle,
            repeat: store.repeat
          }
        };
      }

      case 'get_queue': {
        const queueTracks = (store.queue || [])
          .map(id => store.tracks.find(t => t.id === id))
          .filter((t): t is Track => Boolean(t));
        if (queueTracks.length === 0) {
          return { success: true, message: 'The queue is currently empty.' };
        }
        const names = queueTracks.slice(0, 3).map(t => `"${t.title}"`).join(', ');
        return {
          success: true,
          message: `Queue has ${queueTracks.length} tracks: ${names}${queueTracks.length > 3 ? '...' : ''}.`,
          data: queueTracks
        };
      }

      default:
        return { success: false, message: `Unrecognized music tool: ${toolName}` };
    }
  } catch (err: any) {
    voiceLog("MUSIC_TOOL_ERROR", { toolName, error: err?.message });
    return { success: false, message: err?.message || 'Music operation failed.' };
  }
}
