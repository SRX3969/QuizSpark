import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/Logo';
import AnimatedBackground from '@/components/AnimatedBackground';
import { Plus, Play, Trash2, BookOpen, Users, Trophy, LogOut, Zap, ChevronRight, Settings, Search, Check, AlertCircle, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';
import AvatarSelector from '@/components/AvatarSelector';
import { ThemeToggle } from '@/components/ThemeToggle';

interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  created_at: string;
  question_count?: number;
}

type TabType = 'dashboard' | 'quizzes' | 'settings';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ quizzes: 0, sessions: 0, players: 0 });
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [quizSessions, setQuizSessions] = useState<any[]>([]);
  const [sessionLeaderboard, setSessionLeaderboard] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Settings state
  const [newName, setNewName] = useState(profile?.name || '');
  const [newAvatar, setNewAvatar] = useState(profile?.avatar_url || null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    fetchData();
    if (profile) {
      setNewName(profile.name);
      setNewAvatar(profile.avatar_url);
    }
  }, [user, profile]);

  const fetchData = async () => {
    if (!user) return;

    // Fetch quizzes with question counts
    const { data: quizzesData } = await supabase
      .from('quizzes')
      .select('*, questions(count)')
      .eq('host_id', user.id)
      .order('created_at', { ascending: false });

    if (quizzesData) {
      const formatted = quizzesData.map((q: any) => ({
        ...q,
        question_count: q.questions?.[0]?.count || 0,
      }));
      setQuizzes(formatted);
      setStats(s => ({ ...s, quizzes: formatted.length }));
    }

    // Fetch sessions count
    const { count: sessionsCount } = await supabase
      .from('game_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('host_id', user.id);

    setStats(s => ({ ...s, sessions: sessionsCount || 0 }));

    // Fetch total players who joined across all host sessions
    const { data: hostSessions } = await supabase
      .from('game_sessions')
      .select('id')
      .eq('host_id', user.id);

    if (hostSessions && hostSessions.length > 0) {
      const sessionIds = hostSessions.map(s => s.id);
      const { count: playersCount } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .in('session_id', sessionIds);
      setStats(s => ({ ...s, players: playersCount || 0 }));
    }

    setLoading(false);
  };

  const deleteQuiz = async (id: string) => {
    const { error } = await supabase.from('quizzes').delete().eq('id', id);
    if (!error) {
      setQuizzes(q => q.filter(q => q.id !== id));
      toast.success('Quiz deleted successfully');
    } else {
      toast.error('Failed to delete quiz');
    }
  };

  const startGame = async (quizId: string) => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        quiz_id: quizId,
        host_id: user!.id,
        game_pin: pin,
        status: 'waiting',
        current_question_index: 0,
      })
      .select()
      .single();

    if (data && !error) {
      navigate(`/host/session/${data.id}`);
    } else {
      toast.error('Failed to start session');
    }
  };

  const showQuizStats = async (quizId: string) => {
    setSelectedQuizId(quizId);
    setSelectedSessionId(null);
    setSearchQuery('');
    setActiveTab('quizzes');
    setLoadingStats(true);

    const { data: sessions, error } = await supabase
      .from('game_sessions')
      .select('*, players(count)')
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: false });

    if (sessions) {
      setQuizSessions(sessions.map(s => ({
        ...s,
        player_count: s.players?.[0]?.count || 0
      })));
    }
    setActiveTab('quizzes');
    setLoadingStats(false);
  };

  const showSessionLeaderboard = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setLoadingStats(true);

    const { data: players, error } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionId)
      .order('score', { ascending: false });

    if (players) {
      setSessionLeaderboard(players);
    }
    setLoadingStats(false);
  };

  const updateProfile = async () => {
    if (!newName.trim()) return;
    setIsUpdating(true);
    const { error } = await supabase
      .from('profiles')
      .update({ name: newName, avatar_url: newAvatar })
      .eq('user_id', user!.id);

    setIsUpdating(false);
    if (!error) {
      toast.success('Profile updated successfully');
    } else {
      toast.error('Failed to update profile');
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (!error) {
      toast.success('Password reset email sent');
    } else {
      toast.error('Failed to send reset email');
    }
  };

  const filteredQuizzes = quizzes.filter(q =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sidebarItems = [
    { label: 'Dashboard', icon: Trophy, id: 'dashboard' as TabType },
    { label: 'My Quizzes', icon: BookOpen, id: 'quizzes' as TabType },
    { label: 'Settings', icon: Settings, id: 'settings' as TabType },
  ];

  const statCards = [
    { label: 'Quizzes Created', value: stats.quizzes, icon: BookOpen, color: 'indigo' },
    { label: 'Games Hosted', value: stats.sessions, icon: Play, color: 'indigo' },
    { label: 'Players Joined', value: stats.players, icon: Users, color: 'indigo' },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />

      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 glass-card-solid border-r border-[hsl(var(--border))] z-20 flex flex-col p-6">
        <Logo size="sm" className="mb-8" />

        <nav className="flex-1 space-y-1">
          {sidebarItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === item.id
                ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-[hsl(var(--border))] pt-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-base shadow-sm ring-1 ring-primary/30">
              {profile?.avatar_url || profile?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground capitalize">{profile?.role || 'host'}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-sm text-muted-foreground font-medium">Theme</span>
            <ThemeToggle />
          </div>

          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all font-medium"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="ml-64 relative z-10 p-8">

        {/* ----- DASHBOARD TAB ----- */}
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-8 animate-fade-in">
              <div>
                <h1 className="font-outfit text-4xl font-black text-foreground tracking-tight">
                  Dashboard <span className="text-2xl ml-1">🚀</span>
                </h1>
                <p className="text-muted-foreground mt-1 font-medium">
                  Welcome back, <span className="text-primary font-bold">{profile?.name}</span> {profile?.avatar_url || '⚡'}
                </p>
              </div>
              <button
                onClick={() => navigate('/create-quiz')}
                className="btn-storm px-8 py-3.5 rounded-2xl text-white font-bold text-sm flex items-center gap-2 group"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                Create New Quiz
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-10">
              <div
                className="bento-card md:col-span-2 flex flex-col justify-between"
                onClick={() => setActiveTab('quizzes')}
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary/15 text-primary">
                    <BookOpen size={24} />
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-primary/15 text-primary text-[10px] font-black uppercase tracking-widest">
                    Library
                  </div>
                </div>
                <div>
                  <div className="font-outfit text-5xl font-black text-foreground mb-1 tracking-tighter">{stats.quizzes}</div>
                  <div className="text-muted-foreground font-bold text-xs uppercase tracking-widest">Quizzes Created</div>
                </div>
              </div>

              <div
                className="bento-card flex flex-col justify-between"
                style={{ animationDelay: '0.1s' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[hsl(var(--neon-cyan))]/15 text-[hsl(var(--neon-cyan))] mb-8">
                  <Play size={20} />
                </div>
                <div>
                  <div className="font-outfit text-3xl font-black text-foreground mb-1">{stats.sessions}</div>
                  <div className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest">Games Hosted</div>
                </div>
              </div>

              <div
                className="bento-card flex flex-col justify-between"
                style={{ animationDelay: '0.2s' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[hsl(var(--neon-pink))]/15 text-[hsl(var(--neon-pink))] mb-8">
                  <Users size={20} />
                </div>
                <div>
                  <div className="font-outfit text-3xl font-black text-foreground mb-1">{stats.players}</div>
                  <div className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest">Players Joined</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h2 className="font-outfit font-bold text-xl text-foreground">Recent Quizzes</h2>
              <button onClick={() => setActiveTab('quizzes')} className="text-primary text-sm font-semibold hover:underline">View All</button>
            </div>

            <QuizList quizzes={quizzes.slice(0, 3)} loading={loading} onStart={startGame} onDelete={deleteQuiz} onEdit={(id) => navigate(`/create-quiz/${id}`)} onStats={showQuizStats} />
          </div>
        )}

        {/* ----- QUIZZES TAB ----- */}
        {activeTab === 'quizzes' && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-8">
              <h1 className="font-outfit text-3xl font-bold text-foreground">My Quizzes</h1>
              <button
                onClick={() => navigate('/create-quiz')}
                className="btn-storm px-6 py-3 rounded-xl text-white font-semibold text-sm flex items-center gap-2"
              >
                <Plus size={18} /> New Quiz
              </button>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="text"
                placeholder="Search your quizzes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="storm-input w-full py-3 pl-12 pr-4 text-sm"
              />
            </div>

            {selectedQuizId ? (
              <div className="animate-fade-in space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (selectedSessionId) setSelectedSessionId(null);
                        else setSelectedQuizId(null);
                      }}
                      className="p-2 rounded-xl hover:bg-muted/50 text-muted-foreground transition-all"
                    >
                      <ChevronRight size={20} className="rotate-180" />
                    </button>
                    <div>
                      <h2 className="font-outfit text-xl font-bold text-foreground">
                        {selectedSessionId
                          ? `Session Leaderboard`
                          : `Past Sessions: ${quizzes.find(q => q.id === selectedQuizId)?.title}`
                        }
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {selectedSessionId
                          ? `PIN: ${quizSessions.find(s => s.id === selectedSessionId)?.game_pin}`
                          : "Select a session to see detailed results"
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {selectedSessionId ? (
                  <SessionLeaderboard players={sessionLeaderboard} loading={loadingStats} />
                ) : (
                  <SessionList
                    sessions={quizSessions}
                    loading={loadingStats}
                    onSelect={showSessionLeaderboard}
                  />
                )}
              </div>
            ) : (
              <QuizList
                quizzes={filteredQuizzes}
                loading={loading}
                onStart={startGame}
                onDelete={deleteQuiz}
                onEdit={(id) => navigate(`/create-quiz/${id}`)}
                onStats={showQuizStats}
              />
            )}
          </div>
        )}

        {/* ----- SETTINGS TAB ----- */}
        {activeTab === 'settings' && (
          <div className="animate-fade-in max-w-2xl">
            <h1 className="font-outfit text-3xl font-bold text-foreground mb-8">Settings</h1>

            <div className="space-y-6">
              <div className="glass-card-solid p-6 rounded-2xl border border-border">
                <h3 className="font-outfit font-bold text-lg mb-4 text-foreground">Profile Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1.5 ml-1">Display Name</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="storm-input w-full py-3 px-4"
                    />
                  </div>

                  <AvatarSelector
                    selectedAvatar={newAvatar}
                    onSelect={setNewAvatar}
                    className="pt-2"
                  />

                  <button
                    onClick={updateProfile}
                    disabled={isUpdating || (newName === profile?.name && newAvatar === profile?.avatar_url)}
                    className="btn-storm px-6 py-2.5 rounded-lg text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              <div className="glass-card-solid p-6 rounded-2xl border border-border">
                <h3 className="font-outfit font-bold text-lg mb-4 text-foreground">Account Security</h3>
                <p className="text-sm text-muted-foreground mb-4">Want to change your password? We'll send you a secure link to your email.</p>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <AlertCircle size={20} className="text-amber-400" />
                  <p className="text-xs font-medium">Resetting your password will log you out of all sessions.</p>
                </div>
                <button
                  onClick={handlePasswordReset}
                  className="mt-4 px-6 py-2.5 rounded-lg border border-border text-foreground hover:bg-muted/50 transition-all text-sm font-semibold"
                >
                  Request Password Reset
                </button>
              </div>

              <div className="glass-card-solid p-6 rounded-2xl border border-border">
                <h3 className="font-outfit font-bold text-lg mb-4 text-destructive">Danger Zone</h3>
                <p className="text-sm text-muted-foreground mb-4">Logging out will end your current session. You'll need to sign back in with your credentials.</p>
                <button
                  onClick={signOut}
                  className="px-6 py-2.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all text-sm font-semibold flex items-center gap-2"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface QuizListProps {
  quizzes: Quiz[];
  loading: boolean;
  onStart: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onStats: (id: string) => void;
}

const QuizList = ({ quizzes, loading, onStart, onEdit, onDelete, onStats }: QuizListProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="glass-card-solid rounded-2xl border border-dashed border-border p-16 text-center">
        <div className="text-5xl mb-4 text-primary">⚡</div>
        <h3 className="font-outfit font-bold text-lg mb-2 text-foreground">No quizzes found</h3>
        <p className="text-muted-foreground text-sm">Start creating your awesome quizzes!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {quizzes.map((quiz, i) => (
        <div
          key={quiz.id}
          className="bento-card group flex flex-col h-full animate-fade-in"
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-[hsl(var(--neon-pink))] text-white font-outfit font-black text-2xl flex-shrink-0 shadow-lg shadow-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
              {quiz.title[0]}
            </div>
            <div className="flex items-center gap-1.5 translate-x-2 -translate-y-2">
              <button
                onClick={() => onEdit(quiz.id)}
                className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-primary transition-all shadow-sm"
                title="Edit Quiz"
              >
                <Settings size={16} />
              </button>
              <button
                onClick={() => onDelete(quiz.id)}
                className="p-2.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shadow-sm"
                title="Delete Quiz"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 mb-6">
            <h3 className="font-outfit font-black text-xl text-foreground leading-tight group-hover:text-primary transition-colors duration-300 mb-2 truncate">
              {quiz.title}
            </h3>
            <div className="flex flex-wrap gap-2 items-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
              <span className="px-2 py-0.5 rounded-md bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">{quiz.category}</span>
              <span className="flex items-center gap-1"><Zap size={10} className="text-primary" /> {quiz.question_count} Qs</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[hsl(var(--border))] mt-auto">
            <button
              onClick={() => onStats(quiz.id)}
              className="px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-muted-foreground text-sm font-bold hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center gap-2"
            >
              <BarChart2 size={16} /> Stats
            </button>
            <button
              onClick={() => onStart(quiz.id)}
              className="btn-storm px-4 py-2.5 rounded-xl text-white text-sm flex items-center justify-center gap-2"
            >
              <Play size={16} className="fill-white" /> Host
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const SessionList = ({ sessions, loading, onSelect }: { sessions: any[], loading: boolean, onSelect: (id: string) => void }) => {
  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (sessions.length === 0) return (
    <div className="glass-card-solid rounded-2xl border border-dashed border-border p-12 text-center">
      <p className="text-muted-foreground text-sm font-medium">No sessions found for this quiz yet.</p>
    </div>
  );

  return (
    <div className="grid gap-3">
      {sessions.map((session) => (
        <button
          key={session.id}
          onClick={() => onSelect(session.id)}
          className="glass-card-solid p-5 rounded-2xl border border-border hover:border-primary/30 flex items-center justify-between group transition-all"
        >
          <div className="text-left">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-outfit font-bold text-foreground">Session {session.game_pin}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${session.status === 'finished' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                }`}>
                {session.status}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Users size={12} /> {session.player_count} players</span>
              <span>•</span>
              <span>{new Date(session.created_at).toLocaleString()}</span>
            </div>
          </div>
          <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
      ))}
    </div>
  );
};

const SessionLeaderboard = ({ players, loading }: { players: any[], loading: boolean }) => {
  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (players.length === 0) return (
    <div className="glass-card-solid rounded-2xl border border-dashed border-border p-12 text-center">
      <p className="text-muted-foreground text-sm font-medium">No players joined this session.</p>
    </div>
  );

  return (
    <div className="glass-card-solid rounded-3xl overflow-hidden shadow-xl animate-fade-in">
      <div className="bg-[hsl(var(--muted))] border-b border-[hsl(var(--border))] px-6 py-4">
        <div className="grid grid-cols-12 gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest text-left">
          <div className="col-span-1">#</div>
          <div className="col-span-8 text-left">Player</div>
          <div className="col-span-3 text-right">Points</div>
        </div>
      </div>
      <div className="divide-y divide-[hsl(var(--border))]">
        {players.map((player, i) => (
          <div key={player.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="col-span-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-outfit font-black text-sm ${i === 0 ? 'rank-1' :
                i === 1 ? 'rank-2' :
                  i === 2 ? 'rank-3' :
                    'bg-[hsl(var(--muted))] text-muted-foreground'
                }`}>
                {i === 0 ? '👑' : i + 1}
              </div>
            </div>
            <div className="col-span-8 text-left font-bold text-foreground">
              {player.name}
            </div>
            <div className="col-span-3 text-right font-outfit font-black text-primary text-lg">
              {player.score.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;

