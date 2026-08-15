// Lightweight synthesized sound effects via the Web Audio API — no binary
// audio assets to ship/license. Ringtones are short melodic patterns that
// loop while a call rings; the message ping is a single soft blip.

type Step = { freq: number; duration: number; gap?: number };

export const RINGTONE_NAMES = ['classic', 'chime', 'pulse'] as const;
export type RingtoneName = (typeof RINGTONE_NAMES)[number];

const RINGTONE_PATTERNS: Record<RingtoneName, Step[]> = {
  classic: [
    { freq: 880, duration: 0.25 }, { freq: 0, duration: 0.1 },
    { freq: 880, duration: 0.25 }, { freq: 0, duration: 0.6 },
  ],
  chime: [
    { freq: 659, duration: 0.15 }, { freq: 784, duration: 0.15 },
    { freq: 988, duration: 0.3 }, { freq: 0, duration: 0.5 },
  ],
  pulse: [
    { freq: 523, duration: 0.12 }, { freq: 0, duration: 0.08 },
    { freq: 523, duration: 0.12 }, { freq: 0, duration: 0.08 },
    { freq: 523, duration: 0.12 }, { freq: 0, duration: 0.5 },
  ],
};

const RINGTONE_KEY = 'noalone_ringtone';

export function getRingtonePreference(): RingtoneName {
  const stored = localStorage.getItem(RINGTONE_KEY);
  return (RINGTONE_NAMES as readonly string[]).includes(stored || '') ? (stored as RingtoneName) : 'classic';
}

export function setRingtonePreference(name: RingtoneName) {
  localStorage.setItem(RINGTONE_KEY, name);
}

let sharedCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') sharedCtx = new Ctor();
  return sharedCtx;
}

function playStep(ctx: AudioContext, step: Step, startTime: number) {
  if (step.freq <= 0) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = step.freq;
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.2, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + step.duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + step.duration + 0.02);
}

/** Starts looping a ringtone pattern; call the returned function to stop it. */
export function startRingtone(name: RingtoneName = getRingtonePreference()): () => void {
  const ctx = getCtx();
  if (!ctx) return () => {};
  const pattern = RINGTONE_PATTERNS[name] || RINGTONE_PATTERNS.classic;
  const patternDuration = pattern.reduce((sum, s) => sum + s.duration + (s.gap || 0), 0);
  let stopped = false;
  let loopTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleLoop = () => {
    if (stopped) return;
    const now = ctx.currentTime;
    let t = now;
    for (const step of pattern) {
      playStep(ctx, step, t);
      t += step.duration + (step.gap || 0);
    }
    loopTimer = setTimeout(scheduleLoop, patternDuration * 1000);
  };
  scheduleLoop();

  return () => {
    stopped = true;
    if (loopTimer) clearTimeout(loopTimer);
  };
}

/** A single soft two-note "pop" for new-message notifications. */
export function playMessagePing() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  playStep(ctx, { freq: 740, duration: 0.08 }, now);
  playStep(ctx, { freq: 988, duration: 0.12 }, now + 0.09);
}
