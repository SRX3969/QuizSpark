CREATE TABLE public.powerups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  powerup_type TEXT NOT NULL CHECK (powerup_type IN ('50_50', 'double_down', 'glitch')),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'used')),
  target_player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.powerups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view powerups" ON public.powerups FOR SELECT USING (true);
CREATE POLICY "Anyone can insert powerups" ON public.powerups FOR INSERT WITH CHECK (true);
CREATE POLICY "Players can update own powerups" ON public.powerups FOR UPDATE USING (true);
