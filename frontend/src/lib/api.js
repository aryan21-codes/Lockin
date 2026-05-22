import axios from 'axios';
import { supabase } from './supabase';

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
    // Attach cached token
    if (_cachedToken) {
      config.headers.Authorization = `Bearer ${_cachedToken}`;
    }

    // Performance timing metadata
    config.metadata = { startTime: performance.now() };

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ─────────────────────────────────────
// Log slow requests in development
api.interceptors.response.use(
  (response) => {
    if (response.config?.metadata?.startTime) {
      const duration = Math.round(performance.now() - response.config.metadata.startTime);
      if (import.meta.env.DEV && duration > 500) {
        console.warn(`[API SLOW] ${response.config.method?.toUpperCase()} ${response.config.url} → ${duration}ms`);
      }
    }
    return response;
  },
  (error) => {
    // Don't log cancelled requests
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);
