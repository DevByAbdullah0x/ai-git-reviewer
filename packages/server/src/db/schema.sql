-- AI Git Reviewer: Supabase Persistent Storage Schema
-- Run this script in your Supabase project's SQL Editor (https://supabase.com/dashboard/project/_/sql)

CREATE TABLE IF NOT EXISTS reviewer_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE reviewer_state ENABLE ROW LEVEL SECURITY;

-- Note: The server uses the Supabase Service Role Key which automatically
-- bypasses Row Level Security. If using an anon key with custom policies,
-- you can uncomment the policy below:
--
-- CREATE POLICY "Allow service and authenticated access to reviewer_state"
--   ON reviewer_state
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);

