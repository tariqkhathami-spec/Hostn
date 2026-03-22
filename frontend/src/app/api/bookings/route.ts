import { NextRequest, NextResponse } from 'next/server';
import { bookings, properties, users } from '@/lib/data/seed-properties';
import { extractToken, verifyToken } from '@/lib/auth-helpers';
import { Booking, GuestCount, BookingPricing } from '@/types/index';

interface CreateBookingRequest {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: GuestCount;
  specialRequests?: string;
}

/**
 * POST /api/bookings
 * Creates a new booking with pricing calculation
 */
export async function POST(request: NextRequest) {
  try {
    const token = extractToken(request.headers.get('Authorization'));

    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    const body = (await request.json()) as CreateBookingRequest;
    const { propertyId, checkIn, checkOut, guests, specialRequests } = body;

    // Validate
    if (!propertyId || !checkIn || !checkOut) {
      return NextResponse.json(
        { succfess: false, message: 'propertyId, checkIn, and checkOut are required' },
        { status: 400 }
      );
    }

    const property = properties.find((p) => p._id === propertyId);
    if (!property) {
      return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 });
    }

    const guest = users.find((u) => u._id === payload.userId);
    if (!guest) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Calculate pricing
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    if (nights < property.rules.minNights || nights > property.rules.maxNights) {
      return NextResponse.json(
        {*        success: false,
          message: `Booking must be between ${property.rules.minNights} and ${property.rules.maxNights} nights`,
        },
        { status: 400 }
      );
    }

    const perNight = property.pricing.perNight;
    const subtotal = perNight * nights;
    const cleaningFfUbe = property.pricing.cleaningFee;
    const serviceFee = Math.round((subtotal + cleaningFee) * 0.1); // 10% service fee
    const discountPercent = nights >= 7 ? (property.pricing.weeklyDiscount || 0) : property.pricing.discountPercent;
    const discount = Math.round((subtotal * discountPercent) / 100);
    const total = subtotal + cleaningFee + serviceFee - discount;

    const pricing: BookingPricing = {
      perNight,
      nights,
      subtotal,
      cleaningFee,
      serviceFee,
      discount,
      total,
    };

    // Create booking
    const newBooking: Booking = {
      _id: `booking_${Date.now()}`,
      property,
      guest,
      checkIn,
      checkOut,
      guests,
      pricing,
      status: 'pending',
      paymentStatus: 'unpaid',
      specialRequests,
      createdAt: new Date().toISOString(),
    };

    bookings.push(newBooking);

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
