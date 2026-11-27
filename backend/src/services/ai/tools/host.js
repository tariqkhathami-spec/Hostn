/** Host tools: every query is limited to properties the host owns. */
const Booking = require('../../../models/Booking');
const Property = require('../../../models/Property');
const Unit = require('../../../models/Unit');
const { EARNING_FILTER, hostPayoutOf } = require('../../../config/fees');
const { isId, clampLimit, parseDate, day, bookingView, ToolError } = require('./common');

const ownPropertyIds = async (ctx) => (
  await Property.find({ host: ctx.user._id, isDeleted: { $ne: true } }).select('_id').lean()
).map((p) => p._id);

module.exports = [
  {
    name: 'my_listings',
    description: 'The host\'s properties and their units: status, approval, city, weekday prices, cancellation policy and rating.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
    async run(input, ctx) {
      const props = await Property.find({ host: ctx.user._id, isDeleted: { $ne: true } })
        .select('title titleAr type location.city isActive isApproved moderationNote ratings').lean();
      const units = await Unit.find({ property: { $in: props.map((p) => p._id) }, isDeleted: { $ne: true } })
        .select('property nameAr nameEn isActive pricing cancellationPolicy ratings').lean();
      return props.map((p) => ({
        id: String(p._id),
        title: p.titleAr || p.title,
        type: p.type,
        city: p.location && p.location.city,
        active: p.isActive,
        approved: p.isApproved,
        moderationNote: p.moderationNote || undefined,
        rating: p.ratings,
        units: units.filter((u) => String(u.property) === String(p._id)).map((u) => ({
          id: String(u._id),
          name: u.nameAr || u.nameEn,
          active: u.isActive,
          cancellationPolicy: u.cancellationPolicy,
          prices: u.pricing ? {
            sun: u.pricing.sunday, mon: u.pricing.monday, tue: u.pricing.tuesday, wed: u.pricing.wednesday,
            thu: u.pricing.thursday, fri: u.pricing.friday, sat: u.pricing.saturday, cleaningFee: u.pricing.cleaningFee,
          } : null,
          rating: u.ratings,
        })),
      }));
    },
  },

  {
    name: 'host_bookings',
    description: 'Bookings on the host\'s properties. Filter by status, or upcoming only (check-out today or later). Shows the host\'s payout, never the guest\'s fees.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'completed', 'rejected'] },
        upcomingOnly: { type: 'boolean' },
        limit: { type: 'integer', minimum: 1, maximum: 25 },
      },
      additionalProperties: false,
    },
    async run(input, ctx) {
      const q = { property: { $in: await ownPropertyIds(ctx) }, status: { $ne: 'held' } };
      if (input.status) q.status = input.status;
      if (input.upcomingOnly) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        q.checkOut = { $gte: today };
      }
      const rows = await Booking.find(q)
        .populate([{ path: 'property', select: 'title titleAr' }, { path: 'unit', select: 'nameAr nameEn' }, { path: 'guest', select: 'name' }])
        .sort(input.upcomingOnly ? 'checkIn' : '-createdAt')
        .limit(clampLimit(input.limit, 15, 25))
        .lean();
      return rows.map((b) => bookingView(b, 'host'));
    },
  },

  {
    name: 'unit_calendar',
    description: 'Booked and blocked dates for one of the host\'s units (or every unit of one property) in a date window of up to 92 days.',
    input_schema: {
      type: 'object',
      properties: {
        unitId: { type: 'string' },
        propertyId: { type: 'string' },
        from: { type: 'string', description: 'ISO date; default today' },
        to: { type: 'string', description: 'ISO date; default from + 30 days' },
      },
      additionalProperties: false,
    },
    async run(input, ctx) {
      const owned = await ownPropertyIds(ctx);
      const ownedSet = new Set(owned.map(String));
      let units;
      if (input.unitId) {
        if (!isId(input.unitId)) throw new ToolError('رقم الوحدة غير صالح');
        units = await Unit.find({ _id: input.unitId, property: { $in: owned } }).select('nameAr nameEn property unavailableDates').lean();
      } else if (input.propertyId) {
        if (!isId(input.propertyId) || !ownedSet.has(input.propertyId)) throw new ToolError('العقار غير موجود في حسابك');
        units = await Unit.find({ property: input.propertyId, isDeleted: { $ne: true } }).select('nameAr nameEn property unavailableDates').lean();
      } else {
        throw new ToolError('حدد الوحدة أو العقار');
      }
      if (!units.length) throw new ToolError('الوحدة غير موجودة في حسابك');

      const from = parseDate(input.from) || new Date(new Date().toISOString().slice(0, 10));
      let to = parseDate(input.to) || new Date(from.getTime() + 30 * 24 * 3600 * 1000);
      const maxTo = new Date(from.getTime() + 92 * 24 * 3600 * 1000);
      if (to > maxTo) to = maxTo;

      const bookings = await Booking.find({
        unit: { $in: units.map((u) => u._id) },
        status: { $in: ['held', 'pending', 'confirmed'] },
        checkIn: { $lt: to },
        checkOut: { $gt: from },
      }).populate('guest', 'name').select('unit reference status checkIn checkOut guest').sort('checkIn').lean();

      return {
        from: day(from),
        to: day(to),
        units: units.map((u) => ({
          id: String(u._id),
          name: u.nameAr || u.nameEn,
          booked: bookings.filter((b) => String(b.unit) === String(u._id)).map((b) => ({
            reference: b.reference, status: b.status, checkIn: day(b.checkIn), checkOut: day(b.checkOut), guestName: b.guest && b.guest.name,
          })),
          blocked: (u.unavailableDates || [])
            .filter((d) => d.start && d.end && new Date(d.start) < to && new Date(d.end) > from)
            .map((d) => ({ start: day(d.start), end: day(d.end) })),
        })),
      };
    },
  },

  {
    name: 'host_earnings_summary',
    description: 'The host\'s payout (after Hostn commission) from bookings that count as earnings, refunds excluded, with check-in in the last N days; same rule as the host statements.',
    input_schema: {
      type: 'object',
      properties: { days: { type: 'integer', minimum: 1, maximum: 365 } },
      additionalProperties: false,
    },
    async run(input, ctx) {
      const days = clampLimit(input.days, 30, 365);
      const since = new Date(Date.now() - days * 24 * 3600 * 1000);
      // Same rule as host statements: earning statuses, refunds excluded.
      const rows = await Booking.find({ property: { $in: await ownPropertyIds(ctx) }, ...EARNING_FILTER, checkIn: { $gte: since } })
        .select('pricing').lean();
      const agg = {
        payout: Math.round(rows.reduce((sum, b) => sum + hostPayoutOf(b.pricing), 0) * 100) / 100,
        bookings: rows.length,
        nights: rows.reduce((sum, b) => sum + ((b.pricing && b.pricing.nights) || 0), 0),
      };
      return { periodDays: days, payoutSar: agg.payout, bookings: agg.bookings, nights: agg.nights };
    },
  },
];
