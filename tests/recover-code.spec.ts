/**
 * Verifies POST /auth/email/recover-code: a registered-but-unverified user
 * can fetch their own pending verification code by proving they know the
 * password they registered with. This is the user-facing escape hatch when
 * the verification email is silently dropped by Resend.
 */
import { test, expect, request } from '@playwright/test';

const BACKEND_URL =
  process.env.BACKEND_URL || 'https://noalone-api-production.up.railway.app/api/v1';
const PASSWORD = 'Recover@2026!';

test('register → recover-code → verify completes the journey without email', async () => {
  const ctx = await request.newContext({ baseURL: `${BACKEND_URL}/` });
  const email = `recover.${Date.now()}@testmail.noalone`;

  // 1. Register — backend should succeed even if Resend silently drops the email
  const reg = await ctx.post('auth/email/register', {
    data: { email, password: PASSWORD },
  });
  expect([200, 201]).toContain(reg.status());

  // 2. Recovery with wrong password → 401
  const wrongPw = await ctx.post('auth/email/recover-code', {
    data: { email, password: 'wrong-password-here' },
  });
  expect(wrongPw.status()).toBe(401);

  // 3. Recovery with unknown email → 401
  const wrongEmail = await ctx.post('auth/email/recover-code', {
    data: { email: `nobody.${Date.now()}@nowhere.example`, password: PASSWORD },
  });
  expect(wrongEmail.status()).toBe(401);

  // 4. Recovery with correct credentials → returns the pending code
  const ok = await ctx.post('auth/email/recover-code', {
    data: { email, password: PASSWORD },
  });
  expect(ok.status()).toBe(201);
  const okBody = await ok.json();
  expect(okBody.code).toMatch(/^\d{6}$/);

  // 5. Verify with that code → returns JWT + user
  const verify = await ctx.post('auth/email/verify', {
    data: { email, code: okBody.code },
  });
  expect([200, 201]).toContain(verify.status());
  const v = await verify.json();
  expect(v).toHaveProperty('token');
  expect(v.user.email).toBe(email);

  // 6. After verification, recover-code refuses ("Email already verified")
  const afterVerify = await ctx.post('auth/email/recover-code', {
    data: { email, password: PASSWORD },
  });
  expect(afterVerify.status()).toBe(400);
  const afterBody = await afterVerify.json();
  expect(String(afterBody.message)).toMatch(/already verified/i);

  await ctx.dispose();
});

test('recover-code requires both email and password', async () => {
  const ctx = await request.newContext({ baseURL: `${BACKEND_URL}/` });

  // Missing password
  let r = await ctx.post('auth/email/recover-code', { data: { email: 'a@b.com' } });
  expect(r.status()).toBe(400);

  // Missing email
  r = await ctx.post('auth/email/recover-code', { data: { password: 'whatever' } });
  expect(r.status()).toBe(400);

  // Invalid email shape
  r = await ctx.post('auth/email/recover-code', {
    data: { email: 'not-an-email', password: PASSWORD },
  });
  expect(r.status()).toBe(400);

  await ctx.dispose();
});
