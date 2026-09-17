// AURA Identity Evolution Display Component

'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Crown, ArrowRight, CheckCircle2 } from 'lucide-react';
import { EvolutionStage, IdentityArchetype } from './types';

interface EvolutionDisplayProps {
  evolution: EvolutionStage;
}

const archetypeDescriptions: Record<IdentityArchetype, string> = {
  seeker: 'The awakened explorer discovering potential',
  builder: 'The disciplined architect constructing foundations',
  executor: 'The elite performer compounding momentum',
  visionary: 'The strategic thinker architecting evolution',
  master: 'The embodied expert transcending limits',
  sage: 'The transcendent consciousness guiding evolution',
};

const phaseColors: Record<string, string> = {
  awakening: 'from-blue-400/20 to-transparent',
  building: 'from-cyan-400/20 to-transparent',
  acceleration: 'from-lime-400/20 to-transparent',
  mastery: 'from-purple-400/20 to-transparent',
};

export const EvolutionDisplay: React.FC<EvolutionDisplayProps> = ({
  evolution,
}) => {
  const achievedMilestones = evolution.milestones.filter((m) => m.achieved);
  const nextMilestone = evolution.milestones.find((m) => !m.achieved);

  return (
    <motion.div
      className="glass-panel"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header with Level */}
      <div
        className={`bg-gradient-to-r ${phaseColors[evolution.transformationPhase]} p-8 border-b border-white/10`}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/60 text-sm uppercase tracking-wider mb-2">
              Identity Evolution
            </p>
            <h2 className="text-5xl font-light text-white flex items-center gap-3">
              Level {evolution.level}
              <Crown className="w-8 h-8 text-lime-400" />
            </h2>
          </div>
        </div>
      </div>

      {/* Current Stage and Archetype */}
      <div className="p-8 border-b border-white/10">
        <div className="mb-6">
          <p className="text-white/60 text-sm uppercase tracking-wider mb-3">
            Evolution Stage
          </p>
          <p className="text-2xl font-light text-white mb-2">
            {evolution.name}
          </p>
          <p className="text-white/40 text-sm">
            Phase: {evolution.transformationPhase.charAt(0).toUpperCase() + evolution.transformationPhase.slice(1)}
          </p>
        </div>

        <div>
          <p className="text-white/60 text-sm uppercase tracking-wider mb-3">
            Archetype
          </p>
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
            <p className="text-lg font-light text-white capitalize mb-2">
              The {evolution.archetype}
            </p>
            <p className="text-white/50 text-sm">
              {archetypeDescriptions[evolution.archetype]}
            </p>
          </div>
        </div>
      </div>

      {/* Progress to Next Level */}
      <div className="p-8 border-b border-white/10">
        <p className="text-white/60 text-sm uppercase tracking-wider mb-4">
          Progress to Level {evolution.level + 1}
        </p>

        <div className="mb-3">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-lime-400 to-cyan-400 h-full"
              initial={{ width: 0 }}
              animate={{ width: `${evolution.progress}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>

        <div className="flex justify-between items-center">
          <p className="text-white/40 text-xs">
            {evolution.progress.toFixed(0)}% of way to next evolution
          </p>
          <p className="text-lime-400 text-sm font-light">
            {(100 - evolution.progress).toFixed(0)}% remaining
          </p>
        </div>
      </div>

      {/* Milestones */}
      <div className="p-8">
        <p className="text-white/60 text-sm uppercase tracking-wider mb-6">
          Transformation Milestones
        </p>

        <div className="space-y-4">
          {evolution.milestones.map((milestone, index) => (
            <motion.div
              key={milestone.id}
              className={`p-4 border rounded-lg ${
                milestone.achieved
                  ? 'bg-lime-400/5 border-lime-400/30'
                  : 'bg-white/5 border-white/10'
              }`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {milestone.achieved ? (
                    <CheckCircle2 className="w-5 h-5 text-lime-400" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-white/20" />
                  )}
                </div>

                <div className="flex-1">
                  <p
                    className={`font-light ${
                      milestone.achieved
                        ? 'text-lime-200'
                        : 'text-white/60'
                    }`}
                  >
                    {milestone.name}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      milestone.achieved
                        ? 'text-lime-100/50'
                        : 'text-white/40'
                    }`}
                  >
                    {milestone.description}
                  </p>
                  {milestone.achieved && milestone.achievedAt && (
                    <p className="text-xs text-lime-400/60 mt-2">
                      Achieved{' '}
                      {new Date(milestone.achievedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="flex-shrink-0 text-xs font-light text-white/40">
                  +{milestone.impact}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Next Milestone */}
      {nextMilestone && (
        <div className="p-8 bg-white/5 border-t border-white/10">
          <div className="flex items-center gap-3">
            <ArrowRight className="w-5 h-5 text-lime-400" />
            <div>
              <p className="text-white/60 text-sm">Next Evolution</p>
              <p className="text-white font-light">{nextMilestone.name}</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
