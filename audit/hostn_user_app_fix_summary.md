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
