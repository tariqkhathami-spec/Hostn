/** Guest tools: every query is filtered by the guest's own id. */
const Booking = require('../../../models/Booking');
const Property = require('../../../models/Property');
const { escapeRegex, clampLimit, isId, day, normalizeReference, bookingView, cancellationQuote, ToolError } = require('./common');

const POPULATE = [
  { path: 'property', select: 'title titleAr location.city' },
  { path: 'unit', select: 'nameAr nameEn cancellationPolicy cancellationDescription writtenRules' },
];

async function ownBooking(input, ctx) {
  const q = { guest: ctx.user._id };
  if (input.bookingId && isId(input.bookingId)) q._id = input.bookingId;
  else if (input.reference) q.reference = normalizeReference(input.reference);
  else throw new ToolError('أعطني رقم الحجز');
  const booking = await Booking.findOne(q).populate(POPULATE).lean();
  if (!booking) throw new ToolError('لم أجد هذا الحجز في حسابك');
  return booking;
}

module.exports = [
  {
    name: 'search_stays',
    description: 'Find public listings (chalets, rest houses, apartments...) by city, type and number of guests, best rated first. Returns up to 8 with a link the guest can open. It does not check dates: tell the guest to pick dates on the listing page.',
    input_schema: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City name in Arabic or English, e.g. الرياض' },
        type: { type: 'string', description: 'Listing type, e.g. chalet, apartment, villa, farm, camp' },
        guests: { type: 'integer', minimum: 1, maximum: 100 },
        maxPricePerNight: { type: 'number', minimum: 0 },
        limit: { type: 'integer', minimum: 1, maximum: 8 },
      },
      additionalProperties: false,
    },
    async run(input) {
      const q = { isActive: true, isApproved: true, isDeleted: { $ne: true } };
      if (input.city) q['location.city'] = new RegExp(escapeRegex(String(input.city).trim()), 'i');
      if (input.type) q.type = String(input.type).trim().toLowerCase();
      if (input.guests) q['capacity.maxGuests'] = { $gte: parseInt(input.guests, 10) };
      if (input.maxPricePerNight) q['pricing.perNight'] = { $lte: Number(input.maxPricePerNight) };
      const rows = await Property.find(q)
        .select('title titleAr type location.city location.district pricing.perNight capacity.maxGuests ratings')
        .sort({ 'ratings.average': -1, 'ratings.count': -1 })
        .limit(clampLimit(input.limit, 6, 8))
        .lean();
      return rows.map((p) => ({
        title: p.titleAr || p.title,
        type: p.type,
        city: p.location && p.location.city,
        district: p.location && p.location.district,
        fromPerNight: p.pricing && p.pricing.perNight,
        maxGuests: p.capacity && p.capacity.maxGuests,
        rating: p.ratings && p.ratings.count ? p.ratings.average : null,
        link: `/property/${p._id}`,
      }));
    },
  },

  {
    name: 'my_bookings',
    description: 'The guest\'s own bookings. "upcoming" = pending/confirmed with check-out today or later; "previous" = finished, cancelled or rejected.',
    input_schema: {
      type: 'object',
      properties: { which: { type: 'string', enum: ['upcoming', 'previous', 'all'] } },
      additionalProperties: false,
    },
    async run(input, ctx) {
      const q = { guest: ctx.user._id, status: { $ne: 'held' } };
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (input.which === 'upcoming') {
        q.status = { $in: ['pending', 'confirmed'] };
        q.checkOut = { $gte: today };
      } else if (input.which === 'previous') {
        q.$or = [{ status: { $in: ['cancelled', 'rejected', 'completed'] } }, { checkOut: { $lt: today } }];
      }
      const rows = await Booking.find(q).populate(POPULATE).sort('-checkIn').limit(20).lean();
      return rows.map((b) => bookingView(b, 'guest'));
    },
  },

  {
    name: 'booking_details',
    description: 'Details of one of the guest\'s bookings (by reference or id), including the unit\'s house rules and cancellation policy.',
    input_schema: {
      type: 'object',
      properties: { reference: { type: 'string' }, bookingId: { type: 'string' } },
      additionalProperties: false,
    },
    async run(input, ctx) {
      const b = await ownBooking(input, ctx);
      return {
        ...bookingView(b, 'guest'),
        city: b.property && b.property.location && b.property.location.city,
        pricing: b.pricing ? {
          perNight: b.pricing.perNight, nights: b.pricing.nights, subtotal: b.pricing.subtotal,
          cleaningFee: b.pricing.cleaningFee, serviceFee: b.pricing.serviceFee, discount: b.pricing.discount,
          vat: b.pricing.vat, total: b.pricing.total,
        } : null,
        houseRules: b.unit && b.unit.writtenRules,
        cancellationPolicy: b.unit && b.unit.cancellationPolicy,
        cancellationDescription: b.unit && b.unit.cancellationDescription,
      };
    },
  },

  {
    name: 'cancellation_quote',
    description: 'Check whether cancelling one of the guest\'s bookings right now falls inside the refund window of its cancellation policy. Informational only: it does not cancel anything. Refunds are reviewed by the support team.',
    input_schema: {
      type: 'object',
      properties: { reference: { type: 'string' }, bookingId: { type: 'string' } },
      additionalProperties: false,
    },
    async run(input, ctx) {
      const b = await ownBooking(input, ctx);
      if (['cancelled', 'completed', 'rejected'].includes(b.status)) {
        return { reference: b.reference, status: b.status, cancellable: false };
      }
      const quote = cancellationQuote(b.unit && b.unit.cancellationPolicy, b.checkIn);
      return {
        reference: b.reference,
        status: b.status,
        paymentStatus: b.paymentStatus,
        checkIn: day(b.checkIn),
        cancellable: true,
        ...quote,
        hostNote: (b.unit && b.unit.cancellationDescription) || null,
        howToCancel: 'من صفحة "حجوزاتي" في الموقع أو التطبيق. الاسترداد يراجعه فريق الدعم.',
      };
    },
  },
];
