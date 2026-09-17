// AURA Progression & Prestige System Component

'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Crown, Sparkles, Lock } from 'lucide-react';

interface ProgressionTier {
  tier: number;
  name: string;
  prestige: number;
  rarity: 'common' | 'rare' | 'elite' | 'legendary';
}

interface ProgressionDisplayProps {
  currentTier: number;
  maxTier: number;
}

const rarityColors: Record<string, { border: string; bg: string; text: string }> = {
  common: {
    border: 'border-white/20',
    bg: 'bg-white/5',
    text: 'text-white/60',
  },
  rare: {
    border: 'border-blue-400/30',
    bg: 'bg-blue-400/5',
    text: 'text-blue-100',
  },
  elite: {
    border: 'border-lime-400/30',
    bg: 'bg-lime-400/5',
    text: 'text-lime-100',
  },
  legendary: {
    border: 'border-purple-400/30',
    bg: 'bg-purple-400/5',
    text: 'text-purple-100',
  },
};

const getTiers = (): ProgressionTier[] => [
  { tier: 1, name: 'Awakened', prestige: 100, rarity: 'common' },
  { tier: 2, name: 'Disciplined', prestige: 250, rarity: 'rare' },
  { tier: 3, name: 'Accelerating', prestige: 500, rarity: 'elite' },
  { tier: 4, name: 'Transcendent', prestige: 1000, rarity: 'legendary' },
];

export const ProgressionDisplay: React.FC<ProgressionDisplayProps> = ({
  currentTier,
  maxTier = 4,
}) => {
  const tiers = getTiers().slice(0, maxTier);

  return (
    <motion.div
      className="glass-panel rounded-2xl p-8"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Crown className="w-6 h-6 text-lime-400" />
        <div>
          <p className="text-white/60 text-sm uppercase tracking-wider">
            Progression & Prestige
          </p>
          <p className="text-white text-lg font-light">Elite Tier System</p>
        </div>
      </div>

      {/* Tier Progression */}
      <div className="space-y-3 mb-8">
        {tiers.map((tier, index) => {
          const isUnlocked = currentTier >= tier.tier;
          const isCurrent = currentTier === tier.tier;
          const colors = rarityColors[tier.rarity];

          return (
            <motion.div
              key={tier.tier}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative p-4 border rounded-lg transition-all ${
                isUnlocked ? colors.border : 'border-white/10'
              } ${isUnlocked ? colors.bg : 'bg-white/5'}`}
            >
              {/* Locked Overlay */}
              {!isUnlocked && (
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent rounded-lg flex items-center justify-end pr-4">
                  <Lock className="w-4 h-4 text-white/40" />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-sm font-light uppercase tracking-wider ${
                        isUnlocked ? colors.text : 'text-white/40'
                      }`}
                    >
                      Tier {tier.tier}
                    </span>
                    {isCurrent && (
                      <Sparkles className="w-4 h-4 text-lime-400 animate-pulse" />
                    )}
                  </div>

                  <p
                    className={`text-lg font-light ${
                      isUnlocked ? colors.text : 'text-white/40'
                    }`}
                  >
                    {tier.name}
                  </p>

                  <p className="text-xs mt-2 text-white/40">
                    {tier.prestige} prestige points
                  </p>
                </div>

                {/* Rarity Badge */}
                <div
                  className={`text-right ${
                    isUnlocked ? colors.text : 'text-white/40'
                  }`}
                >
                  <p className="text-xs uppercase tracking-wider font-light">
                    {tier.rarity}
                  </p>
                  {isCurrent && (
                    <p className="text-xs text-lime-400 mt-1">
                      Current Tier
                    </p>
                  )}
                </div>
              </div>

              {/* Progress Bar (for current tier) */}
              {isCurrent && index < tiers.length - 1 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="bg-gradient-to-r from-lime-400 to-cyan-400 h-full"
                      initial={{ width: '0%' }}
                      animate={{ width: '45%' }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                  <p className="text-xs text-white/40 mt-2">
                    45% to next tier
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Tier Benefits */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <p className="text-white/60 text-xs uppercase tracking-wider mb-3">
          Current Tier Benefits
        </p>

        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-white/50 text-xs">
            <span className="text-lime-400 mt-1">•</span>
            <span>Elite prestige signaling in social share cards</span>
          </li>
          <li className="flex items-start gap-2 text-white/50 text-xs">
            <span className="text-lime-400 mt-1">•</span>
            <span>Advanced AI behavioral analysis depth</span>
          </li>
          <li className="flex items-start gap-2 text-white/50 text-xs">
            <span className="text-lime-400 mt-1">•</span>
            <span>Exclusive evolution milestones unlocked</span>
          </li>
          <li className="flex items-start gap-2 text-white/50 text-xs">
            <span className="text-lime-400 mt-1">•</span>
            <span>Enhanced momentum tracking accuracy</span>
          </li>
        </ul>
      </div>
    </motion.div>
  );
};
