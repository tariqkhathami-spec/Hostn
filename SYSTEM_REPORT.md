# Hostn Platform — Comprehensive System Report

**Date:** 2026-03-29
**Scope:** Website (Web), Host App (Mobile), User App (Mobile), Backend API
**Methodology:** Static code analysis + live click-by-click testing (User App on web preview)

---

## 1. System Overview

### Architecture

| Layer | Technology | Deployment |
|-------|-----------|------------|
| **Backend API** | Express.js + MongoDB + Redis | Railway (standalone Mongo, no replica set) |
| **Website** | Next.js 14 (App Router) | Vercel |
| **Host App** | React Native + Expo 55 + Expo Router | iOS / Android / Web |
| **User App** | React Native + Expo 55 + Expo Router | iOS / Android / Web |
| **Real-time** | Socket.IO (all platforms) | Shared with backend |
| **Payments** | Moyasar (Saudi gateway) | CDN-loaded on web, service-based on mobile |
| **File Storage** | Local disk (multer) | Railway server `/uploads` |
| **SMS** | Twilio (production) / console log (dev) | — |
| **Push Notifications** | Firebase Cloud Messaging (FCM) | — |

### Authentication Strategies

| Platform | Method | Token Storage | Refresh Mechanism |
|----------|--------|---------------|-------------------|
| Website | Email/password | HttpOnly cookie (token) + localStorage (user profile) | Server-side cookie refresh on 401 |
| Host App | Phone + OTP | expo-secure-store (token + refresh token) | Client-side refresh with rotation |
| User App | Phone + OTP | expo-secure-store (native) / localStorage (web fallback) | Client-side refresh with rotation |

### Database Models (17 collections)

User, Property, Booking, Payment, Wallet, WalletTransaction, Review, Message, Conversation, Notification, Coupon, OTP, SupportTicket, Report, SavedPaymentMethod, RefreshToken, ActivityLog

---

## 2. Feature Inventory

### 2.1 Backend API — 97+ Endpoints across 17 Route Groups

| Route Group | Endpoints | Key Operations |
|-------------|-----------|----------------|
| auth | 10 | register, login, refresh, logout, getMe, updateProfile, changePassword, upgradeToHost, forgotPassword, resetPassword |
| otp | 2 | sendOTP, verifyOTP |
| properties | 10 | CRUD, search, availability check, cities, homeFeed, suggestions, nearby |
| bookings | 6 | create, getMyBookings, getHostBookings, getOne, updateStatus, cancel |
| payments | 7 | initiate, verify, webhook, getPayment, getMyPayments, getAllPayments, refund |
| reviews | 5 | getPropertyReviews, create, update, delete, respondToReview |
| notifications | 5 | getAll, markAsRead, markAllAsRead, getUnreadCount, registerDeviceToken |
| messages | 5 | getConversations, createConversation, getMessages, sendMessage, toggleBlock |
| host | 15 | dashboard stats, properties, bookings, calendar, blockDates, reviews, images |
| admin | 11 | stats, user management, property moderation, booking management, payment refunds, logs |
| support | 7 | createTicket, getMyTickets, getTicket, replyToTicket, getAllTickets, updateStatus, assign |
| reports | 5 | createReport, getMyReports, getAllReports, getReport, takeAction |
| wallet | 2 | getBalance, getTransactions |
| paymentMethods | 4 | getSavedMethods, addMethod, deleteMethod, setDefault |
| coupons | 1 | validateCoupon |
| upload | 2 | single, multiple |
| health | 3 | healthCheck, dbStatus, readiness |

**Security middleware:** JWT auth with token versioning, role-based access (guest/host/admin), granular admin permissions (super/support/finance), rate limiting (Redis + in-memory fallback), input validation (express-validator), mongo-sanitize, helmet, CORS whitelist, file upload validation (MIME + magic bytes).

### 2.2 Website — 44 Pages, 120+ API Methods

**Public pages (6):** Home, About, Terms, Privacy, Help, Contact
**Auth pages (6):** Login, Register (guest + host + admin), Forgot Password, Reset Password
**Guest dashboard (5):** Dashboard, Bookings, Messages, Settings, Support (+ ticket detail)
**Host dashboard (8):** Dashboard, Listings (list + new + edit), Bookings, Calendar, Earnings, Reviews, Messages, Settings
**Admin panel (6):** Dashboard, Users, Properties, Bookings, Payments, Logs, Reports, Support (+ detail)
**Booking flow (3):** Listings, Listing detail, Booking with payment callback
**Components (33):** Layout (4), Host (2), Property (6), Home/Search (5), Maps (2), Auth (1), UI primitives (9), Specialized (4)
**Localization:** 300+ translation keys, Arabic + English, RTL auto-switch, font family switching

### 2.3 Host App — 69 Screen Files, 140+ Service Methods

**Auth (5):** phone-entry, phone-login, otp-verify, onboarding, layout
**Tabs (6):** Dashboard, Properties, Calendar, Reservations, More, layout
**Property management (4):** Property detail, Unit detail, layouts
**Financial (6):** Overview, Transfers, Payment method, Transfer duration, Transfer detail, layout
**Reservations (3):** List, Detail, layout
**Reviews (3):** List, Reply, layout
**Messages (4):** Conversations, Chat, Support, layout
**Notifications (2):** List, layout
**Profile (3):** View, Edit, layout
**Pricing (3):** Overview, Unit pricing, layout
**Invoices (6):** List, Statements, Statement detail, Summary, Invoice detail, layout
**Settings (5):** Overview, Managers, Booking rules, VAT, layout
**Permits (2):** List, layout
**Protection (2):** Overview, layout
**Ambassador program (2):** Status, layout
**Suggestions (2):** List, layout
**Content (6):** Articles, Change requests, Referrals, Discount codes, Complaints, layout
**Legal (3):** Terms, Contact, layout
**Localization:** 240+ translation keys, Arabic + English, RTL with I18nManager

### 2.4 User App — 36 Screen Files, 11 Service Files

**Auth (4):** onboarding, phone-entry, otp-verify, layout
**Guest tabs (6):** Search/Home, Favorites, Bookings, Conversations, More, layout
**Host tabs (6):** Dashboard, Listings, Bookings, Messages, More, layout
**Account (7):** Profile, Wallet, Payment methods, Notifications, FAQ, Terms, Privacy
**Booking flow (3):** Checkout, Confirmation, Search results
**Search flow (3):** Destination, Type/guests, Dates
**Detail screens (4):** Listing detail, Gallery, Chat, Root entry
**Host screens (2):** Add listing, Earnings
**Localization:** 114+ translation keys, Arabic + English, RTL support, MMKV persistence

---

## 3. Feature Parity Analysis

### 3.1 Authentication

| Feature | Website | Host App | User App | Backend |
|---------|---------|----------|----------|---------|
| Email/password login | YES | NO | NO | YES |
| Phone OTP login | NO | YES | YES | YES |
| Registration (email) | YES | NO | NO | YES |
| Registration (phone) | NO | YES (implicit) | YES (implicit) | YES |
| Token refresh | YES (cookie) | YES (rotation) | YES (rotation) | YES |
| Upgrade to host | YES | N/A | YES | YES |
| Forgot password | YES | NO | NO | YES |
| Onboarding flow | NO | YES | YES | YES |
| Admin login | YES | NO | NO | YES |
| Device token registration | NO | YES | YES | YES |

**Gap:** Website uses email/password only; mobile apps use phone/OTP only. No unified auth flow. A user who registers on web cannot log in on mobile and vice versa unless the backend links phone+email to the same account (not verified in code).

### 3.2 Property Discovery & Booking

| Feature | Website | Host App | User App | Backend |
|---------|---------|----------|----------|---------|
| Property search | YES | N/A | YES | YES |
| Filter by city/type/price/guests | YES | N/A | YES | YES |
| Property detail view | YES | YES (host view) | YES | YES |
| Image gallery | YES | YES | YES | YES |
| Availability check | YES | YES (calendar) | YES | YES |
| Create booking | YES | N/A | YES | YES |
| Cancel booking | YES | N/A | YES | YES |
| View own bookings (guest) | YES | N/A | YES | YES |
| View host bookings | YES | YES | YES | YES |
| Update booking status | YES (host) | YES | NO | YES |
| Wishlist/favorites | YES | NO | YES | YES |

**Gap:** Host App cannot update booking status from the reservations screen (no accept/reject buttons found in the reservation detail — only view). User App lacks booking status update for hosts who use it. Website has full guest + host booking management.

### 3.3 Payments

| Feature | Website | Host App | User App | Backend |
|---------|---------|----------|----------|---------|
| Moyasar card payment | YES (CDN form) | NO | NO (placeholder) | YES |
| Payment verification | YES | NO | YES (service exists) | YES |
| Saved payment methods | NO | YES (bank/STC Pay) | YES (card-based) | YES |
| Wallet balance | NO | NO | YES | YES |
| Wallet transactions | NO | NO | YES | YES |
| Coupon validation | YES | NO | YES | YES |
| Host earnings view | YES | YES | YES | YES |
| Host payment method config | NO | YES | NO | YES |
| Host transfer duration | NO | YES | NO | YES |
| Invoices/statements | NO | YES | NO | YES |
| Refund processing | YES (admin) | NO | NO | YES |

**Critical gap:** User App's payment-methods screen has a `return` statement before the actual card-saving logic (dead code after line 105 in payment-methods.tsx). The "Add Card" button shows an informational alert about Moyasar but never actually saves a card. The actual Moyasar payment form (CDN-loaded) only exists on the Website. Mobile checkout exists but may not complete payment on native devices without a WebView-based Moyasar form.

### 3.4 Messaging

| Feature | Website | Host App | User App | Backend |
|---------|---------|----------|----------|---------|
| Conversation list | YES | YES | YES | YES |
| Send/receive messages | YES | YES | YES | YES |
| Real-time delivery | YES (Socket.IO) | YES (Socket.IO) | Partial (5s polling + Socket.IO) | YES |
| Block user | YES | NO | YES | YES |
| Support chat | NO | YES | NO | YES |
| Unread count | YES | YES | YES | YES |

**Gap:** User App uses 5-second polling as fallback in ChatScreen alongside Socket.IO. Host App has dedicated support chat. Website and User App lack dedicated support chat (User App has FAQ + Terms instead).

### 3.5 Reviews

| Feature | Website | Host App | User App | Backend |
|---------|---------|----------|----------|---------|
| View property reviews | YES | YES | YES | YES |
| Create review | YES | NO | NO | YES |
| Update review | YES | NO | NO | YES |
| Delete review | YES | NO | NO | YES |
| Host reply to review | YES | YES | NO | YES |
| Reviews summary | NO | YES | NO | YES |

**Gap:** User App has NO review creation screen. After a completed booking, a guest using the mobile app cannot leave a review. This is a significant UX gap since most bookings will originate from mobile.

### 3.6 Notifications

| Feature | Website | Host App | User App | Backend |
|---------|---------|----------|----------|---------|
| Notification list | YES | YES | YES | YES |
| Mark as read | YES | YES | YES | YES |
| Mark all as read | YES | YES | YES | YES |
| Unread count badge | YES | YES | YES | YES |
| Push notifications | NO | YES (FCM) | YES (FCM) | YES |
| NPS survey modal | NO | YES | NO | YES |

### 3.7 Host-Specific Features

| Feature | Website | Host App | User App |
|---------|---------|----------|----------|
| Dashboard stats | YES | YES | YES (basic) |
| Weekly reports | NO | YES | NO |
| Calendar management | YES | YES | NO |
| Block dates | YES | YES | NO |
| Property CRUD | YES | YES | YES (add only) |
| Toggle listing status | YES | YES | YES |
| Pricing management | NO | YES | NO |
| Discount/offers | NO | YES | NO |
| Ambassador program | NO | YES | NO |
| Reservation managers | NO | YES | NO |
| Booking rules | NO | YES | NO |
| VAT settings | NO | YES | NO |
| Tourism permits | NO | YES | NO |
| Host protection | NO | YES | NO |
| Suggestions | NO | YES | NO |
| Referrals | NO | YES | NO |
| Discount codes | NO | YES | NO |
| Complaints | NO | YES | NO |

**Observation:** The Host App is the most feature-complete platform for hosts. The Website has basic host features. The User App's host mode has minimal features (dashboard, listings, bookings, messages, earnings, add-listing).

### 3.8 Admin Features

| Feature | Website | Host App | User App |
|---------|---------|----------|----------|
| Admin dashboard | YES | NO | NO |
| User management | YES | NO | NO |
| Property moderation | YES | NO | NO |
| Booking management | YES | NO | NO |
| Payment management | YES | NO | NO |
| Activity logs | YES | NO | NO |
| Support tickets | YES | NO | NO |
| Reports/complaints | YES | NO | NO |

**Observation:** Admin features are exclusively on the Website. This is appropriate for desktop-oriented admin workflows.

---

## 4. Workflow Consistency

### 4.1 Guest Booking Flow

| Step | Website | User App | Consistent? |
|------|---------|----------|-------------|
| 1. Search | Search bar + filters | Search bar + filter modals | YES (different UX, same API) |
| 2. View listing | `/listings/[id]` | `/listing/[id]` | YES |
| 3. Select dates | Calendar widget | Date picker modal | YES |
| 4. Checkout | `/booking/[id]` with Moyasar form | `/checkout/[propertyId]` | PARTIAL |
| 5. Payment | Moyasar CDN credit card form | Service call (no Moyasar form) | NO |
| 6. Confirmation | Payment callback page | `/checkout/confirmation` (Arabic) | PARTIAL |
| 7. View booking | `/dashboard/bookings` | `/(tabs)/bookings` | YES |
| 8. Cancel booking | Cancel button | Cancel button | YES |

**Issue:** Payment step diverges. Website loads Moyasar's CDN form for PCI-compliant card entry. User App calls `paymentService.initiatePayment()` but there's no equivalent Moyasar form rendered on mobile. The checkout screen exists but the actual card input for Moyasar on native is missing (would need WebView or Moyasar's mobile SDK).

### 4.2 Host Booking Management Flow

| Step | Website | Host App | Consistent? |
|------|---------|----------|-------------|
| 1. View incoming | `/host/bookings` | `/(tabs)/reservations` | YES |
| 2. Accept/reject | Status update buttons | View only (no action buttons visible) | NO |
| 3. View calendar | `/host/calendar` | `/(tabs)/calendar` | YES |
| 4. Block dates | Date range selector | Calendar interaction | YES |

**Issue:** Host App's reservation detail screen appears to be view-only. The `hostService` has no `updateBookingStatus()` method. Hosts using only the mobile app cannot accept or reject bookings.

### 4.3 Data Field Mapping

| Concept | Backend Schema | Website API | Host App API | User App API |
|---------|---------------|-------------|--------------|--------------|
| Price per night | `pricing.perNight` | `pricing.perNight` | `pricing.perNight` | `pricing.perNight` |
| Bedrooms | `capacity.bedrooms` | `capacity.bedrooms` | Via unit detail | `capacity.bedrooms` (fixed in this session) |
| Booking status | `status` enum | Correct | Correct | Correct |
| Guest count | `guests.adults/children/infants` | Correct | Correct | Correct |

**Fixed this session:** User App's `add-listing.tsx` was sending `details.bedrooms` and `pricing.basePrice` (wrong field names). Corrected to `capacity.bedrooms` and `pricing.perNight`.

---

## 5. UX & Navigation Consistency

### 5.1 Navigation Architecture

| Platform | Structure | Tab Count | Primary Nav |
|----------|-----------|-----------|-------------|
| Website | Sidebar + top nav | N/A | Header menu |
| Host App | Bottom tabs | 5 (Dashboard, Properties, Calendar, Reservations, More) | Tab bar |
| User App (Guest) | Bottom tabs | 5 (Search, Favorites, Bookings, Messages, More) | Tab bar |
| User App (Host) | Bottom tabs | 5 (Dashboard, Listings, Bookings, Messages, More) | Tab bar |

### 5.2 Empty States

| Screen | Website | Host App | User App |
|--------|---------|----------|----------|
| No bookings | Generic text | Styled empty state | Styled empty state |
| No messages | Generic text | Styled empty state | Styled empty state |
| No favorites | N/A | N/A | Styled empty state |
| No properties | Generic text | Styled empty state | Styled empty state |
| No notifications | Generic text | Styled empty state | Styled empty state |

**Observation:** Mobile apps have consistently styled empty states with icons and messages. Website empty states are more basic.

### 5.3 Error Handling

| Pattern | Website | Host App | User App |
|---------|---------|----------|----------|
| Network error | Axios interceptor + toast | Axios interceptor + Alert | Axios interceptor + toast |
| Auth expiry | Redirect to `/auth` | Redirect to phone-entry | Redirect to phone-entry |
| 404 page | Not found page | Stack pop | Stack pop |
| Form validation | Zod schemas + inline errors | react-hook-form + Zod | Inline validation |
| Loading states | Skeleton components | ActivityIndicator | ActivityIndicator + Skeleton |

### 5.4 Language & Localization

| Aspect | Website | Host App | User App |
|--------|---------|----------|----------|
| Languages | en + ar (300+ keys) | en + ar (240+ keys) | en + ar (114+ keys) |
| RTL support | HTML dir attribute | I18nManager.forceRTL | I18nManager.forceRTL |
| Font switching | Inter / Noto Sans Arabic | Platform defaults | Platform defaults |
| Persistence | localStorage | MMKV | MMKV |
| Completeness | High | High | Medium |

**Gap:** User App has significantly fewer translation keys (114 vs 240/300). Some screens may show untranslated English text when Arabic is selected.

---

## 6. Gaps & Risks

### 6.1 Critical Gaps

| # | Gap | Impact | Severity |
|---|-----|--------|----------|
| 1 | **No Moyasar payment form on mobile** | Users cannot complete bookings on native mobile app | CRITICAL |
| 2 | **No review creation on User App** | Guests on mobile cannot leave reviews after stays | HIGH |
| 3 | **Host App cannot accept/reject bookings** | Hosts must use website to manage booking requests | HIGH |
| 4 | **Auth systems are disconnected** | Web uses email/password, mobile uses phone/OTP; no account linking | HIGH |
| 5 | **Dead code in payment-methods.tsx** | Lines 107-111 unreachable after `return` on line 105 | MEDIUM |
| 6 | **File uploads stored on local disk** | Railway server filesystem is ephemeral; uploads will be lost on redeploy | CRITICAL |
| 7 | **No MongoDB replica set on Railway** | Transactions (multi-document atomicity) cannot be used | HIGH |
| 8 | **User App translation coverage at 38%** | 114 keys vs 300 (website); Arabic UX will be incomplete | MEDIUM |
| 9 | **No dedicated support chat in User App** | Users have FAQ/Terms but no way to chat with support | MEDIUM |
| 10 | **Chat uses 5s polling fallback** | Increases server load; messages may feel delayed | LOW |

### 6.2 Security Concerns

| # | Concern | Details |
|---|---------|---------|
| 1 | **OTP dev bypass code `000000`** | Must be disabled in production; currently active for testing |
| 2 | **Local file storage** | No CDN, no signed URLs; uploaded images served directly from Express static |
| 3 | **No HTTPS enforcement in code** | Relies on Railway/Vercel for TLS termination (acceptable but not explicit) |
| 4 | **Moyasar publishable key in client** | Expected by Moyasar design, but ensure secret key is never exposed |
| 5 | **expo-secure-store web fallback** | localStorage is not encrypted; tokens on web preview are less secure than native |

### 6.3 Scalability Concerns

| # | Concern | Details |
|---|---------|---------|
| 1 | **No cron jobs** | No automated cleanup of expired bookings, no reminder emails, no report generation |
| 2 | **In-memory rate limiting fallback** | If Redis is down, rate limits reset on server restart |
| 3 | **Socket.IO single-server** | No Redis adapter for Socket.IO; cannot scale horizontally |
| 4 | **No image optimization** | No CDN, no resizing, no WebP conversion; large images served as-is |
| 5 | **No database indexes documented** | Beyond TTL indexes on OTP/RefreshToken, index strategy is unclear |

---

## 7. Recommendations

### 7.1 Immediate (Pre-Launch)

| Priority | Action | Effort |
|----------|--------|--------|
| P0 | **Integrate Moyasar mobile SDK or WebView payment** for User App checkout | 2-3 days |
| P0 | **Move file uploads to Vercel Blob or S3** — Railway filesystem is ephemeral | 1-2 days |
| P0 | **Disable OTP dev bypass (`000000`)** in production environment | 1 hour |
| P0 | **Add booking accept/reject to Host App** reservation detail screen | 1-2 days |
| P1 | **Add review creation screen to User App** (post-booking flow) | 1-2 days |
| P1 | **Link phone + email accounts** in backend auth so users can log in from any platform | 2-3 days |
| P1 | **Remove dead code** in payment-methods.tsx (lines 107-111) | 30 min |
| P1 | **Add support chat to User App** (reuse Host App's support chat pattern) | 1 day |

### 7.2 Short-Term (Post-Launch)

| Priority | Action | Effort |
|----------|--------|--------|
| P2 | Increase User App translation coverage from 114 to 300+ keys | 2-3 days |
| P2 | Add cron jobs for expired booking cleanup and reminder notifications | 1-2 days |
| P2 | Set up Redis adapter for Socket.IO horizontal scaling | 1 day |
| P2 | Add image optimization pipeline (resize, WebP, CDN) | 2-3 days |
| P2 | Add MongoDB indexes for frequently queried fields | 1 day |
| P2 | Replace chat polling with pure Socket.IO real-time messaging | 1 day |
| P3 | Add push notification handling in User App (deep linking on tap) | 2 days |
| P3 | Add offline support with React Query persistence | 2-3 days |

### 7.3 Architecture Improvements

| Action | Rationale |
|--------|-----------|
| Migrate to MongoDB Atlas (replica set) | Enable multi-document transactions for atomic booking+payment |
| Add Redis-backed Socket.IO adapter | Required for multi-instance deployment |
| Implement webhook retry queue | Moyasar webhooks need reliable processing |
| Add end-to-end type sharing | Share TypeScript types between backend and all frontends |
| Add API versioning strategy | Current `/api/v1` needs a plan for backward compatibility |

---

## 8. Final Verdict

### Maturity Assessment

| Platform | Screens | API Coverage | Real-time | Payments | Auth | i18n | Overall |
|----------|---------|-------------|-----------|----------|------|------|---------|
| **Website** | 44 pages | HIGH | YES | YES (Moyasar) | Email/pass | 300+ keys | **Production-ready (80%)** |
| **Host App** | 69 screens | VERY HIGH | YES | Host-side only | Phone/OTP | 240+ keys | **Near production-ready (75%)** |
| **User App** | 36 screens | MEDIUM | PARTIAL | INCOMPLETE | Phone/OTP | 114 keys | **Beta quality (55%)** |
| **Backend** | 97+ endpoints | — | YES | YES | Both flows | — | **Production-ready (85%)** |

### Summary

The Hostn platform is a **well-architected multi-platform vacation rental system** with strong backend foundations and comprehensive feature coverage. The backend is the most mature component with 17 models, 97+ endpoints, proper security (JWT rotation, rate limiting, input validation, file upload security), and real-time Socket.IO support.

**The Website** is the most feature-complete frontend with full guest, host, and admin workflows, Moyasar payment integration, and comprehensive localization.

**The Host App** is impressively deep with 69 screens covering Saudi-market-specific features (ambassador program, tourism permits, host protection, VAT settings, invoices/statements). However, the critical gap of not being able to accept/reject bookings from the app undermines its core purpose.

**The User App** is the weakest link. While it has solid search, booking flow, and dual-role (guest/host) navigation, the lack of functional mobile payment, no review creation, and incomplete translations make it not yet ready for production use.

### Production Readiness Score: 72/100

**Breakdown:**
- Backend API: 85/100 (solid, needs replica set + file storage migration)
- Website: 80/100 (feature-complete, needs minor UX polish)
- Host App: 75/100 (deep features, needs booking management actions)
- User App: 55/100 (needs payment, reviews, translations, support chat)
- Cross-platform consistency: 60/100 (auth disconnect, feature gaps between platforms)
- Infrastructure: 65/100 (ephemeral file storage, no cron, single-server Socket.IO)

### Path to 90/100

1. Fix the 8 P0/P1 items in Section 7.1 (+12 points)
2. Migrate file storage to cloud (+3 points)
3. Complete User App translations (+2 points)
4. Add cron jobs and monitoring (+1 point)

**Estimated effort to production-ready: 2-3 weeks of focused development.**
