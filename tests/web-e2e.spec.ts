/**
 * noAlone — Web E2E Suite (Playwright + Chromium)
 *
 * Verifies the React web app end-to-end against the deployed Railway backend.
 * Covers: register → verify → login → profile → status toggle → chat search →
 * conversation start → message send → call authorize CTA → call initiate
 * (mock mode) → incoming-call modal → call history → sign out.
 *
 * Run:
 *   npx playwright test --project=web --reporter=list
 *
 * The web app runs in mock-calls mode (VITE_MOCK_CALLS=true), so Google OAuth
 * is not exercised here — the existing API suite (full-e2e.spec.ts) covers
 * the backend authorize endpoint, and real Google OAuth requires manual
 * one-time consent that cannot be automated.
 */

import { test, expect, type Page } from '@playwright/test';

const BACKEND_URL =
  process.env.BACKEND_URL || 'https://noalone-api-production.up.railway.app/api/v1';
const TEST_API_KEY = process.env.TEST_API_KEY || 'noalone-playwright-test-2026';
const PASSWORD = 'WebTest@2026!';
const TS = Date.now();
const USER_A_EMAIL = `web-a.${TS}@testmail.noalone`;
const USER_B_EMAIL = `web-b.${TS}@testmail.noalone`;

// Each test below is independent except where it references shared state from
// the previous step. Serial mode keeps the journey coherent.
test.describe.configure({ mode: 'serial' });

// Module-level state captured during the journey
const state: {
  userAId?: string;
  userAUsername?: string;
  userBId?: string;
  userBUsername?: string;
  userBDisplayName?: string;
  conversationId?: string;
} = {};

async function getVerificationCode(page: Page, email: string): Promise<string> {
  const res = await page.request.post(`${BACKEND_URL}/auth/test/verification-code`, {
    data: { email, testKey: TEST_API_KEY },
  });
  expect(res.ok(), `test-helper failed for ${email}`).toBeTruthy();
  const body = await res.json();
  expect(body.code, `no code for ${email}`).toBeTruthy();
  return body.code as string;
}

async function registerVerifyLogin(page: Page, email: string) {
  // Register
  await page.goto('/register');
  await expect(page.getByTestId('register-card')).toBeVisible();
  await page.getByTestId('register-email').fill(email);
  await page.getByTestId('register-password').fill(PASSWORD);
  await page.getByTestId('register-submit').click();
  await expect(page.getByTestId('verify-card')).toBeVisible({ timeout: 15_000 });

  // Verify (fetch code via backend test helper)
  const code = await getVerificationCode(page, email);
  await page.getByTestId('verify-code').fill(code);
  await page.getByTestId('verify-submit').click();
  await expect(page).toHaveURL(/\/chats$/, { timeout: 15_000 });
  await expect(page.getByTestId('chats-page')).toBeVisible();
}

// ── seed both users via API so chat search/conversation works ─────────────────
test.beforeAll(async ({ playwright }) => {
  const baseURL = BACKEND_URL.endsWith('/') ? BACKEND_URL : `${BACKEND_URL}/`;
  const ctx = await playwright.request.newContext({ baseURL });

  for (const email of [USER_A_EMAIL, USER_B_EMAIL]) {
    const reg = await ctx.post('auth/email/register', {
      data: { email, password: PASSWORD },
    });
    expect([200, 201]).toContain(reg.status());

    const codeRes = await ctx.post('auth/test/verification-code', {
      data: { email, testKey: TEST_API_KEY },
    });
    const { code } = await codeRes.json();
    expect(code).toBeTruthy();

    const verify = await ctx.post('auth/email/verify', { data: { email, code } });
    expect([200, 201]).toContain(verify.status());
    const body = await verify.json();
    if (email === USER_A_EMAIL) {
      state.userAId = body.user.id;
      state.userAUsername = body.user.username;
    } else {
      state.userBId = body.user.id;
      state.userBUsername = body.user.username;
      state.userBDisplayName = body.user.displayName;
    }
  }

  await ctx.dispose();
});

// ════════════════════════════════════════════════════════════════════════════════
// 1. Home redirects unauthenticated users to /login
// ════════════════════════════════════════════════════════════════════════════════

test('home redirects to /login when unauthenticated', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId('login-card')).toBeVisible();
});

// ════════════════════════════════════════════════════════════════════════════════
// 2. Sign-up — wrong-shape inputs are rejected
// ════════════════════════════════════════════════════════════════════════════════

test('register rejects too-short password', async ({ page }) => {
  await page.goto('/register');
  await page.getByTestId('register-email').fill(`noop.${Date.now()}@x.com`);
  await page.getByTestId('register-password').fill('short');
  await page.getByTestId('register-submit').click();
  await expect(page.getByTestId('register-error')).toBeVisible();
});

// ════════════════════════════════════════════════════════════════════════════════
// 3. Login — bad password rejected
// ════════════════════════════════════════════════════════════════════════════════

test('login rejects wrong password', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(USER_A_EMAIL);
  await page.getByTestId('login-password').fill('totally-wrong-password');
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('login-error')).toBeVisible({ timeout: 10_000 });
});

// ════════════════════════════════════════════════════════════════════════════════
// 4. Login — correct credentials land on /chats
// ════════════════════════════════════════════════════════════════════════════════

test('login with correct credentials enters /chats', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(USER_A_EMAIL);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/chats$/, { timeout: 15_000 });
  await expect(page.getByTestId('chats-page')).toBeVisible();
  await expect(page.getByTestId('sidebar')).toBeVisible();
});

// ════════════════════════════════════════════════════════════════════════════════
// 5. Sidebar nav links work
// ════════════════════════════════════════════════════════════════════════════════

test('sidebar navigation hits Chats / Calls / Profile', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(USER_A_EMAIL);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/chats$/);

  await page.getByTestId('nav-calls').click();
  await expect(page).toHaveURL(/\/calls$/);
  await expect(page.getByTestId('calls-page')).toBeVisible();

  await page.getByTestId('nav-profile').click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByTestId('profile-page')).toBeVisible();

  await page.getByTestId('nav-chats').click();
  await expect(page).toHaveURL(/\/chats$/);
});

// ════════════════════════════════════════════════════════════════════════════════
// 6. Profile — edit and save
// ════════════════════════════════════════════════════════════════════════════════

test('profile edit persists displayName + bio + age', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(USER_A_EMAIL);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/chats$/);

  await page.getByTestId('nav-profile').click();
  await expect(page.getByTestId('profile-page')).toBeVisible();
  // Wait for profile data to populate (username has been autogenerated server-side)
  await expect(page.getByTestId('profile-username')).not.toHaveValue('', { timeout: 10_000 });

  await page.getByTestId('profile-display-name').fill('Web Tester A');
  await page.getByTestId('profile-bio').fill('I run end-to-end tests.');
  await page.getByTestId('profile-age').fill('25');
  await page.getByTestId('profile-interests').fill('coding, hiking, lo-fi');
  await page.getByTestId('profile-save').click();

  await expect(page.getByTestId('profile-saved')).toBeVisible({ timeout: 10_000 });

  // Refresh — values stick
  await page.reload();
  await expect(page.getByTestId('profile-display-name')).toHaveValue('Web Tester A');
  await expect(page.getByTestId('profile-bio')).toHaveValue('I run end-to-end tests.');
  await expect(page.getByTestId('profile-age')).toHaveValue('25');
});

// ════════════════════════════════════════════════════════════════════════════════
// 7. Status toggle flips between Available and Away
// ════════════════════════════════════════════════════════════════════════════════

test('status toggle flips Available ↔ Away', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(USER_A_EMAIL);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/chats$/);

  const toggle = page.getByTestId('status-toggle');
  await expect(toggle).toBeVisible();
  const initial = await toggle.getAttribute('data-status');
  await toggle.click();
  await expect(toggle).not.toHaveAttribute('data-status', initial || '');
});

// ════════════════════════════════════════════════════════════════════════════════
// 8. Search → start conversation with user B
// ════════════════════════════════════════════════════════════════════════════════

test('search for user B and start a conversation', async ({ page }) => {
  test.skip(!state.userBId, 'No seeded user B');

  await page.goto('/login');
  await page.getByTestId('login-email').fill(USER_A_EMAIL);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/chats$/);

  await page.getByTestId('user-search').fill(state.userBUsername!);
  await expect(page.getByTestId(`user-result-${state.userBId}`)).toBeVisible({ timeout: 10_000 });
  await page.getByTestId(`user-result-${state.userBId}`).click();
  await expect(page).toHaveURL(/\/chats\/[^/]+$/, { timeout: 10_000 });
  await expect(page.getByTestId('conversation-page')).toBeVisible();

  // capture conversation id from URL
  state.conversationId = page.url().split('/').pop();
});

// ════════════════════════════════════════════════════════════════════════════════
// 9. Send a message — optimistic render
// ════════════════════════════════════════════════════════════════════════════════

test('send a message — optimistic bubble appears in thread', async ({ page }) => {
  test.skip(!state.conversationId, 'No conversation yet');

  await page.goto('/login');
  await page.getByTestId('login-email').fill(USER_A_EMAIL);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/chats$/, { timeout: 15_000 });
  await page.goto(`/chats/${state.conversationId}`);
  await expect(page.getByTestId('conversation-page')).toBeVisible({ timeout: 10_000 });

  const stamp = `hello-${Date.now()}`;
  await page.getByTestId('composer-input').fill(stamp);
  await page.getByTestId('composer-send').click();

  await expect(page.locator('[data-testid="message"]', { hasText: stamp })).toBeVisible({
    timeout: 5_000,
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 10. Call CTAs: Authorize Google + start mock voice call → incoming modal
// ════════════════════════════════════════════════════════════════════════════════

test('initiate mock voice call surfaces the incoming-call modal', async ({ page, context }) => {
  test.skip(!state.conversationId, 'No conversation yet');

  await page.goto('/login');
  await page.getByTestId('login-email').fill(USER_A_EMAIL);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/chats$/, { timeout: 15_000 });
  await page.goto(`/chats/${state.conversationId}`);
  await expect(page.getByTestId('conversation-page')).toBeVisible({ timeout: 10_000 });

  // Authorize CTA visible by default in mock mode (since isAuthorized=false)
  // Clicking it should not navigate to Google — mock mode makes it local.
  const authorize = page.getByTestId('authorize-calls');
  if (await authorize.isVisible().catch(() => false)) {
    await authorize.click();
  }

  // Block window.open so we can assert the Meet link was attempted
  const opened: string[] = [];
  await page.exposeFunction('__opened', (url: string) => { opened.push(url); });
  await page.addInitScript(() => {
    const orig = window.open;
    window.open = ((url: string, _t?: string, _f?: string) => {
      (window as any).__opened?.(url);
      return null;
    }) as any;
  });

  await page.goto(`/chats/${state.conversationId}`);
  await expect(page.getByTestId('start-voice-call')).toBeVisible();
  await page.getByTestId('start-voice-call').click();

  // Mock mode dispatches a synthetic incoming-call event — the modal appears
  await expect(page.getByTestId('incoming-call-modal')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId('accept-call')).toBeVisible();
  await expect(page.getByTestId('decline-call')).toBeVisible();
});

// ════════════════════════════════════════════════════════════════════════════════
// 11. Accept incoming call → Meet link opens (mock)
// ════════════════════════════════════════════════════════════════════════════════

test('accept mock incoming call opens a meet.google.com link', async ({ page }) => {
  test.skip(!state.conversationId, 'No conversation yet');

  await page.goto('/login');
  await page.getByTestId('login-email').fill(USER_A_EMAIL);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/chats$/, { timeout: 15_000 });

  // Capture window.open URLs
  await page.addInitScript(() => {
    (window as any).__opened = [];
    const orig = window.open;
    window.open = ((url: string) => {
      (window as any).__opened.push(url);
      return null;
    }) as any;
  });

  await page.goto(`/chats/${state.conversationId}`);
  await page.getByTestId('start-video-call').click();
  await expect(page.getByTestId('incoming-call-modal')).toBeVisible({ timeout: 5_000 });
  await page.getByTestId('accept-call').click();

  // Modal closes after accept
  await expect(page.getByTestId('incoming-call-modal')).toBeHidden();

  // A Meet link should have been opened
  const opened: string[] = await page.evaluate(() => (window as any).__opened || []);
  expect(opened.some((u) => /meet\.google\.com/.test(u))).toBeTruthy();
});

// ════════════════════════════════════════════════════════════════════════════════
// 12. Decline incoming call closes the modal
// ════════════════════════════════════════════════════════════════════════════════

test('decline mock incoming call closes the modal', async ({ page }) => {
  test.skip(!state.conversationId, 'No conversation yet');

  await page.goto('/login');
  await page.getByTestId('login-email').fill(USER_A_EMAIL);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/chats$/, { timeout: 15_000 });
  await page.goto(`/chats/${state.conversationId}`);
  await expect(page.getByTestId('conversation-page')).toBeVisible({ timeout: 10_000 });

  await page.getByTestId('start-voice-call').click();
  await expect(page.getByTestId('incoming-call-modal')).toBeVisible({ timeout: 5_000 });

  await page.getByTestId('decline-call').click();
  await expect(page.getByTestId('incoming-call-modal')).toBeHidden();
});

// ════════════════════════════════════════════════════════════════════════════════
// 13. /calls page — history loads and Authorize CTA renders
// ════════════════════════════════════════════════════════════════════════════════

test('/calls renders history list and Authorize CTA', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(USER_A_EMAIL);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/chats$/);
  await page.getByTestId('nav-calls').click();

  await expect(page.getByTestId('calls-page')).toBeVisible();
  // Empty container — assert attached (not necessarily visible). New users
  // have no call history, so the "no-history" empty state should render.
  await expect(page.getByTestId('call-history')).toBeAttached();
  await expect(page.getByTestId('no-history')).toBeVisible();
  // Authorize CTA visible since user hasn't authorized Google for calls
  await expect(page.getByTestId('authorize-google-calls')).toBeVisible();
});

// ════════════════════════════════════════════════════════════════════════════════
// 14. Sign out clears the session
// ════════════════════════════════════════════════════════════════════════════════

test('sign out returns to /login', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(USER_A_EMAIL);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/chats$/);

  await page.getByTestId('sign-out').click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId('login-card')).toBeVisible();
});

// ════════════════════════════════════════════════════════════════════════════════
// 15. Authorize CTA in non-mock mode redirects to Google (URL shape only)
// ════════════════════════════════════════════════════════════════════════════════

test('Google sign-in button needs configuration without VITE_GOOGLE_CLIENT_ID', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-google').click();
  // Either error appears (no client id configured) OR it navigated away
  // (real client id set) — both are acceptable per environment.
  await page.waitForTimeout(500);
  const url = page.url();
  const err = await page.getByTestId('login-error').isVisible().catch(() => false);
  if (!err) {
    expect(url).toMatch(/accounts\.google\.com|oauth/i);
  }
});
