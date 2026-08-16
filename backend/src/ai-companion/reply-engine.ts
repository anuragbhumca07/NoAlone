// A lightweight, fully local rule-based conversational engine — no external
// API key required. Good enough to keep someone company between real
// matches; not a substitute for a real LLM, but self-contained and free.

export interface ReplyContext {
  companionName: string;
  userName: string;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function matchesAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

export function generateReply(rawMessage: string, ctx: ReplyContext): string {
  const text = rawMessage.trim().toLowerCase();
  const { companionName, userName } = ctx;

  if (!text) {
    return pick(["Say something — I'm listening 🙂", "You there? Type whatever's on your mind."]);
  }

  if (matchesAny(text, ['hi', 'hello', 'hey', 'yo ', 'sup'])) {
    return pick([
      `Hey ${userName}! I'm ${companionName} — how's your day going?`,
      `Hiii! Good to see you. What's up?`,
      `Hey there 👋 what brings you here today?`,
    ]);
  }

  if (matchesAny(text, ['how are you', 'how r u', "how're you", 'how u doing'])) {
    return pick([
      "I'm doing great, thanks for asking! How about you?",
      "Pretty good! Just here, ready to chat. You?",
      "Can't complain — talking to you is the highlight of my day 😊 How are you?",
    ]);
  }

  if (matchesAny(text, ['your name', 'who are you', 'what are you'])) {
    return pick([
      `I'm ${companionName}, your noAlone buddy — here whenever no one else is free to chat.`,
      `Name's ${companionName}! I'm an AI, but I'm genuinely happy to talk while you wait for a real match.`,
    ]);
  }

  if (matchesAny(text, ['my name is', "i'm called", 'call me'])) {
    return pick([
      `Nice to meet you! I'll remember that.`,
      `Got it — good to know! What made you want to chat today?`,
    ]);
  }

  if (matchesAny(text, ['lonely', 'alone', 'bored', 'no one', 'nobody'])) {
    return pick([
      "You're not alone right now — I'm here! Want to tell me about your day?",
      "I get it, waiting for a match can be quiet. I'm happy to keep you company in the meantime.",
      "That's exactly why I'm here. What's been on your mind lately?",
    ]);
  }

  if (matchesAny(text, ['thank', 'thanks', 'thx'])) {
    return pick(["Anytime! 😊", "Of course — that's what I'm here for.", "You're welcome!"]);
  }

  if (matchesAny(text, ['bye', 'goodbye', 'see you', 'later', 'gtg'])) {
    return pick([
      "See you soon! I'll be here whenever you want to chat again.",
      "Bye for now! Hope you find someone great to talk to. 👋",
    ]);
  }

  if (matchesAny(text, ['love you', 'i love', 'like you', 'cute', 'pretty', 'handsome', 'beautiful'])) {
    return pick([
      "Aww, that's sweet of you to say! 🥰",
      "Haha, you're making me blush — well, if AIs could blush.",
      "That's kind! Tell me something about yourself.",
    ]);
  }

  if (matchesAny(text, ['stupid', 'dumb', 'shut up', 'hate you', 'annoying'])) {
    return pick([
      "Fair enough — I'm not perfect. Want to talk about something else?",
      "Noted! What would you rather chat about?",
    ]);
  }

  if (matchesAny(text, ['joke', 'funny', 'make me laugh'])) {
    return pick([
      "Why don't skeletons fight each other? They don't have the guts. 💀",
      "I told my computer I needed a break, and now it won't stop sending me vacation ads.",
      "Why did the developer go broke? Because they used up all their cache.",
    ]);
  }

  if (matchesAny(text, ['weather'])) {
    return pick([
      "I don't have a window to look out of, but I hope it's nice where you are!",
      "No idea what it's like outside for you — tell me, is it nice today?",
    ]);
  }

  if (matchesAny(text, ['what do you do', 'what can you do'])) {
    return "I'm just here to chat when things are quiet — ask me anything, or tell me about your day.";
  }

  if (text.endsWith('?')) {
    return pick([
      "Good question! Honestly not sure, but what do you think?",
      "Hmm, that's interesting to think about — what made you ask?",
      "I'd love to hear your take on that first.",
    ]);
  }

  // Generic fallback — mirror + follow-up, classic conversational technique.
  return pick([
    "That's interesting — tell me more about that.",
    "I hear you. What else is going on with you today?",
    "Got it! What's something fun that happened to you recently?",
    "Makes sense. What are you up to right now?",
    "Oh nice! I'd love to hear more.",
  ]);
}
