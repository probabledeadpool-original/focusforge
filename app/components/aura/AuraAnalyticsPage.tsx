// AURA Analytics Page - Full Premium UI

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Download, Sparkles, ArrowLeft, Activity } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useAuraStore } from '../../../hooks/useAuraStore';

import { AuraScoreDisplay } from './AuraScoreDisplay';
import { MomentumIndicator } from './MomentumIndicator';
import { EvolutionDisplay } from './EvolutionDisplay';
import { AIInsightsPanel } from './AIInsightsPanel';
import { ProgressionDisplay } from './ProgressionDisplay';
import { ShareCardDisplay } from './ShareCardDisplay';

interface AuraAnalyticsPageProps {
  isDarkMode?: boolean;
}

// ── Mini stat card ──────────────────────────────────────────────────────────
function StatPill({
  label,
  value,
  accent,
  delay = 0,
}: {
  label: string;
  value: string | number;
  accent: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="glass-panel rounded-2xl px-5 py-4 flex flex-col gap-1"
    >
      <p className="text-white/40 text-[10px] uppercase tracking-[0.15em]">{label}</p>
      <p className={`text-2xl font-light ${accent}`}>{value}</p>
    </motion.div>
  );
}

// ── Animated background orbs ────────────────────────────────────────────────
function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Deep space base */}
      <div className="absolute inset-0 bg-[#020408]" />

      {/* Primary orb – lime */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 700,
          height: 700,
          top: '-15%',
          left: '-10%',
          background:
            'radial-gradient(circle, rgba(163,230,53,0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Secondary orb – cyan */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 600,
          height: 600,
          bottom: '-20%',
          right: '-10%',
          background:
            'radial-gradient(circle, rgba(34,211,238,0.10) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{ x: [0, -40, 0], y: [0, -25, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Accent orb – purple */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 400,
          height: 400,
          top: '40%',
          left: '45%',
          background:
            'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Fine noise grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          backgroundSize: '256px',
        }}
      />
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export const AuraAnalyticsPage: React.FC<AuraAnalyticsPageProps> = ({ isDarkMode = true }) => {
  const {
    user,
    score,
    momentum,
    evolution,
    progression,
    shareCards,
    aiInsights,
    initializeUser,
    recordBehavior,
    generateShareCard,
  } = useAuraStore();

  const [ready, setReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'evolution' | 'insights' | 'share'>(
    'overview'
  );

  // Seed demo data once
  useEffect(() => {
    if (ready) return;

    initializeUser({
      id: 'demo-user',
      username: 'You',
      evolutionStage: {
        level: 1,
        name: 'Awakening',
        archetype: 'seeker',
        progress: 0,
        milestones: [],
        transformationPhase: 'awakening',
      },
      joinedAt: Date.now() - 30 * 86400_000,
      lastActive: Date.now(),
    });

    // Seed 30 days of behaviour
    for (let i = 30; i > 0; i--) {
      recordBehavior({
        date: Date.now() - i * 86400_000,
        auraScore: 430 + Math.random() * 180,
        momentum: 0.3 + Math.random() * 0.6,
        focusQuality: 0.45 + Math.random() * 0.55,
        consistencyMark: Math.random() > 0.25,
        emotionalNote: i % 7 === 0 ? 'Weekly reflection' : undefined,
        activitiesCompleted: ['deep-work', 'exercise', 'meditation'].slice(
          0,
          Math.floor(Math.random() * 3) + 1
        ),
        burnoutIndicators: Math.random() * (i < 7 ? 0.45 : 0.25),
      });
    }

    setReady(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mouse spotlight tracking
  const pageRef = useRef<HTMLDivElement>(null);
  const handleMouseMove = (e: React.MouseEvent) => {
    const cards = pageRef.current?.querySelectorAll<HTMLElement>('.glass-panel');
    cards?.forEach((card) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
      card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    });
  };

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'evolution', label: 'Evolution' },
    { key: 'insights', label: 'AI Insights' },
    { key: 'share', label: 'Share' },
  ] as const;

  return (
    <div
      ref={pageRef}
      className="relative min-h-screen text-white"
      onMouseMove={handleMouseMove}
    >
      <BackgroundOrbs />

      {/* ── HEADER (Positioned below Everything Island) ────────────────── */}
      <div className="pt-28 md:pt-32 px-4 max-w-7xl mx-auto mb-8">
        <header className="border border-white/[0.08] glass-panel rounded-3xl backdrop-blur-3xl shadow-2xl">
          <div className="glass-spotlight" />
          <div className="px-6 h-16 flex items-center justify-between">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-3"
            >
              <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-lime-400 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(163,230,53,0.4)]">
                <span className="text-black font-bold text-xs">A</span>
                <motion.div
                  className="absolute inset-0 rounded-xl bg-white/20"
                  animate={{ opacity: [0, 0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <div>
                <h1 className="text-xs font-bold tracking-[0.2em] text-white/90 uppercase">
                  AURA
                </h1>
                <p className="text-[8px] text-white/30 uppercase tracking-[0.25em]">
                  Self-Evolution OS
                </p>
              </div>
            </motion.div>

            {/* Tab Nav */}
            <motion.nav
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="hidden sm:flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] rounded-full px-1.5 py-1"
            >
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative px-3 md:px-4 py-1.5 rounded-full text-xs font-light tracking-wide transition-colors duration-200 ${
                    activeTab === tab.key
                      ? 'text-black font-medium'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  {activeTab === tab.key && (
                    <motion.div
                      layoutId="tab-pill"
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-lime-400 to-cyan-400"
                      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}
            </motion.nav>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-2"
            >
              <button
                onClick={() => generateShareCard('recap')}
                className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 text-xs rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors text-white/70 min-h-[36px]"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-9 h-9 flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors min-h-[36px] min-w-[36px]"
              >
                <Settings className="w-4 h-4 text-white/50" />
              </button>
            </motion.div>
          </div>
        </header>
      </div>

      {/* ── MAIN ────────────────────────────────────────────────────────── */}
      <main className="pt-8 pb-20 px-4 max-w-7xl mx-auto">

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mb-12 text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-lime-400/20 bg-lime-400/5 mb-6"
          >
            <Activity className="w-3.5 h-3.5 text-lime-400" />
            <span className="text-xs text-lime-300/80 tracking-wide">Live Tracking Active</span>
          </motion.div>

          <h2 className="text-5xl md:text-7xl font-extralight mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
              Self-Evolution
            </span>
            <br />
            <span className="bg-gradient-to-r from-lime-400 to-cyan-400 bg-clip-text text-transparent">
              Dashboard
            </span>
          </h2>
          <p className="text-white/40 max-w-xl mx-auto text-sm leading-relaxed">
            AURA transforms invisible effort into measurable identity. Every consistent day
            compounds into who you become.
          </p>
        </motion.section>

        {/* Quick stat pills */}
        {ready && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            <StatPill label="Aura Score" value={score.total} accent="text-white" delay={0.1} />
            <StatPill
              label="Streak"
              value={`${momentum.streakDays}d`}
              accent="text-lime-400"
              delay={0.15}
            />
            <StatPill
              label="Evolution"
              value={`Lv ${evolution.level}`}
              accent="text-cyan-400"
              delay={0.2}
            />
            <StatPill
              label="Prestige"
              value={`T${progression.currentTier}`}
              accent="text-purple-400"
              delay={0.25}
            />
          </div>
        )}

        {/* ── TAB CONTENT ─────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* Score + Momentum */}
              <div className="grid lg:grid-cols-2 gap-6">
                {ready && (
                  <AuraScoreDisplay
                    total={score.total}
                    discipline={score.discipline}
                    consistency={score.consistency}
                    focus={score.focus}
                    emotionalStability={score.emotionalStability}
                    growth={score.growth}
                    momentum={score.momentum}
                    selfRespect={score.selfRespect}
                    trend={score.trend}
                  />
                )}
                {ready && <MomentumIndicator data={momentum} />}
              </div>

              {/* System Status */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="glass-panel rounded-2xl p-6"
              >
                <div className="glass-spotlight" />
                <p className="text-white/40 text-[10px] uppercase tracking-[0.18em] mb-5">
                  System Status
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Core Systems', sub: 'All operational', color: 'bg-lime-400' },
                    { label: 'AI Engine', sub: 'Learning active', color: 'bg-lime-400' },
                    { label: 'Data Sync', sub: 'Real-time', color: 'bg-lime-400' },
                    {
                      label: 'Evolution',
                      sub: evolution.transformationPhase,
                      color: 'bg-cyan-400',
                    },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span
                        className={`w-2 h-2 rounded-full ${item.color} animate-pulse flex-shrink-0`}
                      />
                      <div>
                        <p className="text-white/70 text-sm font-light">{item.label}</p>
                        <p className="text-white/35 text-xs capitalize">{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'evolution' && (
            <motion.div
              key="evolution"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="grid lg:grid-cols-2 gap-6"
            >
              {ready && <EvolutionDisplay evolution={evolution} />}
              {ready && (
                <ProgressionDisplay currentTier={progression.currentTier} maxTier={4} />
              )}
            </motion.div>
          )}

          {activeTab === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {ready && (
                <AIInsightsPanel insights={aiInsights} isLoading={false} />
              )}
            </motion.div>
          )}

          {activeTab === 'share' && (
            <motion.div
              key="share"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* Generate buttons */}
              <div className="glass-panel rounded-2xl p-6">
                <div className="glass-spotlight" />
                <p className="text-white/40 text-[10px] uppercase tracking-[0.18em] mb-5">
                  Generate Share Card
                </p>
                <div className="flex flex-wrap gap-3">
                  {(['recap', 'transformation', 'streak', 'momentum', 'achievement'] as const).map(
                    (type) => (
                      <button
                        key={type}
                        onClick={() => generateShareCard(type)}
                        className="px-4 py-2 text-xs rounded-full border border-white/10 bg-white/[0.04] hover:bg-lime-400/10 hover:border-lime-400/30 hover:text-lime-300 transition-all capitalize text-white/60"
                      >
                        {type}
                      </button>
                    )
                  )}
                </div>
              </div>

              {ready && (
                <ShareCardDisplay
                  cards={shareCards}
                  onShare={(card) => console.log('Share:', card)}
                  onDownload={(card) => console.log('Download:', card)}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── MOBILE TAB BAR ──────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 sm:hidden z-50 border-t border-white/[0.06] glass-panel pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3.5 text-[10px] uppercase tracking-widest transition-colors min-h-[48px] flex items-center justify-center ${
                activeTab === tab.key ? 'text-lime-400 font-bold' : 'text-white/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── SETTINGS MODAL (Centered in Viewport) ──────────────────────── */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-xl"
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="relative w-full max-w-md bg-zinc-950/90 border border-white/10 glass-panel rounded-3xl p-8 shadow-2xl z-10 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-lime-400/10 border border-lime-400/30 flex items-center justify-center text-lime-400">
                    <Settings className="w-4 h-4" />
                  </div>
                  <h3 className="text-white font-heading font-bold text-lg">Aura System Settings</h3>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <p className="text-white/40 text-xs leading-relaxed font-mono">
                Configure your AURA self-evolution engine parameters, synchronization telemetry, and analytical models.
              </p>

              <div className="space-y-4">
                {[
                  { name: 'Dark Mode Protocol', desc: 'Obsidian black high-contrast OLED palette', active: true },
                  { name: 'Real-time Telemetry Sync', desc: 'Sync state across Terminal, Tasks & Hub', active: true },
                  { name: 'Gemini Deep Focus Analysis', desc: 'Autonomous pattern & burnout evaluation', active: true }
                ].map((setting) => (
                  <div key={setting.name} className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-white/90 text-xs font-bold">{setting.name}</span>
                      <span className="text-[10px] text-white/40 font-mono">{setting.desc}</span>
                    </div>
                    <div className="w-10 h-5 rounded-full bg-lime-400/20 border border-lime-400/40 relative cursor-pointer">
                      <div className="w-3.5 h-3.5 rounded-full bg-lime-400 absolute top-0.5 right-0.5 shadow-[0_0_8px_rgba(163,230,53,0.8)]" />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-lime-400 to-cyan-400 text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity shadow-lg"
              >
                Save Preferences
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuraAnalyticsPage;
