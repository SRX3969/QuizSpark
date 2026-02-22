-- Add question_started_at column to game_sessions for server-synced timers
-- This allows player clients to calculate remaining time based on server timestamp

ALTER TABLE public.game_sessions
  ADD COLUMN IF NOT EXISTS question_started_at TIMESTAMPTZ;
