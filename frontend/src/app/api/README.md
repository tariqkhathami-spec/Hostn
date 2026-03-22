# Hostn Marketplace API Routes

This directory contains all Next.js API routes (using App Router) that serve the Hostn marketplace frontend with seed data. These routes eliminate the need for a separate backend during development.

## Architecture

- **Seed Data**: `/lib/data/seed-properties.ts` contains initial data for properties, users, bookings, and reviews
- **In-Memory Store**: Data mutations are stored in memory during the session (resets on server restart)
- **Auth Helpers**: `/lib/auth-helpers.ts` provides JWT token generation and verification
- **API Routes**: All routes follow Next.js App Router conventions with TypeScript

## Key Features

- Full CRUD operations for properties and bookings
- JWT authentication with simple token format (base64 encoded)
- Pricing calculation with discounts and fees
- Host dashboard statistics and analytics
- Review management and rating aggregation
- Property availability checking
- Wishlist management

## API Endpoints

### Properties

#### GET /api/properties
List properties with filtering and pagination.

**Query Parameters:**
- `city` (string): Filter by city
- `type` (string): Filter by property type (villa, apartment, chalet, etc.)
- `featured` (boolean): Show only featured properties
- `minPrice` (number): Minimum price per night
- `maxPrice` (number): Maximum price per night
- `guests` (number): Minimum guest capacity
- `sort` (string): Sort order - 'newest', 'price-low', 'price-high', 'rating'
- `limit` (number, max 100): Items per page (default: 10)
- `page` (number): Page number (default: 1)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 25,
    "page": 1,
    "pages": 3,
    "limit": 10
  }
}
```

#### GET /api/properties/cities
Get list of distinct cities with properties.

**Response:**
```json
{
  "success": true,
  "data": ["Riyadh", "Jeddah", "Dammam", "Taif"]
}
```

#### GET /api/properties/:id
Get details of a single property.

#### GET /api/properties/:id/availability
Check property availability for date range.

**Query Parameters:**
- `checkIn` (ISO string): Check-in date
- `checkOut` (ISO string): Check-out date

**Response:**
```json
{
  "success": true,
  "data": {
    "available": true,
    "propertyId": "prop_1",
    "checkIn": "2024-04-15",
    "checkOut": "2024-04-20"
  }
}
```

#### GET /api/properties/my-properties
Get all properties owned by authenticated host.

**Auth Required:** Yes (Bearer token)

---

### Authentication

#### POST /auth/register
Register a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "role": "guest" // or "host"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJ1c2VySWQ...",
  "data": { ... user object ... }
}
```

#### POST /auth/login
Authenticate user and get JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:** Same as register

#### GET /auth/me
Get authenticated user profile.

**Auth Required:** Yes

#### PUT /auth/profile
Update user profile.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "phone": "+9876543210",
  "avatar": "https://example.com/avatar.jpg"
}
```

**Auth Required:** Yes

#### POST /auth/wishlist/:propertyId
Toggle property in user's wishilst.

**Auth Required:** Yes

---

### Bookings

#### POST /api/bookings
Create a new booking.

**Request Body:**
```json
{
  "propertyId": "prop_1",
  "checkIn": "2024-04-15T15:00:00Z",
  "checkOut": "2024-04-20T11:00:00Z",
  "guests": {
    "adults": 2,
    "children": 1,
    "infants": 0
  },
  "specialRequests": "Early check-in if possible"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "booking_123",
    "property": { ... },
    "guest": { ... },
    "checkIn": "2024-04-15T15:00:00Z",
    "checkOut": "2024-04-20T11:00:00Z",
    "guests": { ... },
    "pricing": {
      "perNight": 450,
      "nights": 5,
      "subtotal": 2250,
      "cleaningFee": 80,
      "serviceFee": 230,
      "discount": 225,
      "total": 2335
    },
    "status": "pending",
    "paymentStatus": "unpaid",
    "createdAt": "2024-03-22T..."
  }
}
```

**Auth Required:** Yes

#### GET /api/bookings/my-bookings
Get all bookings for authenticated guest.

**Auth Required:** Yes

#### GET /api/bookings/host-bookings
Get all bookings received by host.

**Auth Required:** Yes

#### GET /api/bookings/:id
Get booking details.

#### PUT /api/bookings/:id/status
Update booking status.

**Request Body:**
```json
{
  "status": "confirmed" // "pending", "confirmed", "completed", "rejected", "cancelled"
}
```

**Auth Required:** Yes

---

### Reviews

#### GET /api/reviews/property/:propertyId
Get reviews for a property.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, max 100, default: 10)

**Response:**
```json
{
  "success": true,
  "data": [ ... review objects ... ],
  "pagination": { "total": 12, "page": 1, "pages": 2, "limit": 10 }
}
```

---

### Host Dashboard

#### GET /api/host/stats
Get dashboard statistics for host.

**Response:**
```json
{
  "success": true,
  "data": {
    "properties": {
      "total": 5,
      "active": 4,
      "inactive": 1
    },
    "bookings": {
      "total": 24,
      "pending": 2,
      "confirmed": 8,
      "completed": 12,
      "cancelled": 2
    },
    "earnings": {
      "total": 15420,
      "monthly": 3200
    },
    "reviews": {
      "total": 45,
      "averageRating": 4.7
    },
    "occupancyRate": 67
  }
}
```

**Auth Required:** Yes

#### GET /api/host/recent-bookings
Get recent bookings for host.

**Query Parameters:**
- `limit` (number, default: 5)

**Auth Required:** Yes

#### GET /api/host/notifications
Get notifications for host (pending bookings, new reviews).

**Auth Required:** Yes

#### GET /api/host/earnings
Get earnings data with monthly breakdown.

**Query Parameters:**
- `year` (number, default: current year)

**Auth Required:** Yes

#### GET /api/host/calendar/:propertyId
Get calendar data with bookings and blocked dates.

**Auth Required:** Yes

#### GET /api/host/reviews
Get all reviews for host's properties with summary stats.

**Query Parameters:**
- `page` (number)
- `limit` (number)

**Auth Required:** Yes

#### PUT /api/host/properties/:id/toggle
Toggle property active/inactive status.

**Auth Required:** Yes

---

## Authentication

### How JWT Works

Tokens are generated using base64 encoding (for development only - not production-safe):

```typescript
// Token payload
{
  userId: "host_1",
  email: "ahmed@example.com",
  role: "host",
  iat: 1711190400,
  exp: 1711795200
}

// Encoded as base64 in Authorization header
Authorization: Bearer <base64-encoded-payload>
```

### Using with Frontend

The frontend API client automatically:
1. Reads token from `localStorage.hostn_token`
2. Attaches it to all requests as `Authorization: Bearer <token>`
3. Removes token on 401 Unauthorized response

---

## Seed Data

The following seed data is available:

### Users (5 users)
- Ahmed Hassan (host_1)
- Fatima Ahmed (host_2)
- Mohammed Ali (guest_1)
- Layla Mohammed (guest_2)
- Admin User (admin_1)

### Properties (6 properties)
- Luxury Villa in Riyadh (featured)
- Modern Apartment Downtown
- Beachfront Chalet in Jeddah (featured)
- Cozy Studio in Dammam
- Mountain Farm Resort (featured)
- Desert Camp Experience

### Bookings (2 bookings)
- Booking by Mohammed at Ahmed's villa
- Booking by Layla at Fatima's chalet

### Reviews (2 reviews)
- 5-star review of villa by Mohammed
- 4-star review of apartment by Mohammed

---

## Development Tips

### Testing Authentication

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "role": "guest"
  }'

# Get token, then use for authenticated requests
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <your-token>"
```

### Quick Login Credentials

Use any of these email/password combinations (password validation is skipped for seed users):

- ahmed@example.com / any-password (host)
- fatima@example.com / any-password (host)
- mohammed@example.com / any-password (guest)
- layla@example.com / any-password (guest)

### Reset Data

Data persists in memory during server runtime. To reset, restart the Next.js dev server.

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "pages": 10,
    "limit": 10
  }
}
```

---

## Notes

- This is a development API using in-memory storage
- Data resets when the server restarts
- For production, replace with proper backend and database
- Password hashing is not implemented (base64 only)
- JWT tokens use simple base64 encoding (not cryptographically secure)
