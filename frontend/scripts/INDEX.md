# Hostn Scripts Directory

This directory contains utility scripts for the Hostn project database and testing.

## Files Overview

### `seed.ts` (Main Script)
**Purpose**: Production-quality MongoDB seeding script

The complete TypeScript script that:
- Connects to MongoDB using `MONGODB_URI` environment variable
- Prompts for confirmation before clearing data
- Creates realistic test data for all models
- Includes comprehensive error handling
- Provides detailed summary output

**Usage**:
```bash
npx tsx scripts/seed.ts
```

**Creates**:
- 9 users (1 admin, 3 hosts, 5 guests)
- 10 properties across 4 Saudi cities
- 10-15 bookings with varied statuses
- 5-8 reviews with ratings
- Activity log entries

---

## Documentation Files

### `README.md` (Comprehensive Guide)
Complete documentation for the seed script including:
- Overview of what data is created
- Prerequisites and setup instructions
- Step-by-step usage guide
- Test credentials for all user types
- Data characteristics and distribution
- Safety features explanation
- Customization guide for extending the script
- Troubleshooting section
- Database reset instructions

**Read this for**: Full understanding and detailed troubleshooting

---

### `QUICK_REFERENCE.md` (Fast Start)
One-page reference for quick access to:
- One-minute setup steps
- All test credentials in table format
- Summary of created data
- Common issues and solutions
- Saudi Arabian city and neighborhood list
- Property types and booking statuses
- Review rating information

**Read this for**: Quick lookup and fast setup

---

### `SCHEMA_COMPLIANCE.md` (Technical Reference)
Detailed verification document showing:
- Complete field-by-field schema compliance
- Validation rules enforcement
- Index compatibility
- Data constraints adherence
- TypeScript interface matching
- Foreign key integrity
- Sample data ranges and types

**Read this for**: Technical verification and integration

---

### `INDEX.md` (This File)
Navigation guide for the scripts directory.

---

## Quick Start

1. **First time setup?** → Read `README.md`
2. **Need fast credentials?** → Check `QUICK_REFERENCE.md`
3. **Just run it!**:
   ```bash
   npx tsx scripts/seed.ts
   ```
4. **Login with**: `admin@hostn.sa` / `Admin123!`

---

## File Structure

```
scripts/
├── seed.ts                 # Main seeding script (498 lines)
├── README.md              # Comprehensive documentation
├── QUICK_REFERENCE.md     # One-page quick start
├── SCHEMA_COMPLIANCE.md   # Technical schema verification
└── INDEX.md              # This navigation file
```

---

## Dependencies

The script requires these dependencies (automatically installed via npm):

**Runtime**:
- `mongoose` (already in project)
- `bcryptjs` (already in project)
- `dotenv` (added to devDependencies)

**Tools**:
- `tsx` (added to devDependencies) - TypeScript execution

**Installation**:
```bash
npm install
```

---

## Environment Setup

Create `.env.local` in project root:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/hostn

# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/hostn
```

---

## Database Reset

To completely reset and reseed:

```bash
npx tsx scripts/seed.ts
# Type: yes when prompted
```

This will:
1. Clear all existing data from all collections
2. Create fresh test data
3. Display creation summary

---

## Data Characteristics

### User Distribution
- **1 Admin**: Full system access
- **3 Hosts**: Property managers with Arabic names
- **5 Guests**: Regular users with Arabic names

### Property Distribution
- **Riyadh**: 3 properties
- **Jeddah**: 3 properties
- **Makkah**: 2 properties
- **Dammam**: 2 properties
- **Total**: 10 properties

### Property Types
- Villas (فيلا)
- Apartments (شقة)
- Chalets (شاليه)
- Studios (أستوديو)
- Farms (مزرعة)

### Booking Statuses
- Pending (awaiting confirmation)
- Confirmed (approved)
- Completed (stayed and checked out)
- Cancelled (cancelled by guest/host)

### Review Ratings
All positive (7-10 out of 10) across:
- Overall rating
- Cleanliness
- Accuracy
- Communication
- Location
- Value for money

---

## Common Commands

```bash
# Install dependencies
npm install

# Run seed script
npx tsx scripts/seed.ts

# Run with specific environment
MONGODB_URI=mongodb://localhost:27017/hostn npx tsx scripts/seed.ts

# Check script syntax
npx tsx --check scripts/seed.ts
```

---

## Troubleshooting Quick Links

**Issue**: MONGODB_URI not set
- **Solution**: Create `.env.local` with `MONGODB_URI=...`

**Issue**: Cannot find module 'tsx'
- **Solution**: Run `npm install`

**Issue**: MongoDB connection fails
- **Solution**: Check MongoDB is running or Atlas is accessible

**Issue**: Script seems stuck
- **Solution**: Confirmation prompt may be waiting - type `yes` or `no`

For more detailed troubleshooting, see `README.md` Troubleshooting section.

---

## Development Notes

### Script Architecture
- **Type-safe**: Full TypeScript with interfaces
- **Error handling**: Comprehensive try-catch with descriptive messages
- **User confirmation**: Safety prompt before data destruction
- **Progress feedback**: Console output at each step
- **Cleanup**: Proper MongoDB disconnection

### Model Compatibility
- Uses direct Mongoose imports (not serverless db.ts)
- Respects all schema validations
- Implements pre-save hooks correctly
- Maintains referential integrity
- Updates computed fields (ratings)

### Data Realism
- Arabic names and text
- Saudi Arabian locations and neighborhoods
- Realistic pricing in SAR
- Valid phone numbers with +966 prefix
- Distributed dates for bookings
- Realistic review comments

---

## Support & Updates

For issues or feature requests:
1. Check the relevant documentation file
2. Review schema compliance in `SCHEMA_COMPLIANCE.md`
3. Verify environment setup in `README.md`
4. Check quick reference in `QUICK_REFERENCE.md`

---

**Last Updated**: March 2026
**Status**: Production-ready
**Version**: 1.0.0
