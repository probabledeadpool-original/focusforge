// AURA Analytics Panel - Lightweight Integration for FocusForge
// Integrates AURA into existing UI without changing design

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Zap, Award, BarChart2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuraStore } from '../../../hooks/useAuraStore';

interface AuraAnalyticsPanelProps {
  compact?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export const AuraAnalyticsPanel: React.FC<AuraAnalyticsPanelProps> = ({
  compact = true,
  collapsed: initialCollapsed = true,
  onCollapsedChange,
}) => {
  const { score, momentum, evolution, aiInsights } = useAuraStore();
  const [isCollapsed, setIsCollapsed] = React.useState(initialCollapsed);

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
    onCollapsedChange?.(!isCollapsed);
  };

  if (compact && score.total === 0) {
    return null; // Don't show if no data
  }

  const trendIcon = score.trend === 'rising' ? '↑' : score.trend === 'declining' ? '↓' : '→';
  const trendColor =
    score.trend === 'rising'
      ? 'text-lime-400'
      : score.trend === 'declining'
        ? 'text-red-400'
        : 'text-white/40';

  return (
    <motion.div
      className={`${compact ? 'bg-zinc-900/50 border border-white/5' : 'bg-zinc-900 border border-white/10'} rounded-lg backdrop-blur-sm overflow-hidden`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header - Always Visible */}
      <button
        onClick={handleToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-lime-400" />
            <span className="text-sm font-light text-white uppercase tracking-wider">
              AURA
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xl font-light text-white">{score.total}</span>
            <span className={`text-xs font-light ${trendColor}`}>
              {trendIcon}
            </span>
          </div>
        </div>

        {!compact && (
          <div className="text-white/40">
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </div>
        )}
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-white/5 overflow-hidden"
          >
            <div className={`${compact ? 'p-3 space-y-3' : 'p-4 space-y-4'}`}>
              {/* Momentum */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-white/60 uppercase tracking-wider">
                    Momentum
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-light text-white">
                    {(momentum.current * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-white/40">
                    {momentum.streakDays}d streak
                  </div>
                </div>
              </div>

              {/* Evolution */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-white/60 uppercase tracking-wider">
                    Level
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-light text-white">
                    {evolution.level}
                  </div>
                  <div className="text-xs text-white/40 capitalize">
                    {evolution.archetype}
                  </div>
                </div>
              </div>

              {/* Top Metric */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-lime-400" />
                  <span className="text-xs text-white/60 uppercase tracking-wider">
                    Discipline
                  </span>
                </div>
                <div className="text-sm font-light text-white">
                  {score.discipline}
                </div>
              </div>

              {/* AI Insight (if available) */}
              {aiInsights.length > 0 && (
                <div className="pt-3 border-t border-white/5">
                  <div className="text-xs text-white/40 mb-2 uppercase tracking-wider">
                    Insight
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed">
                    {aiInsights[0].content.substring(0, 80)}...
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AuraAnalyticsPanel;
