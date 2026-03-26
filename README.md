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

The system is fully operational with role-based access for three user types (Guest, Host, Admin), a complete booking-to-payment pipeline, property moderation workflow, real-time notification system, and an admin operations center with full platform control.

**Live:** [hostn.co](https://hostn.co)

---

## Key Features

### Marketplace

- **Property Search & Discovery** — Filter by city, property type, dates, guest count, and price range. Full-text search across 6 Saudi cities (Riyadh, Jeddah, Abha, Khobar, Taif, Al Ula) and 7 property types.
- **Property Detail Pages** — Image galleries, amenity lists, house rules, location info, and guest reviews with category-level ratings (Cleanliness, Accuracy, Communication, Location, Value).
- **Booking Flow** — End-to-end booking with per-night pricing, cleaning fees, service fees, discount calculation, and availability validation. Blocked dates and capacity limits enforced.
- **Payment System** — Moyasar payment gateway integration (Saudi-focused). Supports credit/debit cards (Visa, Mastercard, mada), Apple Pay, and STC Pay. Payments verified server-side before booking confirmation.
- **Reviews & Ratings** — Guests leave detailed reviews. Hosts can respond. Ratings are aggregated per-property and displayed publicly.
- **Wishlist** — Guests save properties to a personal wishlist, persisted across sessions.

### Payment System

- **Moyasar Gateway** — Saudi Arabia's leading payment gateway, supporting mada (local debit), Visa, Mastercard, Apple Pay, and STC Pay.
- **Server-Side Verification** — Payments are verified via Moyasar's API before booking confirmation. Amount and currency validation prevents manipulation.
- **Payment Lifecycle** — Initiate → Process → Verify → Complete/Fail. Failed payments can be retried. Completed payments can be refunded by admins.
- **Webhook Support** — Real-time payment status updates from Moyasar via webhook endpoint.
- **Mobile-Ready** — Backend API endpoints designed for iOS app integration. Payment initiation returns Moyasar publishable key and callback URL for in-app payment forms.

### Notification System

- **Real-Time Notifications** — Triggered on booking created, confirmed, rejected, cancelled, completed; payment success/failure; review received; listing approved/rejected.
- **APNs-Ready Structure** — Notification model includes push notification fields (device token, platform, send status) ready for Apple Push Notification service integration.
- **Unread Tracking** — Badge count API for mobile apps. Mark individual or all notifications as read.
- **Device Token Registration** — API endpoint for iOS/Android apps to register push notification tokens.

### Authentication & Authorization

- **Three-Tier Role System** — Guest, Host, and Admin roles with distinct permissions enforced at middleware, API, and UI levels.
- **JWT Authentication** — Token-based auth with 7-day expiry. Tokens attached to all API requests via interceptors.
- **Route Protection** — Server-side middleware validates tokens and role-based authorization. Suspended users blocked from login.

### Host Dashboard

- **Overview** — Earnings, active listings, booking stats, occupancy rate, and notifications.
- **Listings Management** — Add, edit, activate/deactivate properties. Grid and table views with search and filtering.
- **Booking Management** — View incoming bookings. Accept or reject pending reservations.
- **Calendar** — Per-property availability calendar with date blocking/unblocking.
- **Earnings** — Monthly revenue breakdown, top properties by revenue.
- **Reviews** — View and respond to guest reviews. Rating distribution and category breakdowns.
- **Settings** — Profile management, notification preferences, security settings.

### Admin Operations Center

- **Dashboard** — Real-time platform metrics: users, properties, bookings, revenue, reviews. Monthly revenue chart. Moderation queue alerts.
- **Property Moderation** — Approve or reject listings with reasons. Rejected properties hidden from public. Hosts notified of moderation decisions.
- **User Management** — View all users with role badges. Suspend/activate, change roles, verify accounts.
- **Host Management** — Full host profiles with property count, earnings, and booking history. Suspend/activate.
- **Booking Oversight** — View all bookings with guest, property, and payment details. Cancel bookings with status updates.
- **Payment Management** — Platform-wide payment records with filtering. Process refunds through Moyasar.
- **Activity Logs** — Every action logged with timestamp, actor, target, and description. Filter by action type.

### UI & Localization

- **Responsive Design** — Mobile-first layout using Tailwind CSS. Sidebar collapses on mobile.
- **Arabic & English** — Bilingual interface with RTL support and language toggle. Arabic is the primary language for the Saudi market.

### Native iOS Apps (SwiftUI)

- **Hostn Guest App** — Property browsing, search, booking, payment, trip management, reviews, wishlist, and profile.
- **Hostn Host App** — Dashboard with stats, listings management, booking accept/reject, earnings tracking, and settings.
- **Shared Architecture** — Common models, services, and utilities shared between both apps. Actor-based async API client with JWT auth.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Clients                              │
│  Web (Next.js)  │  iOS Guest (SwiftUI)  │  iOS Host     │
├─────────────────────────────────────────────────────────┤
│                    API Layer                              │
│  Next.js API Routes ──┐    Express REST API ──┐          │
│  (Web frontend)       │    (Mobile + backend)  │          │
├───────────────────────┴────────────────────────┤         │
│              Shared MongoDB Atlas                         │
│         (Users, Properties, Bookings,                     │
│          Payments, Notifications, Reviews,                │
│          ActivityLogs)                                    │
├─────────────────────────────────────────────────────────┤
│              External Services                            │
│  Moyasar (Payments)  │  Cloudinary (Images)              │
│  APNs (Push Notifs)  │  Vercel (Frontend)                │
│  Railway (Backend)                                       │
└─────────────────────────────────────────────────────────┘
```

| Layer      | Technology                         |
|------------|------------------------------------|
| Frontend   | Next.js 14.2.25 (App Router), TypeScript |
| Styling    | Tailwind CSS                       |
| State      | React Context API (AuthContext, LanguageContext) |
| HTTP       | Axios with interceptors            |
| Backend    | Node.js + Express                  |
| Database   | MongoDB Atlas + Mongoose           |
| Auth       | JWT (jsonwebtoken, bcryptjs)        |
| Payments   | Moyasar (Saudi gateway — mada, Visa, MC, Apple Pay, STC Pay) |
| Images     | Cloudinary                         |
| iOS Apps   | SwiftUI (iOS 17+), MVVM pattern    |
| Deployment | Vercel (frontend), Railway (backend) |

---

## Roles & System Design

### Guest

- Browse and search properties across Saudi cities
- View property details, photos, amenities, and reviews
- Book properties with full pricing breakdown
- Pay via Moyasar (credit/debit, mada, Apple Pay, STC Pay)
- Manage bookings from a personal dashboard
- Save properties to a wishlist
- Leave reviews after completed stays
- Receive notifications on booking and payment updates

### Host

- Submit new property listings (enter moderation queue)
- Manage existing listings (activate, deactivate, edit)
- View and respond to incoming bookings (accept/reject)
- Track earnings with monthly breakdowns
- Manage availability calendar with date blocking
- Respond to guest reviews
- Receive notifications on new bookings, payments, and reviews
- Configure account and notification settings

### Admin

- View platform-wide statistics and health metrics
- Moderate property listings (approve/reject with reasons)
- Suspend/activate user and host accounts
- Monitor and cancel bookings with status updates
- Process payment refunds via Moyasar
- View complete activity log of all admin actions
- Manage platform-wide payment records

**Enforcement summary:**

| Rule | Where Enforced |
|------|----------------|
| Only approved properties appear publicly | Property query filters |
| Suspended users cannot login | Auth middleware checks `isSuspended` |
| Booking requires valid payment | Payment verification before confirmation |
| Guests cannot access /host routes | Middleware + role authorization |
| Non-admins cannot access /admin | `authorize('admin')` middleware |
| All admin actions are logged | ActivityLog created on every mutation |
| Notifications sent on state changes | Notification.createNotification() triggers |

---

## Payment Flow

```
Guest selects dates → Creates booking (status: pending, payment: unpaid)
                           │
                    POST /api/payments/initiate
                           │
                    Returns Moyasar config + publishable key
                           │
                    Moyasar payment form (credit card / mada / Apple Pay)
                           │
                    Moyasar processes payment
                           │
              ┌────────────┼────────────┐
              ▼                         ▼
        Payment Success           Payment Failed
              │                         │
   POST /api/payments/verify    Payment status: failed
              │                  Guest can retry
   Server verifies with Moyasar API
              │
   Amount + Currency validated
              │
   Booking confirmed + Payment marked paid
              │
   Notifications sent to guest + host
```

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
│   │   │   │   ├── host/            # Host dashboard APIs
│   │   │   │   ├── payments/        # Payment initiate, verify, webhook
│   │   │   │   ├── properties/      # Property CRUD, search, cities, availability
│   │   │   │   └── reviews/         # Review CRUD + host responses
│   │   │   ├── admin/               # Admin panel pages
│   │   │   ├── auth/                # Login + registration pages
│   │   │   ├── booking/             # Booking + payment flow
│   │   │   ├── dashboard/           # Guest dashboard
│   │   │   ├── host/                # Host dashboard (8 sub-pages)
│   │   │   └── listings/            # Property search + detail pages
│   │   ├── components/              # Reusable UI components
│   │   ├── context/                 # AuthContext, LanguageContext
│   │   ├── lib/
│   │   │   ├── models/              # Mongoose models (Payment, Notification, ActivityLog, etc.)
│   │   │   ├── payment/             # Moyasar payment provider implementation
│   │   │   ├── api.ts               # Axios client (authApi, bookingsApi, paymentsApi, adminApi, etc.)
│   │   │   └── translations.ts      # Arabic/English translations
│   │   └── types/                   # TypeScript interfaces
│   └── package.json
│
├── backend/                         # Express API (for mobile apps + production)
│   ├── src/
│   │   ├── config/                  # Database connection
│   │   ├── middleware/              # Auth (JWT + role), validation, error handling
│   │   ├── models/                  # Mongoose schemas
│   │   │   ├── User.js             # Users with roles, suspension, device tokens
│   │   │   ├── Property.js         # Properties with moderation, approval status
│   │   │   ├── Booking.js          # Bookings with payment status tracking
│   │   │   ├── Payment.js          # Payments with Moyasar integration
│   │   │   ├── Review.js           # Reviews with host responses
│   │   │   ├── Notification.js     # Notifications with APNs push fields
│   │   │   └── ActivityLog.js      # Admin activity audit trail
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── propertyController.js
│   │   │   ├── bookingController.js  # With notification triggers
│   │   │   ├── paymentController.js  # Moyasar initiate, verify, webhook, refund
│   │   │   ├── notificationController.js  # CRUD + device token registration
│   │   │   ├── adminController.js    # Stats, user/host/property/booking management, logs
│   │   │   ├── hostController.js
│   │   │   └── reviewController.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── properties.js
│   │   │   ├── bookings.js
│   │   │   ├── payments.js          # Payment initiate, verify, webhook, refund
│   │   │   ├── notifications.js     # Notification CRUD + device tokens
│   │   │   ├── admin.js             # Admin dashboard, moderation, user management
│   │   │   ├── host.js
│   │   │   ├── reviews.js
│   │   │   └── upload.js
│   │   └── server.js               # Entry point with all routes mounted
│   └── package.json
│
├── ios/                             # Native iOS Apps (SwiftUI)
│   ├── Shared/                      # Shared code between both apps
│   │   ├── Models/                  # Codable structs (User, Property, Booking, etc.)
│   │   ├── Services/                # API client, auth, property, booking, review services
│   │   └── Utils/                   # Color theme, date/price formatters, UI modifiers
│   ├── HostnGuest/                  # Guest iOS App
│   │   └── Views/                   # Auth, Home, Property, Booking, Profile, Wishlist
│   └── HostnHost/                   # Host iOS App
│       └── Views/                   # Auth, Dashboard, Listings, Bookings, Earnings, Settings
│
└── README.md
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |
| PUT | `/api/auth/change-password` | Change password |
| POST | `/api/auth/wishlist/:propertyId` | Toggle wishlist |

### Properties
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/properties` | Search properties (city, type, dates, guests, price) |
| GET | `/api/properties/:id` | Get property detail |
| POST | `/api/properties` | Create property (host) |
| GET | `/api/properties/:id/availability` | Check availability |
| GET | `/api/properties/cities` | Get available cities |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bookings` | Create booking |
| GET | `/api/bookings/my-bookings` | Get user's bookings |
| GET | `/api/bookings/host-bookings` | Get host's received bookings |
| GET | `/api/bookings/:id` | Get booking detail |
| PUT | `/api/bookings/:id/status` | Update status (host: confirm/reject) |
| PUT | `/api/bookings/:id/cancel` | Cancel booking (guest) |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/initiate` | Initiate payment for booking |
| POST | `/api/payments/verify` | Verify payment with Moyasar |
| POST | `/api/payments/webhook` | Moyasar webhook (public) |
| GET | `/api/payments/my-payments` | Get user's payments |
| GET | `/api/payments/:id` | Get payment detail |
| GET | `/api/payments` | Get all payments (admin) |
| POST | `/api/payments/:id/refund` | Refund payment (admin) |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get user's notifications |
| GET | `/api/notifications/unread-count` | Get unread count |
| PUT | `/api/notifications/read-all` | Mark all as read |
| PUT | `/api/notifications/:id/read` | Mark one as read |
| POST | `/api/notifications/device-token` | Register push token |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Platform statistics |
| GET | `/api/admin/users` | List users (with search/filter) |
| GET | `/api/admin/users/:id` | User detail with stats |
| PATCH | `/api/admin/users/:id` | User actions (suspend, activate, role change) |
| GET | `/api/admin/hosts/:id` | Host detail with properties and earnings |
| GET | `/api/admin/properties` | List properties (with moderation filter) |
| POST | `/api/admin/properties/:id/moderate` | Approve/reject listing |
| GET | `/api/admin/bookings` | List all bookings |
| PATCH | `/api/admin/bookings/:id` | Admin booking actions (cancel, confirm, complete) |
| GET | `/api/admin/logs` | Activity logs |

### Host Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/host/stats` | Dashboard statistics |
| GET | `/api/host/recent-bookings` | Recent bookings |
| GET | `/api/host/notifications` | Host notifications |
| GET | `/api/host/earnings` | Monthly earnings |
| GET | `/api/host/calendar/:propertyId` | Property calendar |
| PUT | `/api/host/calendar/:propertyId/block` | Block/unblock dates |
| GET | `/api/host/reviews` | Host's reviews |
| PUT | `/api/host/properties/:id/toggle` | Toggle property status |

### Reviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reviews/property/:propertyId` | Get property reviews |
| POST | `/api/reviews` | Create review |
| POST | `/api/reviews/:id/respond` | Host respond to review |

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB Atlas account (or local MongoDB)

### 1. Clone the repository

```bash
git clone https://github.com/tariqkhathami-spec/Hostn.git
cd Hostn
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_APP_NAME=Hostn
NEXT_PUBLIC_APP_URL=http://localhost:3000
MOYASAR_PUBLISHABLE_KEY=pk_test_...
MOYASAR_SECRET_KEY=sk_test_...
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret
```

```bash
npm run dev
```

### 3. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Configure `.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
MOYASAR_SECRET_KEY=sk_test_...
MOYASAR_PUBLISHABLE_KEY=pk_test_...
```

```bash
npm run dev
```

### 4. iOS Apps

Open the Xcode projects in `ios/HostnGuest/` and `ios/HostnHost/`. Both apps connect to the Express backend at `https://hostn-backend-production.up.railway.app/api`.

---

## Test Accounts

| Role  | Email                            | Name              |
|-------|----------------------------------|-------------------|
| Admin | admin@hostn.co                   | Tariq Al-Khathami |
| Host  | fatima.ahmad@email.com           | Fatima Al-Ahmad   |
| Host  | mohammed.ali@email.com           | Mohammed Ali      |
| Guest | abdulrahman.mohammad@email.com   | Abdulrahman Mohammed |
| Guest | sarah.ahmad@email.com            | Sarah Ahmad       |

---

## Deployment

```
GitHub (main) → Vercel (frontend at hostn.co)
              → Railway (backend API)
              → MongoDB Atlas (shared database)
```

---

## License

MIT

---

<p align="center">Built by Hostn</p>
