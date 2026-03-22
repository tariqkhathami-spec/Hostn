import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-helpers';
import { seedBookings, seedUsers, seedProperties } from '@/lib/data/seed-properties';

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const paymentStatus = searchParams.get('paymentStatus');
  const search = searchParams.get('search')?.toLowerCase();
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  let bookings = seedBookings.map(b => {
    const guest = seedUsers.find(u => {
      const guestId = typeof b.guest === 'string' ? b.guest : b.guest._id;
      return u._id === guestId;
    });
    const property = seedProperties.find(p => {
      const propId = typeof b.property === 'string' ? b.property : b.property._id;
      return p._id === propId;
    });
    const host = property ? seedUsers.find(u => {
      const hostId = typeof property.host === 'string' ? property.host : property.host._id;
      return u._id === hostId;
    }) : null;

    return {
      ...b,
      guestName: guest?.name || 'Unknown',
      guestEmail: guest?.email || '',
      propertyTitle: property?.title || 'Unknown Property',
      propertyCity: typeof property?.location === 'object' ? property.location.city : '',
      hostName: host?.name || 'Unknown Host',
    };
  });

  // Filter by status
  if (status && status !== 'all') {
    bookings = bookings.filter(b => b.status === status);
  }

  // Filter by payment status
  if (paymentStatus && paymentStatus !== 'all') {
    bookings = bookings.filter(b => b.paymentStatus === paymentStatus);
  }

  // Search
  if (search) {
    bookings = bookings.filter(b =>
      b.guestName.toLowerCase().includes(search) ||
      b.propertyTitle.toLowerCase().includes(search) ||
      b._id.toLowerCase().includes(search)
    );
  }

  // Sort by date (newest first)
  bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = bookings.length;
  const startIdx = (page - 1) * limit;
  const paginatedBookings = bookings.slice(startIdx, startIdx + limit);

  return NextResponse.json({
    success: true,
    data: paginatedBookings,
    pagination: { total, page, pages: Math.ceil(total / limit), limit },
  });
}
