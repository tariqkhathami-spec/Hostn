import { NextResponse } from 'next/server';
import { requireAdmin, isHostSuspended, suspendHost, activateHost, addActivityLog } from '@/lib/admin-helpers';
import { seedUsers, seedProperties, seedBookings, seedReviews } from '@/lib/data/seed-properties';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request);
  if ('error' in auth) return auth.error;

  const host = seedUsers.find(u => u._id === params.id && u.role === 'host');
  if (!host) {
    return NextResponse.json({ success: false, message: 'Host not found' }, { status: 404 });
  }

  const hostProperties = seedProperties.filter(p => {
    const hostId = typeof p.host === 'string' ? p.host : p.host._id;
    return hostId === host._id;
  });

  const propertyIds = hostProperties.map(p => p._id);
  const hostBookings = seedBookings.filter(b => {
    const propId = typeof b.property === 'string' ? b.property : b.property._id;
    return propertyIds.includes(propId);
  });

  const hostReviews = seedReviews.filter(r => {
    const propId = typeof r.property === 'string' ? r.property : (r.property as any)?._id;
    return propertyIds.includes(propId);
  });

  const totalEarnings = hostBookings
    .filter(b => b.paymentStatus === 'paid')
    .reduce((s, b) => s + (typeof b.pricing === 'object' ? b.pricing.total : 0), 0);

  return NextResponse.json({
    success: true,
    data: {
      ...host,
      isSuspended: isHostSuspended(host._id),
      properties: hostProperties,
      propertiesCount: hostProperties.length,
      bookingsCount: hostBookings.length,
      reviewsCount: hostReviews.length,
      totalEarnings,
      averageRating: hostProperties.length > 0
        ? hostProperties.reduce((s, p) => s + (typeof p.ratings === 'object' ? p.ratings.average : 0), 0) / hostProperties.length
        : 0,
    },
  });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request);
  if ('error' in auth) return auth.error;

  const host = seedUsers.find(u => u._id === params.id && u.role === 'host');
  if (!host) {
    return NextResponse.json({ success: false, message: 'Host not found' }, { status: 404 });
  }

  const body = await request.json();
  const { action } = body;

  if (action === 'suspend') {
    suspendHost(host._id);
    addActivityLog({
      action: 'host_suspended',
      performedBy: auth.payload!.userId,
      targetType: 'user',
      targetId: host._id,
      details: `Host "${host.name}" was suspended`,
    });
    return NextResponse.json({ success: true, message: `Host ${host.name} has been suspended` });
  }

  if (action === 'activate') {
    activateHost(host._id);
    addActivityLog({
      action: 'host_activated',
      performedBy: auth.payload!.userId,
      targetType: 'user',
      targetId: host._id,
      details: `Host "${host.name}" was reactivated`,
    });
    return NextResponse.json({ success: true, message: `Host ${host.name} has been activated` });
  }

  return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
}
