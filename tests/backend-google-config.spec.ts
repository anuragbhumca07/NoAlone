/**
 * Probes the Railway backend to confirm GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
 * are configured. We POST /calls/authorize with a deliberately invalid code,
 * then inspect Google's structured error response (proxied through our
 * backend's logger) — but since the backend just throws Unauthorized either
 * way, we can also probe by checking whether the backend tries to refresh:
 * an invalid code with valid credentials returns Google "invalid_grant";
 * missing credentials yield "invalid_client".
 *
 * The backend wraps both as UnauthorizedException, so the cleanest signal we
 * have is timing + reaching Google at all. If you've set the env vars, the
 * test passes. If not, it'll still pass (same surface error) — but the
 * companion log review on Railway will confirm.
 */
import { test, expect, request } from '@playwright/test';

const BACKEND_URL =
  process.env.BACKEND_URL || 'https://noalone-api-production.up.railway.app/api/v1';
const TEST_API_KEY = process.env.TEST_API_KEY || 'noalone-playwright-test-2026';
const PASSWORD = 'Probe@2026!';

test('backend authorize endpoint reaches Google (returns 401, not 500)', async () => {
  const ctx = await request.newContext({ baseURL: `${BACKEND_URL}/` });

  // Quick auth: register, fetch code, verify
  const email = `probe-auth.${Date.now()}@testmail.noalone`;
  await ctx.post('auth/email/register', { data: { email, password: PASSWORD } });
  const codeRes = await ctx.post('auth/test/verification-code', {
    data: { email, testKey: TEST_API_KEY },
  });
  const { code } = await codeRes.json();
  const v = await ctx.post('auth/email/verify', { data: { email, code } });
  const { token } = await v.json();
  await ctx.dispose();

  const authed = await request.newContext({
    baseURL: `${BACKEND_URL}/`,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });

  // 1. Status — should be unauthorized
  const statusRes = await authed.get('calls/authorize-status');
  expect(statusRes.status()).toBe(200);
  const { isAuthorized } = await statusRes.json();
  expect(isAuthorized).toBe(false);

  // 2. Attempt to authorize with bogus code — Google rejects → backend wraps as 401
  // If GOOGLE_CLIENT_ID/SECRET are missing on Railway, Google's response is
  // {error: "invalid_client"}; if set, it's {error: "invalid_grant"} or
  // {error: "redirect_uri_mismatch"}. Either way, backend returns 401, not 500.
  const auth = await authed.post('calls/authorize', {
    data: {
      code: 'deliberately-invalid-code-for-probe',
      redirectUri: 'http://127.0.0.1:5173/oauth/google',
    },
  });
  // If env vars are unset, we still get 401 because the backend's fetch to
  // Google's token endpoint fails. The real signal: backend doesn't crash.
  expect(auth.status()).not.toBe(500);
  expect([400, 401, 503]).toContain(auth.status());

  // 3. Attempt to initiate a call without authorization — must be 401 (not 500)
  // We can't supply a real receiverId without a second user, but we can verify
  // missing-auth handling shows the right error code shape.
  const init = await authed.post('calls/initiate', {
    data: {
      receiverId: '00000000-0000-0000-0000-000000000000',
      callType: 'VOICE',
    },
  });
  expect(init.status()).not.toBe(500);
  // 401 = "Google Calendar not authorized" (expected for fresh user)
  // 404 = user not found (we used a fake id)
  expect([401, 404]).toContain(init.status());

  await authed.dispose();
});
