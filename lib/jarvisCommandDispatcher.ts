"use client";

import { useJarvisStore } from '../hooks/useJarvisStore';
import { useAppStore } from '../hooks/useAppStore';
import { useFrequencyStore } from '../hooks/useFrequencyStore';
import { jarvisAudio } from './jarvisAudio';
import { jarvisVoiceEngine, voiceLog } from './jarvisVoiceEngine';

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
    parameters: { view: 'home | timer | activeTimer | tasks | place | ledger | terminal | stats | aura | hub | profile' }
  },
  PLAY_AUDIO: {
    name: 'PLAY_AUDIO',
    category: 'READ_ONLY',
    description: 'Start acoustic frequency or lofi playback.',
    parameters: {}
  },
  STOP_AUDIO: {
    name: 'STOP_AUDIO',
    category: 'READ_ONLY',
    description: 'Silence background audio.',
    parameters: {}
  },
  ADD_COINS: {
    name: 'ADD_COINS',
    category: 'DRAFT',
    description: 'Award Maybach achievement coins.',
    parameters: { amount: 'number' }
  }
};

export const JARVIS_SYSTEM_INSTRUCTION = `You are J.A.R.V.I.S., the ultra-competent, witty, and loyal executive AI assistant for FocusForge.
Guidelines:
1. Speak with executive poise, concise intelligence, and high-tech wit.
2. Keep spoken responses compact (1-2 sentences maximum) so they are fast and impactful when spoken aloud.
3. Address the user politely ("Sir", "Boss", or "Chief").
4. REAL ACTION EXECUTION: Whenever the user requests any task creation, task completion, timer control, navigation, audio, or focus mode, you MUST append an executable action tag at the very end of your response:
- Create task: [ACTION:{"type":"CREATE_TASK","title":"Task name","priority":"urgent"|"high"|"medium"}]
- Complete task: [ACTION:{"type":"COMPLETE_TASK","title":"Task name or keyword"}]
- Delete task: [ACTION:{"type":"DELETE_TASK","title":"Task name or keyword"}]
- Start timer: [ACTION:{"type":"START_TIMER","minutes":25,"name":"Focus Block"}]
- Pause timer: [ACTION:{"type":"PAUSE_TIMER"}]
- Resume timer: [ACTION:{"type":"RESUME_TIMER"}]
- Reset timer: [ACTION:{"type":"RESET_TIMER"}]
- Navigation: [ACTION:{"type":"NAVIGATE","view":"home"|"timer"|"activeTimer"|"tasks"|"place"|"ledger"|"terminal"|"stats"|"aura"|"hub"|"profile"}]
- Play audio: [ACTION:{"type":"PLAY_AUDIO"}]
- Stop audio: [ACTION:{"type":"STOP_AUDIO"}]
- Award coins: [ACTION:{"type":"ADD_COINS","amount":50}]

Example: "Right away, sir. I've logged 'Complete physics assignment' to your active tasks. [ACTION:{\"type\":\"CREATE_TASK\",\"title\":\"Complete physics assignment\",\"priority\":\"high\"}]"`;

export function validateAndExecuteTool(action: { type: string; [key: string]: any }): boolean {
  if (!action || typeof action.type !== 'string') {
    voiceLog("TOOL_VALIDATION_FAILED", { reason: "Missing action type" });
    return false;
  }

  const toolDef = JARVIS_TOOLS[action.type];
  if (!toolDef) {
    voiceLog("UNKNOWN_TOOL_REJECTED", { actionType: action.type });
    return false;
  }

  jarvisVoiceEngine.setActiveTool(action.type);
  const jarvisStore = useJarvisStore.getState();
  const appStore = useAppStore.getState();
  const frequencyStore = useFrequencyStore.getState();

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
        frequencyStore.setIsPlaying(true);
        jarvisStore.setLastAction('PLAYING FREQUENCY AUDIO');
        jarvisAudio.playExecute();
        return true;
      }
      case 'STOP_AUDIO': {
        frequencyStore.setIsPlaying(false);
        jarvisStore.setLastAction('AUDIO SILENCED');
        jarvisAudio.playExecute();
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

export async function executeLocalCommand(rawText: string): Promise<boolean> {
  const text = rawText.toLowerCase().trim();
  const jarvisStore = useJarvisStore.getState();
  const frequencyStore = useFrequencyStore.getState();

  // 1. TIMER COMMANDS
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

  // 2. TASK OBJECTIVES
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
      jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: `Listed ${active.length} tasks` });
      jarvisVoiceEngine.speakResponse(reply);
      return true;
    } catch (e) {}
  }

  // 3. NAVIGATION
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

  // 4. AUDIO CONTROLS
  if (text.includes('play music') || text.includes('start audio') || text.includes('play frequency') || text.includes('play 432') || text.includes('play lofi')) {
    validateAndExecuteTool({ type: 'PLAY_AUDIO' });
    const currentTrack = frequencyStore.getCurrentTrack();
    const reply = `Streaming acoustic frequency: ${currentTrack?.title || '432 Hz Alpha Waves'}.`;
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: `Playing: ${currentTrack?.title}` });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  if (text.includes('stop music') || text.includes('pause music') || text.includes('stop audio') || text.includes('mute music')) {
    validateAndExecuteTool({ type: 'STOP_AUDIO' });
    const reply = "Audio output silenced.";
    jarvisStore.addMessage({ role: 'assistant', text: reply, actionSummary: 'Audio Silenced' });
    jarvisVoiceEngine.speakResponse(reply);
    return true;
  }

  // 5. HUD & VIEW CONTROLS
  if (text.includes('close jarvis') || text.includes('exit jarvis') || text.includes('goodbye jarvis') || text.includes('dismiss')) {
    const reply = "Standing by in background, sir. Say 'JARVIS' whenever needed.";
    jarvisVoiceEngine.speakResponse(reply);
    setTimeout(() => jarvisStore.closeJarvis(), 1200);
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

  return false; // Not handled locally -> fallback to Gemini
}

import { getSelectedTextModel, recordAiUsage } from './aiModelConfig';

export async function processWithGemini(userPrompt: string): Promise<void> {
  const jarvisStore = useJarvisStore.getState();
  jarvisVoiceEngine.setGeminiStatus('connecting');
  jarvisAudio.playThinking();
  const startTime = Date.now();
  const selectedTextModel = getSelectedTextModel();

  try {
    const apiKey = typeof window !== 'undefined' ? localStorage.getItem('gemini-api-key') || '' : '';

    jarvisVoiceEngine.setGeminiStatus('processing');

    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: userPrompt,
        apiKey,
        model: selectedTextModel,
        systemInstruction: JARVIS_SYSTEM_INSTRUCTION
      })
    });

    const data = await res.json();
    const latencyMs = Date.now() - startTime;

    if (res.ok && data.reply) {
      jarvisVoiceEngine.setGeminiStatus('connected');
      const actionMatch = data.reply.match(/\[ACTION:([\s\S]*?)\]/);
      let cleanReply = data.reply.replace(/\[ACTION:[\s\S]*?\]/g, '').trim();
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

      // Record session usage
      recordAiUsage({
        model: data.model || selectedTextModel,
        inputTokens: data.usage?.promptTokens || Math.round(userPrompt.length / 4),
        outputTokens: data.usage?.completionTokens || Math.round(cleanReply.length / 4),
        isFallback: data.isFallback,
        latencyMs
      });

      if (data.isFallback) {
        voiceLog("TEXT_MODEL_FALLBACK_TRIGGERED", { 
          original: selectedTextModel, 
          fallback: data.model,
          reason: data.fallbackReason 
        });
      }

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
