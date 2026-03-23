import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Booking from '@/lib/models/Booking';
import Property from '@/lib/models/Property';
import User from '@/lib/models/User';
import { requireAuth } from '@/lib/auth-helpers';
import { sanitizeText } from '@/lib/sanitize';
import { bookingSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendBookingConfirmation } from '@/lib/email';
import { logBookingEvent } from '@/lib/logger';
import mongoose from 'mongoose';

/**
 * POST /api/bookings
 * Creates a new booking with SERVER-SIDE pricing calculation and availability check.
 * SECURITY: All pricing is calculated server-side from the property's database record.
 * Client-supplied discount/cleaningFee fields are IGNORED to prevent price manipulation.
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const auth = requireAuth(request);
    if ('error' in auth) return auth.error;

    // Rate limit: 10 bookings per minute per user
    const rateLimitResult = await checkRateLimit(`booking:${auth.payload.userId}`, 10, '1m');
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many booking requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Validate and parse input with Zod
    const body = await request.json();
    const parsed = bookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { propertyId, checkIn, checkOut, guests, specialRequests } = parsed.data;

    // Check if user exists and is not banned
    const user = await User.findById(auth.payload.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    if (user.isBanned) {
      return NextResponse.json(
        { success: false, message: 'Your account has been suspended. You cannot make bookings.' },
        { status: 403 }
      );
    }

    // Check if property exists and is approved
    const property = await Property.findById(propertyId);
    if (!property) {
      return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 });
    }

    if (property.moderationStatus !== 'approved') {
      return NextResponse.json(
        { success: false, message: 'This property is not available for booking' },
        { status: 400 }
      );
    }

    // Parse dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json(
        { success: false, message: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (checkOutDate <= checkInDate) {
      return NextResponse.json(
        { success: false, message: 'Check-out date must be after check-in date' },
        { status: 400 }
      );
    }

    // Calculate nights
    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Validate night limits
    if (nights < property.rules.minNights || nights > property.rules.maxNights) {
      return NextResponse.json(
        {
          success: false,
          message: `Booking must be between ${property.rules.minNights} and ${property.rules.maxNights} nights`,
        },
        { status: 400 }
      );
    }

    // Check availability - no overlapping pending/confirmed bookings
    const conflictingBooking = await Booking.findOne({
      property: propertyId,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { checkIn: { $lt: checkOutDate }, checkOut: { $gt: checkInDate } },
      ],
    });

    if (conflictingBooking) {
      return NextResponse.json(
        { success: false, message: 'Property is not available for selected dates' },
        { status: 400 }
      );
    }

    // SECURITY: Calculate ALL pricing SERVER-SIDE from property database record
    // Client-supplied discount and cleaningFee are completely IGNORED
    const perNight = property.pricing.perNight;
    const subtotal = perNight * nights;
    const cleaningFee = property.pricing.cleaningFee || 0;
    const serviceFee = Math.round((subtotal + cleaningFee) * 0.1); // 10% service fee

    // Calculate discount from property-configured promotions only
    let discount = 0;
    if (nights >= 7 && property.pricing.weeklyDiscount > 0) {
      discount = Math.round(subtotal * (property.pricing.weeklyDiscount / 100));
    } else if (property.pricing.discountPercent > 0) {
      discount = Math.round(subtotal * (property.pricing.discountPercent / 100));
    }

    const total = subtotal + cleaningFee + serviceFee - discount;

    // SECURITY: Ensure total is always positive
    if (total <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid pricing calculation. Please contact support.' },
        { status: 400 }
      );
    }

    // Sanitize special requests text
    const sanitizedRequests = specialRequests ? sanitizeText(specialRequests) : undefined;

    // Create booking
    const newBooking = await Booking.create({
      property: new mongoose.Types.ObjectId(propertyId),
      guest: new mongoose.Types.ObjectId(auth.payload.userId),
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests: {
        adults: guests?.adults || 1,
        children: guests?.children || 0,
        infants: guests?.infants || 0,
      },
      pricing: {
        perNight,
        nights,
        subtotal,
        cleaningFee,
        serviceFee,
        discount,
        total,
      },
      status: 'pending',
      paymentStatus: 'unpaid',
      specialRequests: sanitizedRequests,
    });

    // Populate guest and property details
    await newBooking.populate([
      { path: 'property', select: 'title images location pricing' },
      { path: 'guest', select: 'name email avatar' },
    ]);

    // Log booking creation (fire-and-forget)
    logBookingEvent(
      newBooking._id.toString(),
      'booking_created',
      `Booking created for ${property.title} (${nights} nights, ${total} SAR)`,
      auth.payload.userId
    ).catch(() => {});

    // Send booking confirmation email (non-blocking)
    try {
      sendBookingConfirmation({
        guestEmail: user.email,
        guestName: user.name,
        propertyTitle: property.title,
        checkIn: checkInDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        checkOut: checkOutDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        nights,
        total,
        bookingId: newBooking._id.toString(),
      }).catch((err) => console.error('Failed to send booking confirmation email:', err));
    } catch (emailError) {
      console.error('Email notification error:', emailError);
    }

    return NextResponse.json(
      {
        success: true,
        data: newBooking,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ success: false, message: 'Failed to create booking' }, { status: 500 });
  }
}

/**
 * GET /api/bookings
 * List all bookings for authenticated user (optional)
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const auth = requireAuth(request);
    if ('error' in auth) return auth.error;

    // Get bookings where user is the guest
    const bookings = await Booking.find({ guest: auth.payload.userId })
      .populate('property', 'title images location pricing')
      .populate('guest', 'name email avatar')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch bookings' }, { status: 500 });
  }
}
