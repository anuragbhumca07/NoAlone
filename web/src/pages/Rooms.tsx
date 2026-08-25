import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Room } from '../types';

export default function Rooms() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [mine, setMine] = useState<Room[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [all, myRooms] = await Promise.all([api.listRooms(), api.myRooms()]);
      setRooms(all);
      setMine(myRooms);
    } catch (e: any) {
      setErr(e?.message || 'Could not load rooms');
    }
  };

  useEffect(() => { load(); }, []);

  const myRoomIds = new Set(mine.map((r) => r.id));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const room = await api.createRoom({ name: name.trim(), topic: topic.trim() || undefined });
      navigate(`/rooms/${room.id}`);
    } catch (e: any) {
      setErr(e?.message || 'Could not create room');
    } finally { setBusy(false); }
  };

  const enter = async (room: Room) => {
    setErr(null);
    try {
      if (!myRoomIds.has(room.id)) await api.joinRoom(room.id);
      navigate(`/rooms/${room.id}`);
    } catch (e: any) {
      setErr(e?.message || 'Could not join room');
    }
  };

  return (
    <div data-testid="rooms-page">
      <div className="spread" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Rooms</h2>
        <button onClick={() => setCreating((c) => !c)} data-testid="rooms-create-toggle">
          {creating ? 'Cancel' : '+ New room'}
        </button>
      </div>
      <p style={{ color: 'var(--text-dim)', marginTop: 0 }}>
        Public group chats — jump into a topic and talk with everyone in the room.
      </p>

      {err && <div className="err" data-testid="rooms-error">{err}</div>}

      {creating && (
        <form onSubmit={create} className="card" style={{ maxWidth: 480, marginBottom: 24 }} data-testid="rooms-create-form">
          <label>Room name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} data-testid="rooms-create-name" placeholder="Late night chill zone" />
          <label>Topic (optional)</label>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={40} data-testid="rooms-create-topic" placeholder="music" />
          <button type="submit" disabled={busy || !name.trim()} style={{ marginTop: 16 }} data-testid="rooms-create-submit">
            {busy ? 'Creating…' : 'Create & enter'}
          </button>
        </form>
      )}

      {rooms.length === 0 && <div className="empty" data-testid="no-rooms">No rooms yet — start one.</div>}

      <div data-testid="rooms-list">
        {rooms.map((room) => (
          <div key={room.id} className="list-item" data-testid={`room-${room.id}`} onClick={() => enter(room)}>
            <div className="avatar">{room.name.slice(0, 1).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>
                {room.name}
                {myRoomIds.has(room.id) && <span className="tag" style={{ marginLeft: 8 }}>joined</span>}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                {room.topic ? `#${room.topic} · ` : ''}{room._count?.members ?? 0} member{room._count?.members === 1 ? '' : 's'}
              </div>
            </div>
            {room.isLive && <span className="chip online">● live</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
