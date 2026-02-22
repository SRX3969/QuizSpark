import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/Logo';
import AnimatedBackground from '@/components/AnimatedBackground';
import Podium from '@/components/Podium';
import { Users, Play, ChevronRight, Crown, Copy, Check, BarChart2, QrCode } from 'lucide-react';
import { playWhoosh, playLobbyLoop, stopLobbyLoop, playPodiumReveal, playTimerBeat } from '@/lib/sounds';
import { QRCodeSVG } from 'qrcode.react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { toast } from 'sonner';

interface Player {
  id: string;
  name: string;
  score: number;
  avatar_url?: string;
}

interface Session {
  id: string;
  game_pin: string;
  status: string;
  current_question_index: number;
  quiz_id: string;
  question_started_at?: string;
}

interface Question {
  id: string;
  question_text: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_answer: number;
  time_limit: number;
  order_index: number;
}

interface AnswerDist {
  [option: number]: number;
}

const OPTION_COLORS = [
  { label: 'A', emoji: '🔴', bg: 'hsl(var(--answer-red))', bar: 'bg-[hsl(var(--answer-red))]' },
  { label: 'B', emoji: '🔵', bg: 'hsl(var(--answer-blue))', bar: 'bg-[hsl(var(--answer-blue))]' },
  { label: 'C', emoji: '🟡', bg: 'hsl(var(--answer-yellow))', bar: 'bg-[hsl(var(--answer-yellow))]' },
  { label: 'D', emoji: '🟢', bg: 'hsl(var(--answer-green))', bar: 'bg-[hsl(var(--answer-green))]' },
];

const HostSession = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pinCopied, setPinCopied] = useState(false);
  const [questionTimer, setQuestionTimer] = useState(0);
  const [timerInterval, setTimerInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [answerDist, setAnswerDist] = useState<AnswerDist>({});
  const [showDist, setShowDist] = useState(false);
  const [autoAdvanced, setAutoAdvanced] = useState(false);
  const [lobbyMusicPlaying, setLobbyMusicPlaying] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    loadSession();
  }, [sessionId, user]);

  // Start lobby music when waiting
  useEffect(() => {
    if (session?.status === 'waiting' && !lobbyMusicPlaying) {
      playLobbyLoop();
      setLobbyMusicPlaying(true);
    } else if (session?.status !== 'waiting' && lobbyMusicPlaying) {
      stopLobbyLoop();
      setLobbyMusicPlaying(false);
    }
    return () => { stopLobbyLoop(); };
  }, [session?.status]);

  const loadSession = async () => {
    if (!sessionId) return;
    const { data: s } = await supabase.from('game_sessions').select('*').eq('id', sessionId).single();
    if (s) {
      setSession(s as Session);
      const { data: qs } = await supabase.from('questions').select('*').eq('quiz_id', s.quiz_id).order('order_index');
      if (qs) setQuestions(qs as Question[]);
    }
    const { data: p } = await supabase.from('players').select('*').eq('session_id', sessionId).order('score', { ascending: false });
    if (p) setPlayers(p as Player[]);
  };

  // ── Real-time: player joins ────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;

    const playerSub = supabase
      .channel(`host-players-${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `session_id=eq.${sessionId}` }, () => {
        supabase.from('players').select('*').eq('session_id', sessionId).order('score', { ascending: false })
          .then(({ data }) => { if (data) setPlayers(data as Player[]); });
      })
      .subscribe();

    const sessionSub = supabase
      .channel(`host-session-${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` }, (payload) => {
        setSession(payload.new as Session);
      })
      .subscribe();

    const responseSub = supabase
      .channel(`host-responses-${sessionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'responses' }, async (payload) => {
        setAnsweredCount(c => c + 1);
        const row = payload.new as { player_id: string; selected_option: number };
        setAnswerDist(prev => ({
          ...prev,
          [row.selected_option]: (prev[row.selected_option] || 0) + 1,
        }));
      })
      .subscribe();

    const powerupSub = supabase
      .channel(`host-powerups-${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'powerups' as any, filter: `session_id=eq.${sessionId}` }, async (payload) => {
        const p = payload.new as any;
        if (p.status === 'used') {
          // fetch player info to show in toast
          const { data: player } = await supabase.from('players').select('name').eq('id', p.player_id).single();
          if (!player) return;

          if (p.powerup_type === '50_50') {
            toast(`${player.name} used 50/50! ✂️`, { icon: '✨', duration: 4000 });
          } else if (p.powerup_type === 'double_down') {
            toast(`${player.name} Doubled Down! 💰`, { icon: '⚡', duration: 4000 });
          } else if (p.powerup_type === 'glitch') {
            const { data: target } = await supabase.from('players').select('name').eq('id', p.target_player_id).single();
            if (target) {
              toast(`${player.name} glitched ${target.name}! 👾`, { icon: '🤖', duration: 5000 });
            }
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(playerSub);
      supabase.removeChannel(sessionSub);
      supabase.removeChannel(responseSub);
      supabase.removeChannel(powerupSub);
    };
  }, [sessionId]);

  // ── Start game ─────────────────────────────────────────────────────────────
  const startGame = async () => {
    if (questions.length === 0) {
      alert("This quiz has no questions! Add some questions first.");
      return;
    }

    stopLobbyLoop();
    setLobbyMusicPlaying(false);

    const now = new Date().toISOString();
    let { error } = await supabase
      .from('game_sessions')
      .update({ status: 'question', current_question_index: 0, question_started_at: now })
      .eq('id', sessionId);

    if (error && error.message.includes('column "question_started_at" of relation "game_sessions" does not exist')) {
      const fallback = await supabase
        .from('game_sessions')
        .update({ status: 'question', current_question_index: 0 })
        .eq('id', sessionId);
      error = fallback.error;
    }

    if (error) {
      console.error("Error starting game:", error);
      alert(`Failed to start game: ${error.message}`);
      return;
    }

    setSession(prev => prev ? { ...prev, status: 'question', current_question_index: 0, question_started_at: now } : null);
    resetQuestionState();
    startTimer(questions[0]?.time_limit || 30);
  };

  const resetQuestionState = () => {
    setAnsweredCount(0);
    setAnswerDist({});
    setShowDist(false);
    setAutoAdvanced(false);
  };

  // ── Timer ──────────────────────────────────────────────────────────────────
  const startTimer = useCallback((seconds: number) => {
    setQuestionTimer(seconds);
    if (timerRef.current) clearInterval(timerRef.current);

    const interval = setInterval(() => {
      setQuestionTimer(t => {
        if (t <= 1) {
          clearInterval(interval);
          setShowDist(true);
          setAutoAdvanced(false);
          return 0;
        }
        if (t <= 10) playTimerBeat(t);
        return t - 1;
      });
    }, 1000);
    timerRef.current = interval;
    setTimerInterval(interval);
  }, []);

  // ── Next question ──────────────────────────────────────────────────────────
  const nextQuestion = async () => {
    if (!session || !questions.length) return;
    const nextIdx = (session.current_question_index || 0) + 1;

    if (nextIdx >= questions.length) {
      const { error } = await supabase.from('game_sessions').update({ status: 'finished' }).eq('id', sessionId);
      if (error) { console.error("Error finishing game:", error); return; }
      setSession(prev => prev ? { ...prev, status: 'finished' } : null);
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeout(() => playPodiumReveal(), 500);
    } else {
      const now = new Date().toISOString();
      let { error } = await supabase
        .from('game_sessions')
        .update({ status: 'question', current_question_index: nextIdx, question_started_at: now })
        .eq('id', sessionId);

      if (error && error.message.includes('column "question_started_at" of relation "game_sessions" does not exist')) {
        const fallback = await supabase
          .from('game_sessions')
          .update({ status: 'question', current_question_index: nextIdx })
          .eq('id', sessionId);
        error = fallback.error;
      }

      if (error) { console.error("Error advancing question:", error); alert(`Failed to advance: ${error.message}`); return; }
      setSession(prev => prev ? { ...prev, status: 'question', current_question_index: nextIdx, question_started_at: now } : null);
      resetQuestionState();
      startTimer(questions[nextIdx]?.time_limit || 30);
    }
  };

  // ── Show leaderboard ───────────────────────────────────────────────────────
  const showLeaderboard = async () => {
    await supabase.from('game_sessions').update({ status: 'leaderboard' }).eq('id', sessionId);
    if (timerRef.current) clearInterval(timerRef.current);
    playWhoosh();
    setShowDist(false);
    const { data: p } = await supabase.from('players').select('*').eq('session_id', sessionId).order('score', { ascending: false });
    if (p) setPlayers(p as Player[]);
  };

  const copyPin = () => {
    navigator.clipboard.writeText(session?.game_pin || '');
    setPinCopied(true);
    setTimeout(() => setPinCopied(false), 2000);
  };

  const currentQ = session ? questions[session.current_question_index || 0] : null;
  const answerIcons = ['🔴', '🔵', '🟡', '🟢'];
  const isWaiting = session?.status === 'waiting';
  const isQuestion = session?.status === 'question';
  const isLeaderboard = session?.status === 'leaderboard';
  const isFinished = session?.status === 'finished';
  const totalAnswers = (Object.values(answerDist) as number[]).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10 min-h-screen flex flex-col">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-6 py-4 glass-card border-b border-[hsl(var(--border))]">
          <Logo size="sm" />
          <div className="flex items-center gap-4">
            <ThemeToggle className="mr-2" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users size={16} />
              <span>{players.length} players</span>
            </div>
            {(isQuestion || isLeaderboard) && session && (
              <span className="text-xs font-outfit font-bold text-primary">
                Q{(session.current_question_index || 0) + 1}/{questions.length}
              </span>
            )}
            {session?.game_pin && !isWaiting && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
                <span className="text-xs text-muted-foreground">PIN</span>
                <span className="font-outfit font-bold text-primary tracking-widest">{session.game_pin}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">

          {/* ─── WAITING LOBBY ─── */}
          {isWaiting && (
            <div className="text-center animate-fade-in max-w-lg w-full">
              <h2 className="font-outfit text-3xl font-bold text-foreground mb-2">Waiting for players...</h2>
              <p className="text-muted-foreground mb-8">Ready to start? Share the PIN below!</p>

              {/* PIN & QR Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch mb-8 animate-slide-up">
                {/* PIN Section */}
                <div className="bento-card flex flex-col items-center justify-center min-h-[300px] text-center group">
                  <div className="text-muted-foreground font-black text-xs uppercase tracking-[0.3em] mb-4 opacity-70">
                    Game PIN
                  </div>
                  <div className="pin-display text-6xl md:text-7xl tracking-widest px-2 mb-4 group-hover:scale-105 transition-all duration-500 break-all leading-none py-2">
                    {session.game_pin}
                  </div>
                  <button
                    onClick={copyPin}
                    className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest hover:brightness-125 transition-all p-2 rounded-lg hover:bg-primary/10"
                  >
                    {pinCopied ? (
                      <>
                        <Check size={14} className="text-[hsl(var(--neon-lime))]" />
                        <span className="text-[hsl(var(--neon-lime))]">Copied PIN!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy PIN</span>
                      </>
                    )}
                  </button>
                </div>

                {/* QR Code Section */}
                <div className="bento-card flex flex-col items-center justify-center min-h-[300px] text-center group">
                  <div className="text-muted-foreground font-black text-xs uppercase tracking-[0.3em] mb-4 opacity-70">
                    Scan to Join
                  </div>
                  <div className="p-6 bg-white rounded-[2rem] shadow-xl group-hover:rotate-1 group-hover:scale-105 transition-all duration-500 ring-4 ring-primary/10">
                    <QRCodeSVG
                      value={`${window.location.origin}/join?pin=${session.game_pin}`}
                      size={160}
                      level="H"
                      includeMargin={false}
                      imageSettings={{
                        src: "/logo.svg",
                        x: undefined,
                        y: undefined,
                        height: 32,
                        width: 32,
                        excavate: true,
                      }}
                    />
                  </div>
                  <div className="mt-6 flex items-center gap-2 text-muted-foreground font-bold text-[10px] uppercase tracking-widest opacity-60">
                    <QrCode size={14} />
                    Lightning Fast Entry
                  </div>
                </div>
              </div>

              {/* Players list */}
              <div className="glass-card-solid rounded-2xl p-4 mb-6 max-h-48 overflow-y-auto">
                {players.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4">Waiting for players to join...</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {players.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))] animate-fade-in">
                        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-base">
                          {p.avatar_url || p.name[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-foreground truncate">{p.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={startGame}
                disabled={players.length === 0 || questions.length === 0}
                className="btn-storm px-10 py-4 rounded-2xl text-white font-bold text-lg flex items-center gap-3 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play size={22} /> Start Game ({questions.length} questions)
              </button>
            </div>
          )}

          {/* ─── QUESTION SCREEN ─── */}
          {isQuestion && currentQ && (
            <div className="w-full max-w-2xl animate-fade-in">
              {/* Timer row */}
              <div className="flex items-center justify-between mb-5">
                <div className="glass-card-solid px-4 py-2 rounded-xl">
                  <span className="text-muted-foreground text-sm">Question {(session?.current_question_index || 0) + 1}</span>
                </div>
                <div className={`font-outfit text-6xl font-black transition-colors ${questionTimer <= 5
                  ? 'text-destructive' : questionTimer <= 10 ? 'text-[hsl(var(--neon-orange))]' : 'text-[hsl(var(--neon-cyan))]'}`}
                  style={{ textShadow: questionTimer <= 5 ? '0 0 20px hsl(var(--destructive) / 0.5)' : questionTimer <= 10 ? '0 0 15px hsl(var(--neon-orange) / 0.4)' : '0 0 15px hsl(var(--neon-cyan) / 0.3)' }}
                >
                  {questionTimer}
                </div>
                <div className="glass-card-solid px-4 py-2 rounded-xl text-right">
                  <p className="text-muted-foreground text-xs">answered</p>
                  <p className="font-outfit font-bold text-primary text-sm">{answeredCount}/{players.length}</p>
                </div>
              </div>

              {/* Answer progress bar */}
              <div className="w-full h-3 bg-[hsl(var(--muted))] rounded-full overflow-hidden mb-6">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{
                    width: players.length > 0 ? `${(answeredCount / players.length) * 100}%` : '0%',
                    boxShadow: '0 0 10px hsl(var(--primary) / 0.5)',
                  }}
                />
              </div>

              {/* Question */}
              <div className="glass-card-solid rounded-3xl p-8 mb-6 text-center">
                <h2 className="font-outfit font-bold text-3xl text-foreground leading-tight">{currentQ.question_text}</h2>
              </div>

              {/* Options */}
              {!showDist ? (
                <div className="grid grid-cols-2 gap-4 mb-5">
                  {[1, 2, 3, 4].map(opt => {
                    const optKey = `option${opt}` as keyof Question;
                    const isCorrect = currentQ.correct_answer === opt;
                    const col = OPTION_COLORS[opt - 1];
                    return (
                      <div
                        key={opt}
                        className={`answer-btn answer-${['red', 'blue', 'yellow', 'green'][opt - 1]} ${isCorrect ? 'ring-4 ring-white/30' : ''}`}
                      >
                        <span className="mr-2">{answerIcons[opt - 1]}</span>
                        {currentQ[optKey] as string}
                        {isCorrect && <Crown size={16} className="ml-2" />}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Answer distribution chart */
                <div className="glass-card-solid rounded-3xl p-6 mb-6 animate-fade-in">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart2 size={18} className="text-primary" />
                    <span className="font-outfit font-bold text-sm text-primary uppercase tracking-wider">Results</span>
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map(opt => {
                      const optKey = `option${opt}` as keyof Question;
                      const isCorrect = currentQ.correct_answer === opt;
                      const count = answerDist[opt] || 0;
                      const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
                      const col = OPTION_COLORS[opt - 1];
                      return (
                        <div key={opt} className={`p-4 rounded-2xl border transition-all ${isCorrect ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-[hsl(var(--border))] bg-[hsl(var(--muted))]'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{col.emoji}</span>
                              <span className={`text-base font-bold ${isCorrect ? 'text-emerald-400' : 'text-foreground'}`}>
                                {currentQ[optKey] as string}
                              </span>
                              {isCorrect && <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500 text-white uppercase">Correct</span>}
                            </div>
                            <span className="font-outfit text-sm font-bold text-muted-foreground">{count} ({pct}%)</span>
                          </div>
                          <div className="w-full h-3 bg-[hsl(var(--background))] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${isCorrect ? 'bg-emerald-500' : col.bar}`}
                              style={{
                                width: `${pct}%`,
                                minWidth: count > 0 ? '8px' : '0',
                                boxShadow: isCorrect ? '0 0 10px rgba(16,185,129,0.4)' : undefined,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {!showDist && (
                  <button
                    onClick={() => setShowDist(true)}
                    className="flex-1 py-3.5 rounded-xl border border-[hsl(var(--border))] text-muted-foreground font-semibold text-sm hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-2"
                  >
                    <BarChart2 size={16} /> Show Results
                  </button>
                )}
                <button
                  onClick={showLeaderboard}
                  className="flex-1 btn-storm py-3.5 rounded-xl text-white font-semibold flex items-center justify-center gap-2"
                >
                  Show Leaderboard
                </button>
              </div>
            </div>
          )}

          {/* ─── LEADERBOARD / FINISHED ─── */}
          {(isLeaderboard || isFinished) && (
            <div className="w-full max-w-md animate-[overlay-pop_0.3s_ease]">
              {/* Podium for finished */}
              {isFinished && players.length >= 2 && (
                <div className="mb-8">
                  <Podium
                    players={players.slice(0, 3).map(p => ({
                      name: p.name,
                      avatar: p.avatar_url,
                      score: p.score,
                    }))}
                  />
                </div>
              )}

              {!isFinished && (
                <>
                  <h2 className="font-outfit text-4xl font-black text-center mb-2 text-foreground">
                    📊 Leaderboard
                  </h2>
                  <p className="text-muted-foreground text-center text-sm mb-6">
                    After question {(session?.current_question_index || 0) + 1}
                  </p>
                </>
              )}

              {isFinished && (
                <p className="text-muted-foreground text-center text-sm mb-6">
                  Game over! Thanks for playing!
                </p>
              )}

              <div className="space-y-2 mb-6">
                {players.slice(0, 10).map((p, i) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl border animate-slide-up transition-all ${i === 0 ? 'border-yellow-500/30 bg-yellow-500/10 transform scale-[1.02]' :
                      i === 1 ? 'border-gray-400/20 bg-gray-400/5' :
                        i === 2 ? 'border-orange-500/20 bg-orange-500/5' :
                          'border-[hsl(var(--border))] bg-[hsl(var(--card))]'
                      }`}
                    style={{ animationDelay: `${i * 0.06}s` }}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-outfit font-black text-base ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'bg-[hsl(var(--muted))] text-muted-foreground'
                      }`}>
                      {i === 0 ? '👑' : i + 1}
                    </div>
                    <div className="flex-1 flex items-center gap-3">
                      <span className="text-xl">{p.avatar_url}</span>
                      <p className="font-bold text-foreground text-lg">{p.name}</p>
                    </div>
                    <div className="font-outfit font-black text-[hsl(var(--neon-lime))] text-xl">{p.score.toLocaleString()}</div>
                  </div>
                ))}
              </div>

              {isLeaderboard && !isFinished && (
                <button onClick={nextQuestion} className="w-full btn-storm py-4 rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-2">
                  Next Question <ChevronRight size={20} />
                </button>
              )}
              {isFinished && (
                <button onClick={() => navigate('/dashboard')} className="w-full btn-storm py-4 rounded-2xl text-white font-bold text-lg">
                  Back to Dashboard
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default HostSession;
