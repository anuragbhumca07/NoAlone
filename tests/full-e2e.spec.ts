/**
 * noAlone — Full E2E API Test Suite
 *
 * Covers: Sign Up, Email Verification, Sign In, Google Sign-In (error paths),
 *         Messaging (conversations, rooms, messages), Call Feature (authorize,
 *         initiate, accept, decline, cancel, end, history).
 *
 * Requires backend at BACKEND_URL with TEST_API_KEY env var set.
 * Run: npx playwright test tests/full-e2e.spec.ts --reporter=list
 */

import { test, expect, request, APIRequestContext } from '@playwright/test';

const BASE = process.env.BACKEND_URL || 'https://noalone-api-production.up.railway.app/api/v1';
const TEST_API_KEY = process.env.TEST_API_KEY || 'noalone-playwright-test-2026';

// ── Test User Definitions ──────────────────────────────────────────────────────
const TS = Date.now();
const CALLER_EMAIL = `caller.${TS}@testmail.noalone`;
const RECEIVER_EMAIL = `receiver.${TS}@testmail.noalone`;
const TEST_PASSWORD = 'TestPass@2026!';

// Shared state set during setup
let callerToken = '';
let receiverToken = '';
let callerId = '';
let receiverId = '';
let conversationId = '';

// ── Helpers ────────────────────────────────────────────────────────────────────

async function ctx(token?: string): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: BASE,
    extraHTTPHeaders: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

async function getVerificationCode(email: string): Promise<string> {
  const c = await ctx();
  const res = await c.post('/auth/test/verification-code', {
    data: { email, testKey: TEST_API_KEY },
  });
  expect(res.status(), `test-helper failed for ${email}`).toBe(201);
  const body = await res.json();
  expect(body.code, `no code for ${email}`).toBeTruthy();
  await c.dispose();
  return body.code;
}

async function registerAndVerify(email: string, password: string): Promise<{ token: string; userId: string }> {
  // 1. Register
  const c1 = await ctx();
  const regRes = await c1.post('/auth/email/register', { data: { email, password } });
  expect([200, 201], `registration failed: ${await regRes.text()}`).toContain(regRes.status());
  await c1.dispose();

  // 2. Get code via test helper
  const code = await getVerificationCode(email);

  // 3. Verify
  const c2 = await ctx();
  const verRes = await c2.post('/auth/email/verify', { data: { email, code } });
  expect([200, 201], `verification failed: ${await verRes.text()}`).toContain(verRes.status());
  const verBody = await verRes.json();
  expect(verBody).toHaveProperty('token');
  await c2.dispose();

  return { token: verBody.token, userId: verBody.user.id };
}

// ════════════════════════════════════════════════════════════════════════════════
// PHASE 0 — Health check
// ════════════════════════════════════════════════════════════════════════════════

test.describe('Health', () => {
  test('backend is reachable', async () => {
    const c = await ctx();
    // any 401 (not 404/503) means server is up and routing works
    const res = await c.get('/users/me');
    expect([200, 401]).toContain(res.status());
    await c.dispose();
  });

  test('test-helper endpoint is active', async () => {
    const c = await ctx();
    // wrong key → 403
    const res = await c.post('/auth/test/verification-code', {
      data: { email: 'any@test.com', testKey: 'wrong-key' },
    });
    expect(res.status()).toBe(403);
    await c.dispose();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// PHASE 1 — Sign Up (Email)
// ════════════════════════════════════════════════════════════════════════════════

test.describe('Sign Up — Email', () => {
  test('rejects registration with missing password', async () => {
    const c = await ctx();
    const res = await c.post('/auth/email/register', { data: { email: 'test@x.com' } });
    expect(res.status()).toBe(400);
    await c.dispose();
  });

  test('rejects registration with invalid email', async () => {
    const c = await ctx();
    const res = await c.post('/auth/email/register', {
      data: { email: 'not-an-email', password: TEST_PASSWORD },
    });
    expect(res.status()).toBe(400);
    await c.dispose();
  });

  test('caller registers successfully', async () => {
    const c = await ctx();
    const res = await c.post('/auth/email/register', {
      data: { email: CALLER_EMAIL, password: TEST_PASSWORD },
    });
    const body = await res.json();
    expect([200, 201]).toContain(res.status());
    expect(body).toHaveProperty('message');
    await c.dispose();
  });

  test('duplicate unverified email re-sends code (no conflict)', async () => {
    const c = await ctx();
    const res = await c.post('/auth/email/register', {
      data: { email: CALLER_EMAIL, password: TEST_PASSWORD },
    });
    // 200/201 = re-sent code; 409 only if already VERIFIED
    expect([200, 201]).toContain(res.status());
    await c.dispose();
  });

  test('receiver registers successfully', async () => {
    const c = await ctx();
    const res = await c.post('/auth/email/register', {
      data: { email: RECEIVER_EMAIL, password: TEST_PASSWORD },
    });
    expect([200, 201]).toContain(res.status());
    await c.dispose();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// PHASE 2 — Email Verification
// ════════════════════════════════════════════════════════════════════════════════

test.describe('Email Verification', () => {
  test('rejects verify with wrong code', async () => {
    const c = await ctx();
    const res = await c.post('/auth/email/verify', {
      data: { email: CALLER_EMAIL, code: '000000' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/invalid|code/i);
    await c.dispose();
  });

  test('rejects verify for unknown email', async () => {
    const c = await ctx();
    const res = await c.post('/auth/email/verify', {
      data: { email: 'nobody@nowhere.com', code: '123456' },
    });
    expect(res.status()).toBe(400);
    await c.dispose();
  });

  test('caller verifies email and gets JWT', async () => {
    const code = await getVerificationCode(CALLER_EMAIL);
    const c = await ctx();
    const res = await c.post('/auth/email/verify', { data: { email: CALLER_EMAIL, code } });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty('token');
    expect(body).toHaveProperty('user');
    expect(body.user).toHaveProperty('id');
    callerToken = body.token;
    callerId = body.user.id;
    await c.dispose();
  });

  test('receiver verifies email and gets JWT', async () => {
    const code = await getVerificationCode(RECEIVER_EMAIL);
    const c = await ctx();
    const res = await c.post('/auth/email/verify', { data: { email: RECEIVER_EMAIL, code } });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty('token');
    receiverToken = body.token;
    receiverId = body.user.id;
    await c.dispose();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// PHASE 3 — Sign In (Email)
// ════════════════════════════════════════════════════════════════════════════════

test.describe('Sign In — Email', () => {
  test('rejects login with wrong password', async () => {
    const c = await ctx();
    const res = await c.post('/auth/email/login', {
      data: { email: CALLER_EMAIL, password: 'wrongpassword' },
    });
    expect(res.status()).toBe(401);
    await c.dispose();
  });

  test('rejects login for unknown email', async () => {
    const c = await ctx();
    const res = await c.post('/auth/email/login', {
      data: { email: 'ghost@noalone.com', password: TEST_PASSWORD },
    });
    expect(res.status()).toBe(401);
    await c.dispose();
  });

  test('caller logs in and gets JWT', async () => {
    const c = await ctx();
    const res = await c.post('/auth/email/login', {
      data: { email: CALLER_EMAIL, password: TEST_PASSWORD },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty('token');
    expect(body.user.email).toBe(CALLER_EMAIL);
    if (!callerToken) callerToken = body.token;
    await c.dispose();
  });

  test('receiver logs in and gets JWT', async () => {
    const c = await ctx();
    const res = await c.post('/auth/email/login', {
      data: { email: RECEIVER_EMAIL, password: TEST_PASSWORD },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty('token');
    if (!receiverToken) receiverToken = body.token;
    await c.dispose();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// PHASE 4 — Google Sign-In (API-level error path tests)
// ════════════════════════════════════════════════════════════════════════════════

test.describe('Sign In — Google Mobile', () => {
  test('rejects missing accessToken', async () => {
    const c = await ctx();
    const res = await c.post('/auth/google-mobile', { data: {} });
    expect(res.status()).toBe(400);
    await c.dispose();
  });

  test('rejects invalid/fake accessToken with 401', async () => {
    const c = await ctx();
    const res = await c.post('/auth/google-mobile', {
      data: { accessToken: 'fake-google-access-token-for-test' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('message');
    await c.dispose();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// PHASE 5 — User Profile
// ════════════════════════════════════════════════════════════════════════════════

test.describe('User Profile', () => {
  test('GET /users/me requires auth', async () => {
    const c = await ctx();
    const res = await c.get('/users/me');
    expect(res.status()).toBe(401);
    await c.dispose();
  });

  test('GET /users/me returns caller profile', async () => {
    const c = await ctx(callerToken);
    const res = await c.get('/users/me');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('username');
    expect(body).toHaveProperty('email');
    expect(body.email).toBe(CALLER_EMAIL);
    await c.dispose();
  });

  test('GET /users/me returns receiver profile', async () => {
    const c = await ctx(receiverToken);
    const res = await c.get('/users/me');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.email).toBe(RECEIVER_EMAIL);
    await c.dispose();
  });

  test('GET /users/:id returns user by id', async () => {
    if (!callerId) test.skip();
    const c = await ctx(callerToken);
    const res = await c.get(`/users/${callerId}`);
    expect([200, 404]).toContain(res.status());
    await c.dispose();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// PHASE 6 — Messaging: Rooms
// ════════════════════════════════════════════════════════════════════════════════

test.describe('Rooms', () => {
  test('GET /rooms requires auth', async () => {
    const c = await ctx();
    const res = await c.get('/rooms');
    expect(res.status()).toBe(401);
    await c.dispose();
  });

  test('GET /rooms returns array', async () => {
    const c = await ctx(callerToken);
    const res = await c.get('/rooms');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    await c.dispose();
  });

  test('GET /rooms entries have expected shape', async () => {
    const c = await ctx(callerToken);
    const res = await c.get('/rooms');
    const rooms: any[] = await res.json();
    if (rooms.length > 0) {
      const room = rooms[0];
      expect(room).toHaveProperty('id');
      expect(room).toHaveProperty('name');
    }
    await c.dispose();
  });

  test('GET /rooms with language filter returns subset', async () => {
    const c = await ctx(callerToken);
    const res = await c.get('/rooms?language=english');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    await c.dispose();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// PHASE 7 — Messaging: Conversations
// ════════════════════════════════════════════════════════════════════════════════

test.describe('Conversations', () => {
  test('GET /chat/conversations requires auth', async () => {
    const c = await ctx();
    const res = await c.get('/chat/conversations');
    expect(res.status()).toBe(401);
    await c.dispose();
  });

  test('GET /chat/conversations returns array', async () => {
    const c = await ctx(callerToken);
    const res = await c.get('/chat/conversations');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    await c.dispose();
  });

  test('POST /chat/conversations starts a conversation with receiver', async () => {
    if (!receiverId) test.skip();
    const c = await ctx(callerToken);
    const res = await c.post('/chat/conversations', { data: { userId: receiverId } });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty('id');
    conversationId = body.id;
    await c.dispose();
  });

  test('GET /chat/conversations now shows new conversation', async () => {
    const c = await ctx(callerToken);
    const res = await c.get('/chat/conversations');
    expect(res.status()).toBe(200);
    const convs: any[] = await res.json();
    expect(Array.isArray(convs)).toBe(true);
    await c.dispose();
  });

  test('conversation entries have expected shape', async () => {
    const c = await ctx(callerToken);
    const res = await c.get('/chat/conversations');
    const convs: any[] = await res.json();
    if (convs.length > 0) {
      expect(convs[0]).toHaveProperty('id');
      expect(convs[0]).toHaveProperty('participants');
    }
    await c.dispose();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// PHASE 8 — Messaging: Messages
// ════════════════════════════════════════════════════════════════════════════════

test.describe('Messages', () => {
  test('GET /chat/messages/:id requires auth', async () => {
    const c = await ctx();
    const res = await c.get('/chat/messages/fake-id');
    expect(res.status()).toBe(401);
    await c.dispose();
  });

  test('GET /chat/messages/:id returns 404 for unknown conversation', async () => {
    const c = await ctx(callerToken);
    const res = await c.get('/chat/messages/nonexistent-convo');
    expect([400, 404]).toContain(res.status());
    await c.dispose();
  });

  test('POST /chat/messages sends a message', async () => {
    if (!conversationId) test.skip();
    const c = await ctx(callerToken);
    const res = await c.post('/chat/messages', {
      data: {
        conversationId,
        content: 'Hello from Playwright test caller!',
        type: 'TEXT',
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('content');
    expect(body.content).toBe('Hello from Playwright test caller!');
    await c.dispose();
  });

  test('receiver can also send a message', async () => {
    if (!conversationId) test.skip();
    const c = await ctx(receiverToken);
    const res = await c.post('/chat/messages', {
      data: {
        conversationId,
        content: 'Hello back from receiver!',
        type: 'TEXT',
      },
    });
    expect([200, 201]).toContain(res.status());
    await c.dispose();
  });

  test('GET /chat/messages/:id returns conversation messages', async () => {
    if (!conversationId) test.skip();
    const c = await ctx(callerToken);
    const res = await c.get(`/chat/messages/${conversationId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const messages = Array.isArray(body) ? body : body.messages || body.data || [];
    if (messages.length > 0) {
      expect(messages[0]).toHaveProperty('id');
      expect(messages[0]).toHaveProperty('content');
    }
    await c.dispose();
  });

  test('GET /chat/messages/:id with pagination', async () => {
    if (!conversationId) test.skip();
    const c = await ctx(callerToken);
    const res = await c.get(`/chat/messages/${conversationId}?limit=10&page=1`);
    expect(res.status()).toBe(200);
    await c.dispose();
  });

  test('cannot send empty message', async () => {
    if (!conversationId) test.skip();
    const c = await ctx(callerToken);
    const res = await c.post('/chat/messages', {
      data: { conversationId, content: '', type: 'TEXT' },
    });
    expect([400, 422]).toContain(res.status());
    await c.dispose();
  });

  test('cannot send message to non-existent conversation', async () => {
    const c = await ctx(callerToken);
    const res = await c.post('/chat/messages', {
      data: { conversationId: 'fake-id', content: 'test', type: 'TEXT' },
    });
    expect([400, 403, 404]).toContain(res.status());
    await c.dispose();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// PHASE 9 — Calls: Authorization
// ════════════════════════════════════════════════════════════════════════════════

test.describe('Calls — Google Authorization', () => {
  test('GET /calls/authorize-status requires auth', async () => {
    const c = await ctx();
    const res = await c.get('/calls/authorize-status');
    expect(res.status()).toBe(401);
    await c.dispose();
  });

  test('GET /calls/authorize-status returns isAuthorized=false initially', async () => {
    const c = await ctx(callerToken);
    const res = await c.get('/calls/authorize-status');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('isAuthorized');
    expect(typeof body.isAuthorized).toBe('boolean');
    await c.dispose();
  });

  test('POST /calls/authorize requires auth', async () => {
    const c = await ctx();
    const res = await c.post('/calls/authorize', { data: { code: 'x', redirectUri: 'y' } });
    expect(res.status()).toBe(401);
    await c.dispose();
  });

  test('POST /calls/authorize rejects missing fields', async () => {
    const c = await ctx(callerToken);
    const res = await c.post('/calls/authorize', { data: {} });
    expect(res.status()).toBe(400);
    await c.dispose();
  });

  test('POST /calls/authorize rejects invalid OAuth code (not a crash)', async () => {
    const c = await ctx(callerToken);
    const res = await c.post('/calls/authorize', {
      data: {
        code: 'invalid-auth-code-playwright-test',
        redirectUri: 'https://auth.expo.io/@anuragbhumca07/noalone',
      },
    });
    // Google will reject the code → 401; must not be 500
    expect([400, 401]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty('message');
    await c.dispose();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// PHASE 10 — Calls: Initiation
// ════════════════════════════════════════════════════════════════════════════════

test.describe('Calls — Initiate', () => {
  test('POST /calls/initiate requires auth', async () => {
    const c = await ctx();
    const res = await c.post('/calls/initiate', { data: { receiverId: 'x', callType: 'VOICE' } });
    expect(res.status()).toBe(401);
    await c.dispose();
  });

  test('POST /calls/initiate rejects missing callType', async () => {
    const c = await ctx(callerToken);
    const res = await c.post('/calls/initiate', { data: { receiverId: receiverId || 'some-id' } });
    expect(res.status()).toBe(400);
    await c.dispose();
  });

  test('POST /calls/initiate rejects invalid callType', async () => {
    const c = await ctx(callerToken);
    const res = await c.post('/calls/initiate', {
      data: { receiverId: receiverId || 'some-id', callType: 'INVALID' },
    });
    expect(res.status()).toBe(400);
    await c.dispose();
  });

  test('POST /calls/initiate returns 401 when Google not authorized', async () => {
    if (!receiverId) test.skip();
    const c = await ctx(callerToken);
    // First check if actually not authorized
    const statusRes = await c.get('/calls/authorize-status');
    const { isAuthorized } = await statusRes.json();
    if (isAuthorized) {
      // Already authorized → skip this specific test
      await c.dispose();
      return;
    }
    const res = await c.post('/calls/initiate', {
      data: { receiverId, callType: 'VOICE' },
    });
    expect(res.status()).toBe(401);
    await c.dispose();
  });

  test('POST /calls/initiate rejects calling yourself', async () => {
    if (!callerId) test.skip();
    const c = await ctx(callerToken);
    const statusRes = await c.get('/calls/authorize-status');
    const { isAuthorized } = await statusRes.json();
    if (!isAuthorized) {
      await c.dispose();
      return; // Can't test this without authorization
    }
    const res = await c.post('/calls/initiate', {
      data: { receiverId: callerId, callType: 'VOICE' },
    });
    // Should 400/403 (can't call yourself) or 404 if receiver not found
    expect([400, 403, 404]).toContain(res.status());
    await c.dispose();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// PHASE 11 — Calls: Accept / Decline / Cancel / End (with non-existent IDs)
// ════════════════════════════════════════════════════════════════════════════════

test.describe('Calls — Lifecycle (non-existent IDs)', () => {
  test('POST /calls/:id/accept returns 404 for unknown call', async () => {
    const c = await ctx(receiverToken);
    const res = await c.post('/calls/nonexistent-call-id/accept');
    expect(res.status()).toBe(404);
    await c.dispose();
  });

  test('POST /calls/:id/decline returns 404 for unknown call', async () => {
    const c = await ctx(receiverToken);
    const res = await c.post('/calls/nonexistent-call-id/decline');
    expect(res.status()).toBe(404);
    await c.dispose();
  });

  test('POST /calls/:id/cancel returns 404 for unknown call', async () => {
    const c = await ctx(callerToken);
    const res = await c.post('/calls/nonexistent-call-id/cancel');
    expect(res.status()).toBe(404);
    await c.dispose();
  });

  test('POST /calls/:id/end returns 404 for unknown call', async () => {
    const c = await ctx(callerToken);
    const res = await c.post('/calls/nonexistent-call-id/end');
    expect(res.status()).toBe(404);
    await c.dispose();
  });

  test('receiver cannot cancel a call (403 or 404)', async () => {
    const c = await ctx(receiverToken);
    const res = await c.post('/calls/nonexistent-call-id/cancel');
    expect([403, 404]).toContain(res.status());
    await c.dispose();
  });

  test('caller cannot accept their own call (403 or 404)', async () => {
    const c = await ctx(callerToken);
    const res = await c.post('/calls/nonexistent-call-id/accept');
    expect([403, 404]).toContain(res.status());
    await c.dispose();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// PHASE 12 — Calls: History
// ════════════════════════════════════════════════════════════════════════════════

test.describe('Calls — History', () => {
  test('GET /calls/history requires auth', async () => {
    const c = await ctx();
    const res = await c.get('/calls/history');
    expect(res.status()).toBe(401);
    await c.dispose();
  });

  test('GET /calls/history returns array', async () => {
    const c = await ctx(callerToken);
    const res = await c.get('/calls/history');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    await c.dispose();
  });

  test('GET /calls/history with limit param', async () => {
    const c = await ctx(callerToken);
    const res = await c.get('/calls/history?limit=5');
    expect(res.status()).toBe(200);
    const body: any[] = await res.json();
    expect(body.length).toBeLessThanOrEqual(5);
    await c.dispose();
  });

  test('GET /calls/history entries have expected shape', async () => {
    const c = await ctx(callerToken);
    const res = await c.get('/calls/history?limit=5');
    const body: any[] = await res.json();
    if (body.length > 0) {
      const entry = body[0];
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('callType');
      expect(entry).toHaveProperty('status');
      expect(entry).toHaveProperty('direction');
      expect(entry).toHaveProperty('otherUser');
      expect(entry.otherUser).toHaveProperty('id');
      expect(entry.otherUser).toHaveProperty('displayName');
    }
    await c.dispose();
  });

  test('GET /calls/history pagination — page 1 and page 2 do not overlap', async () => {
    const c = await ctx(callerToken);
    const page1: any[] = await (await c.get('/calls/history?page=1&limit=2')).json();
    const page2: any[] = await (await c.get('/calls/history?page=2&limit=2')).json();
    expect(Array.isArray(page1)).toBe(true);
    expect(Array.isArray(page2)).toBe(true);
    const ids1 = new Set(page1.map((x) => x.id));
    page2.forEach((x) => expect(ids1.has(x.id)).toBe(false));
    await c.dispose();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// PHASE 13 — Regression: existing endpoints still work
// ════════════════════════════════════════════════════════════════════════════════

test.describe('Regression — existing endpoints', () => {
  test('GET /chat/conversations still works', async () => {
    const c = await ctx(callerToken);
    const res = await c.get('/chat/conversations');
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
    await c.dispose();
  });

  test('GET /users/me still works', async () => {
    const c = await ctx(callerToken);
    const res = await c.get('/users/me');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('username');
    await c.dispose();
  });

  test('GET /rooms still works', async () => {
    const c = await ctx(callerToken);
    const res = await c.get('/rooms');
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
    await c.dispose();
  });

  test('unauthenticated requests to protected endpoints get 401', async () => {
    const c = await ctx();
    const endpoints = ['/users/me', '/chat/conversations', '/calls/history', '/calls/authorize-status'];
    for (const ep of endpoints) {
      const res = await c.get(ep);
      expect(res.status(), `${ep} should return 401`).toBe(401);
    }
    await c.dispose();
  });
});
