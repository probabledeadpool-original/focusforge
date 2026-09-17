// AURA Sidebar Widget - Fits into FocusForge navigation
// Minimal, non-intrusive, matches existing design

'use client';

import React from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { BarChart2, ArrowRight } from 'lucide-react';
import { useAuraStore } from '../../../hooks/useAuraStore';

interface AuraSidebarWidgetProps {
  className?: string;
}

export const AuraSidebarWidget: React.FC<AuraSidebarWidgetProps> = ({ className = '' }) => {
  const { score, momentum, evolution } = useAuraStore();

  // Don't show if no data yet
  if (score.total === 0) {
    return null;
  }

  return (
    <motion.div
      className={`bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-all ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="w-4 h-4 text-lime-400" />
        <span className="text-xs font-light text-white/60 uppercase tracking-wider">
          Your AURA
        </span>
      </div>

      {/* Stats Grid */}
      <div className="space-y-3">
        {/* Score */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50">Score</span>
          <span className="text-lg font-light text-lime-400">{score.total}</span>
        </div>

        {/* Momentum */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50">Momentum</span>
          <span className="text-lg font-light text-cyan-400">
            {(momentum.current * 100).toFixed(0)}%
          </span>
        </div>

        {/* Level */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50">Level</span>
          <span className="text-lg font-light text-white">{evolution.level}</span>
        </div>

        {/* Streak */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50">Streak</span>
          <span className="text-lg font-light text-purple-400">
            {momentum.streakDays}d
          </span>
        </div>
      </div>

      {/* CTA */}
      <Link
        href="/analytics"
        className="mt-4 flex items-center justify-center gap-2 w-full px-3 py-2 bg-lime-400/10 border border-lime-400/30 rounded text-white/70 hover:text-lime-300 hover:border-lime-400/50 transition-all text-xs font-light uppercase tracking-wider group"
      >
        View Full Dashboard
        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
      </Link>
    </motion.div>
  );
};

export default AuraSidebarWidget;
