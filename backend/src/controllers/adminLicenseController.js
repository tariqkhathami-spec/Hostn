const mongoose = require('mongoose');
const Unit = require('../models/Unit');
const Property = require('../models/Property');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const { sanitizeHtml } = require('../utils/sanitize');

const STATUSES = ['pending', 'active', 'expired', 'rejected'];

// @desc    Tourism permits submitted by hosts, for review
// @route   GET /api/v1/admin/licenses?status=pending&page=1
// @access  Admin (view_properties)
exports.getLicenses = async (req, res, next) => {
  try {
    const status = STATUSES.includes(req.query.status) ? req.query.status : 'pending';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 20;

    // Only units where the host actually submitted something.
    const query = {
      isDeleted: { $ne: true },
      'tourismLicense.status': status,
      $or: [
        { 'tourismLicense.licenseNumber': { $exists: true, $nin: [null, ''] } },
        { 'tourismLicense.documentUrl': { $exists: true, $nin: [null, ''] } },
      ],
    };

    const [units, total] = await Promise.all([
      Unit.find(query)
        .select('nameAr nameEn property tourismLicense updatedAt')
        .populate({
          path: 'property',
          select: 'title titleAr location.city host',
          populate: { path: 'host', select: 'name phone email' },
        })
        .sort('-updatedAt')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Unit.countDocuments(query),
    ]);

    const data = units.map((u) => ({
      unitId: u._id,
      unitName: u.nameAr || u.nameEn || '',
      propertyId: u.property?._id || null,
      propertyName: u.property?.titleAr || u.property?.title || '',
      city: u.property?.location?.city || '',
      host: u.property?.host
        ? { id: u.property.host._id, name: u.property.host.name, phone: u.property.host.phone, email: u.property.host.email }
        : null,
      license: {
        workType: u.tourismLicense?.workType,
        licenseNumber: u.tourismLicense?.licenseNumber || '',
        nationalId: u.tourismLicense?.nationalId || '',
        commercialRegister: u.tourismLicense?.commercialRegister || '',
        documentUrl: u.tourismLicense?.documentUrl || '',
        issueDate: u.tourismLicense?.issueDate || null,
        expiryDate: u.tourismLicense?.expiryDate || null,
        status: u.tourismLicense?.status,
        rejectionReason: u.tourismLicense?.rejectionReason || '',
        reviewedAt: u.tourismLicense?.reviewedAt || null,
      },
      submittedAt: u.updatedAt,
    }));

    res.json({ success: true, data, pagination: { total, page, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve or reject a unit's tourism permit
// @route   PUT /api/v1/admin/licenses/:unitId   { action: 'approve' | 'reject', reason? }
// @access  Admin (moderate_properties)
exports.reviewLicense = async (req, res, next) => {
  try {
    const { unitId } = req.params;
    if (!mongoose.isValidObjectId(unitId)) {
      return res.status(400).json({ success: false, message: 'Invalid unit id' });
    }
    const action = req.body?.action;
    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ success: false, message: "action must be 'approve' or 'reject'" });
    }
    const reason = typeof req.body?.reason === 'string' ? sanitizeHtml(req.body.reason).trim().slice(0, 500) : '';
    if (action === 'reject' && !reason) {
      return res.status(400).json({ success: false, message: 'A reason is required to reject a permit' });
    }

    const unit = await Unit.findById(unitId);
    if (!unit || unit.isDeleted) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }
    const license = unit.tourismLicense;
    if (!license || (!license.licenseNumber && !license.documentUrl)) {
      return res.status(400).json({ success: false, message: 'This unit has no submitted permit' });
    }

    if (action === 'approve') {
      const expired = license.expiryDate && new Date(license.expiryDate) < new Date();
      if (expired) {
        return res.status(400).json({ success: false, message: 'The permit has expired and cannot be approved' });
      }
      license.status = 'active';
      license.rejectionReason = undefined;
    } else {
      license.status = 'rejected';
      license.rejectionReason = reason;
    }
    license.reviewedAt = new Date();
    license.reviewedBy = req.user._id;
    await unit.save();

    const property = await Property.findById(unit.property).select('host title titleAr');
    const unitLabel = unit.nameAr || unit.nameEn || property?.titleAr || property?.title || '';
    if (property?.host) {
      Notification.createNotification({
        user: property.host,
        userType: 'Host',
        type: action === 'approve' ? 'listing_approved' : 'listing_rejected',
        title: action === 'approve' ? 'تم اعتماد تصريح السياحة' : 'تم رفض تصريح السياحة',
        message:
          action === 'approve'
            ? `تم اعتماد تصريح وزارة السياحة للوحدة "${unitLabel}".`
            : `تم رفض تصريح وزارة السياحة للوحدة "${unitLabel}". السبب: ${reason}`,
        data: { propertyId: property._id },
      }).catch(() => {});
    }

    ActivityLog.create({
      actor: req.user._id,
      actorType: 'Admin',
      actorRole: 'admin',
      actorAdminRole: req.user.adminRole || 'super',
      action: action === 'approve' ? 'license_approved' : 'license_rejected',
      target: { type: 'Property', id: unit.property },
      details: `Tourism permit ${license.licenseNumber || '(document only)'} for unit ${unit._id} ${action === 'approve' ? 'approved' : `rejected: ${reason}`}`,
      ip: req.ip,
    }).catch(() => {});

    res.json({
      success: true,
      data: { unitId: unit._id, status: license.status, rejectionReason: license.rejectionReason || '' },
    });
  } catch (error) {
    next(error);
  }
};
