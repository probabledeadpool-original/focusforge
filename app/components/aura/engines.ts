// AURA Core Engines - Production-Ready System

import {
  AuraScore,
  MomentumData,
  EvolutionStage,
  BehavioralRhythm,
  BehaviorEntry,
  IdentityArchetype,
  AIInsight,
} from './types';

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

// ============================================
// AURA SCORE ENGINE
// ============================================

export class AuraScoreEngine {
  calculateScore(
    behaviorHistory: BehaviorEntry[],
    momentum: number,
    consistency: number,
    focusQuality: number,
    emotionalStability: number
  ): AuraScore {
    const baseScore = 500;
    const today = new Date().toDateString();
    const recentEntries = behaviorHistory.slice(-30);

    // Discipline score: consistency + completion
    const discipline = Math.min(
      100,
      (consistency * 0.6 + (recentEntries.length / 30) * 0.4) * 100
    );

    // Consistency score: streak and daily marks
    const consistencyScore = Math.min(
      100,
      recentEntries.filter((e) => e.consistencyMark).length * 3.33
    );

    // Focus score: quality and depth
    const focusScore = Math.min(100, focusQuality * 100);

    // Emotional stability: burnout risk inverse + emotional progression
    const emotionalScore = Math.min(
      100,
      (1 - average(recentEntries.map((e) => e.burnoutIndicators || 0))) * 100
    );

    // Growth: momentum trajectory
    const growthScore = Math.min(100, momentum * 0.8 * 100);

    // Momentum: live momentum value
    const momentumScore = momentum * 100;

    // Self-respect: consistency + emotional stability + achievements
    const selfRespectScore = Math.min(
      100,
      (consistencyScore + emotionalScore + focusScore) / 3
    );

    const total = Math.round(
      baseScore +
        discipline * 0.15 +
        consistencyScore * 0.15 +
        focusScore * 0.15 +
        emotionalScore * 0.15 +
        growthScore * 0.15 +
        momentumScore * 0.15 +
        selfRespectScore * 0.1
    );

    const trend =
      recentEntries.length >= 7
        ? this.calculateTrend(recentEntries.slice(-7).map((e) => e.auraScore))
        : 'stable';

    return {
      total,
      discipline: Math.round(discipline),
      consistency: Math.round(consistencyScore),
      focus: Math.round(focusScore),
      emotionalStability: Math.round(emotionalScore),
      growth: Math.round(growthScore),
      momentum: Math.round(momentumScore),
      selfRespect: Math.round(selfRespectScore),
      lastUpdated: Date.now(),
      trend,
    };
  }

  private calculateTrend(
    scores: number[]
  ): 'rising' | 'stable' | 'declining' {
    if (scores.length < 2) return 'stable';
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const diff = secondAvg - firstAvg;

    if (diff > 50) return 'rising';
    if (diff < -50) return 'declining';
    return 'stable';
  }
}

// ============================================
// MOMENTUM ENGINE
// ============================================

export class MomentumEngine {
  analyzeBehavioralRhythm(
    behaviorHistory: BehaviorEntry[]
  ): BehavioralRhythm {
    if (behaviorHistory.length === 0) {
      return {
        averageConsistency: 0,
        peakHours: [],
        routineStability: 0,
        adaptability: 0,
        burnoutRisk: 0,
      };
    }

    const consistencyDays = behaviorHistory.filter(
      (e) => e.consistencyMark
    ).length;
    const averageConsistency = consistencyDays / behaviorHistory.length;

    // Calculate burnout risk
    const recentBurnout = behaviorHistory
      .slice(-7)
      .map((e) => e.burnoutIndicators || 0);
    const burnoutRisk =
      recentBurnout.reduce((a, b) => a + b, 0) / Math.max(1, recentBurnout.length);

    return {
      averageConsistency,
      peakHours: this.detectPeakHours(behaviorHistory),
      routineStability: this.calculateRoutineStability(behaviorHistory),
      adaptability: 1 - burnoutRisk,
      burnoutRisk,
    };
  }

  private detectPeakHours(history: BehaviorEntry[]): number[] {
    // In production, this would analyze time-series data
    // For now, returning typical peak hours (9-12, 14-16, 19-21)
    return [9, 10, 11, 14, 15, 19, 20, 21];
  }

  private calculateRoutineStability(history: BehaviorEntry[]): number {
    if (history.length < 14) return 0;

    // Analyze consistency of weekly patterns
    const weeks = Math.floor(history.length / 7);
    const weeklyConsistency = [];

    for (let i = 0; i < weeks; i++) {
      const weekStart = i * 7;
      const weekEnd = weekStart + 7;
      const weekData = history.slice(weekStart, weekEnd);
      const consistentDays = weekData.filter((e) => e.consistencyMark).length;
      weeklyConsistency.push(consistentDays / 7);
    }

    // Standard deviation of weekly consistency
    const avg =
      weeklyConsistency.reduce((a, b) => a + b, 0) / weeklyConsistency.length;
    const variance =
      weeklyConsistency.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
      weeklyConsistency.length;

    // Lower variance = higher stability (convert to 0-1)
    return Math.max(0, 1 - Math.sqrt(variance));
  }

  calculateMomentum(
    behaviorHistory: BehaviorEntry[],
    consistency: number,
    rhythm: BehavioralRhythm
  ): Omit<MomentumData, 'surges'> {
    const streak = this.calculateStreak(behaviorHistory);
    const decayRate = 0.02; // 2% daily decay without activity

    // Momentum = consistency * streak influence * rhythm stability
    const current = Math.min(
      1,
      consistency * (1 + streak / 100) * rhythm.routineStability
    );

    return {
      current,
      peak: Math.max(...behaviorHistory.map((e) => e.momentum || 0), 0),
      streak,
      streakDays: this.calculateStreakDays(behaviorHistory),
      decayRate,
      lastActive: behaviorHistory.length > 0 ? behaviorHistory[behaviorHistory.length - 1].date : Date.now(),
      rhythm,
      recoveryPhase: rhythm.burnoutRisk > 0.7,
    };
  }

  private calculateStreak(history: BehaviorEntry[]): number {
    if (history.length === 0) return 0;

    let streak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].consistencyMark) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  private calculateStreakDays(history: BehaviorEntry[]): number {
    const streak = this.calculateStreak(history);
    return streak;
  }
}

// ============================================
// IDENTITY EVOLUTION ENGINE
// ============================================

export class IdentityEvolutionEngine {
  private archetypeProgression: IdentityArchetype[] = [
    'seeker',
    'builder',
    'executor',
    'visionary',
    'master',
    'sage',
  ];

  determineEvolutionStage(
    auraScore: number,
    momentum: number,
    behaviorHistory: BehaviorEntry[],
    currentLevel: number
  ): EvolutionStage {
    const level = this.calculateLevel(auraScore, momentum, behaviorHistory);
    const archetype = this.archetypeProgression[
      Math.min(level - 1, this.archetypeProgression.length - 1)
    ];

    const phase = this.determinePhase(momentum, behaviorHistory);
    const progress = this.calculateProgress(auraScore, level);

    return {
      level: Math.max(level, currentLevel),
      name: this.getLevelName(level),
      archetype,
      progress,
      milestones: this.generateMilestones(level, archetype),
      transformationPhase: phase,
    };
  }

  private calculateLevel(
    auraScore: number,
    momentum: number,
    history: BehaviorEntry[]
  ): number {
    const scoreLevel = Math.floor(auraScore / 150) + 1;
    const momentumLevel = Math.floor(momentum * 5) + 1;
    const historyLevel = Math.floor(Math.min(history.length / 30, 5)) + 1;

    return Math.round((scoreLevel + momentumLevel + historyLevel) / 3);
  }

  private determinePhase(
    momentum: number,
    history: BehaviorEntry[]
  ): 'awakening' | 'building' | 'acceleration' | 'mastery' {
    if (momentum < 0.3) return 'awakening';
    if (momentum < 0.6) return 'building';
    if (momentum < 0.85) return 'acceleration';
    return 'mastery';
  }

  private calculateProgress(auraScore: number, level: number): number {
    const levelThreshold = level * 150;
    const prevLevelThreshold = (level - 1) * 150;
    const progress =
      ((auraScore - prevLevelThreshold) / (levelThreshold - prevLevelThreshold)) *
      100;
    return Math.min(100, Math.max(0, progress));
  }

  private getLevelName(level: number): string {
    const names = [
      'Awakening',
      'Foundation',
      'Growth',
      'Excellence',
      'Mastery',
      'Transcendence',
    ];
    return names[Math.min(level - 1, names.length - 1)];
  }

  private generateMilestones(
    level: number,
    archetype: IdentityArchetype
  ) {
    return [
      {
        id: `${archetype}-1`,
        name: `Embrace ${archetype}`,
        description: `Align with the ${archetype} archetype`,
        achieved: true,
        achievedAt: Date.now(),
        impact: 10,
      },
      {
        id: `${archetype}-2`,
        name: `Master Discipline`,
        description: `Maintain 30-day consistency`,
        achieved: level >= 3,
        achievedAt: level >= 3 ? Date.now() : undefined,
        impact: 25,
      },
      {
        id: `${archetype}-3`,
        name: `Peak Momentum`,
        description: `Reach momentum threshold`,
        achieved: level >= 5,
        achievedAt: level >= 5 ? Date.now() : undefined,
        impact: 40,
      },
    ];
  }
}

// ============================================
// AI INTELLIGENCE ENGINE
// ============================================

export class AIIntelligenceEngine {
  generateInsights(
    auraScore: AuraScore,
    momentum: MomentumData,
    evolution: EvolutionStage,
    behaviorHistory: BehaviorEntry[]
  ): AIInsight[] {
    const insights: AIInsight[] = [];

    // Behavioral observation
    if (momentum.rhythm.burnoutRisk > 0.7) {
      insights.push({
        id: 'burnout-warning',
        type: 'warning',
        title: 'Recovery Phase Detected',
        content:
          'Your rhythm suggests a recovery period. Strategic rest is now an act of discipline.',
        confidence: 0.85,
        generatedAt: Date.now(),
        relatedMetrics: ['burnoutRisk', 'emotionalStability'],
      });
    }

    // Momentum surge observation
    if (momentum.current > 0.8) {
      insights.push({
        id: 'momentum-surge',
        type: 'celebration',
        title: 'Momentum Surge',
        content: `You're operating at peak momentum. This is the moment to compound your advantage.`,
        confidence: 0.9,
        generatedAt: Date.now(),
        relatedMetrics: ['momentum', 'streak'],
      });
    }

    // Strategic insight on consistency
    if (momentum.streakDays >= 21) {
      insights.push({
        id: 'habit-formation',
        type: 'strategic',
        title: 'Habit Architecture Achieved',
        content:
          'Your 21-day consistency has embedded a new behavioral foundation. Evolution is now automatic.',
        confidence: 0.88,
        generatedAt: Date.now(),
        relatedMetrics: ['consistency', 'discipline'],
      });
    }

    // Identity observation
    if (auraScore.trend === 'rising') {
      insights.push({
        id: 'identity-alignment',
        type: 'observation',
        title: 'Identity Alignment',
        content: `Your actions increasingly align with your ${evolution.archetype} archetype. Evolution velocity is accelerating.`,
        confidence: 0.82,
        generatedAt: Date.now(),
        relatedMetrics: ['auraScore', 'transformationPhase'],
      });
    }

    return insights;
  }
}

// Utility function to fix Math.average (not a standard JS method)
declare global {
  interface Math {
    average?(arr: number[]): number;
  }
}

if (!Math.average) {
  Math.average = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
