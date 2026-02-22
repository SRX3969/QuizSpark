import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Zap, Users, Tv } from 'lucide-react';
import AnimatedBackground from '@/components/AnimatedBackground';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';

import { ThemeToggle } from '@/components/ThemeToggle';

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'host' | 'player'>('host');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      } else {
        navigate('/dashboard');
      }
    } else {
      if (!name.trim()) { setError('Name is required'); setLoading(false); return; }
      const { error } = await signUp(email, password, name, role);
      if (error) {
        setError(error.message);
      } else {
        setMessage('Check your email to confirm your account, then sign in!');
        setIsLogin(true);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden transition-colors duration-300">
      <AnimatedBackground />

      {/* Top absolute ThemeToggle */}
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md px-4 animate-fade-in">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        {/* Card */}
        <div className="glass-card-solid p-8 shadow-xl rounded-3xl">
          <h2 className="font-outfit text-3xl font-bold text-center mb-2 tracking-tight text-foreground">
            {isLogin ? 'Welcome Back' : 'Join the Storm'}
          </h2>
          <p className="text-muted-foreground text-center text-sm mb-6 font-medium">
            {isLogin ? 'Sign in to your account' : 'Start your journey with us'}
          </p>

          {/* Role selector (signup only) */}
          {!isLogin && (
            <div className="flex gap-3 mb-6">
              <button
                type="button"
                onClick={() => setRole('host')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-300 border ${role === 'host'
                  ? 'border-primary text-primary bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.2)]'
                  : 'border-[hsl(var(--border))] text-muted-foreground hover:border-primary/50'
                  }`}
              >
                <Tv size={16} /> Host
              </button>
              <button
                type="button"
                onClick={() => setRole('player')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-300 border ${role === 'player'
                  ? 'border-primary text-primary bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.2)]'
                  : 'border-[hsl(var(--border))] text-muted-foreground hover:border-primary/50'
                  }`}
              >
                <Users size={16} /> Player
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your awesome name"
                  className="storm-input w-full px-4 py-3 text-sm"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="storm-input w-full px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="storm-input w-full px-4 py-3 pr-12 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl animate-fade-in font-medium">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 text-sm px-4 py-3 rounded-xl animate-fade-in font-medium">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-storm w-full py-3.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Zap size={16} className="fill-white" />
                  {isLogin ? 'Sign In' : 'Create Account'}
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-6">
            <span className="text-muted-foreground text-sm">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); setMessage(''); }}
              className="text-primary font-bold text-sm hover:underline transition-colors"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </div>

        {/* Join as guest */}
        <div className="text-center mt-4">
          <button
            onClick={() => navigate('/join')}
            className="text-muted-foreground text-sm font-medium hover:text-primary transition-colors"
          >
            Join a game as guest →
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
