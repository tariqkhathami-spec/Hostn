# Hostn Platform — Deployment Runbook

## Prerequisites

- Node.js 20+
- Docker (for local containerized development)
- Railway CLI (backend deployment)
- Vercel CLI (frontend deployment)
- EAS CLI (mobile builds)

## Local Development

### Option A: Direct (no Docker)

```bash
# Backend
cd backend
cp .env.example .env  # Fill in MONGODB_URI, JWT_SECRET
npm install
npm run dev            # Starts on port 5000

# Frontend
cd frontend
cp .env.example .env.local  # Set NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
npm install
npm run dev                  # Starts on port 3000

# Mobile
cd hostn-mobile
cp .env.example .env  # Set EXPO_PUBLIC_API_URL=http://localhost:5000/api
npx expo start
```

### Option B: Docker Compose

```bash
# From project root
docker-compose up
# Backend: http://localhost:5000
# MongoDB: localhost:27017
# Redis: localhost:6379
```

## Production Deployment

### Backend (Railway)

The backend auto-deploys from the `main` branch via Railway.

1. Push to `main` branch
2. Railway detects changes in `backend/` directory
3. Builds using `backend/Dockerfile`
4. Deploys with healthcheck on `/health/live`
5. Verify: `curl https://hostn-production.up.railway.app/health/ready`

**Environment Variables (Railway Dashboard):**
- `MONGODB_URI` — MongoDB Atlas connection string
- `JWT_SECRET` — At least 32 characters
- `NODE_ENV` — `production`
- `MOYASAR_SECRET_KEY`, `MOYASAR_PUBLISHABLE_KEY`, `MOYASAR_WEBHOOK_SECRET`
- `CLIENT_URL` — Frontend production URL
- `CORS_ORIGINS` — Comma-separated allowed origins

### Frontend (Vercel)

1. Push to `main` branch
2. Vercel auto-builds Next.js
3. Verify: `curl https://hostn.co`

**Environment Variables (Vercel Dashboard):**
- `NEXT_PUBLIC_API_URL` — Backend API URL
- `NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY` — Moyasar public key

### Mobile (EAS Build)

```bash
cd hostn-mobile

# Development build (simulator)
eas build --profile development --platform ios
eas build --profile development --platform android

# Preview build (internal testing)
eas build --profile preview --platform android

# Production build (store submission)
eas build --profile production --platform ios
eas build --profile production --platform android
```

## Health Checks

```bash
# Liveness (process running + bootstrapped)
curl https://hostn-production.up.railway.app/health/live

# Readiness (MongoDB connected)
curl https://hostn-production.up.railway.app/health/ready

# Full health
curl https://hostn-production.up.railway.app/health
```

## Troubleshooting

### Backend crash loop
1. Check Railway deploy logs for error message
2. Common causes: MongoDB auth failure, missing env vars
3. The server will NOT bind to port until MongoDB connects (Phase 1 fix)
4. `database.js` retries 3 times with 3s delay before `process.exit(1)`

### MongoDB connection failure
1. Verify `MONGODB_URI` in Railway env vars
2. Check MongoDB Atlas: Database Access > verify user credentials
3. Check Atlas: Network Access > verify `0.0.0.0/0` is allowed
4. Test locally: `node -e "require('mongoose').connect(process.env.MONGODB_URI)"`

### Frontend 404 or API errors
1. Verify `NEXT_PUBLIC_API_URL` points to correct backend URL
2. Check CORS: backend `CORS_ORIGINS` must include frontend domain
3. Check browser console for CORS or CSP errors
