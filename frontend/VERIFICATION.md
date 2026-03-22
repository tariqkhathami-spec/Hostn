# Deployment Hardening Verification Checklist

Complete this checklist to verify all security hardening is in place before production deployment.

## File Verification

### Configuration Files
- [x] `.env.example` exists with documented variables
  - Location: `/sessions/keen-blissful-knuth/mnt/Hostn/frontend/.env.example`
  - Size: 1.2K
  - Contains: MONGODB_URI, JWT_SECRET, JWT_EXPIRES_IN, NEXT_PUBLIC_* variables

- [x] `.gitignore` exists and is comprehensive
  - Location: `/sessions/keen-blissful-knuth/mnt/Hostn/frontend/.gitignore`
  - Size: 726B
  - Protects: .env files, .pem keys, IDE configs, node_modules, .next build

- [x] `vercel.json` exists with Vercel configuration
  - Location: `/sessions/keen-blissful-knuth/mnt/Hostn/frontend/vercel.json`
  - Size: 1.8K
  - Includes: Environment variables, build config, security headers

- [x] `next.config.js` is hardened
  - Location: `/sessions/keen-blissful-knuth/mnt/Hostn/frontend/next.config.js`
  - Changes: Removed ignoreBuildErrors, added production optimizations

- [x] `package.json` updated with new scripts
  - Location: `/sessions/keen-blissful-knuth/mnt/Hostn/frontend/package.json`
  - New scripts: seed, health

### API Routes
- [x] Health check endpoint created
  - Location: `/sessions/keen-blissful-knuth/mnt/Hostn/frontend/src/app/api/health/route.ts`
  - Size: 2.1K
  - Endpoints: GET (full), HEAD (lightweight)
  - Tests: MongoDB connectivity, returns status

- [x] Global error boundary created
  - Location: `/sessions/keen-blissful-knuth/mnt/Hostn/frontend/src/app/error.tsx`
  - Size: 4.5K
  - Features: User-friendly error page, development mode details, error tracking hooks

### Documentation Files
- [x] DEPLOYMENT.md created
  - Location: `/sessions/keen-blissful-knuth/mnt/Hostn/frontend/DEPLOYMENT.md`
  - Size: 6.5K
  - Covers: Prerequisites, steps, security, troubleshooting, maintenance

- [x] SECURITY_HARDENING.md created
  - Location: `/sessions/keen-blissful-knuth/mnt/Hostn/frontend/SECURITY_HARDENING.md`
  - Size: 12K
  - Details: All changes, security assessment, verification commands

## Code Verification

### JWT Secret Handling
Run the following to verify JWT_SECRET is properly validated:

```bash
grep -A 10 "const JWT_SECRET" /sessions/keen-blissful-knuth/mnt/Hostn/frontend/src/lib/auth-helpers.ts
```

Expected behavior:
- [x] Production mode: Throws error if JWT_SECRET is undefined
- [x] Development mode: Logs warning if JWT_SECRET is undefined
- [x] Uses temporary dev value only in development

### Secret Leakage Check
Run the following to verify no hardcoded secrets:

```bash
grep -r "mongodb\|password.*=\|secret.*=.*['\"]" \
  /sessions/keen-blissful-knuth/mnt/Hostn/frontend/src \
  --include="*.ts" --include="*.tsx" \
  | grep -v "JWT_SECRET\|MONGODB_URI\|process.env\|\.select\|\.password"
```

Expected: No output (no hardcoded secrets)

### TypeScript Configuration
Verify TypeScript is production-ready:

```bash
# Check that ignoreBuildErrors is not set
grep "ignoreBuildErrors" /sessions/keen-blissful-knuth/mnt/Hostn/frontend/next.config.js
```

Expected: No output (ignoreBuildErrors removed)

## Pre-Deployment Steps

### 1. Local Build Test
```bash
cd /sessions/keen-blissful-knuth/mnt/Hostn/frontend

# Install dependencies
npm install

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Build for production
npm run build

# Test production start (requires MONGODB_URI and JWT_SECRET)
# export MONGODB_URI="your-connection-string"
# export JWT_SECRET="your-secret"
# npm start
```

### 2. Environment Variable Configuration
Ensure these are set in Vercel environment variables:

```
✓ MONGODB_URI          (SECRET) - From MongoDB Atlas
✓ JWT_SECRET           (SECRET) - Generate: openssl rand -base64 32
✓ NEXT_PUBLIC_APP_URL  (PUBLIC) - Your production domain
○ JWT_EXPIRES_IN       (DEFAULT: 7d)
○ NEXT_PUBLIC_API_URL  (DEFAULT: /api)
○ NEXT_PUBLIC_APP_NAME (DEFAULT: Hostn)
```

### 3. Vercel Configuration
```bash
# Verify vercel.json is valid
cat /sessions/keen-blissful-knuth/mnt/Hostn/frontend/vercel.json | jq .

# Check environment variables defined
jq '.env[]' /sessions/keen-blissful-knuth/mnt/Hostn/frontend/vercel.json
```

### 4. Git Configuration Verification
```bash
# Verify .gitignore protects secrets
git check-ignore -v .env .env.local .env.production.local 2>/dev/null || \
  echo "✓ .env files are properly ignored"

# Verify no secrets are committed
git log -p --all -S "mongodb://" -- . 2>/dev/null | head -5 || \
  echo "✓ No MongoDB URIs found in git history"
```

## Security Headers Verification

After deployment, verify security headers are present:

```bash
# Test security headers on API routes
curl -I https://your-domain.com/api/health

# Expected headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# Referrer-Policy: strict-origin-when-cross-origin
```

## Health Check Verification

After deployment, test the health endpoint:

```bash
# Full health check
curl https://your-domain.com/api/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2024-03-23T12:00:00Z",
#   "dbConnected": true,
#   "version": "1.0.0",
#   "environment": "production",
#   "uptime": 12345
# }

# Lightweight health check
curl -I https://your-domain.com/api/health

# Expected: 200 OK (or 503 if db is disconnected)
```

## Monitoring Setup

Configure monitoring for these critical endpoints:

### 1. Health Check Monitoring
- Endpoint: `https://your-domain.com/api/health`
- Frequency: Every 30-60 seconds
- Alert if:
  - Status code is not 200
  - `dbConnected` is false
  - Response time > 5 seconds
  - `status` is "degraded" or "error"

### 2. Error Rate Monitoring
- Monitor Vercel logs for error spikes
- Alert if error rate > 1% of requests

### 3. Database Connectivity Monitoring
- Monitor `/api/health` dbConnected status
- Alert immediately if database becomes unreachable
- Have runbook for MongoDB connection issues

### 4. Performance Monitoring
- Monitor Web Vitals in Vercel Analytics
- Track API response times
- Alert if performance degrades > 10%

## Deployment Commands

When ready to deploy:

```bash
# 1. Link to Vercel (if not already done)
vercel link

# 2. Set environment variables in Vercel dashboard
# Go to: Project Settings → Environment Variables
# Set: MONGODB_URI, JWT_SECRET, NEXT_PUBLIC_APP_URL

# 3. Deploy to production
vercel --prod

# 4. Verify deployment
vercel deployments

# 5. Test health endpoint
vercel logs --follow

# 6. Check live endpoint
curl https://your-domain.com/api/health | jq
```

## Post-Deployment Verification

After successful deployment:

- [ ] Application loads on production domain
- [ ] `/api/health` returns 200 OK
- [ ] Database connectivity confirmed
- [ ] Authentication endpoints working
- [ ] No errors in Vercel logs
- [ ] Security headers present
- [ ] Monitoring configured and receiving data
- [ ] Error boundary tested (intentionally trigger error)
- [ ] No secrets visible in browser console

## Troubleshooting

### Build Fails
```
Error: CRITICAL: JWT_SECRET is not defined
```
**Solution**: Set JWT_SECRET in Vercel environment variables before deploying

### Database Connection Fails
```
Health endpoint returns: {"status": "degraded", "dbConnected": false}
```
**Solution**:
1. Verify MONGODB_URI is set in environment variables
2. Check MongoDB Atlas network access list includes Vercel IP ranges
3. Test connection locally with same connection string

### TypeScript Errors on Build
```
Type error found in src/...
```
**Solution**: Run locally first:
```bash
npx tsc --noEmit
npm run lint
npm run build
```

## References

- Main configuration: `vercel.json`
- Environment variables: `.env.example`
- Git protection: `.gitignore`
- Health endpoint: `src/app/api/health/route.ts`
- Error handling: `src/app/error.tsx`
- Deployment guide: `DEPLOYMENT.md`
- Security details: `SECURITY_HARDENING.md`

## Sign-Off

Production Deployment Approved: __________  Date: __________

Deployment completed by: __________________________

Verification completed: __________________________
