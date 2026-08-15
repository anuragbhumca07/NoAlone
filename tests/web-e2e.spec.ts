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

import { test, expect } from '@playwright/test';

const BACKEND_URL =
  process.env.BACKEND_URL || 'https://noalone-api-production.up.railway.app/api/v1';
const TEST_API_KEY = process.env.TEST_API_KEY || 'noalone-playwright-test-2026';
const PASSWORD = 'WebTest@2026!';
const TS = Date.now();
const USER_A_EMAIL = `web-a.${TS}@testmail.noalone`;
const USER_B_EMAIL = `web-b.${TS}@testmail.noalone`;

// Mock-mode tests synthesize a fake incoming-call event in the browser to
// exercise the ringing modal without hitting Google. They only make sense
// when the deployed bundle has VITE_MOCK_CALLS=true. Detect by checking the
// served bundle once at suite startup.
let mockMode = false;
async function detectMockMode(baseURL: string) {
  try {
    const res = await fetch(baseURL);
    const html = await res.text();
    const m = html.match(/assets\/([^"']+\.js)/);
    if (!m) return false;
    const jsRes = await fetch(`${baseURL.replace(/\/$/, '')}/${m[0]}`);
    const js = await jsRes.text();
    return /VITE_MOCK_CALLS["'\s:=]+true|"true"\s*===\s*"true"/.test(js) || js.includes('mock-incoming-call');
  } catch { return false; }
}

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

// Seeds a pre-confirmed Supabase user (via the backend test-helper, which
// uses the Supabase service role key) and syncs it into the noAlone backend,
// exactly like the real Login page's Supabase flow does.
async function seedSupabaseUser(
  ctx: import('@playwright/test').APIRequestContext,
  email: string,
): Promise<{ id: string; username: string; displayName: string }> {
  const seedRes = await ctx.post('auth/test/supabase-seed-user', {
    data: { email, password: PASSWORD, testKey: TEST_API_KEY },
  });
  expect(seedRes.ok(), `supabase seed failed for ${email}`).toBeTruthy();
  const { accessToken } = await seedRes.json();
  expect(accessToken, `no access token for ${email}`).toBeTruthy();

  const syncRes = await ctx.post('auth/supabase-sync', { data: { accessToken } });
  expect(syncRes.ok(), `supabase-sync failed for ${email}`).toBeTruthy();
  const body = await syncRes.json();
  return body.user;
}

// ── seed both users via API so chat search/conversation works ─────────────────
test.beforeAll(async ({ playwright }) => {
  const webURL = process.env.WEB_URL || 'http://127.0.0.1:5173';
  mockMode = await detectMockMode(webURL);
  console.log(`Detected mock mode: ${mockMode} (web=${webURL})`);

  const baseURL = BACKEND_URL.endsWith('/') ? BACKEND_URL : `${BACKEND_URL}/`;
  const ctx = await playwright.request.newContext({ baseURL });

  const userA = await seedSupabaseUser(ctx, USER_A_EMAIL);
  state.userAId = userA.id;
  state.userAUsername = userA.username;

  const userB = await seedSupabaseUser(ctx, USER_B_EMAIL);
  state.userBId = userB.id;
  state.userBUsername = userB.username;
  state.userBDisplayName = userB.displayName;

  await ctx.dispose();
});

// ════════════════════════════════════════════════════════════════════════════════
// 1. Home page renders for unauthenticated visitors; /login is reachable from it
// ════════════════════════════════════════════════════════════════════════════════

test('home page renders the landing page for unauthenticated visitors', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('home-page')).toBeVisible();
  await expect(page.getByTestId('home-features')).toBeVisible();

  await page.getByTestId('home-cta-login').click();
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
  await page.getByTestId('register-confirm-password').fill('short');
  await page.getByTestId('register-submit').click();
  await expect(page.getByTestId('register-error')).toBeVisible();
});

test('register rejects mismatched password confirmation', async ({ page }) => {
  await page.goto('/register');
  await page.getByTestId('register-email').fill(`noop.${Date.now()}@x.com`);
  await page.getByTestId('register-password').fill('LongEnough123!');
  await page.getByTestId('register-confirm-password').fill('DoesNotMatch123!');
  await page.getByTestId('register-submit').click();
  await expect(page.getByTestId('register-error')).toBeVisible();
  await expect(page.getByTestId('register-error')).toHaveText(/do not match/i);
});

test('register with matching passwords creates an account and lands on /chats', async ({ page }) => {
  const email = `web-register.${Date.now()}@testmail.noalone`;
  await page.goto('/register');
  await page.getByTestId('register-email').fill(email);
  await page.getByTestId('register-password').fill(PASSWORD);
  await page.getByTestId('register-confirm-password').fill(PASSWORD);
  await page.getByTestId('register-submit').click();
  // Auto-confirm is on for this project, so signup lands directly in the app.
  await expect(page).toHaveURL(/\/chats$/, { timeout: 15_000 });
  await expect(page.getByTestId('chats-page')).toBeVisible();
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
// 3b. Forgot password
// ════════════════════════════════════════════════════════════════════════════════

test('forgot password link goes to the reset form and accepts an email', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-forgot-password').click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page.getByTestId('forgot-password-card')).toBeVisible();

  // Supabase's resetPasswordForEmail validates the domain has a real TLD
  // (unlike admin.createUser), so the suite's .noalone test domain is
  // rejected here. It doesn't require the account to exist anyway — by
  // design, to avoid leaking which emails are registered.
  await page.getByTestId('forgot-password-email').fill(`forgot-test.${Date.now()}@example.com`);
  await page.getByTestId('forgot-password-submit').click();
  await expect(page.getByTestId('forgot-password-sent')).toBeVisible({ timeout: 10_000 });
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
// 6b. Change password — new password works, and old one no longer does
// ════════════════════════════════════════════════════════════════════════════════

test('change password updates credentials; old password stops working', async ({ page }) => {
  const NEW_PASSWORD = 'ChangedPw@2026!';

  await page.goto('/login');
  await page.getByTestId('login-email').fill(USER_A_EMAIL);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/chats$/, { timeout: 15_000 });

  await page.getByTestId('nav-profile').click();
  await expect(page.getByTestId('change-password-card')).toBeVisible();
  await page.getByTestId('change-password-new').fill(NEW_PASSWORD);
  await page.getByTestId('change-password-confirm').fill(NEW_PASSWORD);
  await page.getByTestId('change-password-submit').click();
  await expect(page.getByTestId('change-password-saved')).toBeVisible({ timeout: 10_000 });

  await page.getByTestId('sign-out').click();
  await expect(page).toHaveURL(/\/login$/);

  // Old password now rejected
  await page.getByTestId('login-email').fill(USER_A_EMAIL);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('login-error')).toBeVisible({ timeout: 10_000 });

  // New password logs in fine
  await page.getByTestId('login-password').fill(NEW_PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/chats$/, { timeout: 15_000 });

  // Revert to the original password so every later test in this suite
  // (which all log in with PASSWORD) keeps working.
  await page.getByTestId('nav-profile').click();
  await expect(page.getByTestId('change-password-card')).toBeVisible();
  await page.getByTestId('change-password-new').fill(PASSWORD);
  await page.getByTestId('change-password-confirm').fill(PASSWORD);
  await page.getByTestId('change-password-submit').click();
  await expect(page.getByTestId('change-password-saved')).toBeVisible({ timeout: 10_000 });
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
// 9b. Every message bubble is timestamped
// ════════════════════════════════════════════════════════════════════════════════

test('sent message bubble shows a timestamp', async ({ page }) => {
  test.skip(!state.conversationId, 'No conversation yet');

  await page.goto('/login');
  await page.getByTestId('login-email').fill(USER_A_EMAIL);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/chats$/, { timeout: 15_000 });
  await page.goto(`/chats/${state.conversationId}`);
  await expect(page.getByTestId('conversation-page')).toBeVisible({ timeout: 10_000 });

  const stamp = `time-check-${Date.now()}`;
  await page.getByTestId('composer-input').fill(stamp);
  await page.getByTestId('composer-send').click();

  const bubble = page.locator('[data-testid="message"]', { hasText: stamp });
  await expect(bubble).toBeVisible({ timeout: 5_000 });
  // formatTime() renders either "3:45 PM" (today) or "Aug 14, 3:45 PM" (older) —
  // either way it must contain a recognizable clock time.
  await expect(bubble.getByTestId('message-time')).toHaveText(/\d{1,2}:\d{2}\s?(AM|PM)?/i);
  // Own messages carry a delivery tick (sent/delivered/read).
  await expect(bubble.locator('.tick')).toBeVisible();
});

test('two real browser sessions — sender sees exactly one bubble, receiver gets it live', async ({ browser }) => {
  test.skip(!state.conversationId || !state.userBUsername, 'No conversation/user B yet');

  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  try {
    await pageA.goto('/login');
    await pageA.getByTestId('login-email').fill(USER_A_EMAIL);
    await pageA.getByTestId('login-password').fill(PASSWORD);
    await pageA.getByTestId('login-submit').click();
    await expect(pageA).toHaveURL(/\/chats$/, { timeout: 15_000 });
    await pageA.goto(`/chats/${state.conversationId}`);
    await expect(pageA.getByTestId('conversation-page')).toBeVisible({ timeout: 10_000 });

    await pageB.goto('/login');
    await pageB.getByTestId('login-email').fill(USER_B_EMAIL);
    await pageB.getByTestId('login-password').fill(PASSWORD);
    await pageB.getByTestId('login-submit').click();
    await expect(pageB).toHaveURL(/\/chats$/, { timeout: 15_000 });
    await pageB.goto(`/chats/${state.conversationId}`);
    await expect(pageB.getByTestId('conversation-page')).toBeVisible({ timeout: 10_000 });

    // Let both sockets finish connecting and joining their user:<id> room —
    // getSocket() returns before the handshake completes.
    await pageA.waitForTimeout(1000);
    await pageB.waitForTimeout(1000);

    const stamp = `dup-check-${Date.now()}`;
    await pageA.getByTestId('composer-input').fill(stamp);
    await pageA.getByTestId('composer-send').click();

    // Receiver gets it live over the socket, no reload.
    await expect(pageB.locator('[data-testid="message"]', { hasText: stamp })).toBeVisible({ timeout: 5_000 });

    // Sender must see exactly ONE bubble with this content — not a duplicate
    // from the optimistic render plus the un-reconciled socket echo.
    await pageA.waitForTimeout(1000);
    await expect(pageA.locator('[data-testid="message"]', { hasText: stamp })).toHaveCount(1);
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// 9c. Delivery + read ticks — sent → delivered → read, live over sockets
// ════════════════════════════════════════════════════════════════════════════════

test('message ticks progress from sent to delivered to read', async ({ browser }) => {
  test.skip(!state.conversationId || !state.userBUsername, 'No conversation/user B yet');

  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  try {
    await pageA.goto('/login');
    await pageA.getByTestId('login-email').fill(USER_A_EMAIL);
    await pageA.getByTestId('login-password').fill(PASSWORD);
    await pageA.getByTestId('login-submit').click();
    await expect(pageA).toHaveURL(/\/chats$/, { timeout: 15_000 });
    await pageA.goto(`/chats/${state.conversationId}`);
    await expect(pageA.getByTestId('conversation-page')).toBeVisible({ timeout: 10_000 });

    const stamp = `tick-check-${Date.now()}`;
    await pageA.getByTestId('composer-input').fill(stamp);
    await pageA.getByTestId('composer-send').click();
    const bubbleA = pageA.locator('[data-testid="message"]', { hasText: stamp });
    await expect(bubbleA).toBeVisible({ timeout: 5_000 });

    // Before B is even online, the tick is a plain "sent" single check.
    await expect(bubbleA.locator('[data-testid="tick-sent"]')).toBeVisible({ timeout: 5_000 });

    // B comes online and opens the same conversation — B's client acks
    // delivery immediately (AppShell's global message:new handler), then acks
    // read once the thread mounts (Conversation.tsx's on-open effect).
    await pageB.goto('/login');
    await pageB.getByTestId('login-email').fill(USER_B_EMAIL);
    await pageB.getByTestId('login-password').fill(PASSWORD);
    await pageB.getByTestId('login-submit').click();
    await expect(pageB).toHaveURL(/\/chats$/, { timeout: 15_000 });
    await pageB.goto(`/chats/${state.conversationId}`);
    await expect(pageB.getByTestId('conversation-page')).toBeVisible({ timeout: 10_000 });

    // A's bubble should flip straight to "read" (double tick) since B opened
    // the thread — delivered and read both land, read wins the render.
    await expect(bubbleA.locator('[data-testid="tick-read"]')).toBeVisible({ timeout: 10_000 });
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// 9d. Unread badges — sidebar nav count + per-conversation count
// ════════════════════════════════════════════════════════════════════════════════

test('unread badge appears on nav + conversation row until the thread is opened', async ({ browser }) => {
  test.skip(!state.conversationId || !state.userBUsername, 'No conversation/user B yet');

  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  try {
    // B logs in and sits on /chats (list view, not inside the thread) —
    // this is the "unread while elsewhere in the app" scenario.
    await pageB.goto('/login');
    await pageB.getByTestId('login-email').fill(USER_B_EMAIL);
    await pageB.getByTestId('login-password').fill(PASSWORD);
    await pageB.getByTestId('login-submit').click();
    await expect(pageB).toHaveURL(/\/chats$/, { timeout: 15_000 });
    await expect(pageB.getByTestId('chats-page')).toBeVisible();
    await pageB.waitForTimeout(1000);

    await pageA.goto('/login');
    await pageA.getByTestId('login-email').fill(USER_A_EMAIL);
    await pageA.getByTestId('login-password').fill(PASSWORD);
    await pageA.getByTestId('login-submit').click();
    await expect(pageA).toHaveURL(/\/chats$/, { timeout: 15_000 });
    await pageA.goto(`/chats/${state.conversationId}`);
    await expect(pageA.getByTestId('conversation-page')).toBeVisible({ timeout: 10_000 });
    await pageA.waitForTimeout(500);

    const stamp = `unread-check-${Date.now()}`;
    await pageA.getByTestId('composer-input').fill(stamp);
    await pageA.getByTestId('composer-send').click();

    // B is on /chats — the sidebar nav badge and the conversation row badge
    // both light up without a reload.
    await expect(pageB.getByTestId('unread-badge')).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByTestId(`unread-${state.conversationId}`)).toBeVisible({ timeout: 5_000 });

    // Opening the thread clears both.
    await pageB.getByTestId(`conversation-${state.conversationId}`).click();
    await expect(pageB.getByTestId('conversation-page')).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByTestId('unread-badge')).toBeHidden({ timeout: 10_000 });
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// 10. Call CTAs: Authorize Google + start mock voice call → incoming modal
// ════════════════════════════════════════════════════════════════════════════════

test('initiate mock voice call surfaces the incoming-call modal', async ({ page, context }) => {
  test.skip(!state.conversationId, 'No conversation yet');
  test.skip(!mockMode, 'Bundle is in real-Google mode — calling-modal flow is exercised manually');

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

  // Mock mode dispatches a synthetic incoming-call event — the call panel appears
  await expect(page.getByTestId('call-panel')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId('accept-call')).toBeVisible();
  await expect(page.getByTestId('decline-call')).toBeVisible();
});

// ════════════════════════════════════════════════════════════════════════════════
// 11. Accept incoming call → Meet link opens (mock)
// ════════════════════════════════════════════════════════════════════════════════

test('accept mock incoming call opens a meet.google.com link and shows the connected panel', async ({ page }) => {
  test.skip(!state.conversationId, 'No conversation yet');
  test.skip(!mockMode, 'Bundle is in real-Google mode — Meet link generation is exercised manually after consent');

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
  await expect(page.getByTestId('call-panel')).toBeVisible({ timeout: 5_000 });
  await page.getByTestId('accept-call').click();

  // Panel stays open, now showing the connected/in-progress state with a duration + end-call button
  await expect(page.getByTestId('call-panel')).toBeVisible();
  await expect(page.getByTestId('call-duration')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId('call-end')).toBeVisible();

  // A Meet link should have been opened
  const opened: string[] = await page.evaluate(() => (window as any).__opened || []);
  expect(opened.some((u) => /meet\.google\.com/.test(u))).toBeTruthy();

  // Ending the call clears the panel
  await page.getByTestId('call-end').click();
  await expect(page.getByTestId('call-panel')).toBeHidden();
});

// ════════════════════════════════════════════════════════════════════════════════
// 12. Decline incoming call closes the modal
// ════════════════════════════════════════════════════════════════════════════════

test('decline mock incoming call closes the modal', async ({ page }) => {
  test.skip(!state.conversationId, 'No conversation yet');
  test.skip(!mockMode, 'Bundle is in real-Google mode — decline flow is exercised manually');

  await page.goto('/login');
  await page.getByTestId('login-email').fill(USER_A_EMAIL);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/chats$/, { timeout: 15_000 });
  await page.goto(`/chats/${state.conversationId}`);
  await expect(page.getByTestId('conversation-page')).toBeVisible({ timeout: 10_000 });

  await page.getByTestId('start-voice-call').click();
  await expect(page.getByTestId('call-panel')).toBeVisible({ timeout: 5_000 });

  await page.getByTestId('decline-call').click();
  await expect(page.getByTestId('call-panel')).toBeHidden();
});

// ════════════════════════════════════════════════════════════════════════════════
// 12b. Outgoing call — ringing-out state has a Cancel button, no Accept/Decline
// ════════════════════════════════════════════════════════════════════════════════

test('/calls page — calling a user shows an outgoing ringing panel with Cancel', async ({ page }) => {
  test.skip(!state.userBId, 'No seeded user B');
  test.skip(!mockMode, 'Bundle is in real-Google mode — outgoing-ring flow is exercised manually');

  await page.goto('/login');
  await page.getByTestId('login-email').fill(USER_A_EMAIL);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/chats$/, { timeout: 15_000 });

  await page.getByTestId('nav-calls').click();
  await expect(page.getByTestId('calls-page')).toBeVisible();
  await page.getByTestId('call-search').fill(state.userBUsername!);
  await expect(page.getByTestId(`call-${state.userBId}-voice`)).toBeVisible({ timeout: 10_000 });
  await page.getByTestId(`call-${state.userBId}-voice`).click();

  await expect(page.getByTestId('call-panel')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId('cancel-call')).toBeVisible();
  await expect(page.getByTestId('accept-call')).toBeHidden();

  await page.getByTestId('cancel-call').click();
  await expect(page.getByTestId('call-panel')).toBeHidden();
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
// 15. "Continue with Google" hands off to Supabase's OAuth authorize endpoint
// ════════════════════════════════════════════════════════════════════════════════

test('Continue with Google redirects to Supabase authorize (or surfaces an error)', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-google').click();
  // Supabase's signInWithOAuth navigates the page to
  // <project>.supabase.co/auth/v1/authorize?provider=google&... which then
  // redirects on to Google — or, if the Google provider isn't enabled in the
  // Supabase dashboard yet, Supabase bounces back with an error. Both are
  // acceptable outcomes for this test; a silent no-op is not.
  await page.waitForTimeout(800);
  const url = page.url();
  const err = await page.getByTestId('login-error').isVisible().catch(() => false);
  if (!err) {
    expect(url).toMatch(/supabase\.co\/auth\/v1\/authorize|accounts\.google\.com/i);
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// 16. /oauth/google?state=calls routes to OUR backend, never to Supabase
// ════════════════════════════════════════════════════════════════════════════════
//
// Regression guard: the Calendar-authorize flow (Calls.tsx / Conversation.tsx
// "Authorize Google" buttons) redirects straight to Google and back to
// /oauth/google?code=...&state=calls — this must be exchanged via our own
// POST /calls/authorize, never handed to Supabase's exchangeCodeForSession
// (which is only for the sign-in flow). A prior refactor of OAuthCallback.tsx
// accidentally dropped the state=calls branch, silently misrouting every
// Calendar-authorize code into the sign-in exchange instead.

test('oauth callback with state=calls calls our backend, not Supabase', async ({ page }) => {
  const calledUrls: string[] = [];
  await page.route('**/*', async (route) => {
    calledUrls.push(route.request().url());
    await route.continue();
  });

  await page.goto('/oauth/google?code=fake-test-code-not-real&state=calls');
  await expect(page.getByTestId('oauth-callback')).toBeVisible();
  await page.waitForTimeout(1500);

  const hitOurBackend = calledUrls.some((u) => u.includes('/calls/authorize'));
  const hitSupabaseTokenExchange = calledUrls.some((u) => /supabase\.co\/auth\/v1\/token/.test(u));

  expect(hitOurBackend, 'expected a request to our backend /calls/authorize').toBe(true);
  expect(hitSupabaseTokenExchange, 'must NOT hand the Calendar auth code to Supabase').toBe(false);
});
