# Hostn Payment System — Production Readiness Audit Report

**Date:** March 23, 2026
**Environment:** Production (hostn.co) via Vercel
**Payment Provider:** Moyasar (Test Mode)
**Database:** MongoDB Atlas (Cluster0 / hostn)

---

## 1. Payment Flow (End-to-End)

| Step | Result |
|------|--------|
| Guest registration & JWT token | PASS |
| Booking creation (pending / unpaid) | PASS — 201, total=1210 SAR |
| Payment initiation (returns Moyasar config) | PASS — 201, publishable key + amount in halalas |
| Callback URL points to production domain | PASS (FIXED) — was `localhost:3000`, now `hostn.co` after adding `NEXT_PUBLIC_APP_URL` env var |
| Server-side verification rejects fake Moyasar IDs | PASS — returns 500 (Moyasar API rejects) |

## 2. Database Validation

| Check | Result |
|-------|--------|
| Payment record created in MongoDB | PASS |
| Fields: amount (1210), currency (SAR), provider (moyasar) | PASS |
| Status = pending on initiation | PASS |
| Fees object (platformFee, providerFee, hostPayout) | PASS |
| Idempotency key generated | PASS |
| Metadata (bookingId, paymentId, userId) | PASS |

## 3. Webhook Handling

| Check | Result |
|-------|--------|
| Webhook accepts valid payload (200 OK) | PASS |
| Rejects missing payment ID (400) | PASS |
| Returns 200 for unknown Moyasar IDs (prevents retries) | PASS |
| Re-verifies with Moyasar API (not trusting webhook blindly) | PASS |
| Webhook signature verification | FAIL — Not implemented (see Security section) |

## 4. Idempotency / Double Payment Protection

| Check | Result |
|-------|--------|
| Prevents duplicate payments for same booking | PASS (FIXED) |
| **Bug found & fixed:** Original code only checked `['paid', 'processing']` statuses, allowing multiple `pending` payment records for the same booking. Fixed to check `['pending', 'paid', 'processing']`. | |
| **Commit:** `ce5e9e0` — deployed to production via Vercel | |

## 5. Error Handling

| Check | Result |
|-------|--------|
| Failed payment verification → booking stays pending/unpaid | PASS |
| Invalid bookingId format → 400 | PASS |
| Missing required fields → 400 | PASS |
| Amount mismatch detection | PASS (code verified) |
| Currency mismatch detection | PASS (code verified) |

## 6. Security Checks

| Check | Result |
|-------|--------|
| Moyasar secret key NOT in client HTML/JS | PASS |
| Secret key NOT in payment config response | PASS — only publishable key returned |
| Server-side verification enforced | PASS |
| Auth required on /payments/initiate | PASS — 401 without token |
| Auth required on /payments/verify | PASS — 401 without token |
| User ownership check (403 for wrong user) | PASS |
| Webhook signature verification | FAIL — Code has comments about it but no implementation |
| JWT hardcoded fallback secret in auth-helpers | WARNING — `dev-temporary-secret-change-immediately-in-production` exists as fallback |

## 7. Logs / Debugging

| Check | Result |
|-------|--------|
| console.error on payment failures | PASS |
| console.warn on webhook anomalies | PASS |
| console.log with sensitive data in production | WARNING — should be reviewed |

---

## Summary

| Category | Status |
|----------|--------|
| Payment Flow | PASS (after callback URL fix) |
| Database Validation | PASS |
| Webhook Handling | PARTIAL — works but no signature verification |
| Idempotency | PASS (after fix deployed) |
| Error Handling | PASS |
| Security | PARTIAL — 2 issues noted below |
| Logs | PASS with warnings |

### Fixes Applied During This Audit

1. **Callback URL (CRITICAL):** Added `NEXT_PUBLIC_APP_URL=https://hostn.co` to Vercel environment variables. Without this, Moyasar would redirect users to `localhost:3000` after payment.

2. **Idempotency Bug (HIGH):** Changed payment duplicate check from `['paid', 'processing']` to `['pending', 'paid', 'processing']`. Without this fix, users could create unlimited pending Payment records for the same booking by hitting "pay" multiple times. Commit `ce5e9e0` deployed to production.

### Open Issues Requiring Attention

1. **Webhook Signature Verification (CRITICAL):** The webhook endpoint at `/api/payments/webhook` does not verify Moyasar's webhook signature. An attacker could send forged webhook payloads to mark payments as paid. The code re-verifies with Moyasar's API which mitigates this somewhat, but proper HMAC signature verification should be added.

2. **JWT Fallback Secret (MEDIUM):** `auth-helpers.ts` contains a hardcoded fallback JWT secret (`dev-temporary-secret-change-immediately-in-production`). If `JWT_SECRET` env var is ever missing, any attacker knowing this string could forge tokens. Remove the fallback and fail hard if the env var is not set.
