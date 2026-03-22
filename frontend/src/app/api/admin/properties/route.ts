import { NextResponse } from 'next/server';
import { requireAdmin, getPropertyModeration } from '@/lib/admin-helpers';
import { seedProperties, seedUsers } from '@/lib/data/seed-properties';

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status'); // pending, approved, rejected
  const type = searchParams.get('type');
  const city = searchParams.get('city');
  const search = searchParams.get('search')?.toLowerCase();
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  let properties = seedProperties.map(p => {
    const moderation = getPropertyModeration(p._id);
    const host = seedUsers.find(u => {
      const hostId = typeof p.host === 'string' ? p.host : p.host._id;
      return u._id === hostId;
    });
    return {
      ...p,
      host: host || p.host,
      moderationStatus: moderation.status,
      rejectionReason: moderation.rejectionReason,
      moderatedBy: moderation.moderatedBy,
      moderatedAt: moderation.moderatedAt,
    };
  });

  // Filter by moderation status
  if (status && status !== 'all') {
    properties = properties.filter(p => p.moderationStatus === status);
  }

  // Filter by type
  if (type && type !== 'all') {
    properties = properties.filter(p => p.type === type);
  }

  // Filter by city
  if (city && city !== 'all') {
    properties = properties.filter(p => {
      const propCity = typeof p.location === 'object' ? p.location.city : '';
      return propCity.toLowerCase() === city.toLowerCase();
    });
  }

  // Search
  if (search) {
    properties = properties.filter(p =>
      p.title.toLowerCase().includes(search) ||
      (typeof p.location === 'object' && p.location.city.toLowerCase().includes(search))
    );
  }

  // Sort: pending first, then by date
  properties.sort((a, b) => {
    if (a.moderationStatus === 'pending' && b.moderationStatus !== 'pending') return -1;
    if (a.moderationStatus !== 'pending' && b.moderationStatus === 'pending') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const total = properties.length;
  const startIdx = (page - 1) * limit;
  const paginatedProps = properties.slice(startIdx, startIdx + limit);

  return NextResponse.json({
    success: true,
    data: paginatedProps,
    pagination: { total, page, pages: Math.ceil(total / limit), limit },
  });
}
