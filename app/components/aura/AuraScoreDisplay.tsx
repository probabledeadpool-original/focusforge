// AURA Score Display Component

'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Flame, TrendingUp, TrendingDown } from 'lucide-react';

interface AuraScoreDisplayProps {
  total: number;
  discipline: number;
  consistency: number;
  focus: number;
  emotionalStability: number;
  growth: number;
  momentum: number;
  selfRespect: number;
  trend: 'rising' | 'stable' | 'declining';
}

export const AuraScoreDisplay: React.FC<AuraScoreDisplayProps> = ({
  total,
  discipline,
  consistency,
  focus,
  emotionalStability,
  growth,
  momentum,
  selfRespect,
  trend,
}) => {
  const metrics = [
    { label: 'Discipline', value: discipline },
    { label: 'Consistency', value: consistency },
    { label: 'Focus', value: focus },
    { label: 'Emotional Stability', value: emotionalStability },
    { label: 'Growth', value: growth },
    { label: 'Momentum', value: momentum },
    { label: 'Self-Respect', value: selfRespect },
  ];

  const trendIcon =
    trend === 'rising' ? (
      <TrendingUp className="w-4 h-4 text-lime-400" />
    ) : trend === 'declining' ? (
      <TrendingDown className="w-4 h-4 text-red-400" />
    ) : null;

  return (
    <div className="glass-panel rounded-2xl p-8">
      {/* Main Score */}
      <motion.div
        className="flex items-center justify-between mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <p className="text-white/60 text-sm uppercase tracking-wider mb-2">
            Aura Score
          </p>
          <h1 className="text-7xl font-light text-white">{total}</h1>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-lime-400" />
            <span className="text-white/80 text-sm">
              {trend === 'rising'
                ? 'Rising'
                : trend === 'declining'
                  ? 'Declining'
                  : 'Stable'}
            </span>
          </div>
          {trendIcon}
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            className="glass-panel p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.05 }}
          >
            <p className="text-white/50 text-xs uppercase tracking-wider mb-2">
              {metric.label}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-light text-white">
                {metric.value}
              </span>
              <div className="flex-1 bg-white/10 rounded-full h-1 overflow-hidden">
                <motion.div
                  className="bg-lime-400 h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(metric.value, 100)}%` }}
                  transition={{ duration: 1, delay: index * 0.1 }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom insight */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <p className="text-white/60 text-sm">
          Your AURA Score represents the convergence of discipline, consistency,
          and emotional evolution.
        </p>
      </div>
    </div>
  );
};
