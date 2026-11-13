# Hostn — Host App Audit Report (READ-ONLY)

**Audit date:** 2026-05-01
**Branch / commit baseline:** `feat/user-app-feature-parity` HEAD `ad163d5e33943c2be29d35aad3ac12d3ab528c71`
  ("feat: sync Abdullah's April 19-20 changes — payment simulator, 2dp pricing, booking reference")
**App:** `host-app/` (com.hostn.host, "Hostn Host")
**Device:** iPhone 17 Pro Simulator (iOS 26.4)
**Build:** Debug, **BUILD SUCCEEDED**, 0 errors / 3 build warnings (build-script output dependency hints; cosmetic, do not affect the binary)
**TS check:** `tsc --noEmit` — 0 errors
**Method:** static source audit (every `*.tsx` under `host-app/src/app/**` read line-by-line) + live boot in simulator (Metro bundle loaded successfully, runtime flow exercised)

> **Pre-audit hygiene.** Nine in-flight repair files (6 host-app, 3 user-app) were sitting on the working tree at start. Per the audit protocol they were committed onto a separate branch `chore/in-flight-repairs-pre-audit` (commit `04c8a9e`) so the audit baseline is a single named SHA with no ambiguity. The audit branch's working tree is clean of modifications; only untracked session artifacts (`audit/`, `.claude/`, root `package.json/lock`) remain.

> **Origin tagging.** Each defect is tagged `[branch]`, `[main]`, or `[mixed]` to indicate where the offending code lives:
> - `[branch]` = introduced by `feat/user-app-feature-parity`; has not shipped to production. Fixable in this PR before merge.
> - `[main]` = pre-existing on main; affects current production users. Probably needs a hotfix to main, not just this PR.
> - `[mixed]` = the screen exists on both, but the branch made changes adjacent to the defect (or the branch's behavior change exposed it). Spot-judge per item.

---

## 1. Executive summary

| Metric | Value |
|---|---|
| Screens audited | **56** (every `.tsx` under `src/app/**` excl. `_layout.tsx`) |
| Total LOC of screens | 18,069 |
| Routes referenced from code | All routes register in `_layout.tsx`; navigation graph internally consistent |
| Defects reported below (post-dedupe) | **74** |
| Blockers | **5** |
| Major | **38** |
| Minor | **31** |
| New on branch (origin: branch) | 21 |
| Pre-existing on main (origin: main) | 41 |
| Mixed | 12 |

**Health verdict.** The host app boots, the navigation graph is internally consistent, and `tsc --noEmit` is clean. The branch introduces an entire **PropertyWizard** + **earnings** + **reservations refactor** + **payment simulator** stack that is mostly functional but ships with **endemic schema mismatch between the create wizard (writes nested `pricing.perNight`, `capacity.bedrooms`) and the edit screens (read flat `price`, `bedrooms`)** — this is the highest-priority class of bug on the branch and will silently destroy property data on the first edit round-trip. Beyond the new screens, the entire host app was already **Arabic-hardcoded** before the branch; the branch didn't worsen this but didn't fix it either — bilingual coverage on the host side is essentially absent. Several **dead pressables** ("Add Offer" in pricing, search/info/filter on reservations tab, "Claims" / "Terms" on protection, "Add Permit", footer link on phone-entry) are pre-existing. The phone-login flow has a runtime-confirmed bug where Arabic-Indic digits typed on the phone-pad keypad are silently rejected by the backend with no UI feedback (the user simply cannot log in).

No build failures. No TypeScript errors. No security flags raised.

---

## 2. Screen inventory

| Group | Routes | Key screens |
|---|---:|---|
| Bootstrap | 1 | `index.tsx` (auth bootstrap → onboarding/phone-entry/dashboard) |
| Auth `(auth)` | 4 | onboarding (3-module program), phone-entry (welcome), phone-login, otp-verify |
| Tabs `(tabs)` | 5 | dashboard (684 LOC), reservations, calendar, properties, more (336 LOC) |
| Reservations | 2 | `index`, `[id]` |
| Property | 8 | `[id]`, `add-unit`, `create` (NEW), `duplicate/[id]` (NEW), `edit/[id]` (NEW), `edit-unit/[id]` (NEW), `unit-pricing/[id]` (NEW), `unit/[id]` (964 LOC) |
| Pricing | 2 | `index`, `[unitId]` (655 LOC) |
| Financial | 6 | `index`, `[id]`, `earnings` (NEW), `payment-method`, `transfer-duration`, `transfers` |
| Invoices | 5 | `index`, `[id]`, `statements`, `statement-detail`, `summary` |
| Messages | 3 | `index`, `[id]` (473 LOC), `support` |
| Notifications | 1 | `index` |
| Settings | 4 | `index`, `booking-rules`, `managers`, `vat` |
| Reviews | 2 | `index`, `reply/[id]` |
| Legal | 2 | `contact`, `terms` |
| Profile | 2 | `index`, `edit` |
| Content | 5 | `articles`, `change-requests`, `complaints`, `discount-codes`, `referrals` |
| Permits | 1 | `index` |
| Protection | 1 | `index` |
| Program (Loyalty) | 1 | `index` (736 LOC) |
| Suggestions | 1 | `index` |
| **Total** | **56** | — |

13 screens are **NEW** on this branch (all under `property/*`, plus `financial/earnings.tsx` and `components/property/PropertyWizard.tsx`); 29 screens are **MODIFIED**; 14 are **UNCHANGED** since main.

---

## 3. Defect catalog

### 3.a Blockers

| # | Origin | Type | Screen / element | Reproduction | File:line | Notes |
|---|---|---|---|---|---|---|
| **B1** | branch | data-bug | `/property/edit/[id]` form mapping | After creating a property via the wizard, open it in the edit form. The wizard *writes* nested `pricing.perNight`, `capacity.bedrooms`, `rules.checkInTime`. The edit form *reads* flat `property.price`, `property.bedrooms`, `property.checkInTime`. Every edit round-trip discards the nested values and saves blank/default flat fields back. Silent data loss across price, cleaning fee, bedrooms, bathrooms, max guests, check-in/out times. | `host-app/src/app/property/edit/[id].tsx:111-123` vs PropertyWizard `:59-78` | New flow; will bite first time a host edits a freshly created listing. |
| **B2** | branch | data-bug | `/property/edit-unit/[id]` payload shape mismatch | Submit unit edit. The screen sends `name: form.title`, but every other endpoint that handles units reads `title`. Backend persists null or wrong field for the unit name. Also writes both `capacity.bedrooms` AND `rooms.bedrooms` simultaneously — one is stale on next read regardless of which the backend treats as canonical. | `host-app/src/app/property/edit-unit/[id].tsx:51, 63-72` | Always |
| **B3** | branch | data-bug | `/property/edit-unit/[id]` capacity coalesce stores `[object Object]` | When the API returns `unit.capacity` as an object missing `maxGuests`, `unit.capacity?.maxGuests ?? unit.capacity ?? '2'` falls through to the second fallback which calls `String({...})` and stores the literal string `"[object Object]"` as the form's max-guests value. | `host-app/src/app/property/edit-unit/[id].tsx:121` | Always when API returns capacity object without maxGuests |
| **B4** | branch | crash-prone | `/property/create` non-null `.find()!` | The form uses `DIRECTIONS.find(...)!` (and `CITIES.find(...)!`) with non-null assertions. If a stale form value (saved direction/city, language change, future schema migration) is not present in the constants, `.find()` returns `undefined`, the `!` is a lie, and the screen will throw `TypeError: Cannot read properties of undefined`. | `host-app/src/app/property/create.tsx:243, 254` | Stale data |
| **B5** | mixed | crash-prone | `/(tabs)/reservations` — `t()` called at module load | `statusFilters` is built at module-eval time, so `t(...)` resolves before the i18n locale is initialised. Labels are frozen to whatever the bundle's locale was when the module first imported. If a reservation's row maps the chip's static label, switching language mid-session shows the wrong language; if `t()` returns the key on miss, pills render the literal `reservations.confirmed` etc. | `host-app/src/app/(tabs)/reservations.tsx:29-35` | The branch added new filter keys (`held`) here; the underlying module-load pattern is on main. |

### 3.b Major

| # | Origin | Type | Screen / element | Reproduction | File:line | Notes |
|---|---|---|---|---|---|---|
| M1 | branch | data-bug | `/property/duplicate/[id]` calls wrong endpoint | Action is "Duplicate Unit" but the implementation calls `hostService.createProperty(...)` — bypasses the new Unit API entirely. The duplicated unit will not be attached to its parent property, or will be created as an orphan property. | `host-app/src/app/property/duplicate/[id].tsx:31, 127` | Always; only `groupTag` tag fallback used |
| M2 | branch | data-bug | `/property/unit-pricing/[id]` Save uses flat keys | Submits per-day prices as flat top-level keys (`payload[key] = ...`) and `discountPercent` as a flat key, while the rest of the app reads `pricing.perNight`, `pricing.discountPercent`. Server roundtrip likely loses the data. | `host-app/src/app/property/unit-pricing/[id].tsx:117-123` | Always |
| M3 | branch | data-bug | `/property/unit-pricing/[id]` pre-fill flattens differentials | `pricing[key] ?? pricing.perNight` — if `perNight` is set but a per-day key is missing, every day pre-fills to the same flat number. User saves and silently overwrites all weekday differentials with the flat fallback. | `host-app/src/app/property/unit-pricing/[id].tsx:58` | Common case |
| M4 | branch | crash-prone | PropertyWizard Step 2 review | When `form.city` is set but the corresponding city was removed from `CITIES` (or differs by case/whitespace), `CITIES.find(c => c.value === form.city)` returns `undefined` and the review row would try to render `l(undefined)` → crash. | `host-app/src/components/property/PropertyWizard.tsx:589, 602` | Stale or migrated data |
| M5 | branch | UX | PropertyWizard Step 5 Amenities — no required validation | `canAdvance()` has no case for step 5; user can submit a property with zero amenities, no warning. | `host-app/src/components/property/PropertyWizard.tsx:157-172` | Always |
| M6 | branch | UX | PropertyWizard Step 7 nights validation gap | No check that `minNights ≤ maxNights`. User can set min 30 / max 1, app accepts and submits. | `host-app/src/components/property/PropertyWizard.tsx:157-172` | Always |
| M7 | branch | crash-prone | PropertyWizard image upload error swallowed | `catch {}` block has no parameter binding. A 413/network failure shows a generic alert; mid-loop rejection leaves already-uploaded images orphaned with no per-asset progress indicator. | `host-app/src/components/property/PropertyWizard.tsx:223-251` | Bad/large image |
| M8 | branch | wrong-destination | `/property/create` post-success when ID can't be parsed | Success path calls `Alert.alert(... Warning ...)` and `router.back()` if `_id` is not parseable. There is no flow that takes the host to their newly-created (but ID-less) property; they're silently dropped back without ever seeing the unit-add CTA. | `host-app/src/app/property/create.tsx:60-69` | Bad server response |
| M9 | branch | dead-end | `/property/create` Direction picker — direction stored, never read back | Selecting a direction stores it in form state and submits it, but `PROPERTY_TYPES` and the edit screen never read it back. Reopening in edit shows no direction; user thinks save failed. | `host-app/src/app/property/create.tsx:116` + missing in edit | Always |
| M10 | branch | nav-graph | `/property/create` add-unit handoff legacy path | After success, replaces to `/property/add-unit?propertyId=…`. The add-unit screen reads `groupTag` from params, but `create.tsx` never passes one — the legacy `groupTag` branch in `add-unit.tsx:99-101` is dead code in the new flow. | `add-unit.tsx:99-101` vs `create.tsx:84` | Always |
| M11 | branch | i18n / coverage | `/financial/earnings` whole screen | Uses inline `isAr ? 'X' : 'Y'` everywhere instead of `t()` from `src/utils/i18n.ts`. Locale switches don't re-render until screen remounts (`getLocale()` is read once at module-fn call, not subscribed). | `host-app/src/app/financial/earnings.tsx:24-99` | Whole screen |
| M12 | branch | i18n / coverage | All 6 new property screens + PropertyWizard | Every alert, label, button and submit copy uses inline `l({en, ar})` helper, bypassing central i18n. Same `getLocale()` capture-at-module-eval bug as M11. | `add-unit.tsx:16`, `create.tsx:38`, `duplicate/[id].tsx:17`, `edit/[id].tsx:18`, `edit-unit/[id].tsx:17`, `unit-pricing/[id].tsx:29`, `PropertyWizard.tsx:110` | Always |
| M13 | mixed | data-mismatch | `StatusBadge` unknown-status fallback | `statusConfig[status]` for unknown status (e.g. server returns `paid` or `awaiting_payment`) returns `undefined` and falls back to `'waiting'` config. A paid booking would render the "بانتظار القبول" pill. **Branch added `held` to the type list** — good, but `paid` etc still fall through. | `host-app/src/components/ui/StatusBadge.tsx:5,25` | Branch additions left other gaps |
| M14 | main | hard-coded copy | StatusBadge typo "منتظي" → should be "منتظر" | `labelAr: 'منتظي'` (incorrect) instead of `'منتظر'`. Same typo also in `(tabs)/reservations.tsx:34` (which the branch left as `منتظر`, correctly) and `reservations/index.tsx:37` (typoed). Pre-existing on main; sibling files inconsistent. | `host-app/src/components/ui/StatusBadge.tsx:11` | The chore-branch in-flight repairs already fixes this |
| M15 | main | data-mismatch | StatusBadge — `locale` prop never set by callers | `StatusBadge` defaults to `locale='ar'`; called from `reservations/index.tsx:176` and `reservations/[id].tsx:118` with no `locale` prop. English locale users see Arabic badges. Should subscribe to `getLocale()` instead of relying on caller-passed prop. | `host-app/src/components/ui/StatusBadge.tsx:24` | Always for EN locale |
| M16 | main | data-bug | `/(tabs)/properties` — only first property displayed | `properties[0]` is the only property hosted in render. Hosts with N>1 properties only see `properties[0]`; the others are invisible. | `host-app/src/app/(tabs)/properties.tsx:60-70` (was `:59-79` on main) | Pre-existing; bug bites the moment a host has 2+ properties |
| M17 | main | data-bug | `/property/unit/[id]` — booking filter is no-op (shows all bookings on every unit) | `filter((b) => { return true; })` — every unit's calendar marks dates as booked across unrelated units. Comment says "Show all bookings for now". Calendar misrepresents per-unit availability. | `host-app/src/app/property/unit/[id].tsx:384-389` | Pre-existing; data correctness bug |
| M18 | main | data-bug | `/property/unit/[id]` — fake unit name when not loaded | `unitName = unitFromProps?.name \|\| \`شالية ميفارا (${id}) Mivara\`` — the screen invents a literal Arabic name from the URL id when the unit isn't loaded. Same for `unitCode`. | `host-app/src/app/property/unit/[id].tsx:350-351` | Always when API not yet resolved |
| M19 | main | data-bug | `/property/unit/[id]` — pricing fallback shows fake hardcoded numbers | When `unitFromProps?.pricing` is missing, the screen renders DEFAULT_PRICING (880/1025/1150 SAR) as if it were the host's real pricing. | `host-app/src/app/property/unit/[id].tsx:41-46, 506-519` | Always when API not loaded |
| M20 | main | UX | `/property/unit/[id]` — month nav arrows but reservations not month-scoped | `handlePrevMonth`/`handleNextMonth` change month state but the `getBookings()` query is not month-scoped — same dataset is shown for every month. | `host-app/src/app/property/unit/[id].tsx:368-377, 407-423` | Always |
| M21 | main | dead-end | `/pricing/[unitId]` "Add Offer" button does nothing | Tap "أضف عرض" — `TouchableOpacity` with no `onPress` handler. User cannot create an offer through the UI. | `host-app/src/app/pricing/[unitId].tsx:373-376` | Pre-existing |
| M22 | main | dead-end | `/(tabs)/reservations` search/info/filter buttons no-op | All three `TouchableOpacity` lack `onPress` (search "بحث", info circle-info, filter chevron-down). Confirmed at runtime — taps register but nothing happens. | `host-app/src/app/(tabs)/reservations.tsx:184, 188, 191` | Pre-existing; runtime-confirmed |
| M23 | branch | UX | `/reservations/[id]` accept/reject only handles `pending` | Server statuses include `waiting`, `in_payment`, `held` — but the gating check is `booking.status === 'pending'`, so the host sees no actions on bookings labeled `waiting` etc. List view (`reservations/index.tsx:180`) checks `'waiting' \|\| 'pending' \|\| 'in_payment'` — the two screens disagree. | `host-app/src/app/reservations/[id].tsx:213` vs `reservations/index.tsx:180` | The branch refactored `reservations/index.tsx` to broaden the gate; left the detail screen narrow |
| M24 | main | data-bug | `/(tabs)/reservations` raw `totalAmount` and `createdAt` rendering | Renders `{item.totalAmount} ر.س` (no `formatCurrency`, ignores 2dp policy) and `{item.createdAt}` (raw ISO `2025-04-19T12:34:56.000Z`). | `host-app/src/app/(tabs)/reservations.tsx:120-121` | Pre-existing |
| M25 | mixed | crash-prone | `/(tabs)/reservations` — `formatArabicDate` no null guard | If API returns `null`/`undefined` `checkIn`/`checkOut`, `new Date(undefined).getDay()` is `NaN` → `ARABIC_DAYS[NaN]` is `undefined` → renders "undefined undefined undefined". | `host-app/src/app/(tabs)/reservations.tsx:73-79, 138` | Bad data |
| M26 | branch | crash-prone | `/(tabs)/dashboard` BookingCard uses `booking.id` as key | `recentBookings.map((booking) => <BookingCard key={booking.id}` — if API returns `_id`, keys are `undefined`, React warns, and tapping pushes `/reservations/undefined` (404 route). | `host-app/src/app/(tabs)/dashboard.tsx:347-350, 365-369` | The branch added the BookingCard render; `_id` fallback never wired |
| M27 | branch | nav-graph | `/(tabs)/dashboard` — many `router.push(... as any)` | At least 11 routes pushed via `as any` cast: `/program`, `/(tabs)/reservations`, `/reviews`, `/financial`, `/notifications`, `/messages/support`, `/invoices/summary`, etc. The cast hides whether routes exist. | `host-app/src/app/(tabs)/dashboard.tsx:140, 153, 168, 236, 269, 277, 326, 340, 359, 378, 393` | Branch dashboard rewrite added several |
| M28 | branch | data-bug | `/(tabs)/more` — stat counts logic | `activeUnits = sum + (p.isActive ? 1 : 0)` mixes property-level isActive with units array sum. Display `${totalUnits}/${activeUnits}` semantically confusing. | `host-app/src/app/(tabs)/more.tsx:52-56, 108` | Branch added these stat cards |
| M29 | main | data-bug | `/legal/contact` ignores fetched `support.phone` | `formattedPhone = '9200 07858'` is a constant; `Linking.openURL('tel:920007858')` is hardcoded. The fetched `support` object is discarded. | `host-app/src/app/legal/contact.tsx:16, 73` | Pre-existing |
| M30 | main | dead-end | `/(auth)/phone-entry` register button (audit-branch baseline) | Tap "سجل عقارك" → `Alert.alert('التسجيل', 'سيتم إطلاق التسجيل قريباً')`. **Note:** the chore-branch in-flight repair already wires this to `phone-login`; on the audit-branch HEAD the alert stub is still active. | `host-app/src/app/(auth)/phone-entry.tsx:29` (audit branch) | Pre-existing |
| M31 | main | dead-end | `/protection/index` two CTAs | "مركز المطالبات" and "الشروط والأحكام" both `// Future: …` no-ops. Pre-existing; chore-branch in-flight repair wires both. | `host-app/src/app/protection/index.tsx:131,140` (audit branch) | Pre-existing |
| M32 | main | dead-end | `/permits/index` "Add permit" + info banner | "أضف التصريح" → `Alert.alert('هذه الميزة قيد التطوير')` (coming-soon). Info banner is a `TouchableOpacity` with no `onPress`. Runtime: the screen first errors with "حدث خطأ في تحميل التصاريح" so the add-permit button is hidden behind an empty-state. | `host-app/src/app/permits/index.tsx:51, 118` | Pre-existing |
| M33 | main | wrong-destination | `/profile/index` "قيمنا" card → App Store URL | Tap "قيمنا" (Our values) opens `https://apps.apple.com` instead of an internal screen. | `host-app/src/app/profile/index.tsx:61` | Pre-existing |
| M34 | main | crash-prone | `/(auth)/onboarding` MODULES out-of-range | If `MODULES` is empty or `currentStep` exceeds `MODULES.length`, `currentModule.id` derefs `undefined` and throws. | `host-app/src/app/(auth)/onboarding.tsx:117` | Edge / bad config |
| M35 | main | crash-prone | `/reviews/reply/[id]` non-null assertion + page-1 lookup | `id!` non-null assertion; if the user deep-links with no id, mutation fires with empty path. Also `getReviews({ page: 1 })` is used to find a single review by id — fails for older reviews on page 2+, leaving a permanent loading state. | `host-app/src/app/reviews/reply/[id].tsx:44-53, 56` | Bad data path |
| M36 | main | crash-prone | `/invoices/[id]` and `/invoices/statement-detail` `.map` without `?.` | `invoice.lineItems.map(...)` and `statement.transactions.map(...)` will crash if either field is undefined in the API response. | `invoices/[id].tsx:160`, `invoices/statement-detail.tsx:127` | Bad data |
| M37 | main | data-bug | `/invoices/index` vs `/invoices/[id]` field mismatch | List uses `Invoice.amount`; detail uses `Invoice.totalWithTax`. Two different totals likely shown for the same invoice. | `invoices/index.tsx:53` vs `invoices/[id].tsx:38` | Always |
| M38 | main | i18n / coverage — entire host app | Every screen except `messages/[id]` and parts of auth is **hard-coded Arabic with no `t()` usage**. Bilingual support requires near-total rewrite of: legal/, settings/, invoices/, financial/, content/, profile/, reviews/, suggestions/, protection/, permits/, program/, notifications/, NpsSurveyModal, StatusBadge, plus most tab screens (reservations/[id], pricing/*, financial/*, property/unit/[id], (tabs)/calendar). The infrastructure (`utils/i18n.ts`, `t()`, `getLocale()`) exists but is unused outside a handful of files. | host-app/src/app/**/* | Pre-existing |

### 3.c Minor

| # | Origin | Type | Screen / element | Reproduction | File:line | Notes |
|---|---|---|---|---|---|---|
| m1 | branch | console-noise | `services/socket.ts` 13 console.log calls | Socket lifecycle (connect, disconnect, joined, booking-created, booking-status-changed, etc.) all `console.log` to stdout — production-noisy. Branch added 3 of these (main has 8). | `host-app/src/services/socket.ts:20,38,42,46,51,55,60,66,75,80,85` | Mixed origin |
| m2 | main | data-bug | `services/socket.ts` `booking._id` access without `?.` | Three sites read `booking._id` without optional chaining. Only logs, but if event payload is malformed → TypeError reading property of undefined. | `host-app/src/services/socket.ts:51, 56, 61` | Pre-existing |
| m3 | main | hard-coded copy | StatusBadge English labels never localized via `t()` | `'Pending'`, `'Confirmed'`, etc. are literal strings — not in `i18n.ts`. | `host-app/src/components/ui/StatusBadge.tsx:7-17` | Pre-existing |
| m4 | branch | UX | PropertyWizard modal backdrop not dismissable | `Modal` overlays with no Pressable on the dim region; only the X button closes. Affects city / district / property-type / direction pickers. | `PropertyWizard.tsx:658, 707`, `create.tsx:136-176` | Always |
| m5 | branch | UX | PropertyWizard back from later steps loses input | Pressing system-back gesture from any non-first step does NOT prompt for unsaved changes. Only step 1 prompts. | `PropertyWizard.tsx:190-208` | Always |
| m6 | branch | UX | `/property/unit-pricing/[id]` no destructive guard | User can drop all weekday prices to 0 and Save without confirmation — silently destroys live pricing. | `host-app/src/app/property/unit-pricing/[id].tsx:96-125` | Always |
| m7 | branch | UX | `/property/unit-pricing/[id]` discountPercent unbounded | `parseFloat(discountPercent) \|\| 0` allows >100 or negative through after the cleaningFee validator runs. | `host-app/src/app/property/unit-pricing/[id].tsx:119` | Always |
| m8 | branch | UX | PropertyWizard `chevron-forward` for back | RTL header uses `chevron-forward` for the back arrow — reads as a Next/forward arrow on LTR locale. | `PropertyWizard.tsx:774` | LTR locale |
| m9 | branch | UX | PropertyWizard pluralization | Step 8 review uses singular forms (`bed`, `bath`, `guests`) interpolated with raw counts: "1 beds", "1 guests". No plural rules. | `PropertyWizard.tsx:620` | Always |
| m10 | branch | UX | `/financial/earnings` retry: false | Both `useQuery` calls have `retry: false`. A transient network blip leaves the user staring at "No earnings yet" with no retry CTA except pull-to-refresh (not discoverable on empty state). | `financial/earnings.tsx:30, 36` | Bad network |
| m11 | branch | hard-coded copy | `/financial/earnings` MONTHS arrays | Months are hardcoded twice (en/ar). Adding a third language requires code edit. | `financial/earnings.tsx:12-13` | |
| m12 | branch | UX | `/property/duplicate/[id]` empty title fallback | `${p.title \|\| ''} - Copy` → " - Copy" when title is missing. Wizard's `.trim().length > 0` validator passes on " - Copy". | `host-app/src/app/property/duplicate/[id].tsx:72` | Bad data |
| m13 | branch | UX | `/property/duplicate/[id]` images forced re-upload, no UI hint | Comment says "Don't clone images — host should upload new ones", but PropertyWizard step 6 BLOCKS submit on `images.length > 0`, so the user MUST re-upload to advance — without any UI telling them this is intentional. | `host-app/src/app/property/duplicate/[id].tsx:91` + wizard `:167` | Always |
| m14 | mixed | data-bug | `getLocale()` captured at module load | `l = (obj) => locale === 'ar' ? ...` is created with a `getLocale()` value that doesn't subscribe to language changes. Switching language in-app requires a remount of every screen. Same pattern across 8 new files. | various property/, earnings.tsx, PropertyWizard | Locale switch |
| m15 | mixed | data-bug | StatusBadge — branch added `held`, no `paid` | Type list: `'pending' \| 'confirmed' \| 'in_payment' \| 'waiting' \| 'cancelled' \| 'no_show' \| 'completed' \| 'rejected' \| 'held'`. Server-side statuses observed elsewhere include `paid` and `awaiting_payment` — both fall through to `waiting` (typo `منتظي`). | `host-app/src/components/ui/StatusBadge.tsx:5` | |
| m16 | main | UX | `/(tabs)/calendar` no month navigation | `currentMonth`/`currentYear` are state without setters — user can only ever see the current month. Confirmed at runtime: no prev/next arrows visible. | `host-app/src/app/(tabs)/calendar.tsx:139-140` | Pre-existing |
| m17 | main | UX | `/(tabs)/calendar` booked days non-tappable, no feedback | `onPress` only fires when `!isBooked`. A host might want to tap a booked day to see who booked. No feedback. | `host-app/src/app/(tabs)/calendar.tsx:76` | |
| m18 | main | UX | `/(tabs)/properties` empty-state subtext is the screen title | "لا توجد بيانات / الخصائص والوحدات" — subtext repeats the title. Confirmed at runtime. | `host-app/src/app/(tabs)/properties.tsx:274-275` | Pre-existing |
| m19 | main | UX | `/(tabs)/properties` FAB overlap | FAB at `bottom:110` may overlap last list item; FlatList contentContainerStyle has no extra bottom padding. | `host-app/src/app/(tabs)/properties.tsx:281-287, 330` | |
| m20 | branch | visual-glitch | `/reservations/index` HeaderBar without `showBack` | `HeaderBar title={t('reservations.title')}` without `showBack`. Inconsistent with `(tabs)/reservations` which DOES show a back chevron. | `host-app/src/app/reservations/index.tsx:222` | |
| m21 | mixed | UX | `/reservations/[id]` accept/reject confirms generic | Confirmation says "هل أنت متأكد من X؟" without amount, guest name, dates. Host could mis-tap. | `host-app/src/app/reservations/[id].tsx:62-77` | |
| m22 | branch | UX | `/(tabs)/dashboard` `_hasError` dead variable | Underscore-prefixed but never used; comment says "Don't block on errors" — error states silently swallowed. User sees empty dashboard with no retry banner. | `host-app/src/app/(tabs)/dashboard.tsx:116-120` | |
| m23 | branch | UX | `/(tabs)/dashboard` pull-to-refresh re-triggers NPS | `setShowNps(true)` re-fires after every refresh; no dismissal de-bounce. | `host-app/src/app/(tabs)/dashboard.tsx:42-45, 95-99` | |
| m24 | main | UX | `/notifications/index` no-op tap when `bookingId` missing | Tap on a notification with no bookingId does nothing visually — silently no-op. | `host-app/src/app/notifications/index.tsx:80-86` | Pre-existing |
| m25 | main | UX | `/notifications/index`, `/invoices/*`, `/content/change-requests` — no isError branch | All these screens render an empty list when the API errors, hiding failure behind empty-state. No retry CTA. | `notifications/index.tsx:180`, `invoices/index.tsx:73`, `invoices/statements.tsx:90-101`, `content/change-requests.tsx:65` | Pre-existing |
| m26 | main | UX | `/content/complaints` and `/content/change-requests` raw status keys | `item.status` and `item.type` rendered raw — pills show "rate_change", "open", etc. instead of localized labels. | `content/change-requests.tsx:36`, `content/complaints.tsx:49` | Pre-existing |
| m27 | main | UX | `/content/articles` `Linking.openURL` no validation | Malformed URL throws unhandled rejection. Footer "اقرأ المزيد" duplicates whole-card press handler. | `content/articles.tsx:61, 71-78` | Pre-existing |
| m28 | main | UX | `/content/discount-codes` no confirm before disable | Switch toggles immediately on tap — no destructive-action confirmation. | `content/discount-codes.tsx:80` | Pre-existing |
| m29 | main | UX | `/content/referrals` copy-icon vs share-handler mismatch | "copy" button uses `copy-outline` icon but handler shares — wrong affordance. | `content/referrals.tsx:106` | Pre-existing |
| m30 | main | hard-coded copy | `/utils/format.ts` currency, "K" suffix | `formatCurrency` hardcodes "ريال"/"SAR"; `formatNumber` uses "K" thousands suffix. Ignores actual currency from API; no Arabic localisation. | `utils/format.ts:17, 23` | Pre-existing |
| m31 | branch | UX | `/financial/transfers` search not debounced | `queryKey: ['transfers', search]` triggers a network roundtrip per keystroke. | `host-app/src/app/financial/transfers.tsx:37` | |

---

## 4. Live runtime walkthrough findings (addendum)

The following defects were discovered or **confirmed at runtime** during a live tap pass on the iPhone 17 Pro simulator. Each is also catalogued above; this section reports the visual evidence.

| # | Sev | Where | What you do | What happens | Console / artifact |
|---|---|---|---|---|---|
| **R1** | **blocker** | `/(auth)/phone-login` keypad | Tap the iOS phone-pad keypad to enter `500000003`. iOS-RTL phone-pad inserts **Arabic-Indic digits** (٥٠٠٠٠٠٠٠٣) into the field. The login button activates (form-level `length === 9` check passes). Tap login. | **Submission silently fails / network call returns error / no UI feedback. The user is stuck on the login screen with no error toast or message.** Confirmed by user during the walkthrough. | `host-app/src/app/(auth)/phone-login.tsx:38, 49` |
| R2 | major | App reload after onboarding | Complete the 3-module onboarding ("تم" → "تم" → "تم" → "التالي"). Reload the app via the dev menu. | **Onboarding shown again from scratch.** Either the completion call fails silently (consistent with static finding at `(auth)/onboarding.tsx:80-89` — `handleFinishOnboarding` outer try/catch is unreachable because inner `.catch()` swallows the error) or the server doesn't persist `onboardingCompleted: true`. Either way, the host re-onboards every reload. | n/a |
| R3 | major | `/(tabs)/dashboard` "Recent bookings" section | Open the dashboard. | The "آخر الحجوزات" section header and "عرض الكل" link render, but the list body is **empty with no placeholder text** — inconsistent with other empty states in the app (calendar, properties, reservations all have an explicit empty-state). | `host-app/src/app/(tabs)/dashboard.tsx` recent-bookings render block |
| R4 | major | `/(tabs)/dashboard` headphones icon (top-left) | Tap the headphones icon. | Opens the support thread (`/messages/support`). The thread immediately shows an error empty state: "حدث خطأ في تحميل البيانات" — but the message-input + send button at the bottom are still active. **No retry button** anywhere; user can either send-blind or back out. | `host-app/src/app/messages/support.tsx` |
| R5 | major | `/permits/index` | Tap "نظام السياحة الجديد" (More → Tourism License). | Permits screen always renders the error empty state: "حدث خطأ في تحميل التصاريح / اسحب للأسفل للمحاولة مرة أخرى". The "Add permit" coming-soon button is therefore unreachable until the API is healthy. | `host-app/src/app/permits/index.tsx` |
| R6 | major | `/property/create` form | Open Properties tab → "+ إضافة عقار" → property creation form. Note the placeholder for "**العنوان (إنجليزي) ***" (English title required). | The placeholder is **`مثال: فيلا الغروب`** — Arabic text in the English field. The Arabic-title placeholder is `العنوان بالعربي (اختياري)`. | `host-app/src/app/property/create.tsx:204-214` |
| R7 | major | `/(tabs)/reservations` chip controls | On the reservations tab, tap the search "بحث", info circle-info, or filter-chevron buttons. | **All three taps register but produce no visible state change** — they are dead pressables. Confirms static finding M22. | `host-app/src/app/(tabs)/reservations.tsx:184, 188, 191` |
| R8 | minor | `/(tabs)/calendar` | Open the calendar tab. | Header "التقويم", legend "محظور / محجوز", toggle "عرض الوحدات المعروضة فقط" — all hardcoded Arabic. **No prev/next month arrows** anywhere on screen. Empty state shows "لا توجد وحدات" while "جاري التحميل…" text is still visible above (loading + empty rendered simultaneously — inconsistent state). | `host-app/src/app/(tabs)/calendar.tsx` |
| R9 | minor | `/(tabs)/dashboard` data card | Open the dashboard. | Subtitle: "تقرير أداء أسبوع **1/5/2026**". Date format is ambiguous DD/MM vs MM/DD — should use Arabic month name to match the rest of the app. | `host-app/src/app/(tabs)/dashboard.tsx:145-146` |
| R10 | minor | `/(tabs)/properties` | Open the properties tab with no properties. | Empty state: building icon + "لا توجد بيانات" + "**الخصائص والوحدات**" — the subtext repeats the screen title. Confirms static finding m18. | `host-app/src/app/(tabs)/properties.tsx:274-275` |
| R11 | minor | `/(tabs)/more` avatar | Open the More tab. | Avatar circle shows the literal letter `n` (host's name's first letter, not a real image). Static finding m76 noted that the `profile?.avatar` ternary returns the same Ionicon either way; runtime confirms the image is never shown. | `host-app/src/app/profile/index.tsx:91-97` (also rendered in `(tabs)/more.tsx`) |
| R12 | minor (dev) | All screens with stack-header | Try to tap the back-arrow chevron at the top-right. | The Expo dev-launcher pill (the gear icon at top-right of the device frame in dev builds) **collides with the back-arrow chevron** on every stack-pushed screen. Taps land on the dev menu instead of the back button. Workaround: tab-bar nav, or reload. **Dev-only**, not a production issue. | n/a (dev-build artifact) |

### 4.a Defects covered by static read but not directly exercised at runtime

The following blockers/majors were not exercised because the test guest account had no properties, no bookings, no payment methods, no reviews, no transfers, and the property-creation form's hardware-keyboard input did not register (simulator-side limitation). All can be confirmed via source review or a real account:
- **B1, B2, B3** — require an existing property/unit to round-trip through edit
- **M1, M2, M3** — require a property/unit and the duplicate/pricing flows
- **M14, M15** — StatusBadge typo / locale; can only be confirmed once a status pill is rendered
- **M16, M17** — require multiple properties / a unit with bookings on dates outside its own
- **M18, M19** — require landing on `/property/unit/[id]` while the API hasn't loaded
- **M20** — month navigation requires an existing unit
- **M21** — pricing screen "Add Offer" — confirmed disabled in source; the parent screen was reachable but the empty-state didn't expose the offer form
- **M23** — accept/reject divergence between list and detail; needs at least one booking
- **M26, M27** — dashboard BookingCard render; needs a booking row
- **M29** — legal/contact phone — would require navigating to a screen behind dev-menu collision

### 4.b Acknowledged not-tapped this pass

In the interest of finishing the audit, the following live actions were not exercised. Their static defects stand:
- The **gear-icon settings menu** (covered by Expo dev-menu pill in dev build)
- Reservations detail accept/reject mutations
- Calendar block-date interaction
- Property unit pricing screen save
- Wallet / payment method add
- Reviews reply mutation
- Notifications list
- Invoices list / detail / statement detail
- Suggestions vote / submit

Static read covered every line of every file in those screens.

---

## 5. Patterns observed

These are the most cross-cutting issues. Fixing them is more leveraged than fixing individual defects.

1. **PropertyWizard ↔ Edit screen schema mismatch [branch].** PropertyWizard writes `pricing.perNight`, `capacity.bedrooms`, `rules.checkInTime` (nested), but every `/property/edit/*` screen reads flat `price`, `bedrooms`, `checkInTime` from the property root. Round-tripping through edit silently zeros the nested fields. Source: `property/edit/[id].tsx:111-123` vs PropertyWizard `:59-78` and `property/edit-unit/[id].tsx:51, 63-72, 121`. Affects B1, B2, B3, M2.
2. **`getLocale()` captured at module-eval [branch].** Every new property/earnings screen calls `getLocale()` once at the top of the file, builds a closure `l = (obj) => …`, and never re-subscribes. App-wide locale switches require a screen remount. Affects M11, M12, m14, plus B5 (which has the same pattern but fired by `t()` instead of `l()`).
3. **i18n coverage on the host app is essentially absent [main].** Only `messages/[id]` and pieces of auth use `t()`. Every other screen — including all of legal/, settings/, invoices/, financial/, content/, profile/, reviews/, suggestions/, protection/, permits/, program/, notifications/, plus the calendar/properties/reservations tabs — is hard-coded Arabic. Bilingual support is a months-of-work rewrite. M38.
4. **Status enum drift [mixed].** At least four locations enumerate different overlapping subsets of `confirmed/pending/in_payment/waiting/held/cancelled/no_show/completed/rejected/paid`. The branch added `held` to StatusBadge (good) but left the typoed Arabic fallback `منتظي` (which the chore branch fixes). Other server-side values (`paid`, `awaiting_payment`) silently fall through to "waiting". M13, M14, M15.
5. **Single-property/single-unit assumptions [main].** `(tabs)/properties` only renders `properties[0]` (M16), `(tabs)/calendar` reads `calendarGroups[0].propertyName`, `property/unit/[id]` returns all bookings for every unit (M17). All three are real correctness bugs that bite the moment a host has more than one property.
6. **Dead pressables and "coming soon" alerts [main].** "Add Offer" in pricing (M21), search/info/filter on reservations tab (M22, R7), Claims/Terms on protection (M31), Add Permit on permits (M32), Register on phone-entry (M30, audit-branch baseline), Values on profile (M33), copy-icon on referrals (m29), info banner on permits (M32), footer link on phone-entry. All are single-line wirings; many fixed in `chore/in-flight-repairs-pre-audit`.
7. **Silent error handling [main].** `.catch(() => {})` patterns and missing `isError` branches across notifications, invoices, statements, change-requests, suggestions hide API failures behind empty states with no retry CTA (m25). Combined with the **dashboard's swallowed `_hasError` (m22)**, hosts get a permanently-empty dashboard if their first auth-bootstrap call partially fails.
8. **`router.push(... as any)` everywhere on the dashboard [branch].** Eleven routes pushed via type-assertion cast (M27). At least some are likely broken (the user-app audit found `/results` accepting `?city=…` query was silently dropped because the screen reads filters from a Zustand store). Type-checking is bypassed.

---

## 6. Origin breakdown

Of the **74 defects** reported:

| Origin | Count | Affects production? |
|---|---:|---|
| `[branch]` — introduced by `feat/user-app-feature-parity` | 21 | No — has not shipped yet |
| `[main]` — pre-existing on main | 41 | **Yes** — hits current host-app users |
| `[mixed]` — file modified on branch but defective code is partially pre-existing | 12 | Likely yes |

**Hotfix candidates for main (high priority, pre-existing).** Sorted by severity:
- M14 (StatusBadge typo "منتظي" → "منتظر") — 1 line, fixed already in chore branch
- M16 ((tabs)/properties only `[0]`) — bites multi-property hosts
- M17 (unit detail no-op booking filter) — wrong availability shown
- M21 ("Add Offer" dead button) — host cannot create offers
- M22 (reservations tab dead pressables) — three inert chips
- M29 (legal/contact hardcodes phone) — wrong number on contact screen
- M30, M31, M32 (phone-entry register, protection CTAs, permits add) — chore branch fixes the first two; permits still TODO
- M33 (profile "Values" → App Store URL)
- M16 + M17 are the most user-visible.

**Branch-introduced (must fix before merge).**
- **B1, B2, B3 (data loss on edit round-trip)** — must fix before any property created via the wizard is editable
- **B4 (`.find()!` non-null in property/create)** — single-line fix
- **M1 (duplicate calls wrong endpoint)**
- **M2, M3 (unit-pricing flat keys + flatten differentials on pre-fill)**
- **M5, M6 (PropertyWizard validation gaps for amenities + nights)**
- **M9 (direction stored, never read back)**
- **M11, M12 (i18n coverage in new screens — already a regression on the bilingual contract)**

---

## 7. Build & boot summary

- `cd host-app && npm run lint` (= `tsc --noEmit`) — **0 errors**
- `npx expo run:ios --device "iPhone 17 Pro"` — **BUILD SUCCEEDED, 0 errors, 3 warnings** (build-script output dependency hints; cosmetic)
- Metro bundler — bundle built successfully, app launched on simulator
- Welcome screen rendered → login flow attempted → **R1 phone-login digits silently rejected** (resolved by user logging in manually) → onboarding rendered → completed → dashboard reached → tabs walked
- No `WARN [Layout children]` warnings observed (host-app's `_layout.tsx` stack-screen names match the actual route segments, unlike the user-app).
- No red-box runtime crashes during the boot path.

---

## 8. Security flags

**None to escalate.** No exposed API keys in source. Auth uses phone+OTP via Authentica with the same backend bypass list as user-app. Backend URL is hard-coded to a public Railway domain — that is configuration, not a leak.

The only observation worth recording (not a security flag, just hygiene):
- `host-app/src/services/host.service.ts:13-16, 111-112` exports deprecated `*Legacy` methods (`getUnitLegacy`, `updateUnitLegacy`, `updateUnitPricingLegacy`) alongside the current ones. Risk of accidental use; either remove or rename to `_deprecated_`.
- `updatePaymentMethod` accepts `payload: any` (`host.service.ts:53`) — bypasses type-safety on a financial endpoint.

---

## 9. Comparison with App 1 (user-app) audit

| Metric | user-app | host-app |
|---|---:|---:|
| Screens audited | 35 | **56** |
| Total LOC of screens | ~7,500 | **18,069** |
| Defects reported | 37 (post-runtime) | **74** |
| Blockers | 3 | **5** |
| Major | 17 | **38** |
| Minor | 17 | **31** |
| English-only screens on Arabic-first product | 6 | n/a (host app is Arabic-only on Arabic-first product) |
| Hard runtime crashes confirmed | 1 (Conversations tab `formatDate(invalid)`) | 0 in this pass |
| i18n coverage | Mostly via `t()`; specific gaps | **Mostly hardcoded; specific uses of `t()`** |
| Branch-introduced blockers | n/a | **4** (PropertyWizard schema mismatch + create non-null `.find()!`) |

Where the user-app's defining defect was **English-only screens on an Arabic-first product** (R5–R12), the host-app's defining defect is the **mirror image: an Arabic-only host product despite the bilingual `t()` infrastructure**. Where the user-app shipped a **broken health-probe URL** (D1) that turned the connectivity banner permanently red, the host-app is missing the connectivity banner entirely. The host-app's dominant pattern is a **brand-new property-creation feature whose write shape disagrees with its read shape on the same branch**, which is a worse class of bug because it silently corrupts host data — but it is wholly contained to the new branch and has not shipped.

---

## Appendix A — Raw runtime artefacts

- Build log: `audit/host-app-runtime.log` (Metro + Xcode build phase, BUILD SUCCEEDED with 3 warnings)
- Static-read agent outputs (full, unconsolidated):
  - `audit/_static_new_files.md` (42 candidates from 13 NEW files)
  - `audit/_static_modified_tier1.md` (50 candidates from 14 most-changed screens)
  - `audit/_static_modified_tier2.md` (88 candidates from 39 modified + untouched screens)
  - `audit/_runtime_notes.md` (live tap-walkthrough timeline)

The above appendix files are working notes the audit was consolidated from; they intentionally keep duplicates and lower-confidence items the main report dropped.

---

## Appendix B — Reproduction credentials

- Test phone: `+966500000003` (in the backend's bypass list)
- OTP: `0000`
- **Important:** the iOS phone-pad keypad on this iOS-26.4 simulator inserts **Arabic-Indic digits** into the phone field. The host app's login flow does not normalise these and the backend rejects them silently — see R1. Workaround: use a hardware keyboard, or force-type Western digits via the field's clipboard.

---

## End of host-app audit

Pre-audit hygiene branch: `chore/in-flight-repairs-pre-audit` at commit `04c8a9e` (9 files preserved: 6 host-app in-flight repairs + 3 user-app F1/F2/F3 fixes from the App 1 audit). That branch is **not merged** and is **not** the audit baseline; it is a parking place so the audit branch could be tested against a single named SHA.
