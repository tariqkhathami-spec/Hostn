import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-helpers';
import { seedBookings, seedUsers, seedProperties } from '@/lib/data/seed-properties';

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  // Generate payment records from bookings
  let payments = seedBookings.map(b => {
    const guest = seedUsers.find(u => {
      const guestId = typeof b.guest === 'string' ? b.guest : b.guest._id;
      return u._id === guestId;
    });
    const property = seedProperties.find(p => {
      const propId = typeof b.property === 'string' ? b.property : b.property._id;
      return p._id === propId;
    });

    return {
      _id: `pay_${b._id}`,
      bookingId: b._id,
      guestName: guest?.name || 'Unknown',
      guestEmail: guest?.email || '',
      propertyTitle: property?.title || 'Unknown',
      amount: typeof b.pricing === 'object' ? b.pricing.total : 0,
      subtotal: typeof b.pricing === 'object' ? b.pricing.subtotal : 0,
      cleaningFee: typeof b.pricing === 'object' ? b.pricing.cleaningFee : 0,
      serviceFee: typeof b.pricing === 'object' ? b.pricing.serviceFee : 0,
      status: b.paymentStatus as 'paid' | 'pending' | 'refunded',
      method: b.paymentStatus === 'paid' ? 'Credit Card' : 'Pending',
      bookingStatus: b.status,
      createdAt: b.createdAt,
    };
  });

  // Filter by status
  if (status && status !== 'all') {
    payments = payments.filter(p => p.status === status);
  }

  // Sort by date
  payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Totals
  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const totalRefunded = payments.filter(p => p.status === 'refunded').reduce((s, p) => s + p.amount, 0);

  const total = payments.length;
  const startIdx = (page - 1) * limit;
  const paginatedPayments = payments.slice(startIdx, startIdx + limit);

  return NextResponse.json({
    success: true,
    data: paginatedPayments,
    summary: { totalRevenue, totalPending, totalRefunded, totalTransactions: total },
    pagination: { total, page, pages: Math.ceil(total / limit), limit },
  });
}
