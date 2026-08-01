import { create } from 'zustand';

const GUEST_TOKEN_KEY = 'lockin_guest_token';
const GUEST_EXPIRES_KEY = 'lockin_guest_expires';

/**
 * Guest mode Zustand store.
 * 
 * - Token stored in sessionStorage (cleared on tab close — desired)
 * - Usage synced from server responses (never trusted client-side alone)
 * - Cleared on successful signup/login transition
 */
export const useGuestStore = create((set, get) => ({
  isGuest: !!sessionStorage.getItem(GUEST_TOKEN_KEY),
  guestToken: sessionStorage.getItem(GUEST_TOKEN_KEY) || null,
  expiresAt: sessionStorage.getItem(GUEST_EXPIRES_KEY) || null,
  usage: {
    summarizer: 0,
    flashcards: 0,
    code_explainer: 0,
    ppt_generator: 0,
  },
  limits: {
    summarizer: 3,
    flashcards: 3,
    code_explainer: 3,
    ppt_generator: 3,
  },
  // Track which features have had their nudge banner dismissed
  dismissedNudges: {},

  // ─── Actions ─────────────────────────────────────────────

  startGuestSession: (token, expiresAt, usage, limits) => {
    sessionStorage.setItem(GUEST_TOKEN_KEY, token);
    sessionStorage.setItem(GUEST_EXPIRES_KEY, expiresAt);
    set({
      isGuest: true,
      guestToken: token,
      expiresAt,
      usage: usage || get().usage,
      limits: limits || get().limits,
      dismissedNudges: {},
    });
  },

  updateUsage: (feature, newCount) => {
    set((state) => ({
      usage: {
        ...state.usage,
        [feature]: newCount,
      },
    }));
  },

  updateUsageFromResponse: (guestUsage) => {
    if (!guestUsage || typeof guestUsage !== 'object') return;
    set((state) => ({
      usage: {
        ...state.usage,
        ...guestUsage,
      },
    }));
  },

  dismissNudge: (feature) => {
    set((state) => ({
      dismissedNudges: {
        ...state.dismissedNudges,
        [feature]: true,
      },
    }));
  },

  clearGuestSession: () => {
    sessionStorage.removeItem(GUEST_TOKEN_KEY);
    sessionStorage.removeItem(GUEST_EXPIRES_KEY);
    set({
      isGuest: false,
      guestToken: null,
      expiresAt: null,
      usage: {
        summarizer: 0,
        flashcards: 0,
        code_explainer: 0,
        ppt_generator: 0,
      },
      dismissedNudges: {},
    });
  },

  // ─── Computed-like helpers ─────────────────────────────────

  /** Returns the highest usage ratio across all features (0.0 - 1.0) */
  getMaxUsageRatio: () => {
    const { usage, limits } = get();
    let maxRatio = 0;
    for (const feature of Object.keys(limits)) {
      const ratio = (usage[feature] || 0) / (limits[feature] || 3);
      if (ratio > maxRatio) maxRatio = ratio;
    }
    return maxRatio;
  },

  /** Returns features that have hit the cap */
  getCappedFeatures: () => {
    const { usage, limits } = get();
    return Object.keys(limits).filter(
      (f) => (usage[f] || 0) >= (limits[f] || 3)
    );
  },

  /** Returns features at 2/3 (nudge threshold) */
  getNudgeFeatures: () => {
    const { usage, limits } = get();
    return Object.keys(limits).filter(
      (f) => (usage[f] || 0) >= Math.ceil((limits[f] || 3) * 2 / 3)
    );
  },
}));
