import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGuestStore } from '../store/useGuestStore';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, ArrowRight, Crown } from 'lucide-react';

const FEATURE_LABELS = {
  summarizer: 'Notes Summarizer',
  flashcards: 'Flashcards',
  code_explainer: 'Code Explainer',
  ppt_generator: 'PPT Generator',
};

const GuestBanner = () => {
  const navigate = useNavigate();
  const { isGuest, usage, limits, dismissedNudges, dismissNudge } = useGuestStore();

  if (!isGuest) return null;

  // Find features at nudge threshold (≥ 2/3) or capped (≥ 3/3)
  const nudgeFeatures = [];
  const cappedFeatures = [];

  for (const feature of Object.keys(limits)) {
    const used = usage[feature] || 0;
    const limit = limits[feature] || 3;
    if (used >= limit) {
      cappedFeatures.push(feature);
    } else if (used >= Math.ceil(limit * 2 / 3)) {
      nudgeFeatures.push(feature);
    }
  }

  // Determine which banner to show (capped takes priority)
  const showCapped = cappedFeatures.length > 0 && !cappedFeatures.every(f => dismissedNudges[`capped_${f}`]);
  const showNudge = !showCapped && nudgeFeatures.length > 0 && !nudgeFeatures.every(f => dismissedNudges[`nudge_${f}`]);

  if (!showCapped && !showNudge) return null;

  const isCapped = showCapped;
  const relevantFeatures = isCapped ? cappedFeatures : nudgeFeatures;
  const featureNames = relevantFeatures.map(f => FEATURE_LABELS[f] || f).join(', ');

  const handleDismiss = () => {
    const prefix = isCapped ? 'capped_' : 'nudge_';
    relevantFeatures.forEach(f => dismissNudge(`${prefix}${f}`));
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -20, height: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="mb-4"
      >
        <div
          className={`relative overflow-hidden rounded-xl border backdrop-blur-xl ${
            isCapped
              ? 'bg-gradient-to-r from-primary/[0.08] via-neonPurple/[0.06] to-primary/[0.08] border-primary/[0.2]'
              : 'bg-amber-500/[0.06] border-amber-500/[0.15]'
          }`}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent animate-shimmer pointer-events-none" />

          <div className="relative flex items-center gap-4 px-5 py-3.5">
            {/* Icon */}
            <motion.div
              animate={isCapped ? { rotate: [0, 5, -5, 0] } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                isCapped
                  ? 'bg-primary/[0.15] shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                  : 'bg-amber-500/[0.15]'
              }`}
            >
              {isCapped ? (
                <Crown className="w-4.5 h-4.5 text-primary" />
              ) : (
                <Sparkles className="w-4.5 h-4.5 text-amber-400" />
              )}
            </motion.div>

            {/* Message */}
            <div className="flex-1 min-w-0">
              <p className={`text-[13px] font-semibold leading-tight ${isCapped ? 'text-white' : 'text-gray-200'}`}>
                {isCapped
                  ? `You've used all free tries for ${featureNames}`
                  : "You're getting the hang of it!"}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                {isCapped
                  ? 'Sign up for a free account to unlock unlimited AI generations.'
                  : `${featureNames} — ${relevantFeatures.map(f => `${usage[f]}/${limits[f]}`).join(', ')} used. Create an account to keep going.`}
              </p>
            </div>

            {/* CTA */}
            <motion.button
              onClick={() => navigate('/auth')}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all ${
                isCapped
                  ? 'bg-primary text-white shadow-[0_4px_16px_rgba(99,102,241,0.4)] hover:bg-primary/90'
                  : 'bg-amber-500/[0.15] text-amber-400 border border-amber-500/[0.2] hover:bg-amber-500/[0.25]'
              }`}
            >
              Sign Up
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              className="shrink-0 p-1.5 rounded-md hover:bg-white/[0.06] text-gray-600 hover:text-gray-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GuestBanner;
