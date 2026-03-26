<p align="center">
  <strong>H O S T N</strong>
</p>

<p align="center">
  Premium Vacation Rental Marketplace for Saudi Arabia & MENA
</p>

<p align="center">
  <a href="https://hostn.co">hostn.co</a>
</p>

---

## Product Overview

Hostn is a curated vacation rental marketplace built for the Saudi and MENA market. The platform connects travelers with premium chalets, villas, apartments, farms, studios, and desert camps across Saudi Arabia — with a focus on trust, quality, and a seamless booking experience.

The system features a production-hardened single-backend architecture with role-based access for three user types (Guest, Host, Admin), a complete booking-to-payment pipeline with server-side verification, refresh token rotation, webhook signature validation, and comprehensive security hardening.

**Live:** [hostn.co](https://hostn.co)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENTS                                 │
│  Next.js Web (SSR)  │  React Native Mobile  │  iOS (Swift)  │
│  (no API routes)    │  (Expo Router)        │               │
└────────┬────────────┴──────────┬────────────┴────────┬──────┘
         │                       │                      │
         ▼                       ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│              EXPRESS.JS API (Single Backend)                  │
│                    /api/v1/*                                  │
├─────────────────────────────────────────────────────────────┤
│  Middleware: Auth (JWT+Cookie) │ Validate │ RateLimit        │
│  Helmet (CSP/HSTS) │ MongoSanitize │ Upload (magic-byte)    │
├─────────────────────────────────────────────────────────────┤
│                   INFRASTRUCTURE                             │
│  MongoDB Atlas     │  Redis (optional)  │  Moyasar Payments  │
│  Cloudinary Images │  Docker-ready      │  SMS (OTP)         │
└─────────────────────────────────────────────────────────────┘
```

| Layer      | Technology                         |
|------------|------------------------------------|
| Frontend   | Next.js 14 (App Router), TypeScript |
| Mobile     | React Native (Expo Router), TypeScript |
| Styling    | Tailwind CSS (web), StyleSheet (mobile) |
| State      | React Context (web), Zustand (mobile) |
| HTTP       | Axios with auto-refresh interceptors |
| Backend    | Node.js + Express (single source of truth) |
| Database   | MongoDB Atlas + Mongoose           |
| Auth       | JWT (15-min access + 30-day refresh tokens, HttpOnly cookies) |
| Payments   | Moyasar (mada, Visa, MC, Apple Pay, STC Pay) |
| Images     | Cloudinary                         |
| Security   | Helmet, DOMPurify, express-mongo-sanitize, magic-byte upload validation |
| Deployment | Vercel (frontend), Railway (backend), Docker-ready |

---

## Authentication & Authorization

### Auth Flow

```
Register/Login → Access Token (15 min, HttpOnly cookie) + Refresh Token (30 days)
                           │
              Web: tokens in HttpOnly cookies (hostn_token, hostn_refresh)
              Mobile: tokens in response body → SecureStore
                           │
              On 401 TOKEN_EXPIRED → auto-refresh via interceptor
              On refresh fail → force logout, redirect to /auth
                           │
              Password change → tokenVersion incremented → all sessions revoked
```

- **Access tokens**: 15-minute JWT with `{ id, email, role, tokenVersion }`
- **Refresh tokens**: 30-day, SHA256-hashed in DB, family-based rotation with reuse detection
- **OTP (mobile)**: 6-digit crypto-secure codes, rate-limited (3/15min per phone), exponential backoff
- **Role upgrade**: Guests can upgrade to Host via `PUT /api/v1/auth/upgrade-to-host`

### Role-Based Access

| Role  | Web Routes      | Mobile        | Capabilities |
|-------|-----------------|---------------|--------------|
| Guest | `/dashboard/*`  | `(tabs)`      | Browse, book, pay, review, wishlist |
| Host  | `/host/*`       | `(host-tabs)` | List properties, manage bookings, earnings, reviews |
| Admin | `/admin/*`      | Web only      | User/property moderation, payments, logs |

**Enforcement:**

| Rule | Where Enforced |
|------|----------------|
| Role-based route access | Next.js middleware (JWT decode) + Express `authorize()` middleware |
| Cross-role access blocked | Middleware redirects to role-appropriate dashboard |
| Suspended users blocked | Auth middleware checks `isSuspended` |
| Admin registration blocked | Register endpoint only allows `guest` or `host` roles |
| Token version validation | Auth middleware rejects tokens with stale `tokenVersion` |
| All admin actions logged | ActivityLog created on every mutation |

### Auth Pages (Web)

- `/auth` — Role selection screen (Guest / Host / Admin)
- `/auth/guest/login`, `/auth/guest/register` — Guest auth with purple branding
- `/auth/host/login`, `/auth/host/register` — Host auth with emerald branding
- `/auth/admin/login` — Admin auth with violet branding (no registration)

---

## Payment System

- **Server-side verification only** — All payments verified via Moyasar API, never trusted from client
- **Webhook signature validation** — HMAC-SHA256 verification on all webhook events
- **Payment state machine** — `initiated → processing → paid → refunded | failed` with enforced transitions
- **Idempotency** — Duplicate payment submissions rejected via idempotency keys
- **Amount validation** — Server recalculates expected amount, rejects mismatches

---

## Security Hardening

- **No dual backend** — All frontend API routes eliminated; Express is the single source of truth
- **No secrets in frontend** — `JWT_SECRET`, `MOYASAR_SECRET_KEY` removed from frontend env
- **OTP security** — 6-digit `crypto.randomInt()`, constant-time comparison, rate-limited
- **Input sanitization** — DOMPurify for HTML, `escapeRegex()` for search, express-mongo-sanitize
- **Upload hardening** — Magic-byte validation, extension whitelist, safe filename generation
- **Security headers** — Helmet with CSP, HSTS, Permissions-Policy
- **Graceful shutdown** — SIGTERM/SIGINT handlers with 30s drain timeout
- **Environment validation** — Required vars checked at startup, fail-fast on missing

---

## Project Structure

```
hostn/
├── frontend/                        # Next.js 14 App Router (SSR only, no API routes)
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/                # Role selection + role-specific login/register
│   │   │   │   ├── page.tsx         # Role selection (Guest/Host/Admin)
│   │   │   │   ├── guest/           # Guest login + register
│   │   │   │   ├── host/            # Host login + register
│   │   │   │   └── admin/           # Admin login only
│   │   │   ├── dashboard/           # Guest dashboard (bookings, settings, messages, support)
│   │   │   ├── host/                # Host dashboard (listings, bookings, calendar, earnings, reviews)
│   │   │   ├── admin/               # Admin panel (users, properties, bookings, payments, reports, logs)
│   │   │   ├── listings/            # Public property search + detail
│   │   │   └── page.tsx             # Home/landing page
│   │   ├── components/
│   │   │   ├── auth/AuthForm.tsx    # Shared auth form (role-aware branding)
│   │   │   ├── layout/              # DashboardShell, Sidebar, Header, Footer
│   │   │   └── ui/                  # Button, Input, ReportModal, etc.
│   │   ├── context/                 # AuthContext (with upgradeToHost), LanguageContext
│   │   ├── lib/
│   │   │   ├── api.ts              # Axios client (13 API namespaces, auto-refresh)
│   │   │   └── translations.ts     # Arabic/English translations
│   │   ├── middleware.ts            # Role-based route guards (JWT decode)
│   │   └── types/                   # TypeScript interfaces
│   └── package.json
│
├── backend/                         # Express API (single source of truth)
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js         # MongoDB with retry + connection pooling
│   │   │   ├── env.js              # Environment validation (fail-fast)
│   │   │   ├── redis.js            # Redis client with graceful fallback
│   │   │   └── logger.js           # Structured logging (JSON in prod)
│   │   ├── middleware/
│   │   │   ├── auth.js             # JWT protect + authorize(roles) + tokenVersion check
│   │   │   ├── validate.js         # Request validation middleware
│   │   │   ├── upload.js           # Multer + magic-byte validation
│   │   │   └── errorHandler.js     # Centralized error handling
│   │   ├── models/
│   │   │   ├── User.js             # Roles (guest/host/admin), tokenVersion, wishlist
│   │   │   ├── RefreshToken.js     # SHA256 hashed, family-based rotation
│   │   │   ├── OTP.js              # 6-digit crypto-secure, rate-limited
│   │   │   ├── Property.js         # With moderation status
│   │   │   ├── Payment.js          # State machine, idempotency key
│   │   │   └── ...                 # Booking, Review, Notification, ActivityLog, etc.
│   │   ├── controllers/            # Auth, Property, Booking, Payment, Host, Admin, OTP, etc.
│   │   ├── routes/                 # /api/v1/* with rate limiting
│   │   ├── utils/
│   │   │   ├── sanitize.js         # DOMPurify, escapeRegex
│   │   │   └── errors.js          # AppError, ValidationError, etc.
│   │   └── server.js              # Entry point: Helmet, CORS, graceful shutdown
│   ├── Dockerfile                  # Multi-stage build, non-root user
│   └── package.json
│
├── hostn-mobile/                   # React Native (Expo Router)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/             # Onboarding, phone entry, OTP verify
│   │   │   ├── (tabs)/             # Guest tabs: Search, Favorites, Bookings, Messages, More
│   │   │   ├── (host-tabs)/        # Host tabs: Dashboard, Listings, Bookings, Messages, More
│   │   │   ├── host/               # Host stack: earnings, add-listing
│   │   │   └── _layout.tsx         # Root layout (role-based tab switching)
│   │   ├── services/
│   │   │   ├── api.ts              # Axios with auto-refresh interceptor
│   │   │   ├── auth.service.ts     # OTP auth
│   │   │   └── host.service.ts     # Host API wrapper
│   │   ├── store/authStore.ts      # Zustand + SecureStore (with upgradeToHost)
│   │   └── utils/i18n.ts           # Bilingual EN/AR translations
│   └── package.json
│
├── docker-compose.yml              # API + MongoDB + Redis
├── ios/                            # Native iOS Apps (SwiftUI)
└── README.md
```

---

## API Endpoints

All endpoints are versioned at `/api/v1/`.

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register (guest or host) |
| POST | `/api/v1/auth/login` | Login (returns access + refresh tokens) |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout (revoke refresh token) |
| POST | `/api/v1/auth/logout-all` | Revoke all sessions |
| GET | `/api/v1/auth/me` | Get current user |
| PUT | `/api/v1/auth/profile` | Update profile |
| PUT | `/api/v1/auth/change-password` | Change password (revokes all tokens) |
| PUT | `/api/v1/auth/upgrade-to-host` | Upgrade guest to host |
| POST | `/api/v1/auth/wishlist/:id` | Toggle wishlist |
| POST | `/api/v1/auth/send-otp` | Send OTP (mobile) |
| POST | `/api/v1/auth/verify-otp` | Verify OTP (mobile) |

### Properties
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/properties` | Search properties |
| GET | `/api/v1/properties/:id` | Property detail |
| POST | `/api/v1/properties` | Create property (host) |
| PUT | `/api/v1/properties/:id` | Update property (host) |
| GET | `/api/v1/properties/my-properties` | Host's properties |
| GET | `/api/v1/properties/:id/availability` | Check availability |
| GET | `/api/v1/properties/cities` | Available cities |

### Bookings, Payments, Notifications, Reviews, Host, Admin, Messages, Support, Reports, Wallet, Coupons
See `backend/src/routes/` for full endpoint documentation.

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- MongoDB Atlas (or local MongoDB)
- Redis (optional, for rate limiting)

### Backend

```bash
cd backend
npm install
cp .env.example .env  # Configure required vars
npm run dev
```

Required environment variables:
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — Strong secret (32+ chars)
- `MOYASAR_SECRET_KEY` — Moyasar API secret (required in production)
- `MOYASAR_PUBLISHABLE_KEY` — Moyasar publishable key
- `MOYASAR_WEBHOOK_SECRET` — Webhook signature validation

### Frontend

```bash
cd frontend
npm install
```

Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

```bash
npm run dev
```

### Docker

```bash
docker-compose up
```

Starts API + MongoDB + Redis.

---

## Deployment

```
GitHub (main) → Vercel (frontend at hostn.co)
              → Railway (backend API at api.hostn.co)
              → MongoDB Atlas (database)
```

Health check: `GET /health/ready` — checks MongoDB + Redis connectivity.

---

## License

MIT

---

<p align="center">Built by Hostn</p>
