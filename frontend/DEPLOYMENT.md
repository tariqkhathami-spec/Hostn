# Hostn Frontend - Deployment Guide

This guide covers deployment to Vercel and production hardening for the Hostn Next.js frontend.

## Prerequisites

- Node.js 18+ (as specified in package.json)
- npm or yarn package manager
- Vercel account (for production deployment)
- MongoDB Atlas instance (or self-hosted MongoDB)

## Environment Variables

### Required Variables (Production)

The following environment variables **MUST** be set in production:

1. **MONGODB_URI** (SECRET)
   - MongoDB connection string
   - Example: `mongodb+srv://user:password@cluster.mongodb.net/hostn?retryWrites=true&w=majority`
   - Never commit this to version control

2. **JWT_SECRET** (SECRET)
   - Strong random secret for signing JWT tokens
   - Minimum 32 characters recommended
   - Generate with: `openssl rand -base64 32`
   - Never use default or weak values in production
   - Changing this will invalidate all existing tokens

3. **NEXT_PUBLIC_APP_URL** (REQUIRED)
   - Your application's public URL
   - Used for links, redirects, and CORS
   - Example: `https://hostn.com`

### Optional Variables

- **JWT_EXPIRES_IN**: Token expiration time (default: `7d`)
- **NEXT_PUBLIC_API_URL**: API URL for frontend (default: `/api`)
- **NEXT_PUBLIC_APP_NAME**: App display name (default: `Hostn`)

## Vercel Deployment Steps

### 1. Connect Your Repository

```bash
# Login to Vercel CLI
npm i -g vercel
vercel login

# Connect project
cd frontend
vercel link
```

### 2. Set Environment Variables in Vercel

Go to **Project Settings** → **Environment Variables**:

```
MONGODB_URI = mongodb+srv://...
JWT_SECRET = [generate with openssl rand -base64 32]
NEXT_PUBLIC_APP_URL = https://your-domain.com
```

### 3. Deploy

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## Security Checklist

Before deploying to production:

- [ ] **JWT_SECRET** is set to a strong random value (minimum 32 characters)
- [ ] **MONGODB_URI** uses MongoDB Atlas with strong credentials
- [ ] **NEXT_PUBLIC_APP_URL** is set to your production domain
- [ ] All `.env` files are in `.gitignore` and never committed
- [ ] TypeScript build completes without errors
- [ ] No hardcoded secrets in source code
- [ ] Health check endpoint (`/api/health`) is working
- [ ] CORS headers are properly configured for your domain
- [ ] SSL/TLS is enabled (automatic with Vercel)

## Production Build Testing

```bash
# Install dependencies
npm install

# Run type checking
npx tsc --noEmit

# Run linting
npm run lint

# Build for production
npm run build

# Test production build locally
npm start
```

## Health Check Monitoring

The application provides a health check endpoint for monitoring:

```bash
# Check application health
curl https://your-domain.com/api/health

# Response format:
# {
#   "status": "ok|degraded|error",
#   "timestamp": "2024-03-23T12:00:00Z",
#   "dbConnected": true,
#   "version": "1.0.0",
#   "environment": "production",
#   "uptime": 3600
# }
```

Configure your monitoring service to:
- Check every 30-60 seconds
- Alert on non-200 status codes
- Alert on database disconnection (`dbConnected: false`)

## Vercel Serverless Function Compatibility

This application is optimized for Vercel's serverless environment:

- **Function Timeout**: 60 seconds (configurable in vercel.json)
- **Memory**: 1024 MB (configurable per API route)
- **Cold Start Optimization**: Database connection caching with mongoose
- **No Persistent Storage**: Use MongoDB for all data persistence

### Important Notes

1. **Database Connection Pooling**
   - MongoDB connections are cached in the global scope
   - This allows connection reuse across function invocations
   - See `src/lib/db.ts` for implementation

2. **Stateless Functions**
   - API routes must not store state in memory
   - Use MongoDB or other persistent storage
   - Avoid file writes to `/tmp` for long-term storage

3. **Build Output**
   - Next.js generates optimized bundles for serverless
   - Static assets are served by Vercel's CDN
   - API routes are deployed as serverless functions

## Logs and Monitoring

### View Deployment Logs

```bash
# Using Vercel CLI
vercel logs

# In Vercel Dashboard
# Go to Deployments → Select deployment → Logs
```

### Application Logs

- Check `/api/health` for application status
- Monitor MongoDB connection status
- Review error boundary logs in browser console
- Use Vercel Analytics for performance metrics

## Rollback Procedure

If a deployment has issues:

```bash
# Using Vercel CLI
vercel deployments

# Promote a previous deployment to production
vercel promote [deployment-id]
```

## Performance Optimization

The application includes several optimizations for Vercel:

1. **Image Optimization**: Automatic WebP/AVIF conversion
2. **Code Splitting**: Automatic route-based splitting
3. **Database Connection Caching**: Reduces connection overhead
4. **SWC Minification**: Faster builds and smaller bundles
5. **Production Source Maps Disabled**: Smaller deployments

## Security Headers

API routes include security headers:

- `X-Content-Type-Options: nosniff` - Prevent MIME sniffing
- `X-Frame-Options: DENY` - Prevent clickjacking
- `X-XSS-Protection: 1; mode=block` - Enable XSS filtering
- `Referrer-Policy: strict-origin-when-cross-origin` - Control referrer leakage

## Troubleshooting

### Database Connection Fails on Deploy

1. Verify MONGODB_URI is set in environment variables
2. Check MongoDB Atlas network access list includes Vercel IPs
3. Ensure database credentials are correct
4. Check `/api/health` endpoint status

### JWT_SECRET Error

```
CRITICAL: JWT_SECRET is not defined
```

**Solution**: Set JWT_SECRET in Vercel environment variables

### Build Fails with TypeScript Errors

```bash
# Check for TypeScript errors
npx tsc --noEmit

# Review next.config.js - ignoreBuildErrors is disabled for production
```

## Maintenance

### Update Dependencies

```bash
npm update
# or
npm outdated  # Review updates
npm update [package-name]
```

### Database Migrations

For MongoDB schema changes:

1. Plan migration carefully
2. Backup production database
3. Test migration locally
4. Deploy application update
5. Run migration in production (if needed)

## Support

For issues or questions:
- Check `/api/health` endpoint status
- Review application error logs in Vercel dashboard
- Contact support: support@hostn.com

## References

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Mongoose Connection Pooling](https://mongoosejs.com/docs/connections.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8949)
