import { defineConfig, devices } from '@playwright/test';

const BACKEND_URL =
  process.env.BACKEND_URL || 'https://noalone-api-production.up.railway.app/api/v1/';
const WEB_URL = process.env.WEB_URL || 'http://127.0.0.1:5173';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  projects: [
    {
      name: 'api',
      testMatch: ['call-feature.spec.ts', 'full-e2e.spec.ts'],
      use: { baseURL: BACKEND_URL },
    },
    {
      name: 'web',
      testMatch: ['web-e2e.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: WEB_URL,
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'oauth',
      testMatch: ['real-oauth.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: WEB_URL,
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'backend-google',
      testMatch: ['backend-google-config.spec.ts'],
      use: { baseURL: BACKEND_URL },
    },
    {
      name: 'recover',
      testMatch: ['recover-code.spec.ts'],
      use: { baseURL: BACKEND_URL },
    },
  ],

  webServer: process.env.SKIP_WEB_SERVER
    ? undefined
    : {
        command: 'npm run preview --prefix web',
        url: WEB_URL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
