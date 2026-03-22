# Seed Script - Mongoose Schema Compliance

This document verifies that the `seed.ts` script strictly adheres to all Mongoose model schemas defined in the Hostn project.

## User Model Compliance

**Schema**: `src/lib/models/User.ts`

✓ **Fields Created**:
- `name` (String, required, max 100 chars) - Arabic names provided
- `email` (String, required, unique, lowercase) - Valid emails: admin@hostn.sa, host1-3@hostn.sa, guest1-5@hostn.sa
- `password` (String, required, min 8 chars) - Admin123! (hashed with bcryptjs 12 rounds)
- `phone` (String, optional) - Realistic Saudi phone numbers with +966 prefix
- `avatar` (String, optional, default null) - Defaults to null
- `role` (String, enum: 'guest'|'host'|'admin') - 1 admin, 3 hosts, 5 guests
- `isVerified` (Boolean, default false) - Set to true for all test users
- `isBanned` (Boolean, default false) - Kept as false for all
- `isSuspended` (Boolean, default false) - Kept as false for all
- `wishlist` (Array of ObjectId refs to Property) - Empty array for test data
- `timestamps` (createdAt, updatedAt) - Automatically set by Mongoose

✓ **Password Hashing**:
- Uses bcryptjs (directly, not via model hook) with 12 salt rounds
- Matches schema pre-save hook for consistency
- `comparePassword()` method will work correctly

## Property Model Compliance

**Schema**: `src/lib/models/Property.ts`

✓ **Fields Created**:
- `host` (ObjectId, ref to User, required) - Links to created host users
- `title` (String, required, max 200) - Arabic property names with location
- `description` (String, required, max 5000) - Detailed Arabic descriptions
- `type` (String, enum: 'chalet'|'apartment'|'villa'|'studio'|'farm'|'camp'|'hotel', required) - Mix of 5 types
- `location.city` (String, required) - Riyadh, Jeddah, Makkah, Dammam
- `location.district` (String, optional) - Specific Saudi neighborhoods
- `location.address` (String, optional) - Formatted Arabic addresses
- `location.coordinates.lat/lng` (Number, optional) - Real coordinates with offset
- `images` (Array of objects):
  - `url` (String, required) - Placeholder URLs
  - `caption` (String, optional) - Arabic captions
  - `isPrimary` (Boolean, default false) - First image marked as primary
- `amenities` (Array of String enums) - Valid values from schema: wifi, parking, ac, kitchen, tv, garden, balcony, security
- `pricing`:
  - `perNight` (Number, required, min 0) - 150-400 SAR range
  - `cleaningFee` (Number, default 0) - 30-100 SAR
  - `discountPercent` (Number, default 0, 0-100) - Optional 0-20%
  - `weeklyDiscount` (Number, default 0, 0-100) - 0-15%
- `capacity`:
  - `maxGuests` (Number, required, min 1) - 2-8 guests
  - `bedrooms` (Number, default 1) - 1-4 bedrooms
  - `bathrooms` (Number, default 1) - 1-3 bathrooms
  - `beds` (Number, default 1) - 1-5 beds
- `rules`:
  - `checkInTime` (String, default '14:00') - Set to 14:00
  - `checkOutTime` (String, default '12:00') - Set to 12:00
  - `minNights` (Number, default 1) - Set to 1
  - `maxNights` (Number, default 30) - Set to 30
  - `smokingAllowed` (Boolean, default false) - Random true/false
  - `petsAllowed` (Boolean, default false) - Random true/false
  - `partiesAllowed` (Boolean, default false) - Always false
- `ratings`:
  - `average` (Number, default 0, min 0, max 10) - Calculated from reviews
  - `count` (Number, default 0) - Calculated from reviews
- `moderationStatus` (String, enum: 'pending'|'approved'|'rejected', default 'pending') - Set to 'approved'
- `moderatedBy` (ObjectId, ref to User, optional) - Set to admin user
- `moderatedAt` (Date, optional) - Set to 7 days ago
- `isActive` (Boolean, default true) - Set to true
- `isFeatured` (Boolean, default false) - Random true/false for 30% of properties
- `tags` (Array of String) - General tags: عائلي, هادئ, فاخر, قريب من المرافق
- `unavailableDates` (Array of {start, end}) - Empty array for test data
- `timestamps` (createdAt, updatedAt) - Automatically set

## Booking Model Compliance

**Schema**: `src/lib/models/Booking.ts`

✓ **Fields Created**:
- `property` (ObjectId, ref to Property, required) - Links to created properties
- `guest` (ObjectId, ref to User, required) - Links to guest users
- `checkIn` (Date, required) - Valid future/past dates
- `checkOut` (Date, required) - Always after checkIn (validated by pre-save hook)
- `guests`:
  - `adults` (Number, default 1, min 1) - 1-2 adults
  - `children` (Number, default 0, min 0) - 0-2 children
  - `infants` (Number, default 0, min 0) - Always 0
- `pricing`:
  - `perNight` (Number, required) - Matches property pricing
  - `nights` (Number, required) - Calculated from dates
  - `subtotal` (Number, required) - perNight × nights
  - `cleaningFee` (Number, default 0) - From property
  - `serviceFee` (Number, default 0) - 10% of subtotal
  - `discount` (Number, default 0) - Random 0-50
  - `total` (Number, required) - subtotal + cleaningFee + serviceFee - discount
- `status` (String, enum: 'pending'|'confirmed'|'cancelled'|'completed'|'rejected', default 'pending') - Varied statuses
- `paymentStatus` (String, enum: 'unpaid'|'paid'|'refunded', default 'unpaid') - Aligned with status
- `specialRequests` (String, optional, max 500) - Arabic requests for 40% of bookings
- `cancellationReason` (String, optional) - Set for cancelled bookings
- `confirmedAt` (Date, optional) - 48 hours before checkIn for non-pending
- `cancelledAt` (Date, optional) - 24 hours before checkIn for cancelled
- `timestamps` (createdAt, updatedAt) - Automatically set

✓ **Pre-save Validation**:
- checkOut > checkIn enforced by schema

## Review Model Compliance

**Schema**: `src/lib/models/Review.ts`

✓ **Fields Created**:
- `property` (ObjectId, ref to Property, required) - Links to properties
- `guest` (ObjectId, ref to User, required) - Links to guest users
- `booking` (ObjectId, ref to Booking, optional) - Links to related booking
- `ratings`:
  - `overall` (Number, required, min 1, max 10) - 7-10 range
  - `cleanliness` (Number, min 1, max 10) - 7-10
  - `accuracy` (Number, min 1, max 10) - 7-10
  - `communication` (Number, min 1, max 10) - 8-10
  - `location` (Number, min 1, max 10) - 7-10
  - `value` (Number, min 1, max 10) - 6-10
- `comment` (String, required, min 10, max 2000) - Arabic comments from predefined list
- `hostResponse`:
  - `comment` (String, optional) - Not included in seed data
  - `respondedAt` (Date, optional) - Not included in seed data
- `isVerified` (Boolean, default false) - Set to true
- `timestamps` (createdAt, updatedAt) - Automatically set

✓ **Post-save Hook**:
- Updates property ratings (average and count) after each review
- Script handles this by recalculating property ratings

✓ **Unique Index**:
- One review per property per guest enforced
- Script respects this by filtering completed bookings

## ActivityLog Model Compliance

**Schema**: `src/lib/models/ActivityLog.ts`

✓ **Fields Created**:
- `action` (String, required, enum list) - Uses: 'property_approved', 'property_created', 'system_action'
- `performedBy` (ObjectId, ref to User, required) - Admin or host users
- `targetType` (String, enum: 'user'|'property'|'booking'|'review'|'system', required) - Uses 'property' and 'system'
- `targetId` (String, optional) - Property IDs for approvals
- `details` (String, required) - Arabic descriptions of actions
- `timestamps` (createdAt, default auto-set) - Automatically set

## Index Compatibility

All indices defined in models are fully compatible:
- User: role, isBanned
- Property: city, type, pricing, ratings, featured, status, host, text search
- Booking: property+status, guest+status, property+dates, createdAt
- Review: property+guest (unique), property+createdAt
- ActivityLog: createdAt, action, performedBy

## Validation Summary

✓ All required fields populated
✓ All enums use valid values
✓ All number ranges respected
✓ All string length constraints met
✓ All references (ObjectId) point to created documents
✓ All timestamp fields auto-managed
✓ Password hashing matches schema expectations
✓ No fields exceed their constraints
✓ Computed fields (ratings) properly calculated
✓ Unique constraints respected

## Data Quality Notes

1. **Arabic Text**: All names, descriptions, addresses, and comments use proper Arabic
2. **Saudi Context**:
   - Phone numbers use +966 country code
   - Cities and neighborhoods are real Saudi locations
   - Timestamps use current date for consistency
   - Property pricing in SAR currency
3. **Referential Integrity**: All foreign keys reference created documents
4. **Type Safety**: TypeScript interfaces match schema exactly
