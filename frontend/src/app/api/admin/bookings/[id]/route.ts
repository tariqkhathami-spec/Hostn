import { NextResponse } from 'next/server';
import { requireAdmin, addActivityLog } from '@/lib/admin-helpers';
import { seedBookings, seedUsers, seedProperties } from '@/lib/data/seed-properties';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request);
  if ('error' in auth) return auth.error;

  const booking = seedBookings.find(b => b._id === params.id);
  if (!booking) {
    return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
  }

  const guest = seedUsers.find(u => {
    const guestId = typeof booking.guest === 'string' ? booking.guest : booking.guest._id;
    return u._id === guestId;
  });
  const property = seedProperties.find(p => {
    const propId = typeof booking.property === 'string' ? booking.property : booking.property._id;
    return p._id === propId;
  });

  return NextResponse.json({
    success: true,
    data: {
      ...booking,
      guest,
      property,
    },
  });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request);
  if ('error' in auth) return auth.error;

  const booking = seedBookings.find(b => b._id === params.id);
  if (!booking) {
    return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
  }

  const body = await request.json();
  const { action } = body;

  if (action === 'cancel') {
    // Actually update the booking status in the data array
    const bookingIndex = seedBookings.findIndex(b => b._id === params.id);
    if (bookingIndex !== -1) {
      (seedBookings[bookingIndex] as Record<string, unknown>).status = 'cancelled';
      (seedBookings[bookingIndex] as Record<string, unknown>).paymentStatus = 'refunded';
    }

    addActivityLog({
      action: 'booking_cancelled',
      performedBy: auth.payload!.userId,
      targetType: 'booking',
      targetId: params.id,
      details: `Booking #${booking._id?.slice(-8) || params.id} was cancelled by admin`,
    });

    return NextResponse.json({ success: true, message: 'Booking has been cancelled' });
  }

  return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
}
