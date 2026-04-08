const Wishlist = require('../models/Wishlist');
const User = require('../models/User');

// @desc    Get all user's wishlist lists
// @route   GET /api/v1/wishlists
// @access  Private
exports.getLists = async (req, res, next) => {
  try {
    // Ensure default list exists
    await Wishlist.getOrCreateDefault(req.user._id);

    const lists = await Wishlist.find({ user: req.user._id })
      .populate('properties', 'images title')
      .sort({ isDefault: -1, updatedAt: -1 });

    const data = lists.map((list) => ({
      _id: list._id,
      name: list.name,
      isDefault: list.isDefault,
      propertyCount: list.properties.length,
      coverImage: list.properties[0]?.images?.[0]?.url || null,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single list with full property data
// @route   GET /api/v1/wishlists/:listId
// @access  Private
exports.getList = async (req, res, next) => {
  try {
    const list = await Wishlist.findById(req.params.listId)
      .populate('properties', 'title images location pricing ratings type capacity amenities area direction');

    if (!list) {
      return res.status(404).json({ success: false, message: 'List not found' });
    }
    if (list.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
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

    // Remove these properties from user.wishlist too
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { wishlist: { $in: list.properties } },
    });

    await list.deleteOne();

    res.json({ success: true, message: 'List deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Add or remove a property from a specific list
// @route   POST /api/v1/wishlists/:listId/properties/:propertyId
// @access  Private
exports.toggleProperty = async (req, res, next) => {
  try {
    const { listId, propertyId } = req.params;
    const list = await Wishlist.findById(listId);

    if (!list) {
      return res.status(404).json({ success: false, message: 'List not found' });
    }
    if (list.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const idx = list.properties.indexOf(propertyId);
    if (idx > -1) {
      list.properties.splice(idx, 1);
    } else {
      list.properties.push(propertyId);
    }
    await list.save();

    // Keep user.wishlist in sync: property is wishlisted if it's in ANY list
    await syncUserWishlist(req.user._id);

    res.json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
};

// @desc    Move a property from one list to another
// @route   PUT /api/v1/wishlists/move
// @access  Private
exports.moveProperty = async (req, res, next) => {
  try {
    const { propertyId, fromListId, toListId } = req.body;
    if (!propertyId || !fromListId || !toListId) {
      return res.status(400).json({ success: false, message: 'propertyId, fromListId, toListId required' });
    }

    const userId = req.user._id;

    // Remove from source
    await Wishlist.updateOne(
      { _id: fromListId, user: userId },
      { $pull: { properties: propertyId } }
    );

    // Add to target
    await Wishlist.updateOne(
      { _id: toListId, user: userId },
      { $addToSet: { properties: propertyId } }
    );

    res.json({ success: true, message: 'Property moved' });
  } catch (error) {
    next(error);
  }
};

/**
 * Sync user.wishlist with all Wishlist lists — union of all list properties.
 */
async function syncUserWishlist(userId) {
  const lists = await Wishlist.find({ user: userId }).select('properties');
  const allIds = [...new Set(lists.flatMap((l) => l.properties.map(String)))];
  await User.findByIdAndUpdate(userId, { wishlist: allIds });
}
