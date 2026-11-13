# Hostn — User App Fix Brief

You audited this app. The owner has reviewed both audit reports and decided to fix the user-app fully before touching the host-app. Your job now is to work through the fixes in the strict order below, one at a time, reporting after each.

---

## Source of truth

Read this first if you haven't already loaded it into context:

- Audit report: `/Users/tariqalkhathami/Hostn/audit/hostn_user_app_audit.md`
- Runtime log: `/Users/tariqalkhathami/Hostn/audit/user-app-runtime.log`
- Original audit brief: `/Users/tariqalkhathami/Hostn/audit/hostn_audit_brief.md`

The defect IDs (D1, D2, R1, etc.) referenced below are the IDs from the audit report. When in doubt, re-read the relevant row in the report — it has reproduction steps and exact file:line references.

---

## Hard rules

1. **One task at a time, in order.** Do not skip. Do not batch. Do not "while I'm in there" refactor.
2. **After each task, stop and report.** Do not start the next task until the owner confirms.
3. **No silent dependencies.** If a task depends on a prior task being merged or on a backend change, say so explicitly and stop.
4. **Verify, don't assume.** For every fix, verify it works in the simulator (or via the appropriate test) before reporting complete. If you only confirmed via source review, say so explicitly in the report.
5. **No scope creep.** If during a fix you discover a new defect not in the audit, log it as a "discovered defect" in your report — do not fix it. The owner decides whether it joins the queue.
6. **Commit cleanly.** One commit per task. Commit message format: `fix(<area>): <task ID> — <one-line summary>`. Example: `fix(conversations): R1 — guard formatDate against null timestamps`.
7. **TypeScript must stay clean.** After every task, `tsc --noEmit` returns 0 errors before you commit.
8. **Branch.** Work on a new branch off the audit baseline `feat/user-app-feature-parity`. Suggested name: `fix/user-app-audit-pass-1`. Confirm the branch name with the owner before pushing the first commit.

---

## Per-task report format

When you finish each task, post a single message in this shape:

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
  - <any new defects found while in this code, with file:line>
  - (or "none")

Commit: <SHA> on branch <branch-name>

Awaiting confirmation before starting Task <N>.<n+1>.
```

If you cannot complete a task (blocked, ambiguous, requires owner decision), post the same template with status `🚧 BLOCKED — <reason>` instead of `✅`.

---

## The fix list

### Phase 1 — Blockers (must land first; do not start Phase 2 until all three are merged)

#### Task 1.1 — Fix R1: Conversations tab crash

`src/utils/format.ts:25-29` — `formatDate` calls `parseISO(date)` which returns Invalid Date for null/undefined timestamps, and date-fns `format()` then throws `RangeError: Invalid time value`. The Conversations tab crashes on first tap because at least one conversation has a null `lastMessage.createdAt`.

**Do:**
- Add a guard at the top of `formatDate` so it returns `''` (or `'—'`) when `date` is null/undefined or when `parseISO()` yields an Invalid Date.
- Audit every caller of `formatDate` (`src/app/(tabs)/conversations.tsx:71`, booking, etc.) to confirm they tolerate empty string return values.
- Verify the conversation list renders without crashing for a conversation with null timestamps.

**Verify:**
- Boot simulator, log in as `+966500000003` / OTP `0000`, tap Conversations tab. Tab must render without RedBox/ErrorBoundary.

---

#### Task 1.2 — Fix D1: NetworkBanner endpoint

`src/components/ui/NetworkBanner.tsx:13` calls `/api/v1/health/ready`, but the backend mounts health routes at `/health/ready` (no `/api/v1` prefix). The request 404s, the banner shows red on every screen even when the API is healthy.

**Do:**
- Change the health probe to call the correct path. Two options: (a) bypass the `api` axios baseURL and use a fresh axios/fetch with the explicit URL `${API_BASE}/health/ready`, or (b) update the api instance to support a "no prefix" option for health checks.
- Confirm via curl (or in the simulator) that the new path returns 200 with `{ status: 'ready' }` (or whatever the backend returns).

**Verify:**
- Boot simulator. Banner must be hidden (or green) when API is reachable.
- Force airplane mode → banner must turn red. Restore network → banner returns to hidden/green within the polling interval.

---

#### Task 1.3 — Fix D2: `_layout.tsx` route name mismatches

Root `src/app/_layout.tsx` declares Stack.Screen names that don't match the actual file tree, producing 8 `WARN [Layout children]` warnings on every bundle load. Cosmetic, but signals a sloppy stack config and may hide a real navigation issue.

**Do:**
- Compare the Stack.Screen `name` props against the actual route segments in `src/app/`. Fix the mismatches.
- Be careful: incorrect stack config can break navigation. Test every navigation path covered in the audit walkthrough after the change.

**Verify:**
- Boot simulator with Metro open. The 8 `WARN [Layout children]` lines must drop to zero.
- Walk: home → search → results → listing → checkout → back; home → conversations; home → more → every account screen → back. Navigation must still work.

---

### Phase 2 — Crashes & data correctness

#### Task 2.1 — Fix D3, D4, D5: null guards in listing/checkout/conversations

Three crash-prone fall-throughs exposed by the audit (single task because they share a pattern).

- **D3** `src/app/listing/[id].tsx:48,521` — guard at L48 only `console.debug`s and lets render proceed; L521 `Book Now` reads `listing._id` without null check. Add a hard guard: if listing fetch returns null, render an error state and disable Book Now.
- **D4** `src/app/checkout/[listingId].tsx:127,325` — `calculateDateRangePrice` swallows errors with `console.debug`. If both unit and listing fetch fail, the screen still renders empty UI with Pay enabled. Show error UI and disable Pay button.
- **D5** `src/app/(tabs)/conversations.tsx` renderItem — `getOtherParticipant(item)` can return undefined. Add null check before reading avatar/name.

**Verify:**
- Each path: simulate the failure case (e.g. invalid route param, network failure) and confirm no crash + a user-facing error/disabled button.

---

#### Task 2.2 — Fix D6: confirm dialog before card delete

`src/app/account/payment-methods.tsx:67` — `deleteCard.mutate(item._id)` runs immediately on tap with no confirm. A real card can be removed by an accidental tap.

**Do:**
- Wrap the delete in `Alert.alert` with title "هل تريد حذف البطاقة؟" / "Delete this card?" and Cancel + Confirm buttons. Mutation only fires on Confirm.

**Verify:**
- Add a card (or stub one), tap delete → confirm dialog appears. Cancel → card stays. Confirm → card removed.

---

#### Task 2.3 — Fix R13: disable Book Now on empty listing data + 1/0 gallery guard

`src/app/listing/[id].tsx` — listing with empty data shows "1/0" gallery counter, "—" stats, "0.00 SAR لكل ليلة" price, but Book Now is still active.

**Do:**
- Gallery counter: render only when `images.length > 0`.
- Book Now: disabled when `pricing.perNight === 0 || pricing.perNight == null` OR `images.length === 0` OR core fields missing (`title`, `city`).
- Optional: show an "incomplete listing" empty-state if data is too sparse to make sense.

**Verify:**
- Open a listing with empty pricing (or stub one). Gallery counter must not show "1/0". Book Now must be disabled with a helper note like "هذا الإعلان غير مكتمل".

---

#### Task 2.4 — Fix R2: `type.undefined` fallback on listing cards

Search results render literal `type.undefined` on the property-type badge when `listing.type` is undefined.

**Do:**
- In the badge render, check `listing.type` exists before calling `t(\`type.${listing.type}\`)`. If missing: hide the badge OR show a generic `t('type.generic')` (e.g. "عقار" / "Property").

**Verify:**
- Search Khobar 5–10 May → result cards render either a real type label or no badge. No `type.undefined` literal anywhere.

---

#### Task 2.5 — Investigate + fix R3/R14: booking list ↔ detail price mismatch

Same booking shows 382.95 SAR in list, 0.00 SAR in detail. Status pill shows raw `status.unpaid` next to localized "قيد الانتظار".

**INVESTIGATION FIRST. DO NOT GUESS.**

**Do:**
1. Open Network tab in the simulator dev tools (or proxy/log requests).
2. Tap Bookings tab → capture `GET /bookings` (or whatever list endpoint) payload for the test booking.
3. Tap the row → capture `GET /bookings/:id` (or detail endpoint) payload for the same booking.
4. Diff the two payloads. Determine which side is wrong:
   - Backend detail endpoint missing pricing fields? → backend fix.
   - Client detail screen reading wrong field path? → client fix.
   - List computes pricing client-side from totals while detail reads raw record? → unify.
5. Document your finding in your report before applying a fix.
6. Apply the minimal fix at the right layer.
7. Add `status.unpaid` Arabic + English translation keys (this also resolves R17).

**Verify:**
- Same booking shows the same total in list and detail.
- Status pill shows localized text, not raw key.

---

#### Task 2.6 — Fix D15: city carousel filter dropped on results

Home city carousel pushes `/results?city=ID`, but `results/index.tsx` reads filters from a Zustand store, ignoring query params. User picks Riyadh, sees unfiltered results.

**Do (preferred):**
- In `(tabs)/index.tsx:88-103` (city card press handler), call the Zustand `setFilters({ city })` before `router.push('/results')`.

**Alternative (if simpler):**
- In `results/index.tsx`, read `useLocalSearchParams()` on mount and hydrate Zustand filters from it.

**Verify:**
- Tap Riyadh card → results screen opens with city filter applied (only Riyadh listings shown, or empty-with-Riyadh-filter-pill if none).

---

### Phase 3 — Navigation gap

#### Task 3.1 — Fix D7: Become Host post-success navigation

`src/app/account/profile.tsx:61-70,150-163` — after `authService.upgradeToHost()` success, the user stays on the same profile screen with no transition.

**Do:**
- On success, show success Alert with a clear message ("تم تفعيل حساب المالك. حمّل تطبيق Hostn Host للمتابعة.").
- After Alert dismiss, `router.replace('/(tabs)')` (or to a dedicated success screen if one is planned).
- If a host-app deep link scheme exists (check with the owner), open it via `Linking.openURL`.

**Verify:**
- Trigger Become Host on a test account → success Alert → tap OK → user lands on home tab. No silent stay.

---

### Phase 4 — i18n: 6 English-only screens on an Arabic-first product

For every task in this phase: replace hardcoded English strings with `t('key')` calls and add Arabic + English translations to the i18n bundle. If a translation key already exists, reuse it. Verify by toggling the language switch in More tab — both AR and EN must render correctly.

#### Task 4.1 — Translate About screen (R5)

`src/app/account/about.tsx`. Strings to translate: title "About", body paragraph about Hostn, 4 feature cards (Trusted, 1,000+ Properties, Top Rated, Local Expertise), "Website" link.

#### Task 4.2 — Translate Contact Us + FAQ + Terms + Privacy (R6/R7/R8)

Four screens, similar work:
- `account/contact.tsx` — header, Name/Email/Subject/Message labels, Send Message button, hours line.
- `account/faq.tsx` — header, search placeholder, all 7 questions + answers.
- `account/terms.tsx` — header + every paragraph.
- `account/privacy.tsx` — verify same issue, translate if needed.

#### Task 4.3 — Translate Payment Methods + add Add Card CTA (R9)

`src/app/account/payment-methods.tsx`. Two fixes:
1. Translate header, empty-state copy.
2. **Add an Add Card CTA** — top-right header action OR FAB OR empty-state primary button. Must route to the existing add-card flow if present, or to a stub screen with a "coming soon" message until backend is ready. Without this, users have no way to add a card from the app.

#### Task 4.4 — Translate Search flow (R10/R11/R12)

Three sub-screens:
- `search/destination.tsx` — header "Where to?", search placeholder.
- `search/type-guests.tsx` — header, "Property Type" / "Number of Guests" sections, all 9 type cards (Apartments, Chalets, Farms, Camps, Resorts, Rest Houses, Rooms, Hotel Resorts, Serviced Apartments), Next button.
- `search/dates.tsx` — header, Check-in/Check-out labels, Search button. **Calendar weekday headers must use Arabic locale** when AR is selected (Sun/Mon/Tue → أحد/إثنين/ثلاثاء).

---

### Phase 5 — Polish

#### Task 5.1 — Cleanup console.debug calls (D8/D9/D10/D11)

Remove or gate behind `__DEV__` flag:
- `listing/[id].tsx:48, 82, 93` (3 calls)
- `checkout/[listingId].tsx:127, 325` (2 calls)
- `results/index.tsx:69, 89` (2 calls)
- `chat/[id].tsx:51` — this is a `console.warn` indicating conversation create failure. Surface it as a user-facing error toast/alert in addition to (or instead of) the warn.

#### Task 5.2 — Auth polish: phone modal backdrop + OTP error feedback (D12/D13)

- **D12** `(auth)/phone.tsx:221` — country picker modal backdrop tap doesn't dismiss. Wrap backdrop in Pressable with `onPress={close}`.
- **D13** `(auth)/otp.tsx` — OTP failure has no visual feedback. Add error message below boxes + red border or shake animation when verify fails.

#### Task 5.3 — Booking detail i18n + status.unpaid translation (D17/R17)

- **D17** `booking/[id].tsx:82, 91, 96` — three hardcoded Arabic Alert messages. Replace with `t()` calls so EN-locale users see English.
- **R17** Verify `status.unpaid` translation key exists in both AR and EN bundles after Task 2.5. If not, add now.

#### Task 5.4 — Profile pre-fill + Notifications empty state (R16/R15)

- **R16** `account/profile.tsx` — form opens blank when user is logged in. Seed defaults from auth store: `firstName`, `lastName`, `email`, `phone` (formatted with country code).
- **R15** `account/notifications.tsx` — empty list renders blank. Add empty-state with icon + "لا توجد إشعارات" / "No notifications yet" message that matches Wallet/Bookings/Reviews/FAQ empty states.

#### Task 5.5 — Listing Location empty + checkout calendar tap + contact errors (R20/R19/D14)

- **R20** `listing/[id].tsx` Location tab — when no coordinates, show "موقع غير متوفر" / "Location not available" placeholder. Currently renders fully empty body.
- **R19** `checkout/[listingId].tsx` calendar — date taps don't register. Investigate: hit-area, overlapping View, gesture handler conflict. Compare with the working `search/dates.tsx` calendar for the structural difference. Fix the calendar instance in checkout.
- **D14** `account/contact.tsx:35` — Alert on submit doesn't distinguish 4xx vs 5xx. Inspect `error.response.status` and show specific messages (e.g. 4xx → "Please check your input", 5xx → "Server error, try again later").

---

### Phase 6 — Final verification

#### Task 6.1 — Full simulator walkthrough + tsc clean

After all fixes are merged on `fix/user-app-audit-pass-1`:

1. **Static checks:**
   - `cd user-app && npx tsc --noEmit` → 0 errors.
   - `npm run lint` (if defined) → 0 errors.

2. **Simulator runtime checks:**
   - Boot fresh simulator. Confirm:
     - **R1** Conversations tab opens without crash.
     - **D1** NetworkBanner is hidden/green on healthy network.
     - **D2** Metro logs zero `WARN [Layout children]`.
   - Open a listing with empty data:
     - **R13** Gallery counter does not show "1/0". Book Now is disabled.
   - Search → results:
     - **R2** No `type.undefined` literal anywhere.
   - Tap a booking:
     - **R3/R14** Total in list matches total in detail.
     - **R17** Status pill shows localized label.
   - More tab → tap each of: About, Contact, FAQ, Terms, Privacy, Payment Methods:
     - **R5–R9** All render Arabic when AR locale, English when EN locale. Payment Methods has an Add Card CTA.
   - Search flow → Where to? → Property & Guests → Select Dates:
     - **R10/R11/R12** All Arabic when AR. Calendar weekdays Arabic when AR.
   - Home → Riyadh card:
     - **D15** Results filtered to Riyadh.
   - Become Host:
     - **D7** Success Alert + navigation away from profile screen.
   - Notifications screen empty:
     - **R15** Renders empty-state placeholder.
   - Profile editor:
     - **R16** Fields pre-filled from logged-in user.
   - Listing Location tab without coords:
     - **R20** Shows "موقع غير متوفر" placeholder.

3. **Capture artifacts:**
   - Save Metro log to `audit/user-app-fix-pass-1-runtime.log`.
   - Write a Phase 6 summary to `audit/hostn_user_app_fix_summary.md` with: tasks done, tasks blocked, remaining defects (minors not in this pass), and any discovered defects.

---

## When the user-app fix pass is fully verified

Stop. Wait for owner sign-off before starting the host-app fixes. Do **not** start host-app work in the same branch or session.

---

## Reminder

- One task at a time.
- Report after each.
- No skipping.
- No batching.
- No "while I'm in there" refactors.
- TypeScript clean before every commit.
- Verify in the simulator before reporting complete.

If anything in this brief is unclear, ask the owner before starting Task 1.1.
