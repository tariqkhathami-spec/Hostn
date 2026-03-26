const SavedPaymentMethod = require('../models/SavedPaymentMethod');

// @desc    Get saved payment methods
// @route   GET /api/payment-methods
// @access  Private
exports.getSavedMethods = async (req, res, next) => {
  try {
    const methods = await SavedPaymentMethod.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
    res.json({ success: true, data: methods });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a payment method
// @route   POST /api/payment-methods
// @access  Private
exports.addMethod = async (req, res, next) => {
  try {
    const { provider, tokenId, cardBrand, cardLast4, expiryMonth, expiryYear, nickname } = req.body;

    if (!provider || !tokenId || !cardBrand || !cardLast4 || !expiryMonth || !expiryYear) {
      return res.status(400).json({ success: false, message: 'All card details are required' });
    }

    // If this is the first card, make it default
    const existingCount = await SavedPaymentMethod.countDocuments({ user: req.user._id });
    const isDefault = existingCount === 0;

    const method = await SavedPaymentMethod.create({
      user: req.user._id,
      provider,
      tokenId,
      cardBrand,
      cardLast4,
      expiryMonth,
      expiryYear,
      isDefault,
      nickname,
    });

    res.status(201).json({ success: true, data: method });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a payment method
// @route   DELETE /api/payment-methods/:id
// @access  Private
exports.deleteMethod = async (req, res, next) => {
  try {
    const method = await SavedPaymentMethod.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!method) {
      return res.status(404).json({ success: false, message: 'Payment method not found' });
    }

    const wasDefault = method.isDefault;
    await method.deleteOne();

    // If deleted card was default, make the next one default
    if (wasDefault) {
      const nextMethod = await SavedPaymentMethod.findOne({ user: req.user._id }).sort({ createdAt: -1 });
      if (nextMethod) {
        nextMethod.isDefault = true;
        await nextMethod.save();
      }
    }

    res.json({ success: true, message: 'Payment method deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Set payment method as default
// @route   PUT /api/payment-methods/:id/default
// @access  Private
exports.setDefault = async (req, res, next) => {
  try {
    const method = await SavedPaymentMethod.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!method) {
      return res.status(404).json({ success: false, message: 'Payment method not found' });
    }

    // Unset all defaults for this user
    await SavedPaymentMethod.updateMany(
      { user: req.user._id },
      { isDefault: false }
    );

    // Set this one as default
    method.isDefault = true;
    await method.save();

    res.json({ success: true, data: method });
  } catch (error) {
    next(error);
  }
};
