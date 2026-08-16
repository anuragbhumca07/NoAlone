import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import AvatarBuilder from '../components/AvatarBuilder';
import UserAvatar from '../components/UserAvatar';
import { defaultAvatar, type AvatarConfig, type AvatarGender } from '../avatar';

interface AiMessage {
  id: string;
  role: 'USER' | 'AI';
  content: string;
  createdAt: string;
}

export default function AiBuddy() {
  const [name, setName] = useState('Alex');
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(defaultAvatar());
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [companion, msgs] = await Promise.all([api.getAiCompanion(), api.getAiMessages()]);
        setName(companion.name);
        const outfit = companion.outfit || {};
        setAvatarConfig({ ...defaultAvatar(companion.gender === 'MALE' ? 'BOY' : 'GIRL'), ...outfit });
        setMessages(msgs);
        setCustomizing(msgs.length === 0);
      } catch {
        /* fall back to defaults */
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, typing]);

  const saveCustomization = async () => {
    setSaveMsg(null);
    try {
      const gender = avatarConfig.gender === 'BOY' ? 'MALE' : 'FEMALE';
      await api.updateAiCompanion({ name, gender, outfit: avatarConfig });
      setSaveMsg('Saved!');
      // Give the confirmation a moment on screen before returning to chat —
      // switching views in the same tick would unmount it unseen.
      setTimeout(() => setCustomizing(false), 700);
    } catch (e: any) {
      setSaveMsg(e?.message || 'Could not save');
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText('');
    const tempId = `local-${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, role: 'USER', content, createdAt: new Date().toISOString() }]);
    setTyping(true);
    try {
      const res = await api.sendAiMessage(content);
      // A brief pause makes the reply feel considered rather than instant/robotic.
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempId),
        res.userMessage,
        res.aiMessage,
      ]);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setTyping(false);
    }
  };

  if (!loaded) return null;

  return (
    <div data-testid="ai-buddy-page">
      <div className="ai-hero">
        <UserAvatar name={name} avatarConfig={avatarConfig} size="lg" />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{name}</div>
          <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Your AI buddy — always here to chat.</div>
        </div>
        <button className="ghost" onClick={() => setCustomizing((c) => !c)} data-testid="ai-customize-toggle">
          {customizing ? 'Back to chat' : '🎨 Customize'}
        </button>
      </div>

      {customizing ? (
        <div className="card" style={{ maxWidth: 680 }} data-testid="ai-customize-panel">
          <label>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            data-testid="ai-name-input"
          />
          <div style={{ marginTop: 8 }}>
            <AvatarBuilder config={avatarConfig} onChange={setAvatarConfig} />
          </div>
          {saveMsg && <div className="ok" data-testid="ai-save-message">{saveMsg}</div>}
          <button onClick={saveCustomization} style={{ marginTop: 16 }} data-testid="ai-save">
            Save {name}
          </button>
        </div>
      ) : (
        <div className="thread" data-testid="ai-chat">
          <div className="messages" ref={scrollRef} data-testid="ai-messages">
            {messages.length === 0 && (
              <div className="empty">Say hi to {name} — they're always free to chat.</div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`bubble ${m.role === 'USER' ? 'mine' : ''}`} data-testid="ai-message">
                <div>{m.content}</div>
              </div>
            ))}
            {typing && (
              <div className="bubble" data-testid="ai-typing-indicator">
                <span className="ai-typing"><span /><span /><span /></span>
              </div>
            )}
          </div>
          <form className="composer" onSubmit={send}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Message ${name}…`}
              data-testid="ai-composer-input"
            />
            <button type="submit" disabled={!text.trim()} data-testid="ai-composer-send">Send</button>
          </form>
        </div>
      )}
    </div>
  );
}
