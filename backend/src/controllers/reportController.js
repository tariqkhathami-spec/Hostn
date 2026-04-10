const Report = require('../models/Report');
const User = require('../models/User');
const Property = require('../models/Property');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');

// @desc    Create a report
// @route   POST /api/reports
// @access  Private
exports.createReport = async (req, res) => {
  try {
    const { targetType, targetId, reason, description, relatedBooking } = req.body;

    if (!targetType || !targetId || !reason || !description) {
      return res.status(400).json({
        success: false,
        message: 'Target type, target ID, reason, and description are required',
      });
    }

    // Verify target exists
    let targetExists = false;
    if (targetType === 'property') {
      targetExists = await Property.exists({ _id: targetId });
    } else if (targetType === 'user') {
      targetExists = await User.exists({ _id: targetId });
    } else if (targetType === 'review') {
      const Review = require('../models/Review');
      targetExists = await Review.exists({ _id: targetId });
    }

    if (!targetExists) {
      return res.status(404).json({ success: false, message: 'Report target not found' });
    }

    // Prevent self-reporting
    if (targetType === 'user' && targetId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot report yourself' });
    }

    // Prevent duplicate reports
    const existingReport = await Report.findOne({
      reporter: req.user._id,
      targetType,
      targetId,
      status: { $in: ['pending', 'reviewing'] },
    });

    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active report for this item',
      });
    }

    const sanitizedDesc = description.replace(/<[^>]*>/g, '').trim();

    const report = await Report.create({
      reporter: req.user._id,
      targetType,
      targetId,
      reason,
      description: sanitizedDesc,
      relatedBooking: relatedBooking || null,
    });

    await report.populate('reporter', 'name avatar');

    res.status(201).json({ success: true, data: report });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ success: false, message: 'Failed to create report' });
  }
};

// @desc    Get user's reports
// @route   GET /api/reports/my
// @access  Private
exports.getMyReports = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const reports = await Report.find({ reporter: req.user._id })
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Report.countDocuments({ reporter: req.user._id });

    res.json({
      success: true,
      data: reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
};

// ======= ADMIN ENDPOINTS =======

// @desc    Get all reports (admin)
// @route   GET /api/reports/admin/all
// @access  Private/Admin
exports.getAllReports = async (req, res) => {
  try {
    const { status, targetType, reason, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (targetType) query.targetType = targetType;
    if (reason) query.reason = reason;

    const reports = await Report.find(query)
      .populate('reporter', 'name email avatar')
      .populate('reviewedBy', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Report.countDocuments(query);

    const stats = await Report.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: reports,
      stats: stats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
};

// @desc    Get single report (admin)
// @route   GET /api/reports/admin/:id
// @access  Private/Admin
exports.getReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('reporter', 'name email avatar role')
      .populate('reviewedBy', 'name avatar')
      .populate('relatedBooking', 'checkIn checkOut status pricing.total');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Populate target based on type
    if (report.targetType === 'property') {
      await report.populate({
        path: 'targetId',
        select: 'title titleAr host location images isActive',
        model: 'Property',
      });
    } else if (report.targetType === 'user') {
      await report.populate({
        path: 'targetId',
        select: 'name email avatar role isSuspended',
        model: 'User',
      });
    }

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch report' });
  }
};

// @desc    Take action on a report (admin)
// @route   PUT /api/reports/admin/:id/action
// @access  Private/Admin
exports.takeAction = async (req, res) => {
  try {
    const { status, actionTaken, adminNotes } = req.body;

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    if (status) report.status = status;
    if (actionTaken) report.actionTaken = actionTaken;
    if (adminNotes) report.adminNotes = adminNotes.replace(/<[^>]*>/g, '').trim();
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();

    // Execute the action
    if (actionTaken === 'warning' && report.targetType === 'user') {
      await Notification.createNotification({
        user: report.targetId,
        type: 'system',
        title: 'Account Warning',
        message: 'Your account has received a warning due to reported behavior. Please review our community guidelines.',
      });
    }

    if (actionTaken === 'suspension' && report.targetType === 'user') {
      await User.findByIdAndUpdate(report.targetId, { isSuspended: true });
      await Notification.createNotification({
        user: report.targetId,
        type: 'system',
        title: 'Account Suspended',
        message: 'Your account has been suspended due to policy violations.',
      });
      await ActivityLog.create({
        actor: req.user._id,
        action: 'user_suspended',
        target: { type: 'User', id: report.targetId },
        details: `Suspended due to report: ${report.reason}`,
        ip: req.ip,
      });
    }

    if (actionTaken === 'listing_removed' && report.targetType === 'property') {
      await Property.findByIdAndUpdate(report.targetId, { isActive: false });
      const property = await Property.findById(report.targetId);
      if (property) {
        await Notification.createNotification({
          user: property.host,
          type: 'listing_rejected',
          title: 'Listing Removed',
          message: `Your listing has been removed due to policy violations.`,
          data: { propertyId: report.targetId },
        });
      }
    }

    if (actionTaken === 'account_banned' && report.targetType === 'user') {
      await User.findByIdAndUpdate(report.targetId, {
        isSuspended: true,
        isBanned: true,
      });
      await ActivityLog.create({
        actor: req.user._id,
        action: 'user_suspended',
        target: { type: 'User', id: report.targetId },
        details: `Banned due to report: ${report.reason}`,
        ip: req.ip,
      });
    }

    await report.save();

    // Notify reporter
    await Notification.createNotification({
      user: report.reporter,
      type: 'system',
      title: 'Report Updated',
      message: `Your report has been reviewed. Status: ${report.status}`,
    });

    await report.populate('reviewedBy', 'name avatar');

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error taking action on report:', error);
    res.status(500).json({ success: false, message: 'Failed to update report' });
  }
};
