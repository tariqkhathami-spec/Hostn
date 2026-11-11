// Staff accounts and the host ↔ account manager assignment.
// Super admins only (MANAGE_ADMINS).
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Host = require('../models/Host');
const Property = require('../models/Property');
const ActivityLog = require('../models/ActivityLog');
const { sanitizeHtml, escapeRegex } = require('../utils/sanitize');

const STAFF_ROLES = ['super', 'support', 'finance', 'account_manager'];
const isId = (v) => mongoose.isValidObjectId(v);

const log = (req, action, details, targetId) =>
  ActivityLog.create({
    actor: req.user._id,
    actorType: 'Admin',
    actorRole: 'admin',
    actorAdminRole: req.user.adminRole || 'super',
    action,
    target: targetId ? { type: 'User', id: targetId } : undefined,
    details,
    ip: req.ip,
  }).catch(() => {});

// GET /admin/staff — every staff account, with how many hosts each manages
exports.getStaff = async (req, res, next) => {
  try {
    const staff = await Admin.find({ deletedAt: null }).select('name phone email adminRole isSuspended createdAt').sort('name').lean();
    const counts = await Host.aggregate([
      { $match: { accountManager: { $ne: null }, deletedAt: null } },
      { $group: { _id: '$accountManager', n: { $sum: 1 } } },
    ]);
    const load = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
    const unassigned = await Host.countDocuments({ accountManager: null, deletedAt: null });
    res.json({
      success: true,
      data: staff.map((s) => ({
        id: s._id,
        name: s.name || '',
        phone: s.phone || '',
        email: s.email || '',
        adminRole: s.adminRole || 'super',
        isSuspended: !!s.isSuspended,
        hosts: load[String(s._id)] || 0,
      })),
      unassignedHosts: unassigned,
    });
  } catch (error) {
    next(error);
  }
};

// POST /admin/staff  { name, phone, adminRole }
// Staff sign in with a one-time code sent to this phone.
exports.createStaff = async (req, res, next) => {
  try {
    const name = typeof req.body?.name === 'string' ? sanitizeHtml(req.body.name).trim().slice(0, 100) : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.replace(/[^\d]/g, '').replace(/^966/, '').replace(/^0/, '') : '';
    const adminRole = req.body?.adminRole;
    if (!name) return res.status(400).json({ success: false, message: 'الاسم مطلوب' });
    if (!/^5\d{8}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'رقم الجوال يجب أن يكون 9 أرقام ويبدأ بـ 5' });
    }
    if (!STAFF_ROLES.includes(adminRole)) {
      return res.status(400).json({ success: false, message: 'الصلاحية غير صحيحة' });
    }
    const exists = await Admin.findOne({ phone: { $in: [phone, `0${phone}`, `+966${phone}`] } }).select('_id');
    if (exists) return res.status(409).json({ success: false, message: 'يوجد موظف مسجّل بهذا الرقم' });

    const staff = await Admin.create({ name, phone, adminRole });
    log(req, 'staff_created', `Created staff account "${name}" with role ${adminRole}`, staff._id);
    res.status(201).json({
      success: true,
      data: { id: staff._id, name: staff.name, phone: staff.phone, adminRole: staff.adminRole, hosts: 0 },
    });
  } catch (error) {
    next(error);
  }
};

// GET /admin/host-assignments?manager=<id|none>&search=&page=
exports.getAssignments = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 30;
    const query = { deletedAt: null };
    if (req.query.manager === 'none') query.accountManager = null;
    else if (isId(req.query.manager)) query.accountManager = req.query.manager;
    if (typeof req.query.search === 'string' && req.query.search.trim()) {
      const rx = new RegExp(escapeRegex(req.query.search.trim().slice(0, 60)), 'i');
      query.$or = [{ name: rx }, { phone: rx }, { email: rx }];
    }
    const [hosts, total] = await Promise.all([
      Host.find(query)
        .select('name phone email accountManager createdAt')
        .populate('accountManager', 'name')
        .sort('name')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Host.countDocuments(query),
    ]);
    const counts = await Property.aggregate([
      { $match: { host: { $in: hosts.map((h) => h._id) }, isDeleted: { $ne: true } } },
      { $group: { _id: '$host', n: { $sum: 1 } } },
    ]);
    const props = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
    res.json({
      success: true,
      data: hosts.map((h) => ({
        id: h._id,
        name: h.name || '',
        phone: h.phone || '',
        email: h.email || '',
        properties: props[String(h._id)] || 0,
        manager: h.accountManager ? { id: h.accountManager._id, name: h.accountManager.name || '' } : null,
      })),
      pagination: { total, page, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /admin/hosts/:id/account-manager  { managerId: <id> | null }
exports.assignManager = async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid host id' });
    const managerId = req.body?.managerId ?? null;
    let manager = null;
    if (managerId !== null) {
      if (!isId(managerId)) return res.status(400).json({ success: false, message: 'Invalid manager id' });
      manager = await Admin.findOne({ _id: managerId, adminRole: 'account_manager', deletedAt: null }).select('name isSuspended');
      if (!manager) return res.status(404).json({ success: false, message: 'مدير الحساب غير موجود' });
      if (manager.isSuspended) return res.status(400).json({ success: false, message: 'هذا الموظف موقوف' });
    }
    const host = await Host.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { $set: { accountManager: manager ? manager._id : null } },
      { new: true }
    ).select('name accountManager');
    if (!host) return res.status(404).json({ success: false, message: 'Host not found' });
    log(
      req,
      'account_manager_assigned',
      manager ? `Host "${host.name}" assigned to account manager "${manager.name}"` : `Host "${host.name}" left without an account manager`,
      host._id
    );
    res.json({
      success: true,
      data: { hostId: host._id, manager: manager ? { id: manager._id, name: manager.name } : null },
    });
  } catch (error) {
    next(error);
  }
};

// POST /admin/host-assignments/distribute — give every unassigned host to the
// account manager with the fewest hosts.
exports.distributeUnassigned = async (req, res, next) => {
  try {
    const managers = await Admin.find({ adminRole: 'account_manager', isSuspended: { $ne: true }, deletedAt: null }).select('_id').lean();
    if (managers.length === 0) {
      return res.status(400).json({ success: false, message: 'لا يوجد مدراء حسابات. أضف موظفاً بصلاحية مدير حساب أولاً.' });
    }
    const counts = await Host.aggregate([
      { $match: { accountManager: { $in: managers.map((m) => m._id) }, deletedAt: null } },
      { $group: { _id: '$accountManager', n: { $sum: 1 } } },
    ]);
    const load = Object.fromEntries(managers.map((m) => [String(m._id), 0]));
    counts.forEach((c) => { load[String(c._id)] = c.n; });
    const hosts = await Host.find({ accountManager: null, deletedAt: null }).select('_id').lean();
    for (const host of hosts) {
      const target = Object.keys(load).sort((a, b) => load[a] - load[b])[0];
      await Host.updateOne({ _id: host._id }, { $set: { accountManager: target } });
      load[target] += 1;
    }
    log(req, 'account_manager_assigned', `Distributed ${hosts.length} unassigned hosts across ${managers.length} account managers`);
    res.json({ success: true, data: { assigned: hosts.length } });
  } catch (error) {
    next(error);
  }
};
