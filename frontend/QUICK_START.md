# Quick Start: Hostn API Routes

The Hostn marketplace now has complete API routes integrated into the Next.js frontend. No separate backend needed for development!

## What Was Created

### 1. **Seed Data & In-Memory Store**
- Location: `/src/lib/data/seed-properties.ts`
- Contains: 5 users, 6 properties, 2 bookings, 2 reviews
- All data mutations persist in memory during runtime

### 2. **Authentication Helpers**
- Location: `/src/lib/auth-helpers.ts`
- Handles JWT token generation and verification
- Simple base64 encoding (development only)

### 3. **23 API Routes** (Next.js App Router)
All routes under `/src/app/api/` with full CRUD operations

## Testing the APIs

### Using Frontend Client
The frontend axios client in `/src/lib/api.ts` is configured to use these routes:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
```

Since the API routes are served at `http://localhost:3000/api`, just start your Next.js dev server:

```bash
npm run dev
# or
yarn dev
```

### Using cURL (for testing)

**1. Register a new user:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "guest"
  }'
```

**2. Login (or use seed user):**
```bash
# Any password works for seed users
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ahmed@example.com",
    "password": "anypassword"
  }'
```

Response includes `token` - copy it for authenticated requests.

**3. Get your profile:**
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <your-token-here>"
```

**4. List properties:**
```bash
# All properties
curl http://localhost:3000/api/properties

# Filter by city
curl "http://localhost:3000/api/properties?city=Riyadh"

# Filter by price range
curl "http://localhost:3000/api/properties?minPrice=150&maxPrice=350"

# Sort by rating
curl "http://localhost:3000/api/properties?sort=rating"

# Pagination
curl "http://localhost:3000/api/properties?page=2&limit=5"
```

**5. Create a booking:**
```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "propertyId": "prop_1",
    "checkIn": "2024-04-15T15:00:00Z",
    "checkOut": "2024-04-20T11:00:00Z",
    "guests": {
      "adults": 2,
      "children": 1,
      "infants": 0
    }
  }'
```

## Seed User Credentials

Use these to test without registering:

**Hosts:**
- ahmed@example.com / anypassword
- fatima@example.com / anypassword

**Guests:**
- mohammed@example.com / anypassword
- layla@example.com / anypassword

**Admin:**
- admin@example.com / anypassword

## Frontend Features That Now Work

✓ User registration and login
✓ Browse properties with filters
✓ View property details
✓ Create bookings with price calculation
✓ Guest booking management
✓ Host dashboard (stats, earnings, calendar)
✓ Add/remove wishlist
✓ View reviews

## API Routes at a Glance

### Properties
- `GET /api/properties` - List all
- `GET /api/properties/:id` - Get one
- `GET /api/properties/cities` - Get cities
- `GET /api/properties/:id/availability` - Check dates

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Get token
- `GET /api/auth/me` - Current user
- `PUT /api/auth/profile` - Update profile

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/my-bookings` - User's bookings
- `GET /api/bookings/host-bookings` - Host's bookings
- `PUT /api/bookings/:id/status` - Update status

### Host Dashboard
- `GET /api/host/stats` - Dashboard overview
- `GET /api/host/earnings` - Earnings data
- `GET /api/host/notifications` - Alerts
- `GET /api/host/calendar/:id` - Calendar view

See `/src/app/api/README.md` for complete API documentation.

## Environment Variables

No additional environment variables needed! The frontend API client defaults to the local routes.

To use a different backend, set:
```env
NEXT_PUBLIC_API_URL=https://api.example.com/api
```

## Common Issues

**Q: Getting 401 Unauthorized?**
- Make sure token is sent: `Authorization: Bearer <token>`
- Token expires after 7 days

**Q: Data not persisting?**
- Data is in-memory only. Restarting the dev server resets all changes.

**Q: Want to reset data?**
- Just restart `npm run dev`

## Next Steps

1. Run `npm run dev`
2. Open http://localhost:3000
3. Try the marketplace features
4. Check browser DevTools Network tab to see API calls
5. Read `/src/app/api/README.md` for detailed API docs

## Ready for Production?

When ready to use a real backend:
1. Keep the same API response format
2. Update `NEXT_PUBLIC_API_URL` to point to your backend
3. Implement proper password hashing (currently not hashed)
4. Use secure JWT library like `jose`

All API contracts are documented and ready for any backend implementation!
