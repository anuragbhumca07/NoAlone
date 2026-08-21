import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../store';
import ThemeScenery from '../components/ThemeScenery';
import ThemeToggle from '../components/ThemeToggle';

const FEATURES = [
  {
    icon: '💬',
    title: 'Real-time conversations',
    body: 'Instant messaging that feels alive — typing indicators, read receipts, and delivery in milliseconds.',
  },
  {
    icon: '📞',
    title: 'Voice & video, one tap away',
    body: 'Jump straight into a Google Meet call from any conversation. No extra apps, no friction.',
  },
  {
    icon: '🧭',
    title: 'Meet people worth talking to',
    body: 'Search by interest and language, see who is online right now, and start a chat in seconds.',
  },
  {
    icon: '🔒',
    title: 'Private by default',
    body: 'Block and report tools, verified profiles, and auth handled by Supabase — your data stays yours.',
  },
];

export default function Home() {
  const { token } = useAuth();
  if (token) return <Navigate to="/chats" replace />;

  return (
    <div className="landing" data-testid="home-page">
      <ThemeScenery />
      <div className="landing-glow landing-glow-a" aria-hidden="true" />
      <div className="landing-glow landing-glow-b" aria-hidden="true" />

      <nav className="landing-nav">
        <div className="brand">noAlone</div>
        <div className="row" style={{ gap: 10 }}>
          <ThemeToggle />
          <Link to="/login" data-testid="home-cta-login">
            <button className="ghost">Sign in</button>
          </Link>
          <Link to="/register" data-testid="home-cta-register">
            <button>Get started free</button>
          </Link>
        </div>
      </nav>

      <header className="landing-hero">
        <div className="landing-hero-copy">
          <span className="landing-badge">● Live now — real people, real time</span>
          <h1 className="hero-title">
            Never chat <span className="hero-title-accent">alone</span> again.
          </h1>
          <p className="hero-sub">
            noAlone connects you with people worth talking to — instant messaging,
            one-tap voice &amp; video calls, and a community built to keep you company.
          </p>
          <div className="hero-ctas">
            <Link to="/register" data-testid="home-hero-register">
              <button style={{ padding: '14px 28px', fontSize: 16 }}>Create your account</button>
            </Link>
            <Link to="/login" data-testid="home-hero-login">
              <button className="ghost" style={{ padding: '14px 28px', fontSize: 16 }}>
                I already have one
              </button>
            </Link>
          </div>
          <div className="hero-trust">No credit card. No spam. Just conversation.</div>
        </div>

        <div className="hero-preview" aria-hidden="true">
          <div className="preview-card">
            <div className="preview-header">
              <div className="avatar">A</div>
              <div>
                <div style={{ fontWeight: 700 }}>Amara</div>
                <div className="chip online" style={{ marginTop: 2 }}>online</div>
              </div>
            </div>
            <div className="preview-messages">
              <div className="bubble">Hey! Free for a quick call later?</div>
              <div className="bubble mine">Always 😄 what time works?</div>
              <div className="bubble">How about 7pm your time?</div>
            </div>
            <div className="preview-call-bar">
              <span>📞 Voice call</span>
              <span>🎥 Video call</span>
            </div>
          </div>
        </div>
      </header>

      <section className="features-grid" data-testid="home-features">
        {FEATURES.map((f) => (
          <div className="feature-card" key={f.title}>
            <div className="feature-icon">{f.icon}</div>
            <div className="feature-title">{f.title}</div>
            <div className="feature-body">{f.body}</div>
          </div>
        ))}
      </section>

      <section className="cta-band">
        <div>
          <div className="cta-band-title">Ready when you are.</div>
          <div className="cta-band-sub">Set up your profile in under a minute.</div>
        </div>
        <Link to="/register">
          <button style={{ padding: '14px 28px', fontSize: 16 }}>Get started free</button>
        </Link>
      </section>

      <footer className="landing-footer">
        <div className="brand" style={{ fontSize: 18 }}>noAlone</div>
        <div>© {new Date().getFullYear()} noAlone. Built for connection.</div>
      </footer>
    </div>
  );
}
