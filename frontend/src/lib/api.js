import axios from 'axios';
import { supabase } from './supabase';
import { useGuestStore } from '../store/useGuestStore';

// Create a configured axios instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30s timeout for production
});

// ─── Token Cache ───────────────────────────────────────────────
// Cache the Supabase access token in memory so we don't call
// getSession() on every single request (saves ~50-200ms per call).
let _cachedToken = null;

// Bootstrap: grab the current session token immediately on load
supabase.auth.getSession().then(({ data: { session } }) => {
  _cachedToken = session?.access_token || null;
});

// Keep the cached token in sync whenever auth state changes
supabase.auth.onAuthStateChange((_event, session) => {
  _cachedToken = session?.access_token || null;
});

// ─── Request Interceptor ──────────────────────────────────────
// Synchronous — no await, no network call per request
api.interceptors.request.use(
  (config) => {
    // Priority: Supabase auth token > guest token
    if (_cachedToken) {
      config.headers.Authorization = `Bearer ${_cachedToken}`;
    } else {
      // Check for guest token in sessionStorage
      const guestToken = sessionStorage.getItem('lockin_guest_token');
      if (guestToken) {
        config.headers.Authorization = `Bearer ${guestToken}`;
      }
    }

    // Performance timing metadata
    config.metadata = { startTime: performance.now() };

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ─────────────────────────────────────
// Handles guest usage metadata sync and expired guest tokens
api.interceptors.response.use(
  (response) => {
    if (response.config?.metadata?.startTime) {
      const duration = Math.round(performance.now() - response.config.metadata.startTime);
      if (import.meta.env.DEV && duration > 500) {
        console.warn(`[API SLOW] ${response.config.method?.toUpperCase()} ${response.config.url} → ${duration}ms`);
      }
    }

    // Sync guest usage from response metadata
    const data = response.data;
    if (data && data.guest_usage) {
      const store = useGuestStore.getState();
      if (store.isGuest) {
        store.updateUsageFromResponse(data.guest_usage);
      }
    }

    return response;
  },
  async (error) => {
    // Don't handle cancelled requests
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    // Handle guest-specific errors
    const store = useGuestStore.getState();
    if (store.isGuest && error.response) {
      const status = error.response.status;
      const detail = error.response.data?.detail;

      // Guest token expired → silently re-issue
      if (status === 401 && detail === 'Guest session expired') {
        try {
          const reissueResp = await axios.post(
            `${api.defaults.baseURL}/auth/guest`,
            {},
            { timeout: 10000 }
          );
          const { guest_token, expires_at, usage, limits } = reissueResp.data;
          store.startGuestSession(guest_token, expires_at, usage, limits);

          // Retry the original request with the new token
          error.config.headers.Authorization = `Bearer ${guest_token}`;
          return api.request(error.config);
        } catch (reissueErr) {
          console.error('[Guest] Failed to re-issue guest token:', reissueErr);
          store.clearGuestSession();
          return Promise.reject(error);
        }
      }

      // Guest quota exceeded → sync usage from error detail
      if (status === 429 && detail?.error === 'guest_limit_reached') {
        if (detail.usage) {
          store.updateUsageFromResponse(detail.usage);
        }
      }
    }

    return Promise.reject(error);
  }
);
