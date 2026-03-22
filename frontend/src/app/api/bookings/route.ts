import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Booking from '@/lib/models/Booking';
import Property from '@/lib/models/Property';
import User from '@/lib/models/User';
import { requireAuth } from '@/lib/auth-helpers';
import mongoose from 'mongoose';

interface CreateBookingRequest {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: {
    adults: number;
    children: number;
    infants: number;
  };
  specialRequests?: string;
  cleaningFee?: number;
  discount?: number;
}

/**
 * POST /api/bookings
 * Creates a new booking with pricing calculation and availability check
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const auth = requireAuth(request);
    if ('error' in auth) return auth.error;

    const body = (await request.json()) as CreateBookingRequest;
    const { propertyId, checkIn, checkOut, guests, specialRequests, cleaningFee = 0, discount = 0 } = body;

    // Validate required fields
    if (!propertyId || !checkIn || !checkOut) {
      return NextResponse.json(
        { success: false, message: 'propertyId, checkIn, and checkOut are required' },
        { status: 400 }
      );
    }

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

    // Calculate pricing
    const perNight = property.pricing.perNight;
    const subtotal = perNight * nights;
    const actualCleaningFee = cleaningFee || property.pricing.cleaningFee;
    const serviceFee = Math.round((subtotal + actualCleaningFee) * 0.1); // 10% service fee
    const actualDiscount = discount || 0;
    const total = subtotal + actualCleaningFee + serviceFee - actualDiscount;

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
        cleaningFee: actualCleaningFee,
        serviceFee,
        discount: actualDiscount,
        total,
      },
      status: 'pending',
      paymentStatus: 'unpaid',
      specialRequests,
    });

    // Populate guest and property details
    await newBooking.populate([
      { path: 'property', select: 'title images location pricing' },
      { path: 'guest', select: 'name email avatar' },
    ]);

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
