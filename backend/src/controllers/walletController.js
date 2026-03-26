const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');

// @desc    Get wallet balance
// @route   GET /api/wallet/balance
// @access  Private
exports.getBalance = async (req, res, next) => {
  try {
    const wallet = await Wallet.getOrCreate(req.user._id);
    res.json({
      success: true,
      data: {
        balance: wallet.balance,
        currency: wallet.currency,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get wallet transactions
// @route   GET /api/wallet/transactions
// @access  Private
exports.getTransactions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      WalletTransaction.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      WalletTransaction.countDocuments({ user: req.user._id }),
    ]);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Internal: Credit wallet (called from refund flows)
exports.creditWallet = async (userId, amount, category, description, referenceId) => {
  const wallet = await Wallet.getOrCreate(userId);
  const balanceBefore = wallet.balance;
  wallet.balance += amount;
  await wallet.save();

  await WalletTransaction.create({
    wallet: wallet._id,
    user: userId,
    type: 'credit',
    category,
    amount,
    description,
    referenceId,
    balanceBefore,
    balanceAfter: wallet.balance,
  });

  return wallet;
};

// Internal: Debit wallet (called from booking flows)
exports.debitWallet = async (userId, amount, category, description, referenceId) => {
  const wallet = await Wallet.getOrCreate(userId);

  if (wallet.balance < amount) {
    throw new Error('Insufficient wallet balance');
  }

  const balanceBefore = wallet.balance;
  wallet.balance -= amount;
  await wallet.save();

  await WalletTransaction.create({
    wallet: wallet._id,
    user: userId,
    type: 'debit',
    category,
    amount,
    description,
    referenceId,
    balanceBefore,
    balanceAfter: wallet.balance,
  });

  return wallet;
};
