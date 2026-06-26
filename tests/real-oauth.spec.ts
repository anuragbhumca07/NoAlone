/**
 * Verifies the Authorize Google CTA on the live web app redirects to a real
 * Google OAuth URL containing the configured Web Client ID. Does NOT complete
 * consent (cannot be automated). After running this once, manually click
 * Authorize in your real Chrome to grant access, then run the calling flow.
 */
import { test, expect, request } from '@playwright/test';

const WEB_URL = process.env.WEB_URL || 'http://127.0.0.1:5173';
const BACKEND_URL =
  process.env.BACKEND_URL || 'https://noalone-api-production.up.railway.app/api/v1';
const TEST_API_KEY = process.env.TEST_API_KEY || 'noalone-playwright-test-2026';
const EXPECTED_CLIENT_ID = '513754739235-gfq00i29g37enqjml1u9nf860l4hknni.apps.googleusercontent.com';
const PASSWORD = 'OAuthCheck@2026!';

test('Authorize Google CTA redirects to accounts.google.com with our client ID', async ({ page }) => {
  // Seed and verify a quick throwaway user via the API
  const ts = Date.now();
  const email = `oauth-probe.${ts}@testmail.noalone`;

  const ctx = await request.newContext({ baseURL: `${BACKEND_URL}/` });
  await ctx.post('auth/email/register', { data: { email, password: PASSWORD } });
  const codeRes = await ctx.post('auth/test/verification-code', {
    data: { email, testKey: TEST_API_KEY },
  });
  const { code } = await codeRes.json();
  await ctx.post('auth/email/verify', { data: { email, code } });
  await ctx.dispose();

  // Log in through the UI
  await page.goto(`${WEB_URL}/login`);
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/chats$/, { timeout: 15_000 });

  // Navigate to Calls and intercept the Google redirect URL the button generates
  await page.getByTestId('nav-calls').click();
  await expect(page.getByTestId('calls-page')).toBeVisible();

  // Capture the navigation Playwright is about to make to accounts.google.com
  // by routing requests to that origin and aborting them, recording the URL.
  let capturedUrl = '';
  await page.route('**/accounts.google.com/**', async (route) => {
    capturedUrl = route.request().url();
    await route.abort();
  });

  await page.getByTestId('authorize-google-calls').click();
  // Wait briefly for the redirect attempt to fire
  await page.waitForTimeout(1500);

  console.log('Captured Google auth URL:', capturedUrl);
  const url = capturedUrl;

  expect(url).toContain('accounts.google.com/o/oauth2/v2/auth');
  expect(url).toContain(`client_id=${EXPECTED_CLIENT_ID}`);
  expect(url).toContain('scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events');
  expect(url).toContain('redirect_uri=http%3A%2F%2F127.0.0.1%3A5173%2Foauth%2Fgoogle');
  expect(url).toContain('state=calls');
  expect(url).toContain('response_type=code');
});
