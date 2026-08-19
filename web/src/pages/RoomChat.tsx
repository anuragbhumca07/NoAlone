import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../store';
import { getSocket } from '../socket';
import UserAvatar from '../components/UserAvatar';
import type { Message, Room } from '../types';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function RoomChat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [roomData, msgs] = await Promise.all([api.getRoom(id), api.getRoomMessages(id)]);
        setRoom(roomData);
        setMessages([...msgs].reverse());
      } catch (e: any) {
        setErr(e?.message || 'Could not load room');
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!id || !token) return;
    const socket = getSocket(token);
    if (!socket) return;

    socket.emit('room:join', { roomId: id });

    const onMessage = (msg: Message) => {
      if (msg.roomId !== id) return;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    };

    // Member payloads are just {userId} — refetch the room for the full
    // member list (avatar/display name) rather than trying to merge partials.
    const refreshMembers = () => { api.getRoom(id).then(setRoom).catch(() => {}); };

    socket.on('room:message_new', onMessage);
    socket.on('room:user_joined', refreshMembers);
    socket.on('room:user_left', refreshMembers);
    return () => {
      socket.off('room:message_new', onMessage);
      socket.off('room:user_joined', refreshMembers);
      socket.off('room:user_left', refreshMembers);
      socket.emit('room:leave', { roomId: id });
    };
  }, [id, token]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !id || !token) return;
    const socket = getSocket(token);
    socket?.emit('room:message', { roomId: id, content: text.trim(), type: 'TEXT' });
    setText('');
  };

  const leave = async () => {
    if (!id) return;
    try {
      await api.leaveRoom(id);
      navigate('/rooms');
    } catch (e: any) {
      setErr(e?.message || 'Could not leave room');
    }
  };

  const myMembership = room?.members?.find((m) => m.userId === user?.id);
  const canGoLive = myMembership?.role === 'owner' || myMembership?.role === 'moderator';

  const toggleLive = async () => {
    if (!id || !room) return;
    try {
      const updated = await api.setRoomLive(id, !room.isLive);
      setRoom((r) => (r ? { ...r, isLive: updated.isLive } : r));
    } catch (e: any) {
      setErr(e?.message || 'Could not update room');
    }
  };

  return (
    <div className="thread" data-testid="room-chat-page">
      <div className="thread-header">
        <div className="row">
          <button className="ghost" onClick={() => navigate('/rooms')} data-testid="back-to-rooms">←</button>
          <div className="avatar">{room?.name?.slice(0, 1).toUpperCase() || '?'}</div>
          <div>
            <div style={{ fontWeight: 600 }}>{room?.name || 'Room'}</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              {room?._count?.members ?? 0} members {room?.isLive ? '· ● live' : ''}
            </div>
          </div>
        </div>
        <div className="row">
          {canGoLive && (
            <button className="ghost" onClick={toggleLive} data-testid="room-toggle-live">
              {room?.isLive ? 'End live' : 'Go live'}
            </button>
          )}
          <button className="ghost" onClick={() => setShowMembers((s) => !s)} data-testid="room-members-toggle">
            👥 Members
          </button>
          <button className="danger" onClick={leave} data-testid="room-leave">Leave</button>
        </div>
      </div>

      {err && <div className="err" style={{ margin: '8px 16px 0' }}>{err}</div>}

      {showMembers && (
        <div className="card" style={{ margin: '8px 16px 0' }} data-testid="room-members-list">
          {room?.members?.map((m) => (
            <div key={m.id} className="row" style={{ marginBottom: 6 }}>
              <UserAvatar name={m.user?.displayName} avatarConfig={m.user?.avatarConfig} />
              <span>{m.user?.displayName}</span>
              {m.role !== 'member' && <span className="tag">{m.role}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="messages" ref={scrollRef} data-testid="room-messages">
        {messages.length === 0 && <div className="empty">No messages yet. Say hello.</div>}
        {messages.map((m) => {
          const mine = m.senderId === user?.id;
          return (
            <div key={m.id} className={`bubble ${mine ? 'mine' : ''}`} data-testid="room-message">
              {!mine && <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{m.sender?.displayName}</div>}
              <div>{m.content}</div>
              <div className="bubble-meta">
                <span>{formatTime(m.createdAt)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <form className="composer" onSubmit={send}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message the room…"
          data-testid="room-composer-input"
        />
        <button type="submit" disabled={!text.trim()} data-testid="room-composer-send">Send</button>
      </form>
    </div>
  );
}
