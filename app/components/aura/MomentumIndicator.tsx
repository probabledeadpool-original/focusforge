// AURA Momentum Engine Display Component

'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { MomentumData } from './types';

interface MomentumIndicatorProps {
  data: MomentumData;
}

export const MomentumIndicator: React.FC<MomentumIndicatorProps> = ({ data }) => {
  const isRecovering = data.recoveryPhase;
  const isSurging = data.current > 0.8;

  return (
    <motion.div
      className="glass-panel p-8"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-white/60 text-sm uppercase tracking-wider mb-2">
            Momentum Engine
          </p>
          <h2 className="text-4xl font-light text-white">
            {(data.current * 100).toFixed(0)}%
          </h2>
        </div>
        <Zap className="w-8 h-8 text-lime-400" />
      </div>

      {/* Visual Progress Bar */}
      <div className="mb-8">
        <div className="relative h-12 bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          <motion.div
            className={`absolute inset-0 flex items-center justify-center text-white font-light ${
              isSurging ? 'bg-gradient-to-r from-lime-400/30 to-transparent' : 'bg-white/5'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${data.current * 100}%` }}
            transition={{ duration: 1 }}
          >
            <span className="text-sm absolute right-4">
              {data.streakDays}d streak
            </span>
          </motion.div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-white/50 text-xs uppercase tracking-wider mb-2">
            Streak
          </p>
          <p className="text-2xl font-light text-lime-400">{data.streakDays}</p>
          <p className="text-white/40 text-xs mt-1">days consistent</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-white/50 text-xs uppercase tracking-wider mb-2">
            Peak
          </p>
          <p className="text-2xl font-light text-white">
            {(data.peak * 100).toFixed(0)}%
          </p>
          <p className="text-white/40 text-xs mt-1">personal best</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-white/50 text-xs uppercase tracking-wider mb-2">
            Stability
          </p>
          <p className="text-2xl font-light text-white">
            {(data.rhythm.routineStability * 100).toFixed(0)}%
          </p>
          <p className="text-white/40 text-xs mt-1">routine foundation</p>
        </div>
      </div>

      {/* Behavioral Rhythm Analysis */}
      <div className="space-y-4 mb-8 p-4 bg-white/5 border border-white/10 rounded-lg">
        <p className="text-white/60 text-sm uppercase tracking-wider">
          Behavioral Rhythm
        </p>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-white/60 text-xs">Consistency</span>
              <span className="text-lime-400 text-xs">
                {(data.rhythm.averageConsistency * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="bg-lime-400 h-full"
                initial={{ width: 0 }}
                animate={{ width: `${data.rhythm.averageConsistency * 100}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-white/60 text-xs">Adaptability</span>
              <span className="text-blue-400 text-xs">
                {(data.rhythm.adaptability * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="bg-blue-400 h-full"
                initial={{ width: 0 }}
                animate={{ width: `${data.rhythm.adaptability * 100}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-white/60 text-xs">Burnout Risk</span>
              <span className="text-red-400 text-xs">
                {(data.rhythm.burnoutRisk * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="bg-red-400 h-full"
                initial={{ width: 0 }}
                animate={{ width: `${data.rhythm.burnoutRisk * 100}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status Alert */}
      <div
        className={`p-4 rounded-lg border flex items-start gap-3 ${isRecovering ? 'bg-yellow-400/10 border-yellow-400/30' : isSurging ? 'bg-lime-400/10 border-lime-400/30' : 'bg-white/5 border-white/10'}`}
      >
        {isRecovering ? (
          <>
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-100 text-sm font-medium">
                Recovery Phase Active
              </p>
              <p className="text-yellow-100/60 text-xs mt-1">
                Strategic rest is now discipline. Protect your foundation.
              </p>
            </div>
          </>
        ) : isSurging ? (
          <>
            <CheckCircle className="w-5 h-5 text-lime-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-lime-100 text-sm font-medium">
                Momentum Surge Detected
              </p>
              <p className="text-lime-100/60 text-xs mt-1">
                You're operating at peak performance. Compound your advantage.
              </p>
            </div>
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5 text-white/40 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white/60 text-sm font-medium">
                Building Momentum
              </p>
              <p className="text-white/40 text-xs mt-1">
                Consistency creates acceleration. Stay the course.
              </p>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};
