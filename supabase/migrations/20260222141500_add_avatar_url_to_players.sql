-- Add avatar_url to players table
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS avatar_url TEXT;
