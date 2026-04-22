# Subdomain Migration — Deployment Guide

This guide walks through the manual steps to activate the subdomain split:
- `hostn.co` — guest site
- `business.hostn.co` — host dashboard
- `admin.hostn.co` — admin dashboard

The code changes are already merged (Phase 1 + Phase 2). These steps activate the new URLs.

---

## Order of operations

1. **Run migration** (Phase 1 backend) — creates `Guest`, `Host`, `Admin` collections from `User`
2. **Add Vercel domains** — `business.hostn.co` + `admin.hostn.co`
3. **Add DNS records** — CNAME both subdomains to Vercel
4. **Update Railway CORS env var** — allow the new origins
5. **Smoke test** — register as guest/host/admin on each subdomain

---

## 1. Run the User → 3-collection migration

The migration preserves existing user `_id` values so foreign keys (Booking.guest, Property.host, etc.) continue to resolve. Original `users` collection is NOT deleted — keep for rollback until Phase 3.

### On Railway (recommended — hits production DB)

```bash
# Open Railway shell to the backend service
railway login           # if not already
railway link            # select the Hostn backend service

# Dry run (no writes)
railway run node scripts/split-user-to-roles.js --dry

# Review the output. If counts look right, run for real:
railway run node scripts/split-user-to-roles.js --commit
```

### Expected output

```
Connected to MongoDB. Mode: COMMIT
Found N User documents.

── Summary ─────────────────────────────
  Guests migrated: X
  Hosts migrated:  Y
  Admins migrated: Z
  Skipped (already existed): 0
  Errors: 0

── Backfilling polymorphic discriminators ──
  Notifications backfilled:          N
  RefreshTokens backfilled:          N
  Wallets backfilled:                N
  ... (etc)

✓ Migration complete. Original User documents preserved for rollback.
```

### Rollback

If anything goes wrong, drop the 3 new collections — the original `users` is untouched:

```js
db.guests.drop()
db.hosts.drop()
db.admins.drop()
```

Discriminator backfills are additive (new fields on existing docs) and safe to leave even if you roll back models — they just won't be used.

---

## 2. Add Vercel domain aliases

Vercel dashboard → the `Hostn` frontend project → **Settings → Domains**:

1. Add `business.hostn.co`
2. Add `admin.hostn.co`

Vercel will show DNS instructions for each. Both should be CNAME records pointing to `cname.vercel-dns.com`.

Alternatively via CLI:

```bash
cd frontend
npx vercel --prod          # log in first if needed
npx vercel domains add business.hostn.co
npx vercel domains add admin.hostn.co
```

---

## 3. Add DNS records

In your DNS provider (Cloudflare / Namecheap / etc.) — the one hosting `hostn.co`:

| Type  | Name       | Value                    | Proxy |
|-------|------------|--------------------------|-------|
| CNAME | `business` | `cname.vercel-dns.com`  | Off   |
| CNAME | `admin`    | `cname.vercel-dns.com`  | Off   |

TTL: 3600 (1 hour) is fine. Propagation usually < 15 minutes.

Verify with:
```bash
dig business.hostn.co
dig admin.hostn.co
```

Both should resolve to a Vercel IP.

Once Vercel shows "Valid Configuration" for both domains, SSL certificates auto-provision (takes ~1-2 minutes).

---

## 4. Update Railway backend CORS env var

The backend allowlist needs the new origins so API calls from `business.hostn.co` and `admin.hostn.co` succeed.

Railway dashboard → Hostn backend service → **Variables**:

Update `CORS_ORIGINS` to include all three origins (comma-separated):

```
https://hostn.co,https://business.hostn.co,https://admin.hostn.co,http://localhost:3000
```

Save. Railway auto-redeploys the backend (takes ~30s).

No code change required — the CORS logic (`backend/src/server.js:73-96`) already reads this env var.

---

## 5. Set Vercel env vars (optional — defaults work in production)

In Vercel project settings → Environment Variables, these can be set but defaults are correct:

- `NEXT_PUBLIC_MAIN_URL=https://hostn.co`
- `NEXT_PUBLIC_BUSINESS_URL=https://business.hostn.co`
- `NEXT_PUBLIC_ADMIN_URL=https://admin.hostn.co`

Already in `frontend/.env.production` so a redeploy is unnecessary unless you want to override per-environment.

---

## 6. Smoke test

### Guest flow (`hostn.co`)
1. Visit `https://hostn.co` — guest site loads
2. `/host/bookings` → 404 (legacy path blocked)
3. `/admin/users` → 404
4. Register a new guest via OTP → creates row in `guests` collection
5. Log in → cookie `hostn_token` set on `hostn.co` only

### Host flow (`business.hostn.co`)
1. Visit `https://business.hostn.co` — redirects to `/auth`
2. URL stays `business.hostn.co/auth` (clean, no `/host` prefix visible)
3. Register new host via OTP → creates row in `hosts` collection
4. After login, lands on dashboard (URL: `business.hostn.co/`)
5. Navigate to bookings — URL: `business.hostn.co/bookings` (internally rewritten to `/host/bookings`)
6. DevTools Application tab: cookie `hostn_token` is bound to `business.hostn.co` only (does not leak to main domain)

### Admin flow (`admin.hostn.co`)
1. Visit `https://admin.hostn.co` — auth page
2. Log in as existing admin → lands on `admin.hostn.co/`
3. Navigate to users — URL: `admin.hostn.co/users`

### Cross-subdomain isolation
1. Open 3 browser tabs, log into all 3 subdomains with different phones
2. Each has its own independent session (3 separate cookies in DevTools)
3. Log out on business → hostn.co and admin.hostn.co sessions remain active

---

## Troubleshooting

**"Not allowed by CORS" errors** → `CORS_ORIGINS` env var on Railway hasn't been updated or backend hasn't redeployed yet. Wait 1 min and refresh.

**Infinite redirect loop on subdomain** → Middleware thinks you're unauthenticated. Clear cookies for the subdomain and try again. Also check that the JWT contains `userType` (inspect cookie in DevTools).

**Migration shows "Skipped: N"** on second run → Expected. The script is idempotent — it skips users already migrated. Safe.

**Duplicate phone error during migration** → A user has the same phone as another in a different collection (shouldn't happen for existing data since source was a single collection). Contact support.

**SSL certificate pending** → Vercel takes 1-2 minutes after the domain is added. Refresh the domains page.

---

## Phase 3 (future) — cleanup

Not part of this deployment. Once everything is stable on the new subdomains:
- Drop legacy `users` collection
- Remove `User.js` model file
- Delete `upgradeToHost` endpoint + frontend method
- Remove `role` field from JWT payload (keep only `userType`)
- Add `.env.development` + `.env.local` ignored-file setup for local dev

Tracked as a follow-up PR after a stable period on the subdomain setup.
