# noAlone — Web

React + Vite + TypeScript web client for the noAlone backend.

## Quick start

```bash
cd web
cp .env.example .env       # leave VITE_MOCK_CALLS=true for demo
npm install
npm run dev                # http://127.0.0.1:5173
```

The app talks to the deployed Railway backend
(`https://noalone-api-production.up.railway.app/api/v1`) by default. Set
`VITE_API_URL` in `.env` to point elsewhere.

## Calling feature

The mobile app generates Google Meet links via the Calendar API after the
user authorizes calls. The web client supports the same flow:

1. User clicks **Authorize Google for Meet** on the `/calls` page.
2. Browser redirects to Google OAuth (scope `calendar.events`).
3. After consent, Google sends the auth code to
   `http://localhost:5173/oauth/google`.
4. The web app POSTs the code to `POST /api/v1/calls/authorize`, which
   exchanges it for refresh + access tokens and stores them.
5. From then on, every voice/video call triggers `POST /api/v1/calls/initiate`
   which generates a fresh Meet link.

### To make this work for real

In **Google Cloud Console → APIs & Services → Credentials**:

1. Create a **Web application** OAuth 2.0 Client ID.
2. Authorized JavaScript origins: `http://localhost:5173`
3. Authorized redirect URIs: `http://localhost:5173/oauth/google`
4. Copy the Client ID and Client Secret.
5. Set `VITE_GOOGLE_CLIENT_ID` in `web/.env` (Client ID only).
6. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the **backend**
   environment (Railway dashboard).
7. Set `VITE_MOCK_CALLS=false` in `web/.env`.
8. Restart `npm run dev` and click **Authorize Google for Meet**.

### Demo / test mode

Leave `VITE_MOCK_CALLS=true` to exercise the full call UI (initiate →
ringing → accept → opens a Meet link in a new tab) without real Google
OAuth. The Meet link generated in this mode is a fake URL on
`meet.google.com/<random>` — useful for Playwright tests and demos.

## E2E tests

```bash
# from repo root, after npm install in both root and web/
npx playwright install chromium
npm run dev --prefix web      # leave running in another terminal
npx playwright test --project=web
```
