"use client";

import { useJarvisStore } from '../hooks/useJarvisStore';
import { useAppStore } from '../hooks/useAppStore';
import { useFrequencyStore } from '../hooks/useFrequencyStore';
import { useBatmanStore } from '../hooks/useBatmanStore';
import { jarvisAudio } from './jarvisAudio';
import { jarvisVoiceEngine, voiceLog, StructuredIntentResult } from './jarvisVoiceEngine';
import { voiceConfig } from './voiceConfig';
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
import { fetchWeather, getUserLocationWeather } from './intelligence/weatherAdapter';
import { fetchNews } from './intelligence/worldPulseAdapter';
import { fetchEarthquakes } from './intelligence/earthquakeAdapter';
import { fetchIssTelemetry } from './intelligence/issAdapter';
import { fetchNasaApod } from './intelligence/nasaAdapter';
import { fetchCryptoMarkets, searchCryptoCoin } from './intelligence/cryptoAdapter';
import { convertCurrency, fetchExchangeRates } from './intelligence/fxAdapter';
import { getWatchlist } from './intelligence/watchlistManager';
import { getPortfolioData } from './intelligence/portfolioManager';

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
      case 'LOCK_IN':
      case 'ENTER_BATMAN_MODE': {
        useBatmanStore.getState().setBatmanMode(true);
        jarvisStore.setLastAction('BATMAN LOCK-IN ACTIVATED');
        jarvisAudio.playExecute();
        return true;
      }
      case 'DISENGAGE_LOCK_IN':
      case 'EXIT_BATMAN_MODE': {
        useBatmanStore.getState().setBatmanMode(false);
        jarvisStore.setLastAction('LOCK-IN PROTOCOL DISENGAGED');
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
  const batmanStore = useBatmanStore.getState();

  // 0A. BATMAN LOCK-IN PROTOCOL ("let's lock in", "lock in", "enter batman mode", "batman mode", "activate hud", "lock in protocol")
  if (
    text.includes("let's lock in") ||
    text.includes("lets lock in") ||
    text.includes("lock in") ||
    text.includes("batman mode") ||
    text.includes("iron man mode") ||
    text.includes("hud mode") ||
    text.includes("activate hud") ||
    text.includes("engage hud") ||
    text === "lock in" ||
    text === "lockin" ||
    text === "batman"
  ) {
    batmanStore.setBatmanMode(true);
    const spoken = "Lock-In protocol engaged. Initializing tactical HUD interface.";
    jarvisStore.addMessage({
      role: 'assistant',
      text: "Lock-In Protocol engaged. Systems locked into OLED tactical HUD.",
      actionSummary: "BATMAN LOCK-IN ACTIVATED"
    });
    jarvisVoiceEngine.speakResponse(spoken);
    return true;
  }

  // 0B. BATMAN DISENGAGE / UNLOCK ("unlock", "exit batman mode", "exit lock in", "disengage", "stand down", "return to normal")
  if (
    text === 'unlock' ||
    text === 'disengage' ||
    text === 'stand down' ||
    text.includes("exit batman mode") ||
    text.includes("exit lock in") ||
    text.includes("disengage lock in") ||
    text.includes("exit hud") ||
    text.includes("return to normal")
  ) {
    batmanStore.setBatmanMode(false);
    const spoken = "Lock-In protocol disengaged. Returning to primary console.";
    jarvisStore.addMessage({
      role: 'assistant',
      text: "Lock-In Protocol disengaged. Returning to standard interface.",
      actionSummary: "LOCK-IN DISENGAGED"
    });
    jarvisVoiceEngine.speakResponse(spoken);
    return true;
  }

  // 0C. BATMAN HUD MODULE SWITCHING (When in Batman mode or requested by voice)
  if (batmanStore.isBatmanMode) {
    if (text.includes('show spot') || text.includes('the place') || text.includes('virtual spot') || text.includes('co-focus') || text.includes('study room')) {
      batmanStore.setActiveModule('spot');
      const reply = "Switching tactical HUD to The Place virtual co-focus network.";
      jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'HUD: THE PLACE' });
      jarvisVoiceEngine.speakResponse(reply);
      return true;
    }
    if (text.includes('show media') || text.includes('show music') || text.includes('show video') || text.includes('frequency player')) {
      batmanStore.setActiveModule('media');
      const reply = "Surfacing acoustic frequency and video stream monitor.";
      jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'HUD: MEDIA' });
      jarvisVoiceEngine.speakResponse(reply);
      return true;
    }
    if (text.includes('show task') || text.includes('mission backlog') || text.includes('my tasks') || text.includes('todo list')) {
      batmanStore.setActiveModule('tasks');
      const reply = "Displaying mission task backlog.";
      jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'HUD: TASKS' });
      jarvisVoiceEngine.speakResponse(reply);
      return true;
    }
    if (text.includes('show timer') || text.includes('focus clock') || text.includes('countdown') || text.includes('pomodoro')) {
      batmanStore.setActiveModule('timer');
      const reply = "Focus chronometer and deep work cycles active.";
      jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'HUD: TIMER' });
      jarvisVoiceEngine.speakResponse(reply);
      return true;
    }
    if (text.includes('show intel') || text.includes('intelligence') || text.includes('satellite') || text.includes('sensor feed')) {
      batmanStore.setActiveModule('intel');
      const reply = "Surfacing planetary telemetry and intelligence feeds.";
      jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'HUD: INTEL' });
      jarvisVoiceEngine.speakResponse(reply);
      return true;
    }
    if (text.includes('show ledger') || text.includes('maybach coins') || text.includes('economy') || text.includes('my stats')) {
      batmanStore.setActiveModule('ledger');
      const reply = "Accessing Maybach economy ledger and cognitive statistics.";
      jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'HUD: LEDGER' });
      jarvisVoiceEngine.speakResponse(reply);
      return true;
    }
    if (text.includes('show note') || text.includes('scratchpad') || text.includes('tactical notes')) {
      batmanStore.setActiveModule('notes');
      const reply = "Tactical scratchpad ready.";
      jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'HUD: NOTES' });
      jarvisVoiceEngine.speakResponse(reply);
      return true;
    }
    if (text.includes('voice core') || text.includes('center radar') || text.includes('main hud') || text.includes('overview')) {
      batmanStore.setActiveModule('voice_core');
      const reply = "Centering tactical neural core and voice targeting.";
      jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'HUD: NEURAL CORE' });
      jarvisVoiceEngine.speakResponse(reply);
      return true;
    }
  }

  // 0D. CHECK MULTI-TURN PENDING CLARIFICATION
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

  // 6B-2. VOICE VIDEO SELECTION FROM SEARCH RESULTS
  // e.g. "play the first video", "play 1", "watch video 2", "play #3", "stream the second one", "play last", "play the first one in the place"
  // Find latest message with video search results
  const messages = jarvisStore.messages;
  let latestMediaMessage = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].mediaResults && (messages[i].mediaResults?.length || 0) > 0) {
      latestMediaMessage = messages[i];
      break;
    }
  }

  if (latestMediaMessage && latestMediaMessage.mediaResults && latestMediaMessage.mediaResults.length > 0) {
    const mediaList = latestMediaMessage.mediaResults;
    let selectedVideo = null;
    let targetIndex = -1;

    // Pattern A: Ordinal / Number Selection (e.g. "play the first video", "play 1", "watch video 2", "play #1", "stream 3rd video")
    const ordinalMatch = text.match(/(?:play|watch|stream|open|select|start|put\s+on)(?:.*?\s+)?(?:video\s+|option\s+|track\s+|number\s+|#)?(first|1st|1|one|second|2nd|2|two|third|3rd|3|three|fourth|4th|4|four|fifth|5th|5|five|sixth|6th|6|six|last)(?:\s+(?:one|video|track))?/i);
    
    if (ordinalMatch) {
      const rawOrdinal = ordinalMatch[1].toLowerCase();
      const ordinalMap: Record<string, number> = {
        'first': 0, '1st': 0, '1': 0, 'one': 0,
        'second': 1, '2nd': 1, '2': 1, 'two': 1,
        'third': 2, '3rd': 2, '3': 2, 'three': 2,
        'fourth': 3, '4th': 3, '4': 3, 'four': 3,
        'fifth': 4, '5th': 4, '5': 4, 'five': 4,
        'sixth': 5, '6th': 5, '6': 5, 'six': 5,
        'last': mediaList.length - 1
      };
      targetIndex = ordinalMap[rawOrdinal] !== undefined ? ordinalMap[rawOrdinal] : 0;
      if (targetIndex >= 0 && targetIndex < mediaList.length) {
        selectedVideo = mediaList[targetIndex];
      }
    }

    // Pattern B: Video Title Substring Match
    if (!selectedVideo && (text.startsWith('play ') || text.startsWith('watch ') || text.startsWith('stream '))) {
      const query = text.replace(/^(?:play|watch|stream)\s+(?:the\s+)?/i, '').toLowerCase().trim();
      if (query.length > 2) {
        const found = mediaList.find(v => v.title.toLowerCase().includes(query) || (v.channelTitle && v.channelTitle.toLowerCase().includes(query)));
        if (found) {
          selectedVideo = found;
          targetIndex = mediaList.indexOf(found);
        }
      }
    }

    if (selectedVideo) {
      jarvisVoiceEngine.setActiveTool('PLAY_AUDIO');
      useAppStore.getState().setView('place');
      
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('focusforge-pending-theatre', JSON.stringify({
            url: selectedVideo.url,
            videoId: selectedVideo.id,
            title: selectedVideo.title,
            thumbnail: selectedVideo.thumbnail
          }));
        } catch (e) {}

        window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'place' } }));
        
        // Dispatch start-theatre multiple times to guarantee capture across mount lifecycles
        const payload = {
          url: selectedVideo.url,
          videoId: selectedVideo.id,
          title: selectedVideo.title,
          thumbnail: selectedVideo.thumbnail
        };
        setTimeout(() => window.dispatchEvent(new CustomEvent('start-theatre', { detail: payload })), 50);
        setTimeout(() => window.dispatchEvent(new CustomEvent('start-theatre', { detail: payload })), 200);
        setTimeout(() => window.dispatchEvent(new CustomEvent('start-theatre', { detail: payload })), 400);
      }

      jarvisStore.closeJarvis();

      const reply = `Streaming "${selectedVideo.title}" in The Place, sir.`;
      jarvisStore.addMessage({
        role: 'assistant',
        text: reply,
        actionSummary: `Playing #${targetIndex + 1}: ${selectedVideo.title}`
      });
      jarvisVoiceEngine.speakResponse(reply);
      return true;
    }
  }

  // 6C. STOCK & MARKET ANALYSIS DIRECTIVE (US, Indian NSE/BSE Equities & Global Indices)
  // e.g. "search stock tata motors", "chart for reliance", "nifty 50 chart", "stock price of infy", "show stock zomato", "check stock TSLA"
  const stockMatch = text.match(/^(?:jarvis\s*,?\s*)?(?:search\s+stock|check\s+stock|show\s+stock|stock\s+(?:price|quote|chart|info)\s+(?:of|for)?|show\s+chart\s+(?:for)?|pull\s+up\s+chart\s+(?:for)?|chart\s+(?:for|of)?|market\s+for|stock\s+for)\s+(.+)$/i);
  if (stockMatch && stockMatch[1]) {
    const rawInput = stockMatch[1].trim();
    const cleanInput = rawInput.replace(/[?.,!]/g, '').trim();
    const upperInput = cleanInput.toUpperCase();

    const GLOBAL_STOCK_MAP: Record<string, string> = {
      // Global Tech & Crypto
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
      'S&P 500': 'SP:SPX',
      'S&P': 'SP:SPX',
      'SPY': 'AMEX:SPY',
      'NASDAQ': 'NASDAQ:IXIC',
      'DOW': 'DJ:DJI',
      'DOW JONES': 'DJ:DJI',
      'AMAZON': 'NASDAQ:AMZN',
      'AMZN': 'NASDAQ:AMZN',
      'GOOGLE': 'NASDAQ:GOOGL',
      'GOOGL': 'NASDAQ:GOOGL',
      'MICROSOFT': 'NASDAQ:MSFT',
      'MSFT': 'NASDAQ:MSFT',
      'META': 'NASDAQ:META',
      'COINBASE': 'NASDAQ:COIN',
      'COIN': 'NASDAQ:COIN',
      'GOLD': 'TVC:GOLD',
      'CRUDE OIL': 'TVC:USOIL',
      'OIL': 'TVC:USOIL',

      // Indian Equities & Indices (NSE / BSE)
      'RELIANCE': 'NSE:RELIANCE',
      'RELIANCE INDUSTRIES': 'NSE:RELIANCE',
      'RIL': 'NSE:RELIANCE',
      'TCS': 'NSE:TCS',
      'TATA CONSULTANCY SERVICES': 'NSE:TCS',
      'TATA CONSULTANCY': 'NSE:TCS',
      'HDFC': 'NSE:HDFCBANK',
      'HDFC BANK': 'NSE:HDFCBANK',
      'HDFCBANK': 'NSE:HDFCBANK',
      'INFY': 'NSE:INFY',
      'INFOSYS': 'NSE:INFY',
      'TATAMOTORS': 'NSE:TATAMOTORS',
      'TATA MOTORS': 'NSE:TATAMOTORS',
      'TATA MOTOR': 'NSE:TATAMOTORS',
      'TATASTEEL': 'NSE:TATASTEEL',
      'TATA STEEL': 'NSE:TATASTEEL',
      'ICICI': 'NSE:ICICIBANK',
      'ICICI BANK': 'NSE:ICICIBANK',
      'ICICIBANK': 'NSE:ICICIBANK',
      'SBIN': 'NSE:SBIN',
      'SBI': 'NSE:SBIN',
      'STATE BANK OF INDIA': 'NSE:SBIN',
      'STATE BANK': 'NSE:SBIN',
      'ITC': 'NSE:ITC',
      'BHARTIARTL': 'NSE:BHARTIARTL',
      'BHARTI AIRTEL': 'NSE:BHARTIARTL',
      'AIRTEL': 'NSE:BHARTIARTL',
      'KOTAKBANK': 'NSE:KOTAKBANK',
      'KOTAK': 'NSE:KOTAKBANK',
      'KOTAK MAHINDRA BANK': 'NSE:KOTAKBANK',
      'LT': 'NSE:LT',
      'L&T': 'NSE:LT',
      'LARSEN': 'NSE:LT',
      'LARSEN & TOUBRO': 'NSE:LT',
      'LARSEN AND TOUBRO': 'NSE:LT',
      'ZOMATO': 'NSE:ZOMATO',
      'WIPRO': 'NSE:WIPRO',
      'BAJFINANCE': 'NSE:BAJFINANCE',
      'BAJAJ FINANCE': 'NSE:BAJFINANCE',
      'MARUTI': 'NSE:MARUTI',
      'MARUTI SUZUKI': 'NSE:MARUTI',
      'SUNPHARMA': 'NSE:SUNPHARMA',
      'SUN PHARMA': 'NSE:SUNPHARMA',
      'ADANIENT': 'NSE:ADANIENT',
      'ADANI ENTERPRISES': 'NSE:ADANIENT',
      'ADANI': 'NSE:ADANIENT',
      'ADANIPORTS': 'NSE:ADANIPORTS',
      'ADANI PORTS': 'NSE:ADANIPORTS',
      'NIFTY': 'NSE:NIFTY',
      'NIFTY 50': 'NSE:NIFTY',
      'NIFTY50': 'NSE:NIFTY',
      'BANKNIFTY': 'NSE:BANKNIFTY',
      'BANK NIFTY': 'NSE:BANKNIFTY',
      'NIFTY BANK': 'NSE:BANKNIFTY',
      'SENSEX': 'BSE:SENSEX',
      'BSE SENSEX': 'BSE:SENSEX',
      'BSESENSEX': 'BSE:SENSEX',
      'PAYTM': 'NSE:PAYTM',
      'ONE97': 'NSE:PAYTM',
      'JIOFIN': 'NSE:JIOFIN',
      'JIO FINANCIAL': 'NSE:JIOFIN'
    };

    let normSymbol = GLOBAL_STOCK_MAP[upperInput];

    if (!normSymbol) {
      if (upperInput.includes(':')) {
        normSymbol = upperInput;
      } else if (upperInput.endsWith('.NS')) {
        normSymbol = `NSE:${upperInput.replace(/\.NS$/, '')}`;
      } else if (upperInput.endsWith('.BO')) {
        normSymbol = `BSE:${upperInput.replace(/\.BO$/, '')}`;
      } else if (upperInput.startsWith('NSE ')) {
        normSymbol = `NSE:${upperInput.replace(/^NSE\s+/, '')}`;
      } else if (upperInput.startsWith('BSE ')) {
        normSymbol = `BSE:${upperInput.replace(/^BSE\s+/, '')}`;
      } else {
        // Fallback for single tickers without spaces
        normSymbol = cleanInput.includes(' ') ? `NSE:${upperInput.replace(/\s+/g, '')}` : `NASDAQ:${upperInput}`;
      }
    }

    jarvisVoiceEngine.setActiveTool('SHOW_STOCK');
    const displayName = cleanInput;
    const reply = `Pulling up live chart and technicals for ${displayName}, sir.`;
    jarvisStore.addMessage({
      role: 'assistant',
      text: reply,
      actionSummary: `Chart: ${normSymbol}`,
      stockData: { symbol: normSymbol, name: displayName }
    });
    jarvisVoiceEngine.speakResponse(`Pulling up chart for ${displayName}, sir.`);
    return true;
  }

  // 6D. WEATHER SYSTEM DIRECTIVE ("weather in Tokyo", "what's the weather", "temperature in London", "forecast for Paris")
  const weatherMatch = text.match(/^(?:jarvis\s*,?\s*)?(?:(?:what(?:'s|\s+is)\s+the\s+)?weather(?:\s+(?:in|for|at))?|forecast(?:\s+(?:in|for))?|temperature(?:\s+(?:in|for))?|how\s+is\s+the\s+weather(?:\s+in)?)\s*(.*)$/i);
  if (weatherMatch && (text.includes('weather') || text.includes('temperature') || text.includes('forecast') || text.includes('rain') || text.includes('humidity'))) {
    const rawCity = weatherMatch[1]?.trim().replace(/[?.,]/g, '');
    jarvisVoiceEngine.setActiveTool('GET_WEATHER');
    try {
      const data = rawCity ? await fetchWeather(rawCity) : await getUserLocationWeather();
      const spoken = `Currently in ${data.city} it is ${data.temperature} degrees Celsius and ${data.conditionText.toLowerCase()} with ${data.humidity}% humidity.`;
      jarvisStore.addMessage({
        role: 'assistant',
        text: `Atmospheric telemetry retrieved for ${data.city}, ${data.country || ''}. Current: ${data.temperature}°C (${data.conditionText}), Humidity: ${data.humidity}%, Wind: ${data.windSpeed} km/h.`,
        actionSummary: `Weather: ${data.city} (${data.temperature}°C)`,
        weatherData: data
      });
      jarvisVoiceEngine.speakResponse(spoken);
      return true;
    } catch (err: any) {
      const msg = `Unable to retrieve atmospheric telemetry: ${err?.message || 'Network error'}`;
      jarvisStore.addMessage({ role: 'assistant', text: msg });
      jarvisVoiceEngine.speakResponse(`I was unable to retrieve atmospheric data at this moment.`);
      return true;
    }
  }

  // 6E. WORLD PULSE & GLOBAL NEWS ("world pulse", "global news", "tech news", "financial news", "science news", "crypto news", "news about AI")
  if (
    text.includes('world pulse') ||
    text.includes('global news') ||
    text.includes('latest news') ||
    text.includes('tech news') ||
    text.includes('science news') ||
    text.includes('space news') ||
    text.includes('energy news') ||
    text.includes('political news') ||
    text.includes('financial news') ||
    text.includes('market news') ||
    text.includes('crypto news') ||
    text.startsWith('news about') ||
    text.startsWith('news on')
  ) {
    let category = 'world';
    let query: string | undefined = undefined;

    if (text.includes('tech')) category = 'technology';
    else if (text.includes('science')) category = 'science';
    else if (text.includes('space')) category = 'space';
    else if (text.includes('energy')) category = 'energy';
    else if (text.includes('politic')) category = 'politics';
    else if (text.includes('financial') || text.includes('market')) category = 'financial';
    else if (text.includes('crypto')) category = 'crypto';
    else if (text.startsWith('news about ') || text.startsWith('news on ')) {
      query = text.replace(/^news\s+(?:about|on)\s+/i, '').trim();
    }

    jarvisVoiceEngine.setActiveTool('GET_WORLD_PULSE');
    try {
      const newsData = await fetchNews(category, query);
      const articleCount = newsData.articles.length;
      const spoken = `Retrieved ${articleCount} recent global event dispatches from the GDELT network, sir.`;
      jarvisStore.addMessage({
        role: 'assistant',
        text: `World Pulse stream synchronized for ${query ? `"${query}"` : category.toUpperCase()}. Displaying verified global event reports.`,
        actionSummary: `World Pulse: ${category.toUpperCase()}`,
        newsData
      });
      jarvisVoiceEngine.speakResponse(spoken);
      return true;
    } catch (err: any) {
      jarvisStore.addMessage({ role: 'assistant', text: `Global news service error: ${err?.message || 'Unavailable'}` });
      jarvisVoiceEngine.speakResponse("I could not reach the global news registry at this time.");
      return true;
    }
  }

  // 6F. EARTH MONITOR — EARTHQUAKES ("earthquakes", "show recent earthquakes", "seismic activity", "earthquake monitor")
  if (
    text.includes('earthquake') ||
    text.includes('earthquakes') ||
    text.includes('seismic activity') ||
    text.includes('earth monitor')
  ) {
    jarvisVoiceEngine.setActiveTool('GET_EARTHQUAKES');
    try {
      const eqData = await fetchEarthquakes(2.5, 25, 'day');
      const maxMag = eqData.earthquakes.length > 0 
        ? Math.max(...eqData.earthquakes.map(e => e.mag)) 
        : 0;
      const spoken = `Monitoring ${eqData.earthquakes.length} recent seismic events from the USGS network. Max magnitude recorded is ${maxMag}.`;
      jarvisStore.addMessage({
        role: 'assistant',
        text: `USGS Earth Monitor feed synced. Displaying ${eqData.earthquakes.length} real-time global seismic events (M2.5+).`,
        actionSummary: `Earthquakes: ${eqData.earthquakes.length} events`,
        earthquakeData: eqData
      });
      jarvisVoiceEngine.speakResponse(spoken);
      return true;
    } catch (err: any) {
      jarvisStore.addMessage({ role: 'assistant', text: `USGS Earth Monitor error: ${err?.message || 'Service offline'}` });
      jarvisVoiceEngine.speakResponse("I encountered an issue connecting to the USGS seismic monitoring network.");
      return true;
    }
  }

  // 6G. ORBITAL — ISS TRACKER ("track iss", "where is the iss", "space station location", "iss telemetry")
  if (
    text.includes('track iss') ||
    text.includes('where is the iss') ||
    text.includes('iss position') ||
    text.includes('iss location') ||
    text.includes('space station') ||
    text.includes('orbital telemetry')
  ) {
    jarvisVoiceEngine.setActiveTool('GET_ISS_TELEMETRY');
    try {
      const iss = await fetchIssTelemetry();
      const spoken = `The International Space Station is currently orbiting at altitude ${Math.round(iss.altitude)} kilometers with velocity of ${Math.round(iss.velocity).toLocaleString()} kilometers per hour.`;
      jarvisStore.addMessage({
        role: 'assistant',
        text: `ISS telemetry verified. Position: [Lat: ${iss.latitude}°, Lon: ${iss.longitude}°], Altitude: ${iss.altitude} km, Velocity: ${iss.velocity} km/h.`,
        actionSummary: `ISS: ${iss.latitude}°, ${iss.longitude}°`,
        issData: iss
      });
      jarvisVoiceEngine.speakResponse(spoken);
      return true;
    } catch (err: any) {
      jarvisStore.addMessage({ role: 'assistant', text: `Orbital tracking error: ${err?.message || 'Telemetry offline'}` });
      jarvisVoiceEngine.speakResponse("Unable to obtain orbital tracking telemetry from the station.");
      return true;
    }
  }

  // 6H. NASA / SPACE INTELLIGENCE — APOD ("astronomy picture of the day", "nasa photo", "nasa picture", "space picture", "show apod")
  if (
    text.includes('astronomy picture') ||
    text.includes('nasa picture') ||
    text.includes('nasa photo') ||
    text.includes('space picture') ||
    text.includes('space photo') ||
    text.includes('show apod') ||
    text.includes('astronomy photo')
  ) {
    jarvisVoiceEngine.setActiveTool('GET_NASA_APOD');
    try {
      const apod = await fetchNasaApod();
      const spoken = `Here is NASA's Astronomy Picture of the Day: "${apod.title}".`;
      jarvisStore.addMessage({
        role: 'assistant',
        text: `NASA Astronomy Picture of the Day (${apod.date}): "${apod.title}"`,
        actionSummary: `NASA APOD: ${apod.title}`,
        nasaData: apod
      });
      jarvisVoiceEngine.speakResponse(spoken);
      return true;
    } catch (err: any) {
      jarvisStore.addMessage({ role: 'assistant', text: `NASA APOD error: ${err?.message || 'Service limit reached'}` });
      jarvisVoiceEngine.speakResponse("I was unable to load NASA's daily astronomy imagery.");
      return true;
    }
  }

  // 6I. CRYPTO INTELLIGENCE ("crypto prices", "top crypto", "crypto market", "crypto overview", "crypto pulse")
  if (
    text.includes('crypto prices') ||
    text.includes('top crypto') ||
    text.includes('crypto market') ||
    text.includes('crypto pulse') ||
    text.includes('cryptocurrency prices') ||
    text.includes('market pulse crypto')
  ) {
    jarvisVoiceEngine.setActiveTool('GET_CRYPTO_MARKETS');
    try {
      const crypto = await fetchCryptoMarkets('usd');
      const btc = crypto.coins.find(c => c.symbol === 'BTC');
      const spoken = btc 
        ? `Bitcoin is currently trading at $${btc.current_price.toLocaleString()}, with a 24-hour change of ${btc.price_change_percentage_24h} percent.`
        : `Cryptocurrency market telemetry retrieved, sir.`;
      jarvisStore.addMessage({
        role: 'assistant',
        text: `Cryptocurrency market telemetry synchronized via CoinGecko. Displaying top market assets.`,
        actionSummary: `Crypto Pulse: Top 20 Assets`,
        cryptoData: crypto
      });
      jarvisVoiceEngine.speakResponse(spoken);
      return true;
    } catch (err: any) {
      jarvisStore.addMessage({ role: 'assistant', text: `Crypto data error: ${err?.message || 'Rate limit'}` });
      jarvisVoiceEngine.speakResponse("I could not fetch cryptocurrency price telemetry right now.");
      return true;
    }
  }

  // 6J. FX & CURRENCY CONVERSION ("convert 100 USD to INR", "exchange rate EUR to USD", "how much is 50 dollars in euros")
  const fxConvertMatch = text.match(/^(?:jarvis\s*,?\s*)?(?:convert|how\s+much\s+is|what\s+is)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]{3,4})\s*(?:to|in|into)\s*([a-zA-Z]{3,4})$/i);
  if (fxConvertMatch) {
    const amount = parseFloat(fxConvertMatch[1]);
    const base = fxConvertMatch[2].toUpperCase();
    const target = fxConvertMatch[3].toUpperCase();

    jarvisVoiceEngine.setActiveTool('CONVERT_CURRENCY');
    try {
      const fx = await convertCurrency(amount, base, target);
      const spoken = `${amount} ${base} is equal to ${fx.convertedAmount?.toLocaleString() ?? '...'} ${target} according to European Central Bank reference rates.`;
      jarvisStore.addMessage({
        role: 'assistant',
        text: `Currency Conversion: ${amount} ${base} = ${fx.convertedAmount?.toLocaleString()} ${target} (Rate: 1 ${base} = ${fx.rate} ${target}, Date: ${fx.date}).`,
        actionSummary: `FX: ${amount} ${base} -> ${target}`,
        fxData: fx
      });
      jarvisVoiceEngine.speakResponse(spoken);
      return true;
    } catch (err: any) {
      jarvisStore.addMessage({ role: 'assistant', text: `FX conversion error: ${err?.message || 'Unsupported currency'}` });
      jarvisVoiceEngine.speakResponse("I was unable to perform the currency conversion.");
      return true;
    }
  } else if (text.includes('forex rates') || text.includes('fx rates') || text.includes('currency rates') || text.includes('exchange rates')) {
    jarvisVoiceEngine.setActiveTool('GET_FX_RATES');
    try {
      const fx = await fetchExchangeRates('USD');
      const spoken = `Retrieved latest international reference exchange rates against the US Dollar.`;
      jarvisStore.addMessage({
        role: 'assistant',
        text: `FX Reference Exchange Rates (Base: USD). Synced via Frankfurter (ECB).`,
        actionSummary: `FX Rates: Base USD`,
        fxData: fx
      });
      jarvisVoiceEngine.speakResponse(spoken);
      return true;
    } catch (err: any) {
      jarvisStore.addMessage({ role: 'assistant', text: `FX rate error: ${err?.message || 'Offline'}` });
      jarvisVoiceEngine.speakResponse("Could not obtain foreign exchange reference rates.");
      return true;
    }
  }

  // 6K. MARKET WATCHLIST ("open watchlist", "my watchlist", "show watchlist", "market watchlist")
  if (
    text.includes('open watchlist') ||
    text.includes('my watchlist') ||
    text.includes('show watchlist') ||
    text.includes('market watchlist') ||
    text.includes('view watchlist')
  ) {
    jarvisVoiceEngine.setActiveTool('GET_WATCHLIST');
    const wl = getWatchlist();
    const spoken = `Opening your market watchlist. You have ${wl.items.length} monitored assets.`;
    jarvisStore.addMessage({
      role: 'assistant',
      text: `Market Watchlist loaded with ${wl.items.length} monitored financial assets.`,
      actionSummary: `Watchlist: ${wl.items.length} assets`,
      watchlistData: wl
    });
    jarvisVoiceEngine.speakResponse(spoken);
    return true;
  }

  // 6L. PORTFOLIO TRACKER ("my portfolio", "show portfolio", "portfolio value", "portfolio holdings", "check portfolio")
  if (
    text.includes('my portfolio') ||
    text.includes('show portfolio') ||
    text.includes('portfolio value') ||
    text.includes('portfolio holdings') ||
    text.includes('check portfolio')
  ) {
    jarvisVoiceEngine.setActiveTool('GET_PORTFOLIO');
    try {
      const port = await getPortfolioData();
      const pnlSign = port.totalPnl >= 0 ? '+' : '';
      const spoken = `Your total portfolio value is $${port.totalValue.toLocaleString()} USD, with an overall unrealized profit of ${pnlSign}$${port.totalPnl.toLocaleString()} (${pnlSign}${port.totalPnlPercent}%).`;
      jarvisStore.addMessage({
        role: 'assistant',
        text: `Local Portfolio Tracker: Total Value: $${port.totalValue.toLocaleString()}, P&L: ${pnlSign}$${port.totalPnl.toLocaleString()} (${pnlSign}${port.totalPnlPercent}%).`,
        actionSummary: `Portfolio: $${port.totalValue.toLocaleString()}`,
        portfolioData: port
      });
      jarvisVoiceEngine.speakResponse(spoken);
      return true;
    } catch (err: any) {
      jarvisStore.addMessage({ role: 'assistant', text: `Portfolio data calculation error: ${err?.message || 'Local storage issue'}` });
      jarvisVoiceEngine.speakResponse("Could not calculate portfolio valuation.");
      return true;
    }
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

  // 7.5. START FOCUS MUSIC (The Batman OST / Focus Suite https://youtu.be/YKLKoHORjYI)
  if (
    text === 'start focus music' ||
    text === 'play focus music' ||
    text === 'focus music' ||
    text === 'start focus track' ||
    text === 'play focus track' ||
    text === 'play the focus music' ||
    text === 'play the focus track' ||
    text === 'batman music' ||
    text === 'play batman music' ||
    text === 'batman theme' ||
    text === 'lock in music' ||
    text.includes('start focus music') ||
    text.includes('play focus music')
  ) {
    const focusTrack = {
      id: `focus-suite-yt-YKLKoHORjYI`,
      videoId: 'YKLKoHORjYI',
      title: 'The Batman - Atmospheric Focus Suite',
      artist: 'Michael Giacchino',
      thumbnail: 'https://img.youtube.com/vi/YKLKoHORjYI/hqdefault.jpg',
      dominantColor: 'rgb(20, 20, 20)',
      addedAt: Date.now(),
      sourceUrl: 'https://youtu.be/YKLKoHORjYI?si=OmDfuKAhECyDMOxb',
    };
    frequencyStore.addTrack(focusTrack);
    frequencyStore.playTrack(focusTrack.id);
    window.dispatchEvent(new CustomEvent('start-theatre', { detail: { url: focusTrack.sourceUrl, isFocusMusic: true } }));
    window.dispatchEvent(new CustomEvent('batman-focus-music', { detail: { url: focusTrack.sourceUrl } }));
    const reply = "Streaming tactical focus soundtrack in the background, sir. All neural channels focused.";
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Playing Focus Soundtrack' });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
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

/**
 * Structured Intent Parser with Strict Confidence Thresholds and Confirmation Gating
 */
export async function parseStructuredIntent(rawText: string): Promise<StructuredIntentResult> {
  const text = rawText.trim().toLowerCase();
  
  if (!text) {
    return {
      intent: 'EMPTY_INPUT',
      confidence: 0,
      entities: {},
      response: 'I did not catch that, sir.',
      requiresConfirmation: false,
      action: null
    };
  }

  // 1. Check for Ambiguous / Vague Commands ("do that thing", "fix it", "make it work", "whatever")
  const ambiguousPhrases = [
    'do that thing', 'do that', 'fix it', 'make it work', 'do something', 
    'run that', 'whatever', 'handle it', 'you know what to do', 'make it happen'
  ];
  if (ambiguousPhrases.includes(text) || text.length < 3) {
    return {
      intent: 'AMBIGUOUS_COMMAND',
      confidence: 0.45,
      entities: { rawText },
      response: "Could you please specify which protocol or action you would like me to execute, sir?",
      requiresConfirmation: false,
      action: null
    };
  }

  // 2. Destructive & Session Reset Commands (Require Confirmation)
  if (text.includes('delete task') || text.includes('remove task') || text.includes('clear tasks') || text.includes('delete all tasks')) {
    const isAll = text.includes('all') || text.includes('clear');
    const queryMatch = text.replace(/^(?:delete|remove|clear)\s+(?:task|tasks|all tasks)?\s*/i, '').trim();
    return {
      intent: 'DELETE_TASK',
      confidence: 0.95,
      entities: { query: queryMatch, all: isAll },
      response: isAll ? "Are you sure you want to delete all tasks in the matrix, sir?" : `Confirm deletion of task matching "${queryMatch || 'selected'}", sir?`,
      requiresConfirmation: true,
      action: 'DELETE_TASK',
      rawAction: { type: 'DELETE_TASK', title: queryMatch }
    };
  }

  if (text.includes('reset timer') || text.includes('cancel timer') || text.includes('abort timer')) {
    return {
      intent: 'RESET_TIMER',
      confidence: 0.95,
      entities: {},
      response: "Are you sure you want to reset the current focus timer to zero, sir?",
      requiresConfirmation: true,
      action: 'RESET_TIMER',
      rawAction: { type: 'RESET_TIMER' }
    };
  }

  // 3. High Confidence Deterministic Local Commands
  if (
    text.includes('timer') || 
    text.includes('pomodoro') || 
    text.includes('sprint') || 
    text.includes('start focus') || 
    text.includes('focus block') ||
    text.includes('focus session')
  ) {
    let durationMinutes = 25;
    let timerName = 'Deep Focus Block';
    const minMatch = text.match(/(\d+)\s*(?:minute|min|m\b)/);
    if (minMatch && minMatch[1]) {
      durationMinutes = parseInt(minMatch[1], 10);
      timerName = `${durationMinutes}m Focus Block`;
    } else if (text.includes('short') || text.includes('quick')) {
      durationMinutes = 15;
      timerName = 'Quick Sprint';
    } else if (text.includes('deep') || text.includes('hour')) {
      durationMinutes = 60;
      timerName = 'Ultradian Deep Work';
    }
    return {
      intent: 'START_TIMER',
      confidence: 0.98,
      entities: { minutes: durationMinutes, name: timerName },
      response: `Starting ${durationMinutes}-minute focus block: ${timerName}.`,
      requiresConfirmation: false,
      action: 'START_TIMER',
      rawAction: { type: 'START_TIMER', minutes: durationMinutes, name: timerName }
    };
  }

  if (text.includes('pause timer') || text.includes('hold timer')) {
    return {
      intent: 'PAUSE_TIMER',
      confidence: 0.98,
      entities: {},
      response: "Timer protocol held, sir.",
      requiresConfirmation: false,
      action: 'PAUSE_TIMER',
      rawAction: { type: 'PAUSE_TIMER' }
    };
  }

  if (text.includes('resume timer') || text.includes('continue timer') || text.includes('unpause timer')) {
    return {
      intent: 'RESUME_TIMER',
      confidence: 0.98,
      entities: {},
      response: "Resuming countdown. Locked in.",
      requiresConfirmation: false,
      action: 'RESUME_TIMER',
      rawAction: { type: 'RESUME_TIMER' }
    };
  }

  if (text.startsWith('add task') || text.startsWith('create task') || text.startsWith('new task') || text.startsWith('remind me to')) {
    const taskTitle = text.replace(/^(?:add task|create task|new task|remind me to|schedule task)\s*(?::|to|-)?\s*/i, '').trim() || 'Deep Work Priority Sprint';
    return {
      intent: 'CREATE_TASK',
      confidence: 0.96,
      entities: { title: taskTitle, priority: text.includes('urgent') ? 'urgent' : 'high' },
      response: `Logged objective: "${taskTitle}". Synchronized to your task matrix.`,
      requiresConfirmation: false,
      action: 'CREATE_TASK',
      rawAction: { type: 'CREATE_TASK', title: taskTitle, priority: text.includes('urgent') ? 'urgent' : 'high' }
    };
  }

  if (text.includes('complete task') || text.includes('finish task') || text.includes('check off task') || text.includes('done with task')) {
    const query = text.replace(/^(?:complete task|finish task|check off task|done with task|done with)\s*(?::|to|-)?\s*/i, '').trim();
    return {
      intent: 'COMPLETE_TASK',
      confidence: 0.95,
      entities: { query },
      response: query ? `Objective matching "${query}" marked complete.` : "Current focus objective completed.",
      requiresConfirmation: false,
      action: 'COMPLETE_TASK',
      rawAction: { type: 'COMPLETE_TASK', title: query }
    };
  }

  // Default intent for fallback/Gemini
  return {
    intent: 'GENERAL_QUERY',
    confidence: 0.85,
    entities: { rawText },
    response: '',
    requiresConfirmation: false,
    action: null
  };
}

export async function handleGlobalJarvisCommand(rawText: string, sessionId?: string): Promise<void> {
  const text = rawText.trim();
  if (!text) return;

  const jarvisStore = useJarvisStore.getState();
  const telemetry = jarvisVoiceEngine.getTelemetry();

  // 1. Check if we are in confirmation_required state
  if (telemetry.state === 'confirmation_required' || telemetry.hasPendingConfirmation) {
    const cleanLower = text.toLowerCase();
    if (cleanLower === 'yes' || cleanLower === 'confirm' || cleanLower === 'do it' || cleanLower === 'proceed' || cleanLower === 'yeah' || cleanLower === 'sure') {
      await jarvisVoiceEngine.confirmPendingAction();
      return;
    }
    if (cleanLower === 'no' || cleanLower === 'cancel' || cleanLower === 'stop' || cleanLower === 'never mind' || cleanLower === 'nevermind' || cleanLower === 'abort') {
      jarvisVoiceEngine.cancelPendingAction();
      return;
    }
  }

  jarvisStore.addMessage({ role: 'user', text });

  // 2. Parse Structured Intent
  const structuredIntent = await parseStructuredIntent(text);
  jarvisVoiceEngine.setIntentTelemetry(structuredIntent.intent, structuredIntent.confidence);

  // 3. Check Intent Confidence Threshold
  const minConfidence = 0.80; // Configurable threshold
  if (structuredIntent.confidence < minConfidence) {
    const clarification = structuredIntent.response || "Could you please rephrase that command, sir?";
    jarvisStore.addMessage({ role: 'assistant', text: clarification });
    jarvisVoiceEngine.speakResponse(clarification);
    return;
  }

  // 4. Check Confirmation Requirement for Destructive / Write Actions
  if (structuredIntent.requiresConfirmation && structuredIntent.rawAction) {
    const actionObj = structuredIntent.rawAction;
    jarvisVoiceEngine.requestConfirmation(structuredIntent.response, async () => {
      validateAndExecuteTool(actionObj);
      const doneReply = `Action executed: ${actionObj.type.replace(/_/g, ' ')}.`;
      jarvisStore.addMessage({ role: 'assistant', text: doneReply, actionSummary: actionObj.type });
      jarvisVoiceEngine.speakResponse(doneReply);
    });
    return;
  }

  // 5. Try deterministic local command first
  const isHandled = await executeLocalCommand(text);

  // 6. If not handled locally, invoke Gemini reasoning
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

