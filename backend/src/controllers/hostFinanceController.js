const HostBankAccount = require('../models/HostBankAccount');
const Payout = require('../models/Payout');
const HostInvoice = require('../models/HostInvoice');
const HostStatement = require('../models/HostStatement');
const Booking = require('../models/Booking');

// ─── Helper: month names for fallback statements ─────────────────────────────
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ═══════════════════════════════════════════════════════════════════════════════
// 1. GET /api/v1/host/finance/summary
// ═══════════════════════════════════════════════════════════════════════════════
exports.getFinanceSummary = async (req, res) => {
  try {
    const hostId = req.user._id;

    const [totalPaidOut, pendingPayout, totalCommission, bankAccount] =
      await Promise.all([
        Payout.aggregate([
          { $match: { host: hostId, status: 'executed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Payout.aggregate([
          { $match: { host: hostId, status: { $in: ['upcoming', 'processing'] } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        HostInvoice.aggregate([
          { $match: { host: hostId } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        HostBankAccount.findOne({ host: hostId, isActive: true }),
      ]);

    // Last payout
    const lastPayout = await Payout.findOne({ host: hostId, status: 'executed' })
      .sort({ executedAt: -1 })
      .select('executedAt amount');

    res.json({
      success: true,
      data: {
        totalPaidOut: totalPaidOut[0]?.total ?? 0,
        pendingPayout: pendingPayout[0]?.total ?? 0,
        totalCommission: totalCommission[0]?.total ?? 0,
        hasBankAccount: !!bankAccount,
        lastPayoutDate: lastPayout?.executedAt ?? null,
        lastPayoutAmount: lastPayout?.amount ?? 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. GET /api/v1/host/finance/payouts
// ═══════════════════════════════════════════════════════════════════════════════
exports.getPayouts = async (req, res) => {
  try {
    const hostId = req.user._id;
    const { page = 1, limit = 20, status, startDate, endDate, bookingNumber } = req.query;

    const filter = { host: hostId };

    // Status filter
    if (status) {
      const statuses = status.split(',');
      filter.status = { $in: statuses };
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Booking number search — find bookings matching the number, then filter payouts
    if (bookingNumber) {
      const matchingBookings = await Booking.find({
        _id: { $regex: bookingNumber, $options: 'i' },
      }).select('_id');
      const bookingIds = matchingBookings.map((b) => b._id);
      filter.bookings = { $in: bookingIds };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [payouts, total] = await Promise.all([
      Payout.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Payout.countDocuments(filter),
    ]);

    // Add bookingCount to each payout
    const data = payouts.map((p) => ({
      ...p,
      bookingCount: p.bookings?.length ?? 0,
    }));

    res.json({
      success: true,
      data,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. GET /api/v1/host/finance/payouts/:id
// ═══════════════════════════════════════════════════════════════════════════════
exports.getPayoutDetail = async (req, res) => {
  try {
    const payout = await Payout.findOne({
      _id: req.params.id,
      host: req.user._id,
    }).populate({
      path: 'bookings',
      select: 'checkIn checkOut pricing status guest property unit',
      populate: [
        { path: 'guest', select: 'name email' },
        { path: 'property', select: 'title titleAr' },
        { path: 'unit', select: 'nameEn nameAr' },
      ],
    });

    if (!payout) {
      return res.status(404).json({ success: false, message: 'Payout not found' });
    }

    res.json({ success: true, data: payout });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4. GET /api/v1/host/finance/invoices
// ═══════════════════════════════════════════════════════════════════════════════
exports.getInvoices = async (req, res) => {
  try {
    const hostId = req.user._id;
    const { page = 1, limit = 20, startDate, endDate } = req.query;

    const filter = { host: hostId };

    if (startDate || endDate) {
      filter.issuedAt = {};
      if (startDate) filter.issuedAt.$gte = new Date(startDate);
      if (endDate) filter.issuedAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [invoices, total] = await Promise.all([
      HostInvoice.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      HostInvoice.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: invoices,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 5. GET /api/v1/host/finance/invoices/:id
// ═══════════════════════════════════════════════════════════════════════════════
exports.getInvoiceDetail = async (req, res) => {
  try {
    const invoice = await HostInvoice.findOne({
      _id: req.params.id,
      host: req.user._id,
    }).populate({
      path: 'bookings',
      select: 'reference checkIn checkOut pricing status guest property',
      populate: [
        { path: 'guest', select: 'name' },
        { path: 'property', select: 'title titleAr' },
      ],
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 6. GET /api/v1/host/finance/statements
// ═══════════════════════════════════════════════════════════════════════════════
exports.getStatements = async (req, res) => {
  try {
    const hostId = req.user._id;
    const targetYear = parseInt(req.query.year) || new Date().getFullYear();

    // Try HostStatement documents first
    let statements = await HostStatement.find({
      host: hostId,
      'period.year': targetYear,
    })
      .select('period openingBalance closingBalance totalCredits totalDebits status currency')
      .sort({ 'period.month': -1 })
      .lean();

    // Fallback: aggregate from bookings if no statements exist
    if (statements.length === 0) {
      const Property = require('../models/Property');
      const hostProperties = await Property.find({ host: hostId }).select('_id');
      const propertyIds = hostProperties.map((p) => p._id);

      if (propertyIds.length > 0) {
        const bookingAgg = await Booking.aggregate([
          {
            $match: {
              property: { $in: propertyIds },
              status: { $in: ['confirmed', 'completed'] },
              checkIn: {
                $gte: new Date(`${targetYear}-01-01`),
                $lt: new Date(`${targetYear + 1}-01-01`),
              },
            },
          },
          {
            $group: {
              _id: { $month: '$checkIn' },
              totalCredits: { $sum: '$pricing.total' },
              bookingCount: { $sum: 1 },
            },
          },
          { $sort: { _id: -1 } },
        ]);

        statements = bookingAgg.map((item) => ({
          _id: `fallback-${targetYear}-${item._id}`,
          period: { month: item._id, year: targetYear },
          openingBalance: 0,
          closingBalance: item.totalCredits,
          totalCredits: item.totalCredits,
          totalDebits: 0,
          status: 'closed',
          currency: 'SAR',
          isFallback: true,
        }));
      }
    }

    res.json({
      success: true,
      data: {
        year: targetYear,
        statements,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 7. GET /api/v1/host/finance/statements/:id
// ═══════════════════════════════════════════════════════════════════════════════
exports.getStatementDetail = async (req, res) => {
  try {
    // Handle fallback IDs (e.g. "fallback-2026-4")
    if (req.params.id.startsWith('fallback-')) {
      const parts = req.params.id.split('-');
      const year = parseInt(parts[1]);
      const month = parseInt(parts[2]);

      const Property = require('../models/Property');
      const hostProperties = await Property.find({ host: req.user._id }).select('_id title titleAr');
      const propertyIds = hostProperties.map((p) => p._id);
      const propertyMap = {};
      hostProperties.forEach((p) => {
        propertyMap[p._id.toString()] = p;
      });

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const bookings = await Booking.find({
        property: { $in: propertyIds },
        status: { $in: ['confirmed', 'completed'] },
        checkIn: { $gte: startDate, $lte: endDate },
      })
        .sort({ checkIn: 1 })
        .select('checkIn checkOut pricing status property')
        .lean();

      let balance = 0;
      const entries = bookings.map((b) => {
        const credit = b.pricing?.total ?? 0;
        balance += credit;
        const prop = propertyMap[b.property?.toString()];
        return {
          date: b.checkIn,
          type: 'booking_earning',
          description: `Booking at ${prop?.title ?? 'Property'}`,
          descriptionAr: `حجز في ${prop?.titleAr ?? prop?.title ?? 'عقار'}`,
          reference: b._id.toString(),
          referenceId: b._id,
          credit,
          debit: 0,
          balance,
        };
      });

      return res.json({
        success: true,
        data: {
          _id: req.params.id,
          period: { month, year },
          openingBalance: 0,
          closingBalance: balance,
          totalCredits: balance,
          totalDebits: 0,
          currency: 'SAR',
          entries,
          status: 'closed',
          isFallback: true,
        },
      });
    }

    const statement = await HostStatement.findOne({
      _id: req.params.id,
      host: req.user._id,
    });

    if (!statement) {
      return res.status(404).json({ success: false, message: 'Statement not found' });
    }

    res.json({ success: true, data: statement });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 8. GET /api/v1/host/finance/bank-account
// ═══════════════════════════════════════════════════════════════════════════════
exports.getBankAccount = async (req, res) => {
  try {
    const account = await HostBankAccount.findOne({
      host: req.user._id,
      isActive: true,
    }).lean();

    res.json({ success: true, data: account });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 9. PUT /api/v1/host/finance/bank-account
// ═══════════════════════════════════════════════════════════════════════════════
exports.upsertBankAccount = async (req, res) => {
  try {
    const { bankName, bankNameAr, iban, accountHolder } = req.body;

    if (!bankName || !iban || !accountHolder) {
      return res.status(400).json({
        success: false,
        message: 'bankName, iban, and accountHolder are required',
      });
    }

    // Validate Saudi IBAN format
    if (!/^SA\d{22}$/.test(iban)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IBAN format. Must be SA followed by 22 digits.',
      });
    }

    // Deactivate any existing active accounts
    await HostBankAccount.updateMany(
      { host: req.user._id, isActive: true },
      { isActive: false }
    );

    // Create new active account
    const account = await HostBankAccount.create({
      host: req.user._id,
      bankName,
      bankNameAr: bankNameAr || '',
      iban,
      accountHolder,
      isActive: true,
    });

    res.json({ success: true, data: account });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 10. DELETE /api/v1/host/finance/bank-account
// ═══════════════════════════════════════════════════════════════════════════════
exports.deleteBankAccount = async (req, res) => {
  try {
    const result = await HostBankAccount.findOneAndUpdate(
      { host: req.user._id, isActive: true },
      { isActive: false },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ success: false, message: 'No active bank account found' });
    }

    res.json({ success: true, message: 'Bank account deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 11. PUT /api/v1/host/finance/transfer-duration
// ═══════════════════════════════════════════════════════════════════════════════
exports.updateTransferDuration = async (req, res) => {
  try {
    const { type, hours, thresholdAmount, weeklyDay } = req.body;

    const validTypes = ['after_departure', 'amount_threshold', 'weekly'];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `type must be one of: ${validTypes.join(', ')}`,
      });
    }

    const updateFields = {
      'transferDuration.type': type,
      'transferDuration.hours': type === 'after_departure' ? (parseInt(hours) || 48) : 48,
      'transferDuration.thresholdAmount': type === 'amount_threshold' ? (parseFloat(thresholdAmount) || 0) : 0,
      'transferDuration.weeklyDay': type === 'weekly' ? (parseInt(weeklyDay) ?? 0) : 0,
    };

    const account = await HostBankAccount.findOneAndUpdate(
      { host: req.user._id, isActive: true },
      updateFields,
      { new: true }
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'No active bank account found. Please add a bank account first.',
      });
    }

    res.json({ success: true, data: account });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
