import { useEffect, useRef, useState } from 'react';

// A small curated set — no external emoji-data package, keeps the bundle
// lean and avoids a network fetch just to open a picker.
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: 'Smileys',
    emojis: ['😀', '😂', '🥰', '😍', '😘', '😉', '😊', '🙂', '😅', '🤣', '😎', '🤩', '🥳', '😇', '🙃', '😜', '🤔', '😴', '🥺', '😭'],
  },
  {
    label: 'Gestures',
    emojis: ['👍', '👎', '👏', '🙌', '🙏', '👋', '🤝', '💪', '✌️', '🤞', '👌', '🤙', '🫶', '💯'],
  },
  {
    label: 'Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💞', '💓', '💗', '💖', '💘'],
  },
  {
    label: 'Fun',
    emojis: ['🎉', '✨', '🔥', '⭐', '🌟', '💫', '🎶', '🎂', '🎁', '🍕', '☕', '🍿', '🌸', '🌙', '☀️', '🌈'],
  },
];

export default function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="ghost"
        onClick={() => setOpen((o) => !o)}
        data-testid="emoji-picker-toggle"
        title="Emoji"
      >
        😊
      </button>
      {open && (
        <div className="emoji-picker" data-testid="emoji-picker">
          {EMOJI_GROUPS.map((g) => (
            <div key={g.label}>
              <div className="emoji-picker-label">{g.label}</div>
              <div className="emoji-picker-grid">
                {g.emojis.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className="emoji-picker-btn"
                    onClick={() => { onPick(e); setOpen(false); }}
                    data-testid={`emoji-${e}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
