const Wishlist = require('../models/Wishlist');

// @desc    Get all user's wishlist lists
// @route   GET /api/v1/wishlists
// @access  Private
exports.getLists = async (req, res, next) => {
  try {
    // Ensure default list exists
    await Wishlist.getOrCreateDefault(req.user._id);

    const lists = await Wishlist.find({ user: req.user._id })
      .populate('units', 'images nameEn nameAr')
      .sort({ isDefault: -1, updatedAt: -1 });

    const data = lists.map((list) => ({
      _id: list._id,
      name: list.name,
      isDefault: list.isDefault,
      unitCount: list.units.length,
      coverImage: list.units[0]?.images?.find(i => i.isPrimary)?.url || list.units[0]?.images?.[0]?.url || null,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single list with full unit data (+ nested property)
// @route   GET /api/v1/wishlists/:listId
// @access  Private
exports.getList = async (req, res, next) => {
  try {
    const list = await Wishlist.findById(req.params.listId)
      .populate({
        path: 'units',
        populate: {
          path: 'property',
          select: 'title titleAr images location pricing ratings type capacity amenities area direction rules host',
          populate: { path: 'host', select: 'name isVerified avatar' },
        },
      });

    if (!list) {
      return res.status(404).json({ success: false, message: 'List not found' });
    }
    if (list.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Attach bookedDates for each unit
    if (list.units && list.units.length > 0) {
      const Booking = require('../models/Booking');
      const now = new Date();
      const unitIds = list.units.map((u) => u._id);
      const bookings = await Booking.find({
        unit: { $in: unitIds },
        $or: [
          { status: { $in: ['pending', 'confirmed'] } },
          { status: 'held', holdExpiresAt: { $gt: now } },
        ],
        checkOut: { $gt: now },
      }).select('unit checkIn checkOut');

      const listObj = list.toObject();
      listObj.units = listObj.units.map((u) => {
        const unitBookings = bookings.filter((b) => b.unit.toString() === u._id.toString());
        u.bookedDates = unitBookings.map((b) => ({ start: b.checkIn, end: b.checkOut }));
        return u;
      });
      return res.json({ success: true, data: listObj });
    }

    res.json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new wishlist list
// @route   POST /api/v1/wishlists
// @access  Private
exports.createList = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'List name is required' });
    }

    const list = await Wishlist.create({
      user: req.user._id,
      name: name.trim(),
      isDefault: false,
    });

    res.status(201).json({ success: true, data: list });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A list with this name already exists' });
    }
    next(error);
  }
};

// @desc    Rename a wishlist list
// @route   PUT /api/v1/wishlists/:listId
// @access  Private
exports.updateList = async (req, res, next) => {
  try {
    const list = await Wishlist.findById(req.params.listId);
    if (!list) {
      return res.status(404).json({ success: false, message: 'List not found' });
    }
    if (list.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (list.isDefault) {
      return res.status(400).json({ success: false, message: 'Cannot rename default list' });
    }

    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'List name is required' });
    }

    list.name = name.trim();
    await list.save();

    res.json({ success: true, data: list });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A list with this name already exists' });
    }
    next(error);
  }
};

// @desc    Delete a wishlist list
// @route   DELETE /api/v1/wishlists/:listId
// @access  Private
exports.deleteList = async (req, res, next) => {
  try {
    const list = await Wishlist.findById(req.params.listId);
    if (!list) {
      return res.status(404).json({ success: false, message: 'List not found' });
    }
    if (list.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (list.isDefault) {
      return res.status(400).json({ success: false, message: 'Cannot delete default list' });
    }

    await list.deleteOne();

    res.json({ success: true, message: 'List deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Add or remove a unit from a specific list
// @route   POST /api/v1/wishlists/:listId/units/:unitId
// @access  Private
exports.toggleUnit = async (req, res, next) => {
  try {
    const { listId, unitId } = req.params;
    const list = await Wishlist.findById(listId);

    if (!list) {
      return res.status(404).json({ success: false, message: 'List not found' });
    }
    if (list.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const idx = list.units.findIndex((u) => u.toString() === unitId);
    if (idx > -1) {
      list.units.splice(idx, 1);
    } else {
      list.units.push(unitId);
    }
    await list.save();

    res.json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
};

// @desc    Move a unit from one list to another
// @route   PUT /api/v1/wishlists/move
// @access  Private
exports.moveUnit = async (req, res, next) => {
  try {
    const { unitId, fromListId, toListId } = req.body;
    if (!unitId || !fromListId || !toListId) {
      return res.status(400).json({ success: false, message: 'unitId, fromListId, toListId required' });
    }

    const userId = req.user._id;

    // Remove from source
    await Wishlist.updateOne(
      { _id: fromListId, user: userId },
      { $pull: { units: unitId } }
    );

    // Add to target
    await Wishlist.updateOne(
      { _id: toListId, user: userId },
      { $addToSet: { units: unitId } }
    );

    res.json({ success: true, message: 'Unit moved' });
  } catch (error) {
    next(error);
  }
};

// @desc    Check which lists contain a specific unit
// @route   GET /api/v1/wishlists/unit/:unitId/membership
// @access  Private
exports.getUnitMembership = async (req, res, next) => {
  try {
    const { unitId } = req.params;
    const lists = await Wishlist.find({ user: req.user._id }).select('_id units');
    const listIds = lists
      .filter((l) => l.units.some((u) => u.toString() === unitId))
      .map((l) => l._id.toString());
    res.json({ success: true, data: listIds });
  } catch (error) {
    next(error);
  }
};

