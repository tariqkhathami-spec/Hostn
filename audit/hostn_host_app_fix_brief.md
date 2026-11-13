# Hostn — Host App Fix Brief

The user-app fix pass is merged on `feat/user-app-feature-parity` (PR #108, squash commit `f3b13c7`). This document is the parallel plan for the host-app. Same workflow, same rules.

---

## Source of truth

Read these first:

- Audit report: `/Users/tariqalkhathami/Hostn/audit/hostn_host_app_audit.md`
- User-app fix summary (for the patterns and audit corrections we built up): `/Users/tariqalkhathami/Hostn/audit/hostn_user_app_fix_summary.md`
- User-app brief (workflow and report format reference): `/Users/tariqalkhathami/Hostn/audit/hostn_user_app_fix_brief.md`

The defect IDs (B1, M1, R1, etc.) referenced below are the IDs from the host-app audit report.

---

## Branch strategy

**Audit baseline:** `feat/user-app-feature-parity` HEAD `ad163d5e33943c2be29d35aad3ac12d3ab528c71` (the host-app code at that commit is unchanged on the post-merge branch — the user-app fix pass only touched `user-app/`).

**Pre-audit hygiene branch:** `chore/in-flight-repairs-pre-audit` at commit `04c8a9e` contains 6 host-app in-flight repairs that the audit recommends merging. Decide: cherry-pick those into the new fix branch, or rebase them. Confirm with the owner before starting.

**Fix branch:** `fix/host-app-audit-pass-1` off `feat/user-app-feature-parity` HEAD. Same naming convention as user-app.

Confirm the branch name with the owner before pushing the first commit.

---

## Hard rules (unchanged from user-app)

1. One task at a time, in order. No skipping. No batching. No "while I'm in there" refactors.
2. After each task, stop and report. Do not start the next task until the owner confirms.
3. No silent dependencies. If a task depends on a prior task or backend change, say so explicitly and stop.
4. Verify, don't assume. Simulator-verify each fix. Source review acceptable for diagnostic-only changes or paths that require unstubbable test data.
5. No scope creep. New defects discovered while in code = log as DD, do not fix.
6. Commit cleanly. One commit per task. Format: `fix(<area>): <task ID> — <one-line summary>`.
7. TypeScript clean. `tsc --noEmit` returns 0 errors before every commit.
8. Origin tagging matters. Each fix should note in the commit body whether it touches `[branch]`, `[main]`, or `[mixed]` defects (per the audit's tagging). This drives merge-back decisions.

---

## Per-task report format

Same as user-app:

```
✅ Task <N>.<n> — <task title>

Files touched:
  - <path>:<lines>

What I changed:
  <2–4 sentences explaining the fix at a code level>

How I verified:
  - tsc --noEmit: <pass/fail>
  - Simulator: <what you did, what you saw>
  - Other: <any other check>

Discovered (not fixed):
  - <new defects, with file:line>
  - (or "none")

Commit: <SHA> on branch <branch-name>

Awaiting confirmation before starting Task <N>.<n+1>.
```

If a task is `🚧 BLOCKED`, post the same format with that status and the reason.

---

## Workflow tips earned during user-app pass

These cost real time on user-app. Apply from day one on host-app.

1. **One session per follow-up.** Sessions overflow at the 32MB context limit after ~7–8 tasks. Don't chain. Open a fresh session at every phase boundary, and a fresh session for each task in long phases.
2. **Always curl the backend before fixing data-shape bugs.** Half the user-app data bugs were the type lying about reality. Don't trust the audit's claim about "what the backend returns" — confirm with curl against a test account, then design the fix.
3. **Audit corrections are normal.** The user-app audit had 3 corrections (AC1, AC2, AC3); expect similar on host-app. When you find one, log it in the summary file and move on.
4. **Prefer source-level fixes over defensive workarounds.** DD3 (auth response shape) was patched defensively in two places before it was rooted out at the service layer. Save yourself the redo — fix at the source on first encounter.
5. **`xcrun simctl openurl` and deep-links beat clicking through the simulator.** Saves context budget and lets you verify in seconds.
6. **`simctl terminate` + `simctl launch` for true cold-boot.** Don't trust Fast Refresh for state-rehydration bugs.

---

## The fix list

### Phase 1 — Blockers (5)

The audit calls out 5 blockers — 4 are branch-introduced, 1 is mixed. All five must land before any other host-app work.

#### Task 1.1 — B1: PropertyWizard ↔ edit screen schema mismatch

The PropertyWizard writes nested fields (`pricing.perNight`, `capacity.bedrooms`, `rules.checkInTime`). The `/property/edit/[id]` screen reads flat fields (`property.price`, `property.bedrooms`, `property.checkInTime`). Round-tripping a wizard-created property through edit silently zeros every nested field.

**Investigation first.** Curl a property created via the wizard and the same property after an edit roundtrip. Confirm the data loss before designing the fix.

**Decision:** make the edit screen read nested (matching the wizard's write shape) AND make the type honest about reality. Same approach we used on the Booking type rewrite in user-app Task 2.5.

**Verify:** create a property via the wizard, save, reopen in edit, save again without changes, reopen — every field must be intact.

---

#### Task 1.2 — B2 + B3: edit-unit payload shape and capacity coalesce

`/property/edit-unit/[id]` ships two distinct bugs:
- **B2:** sends `name: form.title` while every other endpoint reads `title`. Backend persists null/wrong field for unit name. Also writes both `capacity.bedrooms` AND `rooms.bedrooms` simultaneously — one is stale on next read.
- **B3:** `unit.capacity?.maxGuests ?? unit.capacity ?? '2'` — when API returns `capacity` as an object missing `maxGuests`, the second fallback calls `String({...})` and stores literal `"[object Object]"`.

Curl the unit endpoint before fixing. Confirm the actual field names and capacity shape, then align the form to send what the backend actually expects. Drop the dual-write pattern.

---

#### Task 1.3 — B4: `/property/create` non-null `.find()!` assertions

`DIRECTIONS.find(...)!` and `CITIES.find(...)!` lie when stale form values point at items removed from constants. Replace with safe finds + fallback. Throw a clear validation error, never let `undefined` propagate.

---

#### Task 1.4 — B5: `(tabs)/reservations` `t()` called at module load

`statusFilters` is built at module-eval time, freezing labels to whatever the bundle's locale was at first import. Move the array construction inside the component so it re-runs per render with the current locale. Same pattern fix applies anywhere else in the host-app — grep for `t(` calls outside React render functions and migrate them.

**Verify:** toggle language mid-session; status pills must update without remount.

---

### Phase 2 — Pre-existing main bugs that hit current users RIGHT NOW

These are `[main]` origin — they affect production users today, regardless of branch merge timing. Prioritized by user impact.

#### Task 2.1 — M16: `/(tabs)/properties` only renders `properties[0]`

Hosts with 2+ properties only see the first one. The others are invisible. Render the full list. Add a key prop, handle empty state.

#### Task 2.2 — M17: `/property/unit/[id]` booking filter is `return true`

Every unit's calendar shows bookings from every other unit. Wire the filter to `(b) => b.unitId === id`. Confirm against backend that `booking.unitId` is the right field — if not, use whatever the actual relation is.

#### Task 2.3 — R1: Arabic-Indic digit rejection on phone-login

iOS-RTL phone-pad inserts `٥٠٠٠٠٠٠٠٣` into the field. Backend rejects, no UI feedback. Fix: normalize Arabic-Indic digits to Western digits in the input handler before submission. Apply the same fix to user-app's phone screen if it has the same issue (verify via grep).

#### Task 2.4 — R2: Onboarding completion doesn't persist

Reload routes the host through onboarding every time. Trace `(auth)/onboarding.tsx:80-89` — the inner `.catch()` swallows the persistence error. Surface the error, retry, and only navigate forward when the server confirms `onboardingCompleted: true`.

#### Task 2.5 — M14 + M15: StatusBadge typo and locale prop

- `'منتظي'` → `'منتظر'` (one typo). Already fixed in `chore/in-flight-repairs-pre-audit` — confirm and bring forward.
- `StatusBadge` defaults to `locale='ar'` but never gets passed. Subscribe to `getLocale()` inside the component instead.

---

### Phase 3 — Branch-introduced data correctness

#### Task 3.1 — M1: `/property/duplicate/[id]` wrong endpoint

Calls `hostService.createProperty(...)` instead of unit-duplicate. Wire to the correct endpoint; verify the duplicated unit attaches to its parent property.

#### Task 3.2 — M2 + M3: unit-pricing flat keys + flatten on pre-fill

Submits flat keys; reads from `pricing.perNight`. Pre-fill `pricing[key] ?? pricing.perNight` flattens differentials silently. Match the wizard/edit pattern: nested writes, nested reads.

#### Task 3.3 — M5 + M6: PropertyWizard validation gaps

- M5: Step 5 amenities — `canAdvance()` doesn't check; user can submit with zero amenities.
- M6: Step 7 nights — no `minNights ≤ maxNights` check; user can set min 30 / max 1.

Add the validation. Block advance with a localized error.

#### Task 3.4 — M9: `/property/create` direction stored, never read back

Wizard saves direction; edit never reads it. Add direction to the read path so the edit form pre-fills it correctly.

#### Task 3.5 — M13: StatusBadge unknown-status fallback

Server returns `paid`, `awaiting_payment` — both fall through to `waiting`. Use the same t()-miss pattern from user-app Task 2.4: detect the fallback explicitly, render the raw backend value (or hide the badge) rather than mislabel.

---

### Phase 4 — Crash-prone fixes

#### Task 4.1 — M4 + M7: PropertyWizard crashes

- M4: Step 2 review — `CITIES.find(c => c.value === form.city)` can return undefined; `l(undefined)` crashes. Add the guard.
- M7: Step 6 image upload — `catch {}` with no parameter binding swallows mid-loop failures. Add per-asset progress + retry; surface the actual error.

#### Task 4.2 — M8 + M10: post-success and add-unit handoff

- M8: when server returns success but `_id` is unparseable, show a warning and `router.back()`. Replace with proper error UI + manual retry path.
- M10: legacy `groupTag` branch in `add-unit.tsx:99-101` is dead in the new flow. Remove it; clean up the unused param-handling.

#### Task 4.3 — M25: `formatArabicDate` no null guard

`new Date(undefined).getDay()` is `NaN`; `ARABIC_DAYS[NaN]` is `undefined`; renders "undefined undefined undefined". Same family as user-app R1 — add null/Invalid Date guard. Centralize this into a shared utility if not already.

#### Task 4.4 — M26: dashboard BookingCard uses `booking.id`

API returns `_id`. Add a fallback (`booking._id ?? booking.id`) and update the type to match reality.

#### Task 4.5 — M34 + M35 + M36: more crash-prone defenses

- M34: onboarding MODULES out-of-range crash — bound check.
- M35: `reviews/reply/[id]` `id!` non-null + page-1-only review lookup — fix both.
- M36: `invoices/[id]` and `invoices/statement-detail` `.map` without `?.` — add optional chaining.

---

### Phase 5 — i18n coverage (the biggest single block of work)

The host app is essentially Arabic-hardcoded across most screens despite having a working `t()` infrastructure. This is the mirror image of user-app's English-only screens, but at much larger scale.

#### Task 5.1 — Audit + plan i18n coverage

Before doing any translation work: grep every `*.tsx` under `host-app/src/app/` and produce a coverage report. For each screen, classify: (a) uses `t()` correctly, (b) hardcoded Arabic, (c) hardcoded English, (d) mixed. Total LOC of strings to translate. Estimate task count.

**Stop and report.** Do not start translations until the owner has the coverage report and decides scope.

The audit recommends starting with the new branch screens (PropertyWizard, earnings, property/*) since they're the most visible and were just shipped. Main-origin screens (legal/, settings/, invoices/, financial/, content/, profile/, reviews/, suggestions/, protection/, permits/, program/, notifications/) can be a separate follow-up pass.

#### Tasks 5.2 → 5.N — Translate per the agreed scope

Each task = one screen or one tightly-coupled group. Same approach as user-app Phase 4: replace literals with `t()`, add EN+AR keys to the i18n bundle, verify both locales render correctly. Drop the `getLocale()`-captured-at-module-load pattern (M11, M12, m14) — locale must be live.

---

### Phase 6 — UX and dead-end fixes

#### Task 6.1 — M21 + M22 + M32: dead pressables

- M21: `/pricing/[unitId]` "Add Offer" button has no onPress. Wire to the offer-create flow if it exists; stub if not (log as DD).
- M22: `/(tabs)/reservations` search/info/filter buttons no-op. Wire each.
- M32: `/permits/index` Add permit + info banner. Wire or stub with localized "coming soon" alert.

#### Task 6.2 — M30 + M31: chore-branch fixes

`/(auth)/phone-entry` register and `/protection/index` Claims/Terms CTAs. Both are already fixed in `chore/in-flight-repairs-pre-audit`. Cherry-pick or rebase those commits.

#### Task 6.3 — M33: `/profile/index` "Values" → App Store URL

Tapping "قيمنا" opens `apps.apple.com`. Decide: internal screen, or a real values page? Stub if neither. Don't ship "tap our values, get sent to the App Store".

#### Task 6.4 — m21 + R3 + R4 + m25-related: empty-state consistency

Several screens hide API errors behind empty states. Add `isError` branches with retry CTAs across notifications, invoices, statements, change-requests, complaints, articles, support thread.

---

### Phase 8 — Calendar feature parity with GathernBusiness

**Source spec:** `/Users/tariqalkhathami/Hostn/audit/gathern_calendar_feature_spec.md` — full walkthrough of all 14 calendar surfaces in the competitor app, with screenshots, nav graph, and inferred data model.

This phase exists because the audit's calendar findings (M16, M17, M18, M19, M20, m16, m17, R8) describe a calendar tab that's basically a low-fidelity availability viewer — while the product needs the full host workstation that GathernBusiness ships. Achieving parity is **net new feature work** layered on top of the audit fixes, not a continuation of them.

**Hard ordering:** Phase 8 cannot start until **Phase 1 (blockers)** + **Tasks 2.1 + 2.2** (M16, M17 — multi-property + unit booking filter) are merged. Those are pre-conditions: Phase 8 builds on a property/unit data shape that must be honest first, and the day-cell rendering depends on M17 being fixed.

**Phase 8 is split into three sub-phases.** MVP must land before B and C. Owner approves between each.

---

#### Phase 8 — MVP (calendar workstation core)

Mirrors the surfaces a host actually uses every day to manage availability + pricing.

##### Task 8.1 — Backend schema for calendar entities

Before any UI, extend the host-app data model to support the per-DOW pricing, per-day overrides, day states, and external bookings the spec describes. Fields per the spec's data model section:

- `Unit.pricing.{midweek, thursday, friday, saturday}` (replaces flat `perNight` for hosts who use day-of-week differentials; flat remains as fallback for hosts who don't)
- `Unit.pricingOverrides[date] = number` for per-day overrides
- `Unit.iCalOutboundToken` (revocable secret; not used yet but space-reserve so we don't migrate twice)
- `DayState` enum (9 values per spec §4)
- `ExternalBooking` entity (single-night, optional guest + payment fields)

**Investigation first.** Read the current host-app pricing endpoints + types, propose a migration plan, get owner approval before touching backend. If backend changes are out of scope for this fix pass, document the gap and proceed with client-side mock-via-types until backend lands.

##### Task 8.2 — S1: Multi-property calendar root

Replace the current `(tabs)/calendar.tsx` (which assumes single property) with the multi-property root: per-group sections, per-unit mini-month tiles, listed-only filter toggle. Resolves M16-class assumption on the calendar tab specifically.

##### Task 8.3 — S2: Single-property month view

Day-grid with day number + per-night price + 8-state visual indicators (per spec §4). Month nav arrows that actually refetch month-scoped data (resolves M20). Tappable booked days (resolves m17). Persistent property card with kebab + back-to-S1 chevron.

##### Task 8.4 — S3: Date-detail bottom sheet

Tap a day → bottom sheet rises showing: status header, "اشغال" block toggle, "اضف حجز خارجي" link, single-night price + edit pencil, profit-breakdown card with platform commission line. The biggest single UX gap per the spec's gap analysis.

##### Task 8.5 — S4: Single-day price-edit modal

Pencil tap on S3 → modal with single price input + Apply. Saves as a per-day override. Distinct from default-DOW pricing (Task 8.6).

##### Task 8.6 — S7: Day-of-week pricing screen

Accordion of 4 sections (mid-week / Thu / Fri / Sat), one editable price each. This is where the host sets defaults; per-day overrides via S4 trump these.

##### Task 8.7 — S5: Add external booking form

Single-night blocking flow with optional guest data (name, mobile, ID, notes) and optional payment annotations (cash/transfer, paid/discount/total). Date is pre-filled from S3 entry, read-only.

##### Task 8.8 — S6: More-actions kebab menu

Bottom sheet from kebab on the property card. Hub linking to: Pricing & Offers (Task 8.6), Calendar Sync (Phase 8C), Yearly Calendar (Phase 8B). Even if Phase 8B/C aren't built yet, stub the routes with "coming soon" alerts so the menu is complete from MVP.

---

#### Phase 8B — Discounts + yearly view

Owner approves before starting. Each task is independent of the others within this phase.

##### Task 8.9 — S8: Length-of-stay discounts

Weekly (≥7 nights) + monthly auto-apply discount toggles with editable percentages.

##### Task 8.10 — S8 + S9 + S10: Custom offers + date-range picker

Named, date-ranged percentage offers with a slider (0–70%) and embedded multi-day picker. Live before/after price preview. The S10 picker is also the only multi-day select surface in the calendar feature — the day grid (S2) does not support range select; that's intentional per the spec.

##### Task 8.11 — S13: Yearly view

12-month grid for the selected unit. Tapping a month name drills into S2 for that month. Today marked in purple.

---

#### Phase 8C — iCal sync

Owner approves before starting. This is the heaviest sub-phase — requires backend work (poll engine, .ics parsing, booking import) and a new revocable-secret URL scheme.

##### Task 8.12 — S11: iCal outbound publishing

Per-unit `.ics` URL with copy-to-clipboard. Backend generates and serves the .ics from the unit's calendar state. URL contains an opaque revocable token (per Gathern's pattern).

##### Task 8.13 — S12: iCal inbound subscription + sync engine

Vendor-agnostic add-sync form (name + URL). Backend polls subscribed feeds, parses `.ics`, imports bookings as `external_booking`-state day cells. Polling cadence + conflict resolution to be specified during the task.

---

### Phase 7 — Polish (minor) and verification

#### Task 7.1 — Console noise gate

Same as user-app Phase 5 — gate `console.log` / `console.warn` behind `__DEV__`. Especially `services/socket.ts` (13 calls).

#### Task 7.2 — Misc minors per audit

m4 (PropertyWizard backdrop), m5 (back-from-step loses input), m6 (destructive pricing guard), m7 (discount % unbounded), m8 (chevron direction in RTL), m9 (pluralization), m11 (MONTHS arrays), m12-m13 (duplicate edge cases), m18 (empty-state subtext repeats title), m19 (FAB overlap), m20 (HeaderBar without showBack), m22 (dead `_hasError`), m23 (NPS re-trigger), m24 (no-op notification taps), m26 (raw status keys), m27 (URL validation), m28 (no destructive-confirm), m29 (icon vs handler mismatch), m30 (currency hardcoded), m31 (search debouncing).

Group related minors into single tasks where it makes sense.

#### Task 7.3 — Service-level audit (parity with user-app FU1)

Apply the FU1 methodology: curl every paginated endpoint in host-app services, identify wrappers, verify each service unwraps correctly. Same pattern that exposed the 27-notification silent loss in user-app — likely something similar lives here.

#### Task 7.4 — Final verification

Same as user-app Phase 6:
1. `tsc --noEmit` clean.
2. Cold-boot simulator walkthrough of every defect from the audit, both locales.
3. Capture Metro log to `audit/host-app-fix-pass-1-runtime.log`.
4. Update `hostn_host_app_fix_summary.md` with full task log + audit corrections + discovered defects + recommendation.
5. Open PR `fix/host-app-audit-pass-1 → feat/user-app-feature-parity`.

---

## Reminder

- Verify each task before reporting.
- Curl before fixing data-shape bugs.
- One session per phase (or per follow-up if a phase is heavy).
- Source-level fixes preferred over defensive workarounds.
- Audit corrections are normal — log them, don't argue.
- TypeScript clean before every commit.
- No scope creep — log discovered defects, do not fix them.

When the host-app fix pass is fully verified and merged, both apps are clean for the first time since the audit started. That's the win condition.
