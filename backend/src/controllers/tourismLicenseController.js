const Property = require('../models/Property');
const Unit = require('../models/Unit');

// ─────────────────────────────────────────────────────────────────────────
// @desc    Get all properties with units and their license status
// @route   GET /api/host/tourism-license
// @access  Private (Host)
// ─────────────────────────────────────────────────────────────────────────
exports.getLicenseOverview = async (req, res, next) => {
  try {
    const hostId = req.user._id;

    const properties = await Property.find({ host: hostId })
      .select('_id title titleAr location')
      .sort({ createdAt: -1 })
      .lean();

    const result = await Promise.all(
      properties.map(async (prop) => {
        const units = await Unit.find({ property: prop._id })
          .select('_id nameEn nameAr images tourismLicense')
          .sort({ createdAt: 1 })
          .lean();

        return {
          propertyId: prop._id,
          propertyTitle: prop.title,
          propertyTitleAr: prop.titleAr || '',
          location: prop.location || {},
          unitCount: units.length,
          units: units.map((u) => ({
            unitId: u._id,
            nameEn: u.nameEn || '',
            nameAr: u.nameAr || '',
            thumbnail: u.images && u.images.length > 0 ? u.images[0].url : null,
            license: u.tourismLicense && u.tourismLicense.licenseNumber
              ? u.tourismLicense
              : null,
          })),
        };
      })
    );

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────
// @desc    Create or update tourism license for a unit
// @route   PUT /api/host/units/:unitId/tourism-license
// @access  Private (Host)
// ─────────────────────────────────────────────────────────────────────────
exports.upsertLicense = async (req, res, next) => {
  try {
    const hostId = req.user._id;
    const { unitId } = req.params;
    const {
      workType,
      licenseNumber,
      nationalId,
      commercialRegister,
      documentUrl,
      issueDate,
      expiryDate,
    } = req.body;

    // Validate required fields
    if (!licenseNumber) {
      return res.status(400).json({
        success: false,
        message: 'License / permit number is required',
      });
    }

    const effectiveWorkType = workType || 'individual';

    // Validate work-type-specific fields
    if (effectiveWorkType === 'individual' && !nationalId) {
      return res.status(400).json({
        success: false,
        message: 'National ID is required for individual work type',
      });
    }
    if (effectiveWorkType === 'company' && !commercialRegister) {
      return res.status(400).json({
        success: false,
        message: 'Commercial register number is required for company work type',
      });
    }

    // Fetch unit and verify ownership
    const unit = await Unit.findById(unitId);
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    const property = await Property.findById(unit.property).select('host').lean();
    if (!property || property.host.toString() !== hostId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Determine status based on expiry date
    let status = 'active';
    if (expiryDate && new Date(expiryDate) < new Date()) {
      status = 'expired';
    }

    // Update the tourism license sub-document
    unit.tourismLicense = {
      workType: effectiveWorkType,
      licenseNumber,
      nationalId: effectiveWorkType === 'individual' ? nationalId : undefined,
      commercialRegister: effectiveWorkType === 'company' ? commercialRegister : undefined,
      documentUrl: documentUrl || undefined,
      issueDate: issueDate ? new Date(issueDate) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      status,
    };

    await unit.save();

    res.status(200).json({
      success: true,
      data: unit.tourismLicense,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────
// @desc    Delete tourism license from a unit
// @route   DELETE /api/host/units/:unitId/tourism-license
// @access  Private (Host)
// ─────────────────────────────────────────────────────────────────────────
exports.deleteLicense = async (req, res, next) => {
  try {
    const hostId = req.user._id;
    const { unitId } = req.params;

    // Fetch unit and verify ownership
    const unit = await Unit.findById(unitId);
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    const property = await Property.findById(unit.property).select('host').lean();
    if (!property || property.host.toString() !== hostId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    unit.tourismLicense = undefined;
    await unit.save();

    res.status(200).json({
      success: true,
      message: 'Tourism license removed',
    });
  } catch (err) {
    next(err);
  }
};
