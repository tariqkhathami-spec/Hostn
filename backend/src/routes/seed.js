const express = require('express');
const router = express.Router();
const Guest = require('../models/Guest');
const Host = require('../models/Host');
const Admin = require('../models/Admin');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Payout = require('../models/Payout');
const HostInvoice = require('../models/HostInvoice');
const HostStatement = require('../models/HostStatement');
const HostBankAccount = require('../models/HostBankAccount');

const SEED_SECRET = 'hostn_seed_2026_x';

// Temporary seed endpoint - POST /api/v1/seed/host-data
// Protected by a simple secret key
router.post('/host-data', async (req, res) => {
  try {
    const { secret } = req.body;
    if (secret !== 'hostn_seed_2026_x') {
      return res.status(403).json({ success: false, message: 'Invalid secret' });
    }

    const results = { users: [], properties: [], bookings: [], reviews: [] };

    // ── 1. Setup Host User (in Host collection) ─────────────────────────
    let hostUser = await Host.findOne({ phone: '500407888' });
    if (!hostUser) {
      hostUser = await Host.create({
        name: 'طارق الخثعمي',
        phone: '500407888',
        phoneVerified: true,
        isVerified: true,
      });
      results.users.push({ action: 'created', id: hostUser._id, role: 'host' });
    } else {
      hostUser.name = 'طارق الخثعمي';
      hostUser.isVerified = true;
      await hostUser.save();
      results.users.push({ action: 'updated', id: hostUser._id, role: 'host' });
    }

    // ── 2. Setup Guest Users (in Guest collection) ──────────────────────
    let guestUser = await Guest.findOne({ phone: '501234567' });
    if (!guestUser) {
      guestUser = await Guest.create({
        name: 'محمد الرمل',
        phone: '501234567',
        phoneVerified: true,
        isVerified: true,
      });
      results.users.push({ action: 'created', id: guestUser._id, name: 'محمد الرمل' });
    }

    let guestUser2 = await Guest.findOne({ phone: '509876543' });
    if (!guestUser2) {
      guestUser2 = await Guest.create({
        name: 'سعود الحربي',
        phone: '509876543',
        phoneVerified: true,
        isVerified: true,
      });
      results.users.push({ action: 'created', id: guestUser2._id, name: 'سعود الحربي' });
    }

    // ── 3. Create 8 Mivara Chalets ──────────────────────────────────────
    const existingProps = await Property.find({ host: hostUser._id });
    if (existingProps.length >= 8) {
      results.properties = existingProps.map(p => ({ id: p._id, title: p.title, status: 'already_exists' }));
    } else {
      if (existingProps.length > 0) {
        await Property.deleteMany({ host: hostUser._id });
        await Booking.deleteMany({ property: { $in: existingProps.map(p => p._id) } });
      }

      const baseProperty = {
        host: hostUser._id,
        type: 'chalet',
        location: {
          city: 'الدمام',
          district: 'سيهات',
          address: 'العروبة',
          coordinates: { lat: 26.4753, lng: 50.0497 },
        },
        amenities: ['wifi', 'pool', 'parking', 'ac', 'kitchen', 'tv', 'bbq', 'garden'],
        capacity: { maxGuests: 10, bedrooms: 2, bathrooms: 2, beds: 4 },
        rules: { checkInTime: '16:00', checkOutTime: '14:00', minNights: 1, maxNights: 14 },
        isActive: true,
        isFeatured: true,
        tags: ['شاليهات ميفارا', 'mivara'],
      };

      const prices = [
        { perNight: 880, cleaningFee: 50, discountPercent: 0 },
        { perNight: 920, cleaningFee: 50, discountPercent: 5 },
        { perNight: 850, cleaningFee: 50, discountPercent: 0 },
        { perNight: 1025, cleaningFee: 75, discountPercent: 10 },
        { perNight: 780, cleaningFee: 50, discountPercent: 0 },
        { perNight: 950, cleaningFee: 60, discountPercent: 0 },
        { perNight: 1150, cleaningFee: 100, discountPercent: 15 },
        { perNight: 800, cleaningFee: 50, discountPercent: 0 },
      ];

      const units = [];
      for (let i = 0; i < 8; i++) {
        const unitCode = `4493${i + 1}`;
        const prop = await Property.create({
          ...baseProperty,
          title: `شالية ميفارا (${i + 1}) Mivara`,
          description: `شالية فاخر ضمن منتجع ميفارا في الدمام. الوحدة رقم ${i + 1} (كود ${unitCode}). يتميز بمسبح خاص وحديقة وجلسات خارجية. مناسب للعائلات.`,
          pricing: prices[i],
          images: [
            { url: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800', isPrimary: true },
            { url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800', isPrimary: false },
          ],
          ratings: { average: 8.5 + (i % 3) * 0.5, count: 10 + i * 3 },
        });
        units.push(prop);
        results.properties.push({ id: prop._id, title: prop.title });
      }

      // ── 4. Create Sample Bookings ──────────────────────────────────────
      const now = new Date();
      const bookingDefs = [
        { propIdx: 0, guest: guestUser._id, dayOffset: [-10, -8], status: 'completed', pay: 'paid', price: 880 },
        { propIdx: 1, guest: guestUser2._id, dayOffset: [-1, 2], status: 'confirmed', pay: 'paid', price: 920 },
        { propIdx: 2, guest: guestUser._id, dayOffset: [3, 5], status: 'pending', pay: 'unpaid', price: 850 },
        { propIdx: 4, guest: guestUser2._id, dayOffset: [5, 8], status: 'confirmed', pay: 'paid', price: 780 },
        { propIdx: 3, guest: guestUser._id, dayOffset: [1, 3], status: 'cancelled', pay: 'refunded', price: 1025 },
        { propIdx: 0, guest: guestUser2._id, dayOffset: [10, 12], status: 'confirmed', pay: 'paid', price: 880 },
        { propIdx: 5, guest: guestUser._id, dayOffset: [14, 17], status: 'confirmed', pay: 'paid', price: 950 },
        { propIdx: 6, guest: guestUser2._id, dayOffset: [-5, -3], status: 'completed', pay: 'paid', price: 1150 },
      ];

      for (const bd of bookingDefs) {
        const nights = bd.dayOffset[1] - bd.dayOffset[0];
        const subtotal = bd.price * nights;
        const booking = await Booking.create({
          property: units[bd.propIdx]._id,
          guest: bd.guest,
          checkIn: new Date(now.getFullYear(), now.getMonth(), now.getDate() + bd.dayOffset[0]),
          checkOut: new Date(now.getFullYear(), now.getMonth(), now.getDate() + bd.dayOffset[1]),
          guests: { adults: 2, children: 0, infants: 0 },
          status: bd.status,
          paymentStatus: bd.pay,
          pricing: (() => {
            const cleaningFee = 50;
            const serviceFee = Math.round(subtotal * 0.1);
            const discount = 0;
            const taxableAmount = subtotal + cleaningFee + serviceFee - discount;
            const vat = Math.round(taxableAmount * 0.15);
            return {
              perNight: bd.price, nights, subtotal, cleaningFee, serviceFee, discount, vat,
              total: taxableAmount + vat,
            };
          })(),
        });
        results.bookings.push({ id: booking._id, status: bd.status, property: units[bd.propIdx].title });
      }

      // ── 5. Create Sample Reviews ────────────────────────────────────────
      const completedBookings = await Booking.find({ status: 'completed' });
      if (completedBookings.length > 0) {
        try {
          const review = await Review.create({
            property: completedBookings[0].property,
            guest: completedBookings[0].guest,
            booking: completedBookings[0]._id,
            ratings: { overall: 9, cleanliness: 9, accuracy: 9, communication: 10, location: 8, value: 9, checkIn: 9 },
            comment: 'شالية ممتاز جداً، نظيف ومرتب. المسبح رائع.',
          });
          results.reviews.push({ id: review._id });
        } catch (e) {
          results.reviews.push({ error: e.message });
        }
      }
    }

    res.json({
      success: true,
      message: 'Host data seeded successfully',
      data: results,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, stack: error.stack });
  }
});

// Temporary seed endpoint - POST /api/v1/seed/finance-data
// Protected by the same shared secret. Idempotent: seeds 3 Remittances,
// 3 Invoices, and 3 Statements for the demo host (phone 500407888).
//
// Safe to re-run — existing records for the demo host are wiped first so
// counters stay consistent. (In production we would not wipe; this is a
// dev-time helper only.)
router.post('/finance-data', async (req, res) => {
  try {
    const { secret } = req.body;
    if (secret !== SEED_SECRET) {
      return res.status(403).json({ success: false, message: 'Invalid secret' });
    }

    const hostUser = await Host.findOne({ phone: '500407888' });
    if (!hostUser) {
      return res.status(404).json({
        success: false,
        message: 'Demo host not found. Seed /host-data first.',
      });
    }

    const results = { payouts: [], invoices: [], statements: [], bankAccount: null };

    // ── 1. Bank account (needed as ref on Payout) ────────────────────
    let bankAccount = await HostBankAccount.findOne({ host: hostUser._id });
    if (!bankAccount) {
      bankAccount = await HostBankAccount.create({
        host: hostUser._id,
        bankName: 'Al Rajhi Bank',
        bankNameAr: 'مصرف الراجحي',
        iban: 'SA0380000000608010167519',
        accountHolder: hostUser.name || 'طارق الخثعمي',
        isVerified: true,
        transferDuration: { type: 'after_departure', hours: 48 },
      });
      results.bankAccount = { action: 'created', id: bankAccount._id };
    } else {
      results.bankAccount = { action: 'existing', id: bankAccount._id };
    }

    // Wipe prior finance records for this host so re-running is clean.
    // NOTE: this does not reset the Counter sequences, so numbers keep
    // climbing across runs. Acceptable for a dev seed helper.
    await Promise.all([
      Payout.deleteMany({ host: hostUser._id }),
      HostInvoice.deleteMany({ host: hostUser._id }),
      HostStatement.deleteMany({ host: hostUser._id }),
    ]);

    // Pull a few of this host's recent bookings to attach to payouts/invoices.
    const hostProps = await Property.find({ host: hostUser._id }).select('_id');
    const propIds = hostProps.map((p) => p._id);
    const hostBookings = await Booking.find({
      property: { $in: propIds },
      status: { $in: ['confirmed', 'completed'] },
    })
      .sort('-createdAt')
      .limit(9)
      .select('_id pricing.total checkIn checkOut');

    // Split bookings into 3 groups of up to 3 each so every payout/invoice
    // gets a realistic-looking set of references.
    const bookingChunks = [
      hostBookings.slice(0, 3).map((b) => b._id),
      hostBookings.slice(3, 6).map((b) => b._id),
      hostBookings.slice(6, 9).map((b) => b._id),
    ];

    // Sum of booking totals per chunk — used as the gross amount base.
    const chunkGross = hostBookings
      .reduce((acc, b, idx) => {
        const group = Math.floor(idx / 3);
        acc[group] = (acc[group] || 0) + (b.pricing?.total || 0);
        return acc;
      }, [0, 0, 0])
      .map((v) => Math.round(v));

    const now = new Date();
    const monthStart = (offset) => new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const monthEnd = (offset) => new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59);

    // ── 2. Three Payouts (Remittances) ───────────────────────────────
    // One executed (past month), one processing (mid), one upcoming (current).
    const payoutDefs = [
      {
        status: 'executed',
        periodOffset: -2,
        executedAt: new Date(now.getFullYear(), now.getMonth() - 1, 5),
        gross: Math.max(chunkGross[0], 6200),
        bookings: bookingChunks[0],
      },
      {
        status: 'processing',
        periodOffset: -1,
        gross: Math.max(chunkGross[1], 4800),
        bookings: bookingChunks[1],
      },
      {
        status: 'upcoming',
        periodOffset: 0,
        gross: Math.max(chunkGross[2], 3200),
        bookings: bookingChunks[2],
      },
    ];

    const commissionRate = 0.10; // 10% platform fee
    const vatRate = 0.15;        // 15% VAT on commission

    const payouts = [];
    for (const def of payoutDefs) {
      const gross = def.gross;
      const platformFee = Math.round(gross * commissionRate);
      const vat = Math.round(platformFee * vatRate);
      const net = gross - platformFee - vat;

      const payout = await Payout.create({
        host: hostUser._id,
        bankAccount: bankAccount._id,
        bookings: def.bookings,
        amount: net,
        iban: bankAccount.iban,
        bankName: bankAccount.bankName,
        status: def.status,
        executedAt: def.executedAt,
        periodStart: monthStart(def.periodOffset),
        periodEnd: monthEnd(def.periodOffset),
        breakdown: {
          grossAmount: gross,
          platformFee,
          vat,
          netAmount: net,
        },
      });
      payouts.push(payout);
      results.payouts.push({
        id: payout._id,
        payoutNumber: payout.payoutNumber,
        status: payout.status,
        net,
      });
    }

    // ── 3. Three HostInvoices (one per payout, monthly) ──────────────
    const invoices = [];
    for (let i = 0; i < payoutDefs.length; i++) {
      const def = payoutDefs[i];
      const payout = payouts[i];
      const gross = def.gross;
      const commission = Math.round(gross * commissionRate);
      const vat = Math.round(commission * vatRate);
      const total = commission + vat;

      const invoice = await HostInvoice.create({
        host: hostUser._id,
        payout: payout._id,
        bookings: def.bookings,
        amount: total,
        breakdown: {
          commissionRate: Math.round(commissionRate * 100), // store as percent
          grossBookings: gross,
          commission,
          vat,
          total,
        },
        periodStart: monthStart(def.periodOffset),
        periodEnd: monthEnd(def.periodOffset),
        // Past invoices are paid; current month is still issued.
        status: def.status === 'executed' ? 'paid' : 'issued',
        issuedAt: monthEnd(def.periodOffset),
      });
      invoices.push(invoice);
      results.invoices.push({
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        total,
      });
    }

    // ── 4. Three HostStatements (monthly ledger) ─────────────────────
    // Walk forward through each month, building ledger entries that mirror
    // what a real statement would look like: booking earnings as credits,
    // payouts as debits, running balance.
    let runningBalance = 0;
    for (let i = 0; i < 3; i++) {
      const def = payoutDefs[i];
      const year = monthStart(def.periodOffset).getFullYear();
      const month = monthStart(def.periodOffset).getMonth() + 1;
      const openingBalance = runningBalance;

      const entries = [];
      let totalCredits = 0;
      let totalDebits = 0;

      // Booking earning entries — spread across the month
      const chunkBookings = hostBookings.slice(i * 3, i * 3 + 3);
      for (let j = 0; j < chunkBookings.length; j++) {
        const bk = chunkBookings[j];
        const earning = Math.round(bk.pricing?.total || 800 + j * 150);
        runningBalance += earning;
        totalCredits += earning;
        entries.push({
          date: new Date(year, month - 1, 5 + j * 7),
          type: 'booking_earning',
          description: `Booking earnings`,
          descriptionAr: 'أرباح حجز',
          reference: `BK-${String(bk._id).slice(-6).toUpperCase()}`,
          referenceId: bk._id,
          credit: earning,
          debit: 0,
          balance: runningBalance,
        });
      }

      // Commission debit (10% of gross)
      const gross = def.gross;
      const commission = Math.round(gross * commissionRate);
      const vatOnCommission = Math.round(commission * vatRate);
      const commissionTotal = commission + vatOnCommission;
      if (commissionTotal > 0) {
        runningBalance -= commissionTotal;
        totalDebits += commissionTotal;
        entries.push({
          date: monthEnd(def.periodOffset),
          type: 'commission',
          description: 'Platform commission + VAT',
          descriptionAr: 'عمولة المنصة + ضريبة',
          reference: invoices[i].invoiceNumber,
          referenceId: invoices[i]._id,
          credit: 0,
          debit: commissionTotal,
          balance: runningBalance,
        });
      }

      // Payout debit — only for executed payouts (past months)
      if (def.status === 'executed') {
        const payoutAmount = payouts[i].amount;
        runningBalance -= payoutAmount;
        totalDebits += payoutAmount;
        entries.push({
          date: def.executedAt || monthEnd(def.periodOffset),
          type: 'payout',
          description: 'Payout to bank',
          descriptionAr: 'تحويل إلى البنك',
          reference: payouts[i].payoutNumber,
          referenceId: payouts[i]._id,
          credit: 0,
          debit: payoutAmount,
          balance: runningBalance,
        });
      }

      const statement = await HostStatement.create({
        host: hostUser._id,
        period: { month, year },
        openingBalance,
        closingBalance: runningBalance,
        totalCredits,
        totalDebits,
        entries,
        status: def.status === 'executed' ? 'closed' : 'open',
        generatedAt: monthEnd(def.periodOffset),
      });
      results.statements.push({
        id: statement._id,
        period: `${year}-${String(month).padStart(2, '0')}`,
        entries: entries.length,
        closingBalance: runningBalance,
      });
    }

    res.json({
      success: true,
      message: 'Finance data seeded successfully',
      data: results,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, stack: error.stack });
  }
});

// DEV ONLY: create (or promote) an admin account
router.post('/make-admin', async (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).json({ success: false });
  const { email, secret } = req.body;
  if (secret !== 'hostn_seed_2026_x') return res.status(403).json({ success: false });

  let admin = await Admin.findOne({ email });
  if (!admin) {
    admin = await Admin.create({ email, adminRole: 'super', name: email.split('@')[0] });
    return res.json({ success: true, message: `${email} admin created`, adminId: admin._id });
  }
  admin.adminRole = 'super';
  await admin.save();
  res.json({ success: true, message: `${email} is now super admin` });
});

module.exports = router;
