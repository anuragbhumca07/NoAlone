import { useEffect, useState } from 'react';
import { api } from '../api';
import { auth, useAuth } from '../store';
import { supabase } from '../supabaseClient';
import { RINGTONE_NAMES, getRingtonePreference, setRingtonePreference, startRingtone, type RingtoneName } from '../sounds';

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

  const [ringtone, setRingtone] = useState<RingtoneName>(getRingtonePreference());
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await api.getMe();
        if (cancelled) return;
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
        if (!cancelled) setErr(e?.message || 'Could not load profile');
      }
    })();
    return () => { cancelled = true; };
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

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    setPwErr(null);
    if (newPassword.length < 8) {
      setPwErr('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwErr('Passwords do not match.');
      return;
    }
    setPwBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPwMsg('Password updated.');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (e: any) {
      setPwErr(e?.message || 'Could not update password');
    } finally { setPwBusy(false); }
  };

  const changeRingtone = (name: RingtoneName) => {
    setRingtone(name);
    setRingtonePreference(name);
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

      <form onSubmit={changePassword} className="card" style={{ maxWidth: 640, marginTop: 24 }} data-testid="change-password-card">
        <h3 style={{ marginTop: 0 }}>Change password</h3>

        <label>New password <span style={{ color: 'var(--text-dim)' }}>(min 8 chars)</span></label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          data-testid="change-password-new"
        />

        <label>Confirm new password</label>
        <input
          type="password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          required
          data-testid="change-password-confirm"
        />

        {pwMsg && <div className="ok" data-testid="change-password-saved">{pwMsg}</div>}
        {pwErr && <div className="err" data-testid="change-password-error">{pwErr}</div>}

        <button type="submit" disabled={pwBusy} style={{ marginTop: 16 }} data-testid="change-password-submit">
          {pwBusy ? 'Updating…' : 'Update password'}
        </button>
      </form>

      <div className="card" style={{ maxWidth: 640, marginTop: 24 }} data-testid="ringtone-card">
        <h3 style={{ marginTop: 0 }}>Ringtone</h3>
        <p style={{ color: 'var(--text-dim)', marginTop: 0, fontSize: 13 }}>
          Played when someone calls you.
        </p>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {RINGTONE_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              className={ringtone === name ? '' : 'ghost'}
              onClick={() => changeRingtone(name)}
              data-testid={`ringtone-${name}`}
              style={{ textTransform: 'capitalize' }}
            >
              {name}
            </button>
          ))}
          <button
            type="button"
            className="ghost"
            onClick={() => { const stop = startRingtone(ringtone); setTimeout(stop, 1800); }}
            data-testid="ringtone-preview"
          >
            ▶ Preview
          </button>
        </div>
      </div>
    </div>
  );
}
