import { useEffect, useState } from 'react';
import { api } from '../api';
import { auth, useAuth } from '../store';

const GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as const;

export default function Profile() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    username: '',
    displayName: '',
    bio: '',
    age: '' as string | number,
    gender: '' as string,
    language: 'en',
    interests: '' as string,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await api.getMe();
        setForm({
          username: me.username || '',
          displayName: me.displayName || '',
          bio: me.bio || '',
          age: me.age ?? '',
          gender: me.gender || '',
          language: me.language || 'en',
          interests: (me.interests || []).join(', '),
        });
        auth.setUser({ ...(user || {}), ...me } as any);
      } catch (e: any) {
        setErr(e?.message || 'Could not load profile');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const patch: any = {
        username: form.username,
        displayName: form.displayName,
        bio: form.bio || undefined,
        language: form.language || undefined,
        interests: form.interests
          ? form.interests.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
      };
      if (form.age !== '' && form.age !== null) patch.age = Number(form.age);
      if (form.gender) patch.gender = form.gender;

      const updated = await api.updateMe(patch);
      auth.setUser({ ...(user || {}), ...updated } as any);
      setMsg('Profile saved.');
    } catch (e: any) {
      setErr(e?.message || 'Save failed');
    } finally { setBusy(false); }
  };

  return (
    <div data-testid="profile-page">
      <h2 style={{ marginTop: 0 }}>Your profile</h2>
      <p style={{ color: 'var(--text-dim)' }}>This is how other people see you.</p>

      <form onSubmit={save} className="card" style={{ maxWidth: 640 }}>
        <div className="row" style={{ marginBottom: 16 }}>
          <div className="avatar lg">{(form.displayName || '?').slice(0, 1).toUpperCase()}</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{form.displayName || 'Unnamed'}</div>
            <div style={{ color: 'var(--text-dim)' }}>@{form.username || ''}</div>
          </div>
        </div>

        <label>Username</label>
        <input
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          required
          data-testid="profile-username"
        />

        <label>Display name</label>
        <input
          value={form.displayName}
          onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
          required
          data-testid="profile-display-name"
        />

        <label>Bio</label>
        <textarea
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          rows={3}
          data-testid="profile-bio"
          placeholder="Tell people about yourself."
        />

        <div className="row" style={{ gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label>Age</label>
            <input
              type="number"
              min={13}
              max={100}
              value={form.age}
              onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
              data-testid="profile-age"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>Gender</label>
            <select
              value={form.gender}
              onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
              data-testid="profile-gender"
            >
              <option value="">—</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>{g.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <label>Language</label>
        <input
          value={form.language}
          onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
          data-testid="profile-language"
        />

        <label>Interests (comma-separated)</label>
        <input
          value={form.interests}
          onChange={(e) => setForm((f) => ({ ...f, interests: e.target.value }))}
          data-testid="profile-interests"
          placeholder="music, travel, gaming"
        />

        {msg && <div className="ok" data-testid="profile-saved">{msg}</div>}
        {err && <div className="err" data-testid="profile-error">{err}</div>}

        <button type="submit" disabled={busy} style={{ marginTop: 16 }} data-testid="profile-save">
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
