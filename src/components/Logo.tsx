// Premium QuizSpark Logo Component — Dark Neon Theme

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: 16, text: 'text-lg', wrapper: 'w-7 h-7' },
  md: { icon: 22, text: 'text-2xl', wrapper: 'w-10 h-10' },
  lg: { icon: 32, text: 'text-4xl', wrapper: 'w-14 h-14' },
  xl: { icon: 48, text: 'text-6xl', wrapper: 'w-20 h-20' },
};

const Logo = ({ size = 'md', showText = true, className = '' }: LogoProps) => {
  const s = sizes[size];
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`${s.wrapper} rounded-xl flex items-center justify-center relative group`}
      >
        {/* Neon Glow Background */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[hsl(270,95%,65%)] via-[hsl(330,100%,60%)] to-[hsl(185,100%,55%)] opacity-30 blur-lg group-hover:opacity-60 transition-opacity duration-500 rounded-xl" />

        {/* Logo Container */}
        <div className="w-full h-full rounded-xl bg-[hsl(230,25%,12%)] border border-[rgba(139,92,246,0.3)] backdrop-blur-sm shadow-lg flex items-center justify-center relative overflow-hidden">
          {/* Internal Gradient Mesh */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.3),transparent)]" />

          <svg
            width={s.icon}
            height={s.icon}
            viewBox="0 0 24 24"
            fill="none"
            className="relative z-10 drop-shadow-md"
          >
            <defs>
              <linearGradient id="logo-bolt" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="50%" stopColor="#FF3CAC" />
                <stop offset="100%" stopColor="#00DCFF" />
              </linearGradient>
            </defs>
            <path
              d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
              fill="url(#logo-bolt)"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="0.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {showText && (
        <div className="flex flex-col -gap-1">
          <span
            className={`font-outfit font-black ${s.text} tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-[#8B5CF6] via-[#FF3CAC] to-[#00DCFF]`}
          >
            QuizSpark
          </span>
          <div className="h-[2px] w-full bg-gradient-to-r from-[#8B5CF6] via-[#FF3CAC] to-transparent opacity-50 rounded-full" />
        </div>
      )}
    </div>
  );
};

export default Logo;
