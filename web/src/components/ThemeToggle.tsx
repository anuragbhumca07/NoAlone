import { useTheme, type Theme } from '../theme';

const OPTIONS: { value: Theme; icon: string; label: string }[] = [
  { value: 'flower', icon: '🌸', label: 'Flower' },
  { value: 'night', icon: '🌙', label: 'Night' },
  { value: 'sunset', icon: '🌅', label: 'Sunset' },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="theme-switcher" data-testid="theme-switcher">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          className={theme === o.value ? 'active' : ''}
          onClick={() => setTheme(o.value)}
          data-testid={`theme-${o.value}`}
          title={o.label}
          aria-label={o.label}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}
