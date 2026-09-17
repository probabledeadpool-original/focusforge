// AURA Share Engine - Cinematic Share Cards Component

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, Download, Sparkles } from 'lucide-react';
import { ShareCard } from './types';

interface ShareCardDisplayProps {
  cards: ShareCard[];
  onShare?: (card: ShareCard) => void;
  onDownload?: (card: ShareCard) => void;
}

export const ShareCardDisplay: React.FC<ShareCardDisplayProps> = ({
  cards,
  onShare,
  onDownload,
}) => {
  const [selectedCard, setSelectedCard] = React.useState<ShareCard | null>(
    cards[0] || null
  );

  const getCardTitle = (type: ShareCard['type']): string => {
    const titles: Record<ShareCard['type'], string> = {
      recap: 'Weekly Recap',
      transformation: 'Evolution Report',
      streak: 'Momentum Streak',
      momentum: 'Peak Performance',
      achievement: 'Milestone Achievement',
    };
    return titles[type];
  };

  const getCardDescription = (card: ShareCard): string => {
    const data = card.data;
    switch (card.type) {
      case 'recap':
        return `Level ${data.level} • ${data.streak} day streak • ${data.phase} phase`;
      case 'transformation':
        return `Evolved to ${data.archetype} archetype • ${data.progress.toFixed(0)}% progress`;
      case 'streak':
        return `${data.days} consecutive days • Peak: ${(data.peak * 100).toFixed(0)}%`;
      case 'momentum':
        return `${(data.current * 100).toFixed(0)}% momentum • Trend: ${data.trend}`;
      case 'achievement':
        return `${data.milestones.length} milestones unlocked`;
      default:
        return 'AURA Progress Report';
    }
  };

  return (
    <motion.div
      className="glass-panel rounded-2xl p-8"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Share2 className="w-6 h-6 text-cyan-400" />
        <div>
          <p className="text-white/60 text-sm uppercase tracking-wider">
            Share Engine
          </p>
          <p className="text-white text-lg font-light">
            Cinematic Share Cards
          </p>
        </div>
      </div>

      {/* Main Card Preview */}
      {selectedCard ? (
        <motion.div
          key={selectedCard.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="mb-8"
        >
          <div
            className={`relative bg-gradient-to-br ${selectedCard.visual.backgroundColor === '#000000' ? 'from-black to-black' : 'from-gray-900 to-black'} border border-white/10 rounded-lg overflow-hidden h-80`}
          >
            {/* Accent Glow */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                background: `radial-gradient(circle at top right, ${selectedCard.visual.accentColor}, transparent)`,
              }}
            />

            {/* Content */}
            <div className="relative h-full flex flex-col justify-between p-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5" style={{ color: selectedCard.visual.accentColor }} />
                  <span
                    className="text-xs uppercase tracking-wider font-light"
                    style={{ color: selectedCard.visual.accentColor }}
                  >
                    {getCardTitle(selectedCard.type)}
                  </span>
                </div>

                <h2 className="text-3xl font-light text-white mb-4 leading-tight">
                  {selectedCard.title}
                </h2>

                <p className="text-white/60 text-sm">
                  {getCardDescription(selectedCard)}
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>AURA</span>
                <span>
                  {new Date(selectedCard.generatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="mb-8 h-80 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-white/40">
          No share cards available yet
        </div>
      )}

      {/* Card Actions */}
      {selectedCard && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3 mb-8"
        >
          <button
            onClick={() => onShare?.(selectedCard)}
            className="flex-1 px-4 py-3 bg-lime-400/10 border border-lime-400/30 rounded-lg text-lime-100 text-sm font-light hover:bg-lime-400/20 transition-colors flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share to Socials
          </button>

          <button
            onClick={() => onDownload?.(selectedCard)}
            className="flex-1 px-4 py-3 bg-cyan-400/10 border border-cyan-400/30 rounded-lg text-cyan-100 text-sm font-light hover:bg-cyan-400/20 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Image
          </button>
        </motion.div>
      )}

      {/* Card Gallery */}
      <div>
        <p className="text-white/60 text-xs uppercase tracking-wider mb-3">
          Recent Cards ({cards.length})
        </p>

        <div className="grid grid-cols-2 gap-3">
          <AnimatePresence>
            {cards.slice(-6).map((card, index) => (
              <motion.button
                key={card.id}
                onClick={() => setSelectedCard(card)}
                className={`p-3 border rounded-lg text-left transition-all ${
                  selectedCard?.id === card.id
                    ? 'bg-white/10 border-white/30'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
              >
                <p className="text-xs uppercase tracking-wider text-white/60 mb-1">
                  {getCardTitle(card.type)}
                </p>
                <p className="text-xs font-light text-white truncate">
                  {card.title}
                </p>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Info */}
      <div className="mt-8 pt-8 border-t border-white/10">
        <p className="text-white/50 text-xs">
          Share cards transform personal growth into aesthetic social proof. They
          communicate discipline, evolution, and momentum without being social
          media. They're designed to be screenshot-worthy.
        </p>
      </div>
    </motion.div>
  );
};
