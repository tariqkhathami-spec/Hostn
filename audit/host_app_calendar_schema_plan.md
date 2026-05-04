# Phase 8 — Calendar Schema Migration Plan

**Author:** Task 8.1 investigation
**Branch:** `fix/host-app-audit-pass-1`
**Date:** 2026-05-04
**Source spec:** `audit/gathern_calendar_feature_spec.md` §4 (data model implications)
**Status:** **Approved 2026-05-04 with directive: backend changes are out of scope for this fix pass; mock client-side. This document becomes the contract spec for the future backend pass.** Decisions recorded in §0 below.

---

## 0. Out-of-scope backend work — staged for follow-up

Phase 8 ships against today's backend. Every feature below has a client-side mock that the host-app implements now; this section is the contract spec for when a future pass extends the backend. **No code in Phase 8 makes a mock-or-real choice at runtime** — the seam is the host-service hook (and a Zustand fallback store), which means swapping each mock for a real `useQuery` is a one-line change.

### 0.1 Per-day price override (Task 8.5 / S4)

| Field | Decision |
|---|---|
| **What's mocked** | Per-day absolute price overrides for the S4 single-day price-edit modal. |
| **Client storage** | Zustand store, keyed by `${unitId}:${YYYY-MM-DD}` → `number`. Persists via `AsyncStorage` so overrides survive app restarts on the same device. |
| **Client type contract** | Extend the client `DatePricing` interface with `price?: number` — the exact field the backend will need to add. |
| **Migration when backend lands** | Replace the Zustand read with `useQuery(['unitDatePricing', unitId])` against `GET /units/:id/date-pricing`; replace the Zustand write with `useMutation` against `PUT /units/:id/date-pricing`. Component code does not change — both paths take and return `{ date, price }`. |
| **Caveat to surface in UI** | Until backend lands, an override set on device A is invisible on device B and to the user-app's pricing engine. The S4 modal will show a small "stored locally" hint when an override is applied. |
| **Backend addition required** | Per §3.A1 below: add `price?: number` to each `Unit.datePricing[]` entry, plus `PUT /units/:id/date-pricing` (upsert one entry) and `DELETE /units/:id/date-pricing/:date` (clear). |

### 0.2 External bookings (Task 8.7 / S5)

| Field | Decision |
|---|---|
| **What's mocked** | The S5 add-external-booking form persistence and read-back. |
| **Client storage** | Zustand store, list keyed by unitId, items shaped exactly like §3.A3's `ExternalBooking` schema. Persists via `AsyncStorage`. |
| **Client type contract** | A `ClientExternalBooking` interface that mirrors the spec's data model 1-to-1: `{ id, unitId, propertyId, date, guest?, payment?, source: 'host_external', createdAt }`. |
| **Display path** | The S3 date-detail sheet's existing "booking branch" already accepts a generic booking shape; the mock store hands it an `ExternalBooking` with the right marker so the day cell shows the spec's `حجز خارجي` (external booking) state. |
| **Migration when backend lands** | Swap the Zustand list+create for `useQuery` + `useMutation` against `GET /units/:id/external-bookings` and `POST /units/:id/external-bookings`. Type contract stays the same. |
| **Caveat to surface in UI** | Externals are device-local until backend lands. They never sync to platform reservations, the user-app, or iCal outbound. |
| **Backend addition required** | Per §3.A3 below: new `ExternalBooking` collection with `POST /units/:unitId/external-bookings`, `GET /units/:unitId/external-bookings?from=&to=`, `DELETE /external-bookings/:id`. |

### 0.3 `/host/calendar` booking source per date (Q3)

| Field | Decision |
|---|---|
| **What's mocked** | The `external_booking` day-state on the S2 month grid. |
| **Client storage** | None — purely derived. The component takes the response from `GET /host/calendar?year&month` (which gives flat `bookedDates: [YYYY-MM-DD, ...]`) and matches each entry against the locally-stored externals from 0.2. If a date is in `bookedDates[]` AND in `externalBookingsByUnit[unitId]`, render `external_booking`. Otherwise render `upcoming_booking` / `past_booking` / `awaiting_payment` from `Booking.status`. |
| **Migration when backend lands** | Backend widens the response to `bookedDates: [{ date, bookingId, source: 'platform' \| 'external' }]` per §4-Q3 recommendation. The client drops the cross-reference logic and reads `entry.source` directly. |
| **Caveat** | Front-end-only derivation is correct on the device that created the external booking. On other devices it falls back to "platform booking" rendering, since externals aren't synced. |
| **Backend addition required** | Widen `/host/calendar` response shape per §3.A2 + §4-Q3. |

### 0.4 iCal sync (Phase 8C / S11 + S12)

Out of MVP entirely (Q6 confirmed). Task 8.8's S6 kebab menu surfaces `مزامنة التقويم` as a stub route showing a localized "coming soon" alert per the brief's Phase 8 MVP scope.

When backend lands:
- §3.C1: `Unit.iCalOutboundToken: string` + public `GET /ical/:unitCode:token.ics` route + `POST /units/:id/ical/regenerate-token`.
- §3.C2: `iCalSubscription` collection + CRUD endpoints + background polling worker.
- §3.C3: conflict-resolution policy decision (skip / flag / dual-import).

### 0.5 Custom dated offers (Phase 8B / S8 + S9)

Deferred (Q7) — embed-vs-collection decision postponed to Phase 8B kickoff. Until then, no mock and no offers UI.

When backend lands: §3.B1 (recommended `Unit.customOffers[]` embedded list with CRUD endpoints).

### 0.6 Property.pricing deprecation

Deferred (Q5) — not Phase 8 work. Logged for a future cleanup commit.

### 0.7 Silent-discard-of-unknown-keys on `PUT /units/:id`

Deferred (Q8) — not Phase 8 work. Logged as a backend follow-up. Phase 8 mocks won't trip this because they don't write to `/units/:id` for the mocked features.

### 0.8 Cleanup that did NOT need owner approval

The dead-letter `host.service.ts` hooks (Section §3.D2) — `getUnitDiscounts`, `updateDiscount`, `toggleDiscount`, `getUnitOffers`, `createOffer`, `deleteOffer`, `getUnitPricing`, `updateUnitPricingLegacy` — all 404 server-side today. They will be removed inline as Phase 8 frontend tasks touch the surrounding code, in the relevant task's commit. Same for the `Booking.totalAmount` projection asymmetry — addressed via the Task 2.2 client-side hide-when-missing already.

---

## TL;DR

The backend is **closer to spec than the brief assumed.** Per-DOW pricing, day-blocking, and per-day discounts already live on the `Unit` document; a per-property+per-unit calendar aggregator (`GET /host/calendar`) already returns booked/blocked dates per unit per month in the exact shape S1/S2 need. **Three entire features are missing**: per-day **price overrides** (S4 absolute-value edits), **external bookings** (S5), and **iCal sync** (S11/S12). Custom-offer support (S8/S9) exists in shape but the wired endpoints return 404 — either dead-letter hooks need to be removed or the server-side routes need implementation.

Recommended order: **add the price-override field and external-booking entity first** (one-week backend cost). **iCal can defer** to Phase 8C without blocking 8.2–8.8 frontend work, because the `GET /host/calendar` aggregator already gives us the only data S1/S2 actually consume.

---

## 1. Backend reality vs spec target

Each row is a feature the spec needs. Current = what the backend exposes today (verified via curl on 2026-05-04 against the `+966500000002` test host, Sunset Beach Resort, Simple Suite). Gap = what's missing.

| Spec capability (§4) | Current backend | Gap |
|---|---|---|
| **Per-DOW pricing defaults** (S7: midweek / Thu / Fri / Sat) | `Unit.pricing.{sunday, monday, tuesday, wednesday, thursday, friday, saturday}` — 7 distinct keys, all writable via `PUT /units/:id/pricing` and `PUT /units/:id`. | **None.** More granular than the spec — front-end can collapse Sun–Wed into one "midweek" input by writing the same value to all four keys. |
| **Per-day price override** (S4 modal: set an absolute price for a single date) | `Unit.datePricing[]` exists with `{ date, isBlocked, discountPercent, discountStackable }` per entry. **No `price` field on those entries.** | **Add `price?: number` to each `datePricing` entry**, OR add a parallel `Unit.pricingOverrides: { [date: string]: number }` map. (See §3.A for the choice.) |
| **Day blocking / unblocking** (S3 اشغال button) | `Unit.datePricing[].isBlocked` flag is the storage; mutation goes through `PUT /host/calendar/:propertyId/block` with `{ startDate, endDate, action: 'block' \| 'unblock', unitId }`. Verified by blocking 2099-12-25 on Simple Suite then unblocking. Block writes appear in the property's `unavailableDates[]` but the read-side splits per-unit correctly. | **None for MVP.** The current endpoint is range-based (matches S5's eventual multi-night need) and accepts a unit-scoping parameter. The S3 single-day flow just sets `startDate=endDate=date`. |
| **Day-state read for the grid** (S2: 8 visual states) | `GET /host/calendar?year&month` returns `[{ propertyId, propertyName, units: [{ unitId, unitName, unitCode, isListed, bookedDates: [YYYY-MM-DD], blockedDates: [YYYY-MM-DD] }] }]`. `GET /bookings/unit/:id/dates` returns the booking detail per unit (`{ _id, guest, checkIn, checkOut, status }`). | **None for MVP.** The 9 spec states are derivable client-side from these two responses + `Booking.status` (`confirmed` → past_booking/upcoming_booking by date, `pending` → awaiting_payment, blockedDates → blocked, etc.). High-demand and active-offer indicators are non-MVP polish. See §3.B for the full mapping. |
| **Length-of-stay discounts** (S8 weekly/monthly auto-apply) | `Unit.pricing.{weeklyDiscount, weeklyEnabled, weeklyStackable, monthlyDiscount, monthlyEnabled, monthlyStackable}` already present and writable. | **None.** |
| **Custom dated offers** (S8/S9 named, percent, date range) | `Unit.discountRules[]` with `{ type, percent, stackable, enabled }` — but `type: 'weekday' \| 'weekend'`, **not** named/dated. No `name`, `startDate`, `endDate`. The hooks `getUnitOffers`/`createOffer` in [host.service.ts:121-123](host-app/src/services/host.service.ts:121) point at `/host/units/:id/offers` which returns **404 "Route not found"**. | **Add a new field** `Unit.customOffers[]` with `{ id, name, percent, startDate, endDate, enabled }` (or an `Offer` collection if multi-unit reuse is wanted), AND **delete the dead `getUnitOffers/createOffer/deleteOffer` service hooks** until a real route is implemented. (Phase 8B.) |
| **External booking** (S5 single-night with optional guest + payment) | None. POST attempts to `/host/calendar/:id/external-booking`, `/host/external-bookings`, `/units/:id/external-bookings` all return **404**. The existing `Booking` collection is for platform reservations only. | **Add a new entity.** See §3.C. |
| **iCal outbound URL** (S11 `gathern.co/ical/:code:token.ics`) | None. No `Unit.iCalOutboundToken` or analogous field; no `/ical/...` route exists. | **Add `Unit.iCalOutboundToken: string` and a public-but-unguessable `GET /ical/:unitCode:token.ics` route**. Phase 8C only — does not block MVP. |
| **iCal inbound subscriptions** (S12 paste-URL flow) | None. No `iCalSync` entity, no fetch/poll engine. | **Add a new entity** `iCalSubscription` + a polling/fetch worker. Phase 8C only. |
| **Profit-breakdown commission rate** (S3 displays ~14.995% commission) | Not present on `Unit` or `Property`. The spec computed the rate from one observed example. | **Add platform-config:** `PlatformConfig.commissionRate: number` (or a method on `Booking` that computes net). Cheap to add as a hardcoded constant on the host-app first, then promote to backend. |
| **Multi-property root + per-unit mini-month tiles** (S1) | `GET /host/calendar` (no params) returns the same multi-property structure. `GET /host/properties` returns property-level metadata. | **None.** Front-end work only. |
| **Yearly view** (S13) | Same `GET /host/calendar` can be called 12× per year. No issue. | **None for MVP.** Could later add `GET /host/calendar?year=2026&fullYear=true` to coalesce 12 month requests, but that's a perf nice-to-have. |

---

## 2. The Property/Unit pricing duplicate (DD-host-2 follow-up)

`Property.pricing` exists with `{ cleaningFee, discountPercent, weeklyDiscount }` — three fields, all currently 0/0/0 on the test property. `Unit.pricing` exists with 18+ fields including its own `cleaningFee`, `discountPercent`, `weeklyDiscount`, plus the per-DOW rates and LOS toggles.

**Decision: Unit is canonical, Property fields are dead.**

Reasons:
- The Property→Unit refactor (commit `9f6b4c0` `feat: adapt both apps to Property→Unit architecture`) moved bookable behaviour from Property to Unit. Pricing is bookable behaviour.
- The PropertyWizard creates a Unit immediately after a Property (the wizard's payload-shape work in Task 1.1 confirmed this). Wizard writes pricing onto the Unit, not the Property.
- The `/properties/:id` response shows all three fields = 0. They are silently unused.
- All current host-app pricing UI reads from `Unit.pricing` (or did, after the Task 1.2 rewrite of `/property/edit-unit`).

**Migration:**
1. **Phase 8 MVP (this task family):** treat `Property.pricing` as deprecated. Don't write to it. Don't read from it. Document this in this plan.
2. **Phase 7 cleanup pass (or a follow-up dedicated commit):** drop `pricing` from the `Property` mongoose schema and remove the field from `/properties/:id` response payloads. Confirm no other consumer (user-app, payment service, admin) reads it.

This gets us out of "two places to change a price" purgatory before any new pricing surfaces ship.

---

## 3. Migration plan (proposed)

The plan is split into **A/B/C** matching the brief's Phase 8 sub-phases. **A is the only MVP-blocking work.**

### 3.A — MVP-blocking backend work (must land before frontend Tasks 8.4 + 8.5 + 8.7)

#### A1. Per-day price override

**Why:** S4 (single-day price-edit modal) writes an absolute price for one date. The spec's data-model section names this `pricingOverrides[date]: number`. Without it the modal cannot persist.

**Two storage options:**

**Option A1.1 — Add `price` to existing `datePricing[]` entries.**
- Schema: `datePricing: [{ date, isBlocked, price?, discountPercent?, discountStackable }]`.
- New entries persist `{ date, price }`.
- Existing entries (480+ in test data, all currently `isBlocked` or `discountPercent` only) keep working untouched.
- Pro: one collection, additive change, migrations not required.
- Con: queries that just want "the override map" iterate the array.

**Option A1.2 — Parallel `pricingOverrides: Map<DateString, number>` field.**
- Schema: `pricingOverrides: { '2026-05-13': 1200, ... }`.
- Pro: query is `unit.pricingOverrides[date]` with no array scan.
- Con: two sources of truth for "Tuesday May 13 is special" — `datePricing[]` (block + discount) and `pricingOverrides[]` (price). Easier to drift.

**Recommendation: A1.1.** Additive, no migration, and the read-side already iterates `datePricing` for the discount/block check.

**API surface to add:**
- `PUT /units/:id/date-pricing` body `{ date: ISO, price?: number, isBlocked?: bool, discountPercent?: number }` — upsert one entry. Returns the entry.
- `DELETE /units/:id/date-pricing/:date` — clear an override. Returns the new `datePricing[]`.

(Front-end S4 calls PUT with the price; S3's block button calls PUT with `isBlocked: true`. S4 unblock + clear-override = DELETE.)

#### A2. Day-state derivation contract

**Why:** S2 renders 8 visual states per day cell. The spec named the states; we now need to lock down which fields derive which state, so the front-end has a stable contract.

**Recommendation: derive client-side, no backend work.**

Mapping from current backend → spec state:

| State (spec) | Derivation (client-side, given today's API) |
|---|---|
| `past_day` | `date < today` AND day has no other state |
| `past_booking` | exists in `bookedDates[]` AND `Booking.checkOut < today` |
| `upcoming_booking` | exists in `bookedDates[]` AND `Booking.status == 'confirmed'` AND `Booking.checkIn >= today` |
| `awaiting_payment` | exists in `bookedDates[]` AND `Booking.status == 'pending'` (was 'waiting' in old shape) |
| `external_booking` | exists in `bookedDates[]` AND `Booking.source == 'external'` (requires §3.A3 below) |
| `blocked` | exists in `blockedDates[]` (from `/host/calendar`) |
| `has_offer_or_discount` | `Unit.pricing.discountPercent > 0` OR a `customOffer` in §3.B covers this date |
| `high_demand` | non-MVP, requires a pricing-engine signal not present today |
| `available` | default for future dates |

Precedence (highest first): `past_booking > upcoming_booking > awaiting_payment > external_booking > blocked > has_offer > past_day > available`. (The `high_demand` flag is overlay-only and combines with `available`.)

**No backend change required for derivation itself**, but the front-end will need both `/host/calendar?year&month` AND `/bookings/unit/:id/dates` to resolve states (the first gives the date list, the second gives the booking status per range).

#### A3. External booking entity

**Why:** S5 records single-night, off-platform bookings with optional guest/payment fields. No equivalent exists in the backend today.

**Recommendation: new collection `ExternalBooking`** rather than a discriminator on `Booking`. The `Booking` collection currently has payment status, payouts, refunds, host commissions — most of that is irrelevant for an external entry, and overloading the collection risks bleed into the payment pipeline.

**Schema:**
```
ExternalBooking {
  _id
  unit:        ObjectId(Unit)            # required
  property:    ObjectId(Property)        # denormalised for fast property-scoped reads
  host:        ObjectId(User)            # for permission checks
  date:        Date                      # ONE date — single-night per spec
  guest?: {
    name?:     string
    phone?:    string
    idNumber?: string
    notes?:    string
  }
  payment?: {
    methods:   ('cash' | 'bank_transfer')[]
    paid?:     number
    discount?: number
    total?:    number
  }
  source:      'host_external' | 'ical_inbound'   # 'ical_inbound' reserved for Phase 8C
  createdBy:   ObjectId(User)            # = host for host_external; system user for ical_inbound
  createdAt
  updatedAt
}
```

**API surface to add:**
- `POST /units/:unitId/external-bookings` — create one. Returns the document.
- `GET /units/:unitId/external-bookings?from=&to=` — list, used by the day-state derivation.
- `DELETE /external-bookings/:id` — cancel. (S5 has no exposed cancel CTA; this is admin-side / future surface.)

**Read-side integration:** include external-booking dates in the unit's `bookedDates[]` returned by `/host/calendar`, with a `source: 'external'` annotation per entry (or extend the response shape — see §4 open questions).

---

### 3.B — Phase 8B-blocking backend work (custom offers + yearly view)

#### B1. Custom dated offers

**Why:** S8/S9 — named offers with date range and percent, capped at 70%.

The existing `Unit.discountRules[]` is for weekday/weekend modifiers. **Different feature.** Don't reuse.

**Schema (additive, embedded on Unit):**
```
Unit.customOffers: [{
  _id
  name:       string
  percent:    number          # 0..70
  startDate:  Date
  endDate:    Date
  enabled:    boolean         # toggle without delete
}]
```

**API surface:**
- `GET /units/:id/custom-offers`
- `POST /units/:id/custom-offers`
- `PATCH /units/:id/custom-offers/:offerId`  (used for both `enabled` toggle and edits)
- `DELETE /units/:id/custom-offers/:offerId`

**Service-layer cleanup (independent, can land any time):** delete the dead-letter hooks `getUnitOffers`, `createOffer`, `deleteOffer`, `getUnitDiscounts`, `updateDiscount`, `toggleDiscount` from [host.service.ts:118-123](host-app/src/services/host.service.ts:118) — they all 404 today. Replace with the new endpoints above when they exist.

#### B2. Yearly view

No backend work. Front-end calls `/host/calendar?year&month` 12× and stitches. If perf becomes an issue, add `?months=1,2,...,12` later.

---

### 3.C — Phase 8C-blocking backend work (iCal sync)

This is the heaviest work and **does not block MVP frontend**. Plan it separately.

#### C1. iCal outbound

```
Unit.iCalOutboundToken: string   # generated on first request, opaque, length ≥ 12
```
- `GET /ical/:unitCode:token.ics` — public route, returns RFC 5545 .ics with one VEVENT per `bookedDates[]` entry (both platform bookings and external).
- `POST /units/:id/ical/regenerate-token` — host-only, rotates the token (revoke leaked URLs).

#### C2. iCal inbound

```
iCalSubscription {
  _id
  unit:        ObjectId(Unit)
  name:        string
  url:         string
  lastFetchedAt?: Date
  lastError?:  string
  bookingsImported: number
}
```
- `GET /units/:id/ical-subscriptions`
- `POST /units/:id/ical-subscriptions` body `{ name, url }`
- `DELETE /ical-subscriptions/:id`
- Background poller (cadence TBD — Gathern likely polls hourly): fetch each url, parse VEVENTs, upsert as `ExternalBooking { source: 'ical_inbound', date, guest.notes: <SUMMARY> }`.

#### C3. Conflict resolution

If an inbound iCal feed reports a date already present in `Booking` or `ExternalBooking`, the spec doesn't define behaviour. Options to discuss with the owner:
- Skip silently (drift accumulates).
- Flag the unit with an "iCal conflict" badge requiring host review.
- Auto-import as a duplicate ExternalBooking and let the host see two markers on the same day.

---

### 3.D — Cleanup work that should ride along (independent of MVP/B/C)

1. **Drop `Property.pricing`** (per §2) — three dead fields. Affects `/properties` and `/properties/:id` response payloads. Verify no consumer reads them.
2. **Drop dead host.service hooks** that 404:
   - `getUnitDiscounts`, `updateDiscount`, `toggleDiscount` ([host.service.ts:118-120](host-app/src/services/host.service.ts:118))
   - `getUnitOffers`, `createOffer`, `deleteOffer` ([host.service.ts:121-123](host-app/src/services/host.service.ts:121))
   - `getUnitPricing` ([host.service.ts:113](host-app/src/services/host.service.ts:113)) — different path from the working `updateUnitPricing`; the GET path 404s.
   - `updateUnitPricingLegacy` ([host.service.ts:115](host-app/src/services/host.service.ts:115)) — superseded by `updateUnitPricing` and 404s.
3. **`Booking.totalAmount` reconcile**: `/host/bookings` returns it on every row but `/bookings/unit/:id/dates` (a server-side projection) drops it. Either include on both (simple — extend the projection) or document the asymmetry. Task 2.2 introduced a hide-when-missing on the host-app card; eliminating the asymmetry would let the card always render the value.

---

## 4. Open questions for the owner

1. **Per-day override storage choice.** A1.1 (extend `datePricing[]` with `price?`) vs A1.2 (parallel `pricingOverrides` map). My recommendation is A1.1 (additive, no drift, no migration). Confirm.
2. **External booking — same collection or separate?** Recommendation: separate collection (don't pollute the platform `Booking` collection that the payment pipeline reads). Confirm.
3. **`/host/calendar` response — extend with booking source?** S2 needs to render the `external_booking` state. Today the response gives `bookedDates: ['2026-05-13', ...]` flat strings. Should we either (a) widen the response to `bookedDates: [{ date, bookingId, source: 'platform' | 'external' }]`, or (b) make the front-end cross-reference `bookedDates` against `getUnitBookedDates(:id)` + `/units/:id/external-bookings`? **Recommendation: (a)**, one round-trip per month is enough.
4. **Profit/commission rate.** Hardcode in front-end for now (the spec computed ~14.995%) or add `PlatformConfig.commissionRate` server-side? Recommendation: hardcode + leave a TODO with `// FIXME: load from PlatformConfig` once the route exists. Cheaper and reversible.
5. **Property.pricing deprecation timing.** Drop now in this fix-pass branch, or wait until Phase 7 cleanup? If now, this branch becomes "Phase 8 schema + dead-field removal" which is a bigger blast radius.
6. **iCal scope deferral.** Owner explicitly said "owner approves before Phase 8C" in the brief. Confirming: **iCal is out of scope for the immediate Phase 8 MVP work and not on the critical path for Tasks 8.2–8.8.**
7. **Custom-offer model: embed vs collection.** Embedded `Unit.customOffers[]` is simpler; a separate `Offer` collection is more flexible (offers spanning multiple units, offer history). Recommendation: embed for now, promote later if multi-unit reuse becomes a feature.
8. **Whether to fix the silent-discard-of-unknown-keys behaviour.** When B1 was investigated, we noted PUT `/units/:id` silently drops anything not in the schema (e.g. `pricingOverrides`). That made the pre-fix bugs survive. Should we promote this to a 400-with-error behaviour, or is it intentional for forward-compat? Out of scope here, but worth discussing.

---

## 5. Recommended phasing

| Phase | What backend work needs to land | Frontend tasks unblocked |
|---|---|---|
| **8.A — MVP-blocking** | A1 (date-pricing PUT + price field), A3 (ExternalBooking entity + endpoints), §4-Q3 decision (response shape) | Tasks 8.2 (S1), 8.3 (S2), 8.4 (S3 sheet — block + price-edit handoff), **8.5 (S4 needs A1)**, 8.6 (S7 — already supported), **8.7 (S5 needs A3)**, 8.8 (S6 — pure UI hub) |
| **8.B — secondary** | B1 (customOffers + endpoints) | Tasks 8.9, 8.10. Task 8.11 (yearly) is purely client-side, no backend dep. |
| **8.C — heaviest** | C1 (iCalOutboundToken + public .ics route), C2 (iCalSubscription + poller), C3 (conflict policy decision) | Tasks 8.12, 8.13. |
| **D — cleanup** (in parallel any time) | Drop dead service hooks, drop `Property.pricing`, normalise `Booking.totalAmount` projection | Reduces noise across all of Phase 8. |

**Critical path for the Phase 8 MVP:** A1 + A3 + §4-Q3. Estimated ~3 backend days (one for date-pricing schema + endpoint, one for ExternalBooking + endpoints, one for the response-shape extension and tests). Frontend work on Tasks 8.2, 8.3, 8.6, 8.8 can begin in parallel — they consume only endpoints that already exist. Tasks 8.4, 8.5, 8.7 have to wait for backend.

If backend changes are **fully out of scope for this fix pass** (per the brief's "If backend changes are out of scope, document the gap and proceed with client-side mock-via-types until backend lands"), the front-end can stub:
- A1: keep the S4 modal in-memory only with a local `pricingOverrides` Zustand slice; persist to local storage; warn the user the override is device-local until the backend lands.
- A3: write external bookings into local storage with the same shape; no server round-trip.
- iCal screens (S11/S12): render the read-only "coming soon" alerts from the brief's Task 8.8 stub.

This gives a fully-walkable MVP locally without backend work, and is reversible — the Zustand slice replaces with a real `useQuery` in one place once the routes ship.

---

## 6. What I need from the owner before proceeding

1. Confirm the storage choice for §3.A1 (recommendation: A1.1, extend `datePricing[]`).
2. Confirm external-booking goes into its own collection (recommendation: yes).
3. Confirm `/host/calendar` response widening (recommendation: yes, include `source` per booked date).
4. **Decide whether backend changes are in or out of scope for this fix pass.** If in-scope, this becomes a coordinated front+back PR set. If out-of-scope, I proceed on the client-side mock plan above and the backend changes happen separately — the frontend can switch to real endpoints when they land via a one-line query swap.
5. Greenlight the cleanup-D items independently (drop dead service hooks, drop `Property.pricing`).

Once the above are answered, I can begin Task 8.2 (S1 multi-property root) which has zero backend dependency.
