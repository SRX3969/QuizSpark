import { useEffect, useRef } from 'react';

const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const particles: Array<{
      x: number; y: number; vx: number; vy: number; radius: number; opacity: number; color: string;
      type: 'particle' | 'circle' | 'triangle' | 'square' | 'hex'; size: number; rotation: number; vr: number;
      pulsePhase: number; pulseSpeed: number;
    }> = [];

    const mouse = { x: -1000, y: -1000 };

    const NUM_PARTICLES = 100;
    const COLORS = [
      'rgba(139, 92, 246, ',   // neon purple
      'rgba(0, 220, 255, ',    // neon cyan
      'rgba(255, 60, 172, ',   // neon pink
      'rgba(120, 255, 68, ',   // neon lime
      'rgba(99, 102, 241, ',   // indigo
    ];

    for (let i = 0; i < NUM_PARTICLES; i++) {
      const r = Math.random();
      const type = r > 0.92 ? 'hex' : r > 0.85 ? (['circle', 'triangle', 'square'][Math.floor(Math.random() * 3)] as any) : 'particle';
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        radius: Math.random() * 1.8 + 0.5,
        size: Math.random() * 14 + 5,
        opacity: Math.random() * 0.2 + 0.05,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        type: type,
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.008,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.01 + Math.random() * 0.02,
      });
    }

    const drawHex = (ctx: CanvasRenderingContext2D, size: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const x = Math.cos(angle) * size;
        const y = Math.sin(angle) * size;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw connections with neon glow
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160) {
            const alpha = (1 - dist / 160) * 0.08;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles and shapes
      particles.forEach((p) => {
        p.pulsePhase += p.pulseSpeed;
        const pulseFactor = 1 + Math.sin(p.pulsePhase) * 0.15;
        const currentOpacity = p.opacity * pulseFactor;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = `${p.color}${currentOpacity})`;
        ctx.strokeStyle = `${p.color}${currentOpacity * 0.6})`;
        ctx.lineWidth = 1;

        if (p.type === 'particle') {
          // Glow effect for particles
          ctx.shadowBlur = 8;
          ctx.shadowColor = `${p.color}0.3)`;
          ctx.beginPath();
          ctx.arc(0, 0, p.radius * pulseFactor, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (p.type === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * pulseFactor, 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.type === 'hex') {
          drawHex(ctx, p.size * pulseFactor);
          ctx.stroke();
        } else if (p.type === 'square') {
          const s = p.size * pulseFactor;
          ctx.beginPath();
          ctx.rect(-s / 2, -s / 2, s, s);
          ctx.stroke();
        } else if (p.type === 'triangle') {
          const s = p.size * pulseFactor;
          ctx.beginPath();
          ctx.moveTo(0, -s / 2);
          ctx.lineTo(s / 2, s / 2);
          ctx.lineTo(-s / 2, s / 2);
          ctx.closePath();
          ctx.stroke();
        }
        ctx.restore();

        // Update position
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vr;

        // Mouse reaction — stronger
        const mdx = p.x - mouse.x;
        const mdy = p.y - mouse.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < 120) {
          const force = (120 - mdist) / 120;
          p.vx += (mdx / mdist) * force * 0.03;
          p.vy += (mdy / mdist) * force * 0.03;
        }

        // Damping
        p.vx *= 0.99;
        p.vy *= 0.99;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
      });

      animationId = requestAnimationFrame(draw);
    };

    draw();

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 mesh-bg">
      {/* Neon Blobs */}
      <div
        className="blob w-[900px] h-[900px] -top-72 -left-72"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
          animationDuration: '25s'
        }}
      />
      <div
        className="blob w-[700px] h-[700px] top-1/2 -right-40"
        style={{
          background: 'radial-gradient(circle, rgba(0, 220, 255, 0.10) 0%, rgba(0, 0, 0, 0) 70%)',
          animationDuration: '30s',
          animationDelay: '-5s'
        }}
      />
      <div
        className="blob w-[600px] h-[600px] -bottom-40 left-1/4"
        style={{
          background: 'radial-gradient(circle, rgba(255, 60, 172, 0.08) 0%, rgba(0, 0, 0, 0) 70%)',
          animationDuration: '20s',
          animationDelay: '-8s'
        }}
      />
      <div
        className="blob w-[500px] h-[500px] top-1/4 left-1/3"
        style={{
          background: 'radial-gradient(circle, rgba(120, 255, 68, 0.05) 0%, rgba(0, 0, 0, 0) 70%)',
          animationDuration: '35s',
          animationDelay: '-12s'
        }}
      />
      <div
        className="blob w-[400px] h-[400px] top-2/3 right-1/4"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, rgba(0, 0, 0, 0) 70%)',
          animationDuration: '28s',
          animationDelay: '-15s'
        }}
      />

      {/* Light Beams (Neon) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="absolute h-[1px] w-full"
            style={{
              top: `${15 + i * 22}%`,
              left: '-100%',
              background: i % 2 === 0
                ? 'linear-gradient(to right, transparent, rgba(139, 92, 246, 0.15), transparent)'
                : 'linear-gradient(to right, transparent, rgba(0, 220, 255, 0.10), transparent)',
              animation: `light-streak ${10 + i * 4}s linear infinite`,
              animationDelay: `${i * 3}s`
            }}
          />
        ))}
      </div>

      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-70" />
    </div>
  );
};

export default AnimatedBackground;
