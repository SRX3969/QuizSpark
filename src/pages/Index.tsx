import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AnimatedBackground from '@/components/AnimatedBackground';
import Logo from '@/components/Logo';
import { Zap, Play, Layout, Trophy } from 'lucide-react';

import { ThemeToggle } from '@/components/ThemeToggle';

const Index = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  useEffect(() => {
    if (user && profile) {git add index.html
git commit - m "fix: resolve vite build path for vercel"
git push origin main

      navigate('/dashboard');
    }
  }, [user, profile, navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden transition-colors duration-300">
      <AnimatedBackground />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5">
        <Logo size="md" />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => navigate('/join')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-[hsl(var(--border))] text-muted-foreground hover:border-primary/50 hover:text-primary transition-all duration-300"
          >
            Join Game
          </button>
          <button
            onClick={() => navigate('/auth')}
            className="btn-storm px-5 py-2.5 rounded-xl text-sm text-white"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-12 pb-20">
        {/* Lightning badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-primary/30 text-primary text-sm font-semibold mb-8 animate-fade-in">
          <Zap size={14} className="fill-current" />
          The Ultimate Real-time Quiz Platform
        </div>

        <h1 className="font-outfit text-5xl md:text-7xl lg:text-9xl font-black leading-tight mb-6 animate-slide-up tracking-tighter" style={{ animationDelay: '0.1s' }}>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#8B5CF6] via-[#FF3CAC] to-[#00DCFF]">
            QuizSpark
          </span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          The ultimate real-time quiz battle platform for college students.
          <br />
          Create, compete, and conquer — all in lightning speed.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <button
            onClick={() => navigate('/auth')}
            className="btn-storm px-8 py-4 rounded-xl text-base text-white font-semibold"
          >
            🎮 Host a Quiz
          </button>
          <button
            onClick={() => navigate('/join')}
            className="px-8 py-4 rounded-xl text-base font-semibold border border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 transition-all duration-300"
          >
            ⚡ Join a Game
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-8 md:gap-16 mt-16 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          {[
            { label: 'Active Players', value: '10K+' },
            { label: 'Quizzes Created', value: '5K+' },
            { label: 'Games Played', value: '50K+' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-outfit text-3xl md:text-4xl font-black text-primary" style={{ textShadow: '0 0 20px hsl(var(--primary) / 0.3)' }}>
                {stat.value}
              </div>
              <div className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="mt-20 w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: <Zap className="text-[hsl(var(--neon-cyan))]" />, title: 'Real-time Battles', desc: 'Live multiplayer quiz sessions with instant leaderboard updates' },
            { icon: <Layout className="text-[hsl(var(--neon-pink))]" />, title: 'Create Quizzes', desc: 'Build custom quizzes with unlimited questions, timers, and categories' },
            { icon: <Trophy className="text-[hsl(var(--neon-lime))]" />, title: 'Compete & Win', desc: 'Earn points, climb leaderboards, and become the QuizSpark champion' },
          ].map((feat, i) => (
            <div
              key={feat.title}
              className="bento-card p-8 text-center animate-slide-up"
              style={{ animationDelay: `${0.6 + i * 0.1}s` }}
            >
              <div className="flex justify-center mb-4">{feat.icon}</div>
              <h3 className="font-outfit font-bold text-lg mb-2 text-foreground">{feat.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[hsl(var(--border))] py-6 text-center text-muted-foreground text-sm flex flex-col items-center">
        <Logo size="sm" showText={true} className="justify-center mb-2" />
        <p className="mb-6">© 2026 QuizSpark. Built for the next generation.</p>

        <div className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-[hsl(var(--border))] bg-background/50 backdrop-blur-sm hover:border-primary/50 transition-colors duration-300">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Powered by</span>
          <span className="font-outfit font-black text-foreground tracking-wider text-base" style={{ textShadow: '0 0 15px hsl(var(--foreground)/0.3)' }}>
            SHYN
          </span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
