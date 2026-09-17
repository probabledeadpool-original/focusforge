// AURA State Management - Production-Ready Store

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AuraState,
  AuraUser,
  AuraScore,
  MomentumData,
  EvolutionStage,
  BehaviorEntry,
  AIInsight,
  ShareCard,
} from '@/app/components/aura/types';
import {
  AuraScoreEngine,
  MomentumEngine,
  IdentityEvolutionEngine,
  AIIntelligenceEngine,
} from '@/app/components/aura/engines';

const scoreEngine = new AuraScoreEngine();
const momentumEngine = new MomentumEngine();
const evolutionEngine = new IdentityEvolutionEngine();
const aiEngine = new AIIntelligenceEngine();

interface AuraActions {
  initializeUser: (user: AuraUser) => void;
  recordBehavior: (entry: Omit<BehaviorEntry, 'date'> & { date?: number }) => void;
  updateScore: () => void;
  generateInsights: () => void;
  generateShareCard: (type: ShareCard['type']) => void;
  markMilestone: (milestoneId: string) => void;
  setPreference: (key: string, value: any) => void;
}

type AuraStoreState = AuraState & AuraActions;

const initialState: AuraState = {
  user: null,
  score: {
    total: 500,
    discipline: 50,
    consistency: 50,
    focus: 50,
    emotionalStability: 50,
    growth: 50,
    momentum: 50,
    selfRespect: 50,
    lastUpdated: Date.now(),
    trend: 'stable',
  },
  momentum: {
    current: 0,
    peak: 0,
    streak: 0,
    streakDays: 0,
    decayRate: 0.02,
    lastActive: Date.now(),
    rhythm: {
      averageConsistency: 0,
      peakHours: [],
      routineStability: 0,
      adaptability: 0,
      burnoutRisk: 0,
    },
    surges: [],
    recoveryPhase: false,
  },
  evolution: {
    level: 1,
    name: 'Awakening',
    archetype: 'seeker',
    progress: 0,
    milestones: [],
    transformationPhase: 'awakening',
  },
  progression: {
    currentTier: 0,
    tierHistory: [],
  },
  shareCards: [],
  behaviorHistory: [],
  aiInsights: [],
  retention: {
    comebackFactor: 0,
    emotionalAttachment: 0,
    progressMemory: [],
    recoveryStrength: 0,
  },
  preferences: {
    theme: 'midnight',
    notificationFrequency: 'daily',
    sharePrivacy: 'friends',
    insightDepth: 'medium',
  },
};

export const useAuraStore = create<AuraStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      initializeUser: (user: AuraUser) => {
        set({ user });
      },

      recordBehavior: (entry: Omit<BehaviorEntry, 'date'> & { date?: number }) => {
        set((state) => {
          const newEntry: BehaviorEntry = {
            ...entry,
            date: entry.date ?? Date.now(),
          };

          const updatedHistory = [...state.behaviorHistory, newEntry].slice(-365); // Keep last year

          return {
            behaviorHistory: updatedHistory,
          };
        });

        // Recalculate scores after recording behavior
        get().updateScore();
      },

      updateScore: () => {
        set((state) => {
          const consistency =
            state.behaviorHistory.filter((e) => e.consistencyMark).length /
            Math.max(1, state.behaviorHistory.length);

          const focusQuality =
            state.behaviorHistory.reduce((sum, e) => sum + e.focusQuality, 0) /
            Math.max(1, state.behaviorHistory.length);

          const emotionalStability =
            1 -
            (state.behaviorHistory.reduce((sum, e) => sum + (e.burnoutIndicators || 0), 0) /
              Math.max(1, state.behaviorHistory.length));

          const newScore = scoreEngine.calculateScore(
            state.behaviorHistory,
            state.momentum.current,
            consistency,
            focusQuality,
            emotionalStability
          );

          const rhythm = momentumEngine.analyzeBehavioralRhythm(
            state.behaviorHistory
          );

          const momentumData = momentumEngine.calculateMomentum(
            state.behaviorHistory,
            consistency,
            rhythm
          );

          // Detect momentum surges
          const surges = state.momentum.surges || [];
          if (momentumData.current > state.momentum.peak * 0.95 && state.momentum.peak > 0) {
            surges.push({
              date: Date.now(),
              magnitude: momentumData.current,
              duration: 0,
              trigger: 'detected',
            });
          }

          const evolution = evolutionEngine.determineEvolutionStage(
            newScore.total,
            momentumData.current,
            state.behaviorHistory,
            state.evolution.level
          );

          const newMomentum: MomentumData = {
            ...momentumData,
            surges: surges.slice(-20), // Keep last 20 surges
          };

          return {
            score: newScore,
            momentum: newMomentum,
            evolution,
          };
        });

        // Generate new insights after score update
        get().generateInsights();
      },

      generateInsights: () => {
        set((state) => {
          const insights = aiEngine.generateInsights(
            state.score,
            state.momentum,
            state.evolution,
            state.behaviorHistory
          );

          return {
            aiInsights: insights,
          };
        });
      },

      generateShareCard: (type: ShareCard['type']) => {
        set((state) => {
          const cardData = (() => {
            switch (type) {
              case 'recap':
                return {
                  title: `Weekly Recap: Level ${state.evolution.level}`,
                  auraScore: state.score.total,
                  momentum: state.momentum.current,
                  streak: state.momentum.streakDays,
                  phase: state.evolution.transformationPhase,
                };
              case 'transformation':
                return {
                  title: `Evolution: ${state.evolution.name}`,
                  level: state.evolution.level,
                  archetype: state.evolution.archetype,
                  progress: state.evolution.progress,
                };
              case 'streak':
                return {
                  title: `${state.momentum.streakDays}-Day Momentum`,
                  days: state.momentum.streakDays,
                  peak: state.momentum.peak,
                };
              case 'momentum':
                return {
                  title: 'Peak Momentum Achieved',
                  current: state.momentum.current,
                  trend: state.score.trend,
                };
              case 'achievement':
                return {
                  title: 'Milestone Achieved',
                  milestones: state.evolution.milestones.filter(
                    (m) => m.achieved
                  ),
                };
              default:
                return {};
            }
          })();

          const card: ShareCard = {
            id: `card-${Date.now()}`,
            type,
            title: cardData.title || 'AURA Progress',
            data: cardData,
            generatedAt: Date.now(),
            visual: {
              backgroundColor: '#000000',
              accentColor: '#00FF00',
              layout: 'vertical',
            },
          };

          return {
            shareCards: [...state.shareCards, card].slice(-10), // Keep last 10
          };
        });
      },

      markMilestone: (milestoneId: string) => {
        set((state) => ({
          evolution: {
            ...state.evolution,
            milestones: state.evolution.milestones.map((m) =>
              m.id === milestoneId
                ? { ...m, achieved: true, achievedAt: Date.now() }
                : m
            ),
          },
        }));
      },

      setPreference: (key: string, value: any) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            [key]: value,
          },
        }));
      },
    }),
    {
      name: 'aura-store',
      version: 1,
    }
  )
);
