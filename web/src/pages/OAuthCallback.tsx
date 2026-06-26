import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { auth } from '../store';

/**
 * Handles two Google OAuth scenarios:
 *  - state=signin → uses the access token to sign into noAlone
 *  - state=calls  → exchanges the authorization code for Calendar tokens
 * The OAuth client must be a Web client with http://localhost:5173/oauth/google
 * listed as an Authorized redirect URI.
 */
export default function OAuthCallback() {
  const navigate = useNavigate();
  const [msg, setMsg] = useState('Completing sign-in…');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(location.search);
    const state = hash.get('state') || query.get('state');
    const accessToken = hash.get('access_token');
    const code = query.get('code');

    (async () => {
      try {
        if (state === 'calls' && code) {
          await api.authorizeCalls(code, `${location.origin}/oauth/google`);
          setMsg('Google Calendar authorized. Redirecting…');
          setTimeout(() => navigate('/calls'), 800);
          return;
        }
        if (accessToken) {
          const res = await api.googleSignIn(accessToken);
          auth.setSession(res.token, res.user);
          setMsg('Signed in. Redirecting…');
          setTimeout(() => navigate('/chats'), 600);
          return;
        }
        setErr('No OAuth response found in URL.');
      } catch (e: any) {
        setErr(e?.message || 'OAuth failed');
      }
    })();
  }, [navigate]);

  return (
    <div className="center-screen">
      <div className="card auth-card" data-testid="oauth-callback">
        {err ? <div className="err">{err}</div> : <div>{msg}</div>}
      </div>
    </div>
  );
}
