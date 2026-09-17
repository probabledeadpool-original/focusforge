// AURA Integration Hook - Seamlessly record FocusForge activities

import { useAuraStore } from './useAuraStore';

interface SessionMetrics {
  type: 'timer' | 'study' | 'video' | 'exercise' | 'reflection';
  duration?: number; // in minutes
  quality?: number; // 0-1
  completed?: boolean;
  note?: string;
  activities?: string[];
}

/**
 * Hook to record FocusForge activities into AURA
 * Non-intrusive - works alongside existing code
 */
export function useAuraIntegration() {
  const { recordBehavior } = useAuraStore();

  const recordSession = (metrics: SessionMetrics) => {
    // Calculate focus quality
    const qualityMap: Record<string, number> = {
      timer: (metrics.quality || 0.7) * 0.9,
      study: (metrics.quality || 0.75) * 0.95,
      video: (metrics.quality || 0.6) * 0.7,
      exercise: (metrics.quality || 0.8) * 1.1, // Exercise boosts momentum
      reflection: (metrics.quality || 0.7) * 0.8,
    };

    const focusQuality = Math.min(1, qualityMap[metrics.type] || 0.5);

    // Calculate AURA score
    const durationFactor = Math.min(1, (metrics.duration || 30) / 120); // Normalize to 120 min
    const auraScore = 450 + focusQuality * 150 + durationFactor * 50;

    // Determine if consistent (completed session > 20 min)
    const consistencyMark =
      metrics.completed !== false &&
      (metrics.duration || 0) >= 20;

    // Calculate momentum
    const momentum = focusQuality * (metrics.duration ? Math.min(1, metrics.duration / 60) : 0.5);

    // Calculate burnout (inverse of exercise, higher for mental work)
    const burnoutBase =
      metrics.type === 'exercise'
        ? -0.1 // Exercise reduces burnout
        : metrics.type === 'timer'
          ? 0.1
          : metrics.type === 'study'
            ? 0.15
            : 0;

    recordBehavior({
      auraScore: Math.round(auraScore),
      momentum: Math.min(1, momentum),
      focusQuality,
      consistencyMark,
      emotionalNote: metrics.note,
      activitiesCompleted: metrics.activities || [metrics.type],
      burnoutIndicators: Math.max(0, burnoutBase),
    });
  };

  return { recordSession };
}

/**
 * Integration pattern: Add to your component's completion handler
 * 
 * Example usage in a Timer component:
 * 
 * const { recordSession } = useAuraIntegration();
 * 
 * const handleTimerComplete = () => {
 *   recordSession({
 *     type: 'timer',
 *     duration: 25,
 *     quality: 0.85,
 *     completed: true,
 *     note: 'Focused pomodoro session'
 *   });
 * };
 */
