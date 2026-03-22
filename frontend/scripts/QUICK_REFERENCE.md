# Seed Script - Quick Reference

## One-Minute Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local (if not exists)
# Add: MONGODB_URI=mongodb://localhost:27017/hostn

# 3. Run seed script
npx tsx scripts/seed.ts

# 4. When prompted, type: yes
```

## Test Credentials

All users share the same password: **Admin123!**

| Role | Email | Access |
|------|-------|--------|
| Admin | admin@hostn.sa | Full system access |
| Host 1 | host1@hostn.sa | Property management |
| Host 2 | host2@hostn.sa | Property management |
| Host 3 | host3@hostn.sa | Property management |
| Guest 1 | guest1@hostn.sa | Booking & reviews |
| Guest 2 | guest2@hostn.sa | Booking & reviews |
| Guest 3 | guest3@hostn.sa | Booking & reviews |
| Guest 4 | guest4@hostn.sa | Booking & reviews |
| Guest 5 | guest5@hostn.sa | Booking & reviews |

## What Gets Created

✓ **9 Users** - 1 admin, 3 hosts, 5 guests with Arabic names
✓ **10 Properties** - Across 4 Saudi cities with realistic data
✓ **13 Bookings** - Various statuses (pending/confirmed/completed/cancelled)
✓ **7 Reviews** - With ratings (7-10) and Arabic comments
✓ **4 Activity Logs** - Admin approvals and system actions

## Common Issues

**Q: Script fails to connect to MongoDB**
- Check `.env.local` has correct `MONGODB_URI`
- Verify MongoDB is running locally or Atlas is accessible

**Q: "Cannot find module 'tsx'"**
- Run: `npm install`

**Q: Want to re-seed fresh data?**
- Run: `npx tsx scripts/seed.ts` and answer `yes`
- All old data will be deleted and replaced

## Data Locations

Properties are distributed across:
- **الرياض (Riyadh)** - 3 properties
- **جدة (Jeddah)** - 3 properties
- **مكة المكرمة (Makkah)** - 2 properties
- **الدمام (Dammam)** - 2 properties

## Real Neighborhoods (Arabic)

### Riyadh
- العليا (Al-Olaya)
- النرجس (An-Nakheel)
- الربيع (Ar-Rabee)
- السليمانية (As-Sulaymanieh)

### Jeddah
- الشاطئ (Al-Balad)
- الروضة (Ar-Rawdah)
- الأندلس (Al-Andalus)
- الحمراء (Al-Hamra)

### Makkah
- المزاميع (Al-Muzammiaz)
- القرى (Al-Qura)
- الشوقية (Ash-Shawqiyya)

### Dammam
- الدفينة (Ad-Dafina)
- العنود (Al-Anowd)
- الشرقية (Ash-Sharqiya)

## Property Types in Database

- villa (فيلا)
- apartment (شقة)
- chalet (شاليه)
- studio (أستوديو)
- farm (مزرعة)

## Booking Statuses

- **pending** - Awaiting host confirmation
- **confirmed** - Approved by host
- **completed** - Guest stayed and checked out
- **cancelled** - Booking was cancelled

## Review Ratings

All reviews are positive (7-10 out of 10) on:
- Overall rating
- Cleanliness
- Accuracy
- Communication
- Location
- Value for money

## Notes

- All passwords are bcrypt-hashed (12 rounds)
- Generated data is realistic for Saudi Arabia
- Property images use placeholder URLs
- Safe to run multiple times (clears old data each run)
- Requires confirmation before clearing database
