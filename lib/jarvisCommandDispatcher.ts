"use client";

import { useJarvisStore } from '../hooks/useJarvisStore';
import { useAppStore } from '../hooks/useAppStore';
import { useFrequencyStore } from '../hooks/useFrequencyStore';
import { jarvisAudio } from './jarvisAudio';
import { jarvisVoiceEngine, voiceLog } from './jarvisVoiceEngine';
import { parseYouTubeUrl, fetchYouTubeMeta } from '../app/components/SonicVaultUtils';
import { 
  resolvePlaylist, 
  resolveSong, 
  playResolvedPlaylist, 
  playResolvedSong,
  setPendingMusicClarification, 
  getPendingMusicClarification, 
  clearPendingMusicClarification,
  PlaylistMatchCandidate
} from './musicResolver';
import { 
  executeMusicTool, 
  MUSIC_TOOLS_DECLARATIONS 
} from './musicTools';
import { getSelectedTextModel, recordAiUsage } from './aiModelConfig';
import { cleanJarvisOutput } from './jarvisOutputCleaner';
import { searchYouTube } from './youtubeSearch';

export type ToolCategory = 'READ_ONLY' | 'DRAFT' | 'SIDE_EFFECT';

export interface ToolDefinition {
  name: string;
  category: ToolCategory;
  description: string;
  parameters: Record<string, string>;
}

export const JARVIS_TOOLS: Record<string, ToolDefinition> = {
  CREATE_TASK: {
    name: 'CREATE_TASK',
    category: 'DRAFT',
    description: 'Create a new focus objective or task in the task matrix.',
    parameters: { title: 'string', priority: 'urgent | high | medium' }
  },
  COMPLETE_TASK: {
    name: 'COMPLETE_TASK',
    category: 'SIDE_EFFECT',
    description: 'Mark a task as completed.',
    parameters: { title: 'string (optional title keyword)' }
  },
  DELETE_TASK: {
    name: 'DELETE_TASK',
    category: 'SIDE_EFFECT',
    description: 'Remove a task from the matrix.',
    parameters: { title: 'string (optional title keyword)' }
  },
  START_TIMER: {
    name: 'START_TIMER',
    category: 'DRAFT',
    description: 'Initiate a focus block or countdown timer.',
    parameters: { minutes: 'number', name: 'string' }
  },
  PAUSE_TIMER: {
    name: 'PAUSE_TIMER',
    category: 'READ_ONLY',
    description: 'Pause the current active timer.',
    parameters: {}
  },
  RESUME_TIMER: {
    name: 'RESUME_TIMER',
    category: 'READ_ONLY',
    description: 'Resume the current active timer.',
    parameters: {}
  },
  RESET_TIMER: {
    name: 'RESET_TIMER',
    category: 'SIDE_EFFECT',
    description: 'Reset the timer to zero.',
    parameters: {}
  },
  NAVIGATE: {
    name: 'NAVIGATE',
    category: 'READ_ONLY',
    description: 'Switch application views.',
    parameters: { view: 'home | timer | activeTimer | tasks | place | ledger | terminal | stats | aura | hub | profile | frequency' }
  },
  PLAY_AUDIO: {
    name: 'PLAY_AUDIO',
    category: 'READ_ONLY',
    description: 'Start acoustic frequency or music playback.',
    parameters: { query: 'string (optional)' }
  },
  PAUSE_AUDIO: {
    name: 'PAUSE_AUDIO',
    category: 'READ_ONLY',
    description: 'Pause music or frequency playback.',
    parameters: {}
  },
  STOP_AUDIO: {
    name: 'STOP_AUDIO',
    category: 'READ_ONLY',
    description: 'Silence background audio and stop playback.',
    parameters: {}
  },
  NEXT_TRACK: {
    name: 'NEXT_TRACK',
    category: 'READ_ONLY',
    description: 'Skip to next music track.',
    parameters: {}
  },
  PREVIOUS_TRACK: {
    name: 'PREVIOUS_TRACK',
    category: 'READ_ONLY',
    description: 'Return to previous music track.',
    parameters: {}
  },
  PLAY_PLAYLIST: {
    name: 'PLAY_PLAYLIST',
    category: 'READ_ONLY',
    description: 'Start playing a playlist in The Frequency.',
    parameters: { playlistId: 'string', startIndex: 'number', shuffle: 'boolean', startFromBeginning: 'boolean' }
  },
  PLAY_SONG: {
    name: 'PLAY_SONG',
    category: 'READ_ONLY',
    description: 'Start playing a song in The Frequency.',
    parameters: { songId: 'string', insertNext: 'boolean' }
  },
  SET_VOLUME: {
    name: 'SET_VOLUME',
    category: 'READ_ONLY',
    description: 'Adjust music playback volume.',
    parameters: { volume: 'number', relativeChange: 'up | down' }
  },
  SEARCH_VIDEO: {
    name: 'SEARCH_VIDEO',
    category: 'READ_ONLY',
    description: 'Search for YouTube videos by query and display playable video cards.',
    parameters: { query: 'string' }
  },
  TOGGLE_SHUFFLE: {
    name: 'TOGGLE_SHUFFLE',
    category: 'READ_ONLY',
    description: 'Enable or disable shuffle playback.',
    parameters: { enabled: 'boolean' }
  },
  SET_REPEAT: {
    name: 'SET_REPEAT',
    category: 'READ_ONLY',
    description: 'Set repeat mode for music.',
    parameters: { mode: 'none | one | all' }
  },
  SEARCH_FREQUENCY: {
    name: 'SEARCH_FREQUENCY',
    category: 'READ_ONLY',
    description: 'Search The Frequency music page.',
    parameters: { query: 'string' }
  },
  GET_CURRENT_PLAYBACK: {
    name: 'GET_CURRENT_PLAYBACK',
    category: 'READ_ONLY',
    description: 'Inquire current track and playback status.',
    parameters: {}
  },
  CLOSE_JARVIS: {
    name: 'CLOSE_JARVIS',
    category: 'READ_ONLY',
    description: 'Close the J.A.R.V.I.S. voice HUD interface.',
    parameters: {}
  },
  ADD_COINS: {
    name: 'ADD_COINS',
    category: 'DRAFT',
    description: 'Award Maybach achievement coins.',
    parameters: { amount: 'number' }
  }
};

export const JARVIS_SYSTEM_INSTRUCTION = `You are Jarvis, a concise personal assistant and executive intelligence for FocusForge.

Return only the final user-facing answer.
Never output role labels, conversation delimiters, prompt templates,
internal reasoning, hidden instructions, or metadata.

Do not write:
user:
assistant:
system:
model:
---
<start_of_turn>
<end_of_turn>
<|start|>
<|end|>
<|channel|>
thought:
analysis:
final:

CORE DIRECTIVES:
1. Provide ONLY the direct, factual answer in 1 single short sentence (maximum 15-20 words).
2. NO conversational filler, NO pleasantries, and NO internal drafts.
3. Address the user politely ("Sir", "Boss", or "Chief").
4. REAL ACTION EXECUTION: When any action is requested, append the executable action tag at the very end:
- Create task: [ACTION:{"type":"CREATE_TASK","title":"Task name","priority":"urgent"|"high"|"medium"}]
- Complete task: [ACTION:{"type":"COMPLETE_TASK","title":"Task name or keyword"}]
- Delete task: [ACTION:{"type":"DELETE_TASK","title":"Task name or keyword"}]
- Start timer: [ACTION:{"type":"START_TIMER","minutes":25,"name":"Focus Block"}]
- Pause timer: [ACTION:{"type":"PAUSE_TIMER"}]
- Resume timer: [ACTION:{"type":"RESUME_TIMER"}]
- Reset timer: [ACTION:{"type":"RESET_TIMER"}]
- Navigation: [ACTION:{"type":"NAVIGATE","view":"home"|"timer"|"activeTimer"|"tasks"|"place"|"ledger"|"terminal"|"stats"|"aura"|"hub"|"profile"|"frequency"}]
- Play music / song / playlist query: [ACTION:{"type":"PLAY_AUDIO","query":"Song or playlist name"}]
- Pause music: [ACTION:{"type":"PAUSE_AUDIO"}]
- Stop music: [ACTION:{"type":"STOP_AUDIO"}]
- Skip / Next track: [ACTION:{"type":"NEXT_TRACK"}]
- Previous track: [ACTION:{"type":"PREVIOUS_TRACK"}]
- Set volume: [ACTION:{"type":"SET_VOLUME","relativeChange":"up"|"down"}] or [ACTION:{"type":"SET_VOLUME","volume":0.5}]
- Toggle shuffle: [ACTION:{"type":"TOGGLE_SHUFFLE","enabled":true}]
- Set repeat: [ACTION:{"type":"SET_REPEAT","mode":"all"|"one"|"none"}]
- Search frequency: [ACTION:{"type":"SEARCH_FREQUENCY","query":"Artist or genre"}]
- What song is playing: [ACTION:{"type":"GET_CURRENT_PLAYBACK"}]
- Close Jarvis: [ACTION:{"type":"CLOSE_JARVIS"}]
- Award coins: [ACTION:{"type":"ADD_COINS","amount":50}]

Do not expose tool JSON or internal reasoning in your answer.`;

export function validateAndExecuteTool(action: { type: string; [key: string]: any }): boolean {
  if (!action || typeof action.type !== 'string') {
    voiceLog("TOOL_VALIDATION_FAILED", { reason: "Missing action type" });
    return false;
  }

  const jarvisStore = useJarvisStore.getState();
  const appStore = useAppStore.getState();
  const frequencyStore = useFrequencyStore.getState();

  jarvisVoiceEngine.setActiveTool(action.type);

  try {
    switch (action.type) {
      case 'CREATE_TASK': {
        const title = (action.title && typeof action.title === 'string') ? action.title.trim() : 'New Focus Objective';
        const priority = (action.priority === 'urgent' || action.priority === 'medium') ? action.priority : 'high';
        const currentTasks = JSON.parse(localStorage.getItem('focus-tasks') || '[]');
        const newTaskItem = {
          id: `task-${Date.now()}`,
          title,
          desc: 'Created via J.A.R.V.I.S. voice executive',
          priority,
          estimatedMinutes: 30,
          subtasks: [],
          done: false,
          created: Date.now()
        };
        const updated = [newTaskItem, ...currentTasks];
        localStorage.setItem('focus-tasks', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('task-created', { detail: newTaskItem }));
        window.dispatchEvent(new CustomEvent('tasksUpdated', { detail: { tasks: updated, source: 'jarvis' } }));
        jarvisStore.setLastAction(`TASK CREATED: "${title}"`);
        jarvisAudio.playExecute();
        return true;
      }
      case 'COMPLETE_TASK': {
        const currentTasks = JSON.parse(localStorage.getItem('focus-tasks') || '[]');
        const query = typeof action.title === 'string' ? action.title.toLowerCase().trim() : '';
        const targetIdx = query 
          ? currentTasks.findIndex((t: any) => !t.done && t.title.toLowerCase().includes(query))
          : currentTasks.findIndex((t: any) => !t.done);
        if (targetIdx !== -1) {
          currentTasks[targetIdx].done = true;
          localStorage.setItem('focus-tasks', JSON.stringify(currentTasks));
          window.dispatchEvent(new CustomEvent('tasksUpdated', { detail: { tasks: currentTasks, source: 'jarvis' } }));
          appStore.setMaybachCoins((c: number) => c + 25);
          jarvisStore.setLastAction(`COMPLETED: ${currentTasks[targetIdx].title}`);
          jarvisAudio.playExecute();
          return true;
        }
        return false;
      }
      case 'DELETE_TASK': {
        const currentTasks = JSON.parse(localStorage.getItem('focus-tasks') || '[]');
        const query = typeof action.title === 'string' ? action.title.toLowerCase().trim() : '';
        const updated = query 
          ? currentTasks.filter((t: any) => !t.title.toLowerCase().includes(query))
          : currentTasks.filter((t: any) => !t.done);
        localStorage.setItem('focus-tasks', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('tasksUpdated', { detail: { tasks: updated, source: 'jarvis' } }));
        jarvisStore.setLastAction('TASKS UPDATED');
        jarvisAudio.playExecute();
        return true;
      }
      case 'START_TIMER': {
        const durationMinutes = Number.isInteger(action.minutes) && action.minutes > 0 ? action.minutes : 25;
        const timerName = typeof action.name === 'string' && action.name.trim() ? action.name.trim() : `${durationMinutes}m Focus Protocol`;
        appStore.setTimeLeft(durationMinutes * 60);
        appStore.setIsRunning(true);
        appStore.setView('activeTimer');
        appStore.setActiveTimer({
          id: `jarvis-preset-${Date.now()}`,
          name: timerName,
          cycles: 1,
          segs: [{ n: timerName, d: durationMinutes * 60, t: 'work' }, { n: 'Rest', d: 5 * 60, t: 'rest' }],
          cat: 'work',
          desc: `${durationMinutes}m session initiated via J.A.R.V.I.S.`
        });
        jarvisStore.setLastAction(`TIMER ACTIVATED: ${timerName.toUpperCase()} (${durationMinutes}M)`);
        jarvisAudio.playExecute();
        return true;
      }
      case 'PAUSE_TIMER': {
        appStore.setIsRunning(false);
        jarvisStore.setLastAction('TIMER PAUSED');
        jarvisAudio.playExecute();
        return true;
      }
      case 'RESUME_TIMER': {
        appStore.setIsRunning(true);
        jarvisStore.setLastAction('TIMER RESUMED');
        jarvisAudio.playExecute();
        return true;
      }
      case 'RESET_TIMER': {
        appStore.setIsRunning(false);
        appStore.setTimeLeft(0);
        appStore.setActiveTimer(null);
        jarvisStore.setLastAction('TIMER RESET');
        jarvisAudio.playExecute();
        return true;
      }
      case 'NAVIGATE': {
        if (typeof action.view === 'string' && action.view) {
          appStore.setView(action.view as any);
          window.dispatchEvent(new CustomEvent('changeView', { detail: { view: action.view } }));
          jarvisStore.setLastAction(`NAVIGATED TO ${action.view.toUpperCase()}`);
          jarvisAudio.playExecute();
          return true;
        }
        return false;
      }
      case 'PLAY_AUDIO': {
        const query = typeof action.query === 'string' ? action.query.trim() : (typeof action.title === 'string' ? action.title.trim() : '');
        if (query) {
          // Use smart resolver
          const candidates = resolvePlaylist(query);
          if (candidates.length > 0 && candidates[0].score >= 0.70) {
            playResolvedPlaylist({ playlistId: candidates[0].playlistId });
            jarvisStore.setLastAction(`PLAYING: ${candidates[0].title.toUpperCase()}`);
          } else {
            const songMatches = resolveSong(query);
            if (songMatches.length > 0) {
              playResolvedSong({ songId: songMatches[0].songId });
              jarvisStore.setLastAction(`PLAYING: ${songMatches[0].title.toUpperCase()}`);
            } else {
              frequencyStore.setIsPlaying(true);
              appStore.setIsVideoPlaying(true);
              jarvisStore.setLastAction('PLAYING AUDIO');
            }
          }
        } else {
          frequencyStore.setIsPlaying(true);
          appStore.setIsVideoPlaying(true);
          jarvisStore.setLastAction('PLAYING AUDIO');
        }
        jarvisAudio.playExecute();
        return true;
      }
      case 'PAUSE_AUDIO': {
        executeMusicTool('pause_playback');
        jarvisStore.setLastAction('AUDIO PAUSED');
        jarvisAudio.playExecute();
        return true;
      }
      case 'STOP_AUDIO': {
        executeMusicTool('pause_playback');
        jarvisStore.setLastAction('AUDIO STOPPED');
        jarvisAudio.playExecute();
        return true;
      }
      case 'NEXT_TRACK': {
        executeMusicTool('skip_next');
        jarvisStore.setLastAction('SKIPPED TO NEXT TRACK');
        jarvisAudio.playExecute();
        return true;
      }
      case 'PREVIOUS_TRACK': {
        executeMusicTool('skip_previous');
        jarvisStore.setLastAction('PREVIOUS TRACK');
        jarvisAudio.playExecute();
        return true;
      }
      case 'SET_VOLUME': {
        executeMusicTool('set_volume', { volume: action.volume, relativeChange: action.relativeChange });
        jarvisStore.setLastAction('VOLUME ADJUSTED');
        jarvisAudio.playExecute();
        return true;
      }
      case 'TOGGLE_SHUFFLE': {
        executeMusicTool('toggle_shuffle', { enabled: action.enabled });
        jarvisStore.setLastAction('SHUFFLE TOGGLED');
        jarvisAudio.playExecute();
        return true;
      }
      case 'SET_REPEAT': {
        executeMusicTool('set_repeat_mode', { mode: action.mode || 'all' });
        jarvisStore.setLastAction('REPEAT SET');
        jarvisAudio.playExecute();
        return true;
      }
      case 'SEARCH_FREQUENCY': {
        executeMusicTool('search_frequency', { query: action.query });
        jarvisStore.setLastAction(`SEARCH: ${action.query}`);
        jarvisAudio.playExecute();
        return true;
      }
      case 'CLOSE_JARVIS': {
        jarvisStore.closeJarvis();
        jarvisStore.setLastAction('JARVIS CLOSED');
        jarvisAudio.playDeactivate();
        return true;
      }
      case 'ADD_COINS': {
        const amount = typeof action.amount === 'number' ? action.amount : 50;
        appStore.setMaybachCoins((c: number) => c + amount);
        jarvisStore.setLastAction(`AWARDED +${amount} MAYBACH COINS`);
        jarvisAudio.playExecute();
        return true;
      }
      default:
        return false;
    }
  } catch (err: any) {
    voiceLog("TOOL_EXECUTION_ERROR", { tool: action.type, error: err?.message });
    return false;
  }
}

/**
 * Handle Multi-Turn Clarification Follow-ups (e.g. "the first one", "the second one", "yes", "no", "cancel")
 */
function handlePendingClarification(text: string): boolean {
  const pending = getPendingMusicClarification();
  if (!pending) return false;

  const jarvisStore = useJarvisStore.getState();
  const lower = text.toLowerCase().trim();

  // Cancel / Nevermind
  if (lower === 'cancel' || lower === 'nevermind' || lower === 'no' || lower === 'stop' || lower.includes('cancel')) {
    clearPendingMusicClarification();
    const reply = "Understood. Music request cancelled, sir.";
    jarvisStore.addMessage({ role: 'assistant', text: reply });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  // Follow-up for Playlist Choice
  if (pending.type === 'PLAYLIST_CHOICE' && pending.candidates && pending.candidates.length > 0) {
    let chosenCandidate: PlaylistMatchCandidate | null = null;

    if (lower.includes('first') || lower === '1' || lower === 'one' || lower.includes('number one')) {
      chosenCandidate = pending.candidates[0] || null;
    } else if (lower.includes('second') || lower === '2' || lower === 'two' || lower.includes('number two')) {
      chosenCandidate = pending.candidates[1] || null;
    } else if (lower.includes('third') || lower === '3' || lower === 'three' || lower.includes('number three')) {
      chosenCandidate = pending.candidates[2] || null;
    } else {
      // Check if user spoke a candidate title
      chosenCandidate = pending.candidates.find(c => 
        lower.includes(c.title.toLowerCase()) || c.title.toLowerCase().includes(lower)
      ) || null;
    }

    if (chosenCandidate) {
      clearPendingMusicClarification();
      playResolvedPlaylist({ playlistId: chosenCandidate.playlistId });
      const reply = `Playing ${chosenCandidate.title}, sir.`;
      jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: `Playlist: ${chosenCandidate.title}` });
      jarvisVoiceEngine.speakResponse(reply);
      return true;
    }
  }

  // Queue Clear Confirmation
  if (pending.type === 'QUEUE_REPLACE_CONFIRMATION') {
    if (lower === 'yes' || lower === 'yeah' || lower === 'confirm' || lower === 'proceed' || lower.includes('yes')) {
      executeMusicTool('clear_queue', { confirmed: true });
      const reply = "Queue cleared, sir.";
      jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Queue Cleared' });
      jarvisVoiceEngine.speakResponse(reply);
      return true;
    }
  }

  return false;
}

/**
 * High-Speed Deterministic Voice Command Processor
 */
export async function executeLocalCommand(rawText: string): Promise<boolean> {
  const text = rawText.toLowerCase().trim();
  const jarvisStore = useJarvisStore.getState();
  const frequencyStore = useFrequencyStore.getState();
  const appStore = useAppStore.getState();

  // 0. CHECK MULTI-TURN PENDING CLARIFICATION
  if (handlePendingClarification(text)) {
    return true;
  }

  // 1. INQUIRE CURRENT SONG ("what song is playing", "what's playing", "what track is this", "song details")
  if (
    text.includes('what song is playing') ||
    text.includes("what's playing") ||
    text.includes('what track is this') ||
    text.includes('which song is this') ||
    text.includes('current song') ||
    text.includes('current track') ||
    text === 'what is playing'
  ) {
    const res = await executeMusicTool('get_current_playback');
    const reply = res.message ? `${res.message}, sir.` : "No music is currently playing, sir.";
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Current Playback' });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  // 2. VOLUME CONTROLS ("turn volume down", "turn volume up", "volume up", "volume down", "set volume to 50 percent", "quieter", "louder")
  if (
    text.includes('volume down') ||
    text.includes('turn it down') ||
    text.includes('quieter') ||
    text.includes('lower volume') ||
    text === 'volume down'
  ) {
    const res = await executeMusicTool('set_volume', { relativeChange: 'down' });
    const reply = `${res.message}`;
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Volume Down' });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  if (
    text.includes('volume up') ||
    text.includes('turn it up') ||
    text.includes('louder') ||
    text.includes('raise volume') ||
    text === 'volume up'
  ) {
    const res = await executeMusicTool('set_volume', { relativeChange: 'up' });
    const reply = `${res.message}`;
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Volume Up' });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  const volumePctMatch = text.match(/(?:set volume to|volume to|set volume)\s+(\d+)\s*(?:percent|%)?/i);
  if (volumePctMatch && volumePctMatch[1]) {
    const targetPct = parseInt(volumePctMatch[1], 10);
    const res = await executeMusicTool('set_volume', { volume: targetPct });
    const reply = `${res.message}`;
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: `Volume: ${targetPct}%` });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  // 3. SHUFFLE CONTROLS ("shuffle this playlist", "shuffle on", "shuffle off", "turn on shuffle")
  if (
    text.includes('shuffle this playlist') ||
    text.includes('shuffle playlist') ||
    text.includes('shuffle this') ||
    text.includes('turn shuffle on') ||
    text.includes('shuffle on') ||
    text === 'shuffle'
  ) {
    const res = await executeMusicTool('toggle_shuffle', { enabled: true });
    const reply = `${res.message}, sir.`;
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Shuffle Enabled' });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  if (text.includes('shuffle off') || text.includes('turn shuffle off') || text.includes('disable shuffle')) {
    const res = await executeMusicTool('toggle_shuffle', { enabled: false });
    const reply = `${res.message}, sir.`;
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Shuffle Disabled' });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  // 4. REPEAT CONTROLS ("repeat this playlist", "repeat this song", "repeat on", "repeat off")
  if (text.includes('repeat this song') || text.includes('repeat song') || text.includes('repeat one')) {
    const res = await executeMusicTool('set_repeat_mode', { mode: 'one' });
    const reply = `${res.message}, sir.`;
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Repeat Song' });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  if (text.includes('repeat this playlist') || text.includes('repeat playlist') || text.includes('repeat all')) {
    const res = await executeMusicTool('set_repeat_mode', { mode: 'all' });
    const reply = `${res.message}, sir.`;
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Repeat Playlist' });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  if (text.includes('repeat off') || text.includes('stop repeat') || text.includes('disable repeat')) {
    const res = await executeMusicTool('set_repeat_mode', { mode: 'none' });
    const reply = `${res.message}, sir.`;
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Repeat Off' });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  // 5. QUEUE NEXT SONG ("play the song after this one", "queue next", "play next: [song]")
  if (text.includes('play the song after this one') || text.includes('play after this') || text.includes('queue next')) {
    const currentTrack = frequencyStore.getCurrentTrack();
    const reply = currentTrack ? `The next queued track will play seamlessly after "${currentTrack.title}".` : "Track queued to play next, sir.";
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Queue Next' });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  // 6. SEARCH THE FREQUENCY ("search the frequency for songs by [artist]", "search frequency for [query]")
  const searchFreqMatch = text.match(/search(?:\s+the)?\s+frequency(?:\s+for)?(?:\s+songs by|\s+tracks by|\s+for)?\s+(.+)$/i);
  if (searchFreqMatch && searchFreqMatch[1]) {
    const query = searchFreqMatch[1].trim();
    await executeMusicTool('search_frequency', { query });
    const reply = `Searching The Frequency for "${query}", sir.`;
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: `Search: ${query}` });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  // 6B. VIDEO SEARCH DIRECTIVE ("search for video ___", "search video ___", "find video ___", "look for video ___", "search youtube for ___", "youtube search ___")
  const videoSearchMatch = text.match(/^(?:jarvis\s*,?\s*)?(?:search\s+(?:for\s+)?video|find\s+video|look\s+for\s+video|search\s+youtube\s+for|youtube\s+search(?:\s+for)?)\s+["']?(.+?)["']?$/i);
  if (videoSearchMatch && videoSearchMatch[1]) {
    const rawTarget = videoSearchMatch[1].replace(/^["']|["']$/g, '').trim();
    if (rawTarget) {
      jarvisVoiceEngine.setActiveTool('SEARCH_VIDEO');
      try {
        const resp = await searchYouTube(rawTarget, 6);
        
        if (resp.error) {
          const errorReply = resp.errorType === 'MISSING_KEY'
            ? "Please configure your YouTube Data API key in Profile to search for videos."
            : `YouTube search notice: ${resp.error}`;
          jarvisStore.addMessage({ role: 'assistant', text: errorReply });
          jarvisVoiceEngine.speakResponse(errorReply);
          return true;
        }

        const count = resp.results.length;
        if (count === 0) {
          const reply = `I could not find any YouTube videos matching "${rawTarget}", sir.`;
          jarvisStore.addMessage({ role: 'assistant', text: reply });
          jarvisVoiceEngine.speakResponse(reply);
          return true;
        }

        const reply = `I found ${count} video${count === 1 ? '' : 's'} for "${rawTarget}", sir. Click any video below to watch it in The Place.`;
        jarvisStore.addMessage({
          role: 'assistant',
          text: reply,
          actionSummary: `Found ${count} videos: ${rawTarget}`,
          mediaResults: resp.results
        });
        jarvisVoiceEngine.speakResponse(`I found ${count} video${count === 1 ? '' : 's'} for "${rawTarget}", sir.`);
        return true;
      } catch (err: any) {
        const errorReply = `Error searching YouTube: ${err?.message || 'Network error'}`;
        jarvisStore.addMessage({ role: 'assistant', text: errorReply });
        jarvisVoiceEngine.speakResponse("I encountered an issue connecting to the YouTube search service.");
        return true;
      }
    }
  }

  // 6C. STOCK & MARKET ANALYSIS DIRECTIVE ("search stock AAPL", "check stock TSLA", "show chart for NVDA", "stock price for BTC", "chart for SPY", "market for ETH")
  const stockMatch = text.match(/^(?:jarvis\s*,?\s*)?(?:search\s+stock|check\s+stock|show\s+stock|show\s+chart\s+(?:for)?|pull\s+up\s+chart\s+(?:for)?|stock\s+price\s+(?:of|for)?|chart\s+for|market\s+for)\s+([a-zA-Z0-9:\.\-]+)$/i);
  if (stockMatch && stockMatch[1]) {
    const rawSymbol = stockMatch[1].trim().toUpperCase();
    const symbolMap: Record<string, string> = {
      'APPLE': 'NASDAQ:AAPL',
      'AAPL': 'NASDAQ:AAPL',
      'TESLA': 'NASDAQ:TSLA',
      'TSLA': 'NASDAQ:TSLA',
      'NVIDIA': 'NASDAQ:NVDA',
      'NVDA': 'NASDAQ:NVDA',
      'BITCOIN': 'BINANCE:BTCUSDT',
      'BTC': 'BINANCE:BTCUSDT',
      'ETHEREUM': 'BINANCE:ETHUSDT',
      'ETH': 'BINANCE:ETHUSDT',
      'SOLANA': 'BINANCE:SOLUSDT',
      'SOL': 'BINANCE:SOLUSDT',
      'SPX': 'SP:SPX',
      'SPY': 'AMEX:SPY',
      'AMAZON': 'NASDAQ:AMZN',
      'AMZN': 'NASDAQ:AMZN',
      'GOOGLE': 'NASDAQ:GOOGL',
      'GOOGL': 'NASDAQ:GOOGL',
      'MICROSOFT': 'NASDAQ:MSFT',
      'MSFT': 'NASDAQ:MSFT',
      'META': 'NASDAQ:META',
      'COINBASE': 'NASDAQ:COIN',
      'COIN': 'NASDAQ:COIN',
      'GOLD': 'TVC:GOLD'
    };
    const normSymbol = symbolMap[rawSymbol] || (rawSymbol.includes(':') ? rawSymbol : `NASDAQ:${rawSymbol}`);
    jarvisVoiceEngine.setActiveTool('SHOW_STOCK');
    const reply = `Pulling up live chart and technicals for ${rawSymbol}, sir.`;
    jarvisStore.addMessage({
      role: 'assistant',
      text: reply,
      actionSummary: `Chart: ${normSymbol}`,
      stockData: { symbol: normSymbol, name: rawSymbol }
    });
    jarvisVoiceEngine.speakResponse(`Pulling up chart for ${rawSymbol}, sir.`);
    return true;
  }

  // 7. PLAY ENTIRE / WHOLE PLAYLIST FROM BEGINNING ("play this entire playlist", "play the whole playlist from the beginning", "play playlist from the start")
  if (
    text.includes('entire playlist') ||
    text.includes('whole playlist') ||
    text.includes('from the beginning') ||
    text.includes('from the start') ||
    text.includes('play from start')
  ) {
    const activePlId = frequencyStore.activePlaylistId;
    if (activePlId) {
      await playResolvedPlaylist({ playlistId: activePlId, startFromBeginning: true });
      const activePl = frequencyStore.playlists.find(p => p.id === activePlId);
      const reply = `Playing the entire "${activePl?.name || 'playlist'}" from the beginning.`;
      jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Playing from start' });
      jarvisVoiceEngine.speakResponse(reply);
      return true;
    }
  }

  // 8. NATURAL PLAYLIST & SONG INTENT RESOLUTION
  // Examples: "play my workout playlist", "play the playlist called late night", "play the playlist with the purple cover", "play the playlist I made for studying", "play the playlist that has Blinding Lights in it"
  const playIntentMatch = text.match(/^(?:jarvis\s*,?\s*)?(?:play|stream|listen to|put on|start|queue)\s+(.+)$/i);
  if (playIntentMatch && playIntentMatch[1]) {
    const rawTarget = playIntentMatch[1].trim();
    const genericWords = ['music', 'audio', 'it', 'song', 'track', 'sound', 'playback', 'something', 'radio'];

    if (!genericWords.includes(rawTarget)) {
      // 8A. Resolve Playlist candidates
      const playlistCandidates = resolvePlaylist(rawTarget);

      // Check Confidence Policy
      if (playlistCandidates.length > 0) {
        const top = playlistCandidates[0];

        // 1. High Confidence (Score >= 0.90) & Unambiguous
        if (top.score >= 0.90 && (playlistCandidates.length === 1 || top.score - (playlistCandidates[1]?.score || 0) >= 0.15)) {
          if (top.trackCount === 0) {
            const reply = `The playlist "${top.title}" is currently empty, sir.`;
            jarvisStore.addMessage({ role: 'assistant', text: reply });
            jarvisVoiceEngine.speakResponse(reply);
            return true;
          }
          await playResolvedPlaylist({ playlistId: top.playlistId });
          const reply = `Playing ${top.title}.`;
          jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: `Playing: ${top.title}` });
          jarvisVoiceEngine.speakResponse(reply);
          return true;
        }

        // 2. Multiple Plausible Candidates (Ambiguous: 0.65 <= Score < 0.90)
        if (playlistCandidates.length >= 2 && playlistCandidates[1].score >= 0.65) {
          const top2 = playlistCandidates.slice(0, 2);
          setPendingMusicClarification({
            type: 'PLAYLIST_CHOICE',
            candidates: top2,
            prompt: `I found two matching playlists: 1. ${top2[0].title}, 2. ${top2[1].title}. Which one should I play?`,
            createdAt: Date.now()
          });
          const reply = `I found two matching playlists:\n1. ${top2[0].title}\n2. ${top2[1].title}\n\nWhich one should I play?`;
          jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Clarification Needed' });
          jarvisVoiceEngine.speakResponse(`I found two matching playlists: ${top2[0].title} or ${top2[1].title}. Which one should I play?`);
          return true;
        }

        // 3. Single Candidate with Good Score (>= 0.70)
        if (top.score >= 0.70) {
          if (top.trackCount === 0) {
            const reply = `The playlist "${top.title}" has no playable songs.`;
            jarvisStore.addMessage({ role: 'assistant', text: reply });
            jarvisVoiceEngine.speakResponse(reply);
            return true;
          }
          await playResolvedPlaylist({ playlistId: top.playlistId });
          const reply = `Playing ${top.title}.`;
          jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: `Playing: ${top.title}` });
          jarvisVoiceEngine.speakResponse(reply);
          return true;
        }
      }

      // 8B. Resolve Song candidates in Library
      const songCandidates = resolveSong(rawTarget);
      if (songCandidates.length > 0 && songCandidates[0].score >= 0.70) {
        const topSong = songCandidates[0];
        await playResolvedSong({ songId: topSong.songId });
        const reply = `Playing "${topSong.title}" by ${topSong.artist}.`;
        jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: `Playing: ${topSong.title}` });
        jarvisVoiceEngine.speakResponse(reply);
        return true;
      }

      // 8C. If URL or YouTube link
      const { videoId } = parseYouTubeUrl(rawTarget);
      if (videoId || rawTarget.includes('http')) {
        const vid = videoId || 'jfKfPfyJRdk';
        const newTrack = {
          id: `yt-${vid}-${Date.now()}`,
          videoId: vid,
          title: rawTarget.startsWith('http') ? 'YouTube Stream' : rawTarget,
          artist: 'YouTube',
          thumbnail: `https://img.youtube.com/vi/${vid}/hqdefault.jpg`,
          dominantColor: 'rgb(6, 182, 212)',
          addedAt: Date.now(),
          sourceUrl: rawTarget.startsWith('http') ? rawTarget : `https://www.youtube.com/watch?v=${vid}`,
        };
        frequencyStore.addTrack(newTrack);
        frequencyStore.playTrack(newTrack.id);
        window.dispatchEvent(new CustomEvent('start-theatre', { detail: { url: newTrack.sourceUrl } }));
        const reply = `Streaming track from YouTube, sir.`;
        jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: `Playing: ${rawTarget}` });
        jarvisVoiceEngine.speakResponse(reply);
        return true;
      }

      // 8D. Dynamic Online Search Stream
      const dynamicTrack = {
        id: `search-${Date.now()}`,
        videoId: 'jfKfPfyJRdk',
        title: rawTarget,
        artist: 'Streaming Audio',
        thumbnail: 'https://img.youtube.com/vi/jfKfPfyJRdk/maxresdefault.jpg',
        dominantColor: 'rgb(147, 51, 234)',
        addedAt: Date.now(),
        sourceUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(rawTarget)}`,
      };
      frequencyStore.addTrack(dynamicTrack);
      frequencyStore.playTrack(dynamicTrack.id);
      window.dispatchEvent(new CustomEvent('start-theatre', { detail: { url: `https://youtube.com/watch?v=jfKfPfyJRdk`, query: rawTarget } }));
      const reply = `Playing "${rawTarget}", sir.`;
      jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: `Playing: ${rawTarget}` });
      jarvisVoiceEngine.speakResponse(reply);
      return true;
    }
  }

  // 9. GENERIC PLAY / RESUME COMMAND ("play", "start", "resume", "unpause")
  if (
    text === 'play' ||
    text === 'resume' ||
    text === 'unpause' ||
    text === 'start' ||
    /^(play|start|resume|continue|unpause)(\s+(music|audio|frequency|song|track|playback|sound|lofi|432))?$/i.test(text)
  ) {
    const res = await executeMusicTool('resume_playback');
    const reply = res.message;
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Playing Audio' });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  // 10. PAUSE COMMAND ("pause", "hold", "pause music", "pause audio", "pause song", "pause playback")
  if (
    text === 'pause' ||
    text === 'hold' ||
    text === 'freeze' ||
    /^(pause|hold|freeze)(\s+(music|audio|frequency|song|track|playback|sound))?$/i.test(text) ||
    text.includes('pause music') ||
    text.includes('pause audio') ||
    text.includes('pause playback') ||
    text.includes('pause song')
  ) {
    const res = await executeMusicTool('pause_playback');
    const reply = res.message;
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Paused Audio' });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  // 11. STOP COMMAND ("stop", "stop music", "silence", "mute", "stop audio", "stop playback")
  if (
    text === 'stop' ||
    text === 'silence' ||
    text === 'mute' ||
    text === 'shut up' ||
    text === 'quiet' ||
    /^(stop|silence|mute|turn off|cut)(\s+(music|audio|frequency|song|track|playback|sound|playing))?$/i.test(text) ||
    text.includes('stop music') ||
    text.includes('stop audio') ||
    text.includes('stop playback') ||
    text.includes('stop playing') ||
    text.includes('mute audio')
  ) {
    const res = await executeMusicTool('pause_playback');
    const reply = "Audio and media output stopped.";
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Audio Stopped' });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  // 12. NEXT TRACK COMMAND ("next", "next track", "next song", "skip", "skip track", "skip song", "forward")
  if (
    text === 'next' ||
    text === 'skip' ||
    text === 'forward' ||
    /^(next|skip|forward)(\s+(track|song|music|audio|frequency))?$/i.test(text) ||
    text.includes('next song') ||
    text.includes('next track') ||
    text.includes('skip song') ||
    text.includes('skip track') ||
    text.includes('play next')
  ) {
    const res = await executeMusicTool('skip_next');
    const reply = res.message;
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Next Track' });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  // 13. PREVIOUS TRACK / GO BACK COMMAND ("back", "previous", "prev", "previous track", "previous song", "go back", "replay")
  if (
    text === 'back' ||
    text === 'previous' ||
    text === 'prev' ||
    text === 'last' ||
    text === 'replay' ||
    /^(back|previous|prev|replay|last|go back)(\s+(track|song|music|audio|frequency))?$/i.test(text) ||
    text.includes('previous song') ||
    text.includes('previous track') ||
    text.includes('last song') ||
    text.includes('last track') ||
    text.includes('go back')
  ) {
    const res = await executeMusicTool('skip_previous');
    const reply = res.message;
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Previous Track' });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  // 14. CLOSE JARVIS COMMAND
  if (
    text === 'close jarvis' ||
    text === 'exit jarvis' ||
    text === 'close' ||
    text === 'exit' ||
    text === 'dismiss' ||
    text === 'dismiss jarvis' ||
    text === 'hide jarvis' ||
    text === 'hide' ||
    text === 'bye' ||
    text === 'goodbye' ||
    /^(close|exit|dismiss|hide|cancel|bye|goodbye)(\s+(jarvis|hud|interface|window|screen|menu|assistant))?$/i.test(text)
  ) {
    const reply = "Closing J.A.R.V.I.S. interface. Standing by in the background.";
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Closed Jarvis' });
    jarvisVoiceEngine.speakResponse(reply);
    setTimeout(() => jarvisStore.closeJarvis(), 800);
    return true;
  }

  // 15. TIMER COMMANDS
  if (text.includes('start timer') || text.includes('start focus') || text.includes('set timer') || text.includes('pomodoro') || text.includes('sprint')) {
    let durationMinutes = 25;
    let timerName = 'Deep Focus Block';
    const minMatch = text.match(/(\d+)\s*(minute|min|m\b)/);
    if (minMatch && minMatch[1]) {
      durationMinutes = parseInt(minMatch[1], 10);
    } else if (text.includes('short') || text.includes('quick') || text.includes('sprint')) {
      durationMinutes = 15;
      timerName = 'Quick Sprint';
    } else if (text.includes('deep') || text.includes('hour') || text.includes('ultradian')) {
      durationMinutes = 60;
      timerName = 'Ultradian Deep Work';
    }

    validateAndExecuteTool({ type: 'START_TIMER', minutes: durationMinutes, name: timerName });
    const reply = `Starting ${durationMinutes}-minute focus block: ${timerName}. All distractions suppressed.`;
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: `Started ${durationMinutes}m timer` });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  if (text.includes('pause timer') || text.includes('hold timer') || text.includes('freeze timer')) {
    validateAndExecuteTool({ type: 'PAUSE_TIMER' });
    const reply = "Timer protocol held, sir.";
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Paused timer' });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  if (text.includes('resume timer') || text.includes('continue timer') || text.includes('unpause timer')) {
    validateAndExecuteTool({ type: 'RESUME_TIMER' });
    const reply = "Resuming countdown. Locked in.";
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Resumed timer' });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  if (text.includes('reset timer') || text.includes('stop timer') || text.includes('cancel timer') || text.includes('end timer')) {
    validateAndExecuteTool({ type: 'RESET_TIMER' });
    const reply = "Timer reset to zero. Standing by for next protocol.";
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Reset timer' });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  // 16. TASK MATRIX OBJECTIVES
  if (text.startsWith('add task') || text.startsWith('create task') || text.startsWith('new task') || text.startsWith('remind me to')) {
    let taskTitle = text
      .replace(/^(add task|create task|new task|remind me to|schedule task)\s*(:|to|-)?\s*/i, '')
      .trim();
    if (!taskTitle) taskTitle = "Deep Work Priority Sprint";

    validateAndExecuteTool({ type: 'CREATE_TASK', title: taskTitle, priority: text.includes('urgent') ? 'urgent' : 'high' });
    const reply = `Logged objective: "${taskTitle}". Synchronized to your task matrix.`;
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: `Added Task: "${taskTitle}"` });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  if (text.includes('complete task') || text.includes('finish task') || text.includes('check off task') || text.includes('done with task')) {
    let query = text.replace(/^(complete task|finish task|check off task|done with task|done with)\s*(:|to|-)?\s*/i, '').trim();
    validateAndExecuteTool({ type: 'COMPLETE_TASK', title: query });
    const reply = query ? `Objective matching "${query}" marked complete. +25 Maybach Coins awarded.` : "Current focus objective completed. Excellent execution, sir.";
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Completed Task' });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  if (text.includes('list tasks') || text.includes('what are my tasks') || text.includes('show tasks') || text.includes('my tasks')) {
    try {
      const stored = JSON.parse(localStorage.getItem('focus-tasks') || '[]');
      const active = stored.filter((t: any) => !t.done);
      let reply = "";
      if (active.length === 0) {
        reply = "Your active task list is completely clear, sir. Ready for new directives.";
      } else {
        const topTasks = active.slice(0, 3).map((t: any, i: number) => `${i + 1}: ${t.title}`).join('. ');
        reply = `You have ${active.length} active objectives. Priority items: ${topTasks}.`;
      }
      jarvisStore.addMessage({ 
        role: 'assistant', 
        text: reply, 
        actionSummary: `Listed ${active.length} tasks`,
        taskData: { tasks: active }
      });
      jarvisVoiceEngine.speakResponse(reply);
      return true;
    } catch (e) {}
  }

  // 17. APP NAVIGATION
  if (text.includes('open frequency') || text.includes('go to music') || text.includes('the frequency') || text.includes('open music')) {
    await executeMusicTool('open_frequency');
    const reply = "Opening The Frequency acoustic studio.";
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Navigated: Frequency' });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  if (text.includes('open pomodoro') || text.includes('go to timer') || text.includes('show timer')) {
    validateAndExecuteTool({ type: 'NAVIGATE', view: 'timer' });
    const reply = "Navigating to Pomodoro Forge.";
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Navigated: Timer' });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  if (text.includes('open tasks') || text.includes('go to tasks') || text.includes('show task list')) {
    validateAndExecuteTool({ type: 'NAVIGATE', view: 'tasks' });
    const reply = "Opening Task Matrix.";
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Navigated: Tasks' });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  if (text.includes('open analytics') || text.includes('show stats') || text.includes('go to aura')) {
    validateAndExecuteTool({ type: 'NAVIGATE', view: 'aura' });
    const reply = "Displaying AURA cognitive analytics telemetry.";
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Navigated: Analytics' });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  if (text.includes('open place') || text.includes('go to place') || text.includes('the place')) {
    validateAndExecuteTool({ type: 'NAVIGATE', view: 'place' });
    const reply = "Entering The Place immersive environment.";
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Navigated: The Place' });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  if (text.includes('minimize') || text.includes('shrink')) {
    jarvisStore.setDisplayMode('minimized');
    const reply = "Minimized to Dynamic Island.";
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  if (text.includes('full screen') || text.includes('fullscreen') || text.includes('expand hud')) {
    jarvisStore.setDisplayMode('fullscreen');
    const reply = "Full-screen Neural HUD deployed.";
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  return false; // Not handled locally -> fallback to Gemini reasoning
}

/**
 * Cloud AI Inference Fallback via Gemini Route
 */
export async function processWithGemini(userPrompt: string): Promise<void> {
  const jarvisStore = useJarvisStore.getState();
  jarvisVoiceEngine.setGeminiStatus('connecting');
  jarvisAudio.playThinking();
  const startTime = Date.now();
  const selectedTextModel = getSelectedTextModel();

  try {
    const apiKey = typeof window !== 'undefined' ? localStorage.getItem('gemini-api-key') || '' : '';
    jarvisVoiceEngine.setGeminiStatus('processing');

    const recentHistory = jarvisStore.messages
      .filter(m => (m.role === 'user' || m.role === 'assistant') && m.text && !m.text.startsWith('Neural link'))
      .slice(-6)
      .map(m => ({ role: m.role, text: cleanJarvisOutput(m.text) }));

    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: userPrompt,
        messages: recentHistory.length > 0 ? recentHistory : undefined,
        apiKey,
        model: selectedTextModel,
        systemInstruction: JARVIS_SYSTEM_INSTRUCTION
      })
    });

    const data = await res.json();
    const latencyMs = Date.now() - startTime;

    if (res.ok && (data.reply || data.text)) {
      jarvisVoiceEngine.setGeminiStatus('connected');
      const rawText = data.reply || data.text || '';
      const actionMatch = rawText.match(/\[ACTION:([\s\S]*?)\]/);
      let cleanReply = cleanJarvisOutput(rawText.replace(/\[ACTION:[\s\S]*?\]/g, '')).trim();
      let actionSummary = '';

      if (actionMatch && actionMatch[1]) {
        try {
          const actionObj = JSON.parse(actionMatch[1]);
          const success = validateAndExecuteTool(actionObj);
          if (success) {
            actionSummary = actionObj.type.replace(/_/g, ' ');
          }
        } catch (e) {
          voiceLog("ACTION_PARSE_ERROR", { raw: actionMatch[1] });
        }
      }

      recordAiUsage({
        model: data.model || selectedTextModel,
        inputTokens: data.usage?.promptTokens || Math.round(userPrompt.length / 4),
        outputTokens: data.usage?.completionTokens || Math.round(cleanReply.length / 4),
        isFallback: data.isFallback,
        latencyMs
      });

      jarvisAudio.playExecute();
      jarvisStore.addMessage({ role: 'assistant', text: cleanReply, actionSummary });
      jarvisVoiceEngine.speakResponse(cleanReply);
    } else {
      jarvisVoiceEngine.setGeminiStatus('error');
      const errorReply = data.error || "Neural link offline. Please configure your Gemini API Key in Profile.";
      recordAiUsage({
        model: selectedTextModel,
        error: errorReply,
        latencyMs
      });
      jarvisStore.addMessage({ role: 'assistant', text: errorReply });
      jarvisVoiceEngine.speakResponse(errorReply);
    }
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    voiceLog("GEMINI_API_ERROR", { error: err?.message });
    jarvisVoiceEngine.setGeminiStatus('error');
    recordAiUsage({
      model: selectedTextModel,
      error: err?.message,
      latencyMs
    });
    const fallback = "Neural link timeout. Standing by for local commands.";
    jarvisStore.addMessage({ role: 'assistant', text: fallback });
    jarvisVoiceEngine.speakResponse(fallback);
  }
}

export async function handleGlobalJarvisCommand(rawText: string, sessionId?: string): Promise<void> {
  const text = rawText.trim();
  if (!text) return;

  const jarvisStore = useJarvisStore.getState();
  jarvisStore.addMessage({ role: 'user', text });

  // 1. Try local command first
  const isHandled = await executeLocalCommand(text);

  // 2. If not handled, invoke Gemini LLM
  if (!isHandled) {
    await processWithGemini(text);
  }
}

// Auto-register command dispatcher with Voice Engine globally
if (typeof window !== 'undefined') {
  jarvisVoiceEngine.setCommandHandler(async (commandText: string, sessionId: string) => {
    await handleGlobalJarvisCommand(commandText, sessionId);
  });

  window.addEventListener('jarvis-execute-command', ((e: CustomEvent) => {
    if (e.detail?.command) {
      handleGlobalJarvisCommand(e.detail.command);
    }
  }) as EventListener);
}
