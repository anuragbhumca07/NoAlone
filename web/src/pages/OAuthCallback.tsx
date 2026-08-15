import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { auth } from '../store';
import { supabase } from '../supabaseClient';

/**
 * Handles the redirect back from Supabase's Google OAuth flow. supabase-js
 * v2 defaults to the PKCE flow, which returns a `?code=` query param that
 * must be explicitly exchanged for a session — it is not auto-detected the
 * way the older implicit `#access_token` flow was. We handle both shapes.
 */
export default function OAuthCallback() {
  const navigate = useNavigate();
  const [msg, setMsg] = useState('Completing sign-in…');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Surface any error Supabase put back on the URL (?error_description=...)
        const query = new URLSearchParams(location.search);
        const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
        const oauthError = query.get('error_description') || hash.get('error_description');
        if (oauthError) throw new Error(oauthError);

        const code = query.get('code');
        let session = null;

        if (code) {
          // PKCE flow (default in supabase-js v2)
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          session = data.session;
        } else {
          // Implicit flow fallback (#access_token in the hash) — supabase-js
          // auto-detects this on load, so just wait for it to land.
          let { data } = await supabase.auth.getSession();
          if (!data.session) {
            await new Promise((r) => setTimeout(r, 400));
            ({ data } = await supabase.auth.getSession());
          }
          session = data.session;
        }

        if (!session) throw new Error('No OAuth session found in URL.');

        const res = await api.supabaseSync(session.access_token);
        if (cancelled) return;
        auth.setSession(res.token, res.user);
        setMsg('Signed in. Redirecting…');
        setTimeout(() => navigate('/chats'), 500);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'OAuth failed');
      }
    })();

    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="center-screen">
      <div className="card auth-card" data-testid="oauth-callback">
        {err ? <div className="err">{err}</div> : <div>{msg}</div>}
      </div>
    </div>
  );
}
