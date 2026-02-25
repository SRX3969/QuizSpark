import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/Logo';
import AnimatedBackground from '@/components/AnimatedBackground';
import Podium from '@/components/Podium';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Zap, Trophy, Crown, Users, Flame, Scissors, Zap as ZapIcon, Ghost } from 'lucide-react';
import { playCorrect, playWrong, playTick, playUrgentTick, playFanfare, playWhoosh, playStreakSound, playPodiumReveal, playTimerBeat } from '@/lib/sounds';
import { toast } from 'sonner';

interface PlayerInfo {
  id: string;
  name: string;
  sessionId: string;
  avatar?: string;
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

interface GameSession {
  id: string;
  status: string;
  current_question_index: number;
  quiz_id: string;
  question_started_at?: string;
}

interface PlayerRow {
  id: string;
  name: string;
  score: number;
  avatar_url?: string;
}

const ANSWER_COLORS = [
  { bg: 'bg-[hsl(var(--answer-red))]', shadow: 'shadow-[0_4px_15px_hsla(var(--answer-red)/0.4)]', emoji: '🔴', label: 'A' },
  { bg: 'bg-[hsl(var(--answer-blue))]', shadow: 'shadow-[0_4px_15px_hsla(var(--answer-blue)/0.4)]', emoji: '🔵', label: 'B' },
  { bg: 'bg-[hsl(var(--answer-yellow))]', shadow: 'shadow-[0_4px_15px_hsla(var(--answer-yellow)/0.4)]', emoji: '🟡', label: 'C', dark: true },
  { bg: 'bg-[hsl(var(--answer-green))]', shadow: 'shadow-[0_4px_15px_hsla(var(--answer-green)/0.4)]', emoji: '🟢', label: 'D' },
];

// ─── Confetti ────────────────────────────────────────────────────────────────
const Confetti = () => {
  const colors = ['#8B5CF6', '#00DCFF', '#FF3CAC', '#78FF44', '#FFD700', '#FF6B35'];
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 70 }).map((_, i) => (
        <div
          key={i}
          className="confetti-particle"
          style={{
            left: `${Math.random() * 100}%`,
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            width: `${Math.random() * 10 + 6}px`,
            height: `${Math.random() * 10 + 6}px`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animationDuration: `${Math.random() * 2 + 2}s`,
            animationDelay: `${Math.random() * 1}s`,
          }}
        />
      ))}
    </div>
  );
};

// ─── Countdown Ring ───────────────────────────────────────────────────────────
const CountdownRing = ({ total, remaining }: { total: number; remaining: number }) => {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const progress = remaining / total;
  const dashOffset = circumference * (1 - progress);
  const isUrgent = remaining <= 5;
  const isCritical = remaining <= 3;

  return (
    <div className={`relative w-28 h-28 ${isCritical ? 'animate-[neon-pulse_0.5s_ease-in-out_infinite]' : ''}`}>
      <svg className="countdown-ring w-full h-full" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
        <circle
          cx="55" cy="55" r={radius}
          fill="none"
          stroke={isCritical ? 'hsl(var(--destructive))' : isUrgent ? 'hsl(var(--neon-orange))' : 'hsl(var(--neon-cyan))'}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease',
            filter: isCritical ? 'drop-shadow(0 0 8px hsl(var(--destructive)))' : isUrgent ? 'drop-shadow(0 0 6px hsl(var(--neon-orange)))' : 'drop-shadow(0 0 6px hsl(var(--neon-cyan)))',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-outfit text-2xl font-bold ${isCritical ? 'text-destructive' : isUrgent ? 'text-[hsl(var(--neon-orange))]' : 'text-[hsl(var(--neon-cyan))]'}`}>
          {remaining}
        </span>
      </div>
    </div>
  );
};

// ─── Answer Feedback Overlay ──────────────────────────────────────────────────
const AnswerFeedback = ({
  isCorrect,
  points,
  streak,
  visible,
}: {
  isCorrect: boolean;
  points: number;
  streak: number;
  visible: boolean;
}) => {
  if (!visible) return null;
  const multiplier = streak >= 5 ? 2 : streak >= 3 ? 1.5 : 1;
  return (
    <div className="feedback-overlay animate-overlay-fade">
      <div
        className={`animate-overlay-pop rounded-3xl px-10 py-8 flex flex-col items-center gap-3 shadow-2xl border-2 backdrop-blur-xl ${isCorrect
          ? 'bg-emerald-950/80 border-emerald-400'
          : 'bg-red-950/80 border-red-400'
          }`}
      >
        <span className="text-7xl">{isCorrect ? '✅' : '❌'}</span>
        <p className={`font-outfit text-2xl font-black ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
          {isCorrect ? 'Correct!' : 'Wrong!'}
        </p>
        {isCorrect && (
          <>
            <p className="font-outfit text-4xl font-black text-emerald-300">
              +{points} pts
            </p>
            {multiplier > 1 && (
              <div className="streak-badge flex items-center gap-1.5 mt-1">
                <Flame size={14} className="fill-white" />
                {multiplier}x Streak Bonus!
              </div>
            )}
          </>
        )}
        {!isCorrect && (
          <p className="text-muted-foreground text-sm">Better luck next time!</p>
        )}
      </div>
    </div>
  );
};

// ─── Rank Change Badge ────────────────────────────────────────────────────────
const RankChangeBadge = ({ prevRank, newRank }: { prevRank: number; newRank: number }) => {
  if (!prevRank || !newRank || prevRank === newRank) return null;
  const went = prevRank - newRank;
  return (
    <div className={`animate-rank-pop inline-flex items-center gap-1 ${went > 0 ? 'rank-badge-up' : 'rank-badge-down'}`}>
      {went > 0 ? '🔺' : '🔻'} {Math.abs(went)} {went > 0 ? 'up' : 'down'}
    </div>
  );
};

// ─── Streak Multiplier ────────────────────────────────────────────────────────
function getStreakMultiplier(streak: number): number {
  if (streak >= 5) return 2;
  if (streak >= 3) return 1.5;
  return 1;
}

// ─── Main Component ───────────────────────────────────────────────────────────
const PlayerGame = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [player, setPlayer] = useState<PlayerInfo | null>(null);
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [leaderboard, setLeaderboard] = useState<PlayerRow[]>([]);
  const [myRank, setMyRank] = useState<number>(0);
  const [prevRank, setPrevRank] = useState<number>(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [streak, setStreak] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);

  // Power-up States
  const [availablePowerup, setAvailablePowerup] = useState<'50_50' | 'double_down' | 'glitch' | null>(null);
  const [powerupId, setPowerupId] = useState<string | null>(null);
  const [activeDebuff, setActiveDebuff] = useState<'glitch' | null>(null);
  const [disabledOptions, setDisabledOptions] = useState<number[]>([]);
  const [isDoubleDownActive, setIsDoubleDownActive] = useState(false);
  const [glitchTextVersion, setGlitchTextVersion] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartTime = useRef<number>(Date.now());
  const prevRankRef = useRef<number>(0);
  const lastTickRef = useRef<number>(-1);

  // Glitch Effect Scrambler
  useEffect(() => {
    if (activeDebuff === 'glitch') {
      const interval = setInterval(() => setGlitchTextVersion(v => v + 1), 100);
      return () => clearInterval(interval);
    }
  }, [activeDebuff]);

  // ── Load initial game data ─────────────────────────────────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem('quiz_player');
    if (!stored) { navigate('/join'); return; }
    const p = JSON.parse(stored) as PlayerInfo;
    setPlayer(p);
    loadGame(p);
  }, [sessionId]);

  const loadGame = async (p: PlayerInfo) => {
    const { data: s } = await supabase.from('game_sessions').select('*').eq('id', sessionId).single();
    if (s) {
      setGameSession(s as GameSession);
      const { data: qs } = await supabase.from('questions').select('*').eq('quiz_id', s.quiz_id).order('order_index');
      if (qs) setQuestions(qs as Question[]);
      if (s.status === 'question') {
        const q = qs?.[s.current_question_index];
        if (q) startQuestionTimer(q.time_limit, (s as any).question_started_at);
      }
    }
    const { count } = await supabase.from('players').select('*', { count: 'exact', head: true }).eq('session_id', sessionId);
    setTotalPlayers(count || 0);

    const { data: playerData } = await supabase.from('players').select('score').eq('id', p.id).single();
    if (playerData) setTotalScore(playerData.score);
  };

  // ── Real-time subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId || !player) return;

    const sessionCh = supabase
      .channel(`game-${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` }, (payload) => {
        const newSession = payload.new as GameSession;
        setGameSession(newSession);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setShowFeedback(false);
        setAnsweredCount(0);

        if (newSession.status === 'question') {
          setDisabledOptions([]);
          setIsDoubleDownActive(false);
          setActiveDebuff(null);
          setQuestions(prev => {
            const currentQ = prev[newSession.current_question_index];
            questionStartTime.current = Date.now();
            startQuestionTimer(currentQ?.time_limit || 30, newSession.question_started_at);
            return prev;
          });
        } else if (newSession.status === 'leaderboard' || newSession.status === 'finished') {
          if (timerRef.current) clearInterval(timerRef.current);
          fetchLeaderboard();
          playWhoosh();
          if (newSession.status === 'finished') {
            setTimeout(() => playPodiumReveal(), 500);
          }
        }
      })
      .subscribe();

    const responseCh = supabase
      .channel(`responses-${sessionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'responses' }, () => {
        setAnsweredCount(c => c + 1);
      })
      .subscribe();

    const powerupCh = supabase
      .channel(`powerups-target-${player.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'powerups', filter: `target_player_id=eq.${player.id}` }, (payload) => {
        if (payload.new.powerup_type === 'glitch' && payload.new.status === 'used') {
          setActiveDebuff('glitch');
          toast.error("You've been GLITCHED!", { icon: '🤖' });
          setTimeout(() => setActiveDebuff(null), 8000); // 8 seconds of glitch
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sessionCh);
      supabase.removeChannel(responseCh);
      supabase.removeChannel(powerupCh);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionId, player]);

  // ── Timer with server sync ─────────────────────────────────────────────────
  const startQuestionTimer = useCallback((seconds: number, questionStartedAt?: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    lastTickRef.current = -1;

    let startSeconds = seconds;
    if (questionStartedAt) {
      const elapsed = (Date.now() - new Date(questionStartedAt).getTime()) / 1000;
      startSeconds = Math.max(0, Math.round(seconds - elapsed));
    }

    questionStartTime.current = Date.now() - ((seconds - startSeconds) * 1000);
    setTimeLeft(startSeconds);

    const interval = setInterval(() => {
      setTimeLeft(t => {
        const next = t - 1;
        if (next === 5) playTick();
        if (next === 4) playTick();
        if (next === 3 || next === 2 || next === 1) playUrgentTick();
        if (next <= 10 && next > 0) playTimerBeat(next);
        if (next <= 0) {
          clearInterval(interval);
          return 0;
        }
        return next;
      });
    }, 1000);
    timerRef.current = interval;
  }, []);

  // ── Leaderboard fetch ──────────────────────────────────────────────────────
  const fetchLeaderboard = async () => {
    const { data } = await supabase.from('players').select('*').eq('session_id', sessionId).order('score', { ascending: false });
    if (data) {
      setLeaderboard(data as PlayerRow[]);
      const newRankIdx = data.findIndex(p => p.id === player?.id) + 1;
      setPrevRank(prevRankRef.current || newRankIdx);
      setMyRank(newRankIdx);
      prevRankRef.current = newRankIdx;
    }
    if (player) {
      const { data: pd } = await supabase.from('players').select('score').eq('id', player.id).single();
      if (pd) setTotalScore(pd.score);
    }
  };

  // ── Handle player answer ───────────────────────────────────────────────────
  const handleAnswer = async (optionIndex: number) => {
    if (!player || !gameSession || selectedAnswer !== null) return;
    const currentQ = questions[gameSession.current_question_index];
    if (!currentQ || answeredQuestions.has(currentQ.id)) return;

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50);

    setSelectedAnswer(optionIndex);
    if (timerRef.current) clearInterval(timerRef.current);

    const timeTaken = (Date.now() - questionStartTime.current) / 1000;
    const correct = optionIndex === currentQ.correct_answer;
    const timeBonus = correct ? Math.round(Math.max(0, currentQ.time_limit - timeTaken) * 10) : 0;
    const newStreak = correct ? streak + 1 : 0;
    const multiplier = correct ? getStreakMultiplier(newStreak) : 1;
    const basePoints = correct ? 100 + timeBonus : 0;
    let points = Math.round(basePoints * multiplier);

    if (isDoubleDownActive) {
      points = correct ? points * 2 : -200; // Deduct 200 points if wrong when double down is active!
      setIsDoubleDownActive(false);
    }

    setIsCorrect(correct);
    setPointsEarned(points);
    setShowFeedback(true);
    setStreak(newStreak);

    // Earning a power-up on a 3-streak
    if (newStreak === 3 && !availablePowerup) {
      const types: ('50_50' | 'double_down' | 'glitch')[] = ['50_50', 'double_down', 'glitch'];
      const pt = types[Math.floor(Math.random() * types.length)];

      const res = await supabase.from('powerups').insert({
        session_id: gameSession.id,
        player_id: player.id,
        powerup_type: pt,
        status: 'available'
      }).select().single();

      const powerupRecord = res.data;
      if (powerupRecord && !res.error) {
        setPowerupId(powerupRecord.id);
        setAvailablePowerup(pt);
        toast.success(`You earned a power-up: ${pt === '50_50' ? '50/50' : pt === 'double_down' ? 'Double Down' : 'Glitch'}!`, { icon: '🎁', position: 'top-center' });
      }
    }

    setTimeout(() => setShowFeedback(false), 2200);

    if (correct) {
      playCorrect();
      if (newStreak >= 2) playStreakSound(newStreak);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } else {
      playWrong();
    }

    // Save response
    await supabase.from('responses').insert({
      player_id: player.id,
      question_id: currentQ.id,
      selected_option: optionIndex,
      time_taken: timeTaken,
      is_correct: correct,
      points_earned: points,
    });

    // Update score
    if (points !== 0) {
      const newScore = Math.max(0, totalScore + points); // Prevent negative total score
      await supabase.from('players').update({ score: newScore }).eq('id', player.id);
      setTotalScore(newScore);
    }

    setAnsweredQuestions(prev => new Set([...prev, currentQ.id]));
  };

  const usePowerup = async () => {
    if (!availablePowerup || !powerupId || !currentQ || selectedAnswer !== null) return;

    if (availablePowerup === '50_50') {
      const wrongOptions = [1, 2, 3, 4].filter(o => o !== currentQ.correct_answer);
      const shuffled = wrongOptions.sort(() => 0.5 - Math.random());
      setDisabledOptions([shuffled[0], shuffled[1]]);
      playWhoosh();
    } else if (availablePowerup === 'double_down') {
      setIsDoubleDownActive(true);
      playStreakSound(2);
    } else if (availablePowerup === 'glitch') {
      const opponents = leaderboard.filter(p => p.id !== player.id);
      if (opponents.length > 0) {
        const target = opponents[Math.floor(Math.random() * opponents.length)];
        await supabase.from('powerups').update({
          status: 'used',
          target_player_id: target.id
        }).eq('id', powerupId);
        toast.success(`Glitched ${target.name}!`, { icon: '👾', position: 'top-center' });
        playWhoosh();
        setAvailablePowerup(null);
        setPowerupId(null);
        return;
      } else {
        toast.error("No opponents to glitch!");
        return;
      }
    }

    // For self buffs
    await supabase.from('powerups').update({ status: 'used' }).eq('id', powerupId);

    setAvailablePowerup(null);
    setPowerupId(null);
  };

  const currentQ = gameSession ? questions[gameSession.current_question_index] : null;
  const isWaiting = gameSession?.status === 'waiting';
  const isQuestion = gameSession?.status === 'question';
  const isLeaderboard = gameSession?.status === 'leaderboard';
  const isFinished = gameSession?.status === 'finished';
  const myCurrentRank = leaderboard.findIndex(p => p.id === player?.id) + 1;

  return (
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-300 ${activeDebuff === 'glitch' ? 'glitch-screen' : ''}`}>
      <AnimatedBackground />
      {showConfetti && <Confetti />}
      {isFinished && <Confetti />}

      {/* Double Down visual FX */}
      {isDoubleDownActive && (
        <div className="absolute inset-0 pointer-events-none z-0 bg-[hsl(var(--neon-orange))]/10 animate-pulse mix-blend-screen" />
      )}

      {/* Answer feedback overlay */}
      <AnswerFeedback
        isCorrect={isCorrect ?? false}
        points={pointsEarned}
        streak={streak}
        visible={showFeedback && selectedAnswer !== null}
      />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-4 py-3 glass-card border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2">
            <Logo size="sm" showText={false} />
            <ThemeToggle className="ml-2 scale-90" />
          </div>
          <div className="flex items-center gap-3">
            {/* Streak badge */}
            {streak >= 2 && (
              <div className="streak-badge flex items-center gap-1 animate-rank-pop">
                <Flame size={14} className="fill-white" />
                <span className="font-outfit text-xs font-bold">{streak}x</span>
                {streak >= 3 && <span className="text-[10px] opacity-80">({getStreakMultiplier(streak)}x)</span>}
              </div>
            )}
            {/* Current rank */}
            {myCurrentRank > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg glass-card border border-[hsl(var(--border))]">
                <Trophy size={13} className="text-[hsl(var(--neon-cyan))]" />
                <span className="font-outfit text-xs font-bold text-[hsl(var(--neon-cyan))]">#{myCurrentRank}</span>
              </div>
            )}
            {/* Player name & Avatar */}
            <div className="flex items-center gap-2">
              <span className="text-xl">{player?.avatar}</span>
              <p className="font-semibold text-sm text-foreground hidden sm:block">{player?.name}</p>
            </div>
            {/* Score */}
            <div className="score-pill">{totalScore.toLocaleString()} pts</div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">

          {/* ── WAITING ── */}
          {(isWaiting || !gameSession) && (
            <div className="text-center animate-fade-in">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-[neon-pulse_2s_ease-in-out_infinite] ring-4 ring-primary/20" />
                <div className="absolute inset-0 flex items-center justify-center text-5xl">
                  {player?.avatar || <Users size={36} className="text-primary" />}
                </div>
              </div>
              <h2 className="font-outfit text-2xl font-bold text-foreground mb-2">You're in! ⚡</h2>
              <p className="text-muted-foreground mb-1">
                Welcome, <span className="text-primary font-bold">{player?.name}</span>!
              </p>
              <p className="text-muted-foreground text-sm">Waiting for the host to start...</p>
              <div className="flex justify-center mt-6 gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          )}

          {/* ── QUESTION ── */}
          {isQuestion && currentQ && (
            <div className="w-full max-w-lg animate-fade-in">
              {/* Timer */}
              <div className="flex items-center justify-center mb-5 relative">
                <CountdownRing total={currentQ.time_limit} remaining={timeLeft} />
                {/* Answer count progress */}
                {totalPlayers > 0 && (
                  <div className="absolute right-0 flex flex-col items-end gap-1">
                    <span className="text-xs text-muted-foreground">answered</span>
                    <span className="font-outfit text-lg font-bold text-primary">
                      {answeredCount}/{totalPlayers}
                    </span>
                    <div className="w-20 h-2 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: totalPlayers > 0 ? `${(answeredCount / totalPlayers) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Question card */}
              <div className="glass-card-solid p-6 mb-5 text-center">
                <p className="text-xs text-muted-foreground mb-2 font-outfit uppercase tracking-wider font-semibold">
                  Question {(gameSession?.current_question_index ?? 0) + 1} of {questions.length}
                </p>
                <p className="font-inter font-bold text-xl text-foreground leading-relaxed">{currentQ.question_text}</p>
              </div>

              {/* Answer buttons — single col on mobile, 2 col on larger */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 relative">
                {[1, 2, 3, 4].map(opt => {
                  const key = `option${opt}` as keyof Question;
                  const color = ANSWER_COLORS[opt - 1];
                  const isSelected = selectedAnswer === opt;
                  const showResult = selectedAnswer !== null;
                  const isCorrectOpt = opt === currentQ.correct_answer;

                  return (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(opt)}
                      disabled={selectedAnswer !== null || disabledOptions.includes(opt)}
                      className={`
                        answer-btn ${color.bg}
                        ${color.dark ? 'text-[hsl(40_40%_10%)]' : 'text-white'}
                        ${isSelected ? 'ring-4 ring-white/50 scale-95' : ''}
                        ${showResult && isCorrectOpt ? 'ring-4 ring-[hsl(var(--neon-lime))]/70 brightness-125 animate-[rank-pop_0.4s_ease]' : ''}
                        ${showResult && isSelected && !isCorrectOpt ? 'opacity-50 animate-[shake_0.5s_ease]' : ''}
                        ${(showResult && !isSelected && !isCorrectOpt) || disabledOptions.includes(opt) ? 'opacity-25' : ''}
                        min-h-[70px] sm:min-h-[80px] flex-col gap-2 relative w-full
                        ${activeDebuff === 'glitch' ? 'glitched-text' : ''}
                      `}
                    >
                      <span className="text-2xl" style={{ filter: activeDebuff === 'glitch' ? 'hue-rotate(90deg)' : 'none' }}>{color.emoji}</span>
                      <span className="text-sm font-bold leading-tight text-center">
                        {activeDebuff === 'glitch'
                          ? (currentQ[key] as string).split('').map(c => Math.random() > 0.5 ? String.fromCharCode(33 + Math.floor(Math.random() * 94)) : c).join('')
                          : currentQ[key] as string}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Inline result after overlay fades */}
              {selectedAnswer !== null && !showFeedback && (
                <div className={`mt-5 p-4 rounded-2xl text-center font-bold text-base animate-[rank-pop_0.4s_ease] border ${isCorrect
                  ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-950/50 border-red-500/30 text-red-400'
                  }`}>
                  {isCorrect ? `✨ Correct! +${pointsEarned} pts` : `❌ Wrong! ${pointsEarned < 0 ? `${pointsEarned} pts` : 'Better luck next time'}`}
                </div>
              )}
            </div>
          )}

          {/* Powerup Bar */}
          {isQuestion && availablePowerup && selectedAnswer === null && (
            <div className="fixed bottom-6 left-0 w-full flex justify-center z-50 animate-slide-up">
              <button
                onClick={usePowerup}
                className="glass-card-solid px-6 py-3 rounded-full flex items-center gap-3 border-2 border-[hsl(var(--primary))] shadow-[0_0_20px_hsla(var(--primary)/0.4)] hover:scale-105 transition-transform bg-background/90 backdrop-blur-xl"
              >
                <span className="text-2xl flex items-center justify-center bg-primary/20 w-10 h-10 rounded-full">
                  {availablePowerup === '50_50' ? <Scissors size={20} className="text-primary" /> :
                    availablePowerup === 'double_down' ? <ZapIcon size={20} className="text-[hsl(var(--neon-orange))]" /> :
                      <Ghost size={20} className="text-[hsl(var(--neon-pink))]" />}
                </span>
                <span className={`font-outfit font-black text-lg tracking-wide uppercase ${availablePowerup === '50_50' ? 'text-primary' :
                  availablePowerup === 'double_down' ? 'text-[hsl(var(--neon-orange))]' :
                    'text-[hsl(var(--neon-pink))]'
                  }`}>
                  Use {availablePowerup === '50_50' ? '50/50' : availablePowerup === 'double_down' ? 'Double Down' : 'Glitch'}!
                </span>
              </button>
            </div>
          )}

          {/* ── LEADERBOARD / FINISHED ── */}
          {(isLeaderboard || isFinished) && (
            <div className="w-full max-w-md animate-[overlay-pop_0.3s_ease]">
              {/* Podium for finished */}
              {isFinished && leaderboard.length >= 2 && (
                <div className="mb-8">
                  <Podium
                    players={leaderboard.slice(0, 3).map(p => ({
                      name: p.name,
                      avatar: p.avatar_url,
                      score: p.score,
                    }))}
                  />
                </div>
              )}

              {!isFinished && (
                <div className="text-center mb-5">
                  <div className="text-6xl mb-3 animate-bounce">📊</div>
                  <h2 className="font-outfit text-3xl font-bold text-foreground">Leaderboard</h2>
                </div>
              )}

              {/* My rank + badge */}
              <div className="flex items-center justify-center gap-3 mt-2 mb-4">
                <p className="text-muted-foreground text-sm">
                  Rank <span className="text-[hsl(var(--neon-lime))] font-bold text-base">#{myRank}</span> · <span className="text-primary font-bold">{totalScore.toLocaleString()} pts</span>
                </p>
                {prevRank !== myRank && prevRank > 0 && (
                  <RankChangeBadge prevRank={prevRank} newRank={myRank} />
                )}
              </div>

              {/* Streak */}
              {streak >= 2 && (
                <div className="flex justify-center mb-4">
                  <div className="streak-badge flex items-center gap-1.5 animate-rank-pop">
                    <Flame size={14} className="fill-white" />
                    <span className="text-sm font-bold">{streak} streak 🔥</span>
                  </div>
                </div>
              )}

              <div className="space-y-2 mb-5">
                {leaderboard.slice(0, 8).map((p, i) => {
                  const isMe = p.id === player?.id;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border animate-slide-up transition-all ${isMe
                        ? 'border-primary/40 bg-primary/10'
                        : i === 0 ? 'border-yellow-500/30 bg-yellow-500/5'
                          : i === 1 ? 'border-gray-400/20 bg-gray-400/5'
                            : i === 2 ? 'border-orange-500/20 bg-orange-500/5'
                              : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]'
                        }`}
                      style={{ animationDelay: `${i * 0.07}s` }}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-outfit font-bold text-sm flex-shrink-0 ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'bg-[hsl(var(--muted))] text-muted-foreground'
                        }`}>
                        {i === 0 ? <Crown size={16} /> : i + 1}
                      </div>
                      <span className={`flex-1 font-semibold text-sm flex items-center gap-2 ${isMe ? 'text-primary' : 'text-foreground'}`}>
                        <span className="text-lg">{p.avatar_url}</span>
                        {p.name} {isMe && ' (You)'}
                      </span>
                      <span className="font-outfit font-bold text-[hsl(var(--neon-lime))] text-sm">{p.score.toLocaleString()}</span>
                      {isMe && i === 0 && (
                        <span className="text-xs font-bold text-yellow-400 ml-1">👑 Leader!</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {isFinished && myRank === 1 && (
                <div className="text-center mb-4 animate-[rank-pop_0.6s_ease]">
                  <p className="font-outfit text-lg font-black text-yellow-400">🏆 You Won! Incredible!</p>
                </div>
              )}

              {!isFinished && (
                <p className="text-center text-muted-foreground text-sm animate-pulse">⏳ Waiting for next question...</p>
              )}

              {isFinished && (
                <button
                  onClick={() => navigate('/join')}
                  className="w-full btn-storm py-4 rounded-2xl text-white font-bold text-lg mt-2"
                >
                  Play Again ⚡
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default PlayerGame;
