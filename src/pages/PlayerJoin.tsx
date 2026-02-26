import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AnimatedBackground from '@/components/AnimatedBackground';
import Logo from '@/components/Logo';
import { Zap, ArrowRight, Sparkles } from 'lucide-react';
import AvatarSelector from '@/components/AvatarSelector';

import { ThemeToggle } from '@/components/ThemeToggle';

const PlayerJoin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const pinParam = searchParams.get('pin');
    if (pinParam && /^\d{6}$/.test(pinParam)) {
      setPin(pinParam);
    }
  }, [searchParams]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Please enter your name'); return; }
    if (pin.length !== 6) { setError('PIN must be 6 digits'); return; }
    if (!/^\d{6}$/.test(pin)) { setError('PIN must contain only numbers'); return; }

    setLoading(true);

    const { data: session, error: sessionErr } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('game_pin', pin)
      .in('status', ['waiting', 'question', 'leaderboard'])
      .single();

    if (sessionErr || !session) {
      setError('Game not found. Check your PIN and try again.');
      setLoading(false);
      return;
    }

    const { data: existingPlayer } = await supabase
      .from('players')
      .select('id')
      .eq('session_id', session.id)
      .eq('name', name.trim())
      .single();

    if (existingPlayer) {
      setError('That name is already taken in this game. Choose another!');
      setLoading(false);
      return;
    }

    const playerData = {
      session_id: session.id,
      name: name.trim(),
      score: 0,
      avatar_url: selectedAvatar
    };

    let { data: player, error: playerErr } = await supabase
      .from('players')
      .insert(playerData)
      .select()
      .single();

    // Fallback if avatar_url column doesn't exist (common issue if host hasn't migrated)
    if (playerErr && playerErr.code === '42703') {
      console.warn("Avatar column missing, falling back to basic insert");
      const { avatar_url, ...basicPlayerData } = playerData;
      const { data: fallbackPlayer, error: fallbackErr } = await supabase
        .from('players')
        .insert(basicPlayerData)
        .select()
        .single();

      player = fallbackPlayer;
      playerErr = fallbackErr;
    }

    if (playerErr || !player) {
      console.error("Join error:", playerErr);
      setError('Failed to join game. Please try again.');
      setLoading(false);
      return;
    }

    sessionStorage.setItem('quiz_player', JSON.stringify({
      id: player.id,
      name: player.name,
      sessionId: session.id,
      avatar: selectedAvatar
    }));
    navigate(`/play/${session.id}`);
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(val);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden transition-colors duration-300">
      <AnimatedBackground />

      {/* Top absolute ThemeToggle */}
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="relative z-50 w-full max-w-md px-4 animate-[overlay-pop_0.3s_ease]">
        <div className="flex justify-center mb-6 sm:mb-8">
          <Logo size="lg" />
        </div>

        <div className="bento-card border-none ring-1 ring-primary/20 p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-6 sm:mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-[2rem] sm:rounded-[2.5rem] mb-4 sm:mb-6 animate-[neon-pulse_2s_ease-in-out_infinite] bg-gradient-to-br from-[#8B5CF6] via-[#FF3CAC] to-[#00DCFF] shadow-xl shadow-primary/30">
              <Zap className="text-white fill-white w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <h1 className="font-outfit text-3xl sm:text-4xl font-black mb-2 text-foreground tracking-tighter">
              Join the Storm
            </h1>
            <p className="text-muted-foreground text-[10px] sm:text-sm font-bold uppercase tracking-[0.2em] opacity-70">Enter PIN & Battle</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5 ml-1">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your name..."
                maxLength={30}
                className="storm-input w-full px-4 sm:px-5 py-3 sm:py-3.5 text-sm sm:text-base font-semibold"
              />
            </div>

            <div className="pt-1 sm:pt-2">
              <AvatarSelector selectedAvatar={selectedAvatar} onSelect={setSelectedAvatar} />
            </div>

            <div>
              <label className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1 sm:mb-1.5 ml-1">Game PIN</label>
              <input
                type="text"
                inputMode="numeric"
                value={pin}
                onChange={handlePinChange}
                placeholder="000000"
                className="storm-input w-full px-3 py-3 sm:py-4 text-center text-2xl sm:text-4xl font-outfit font-black tracking-[0.25em] sm:tracking-[0.4em] text-primary"
                style={{
                  background: pin.length === 6 ? 'hsl(var(--primary) / 0.1)' : undefined,
                  boxShadow: pin.length === 6 ? '0 0 20px hsl(var(--primary) / 0.2)' : undefined,
                }}
              />
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl animate-[shake_0.5s_ease]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim() || pin.length !== 6}
              className="btn-storm w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Zap size={18} className="fill-white" />
                  Join the Storm
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-6">
            <button onClick={() => navigate('/auth')} className="text-muted-foreground text-sm font-medium hover:text-primary transition-colors">
              Host a game instead →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerJoin;
