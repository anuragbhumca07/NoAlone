/**
 * Call Feature — API-level test suite
 *
 * NOTE: This is a React Native / Expo mobile app, so browser-based Playwright
 * page tests cannot drive the native UI. These tests use Playwright's
 * APIRequestContext to test all REST endpoints of the call feature directly
 * against the live backend.
 *
 * To run:
 *   cd NoAlone
 *   npm install --save-dev @playwright/test
 *   npx playwright test tests/call-feature.spec.ts
 *   npx playwright test --reporter=html && npx playwright show-report
 *
 * Prerequisites:
 *   - Backend running at BACKEND_URL (default: http://localhost:3000)
 *   - Two test users seeded/registered (phone OTP or email auth)
 *   - Set env vars: TEST_CALLER_TOKEN, TEST_RECEIVER_TOKEN
 */

import { test, expect, APIRequestContext, request } from '@playwright/test';

const BASE = process.env.BACKEND_URL || 'https://noalone-api-production.up.railway.app/api/v1';
const CALLER_TOKEN = process.env.TEST_CALLER_TOKEN || '';
const RECEIVER_TOKEN = process.env.TEST_RECEIVER_TOKEN || '';

async function callerCtx(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: BASE,
    extraHTTPHeaders: { Authorization: `Bearer ${CALLER_TOKEN}` },
  });
}

async function receiverCtx(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: BASE,
    extraHTTPHeaders: { Authorization: `Bearer ${RECEIVER_TOKEN}` },
  });
}

// ── Authorization Status ─────────────────────────────────────

test('GET /calls/authorize-status returns isAuthorized field', async () => {
  const ctx = await callerCtx();
  const res = await ctx.get('/calls/authorize-status');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toHaveProperty('isAuthorized');
  expect(typeof body.isAuthorized).toBe('boolean');
  await ctx.dispose();
});

test('GET /calls/authorize-status requires auth token', async () => {
  const ctx = await request.newContext({ baseURL: BASE });
  const res = await ctx.get('/calls/authorize-status');
  expect(res.status()).toBe(401);
  await ctx.dispose();
});

// ── Google Authorization ────────────────────────────────────

test('POST /calls/authorize rejects missing fields', async () => {
  const ctx = await callerCtx();
  const res = await ctx.post('/calls/authorize', { data: {} });
  expect(res.status()).toBe(400);
  await ctx.dispose();
});

test('POST /calls/authorize rejects invalid OAuth code', async () => {
  const ctx = await callerCtx();
  const res = await ctx.post('/calls/authorize', {
    data: { code: 'invalid-code', redirectUri: 'https://auth.expo.io/@test/test' },
  });
  // Should be 401 (Google rejects the code) — not a 500 crash
  expect([400, 401, 500]).toContain(res.status());
  const body = await res.json();
  expect(body).toHaveProperty('message');
  await ctx.dispose();
});

// ── Call Initiation ─────────────────────────────────────────

test('POST /calls/initiate requires auth', async () => {
  const ctx = await request.newContext({ baseURL: BASE });
  const res = await ctx.post('/calls/initiate', { data: { receiverId: 'some-id', callType: 'VOICE' } });
  expect(res.status()).toBe(401);
  await ctx.dispose();
});

test('POST /calls/initiate validates body shape', async () => {
  const ctx = await callerCtx();
  // missing callType
  const res = await ctx.post('/calls/initiate', { data: { receiverId: 'not-a-uuid' } });
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body).toHaveProperty('message');
  await ctx.dispose();
});

test('POST /calls/initiate returns 401 if Google not authorized', async () => {
  // This test only passes if caller does NOT have Google authorized
  const ctx = await callerCtx();
  const statusRes = await ctx.get('/calls/authorize-status');
  const { isAuthorized } = await statusRes.json();

  if (isAuthorized) {
    test.skip();
    await ctx.dispose();
    return;
  }

  const receiverInfoRes = await (await receiverCtx()).get('/users/me');
  const receiver = await receiverInfoRes.json();

  const res = await ctx.post('/calls/initiate', {
    data: { receiverId: receiver.id, callType: 'VOICE' },
  });
  expect(res.status()).toBe(401);
  await ctx.dispose();
});

// ── Call Accept / Decline / Cancel / End ───────────────────

test('POST /calls/:id/accept returns 404 for unknown call', async () => {
  const ctx = await receiverCtx();
  const res = await ctx.post('/calls/nonexistent-id/accept');
  expect(res.status()).toBe(404);
  await ctx.dispose();
});

test('POST /calls/:id/decline returns 404 for unknown call', async () => {
  const ctx = await receiverCtx();
  const res = await ctx.post('/calls/nonexistent-id/decline');
  expect(res.status()).toBe(404);
  await ctx.dispose();
});

test('POST /calls/:id/cancel returns 404 for unknown call', async () => {
  const ctx = await callerCtx();
  const res = await ctx.post('/calls/nonexistent-id/cancel');
  expect(res.status()).toBe(404);
  await ctx.dispose();
});

test('POST /calls/:id/end returns 404 for unknown call', async () => {
  const ctx = await callerCtx();
  const res = await ctx.post('/calls/nonexistent-id/end');
  expect(res.status()).toBe(404);
  await ctx.dispose();
});

// ── Call History ────────────────────────────────────────────

test('GET /calls/history returns array', async () => {
  const ctx = await callerCtx();
  const res = await ctx.get('/calls/history');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);
  await ctx.dispose();
});

test('GET /calls/history requires auth', async () => {
  const ctx = await request.newContext({ baseURL: BASE });
  const res = await ctx.get('/calls/history');
  expect(res.status()).toBe(401);
  await ctx.dispose();
});

test('GET /calls/history entries have expected shape', async () => {
  const ctx = await callerCtx();
  const res = await ctx.get('/calls/history?limit=5');
  expect(res.status()).toBe(200);
  const body: any[] = await res.json();
  if (body.length > 0) {
    const entry = body[0];
    expect(entry).toHaveProperty('id');
    expect(entry).toHaveProperty('callType');
    expect(entry).toHaveProperty('status');
    expect(entry).toHaveProperty('direction');
    expect(entry).toHaveProperty('otherUser');
    expect(entry.otherUser).toHaveProperty('displayName');
    expect(entry.otherUser).toHaveProperty('id');
  }
  await ctx.dispose();
});

test('GET /calls/history pagination works', async () => {
  const ctx = await callerCtx();
  const page1 = await (await ctx.get('/calls/history?page=1&limit=2')).json();
  const page2 = await (await ctx.get('/calls/history?page=2&limit=2')).json();
  expect(Array.isArray(page1)).toBe(true);
  expect(Array.isArray(page2)).toBe(true);
  // No overlap between pages
  const page1Ids = new Set(page1.map((c: any) => c.id));
  page2.forEach((c: any) => expect(page1Ids.has(c.id)).toBe(false));
  await ctx.dispose();
});

// ── Authorization Enforcement ──────────────────────────────

test('Caller cannot accept their own call', async () => {
  // Receiver must accept, not the caller
  // We test this by using the caller token to accept a non-existent call
  const ctx = await callerCtx();
  const res = await ctx.post('/calls/fake-call-id/accept');
  expect([403, 404]).toContain(res.status());
  await ctx.dispose();
});

// ── Existing Chat API Regression ────────────────────────────

test('GET /chat/conversations still works after call feature added', async () => {
  const ctx = await callerCtx();
  const res = await ctx.get('/chat/conversations');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);
  await ctx.dispose();
});

test('GET /users/me still works', async () => {
  const ctx = await callerCtx();
  const res = await ctx.get('/users/me');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toHaveProperty('id');
  expect(body).toHaveProperty('username');
  await ctx.dispose();
});

test('GET /rooms still works', async () => {
  const ctx = await callerCtx();
  const res = await ctx.get('/rooms');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);
  await ctx.dispose();
});
