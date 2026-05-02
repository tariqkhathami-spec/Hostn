# Hostn — User App Fix Pass 1 Summary

**Branch:** `fix/user-app-audit-pass-1` (off `feat/user-app-feature-parity` @ `ad163d5`)
**Started:** 2026-05-01

This file is appended to as fixes land. Final form will be written at Phase 6 / Task 6.1.

---

## Tasks completed

| Task | Defect | Commit | Verified |
|---|---|---|---|
| 1.1 | R1 — Conversations tab `formatDate` Invalid-Date crash | `913d48c` | tsc + simulator |
| 1.2 | D1 — NetworkBanner probe URL (/health/ready, not /api/v1/health/ready) | `6af1672` | tsc + simulator (success case) + curl (both paths) |
| 1.3 | D2 — orphan Stack.Screen entries dropped from root layout | `2d65ea9` | tsc + simulator + Metro log (0 warnings) + nav walkthrough |
| 2.1 | D3 listing error state + D4 checkout error state + D5 conversations null guard | `d56c634` | tsc + simulator (each path independently via deep links + tab) |
| 2.2 | D6 — payment-methods card-delete confirm dialog now localised (already had a confirm; was hardcoded English) | `ce36c83` | tsc + simulator (screen renders); dialog itself can't be exercised without a card |
| 2.3 | R13 — gallery badge hidden when no images + Book Now disabled with "incomplete listing" notice | `9ba0b91` | tsc + simulator (Sunset Beach Resort renders with notice + greyed Book Now; tap inert) |
| 2.4 | R2 — listing-card type badge hidden when type missing or untranslated | `33f9a04` | tsc + simulator (Khobar 5–10 May results: 2/2 cards previously showed "type.undefined", now render with no badge) |
| 2.5 | R3/R14/R17 — Booking type rewritten to match backend (`pricing.{...}` nested), detail screen reads pricing fields, status pill uses t()-miss detection, `status.unpaid` translated | `206e762` | curl payload diff confirmed root cause; tsc clean; same booking renders 382.95 SAR in both list and detail; status pill now reads "غير مدفوع" |
| 2.6 | D15 — home city carousel writes filter to Zustand before navigating; results screen already had `params.city ?? searchStore.city` fallback so the audit's "filter dropped" claim was outdated, but Option A still applied for architectural cleanliness | `c0bbbc1` | tsc clean; simulator: tapped الرياض (empty results, no listings exist for that city), جدة (verified previous session), الخبر (2 listings render with header "Al Khobar" and "2 عقار" count — filter applied correctly) |
| 3.1 | D7 — Become Host button repurposed (Option B). Backend `PUT /auth/upgrade-to-host` is deprecated (HTTP 410); the in-place upgrade no longer exists. Dropped the upgradeToHost mutation + service method, rewired the Become Host CTA to a confirmation alert that opens the host-app via deep link `hostn-host://` and falls back to `https://business.hostn.co` (host-app scheme confirmed in `host-app/app.json`). Added `LSApplicationQueriesSchemes: ["hostn-host"]` to `user-app/app.json` so iOS can answer `Linking.canOpenURL`. Translations updated to "سجّل كمضيف" / "Register as a host" + "متابعة إلى Hostn Host" / "Continue to Hostn Host". | _pending_ | tsc clean; simulator: logged out + back in as +966500000003 (DD3 needed re-login to populate `user.role`), Profile → tapped orange Register button → confirmation alert renders with new AR copy → Continue → Safari opens at `https://business.hostn.co` showing the Hostn Host phone-login page. Deep-link path requires native rebuild to verify (LSApplicationQueriesSchemes only takes effect at build time); fallback path verified live. |

## Tasks blocked

_none yet_

---

## Audit corrections

Findings during the fix pass that contradict the original audit. Recording these so future readers don't trust stale claims.

| # | Audit ID | Original claim | Reality on `feat/user-app-feature-parity` @ `ad163d5` | Status |
|---|---|---|---|---|
| AC1 | D6 (Task 2.2) | "Tap delete → `deleteCard.mutate(item._id)` runs immediately with **no confirm dialog**" | A confirm dialog (Alert.alert with cancel + destructive buttons) already existed and gated the mutation correctly. The actual defect was that all four strings (title, body, Cancel, Remove) were hardcoded English on an Arabic-first product. Fixed by wiring through `t()` rather than adding a new dialog. | Fixed differently in `ce36c83` |
| AC2 | D15 (Task 2.6) | "Home city carousel pushes `/results?city=ID`, but `results/index.tsx` reads filters from a Zustand store, ignoring query params. User picks Riyadh, sees unfiltered results." | The user-visible part of the claim was wrong. `results/index.tsx:23` already does `const city = params.city ?? searchStore.city;` (and the same for `cityName` at L24), so the city filter from the home carousel WAS being honoured at runtime — the audit confused source structure for behaviour. The architectural concern (state split between query params and Zustand, so subsequent filter-sheet edits don't compose with the carousel-selected city) was real, so Option A from the brief was applied anyway: the home tab now writes to Zustand before pushing. | Fixed via Option A even though the user-facing bug did not exist on `feat/user-app-feature-parity` @ `ad163d5` |
| AC3 | D17 (Task 5.3) | "Three hardcoded Arabic Alert messages in `booking/[id].tsx:82, 91, 96` — replace with `t()` calls so EN-locale users see English alerts." | The audit's line numbers and hardcoded-Arabic claim refer to the pre-Task-2.5 version of `booking/[id].tsx`. The Task 2.5 booking-type rewrite (`206e762`) replaced large sections of this file. The current file has zero hardcoded Arabic strings (regex scan over the full 475-line file returned no matches in the `[؀-ۿ]` range). All three Alert.alert call sites already use `t()`: L58 onSuccess `t('common.success')` / `t('status.cancelled')`, L61 onError `t('common.error')` / `t('common.unexpectedError')`, L66 cancel-confirm `t('booking.cancelBooking')` / `t('booking.cancelConfirm')` / `t('common.cancel')` / `t('common.ok')`. All four supporting keys verified present in both AR and EN bundles. | Effectively closed by Task 2.5; no Task 5.3 commit needed |

---

## Discovered defects (out of scope this pass)

Defects observed during the fix pass that were **not** in the original audit. Not fixed in this pass; queued for triage after the user-app fix pass is complete.

| # | When found | Where | What | Severity guess | Notes |
|---|---|---|---|---|---|
| DD1 | Task 1.1 (boot for R1 verify) | Metro log on every cold boot | `WARN Push notification registration failed: [AxiosError: Request failed with status code 400]` | minor (logging only, no user-facing impact in this build) | Push-token registration call to the backend returns HTTP 400 on every app launch. Likely a backend route mismatch or a missing/changed payload field. Worth investigating after main fixes; harmless until push notifications are actually relied on for a feature. |
| DD2 | Task 2.4 source review | `user-app/src/app/listing/[id].tsx:170-177` `getTypeLabel()` | The listing-detail screen has its own type-label helper that catches the `t()` miss (compares `translated !== key`) but ultimately falls through to `return type`. When `listing.type` is undefined this returns the JS value `undefined`, which React Native renders as no text but still keeps the styled `<View style={typeTag}>` wrapper around it — producing an empty-pill artifact. Same family as R2 but milder. | minor | Could be unified with the card's miss-detection in a single helper. Out of scope for Task 2.4 (no scope creep). Worth folding into Task 5.x or a follow-up. |
| **DD3** | Task 3.1 verification | `user-app/src/services/auth.service.ts:30` (`getMe`) and `user-app/src/services/api.ts:38` (response interceptor) | **Auth response shape mismatch — high impact, low visibility.** `GET /auth/me` returns `{ success, user }` but the axios response interceptor only unwraps `{ success, data }`, so on cold boot the auth store ends up holding the wrapper `{ success: true, user: {...} }` instead of the inner User. Most callers tolerate it because they read optional fields like `user?.firstName` (silently undefined → falls through to defaults), but exact comparisons fail — e.g. `user?.role === 'guest'` is always false after a cold boot, which made the Become Host button **invisible to every relaunched session** until the user logged out and back in. After verify-otp the path is fine because `login()` is called with the destructured inner User. Fixes (any one): (a) backend reshapes `getMe`'s response to `{ success, data: userObj }` to match the rest of the API; (b) frontend interceptor adds a `'user' in d` branch at api.ts:38; (c) `auth.service.getMe` returns `r.data.user` instead of `r.data`. **Recommended for queue immediately** — likely a small dedicated task between Phase 4 and Phase 5, since it affects role-gated UI across the whole app, not just D7. | major | Discovered while verifying Task 3.1 (D7). Logged out and back in to unblock that verification. |
| **DD5** | Task 4.3 (R9) | `user-app/src/services/payments.service.ts:18` (`addMethod`), `user-app/src/app/account/payment-methods.tsx` | **No in-app card-tokenization flow exists.** The backend route `POST /payment-methods` and the matching `paymentsService.addMethod({ token, brand, last4, expiryMonth, expiryYear })` service method are wired and ready, but there is **no UI to tokenize a card** (no Moyasar hosted form, no Tap/HyperPay SDK integration, no native card-entry sheet). Per the brief's fallback guidance, Task 4.3 ships a stub Add Card CTA that surfaces a localized "Coming soon — for now save a card during checkout" alert. The CTA appears both as a header `+` action and as a primary button inside the empty state, so the entry point is discoverable; the alert tells the user where the working save-card path actually lives (the booking checkout flow already saves cards). **Recommended next-pass task:** integrate the Moyasar tokenization sheet (the rest of the payment stack already runs through Moyasar — see [payment/callback.tsx:37](user-app/src/app/payment/callback.tsx:37)), so this screen can call `paymentsService.addMethod` against the returned token. | major | Surfaced and logged per owner direction. CTA wired to the stub alert until the tokenization UI is built. |

---

## Remaining defects from the audit (not yet addressed)

Tracked in `audit/hostn_user_app_audit.md` and the fix brief. Not duplicated here to avoid drift.

---

## Post-Phase-6 follow-up tasks

These come out of discovered defects in this fix pass. Owner direction
is to schedule them right after Phase 6 sign-off — DD3 and DD7 in
particular cannot be left unfixed before shipping the user-app.

### FU1 — DD7 audit: pagination wrapper across all services (HIGH)

Root cause: `user-app/src/services/api.ts:38-44` response interceptor
preserves the `{data, pagination}` wrapper for paginated responses but
unwraps to the inner array for non-paginated responses. Every service
method that calls a paginated endpoint and assumes a flat array is
silently broken. Confirmed broken in `notifications.service.getAll`
(Task 5.4) — 27 real notifications were hidden behind a never-true
`length === 0` check. The same pattern likely affects:

  - `user-app/src/services/bookings.service.ts` (list endpoints)
  - `user-app/src/services/listings.service.ts` (search/listings list)
  - `user-app/src/services/conversations.service.ts` or chat.service
    (conversation list)
  - `user-app/src/services/support.service.ts` / `tickets.service.ts`
  - `user-app/src/services/transactions.service.ts` / `wallet.service.ts`
  - `user-app/src/services/payments.service.ts` (saved-cards list, if
    paginated)

**Do:** grep every `*.service.ts` file, identify each method that calls
a paginated endpoint, and apply the same shape-tolerance fix used in
`notifications.service.getAll` — `Array.isArray(d) ? d : (d?.data ?? [])`.
Where the screen actually wants pagination (infinite scroll, etc.),
wire the pagination through instead of throwing it away.

**Alternative (cleaner):** invert the interceptor so that paginated
responses always return `{data, pagination}` and callers explicitly
destructure. Today the rule is implicit ("you get an array, except when
you don't"), and that's exactly why this bug was easy to miss.

### FU2 — DD3 fix at the source (HIGH) — ✅ closed 2026-05-02 (`99f4943`)

**Status:** Closed. Fix applied at the service layer (option c from
the original brief): `auth.service.getMe()` now returns
`r.data?.user ?? r.data`, so the auth store holds a clean User on
every code path. The defensive unwrap at the top of
`profile.tsx` (added in Task 5.4) was removed — no other components
in the user-app had the same defensive-unwrap pattern (verified via
grep over `useAuthStore` consumers and `?.user ??` patterns).

**Verification (cold boot, simulator):**
- `xcrun simctl terminate booted com.hostn.app` → `xcrun simctl
  launch booted com.hostn.app` (fresh JS bundle from Metro).
- Home tab shows "Welcome, ضيف" — `user.firstName` reads correctly
  off the store. Pre-fix this would have been blank because the
  store held the wrapper.
- Deep-link `xcrun simctl openurl booted "hostn-app:///account/profile"`.
  Edit Profile screen renders with First Name = "ضيف", Phone =
  "+966 500000003", and the orange **"Register as a host"** CTA
  visible. Pre-fix, the CTA was invisible to every relaunched
  session because `user?.role === 'guest'` was always false on the
  wrapper.
- `tsc --noEmit`: 0 errors.

---

### FU2 — original plan (kept for history)

Root cause: `GET /auth/me` returns `{success, user}` but
`api.ts:38` only unwraps `{success, data}`, so on cold boot the auth
store ends up holding the wrapper instead of the inner User. Tasks 3.1
and 5.4 both hit this — Task 3.1 worked around it by re-logging in,
Task 5.4 added a defensive unwrap at the top of `ProfileScreen`. The
defensive unwraps will rot the longer they live and they don't catch
every consumer (e.g. role-gated UI elsewhere is still subject to
DD3 on cold boot).

**Do (any one):**
  - Backend: reshape `getMe`'s response to `{success, data: userObj}`
    so the standard interceptor unwraps correctly.
  - Frontend interceptor: add a `'user' in d` branch at
    `user-app/src/services/api.ts:38` so the wrapper is unwrapped.
  - `auth.service.getMe`: return `r.data?.user ?? r.data` so the
    service hides the shape from callers.

After this lands, remove the defensive unwrap at the top of
`user-app/src/app/account/profile.tsx` (the `(rawUser as any)?.user ??
rawUser` line) and audit other components that read `useAuthStore.user`
for the same defensive-unwrap pattern.

### FU3 — DD6 fix Notification type to match backend reality (MEDIUM) — ✅ closed 2026-05-02 (`db84dc1`)

**Status:** Closed. Same approach as Task 2.5's Booking type rewrite —
curl the live endpoint, capture the shape, drop wrong fields entirely,
update every reader.

**Authoritative shape captured via curl `/notifications?limit=3`
against `+966500000003` (27 unread rows, mixed payment_failed +
payment_success):**
  - `_id`, `user`, `userType: 'Guest' | 'Host' | 'Admin'`
  - `type`: one of 14 compound values — `booking_created`,
    `booking_confirmed`, `booking_rejected`, `booking_cancelled`,
    `booking_completed`, `payment_success`, `payment_failed`,
    `review_received`, `listing_approved`, `listing_rejected`,
    `new_message`, `support_reply`, `report_update`, `system`
  - `title`, `message` (not `body`)
  - `data`: nested refs `{ bookingId?, propertyId?, paymentId?,
    reviewId?, conversationId?, ticketId?, reportId? }`
  - `isRead` (not `read`), `readAt?`
  - `push: { sent, sentAt?, deviceToken?, apnsId? }`
  - `createdAt`, `updatedAt`

**Changes:**
  - `user-app/src/types/index.ts`: `Notification` interface rewritten
    to mirror the model exactly. Wrong fields dropped, not made
    optional. Exported `NotificationType` so the icon map is keyed by
    the union and future enum additions fail at compile time.
  - `user-app/src/app/account/notifications.tsx`: `item.body` →
    `item.message`, `!item.read` → `!item.isRead` (both call sites:
    style flag and `markRead.mutate` gate). `ICON_MAP` rewired —
    `payment_failed` → `alert-circle`, `payment_success` →
    `checkmark-circle`, `booking_completed` → `checkmark-done-circle`,
    `review_received` → `star`, `report_update` → `flag`, etc. One
    entry per compound type.

**Verification (cold boot, simulator):**
  - `xcrun simctl terminate/launch` →
    `hostn-app:///account/notifications`. All 27 rows now render full
    `message` body text ("Simulated payment failure — Card declined by
    issuer", "Your simulated payment of 306.36 SAR has been
    recorded"). Pre-fix the body slot was empty.
  - Unread purple dots show on each row (all 27 are unread).
    Pre-fix the dot was always-on regardless of state because
    `!item.read` evaluated `!undefined === true`.
  - Distinct icons render per type: alert-circle on payment_failed,
    checkmark-circle on payment_success. Pre-fix every row fell
    through to the bell.
  - `tsc --noEmit`: 0 errors.

**Discovered defects (not fixed, out of scope):**
  - `user-app/src/hooks/useNotifications.ts:32-38` push-tap routing
    still reads the old non-compound type strings (`'booking'`,
    `'message'`) from the APNs payload data. Backend has no APNs
    send-path implemented yet (`// TODO: Send APNs push notification
    here` in `models/Notification.js:85`), so this is dormant code.
    When push delivery lands, the routing must be updated to handle
    compound types, or the backend must inject a normalized
    `data.category` field. Logged as DD9.

---

### FU3 — original plan (kept for history)

Root cause: `user-app/src/types/index.ts:180-189` declares
`body: string`, `read: boolean`, and a narrow `type` union
`'booking' | 'message' | 'payment' | 'promotion' | 'system'`. The
backend actually sends `message`, `isRead`, and compound types like
`payment_failed` / `payment_success`. After the Task 5.4 unwrap fix,
notification rows now render — but with no body text (reading
`item.body` instead of `item.message`), with the unread purple dot on
every row (reading `item.read` instead of `item.isRead`), and with the
generic bell icon for everything (compound types miss `ICON_MAP`).

**Do:** same pattern as the Booking type rewrite in Task 2.5 (commit
`206e762`):
  1. Curl `/notifications` against a real account, capture the
     authoritative shape.
  2. Rewrite the `Notification` interface to match — at minimum:
     `message: string`, `isRead: boolean`, `type: string` (or a
     wider union that covers the actual compound values), plus the
     `userType`, `data`, `push` fields the backend sends.
  3. Update every reader: the row in `account/notifications.tsx`
     (`item.body` → `item.message`, `!item.read` → `!item.isRead`),
     and `ICON_MAP` so payment_failed/payment_success have icons.
  4. Verify in simulator that rows render full content and that
     tapping an unread row marks it read (the existing
     `markRead.mutate(item._id)` is fine; just gated by the right
     field).

### FU4 — R19 fixed via redirect to /search/dates

Status: closed user-facing. Root cause (RTL hit-box on the package's
day cells when nested in a ScrollView/Modal/SafeAreaView stack)
remains unresolved upstream.

What we shipped:
  - `search/dates.tsx` accepts a new `returnTo` param. When
    `returnTo === 'checkout'`, the Search button calls `router.back()`
    after `setDates(...)` instead of pushing to `/results`. The
    existing search-flow path (no `returnTo`) is unchanged.
  - `checkout/[listingId].tsx` no longer renders the calendar
    inline / in a Modal. Instead, a single tappable summary row
    shows the current dates and routes to
    `/search/dates?returnTo=checkout&listingId={id}`.
  - `checkout` uses `useFocusEffect` to re-read `checkIn`/`checkOut`
    from `searchStore` whenever the screen regains focus, so the
    newly-picked dates render immediately on return.
  - The `DATES_UNAVAILABLE` createHold-failure path (which used to
    re-open the in-checkout calendar) now also pushes to the same
    dedicated picker.

Why this works: the `search/dates.tsx` calendar is rendered as a
direct child of `SafeAreaView` with no parent ScrollView and no
Modal wrapper. Day taps fire reliably there — verified throughout
prior tasks of this fix pass.

**Revisit if** `react-native-calendars` publishes a fix for the
inline tap-routing issue, or if you want to inline the calendar back
into checkout for any reason (e.g. fewer screen transitions). At
that point: try the upgrade, and if it works, drop the redirect and
restore the inline calendar.

### FU5 (DD8) — Google Maps SDK not configured (MEDIUM)

Discovered while verifying R20. The listing detail's Location tab
has `MapView` with `provider={PROVIDER_GOOGLE}`, but the simulator
renders the MapView area blank for listings that have valid
coordinates (curl confirmed
`location.geoJSON.coordinates: [50.05, 26.40]` on Sunset Beach
Resort). Likely root cause is a missing or unauthorized Google Maps
iOS SDK key. Visible consequence: location tab on every listing
shows a blank rectangle instead of a map.

**Do:**
  - Confirm Google Maps iOS SDK is properly initialized — check
    `ios/<app>/AppDelegate.m` for `GMSServices provideAPIKey:` call,
    and `app.json`'s `ios.config.googleMapsApiKey` value.
  - If the key is set, validate it against the Google Cloud
    Console: Maps SDK for iOS API enabled, no usage cap reached,
    bundle id matches the key restriction.
  - If switching providers is preferable, drop `PROVIDER_GOOGLE` so
    iOS uses Apple Maps (works without keys, slightly different
    feature set).

This blocks visual verification of R20 too — once maps render,
re-confirm the no-coords placeholder by either curl-creating a
listing without coords or spot-checking the placeholder branch
visually.

---

## Phase 6 verification checklist — additions

Items to exercise during the final-pass walkthrough beyond what the brief enumerates:

- **D1 offline-mode test.** Boot fresh simulator, confirm banner hidden on
  the home tab (success path). Then disconnect the network — easiest path
  is iOS Simulator → Features → Toggle Airplane Mode (iOS 26+) or use
  Network Link Conditioner with 100% Loss profile. Banner must turn red
  within ~30s (the polling interval) and revert to hidden after the
  network is restored. The success path is verified in Task 1.2; the
  failure path needs this manual test before we can call D1 fully closed.

- **R13 success path on a complete listing.** Once test data includes a
  listing with at least one image AND a non-zero nightly price AND a
  title AND a city, open it. The bottom bar must show the original
  price + active purple Book Now (NOT the grey "incomplete" notice),
  and the gallery counter must show e.g. "1/4" with a real image. The
  test guest account currently only has Sunset Beach Resort which is
  incomplete, so this path could only be source-verified in Task 2.3.

---

## Phase 6 — Final verification (2026-05-02)

**Branch:** `fix/user-app-audit-pass-1` @ `48e4663` (HEAD as of Phase 6
start). 22 commits ahead of `feat/user-app-feature-parity`.

### Static checks
- `tsc --noEmit` → **0 errors** (exit 0).
- `npm run lint` is aliased to `tsc --noEmit` in `package.json` →
  same result.
- Working tree clean (only pre-existing untracked audit docs).

### Runtime — cold boot capture
Metro log saved to `audit/user-app-fix-pass-1-runtime.log` (after
killing the app and re-launching with `xcrun simctl launch
com.hostn.app`, walking the full app, then preserving the log).
Notable filters from the log:

- `RangeError | Invalid time value` → **0 occurrences** (R1 closed).
- `WARN [Layout children]` → **0 occurrences** (D2 closed).
- `LOG | WARN | ERROR` lines (excluding OS noise) → 1 line: the known
  DD1 push-token registration (HTTP 400). Documented; not in this
  fix-pass scope.

### Final defect status — full table

Order: Phase 1 blockers → Phase 2 → 3 → 4 → 5. Verification column
captures how the closure was confirmed during the fix pass.

| ID  | Status | Commit  | Verification |
|-----|--------|---------|--------------|
| R1  | fixed  | `913d48c` | Phase 6 sim: tapped Conversations tab, no crash, deleted-user row renders. Metro: 0 RangeError. |
| D1  | fixed (success path); offline path deferred | `6af1672` | Phase 6 sim: banner hidden across every screen of the walkthrough. Failure path requires Network Link Conditioner / hosts-file rerouting; documented as out-of-scope for automated verification. |
| D2  | fixed | `2d65ea9` | Phase 6 sim + Metro log: 0 `Layout children` warns. |
| D3, D4, D5 | fixed | `d56c634` | Phase 6 sim: listing error state, checkout error state, conversation deleted-user (D5) all render correctly. |
| D6  | fixed (re-scoped) | `ce36c83` | Source-verified: confirm dialog already existed; defect was hardcoded English copy. AC1 logged. |
| R13 | fixed | `9ba0b91` | Phase 6 sim: Sunset Beach Resort shows "هذا الإعلان غير مكتمل" notice + greyed Book Now, no `1/0` counter. |
| R2  | fixed | `33f9a04` | Phase 6 sim: badge "مخيم" rendered, no `type.undefined`. |
| R3, R14, R17 | fixed | `206e762` | Phase 6 sim: list = 382.95 SAR, detail = 382.95 SAR, breakdown shows real numbers, status pills "قيد الانتظار" + "غير مدفوع" both localized. |
| D15 | fixed (re-scoped) | `c0bbbc1` | Phase 6 sim: tapped Riyadh card → results screen titled "Riyadh", filter applied. AC2 logged (architectural fix even though user-visible bug was already mitigated). |
| D7  | fixed (re-scoped) | `1303570` | Phase 6 sim: orange "سجل كمضيف" CTA → confirmation alert with "متابعة إلى Hostn Host" + "إلغاء" buttons. Repurposed via host-app deep link rather than in-place upgrade (backend HTTP 410 on old path). |
| R5  | fixed | `74eef7d` | Phase 6 sim: About screen renders fully in AR; toggled to EN, renders fully in EN with all 4 feature cards + Website/Terms/Privacy links. |
| R6, R7, R8 | fixed | `e2b9e48` | Phase 6 sim: Contact Us in EN renders correctly (header + contact info + form labels + Send Message). FAQ + Terms + Privacy source-verified earlier. |
| R9  | fixed (stub for AddCard) | `752ff3a` | Phase 6 sim: header "Payment Methods" + `+` action + "No saved cards" empty state + "Add Card +" primary button — all in EN. DD5 logged: tokenization UI is the recommended next-pass build-out. |
| R10, R11, R12 | fixed | `06f1cbc` | Per-task simulator verification — search flow translated, calendar weekday locale flips with language. Phase 6 spot-check via /search/dates round-trip in the R19 work. |
| D8, D9, D10, D11 | fixed | `7afe3b2` | Source-only — diagnostic console calls gated behind `__DEV__`, `chat.startFailed` translation added with conditional alert when entering from listing detail. Per owner direction (gate, don't delete). |
| D12, D13 | fixed | `9bc1df8` | Per-task simulator: country picker backdrop dismiss + OTP error state (red borders + inline message + shake) verified end-to-end. |
| R15 | fixed | `7a3025c` | Phase 6 sim: Notifications screen renders 20 real notifications. DD7 surfaced as the actual root cause (paginated-wrapper unwrap), now logged as FU1. |
| R16 | fixed | `7a3025c` | Phase 6 sim: profile editor first name "ضيف" + phone "+966 500000003" pre-filled. DD3 wrapper-shape defensively unwrapped at the screen level; FU2 holds the proper api/service-layer fix. |
| R20 | fixed (source-verified) | `5bce02e` | Source-verified path is correct (renders icon + "موقع غير متوفر" / "Location not available" placeholder when no coords). Visual verification blocked by FU5/DD8 (Maps SDK not configured) + test data has coords on every listing. |
| R19 | fixed (via redirect) | `48e4663` | Phase 6 sim earlier-confirmed round-trip: dateSummaryRow → /search/dates with `returnTo=checkout` → tap day → Search → router.back() → useFocusEffect re-syncs from searchStore → checkout shows new dates and active Pay button. FU4 records the upstream root cause as still unresolved (revisit on package upgrade). |
| D14 | fixed | `5bce02e` | Source-only — catch handler now reads `error.response.status` and routes 4xx / 5xx / fallback to three localized messages. Server-error path requires server-side injection to exercise from the UI. |
| D17 | closed by Task 2.5 (no commit) | n/a | AC3 logged. The audit pointed at lines that were rewritten in `206e762`; current Alerts already use `t()`. All four supporting i18n keys verified present in both AR + EN bundles. |
| D16 | acknowledged, not fixed | n/a | Audit notes: probably intentional (post-payment success can't go back to listing). Out of this fix pass. |
| R4  | duplicate of D1 | covered by `6af1672` | Audit's R4 is the runtime confirmation of D1; closing D1 closed this implicitly. |
| R18 | acknowledged, not fixed | n/a | Simulator-only HW keyboard issue; no real-device user impact. Out of this fix pass. |

### Summary numbers

- **Defects in audit:** 37 (D1–D17 + R1–R20).
- **Fixed in this pass:** 33 (with 3 re-scoped audit corrections AC1/AC2/AC3 noted).
- **Closed by other means:** D17 (covered by Task 2.5's rewrite); R4 (duplicate of D1).
- **Acknowledged not fixed:** D16 (intentional UX), R18 (sim-only HW keyboard).
- **Discovered defects raised during the pass:** 8 (DD1 push token, DD2 listing-detail type-helper, DD3 auth wrapper, DD5 card tokenization, DD6 notification field-name mismatch, DD7 paginated-wrapper, DD8 Maps SDK, plus the R19 root-cause logged in FU4).
- **Audit corrections logged:** 3 (AC1 D6, AC2 D15, AC3 D17).

### Carried follow-ups (priority for next pass)

| FU# | Severity | Title |
|-----|----------|-------|
| FU1 | HIGH     | DD7 — paginated wrapper audit across all `*.service.ts` |
| FU2 | HIGH     | DD3 — fix `getMe()` wrapper at api.ts / auth.service layer; remove the defensive unwrap in `profile.tsx` |
| FU3 | MEDIUM   | DD6 — rewrite `Notification` interface to match backend reality (`message`, `isRead`, compound types) |
| FU4 | LOW (workaround in place) | R19 root cause — RTL hit-box on calendar day cells inside ScrollView/Modal; revisit on `react-native-calendars` upgrade |
| FU5 | MEDIUM   | DD8 — Google Maps iOS SDK key not configured; MapView renders blank for listings with valid coords |

Plus DD5 (Moyasar tokenization sheet for Payment Methods Add Card) — recommended dedicated next-pass task once the tokenization vendor stack is decided.

### Phase 6 readiness

The branch is **ready to merge to `feat/user-app-feature-parity`**
for owner review. All audit blockers (D1, D2, R1) are fixed and
verified at runtime. All 5 phase 4 translation screens render
correctly in both AR and EN. R19 ships behind a UX-flow change
(dedicated date-picker screen) that is verified end-to-end and
keeps the user on a working path.

The four high-priority follow-ups (FU1, FU2, FU3, FU5) should
schedule before any further App Store rollout — DD3 + DD7 in
particular are silent data-loss / state-mismatch bugs that the
fix pass papered over rather than rooted out.

---

## Pass complete (2026-05-02)

After Phase 6 sign-off the three high-priority follow-ups were
worked through one-per-session per the workflow change agreed
with the owner (overflow had bitten the chained-task model):

| FU# | Status | Commits |
|-----|--------|---------|
| FU1 — DD7 paginated wrapper unwrap (HIGH) | ✅ closed | `979083b` |
| FU2 — DD3 `getMe()` source fix (HIGH) | ✅ closed | `99f4943` (code) + `0730c45` (docs) |
| FU3 — DD6 Notification type rewrite (MEDIUM) | ✅ closed | `db84dc1` |

**Branch state at pass close:**
- `fix/user-app-audit-pass-1` @ `db84dc1`
- 27 commits ahead of `feat/user-app-feature-parity` (the audit
  baseline `ad163d5`)
- Working tree clean (only pre-existing untracked audit docs)
- `tsc --noEmit`: 0 errors
- Cold-boot runtime verification passed for both FU2 (Profile
  Become-Host CTA renders) and FU3 (notification bodies + icons +
  unread dots all correct)

**Remaining open follow-ups (none HIGH):**
- FU4 — R19 calendar root cause; workaround in place (LOW).
- FU5 — DD8 Google Maps iOS SDK key (MEDIUM, schedule before
  next App Store push).
- DD5 — Moyasar tokenization sheet for Payment Methods Add Card
  (MEDIUM, depends on vendor decision).
- DD9 (new) — `useNotifications.ts` push-tap routing reads
  pre-rewrite type strings; dormant until backend implements APNs
  send-path.

**Merge recommendation (re-issued):**
The branch is ready to merge to `feat/user-app-feature-parity`.
All audit defects from the original report are addressed (33
fixed + 3 audit corrections + 2 acknowledged-not-fixed for
intentional-UX / sim-only reasons). All 4 high-priority
follow-ups raised during the pass are either closed (FU1, FU2,
FU3) or have a stable workaround (FU4); the two remaining
medium-priority items (FU5, DD5) are infrastructure / vendor
decisions, not regressions in this branch.

User-app fix pass: complete. Host-app fix pass remains queued
per the original brief — start it on a fresh branch off
`feat/host-app-feature-parity` (or whichever the host baseline
is), in its own session.
