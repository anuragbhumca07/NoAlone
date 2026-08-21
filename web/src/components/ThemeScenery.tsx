import { useMemo } from 'react';
import { useTheme } from '../theme';

// Deterministic pseudo-random star field — same layout every render (no
// reshuffling on re-render), cheap to compute, no external assets.
function useStars(count: number) {
  return useMemo(() => {
    let seed = 42;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    return Array.from({ length: count }, () => ({
      top: `${(rand() * 100).toFixed(2)}%`,
      left: `${(rand() * 100).toFixed(2)}%`,
      delay: `${(rand() * 3).toFixed(2)}s`,
      size: rand() > 0.85 ? 3 : 2,
    }));
  }, [count]);
}

export default function ThemeScenery() {
  const { theme } = useTheme();
  const stars = useStars(70);

  return (
    <div className="theme-scenery" aria-hidden="true" data-testid="theme-scenery" data-theme-mood={theme}>
      {theme === 'flower' && (
        <>
          <div className="scenery-blob" style={{ width: 340, height: 340, top: '-8%', left: '-6%', background: 'var(--flower-lavender)' }} />
          <div className="scenery-blob" style={{ width: 260, height: 260, top: '10%', right: '-4%', background: 'var(--flower-blue)', animationDelay: '4s' }} />
          <div className="scenery-blob" style={{ width: 300, height: 300, bottom: '-10%', left: '15%', background: 'var(--flower-yellow)', animationDelay: '8s' }} />
          <div className="scenery-blob" style={{ width: 240, height: 240, bottom: '5%', right: '20%', background: 'var(--flower-green)', animationDelay: '12s' }} />
          <div className="scenery-blob" style={{ width: 200, height: 200, top: '45%', left: '45%', background: 'var(--flower-red)', animationDelay: '16s', opacity: 0.22 }} />
        </>
      )}

      {theme === 'night' && (
        <>
          {stars.map((s, i) => (
            <span
              key={i}
              className="scenery-star"
              style={{ top: s.top, left: s.left, animationDelay: s.delay, width: s.size, height: s.size }}
            />
          ))}
          <div className="scenery-moon" />
        </>
      )}

      {theme === 'sunset' && (
        <>
          <div className="scenery-sun" />
          <div className="scenery-horizon" />
        </>
      )}
    </div>
  );
}
