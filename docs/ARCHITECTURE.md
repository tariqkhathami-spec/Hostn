# Hostn Platform — Architecture

## Overview

Hostn is a Saudi Arabia vacation rental marketplace with three clients (web, mobile, admin) backed by a single Express.js API.

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Web (Next.js)│  │ Mobile (Expo)│  │ Admin (Next) │
│  Vercel       │  │ iOS/Android  │  │ (same app)   │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └────────────┬────┴─────────────────┘
                    │
            ┌───────▼────────┐
            │  Express API   │
            │  Railway       │
            │  /api/v1/*     │
            └───┬────────┬───┘
                │        │
         ┌──────▼──┐  ┌──▼──────┐
         │MongoDB  │  │ Redis   │
         │ Atlas   │  │(optional│
         └─────────┘  └─────────┘
```

## Backend

- **Runtime:** Node.js 20 (Alpine Docker)
- **Framework:** Express.js 4.18
- **Database:** MongoDB via Mongoose 8 (Atlas)
- **Cache:** Redis 5 (optional, graceful fallback)
- **Auth:** JWT (15m access + 30d refresh tokens), bcrypt (12 rounds)
- **Payments:** Moyasar (Saudi payment provider)
- **File uploads:** Local disk via multer (ephemeral in containers)

### Models (17)
User, Property, Booking, Payment, Review, Wallet, WalletTransaction, RefreshToken, OTP, Notification, Message, Conversation, SupportTicket, Report, Coupon, SavedPaymentMethod, ActivityLog

### Routes (17 files, all under /api/v1/)
auth, otp, properties, bookings, reviews, host, upload, payments, notifications, admin, messages, support, reports, wallet, payment-methods, coupons, health

### Roles
- `guest` — Can browse, book, pay, review
- `host` — Can create/manage properties, view bookings
- `admin` — Full system access (sub-roles planned: super/support/finance)

## Frontend

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** TailwindCSS
- **Validation:** Zod
- **Auth:** HttpOnly cookie (`hostn_token`), middleware-based role routing
- **i18n:** Arabic/English with RTL support
- **Pages:** 44 (public, guest dashboard, host dashboard, admin dashboard)

## Mobile

- **Framework:** Expo ~52 + React Native 0.76.5
- **Router:** Expo Router (file-based)
- **State:** Zustand (auth/search) + React Query (API caching)
- **Auth:** Phone OTP (+966), tokens in SecureStore
- **Storage:** MMKV for app state, SecureStore for secrets

## Known Technical Debt

1. **In-memory rate limiting** (`server.js:100`) — breaks with multiple replicas
2. **Local file uploads** (`middleware/upload.js`) — ephemeral in containers
3. **Chat polling** (5s interval) — no WebSocket support
4. **Single admin role** — no sub-role granularity (planned Phase 6-15)
5. **No Google Maps** — location features pending (planned Phase 26-35)
6. **Cloudinary vars unused** — env vars exist but uploads go to disk

## GCP Migration Notes

| Component | Current | GCP Target | Effort |
|-----------|---------|------------|--------|
| Backend | Railway (Docker) | Cloud Run | Low |
| Database | MongoDB Atlas | Same or Firestore | Low |
| Redis | Railway addon | Memorystore | Low |
| Files | Local disk | Cloud Storage | Medium |
| Frontend | Vercel | Firebase Hosting | Low |
| Secrets | Railway env vars | Secret Manager | Low |
