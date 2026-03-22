import { NextResponse } from 'next/server';
import { requireAdmin, isUserBanned } from '@/lib/admin-helpers';
import { seedUsers, seedBookings } from '@/lib/data/seed-properties';

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const search = searchParams.get('search')?.toLowerCase();
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  let users = [...seedUsers];

  // Filter by role
  if (role && role !== 'all') {
    users = users.filter(u => u.role === role);
  }

  // Search by name or email
  if (search) {
    users = users.filter(u =>
      u.name.toLowerCase().includes(search) ||
      u.email.toLowerCase().includes(search)
    );
  }

  // Enrich with booking data and ban status
  const enrichedUsers = users.map(u => {
    const userBookings = seedBookings.filter(b => {
      const guestId = typeof b.guest === 'string' ? b.guest : b.guest._id;
      return guestId === u._id;
    });
    const totalSpent = userBookings.reduce((s, b) => s + (typeof b.pricing === 'object' ? b.pricing.total : 0), 0);

    return {
      ...u,
      isBanned: isUserBanned(u._id),
      bookingsCount: userBookings.length,
      totalSpent,
    };
  });

  // Sort by creation date (newest first)
  enrichedUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Paginate
  const total = enrichedUsers.length;
  const startIdx = (page - 1) * limit;
  const paginatedUsers = enrichedUsers.slice(startIdx, startIdx + limit);

  return NextResponse.json({
    success: true,
    data: paginatedUsers,
    pagination: { total, page, pages: Math.ceil(total / limit), limit },
  });
}
