// AURA Core Types - Production-Ready System

export interface AuraUser {
  id: string;
  username: string;
  evolutionStage: EvolutionStage;
  joinedAt: number;
  lastActive: number;
}

export interface AuraScore {
  total: number;
  discipline: number;
  consistency: number;
  focus: number;
  emotionalStability: number;
  growth: number;
  momentum: number;
  selfRespect: number;
  lastUpdated: number;
  trend: 'rising' | 'stable' | 'declining';
}

export interface MomentumData {
  current: number;
  peak: number;
  streak: number;
  streakDays: number;
  decayRate: number;
  lastActive: number;
  rhythm: BehavioralRhythm;
  surges: MomentumSurge[];
  recoveryPhase: boolean;
}

export interface BehavioralRhythm {
  averageConsistency: number;
  peakHours: number[];
  routineStability: number;
  adaptability: number;
  burnoutRisk: number;
}

export interface MomentumSurge {
  date: number;
  magnitude: number;
  duration: number;
  trigger: string;
}

export interface EvolutionStage {
  level: number;
  name: string;
  archetype: IdentityArchetype;
  progress: number;
  milestones: EvolutionMilestone[];
  transformationPhase: 'awakening' | 'building' | 'acceleration' | 'mastery';
}

export type IdentityArchetype =
  | 'seeker'
  | 'builder'
  | 'executor'
  | 'visionary'
  | 'master'
  | 'sage';

export interface EvolutionMilestone {
  id: string;
  name: string;
  description: string;
  achieved: boolean;
  achievedAt?: number;
  impact: number;
}

export interface ProgressionTier {
  tier: number;
  name: string;
  prestige: number;
  requirements: ProgressionRequirement;
  rewards: ProgressionReward[];
  rarity: 'common' | 'rare' | 'elite' | 'legendary';
}

export interface ProgressionRequirement {
  auraScore: number;
  momentum: number;
  consistencyDays: number;
  transformationPhase: string;
}

export interface ProgressionReward {
  id: string;
  type: 'badge' | 'visual' | 'ability' | 'insight';
  name: string;
  rarity: string;
}

export interface ShareCard {
  id: string;
  type: 'recap' | 'transformation' | 'streak' | 'momentum' | 'achievement';
  title: string;
  data: Record<string, any>;
  generatedAt: number;
  visual: {
    backgroundColor: string;
    accentColor: string;
    layout: 'horizontal' | 'vertical';
  };
}

export interface BehaviorEntry {
  date: number;
  auraScore: number;
  momentum: number;
  focusQuality: number;
  consistencyMark: boolean;
  emotionalNote?: string;
  activitiesCompleted: string[];
  burnoutIndicators: number;
}

export interface AIInsight {
  id: string;
  type: 'observation' | 'strategic' | 'warning' | 'celebration';
  title: string;
  content: string;
  confidence: number;
  generatedAt: number;
  relatedMetrics: string[];
}

export interface RetentionSystem {
  comebackFactor: number;
  emotionalAttachment: number;
  progressMemory: BehaviorEntry[];
  recoveryStrength: number;
  lastComebackDate?: number;
}

export interface AuraState {
  user: AuraUser | null;
  score: AuraScore;
  momentum: MomentumData;
  evolution: EvolutionStage;
  progression: {
    currentTier: number;
    tierHistory: ProgressionTier[];
  };
  shareCards: ShareCard[];
  behaviorHistory: BehaviorEntry[];
  aiInsights: AIInsight[];
  retention: RetentionSystem;
  preferences: AuraPreferences;
}

export interface AuraPreferences {
  theme: 'midnight' | 'obsidian' | 'void';
  notificationFrequency: 'real-time' | 'daily' | 'weekly';
  sharePrivacy: 'private' | 'friends' | 'public';
  insightDepth: 'shallow' | 'medium' | 'deep';
}
