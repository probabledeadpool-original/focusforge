/**
 * FocusForge ↔ AURA Integration Bridge
 * 
 * This hook centralizes all activity tracking from FocusForge into AURA.
 * It captures data from:
 * - Timer sessions (Pomodoro, Deep Flow, Ultradian, etc.)
 * - Task completions
 * - PDF/Video study sessions
 * - Market research & analysis
 * - Hub-based learning
 * - Cinematic motivation videos
 * - Reflection entries
 */

import { useCallback, useRef, useEffect } from 'react';
import { useAuraIntegration } from './useAuraIntegration';
import { useAuraStore } from './useAuraStore';

export interface FocusForgeActivityData {
  activityType: 'timer' | 'task' | 'study' | 'video' | 'market' | 'reflection' | 'exercise';
  duration: number; // minutes
  quality: number; // 0-1
  intensity: 'low' | 'medium' | 'high';
  completed: boolean;
  notes?: string;
  tags?: string[];
  timestamp?: number;
}

export function useFocusForgeAuraIntegration() {
  const { recordSession } = useAuraIntegration();
  const auraStore = useAuraStore();
  const lastRecordedRef = useRef<number>(0);
  const sessionBufferRef = useRef<FocusForgeActivityData[]>([]);

  /**
   * Record a timer session (Pomodoro, Deep Flow, etc.)
   */
  const recordTimerSession = useCallback((
    presetName: string,
    totalDuration: number,
    focusSegments: number,
    completedCycles: number
  ) => {
    const quality = Math.min(0.95, 0.7 + (focusSegments * 0.1));
    
    recordSession({
      type: 'timer',
      duration: totalDuration,
      quality,
      completed: completedCycles > 0,
      note: `${presetName}: ${completedCycles} cycles, ${focusSegments} focus segments`
    });

    sessionBufferRef.current.push({
      activityType: 'timer',
      duration: totalDuration,
      quality,
      intensity: presetName.toLowerCase().includes('ultradian') ? 'high' : 
                 presetName.toLowerCase().includes('deep') ? 'high' : 'medium',
      completed: completedCycles > 0,
      notes: presetName,
      tags: ['timer', 'focused-work'],
      timestamp: Date.now()
    });
  }, [recordSession]);

  /**
   * Record task completion
   */
  const recordTaskCompletion = useCallback((
    taskTitle: string,
    priority: 'high' | 'medium' | 'low',
    duration?: number
  ) => {
    const qualityMap = { high: 1.0, medium: 0.8, low: 0.6 };
    
    recordSession({
      type: 'reflection',
      quality: qualityMap[priority],
      completed: true,
      note: `Task completed: ${taskTitle}`
    });

    sessionBufferRef.current.push({
      activityType: 'task',
      duration: duration || 0,
      quality: qualityMap[priority],
      intensity: priority === 'high' ? 'high' : priority === 'medium' ? 'medium' : 'low',
      completed: true,
      notes: taskTitle,
      tags: ['task', `priority-${priority}`],
      timestamp: Date.now()
    });
  }, [recordSession]);

  /**
   * Record study session (PDF, videos, notes)
   */
  const recordStudySession = useCallback((
    materialType: 'pdf' | 'video' | 'mixed',
    duration: number,
    notesCount: number,
    subjectArea?: string
  ) => {
    const quality = Math.min(1.0, 0.7 + (notesCount * 0.05));
    
    recordSession({
      type: 'study',
      duration,
      quality,
      completed: notesCount > 0,
      note: `${materialType} study: ${notesCount} notes ${subjectArea ? `(${subjectArea})` : ''}`
    });

    sessionBufferRef.current.push({
      activityType: 'study',
      duration,
      quality,
      intensity: 'medium',
      completed: notesCount > 0,
      notes: `${materialType} study with ${notesCount} notes`,
      tags: ['study', 'learning', materialType, ...(subjectArea ? [subjectArea] : [])],
      timestamp: Date.now()
    });
  }, [recordSession]);

  /**
   * Record video-based learning (cinematic, YouTube, educational content)
   */
  const recordVideoSession = useCallback((
    duration: number,
    contentType: 'cinematic' | 'educational' | 'market-research',
    completed: boolean,
    description?: string
  ) => {
    const qualityMap = {
      'cinematic': 0.85,
      'educational': 0.9,
      'market-research': 0.75
    };

    recordSession({
      type: 'video',
      duration,
      quality: qualityMap[contentType],
      completed,
      note: description || `${contentType} video content`
    });

    sessionBufferRef.current.push({
      activityType: 'video',
      duration,
      quality: qualityMap[contentType],
      intensity: 'medium',
      completed,
      notes: description,
      tags: ['video', contentType],
      timestamp: Date.now()
    });
  }, [recordSession]);

  /**
   * Record market/financial research session
   */
  const recordMarketResearch = useCallback((
    duration: number,
    symbolsAnalyzed: number,
    completed: boolean
  ) => {
    const quality = Math.min(0.9, 0.6 + (symbolsAnalyzed * 0.1));

    recordSession({
      type: 'video',
      duration,
      quality,
      completed,
      note: `Market research: analyzed ${symbolsAnalyzed} symbols`
    });

    sessionBufferRef.current.push({
      activityType: 'market',
      duration,
      quality,
      intensity: 'high',
      completed,
      notes: `Analyzed ${symbolsAnalyzed} market symbols`,
      tags: ['market', 'research', 'finance'],
      timestamp: Date.now()
    });
  }, [recordSession]);

  /**
   * Record physical exercise/activity
   */
  const recordExerciseSession = useCallback((
    duration: number,
    intensity: 'low' | 'medium' | 'high',
    exerciseType?: string
  ) => {
    const qualityMap = { low: 0.6, medium: 0.8, high: 1.0 };

    recordSession({
      type: 'exercise',
      duration,
      quality: qualityMap[intensity],
      completed: true,
      note: exerciseType ? `${exerciseType} - ${intensity} intensity` : `Exercise session - ${intensity} intensity`
    });

    sessionBufferRef.current.push({
      activityType: 'exercise',
      duration,
      quality: qualityMap[intensity],
      intensity,
      completed: true,
      notes: exerciseType,
      tags: ['exercise', 'physical', intensity],
      timestamp: Date.now()
    });
  }, [recordSession]);

  /**
   * Record daily reflection/journaling
   */
  const recordReflection = useCallback((
    content: string,
    emotionalState: 'positive' | 'neutral' | 'challenging',
    journalLength: number // character count
  ) => {
    const quality = Math.min(1.0, 0.7 + (journalLength / 1000) * 0.3);

    recordSession({
      type: 'reflection',
      quality,
      completed: true,
      note: `Daily reflection: ${emotionalState} - ${journalLength} characters`
    });

    sessionBufferRef.current.push({
      activityType: 'reflection',
      duration: 0,
      quality,
      intensity: 'low',
      completed: true,
      notes: content.substring(0, 200),
      tags: ['reflection', 'journaling', emotionalState],
      timestamp: Date.now()
    });
  }, [recordSession]);

  /**
   * Get daily summary of all activities
   */
  const getDailySummary = useCallback(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    const todaysActivities = sessionBufferRef.current.filter(
      a => (a.timestamp || 0) >= today
    );

    return {
      totalActivities: todaysActivities.length,
      totalDuration: todaysActivities.reduce((sum, a) => sum + a.duration, 0),
      byType: todaysActivities.reduce((acc, a) => ({
        ...acc,
        [a.activityType]: (acc[a.activityType as keyof typeof acc] || 0) + 1
      }), {} as Record<string, number>),
      averageQuality: todaysActivities.length > 0
        ? todaysActivities.reduce((sum, a) => sum + a.quality, 0) / todaysActivities.length
        : 0,
      intensityDistribution: todaysActivities.reduce((acc, a) => ({
        ...acc,
        [a.intensity]: (acc[a.intensity] || 0) + 1
      }), {} as Record<string, number>)
    };
  }, []);

  /**
   * Sync all buffered activities to AURA analytics
   */
  const syncToAura = useCallback(() => {
    if (sessionBufferRef.current.length === 0) return;

    const summary = getDailySummary();
    
    // Optionally: Update AURA with bulk statistics
    if (auraStore) {
      // This could trigger additional AURA calculations
      // For now, activities are already being recorded individually via recordSession
    }

    console.debug('[AURA Integration] Synced', sessionBufferRef.current.length, 'activities to AURA');
  }, [getDailySummary, auraStore]);

  /**
   * Clear session buffer (useful for daily resets)
   */
  const clearBuffer = useCallback(() => {
    sessionBufferRef.current = [];
  }, []);

  return {
    recordTimerSession,
    recordTaskCompletion,
    recordStudySession,
    recordVideoSession,
    recordMarketResearch,
    recordExerciseSession,
    recordReflection,
    getDailySummary,
    syncToAura,
    clearBuffer,
    activityBuffer: sessionBufferRef.current
  };
}
