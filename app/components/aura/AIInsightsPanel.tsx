// AURA AI Intelligence Layer Component

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Lightbulb, AlertTriangle, Award } from 'lucide-react';
import { AIInsight } from './types';

interface AIInsightsPanelProps {
  insights: AIInsight[];
  isLoading?: boolean;
}

const insightIcons: Record<AIInsight['type'], React.ReactNode> = {
  observation: <Brain className="w-5 h-5" />,
  strategic: <Lightbulb className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
  celebration: <Award className="w-5 h-5" />,
};

const insightColors: Record<AIInsight['type'], string> = {
  observation: 'border-blue-400/30 bg-blue-400/5 text-blue-100',
  strategic: 'border-cyan-400/30 bg-cyan-400/5 text-cyan-100',
  warning: 'border-yellow-400/30 bg-yellow-400/5 text-yellow-100',
  celebration: 'border-lime-400/30 bg-lime-400/5 text-lime-100',
};

const iconColors: Record<AIInsight['type'], string> = {
  observation: 'text-blue-400',
  strategic: 'text-cyan-400',
  warning: 'text-yellow-400',
  celebration: 'text-lime-400',
};

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  insights,
  isLoading,
}) => {
  return (
    <motion.div
      className="glass-panel rounded-2xl p-8"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Brain className="w-6 h-6 text-purple-400" />
        <div>
          <p className="text-white/60 text-sm uppercase tracking-wider">
            AI Intelligence
          </p>
          <p className="text-white text-lg font-light">Behavioral Insights</p>
        </div>
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-white/40 text-sm text-center py-8"
            >
              Analyzing behavioral patterns...
            </motion.div>
          ) : insights.length > 0 ? (
            insights.map((insight, index) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`p-4 border rounded-lg ${insightColors[insight.type]} group hover:border-opacity-100 transition-all cursor-pointer`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className={`flex-shrink-0 mt-1 ${iconColors[insight.type]}`}
                  >
                    {insightIcons[insight.type]}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-light text-sm group-hover:text-white/80 transition-colors">
                        {insight.title}
                      </h3>
                      <span className="text-xs opacity-75">
                        {(insight.confidence * 100).toFixed(0)}%
                      </span>
                    </div>

                    <p className="text-xs opacity-80 leading-relaxed mb-3">
                      {insight.content}
                    </p>

                    {/* Related Metrics */}
                    <div className="flex flex-wrap gap-2">
                      {insight.relatedMetrics.map((metric) => (
                        <span
                          key={metric}
                          className="inline-flex items-center px-2 py-1 rounded text-xs bg-white/10 text-white/60 font-mono"
                        >
                          {metric}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="flex-shrink-0 text-xs opacity-60">
                    {new Date(insight.generatedAt).toLocaleTimeString()}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-white/40 text-sm text-center py-8"
            >
              No insights available yet. Continue building momentum to unlock
              behavioral analysis.
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Statement */}
      <div className="mt-8 pt-8 border-t border-white/10">
        <p className="text-white/50 text-xs italic">
          "Behavioral patterns emerge from consistency. Your AURA analyzes
          discipline rhythm, emotional cycles, and evolution velocity. All
          insights are strategic observations, not predictions."
        </p>
      </div>
    </motion.div>
  );
};
