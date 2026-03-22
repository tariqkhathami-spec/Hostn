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

The system is fully operational with role-based access for three user types (Guest, Host, Admin), a complete booking pipeline, a property moderation workflow, and an admin operations center that provides real-time platform control.

**Live:** [hostn.co](https://hostn.co)

---

## Key Features

### Marketplace

- **Property Search & Discovery** — Filter by city, property type, dates, guest count, and price range. Full-text search across 6 Saudi cities (Riyadh, Jeddah, Abha, Khobar, Taif, Al Ula) and 6 property types.
- **Property Detail Pages** — Image galleries, amenity lists, house rules, location info, and guest reviews with category-level ratings (Cleanliness, Accuracy, Communication, Location, Value).
- **Booking Flow** — End-to-end booking with per-night pricing, cleaning fees, service fees, discount calculation, and availability validation. Blocked dates are enforced.
- **Reviews & Ratings** — Guests leave detailed reviews. Hosts can respond. Ratings are aggregated per-property and displayed publicly.
- **Wishlist** — Guests save properties to a personal wishlist, persisted across sessions.

### Authentication & Authorization

- **Three-Tier Role System** — Guest, Host, and Admin roles with distinct permissions enforced at middleware, API, and UI levels.
- **JWT Authentication** — Token-based auth with automatic 401 handling. Tokens are attached to all API requests via Axios interceptors.
- **Route Protection** — Server-side middleware validates tokens and redirects unauthorized users. Guests cannot access Host or Admin routes. Non-admins cannot access the admin panel.

### Host Dashboard

- **Overview** — Earnings, active listings, booking stats, occupancy rate, and notifications.
- **Listings Management** — Add, edit, activate/deactivate properties. Grid and table views with search and filtering.
- **Booking Management** — View incoming bookings. Accept or reject pending reservations.
- **Calendar** — Per-property availability calendar with date blocking/unblocking.
- **Earnings** — Monthly revenue breakdown, top properties by revenue, payout history.
- **Reviews** — View and respond to guest reviews. Rating distribution and category breakdowns.
- **Settings** — Profile management, notification preferences, security settings.

### Admin Operations Center

- **Dashboard** — Real-time platform metrics: total users (17), properties (24), bookings (8), revenue (SAR 53,296), reviews (40). Booking status breakdown and property type distribution. Moderation queue alerts for items requiring attention.
- **Property Moderation** — Approve or reject listings. Rejected properties are immediately hidden from all public-facing APIs. New host-submitted properties enter a "pending" state and require admin approval before going live.
- **User Management** — View all users with role badges, booking counts, and total spend. Ban/unban users — banned users are blocked from logging in and creating bookings.
- **Host Management** — Suspend/activate host accounts. Suspended hosts' properties are hidden from public listings and the host is blocked from login.
- **Booking Oversight** — View all bookings with guest, property, and payment details. Cancel bookings — cancellation updates booking status and payment status in real-time.
- **Payment Records** — Platform-wide revenue tracking, payment status overview, and financial summaries.
- **Activity Logs** — Every admin action is permanently recorded with timestamp, performer, target, and description. Supports filtering by action type. Actions logged: property approvals/rejections, user bans/unbans, host suspensions/activations, booking cancellations.

### UI & Localization

- **Responsive Design** — Mobile-first layout using Tailwind CSS. Sidebar navigation collapses on mobile.
- **Arabic & English** — Bilingual interface with RTL support and language toggle. Arabic is the primary language for the Saudi market.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend                          │
│          Next.js 14 (App Router) + TypeScript        │
│              Tailwind CSS + Axios                    │
├─────────────────────────────────────────────────────┤
│                   API Layer                          │
│         Next.js API Routes (/app/api/)               │
│     In-Memory Seed Data (24 properties, 17 users)    │
├─────────────────────────────────────────────────────┤
│               Auth & Middleware                       │
│        JWT Tokens + Next.js Middleware                │
│     Role-based route protection (Guest/Host/Admin)   │
├─────────────────────────────────────────────────────┤
│               Backend (Express)                      │
│          Node.js + Express + MongoDB                 │
│         Mongoose ODM + bcrypt + JWT                  │
└─────────────────────────────────────────────────────┘
```

| Layer      | Technology                         |
|------------|------------------------------------|
| Frontend   | Next.js 14.2.25 (App Router), TypeScript |
| Styling    | Tailwind CSS                       |
| State      | React Context API (AuthContext, LanguageContext) |
| HTTP       | Axios with interceptors            |
| API Routes | Next.js API Routes (in-memory seed data) |
| Backend    | Node.js + Express (MongoDB mode)   |
| Database   | MongoDB + Mongoose                 |
| Auth       | JWT (base64 dev tokens / jsonwebtoken production) |
| Deployment | Vercel (frontend + API routes)     |

> **Current deployment mode:** The live site at hostn.co runs on Next.js API routes with in-memory seed data. The Express + MongoDB backend is available for production use with a persistent database.

---

## Roles & System Design

### Guest

- Browse and search properties across 6 cities
- View property details, photos, amenities, and reviews
- Book properties with full pricing breakdown
- Manage bookings from a personal dashboard
- Save properties to a wishlist
- Leave reviews after completed stays

### Host

- Submit new property listings (enter moderation queue as "pending")
- Manage existing listings (activate, deactivate, edit)
- View and respond to incoming bookings (accept/reject)
- Track earnings with monthly breakdowns
- Manage availability calendar with date blocking
- Respond to guest reviews
- Configure notification and account settings

### Admin

- View platform-wide statistics and health metrics
- Moderate property listings (approve/reject with reasons)
- Ban/unban user accounts (blocks login and booking creation)
- Suspend/activate host accounts (hides all host properties)
- Cancel bookings with status and payment updates
- Monitor platform payments and revenue
- Review complete activity log of all admin actions

**Enforcement summary:**

| Rule | Where Enforced |
|------|----------------|
| Only approved properties appear publicly | `GET /api/properties` and `GET /api/properties/[id]` |
| Banned users cannot login | `POST /api/auth/login` returns 403 |
| Banned users cannot book | `POST /api/bookings` returns 403 |
| Suspended hosts' properties are hidden | `GET /api/properties` filters by host status |
| Guests cannot access /host routes | Next.js middleware redirects to /dashboard |
| Non-admins cannot access /admin | Admin layout + API `requireAdmin()` guard |
| All admin actions are logged | `addActivityLog()` called on every mutation |

---

## Admin System

The admin system is the operational backbone of Hostn. It is not a cosmetic dashboard — every action connects to real data and produces real consequences across the platform.

### Moderation Workflow

```
Host submits property → Status: PENDING
                              │
              ┌───────────────┼───────────────┐
              ▼               │               ▼
         APPROVED             │           REJECTED
    (visible to public)       │     (hidden from all APIs)
              │               │               │
              ▼               │               ▼
    Bookable by guests        │    Reason stored in record
                              │    Host can resubmit
```

### Module Summary

| Module | Endpoint | Records |
|--------|----------|---------|
| Dashboard | `GET /api/admin/stats` | Aggregated metrics + moderation queue |
| Properties | `GET/POST /api/admin/properties` | 24 properties with moderation status |
| Users | `GET/PATCH /api/admin/users/[id]` | 17 users with ban/suspend actions |
| Hosts | `GET/PATCH /api/admin/hosts/[id]` | 5 hosts with suspend/activate |
| Bookings | `GET/PATCH /api/admin/bookings/[id]` | 8 bookings with cancel action |
| Payments | `GET /api/admin/payments` | Revenue totals and payment records |
| Activity Logs | `GET /api/admin/logs` | All admin actions with timestamps |

---

## Project Structure

```
hostn/
├── frontend/                        # Next.js 14 App Router
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/                 # API Routes
│   │   │   │   ├── admin/           # Admin endpoints (stats, properties, users, hosts, bookings, payments, logs)
│   │   │   │   ├── auth/            # Login, register, profile, wishlist
│   │   │   │   ├── bookings/        # Booking CRUD + host bookings
│   │   │   │   ├── host/            # Host dashboard APIs (stats, earnings, calendar, reviews)
│   │   │   │   ├── properties/      # Property CRUD, search, cities, availability
│   │   │   │   └── reviews/         # Review CRUD + host responses
│   │   │   ├── admin/               # Admin panel pages (7 modules)
│   │   │   ├── auth/                # Login + registration pages
│   │   │   ├── booking/             # Booking confirmation flow
│   │   │   ├── dashboard/           # Guest dashboard
│   │   │   ├── host/                # Host dashboard (8 sub-pages)
│   │   │   └── listings/            # Property search + detail pages
│   │   ├── components/              # Reusable UI components
│   │   │   ├── admin/               # Admin sidebar, nav, tables
│   │   │   ├── home/                # Hero, search, featured listings, city browse
│   │   │   ├── host/                # Host sidebar, nav, action banners
│   │   │   ├── layout/              # Header, footer
│   │   │   ├── listings/            # Search filters, property cards
│   │   │   └── ui/                  # Skeletons, error states, error boundary
│   │   ├── context/                 # AuthContext, LanguageContext
│   │   ├── lib/
│   │   │   ├── data/                # Seed data (24 properties, 17 users, 8 bookings, 40 reviews)
│   │   │   ├── admin-helpers.ts     # Moderation state, ban/suspend logic, activity logging
│   │   │   ├── auth-helpers.ts      # Token generation, verification, extraction
│   │   │   ├── api.ts               # Axios client with interceptors
│   │   │   ├── translations.ts      # Arabic/English translations
│   │   │   └── utils.ts             # Formatting utilities
│   │   ├── types/                   # TypeScript interfaces
│   │   └── middleware.ts            # Route protection + role enforcement
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/                         # Express API (MongoDB mode)
│   ├── src/
│   │   ├── config/                  # Database connection
│   │   ├── middleware/              # Auth + error handling
│   │   ├── models/                  # Mongoose schemas
│   │   ├── routes/                  # REST endpoints
│   │   ├── controllers/            # Business logic
│   │   └── server.js               # Entry point
│   ├── scripts/
│   │   └── seed.js                 # Database seeder
│   └── package.json
│
└── README.md
```

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB (required only for Express backend mode)

### 1. Clone the repository

```bash
git clone https://github.com/tariqkhathami-spec/Hostn.git
cd Hostn
```

### 2. Frontend Setup (Next.js API Routes mode)

This is the default mode used by the live site. No database required.

```bash
cd frontend
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_APP_NAME=Hostn
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app runs with in-memory seed data — no database needed.

### 3. Backend Setup (Express + MongoDB mode)

For production use with persistent data:

```bash
cd backend
npm install
cp .env.example .env
```

Configure `.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/hostn
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
```

```bash
npm run seed    # Populate database with sample data
npm run dev     # Start with hot-reload
```

Update frontend `.env.local` to point to the Express backend:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## Test Accounts

Any password works for all seed accounts in the Next.js API Routes mode.

| Role  | Email                            | Name              |
|-------|----------------------------------|-------------------|
| Admin | admin@hostn.co                   | Tariq Al-Khathami |
| Admin | system@hostn.co                  | System Admin      |
| Host  | fatima.ahmad@email.com           | Fatima Al-Ahmad   |
| Host  | mohammed.ali@email.com           | Mohammed Ali      |
| Host  | nora.alkhalifa@email.com         | Nora Al-Khalifa   |
| Host  | khaled.alatoubi@email.com        | Khaled Al-Ateibi  |
| Host  | layla.alzahrani@email.com        | Layla Al-Zahrani  |
| Guest | abdulrahman.mohammad@email.com   | Abdulrahman Mohammed |
| Guest | sarah.ahmad@email.com            | Sarah Ahmad       |
| Guest | ahmad.ali@email.com              | Ahmad Ali         |

---

## Deployment

The production site is deployed on **Vercel** with automatic deployments from the `main` branch on GitHub.

```
GitHub (main branch) → Vercel Auto-Deploy → hostn.co
```

Every push to `main` triggers a new deployment. The site is typically live within 1-2 minutes of a push.

---

## Roadmap

Planned improvements for production readiness:

- [ ] **Persistent database** — Migrate from in-memory seed data to MongoDB Atlas
- [ ] **Payment integration** — Stripe or PayTabs for real transactions
- [ ] **Email notifications** — Booking confirmations, host alerts, admin actions via SendGrid/Resend
- [ ] **Image upload** — Host property photo uploads via Cloudinary or S3
- [ ] **Real-time messaging** — Guest-host chat via WebSocket
- [ ] **Map view** — Property locations on an interactive map
- [ ] **Mobile app** — React Native companion app
- [ ] **Analytics dashboard** — Revenue trends, occupancy metrics, conversion tracking

---

## License

MIT

---

<p align="center">Built by Hostn</p>
