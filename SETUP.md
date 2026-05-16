# noAlone — Setup Guide

## Prerequisites
- Node.js 20+
- Docker & Docker Compose (for local DB)
- Expo CLI: `npm install -g expo-cli eas-cli`

---

## 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in your credentials in .env
npm install
```

### Start local PostgreSQL + Redis (Docker):
```bash
# From project root:
docker-compose up postgres redis -d
```

### Run migrations and start:
```bash
cd backend
npx prisma migrate dev --name init
npm run start:dev
```

API: http://localhost:3000/api/v1
Swagger docs: http://localhost:3000/api/docs

---

## 2. Mobile App Setup

```bash
cd mobile
cp .env.example .env
# Set EXPO_PUBLIC_API_URL to your backend URL
npm install
npx expo start
```

Scan QR code with Expo Go app (Android/iOS).

---

## 3. External Services Setup

### Supabase (PostgreSQL — recommended for production)
1. Create project at supabase.com
2. Copy connection string to `DATABASE_URL` in backend `.env`

### Railway (Backend Hosting)
1. Create project at railway.app
2. Add PostgreSQL and Redis plugins
3. Deploy backend: `railway up` from `/backend`
4. Set environment variables in Railway dashboard

### Firebase (Push Notifications)
1. Create project at console.firebase.google.com
2. Enable Cloud Messaging
3. Download service account JSON
4. Set `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` in `.env`

### Twilio (OTP SMS)
1. Create account at twilio.com
2. Get Account SID, Auth Token, phone number
3. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

### Google OAuth
1. Go to console.cloud.google.com
2. Create OAuth 2.0 credentials
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

### Cloudflare R2 (Media Storage)
1. Create R2 bucket at dash.cloudflare.com
2. Set S3-compatible credentials in `.env`

---

## 4. Build Mobile App for Production

```bash
cd mobile
eas build --platform android   # APK/AAB
eas build --platform ios       # IPA
```

---

## Architecture

```
Mobile (Expo React Native)
    ↓ REST API + WebSocket
Backend (NestJS on Railway)
    ├── PostgreSQL (Supabase)
    ├── Redis (Railway)
    ├── Firebase (Push)
    ├── Twilio (OTP)
    └── Cloudflare R2 (Media)
```
