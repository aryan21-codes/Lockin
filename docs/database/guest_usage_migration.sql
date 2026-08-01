-- ============================================================
-- Guest Usage Tracking Table
-- Tracks per-feature usage for unauthenticated guest users.
-- Dual-layer: guest_id (primary) + ip_hash (backstop).
-- ============================================================

CREATE TABLE IF NOT EXISTS guest_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL,
  ip_hash TEXT NOT NULL,
  feature TEXT NOT NULL CHECK (feature IN ('summarizer', 'flashcards', 'code_explainer', 'ppt_generator')),
  use_count INT NOT NULL DEFAULT 0,
  first_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (guest_id, feature)
);

-- Index for IP-hash backstop queries (check total usage across guest_ids per IP)
CREATE INDEX IF NOT EXISTS idx_guest_usage_ip_feature ON guest_usage (ip_hash, feature);

-- Index for cleanup job (delete expired rows efficiently)
CREATE INDEX IF NOT EXISTS idx_guest_usage_last_used ON guest_usage (last_used_at);

-- ============================================================
-- Cleanup: Delete guest_usage rows older than 48 hours
-- Run this manually, via a cron job, or as a Supabase Edge Function.
-- ============================================================
-- DELETE FROM guest_usage WHERE last_used_at < now() - INTERVAL '48 hours';

-- ============================================================
-- Optional: pg_cron auto-cleanup (if pg_cron extension is enabled)
-- Uncomment the following to schedule automatic cleanup every 6 hours:
-- ============================================================
-- SELECT cron.schedule(
--   'cleanup-guest-usage',
--   '0 */6 * * *',
--   $$DELETE FROM guest_usage WHERE last_used_at < now() - INTERVAL '48 hours'$$
-- );

-- ============================================================
-- RLS Policy: Disable RLS on this table (service-level only)
-- Guest usage is managed by the backend, not by individual users.
-- ============================================================
ALTER TABLE guest_usage ENABLE ROW LEVEL SECURITY;

-- Allow the service role full access
CREATE POLICY "Service role full access on guest_usage"
  ON guest_usage
  FOR ALL
  USING (true)
  WITH CHECK (true);
