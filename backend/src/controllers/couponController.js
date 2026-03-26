const Coupon = require('../models/Coupon');

// @desc    Validate a coupon code
// @route   POST /api/coupons/validate
// @access  Private
exports.validateCoupon = async (req, res, next) => {
  try {
    const { code, bookingAmount } = req.body;

    if (!code || !bookingAmount) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code and booking amount are required',
      });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid coupon code' });
    }

    // Check validity period
    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      return res.status(400).json({ success: false, message: 'Coupon has expired' });
    }

    // Check usage limit
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
    }

    // Check minimum booking amount
    if (bookingAmount < coupon.minBookingAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum booking amount is ${coupon.minBookingAmount} SAR`,
      });
    }

    const discount = coupon.calculateDiscount(bookingAmount);

    res.json({
      success: true,
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: discount,
        finalAmount: bookingAmount - discount,
      },
    });
  } catch (error) {
    next(error);
  }
};
