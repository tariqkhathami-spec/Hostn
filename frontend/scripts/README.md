# Hostn Database Seeding Script

This directory contains database seeding utilities for the Hostn project.

## Overview

The `seed.ts` script populates your MongoDB database with production-quality test data including:

- **1 Admin User** - System administrator with full access
- **3 Host Users** - Property owners with Arabic names
- **5 Guest Users** - Travelers with Arabic names
- **8-10 Properties** - Realistic Saudi Arabian properties across Riyadh, Jeddah, Makkah, and Dammam
- **10-15 Bookings** - Various statuses (pending, confirmed, completed, cancelled)
- **5-8 Reviews** - With realistic ratings and Arabic comments
- **Activity Logs** - Admin and system actions

## Prerequisites

1. **MongoDB Connection**: You need a running MongoDB instance and a `MONGODB_URI` in your `.env.local` file
2. **Node.js**: v18 or higher
3. **Dependencies**: Run `npm install` to install required packages

## Setup

### 1. Environment Configuration

Create or update `.env.local` in the project root:

```bash
MONGODB_URI=mongodb://localhost:27017/hostn
# or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hostn
```

### 2. Install Dependencies

```bash
npm install
```

This will install `dotenv` and `tsx` which are required for running the seed script.

## Usage

### Run the Seed Script

```bash
npx tsx scripts/seed.ts
```

The script will:
1. Connect to MongoDB
2. Prompt you to confirm clearing existing data
3. Create all test data
4. Display a summary of created data

### Example Output

```
========================================
   Hostn MongoDB Seeding Script
========================================

⚠️  This will clear all existing data and seed fresh test data.
Do you want to continue? (yes/no): yes

Starting database seeding...

✓ Connected to MongoDB
✓ Database cleared
✓ Created 9 users (1 admin, 3 hosts, 5 guests)
✓ Created 10 properties across Saudi Arabia
✓ Created 13 bookings with various statuses
✓ Created 7 reviews with property ratings updated
✓ Created 4 activity log entries

========================================
   Seeding Summary
========================================

✓ Admin User: admin@hostn.sa (password: Admin123!)
✓ Host Users: 3 users
✓ Guest Users: 5 users
  (All users share password: Admin123!)

✓ Total Data Created:
  - 9 users
  - 10 properties
  - 13 bookings
  - 7 reviews
  - 4 activity logs

========================================

✓ Database seeding completed successfully!
✓ You can now run the application and login with the test credentials.

Database connection closed.
```

## Test Credentials

After running the seed script, use these credentials to login:

### Admin Account
- **Email**: `admin@hostn.sa`
- **Password**: `Admin123!`

### Host Accounts
- **Email**: `host1@hostn.sa`, `host2@hostn.sa`, `host3@hostn.sa`
- **Password**: `Admin123!` (same for all)

### Guest Accounts
- **Email**: `guest1@hostn.sa` through `guest5@hostn.sa`
- **Password**: `Admin123!` (same for all)

## Data Characteristics

### Properties

All properties are created with:
- **Location**: Real Saudi Arabian cities and neighborhoods
  - الرياض (Riyadh): Al-Olaya, An-Nakheel, etc.
  - جدة (Jeddah): Al-Balad, Al-Rawdah, etc.
  - مكة المكرمة (Makkah): Al-Muzammiaz, Al-Qura, etc.
  - الدمام (Dammam): Ad-Dafina, Al-Noor, etc.
- **Types**: Mix of villas, apartments, chalets, studios, and farms
- **Descriptions**: Realistic Arabic descriptions of properties
- **Amenities**: WiFi, parking, AC, kitchen, garden, balcony, security, etc.
- **Pricing**: Realistic per-night rates (SAR 150-400) with optional cleaning fees
- **Status**: All set to `moderationStatus: 'approved'`

### Bookings

Bookings are created with:
- **Various statuses**: pending, confirmed, completed, cancelled
- **Payment statuses**: Corresponding to booking status
- **Realistic dates**: Mix of past and future bookings
- **Guest counts**: 1-3 adults, optional children
- **Pricing breakdown**: Per-night, cleaning fee, service fee (10%), and discounts

### Reviews

Reviews feature:
- **5-8 reviews** from completed bookings
- **Ratings**: 7-10 (positive reviews for test data)
- **Categories**: Cleanliness, accuracy, communication, location, value
- **Comments**: Realistic Arabic feedback
- **Property ratings**: Automatically calculated and updated

### Activity Logs

Logs include:
- Admin property approvals
- Host property creations
- System seed action entry

## Safety Features

1. **Confirmation Prompt**: The script requires explicit user confirmation before clearing data
2. **No Cleanup on Cancel**: If you answer "no" to the confirmation, the database remains unchanged
3. **Error Handling**: Comprehensive error handling with helpful error messages
4. **Connection Management**: Properly closes database connection after completion

## Customization

To customize the seed data, edit the following constants in `seed.ts`:

- `arabicNames.hosts` - Host user data
- `arabicNames.guests` - Guest user data
- `saudiCities` - Cities, districts, and coordinates
- `propertyDescriptions` - Property type descriptions (Arabic)
- `reviewComments` - Review text options (Arabic)
- `amenitiesList` - Available amenities

## Troubleshooting

### Error: "MONGODB_URI environment variable is not set"

Make sure you have created `.env.local` with the `MONGODB_URI` variable set.

### Error: "Failed to connect to MongoDB"

1. Verify MongoDB is running
2. Check your `MONGODB_URI` is correct
3. For MongoDB Atlas, ensure your IP is whitelisted

### Error: "Cannot find module 'tsx'"

Run `npm install` to install the required dependencies.

### Port Already in Use (development)

If running a local MongoDB:
```bash
# On macOS/Linux
mongod --port 27017

# On Windows (if installed)
mongod.exe --port 27017
```

## Database Reset

To reset your database and re-seed:

```bash
npx tsx scripts/seed.ts
# When prompted, type: yes
```

The script will delete all existing data and populate fresh test data.

## Notes

- All passwords are hashed using bcryptjs with 12 salt rounds
- The script uses Mongoose models directly (not the serverless db.ts helper)
- Generated data is realistic for Saudi Arabia (currency: SAR, cities: الرياض, جدة, etc.)
- Property images use placeholder URLs; replace with real images in production
- The script is idempotent - running it multiple times will clear and re-seed with fresh data

## Support

For issues or questions about the seed script, check:
1. `.env.local` configuration
2. MongoDB connection status
3. Console output for specific error messages
