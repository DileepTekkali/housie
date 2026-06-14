import { useMemo } from 'react';

// Decorative floating housie balls drifting behind the content.
const PALETTE = ['#fbbf24', '#a78bfa', '#f472b6', '#38bdf8', '#34d399'];

export default function AnimatedBackground() {
  const balls = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 8; i++) {
      arr.push({
        n: Math.ceil(Math.random() * 90),
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 36 + Math.random() * 54,
        delay: -Math.random() * 7,
        duration: 7 + Math.random() * 5,
        color: PALETTE[i % PALETTE.length],
        opacity: 0.1 + Math.random() * 0.12,
      });
    }
    return arr;
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {balls.map((b, i) => (
        <div
          key={i}
          className="absolute flex animate-float items-center justify-center rounded-full font-display font-bold text-ink"
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            width: b.size,
            height: b.size,
            fontSize: b.size * 0.36,
            opacity: b.opacity,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
            background: `radial-gradient(circle at 35% 28%, #ffffff 0%, ${b.color} 70%)`,
          }}
        >
          {b.n}
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink/40" />
    </div>
  );
}
