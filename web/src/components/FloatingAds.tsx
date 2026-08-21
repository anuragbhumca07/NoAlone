import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store';

interface AdDef {
  icon: string;
  label: string;
  to: string;
  top: string;
  duration: string;
  delay: string;
}

// Promotes the app's own features as drifting cloud callouts — decorative,
// but genuinely clickable (unlike the rest of the scenery layer). Positions
// and timings are fixed per-slot so clouds don't overlap in an obviously
// synced way, without needing real randomness.
const AUTHED_ADS: AdDef[] = [
  { icon: '🎲', label: 'Meet someone new', to: '/random', top: '14%', duration: '70s', delay: '-5s' },
  { icon: '🤖', label: 'Chat with your AI Buddy', to: '/ai-buddy', top: '58%', duration: '85s', delay: '-30s' },
  { icon: '🏛️', label: 'Explore Rooms', to: '/rooms', top: '30%', duration: '95s', delay: '-60s' },
  { icon: '🎨', label: 'Customize your avatar', to: '/profile', top: '76%', duration: '78s', delay: '-15s' },
  { icon: '📞', label: 'Start a video call', to: '/calls', top: '46%', duration: '90s', delay: '-45s' },
];

const GUEST_ADS: AdDef[] = [
  { icon: '💬', label: 'Real-time messaging', to: '/register', top: '16%', duration: '75s', delay: '-8s' },
  { icon: '🎥', label: 'Free voice & video calls', to: '/register', top: '55%', duration: '88s', delay: '-35s' },
  { icon: '🤖', label: 'An AI buddy, always free', to: '/register', top: '35%', duration: '80s', delay: '-55s' },
];

export default function FloatingAds() {
  const { user } = useAuth();
  const ads = useMemo(() => (user ? AUTHED_ADS : GUEST_ADS), [user]);

  return (
    <div className="floating-ads" data-testid="floating-ads">
      {ads.map((ad) => (
        <Link
          key={ad.label}
          to={ad.to}
          className="ad-cloud"
          style={{ top: ad.top, animationDuration: ad.duration, animationDelay: ad.delay }}
          data-testid={`ad-cloud-${ad.to.replace('/', '')}`}
        >
          <span className="ad-cloud-icon">{ad.icon}</span>
          {ad.label}
        </Link>
      ))}
    </div>
  );
}
