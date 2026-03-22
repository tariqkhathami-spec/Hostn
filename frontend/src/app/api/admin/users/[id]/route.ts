import { NextResponse } from 'next/server';
import { requireAdmin, isUserBanned, banUser, unbanUser, isHostSuspended, suspendHost, activateHost, addActivityLog } from '@/lib/admin-helpers';
import { seedUsers, seedBookings, seedProperties, seedReviews } from '@/lib/data/seed-properties';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request);
  if ('error' in auth) return auth.error;

  const user = seedUsers.find(u => u._id === params.id);
  if (!user) {
    return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
  }

  // Get user's bookings
  const userBookings = seedBookings.filter(b => {
    const guestId = typeof b.guest === 'string' ? b.guest : b.guest._id;
    return guestId === user._id;
  });

  // Get user's properties (if host)
  const userProperties = seedProperties.filter(p => {
    const hostId = typeof p.host === 'string' ? p.host : p.host._id;
    return hostId === user._id;
  });

  // Get user's reviews
  const userReviews = seedReviews.filter(r => {
    const guestId = typeof r.guest === 'string' ? r.guest : (r.guest as any)?._id;
    return guestId === user._id;
  });

  const totalSpent = userBookings.reduce((s, b) => s + (typeof b.pricing === 'object' ? b.pricing.total : 0), 0);

  return NextResponse.json({
    success: true,
    data: {
      ...user,
      isBanned: isUserBanned(user._id),
      isSuspended: user.role === 'host' ? isHostSuspended(user._id) : false,
      bookingsCount: userBookings.length,
      totalSpent,
      bookings: userBookings.slice(0, 10),
      properties: userProperties,
      reviews: userReviews.slice(0, 10),
    },
  });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request);
  if ('error' in auth) return auth.error;

  const user = seedUsers.find(u => u._id === params.id);
  if (!user) {
    return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
  }

  const body = await request.json();
  const { action } = body;

  if (action === 'ban') {
    banUser(user._id);
    addActivityLog({
      action: 'user_banned',
      performedBy: auth.payload!.userId,
      targetType: 'user',
      targetId: user._id,
      details: `User "${user.name}" (${user.email}) was banned`,
    });
    return NextResponse.json({ success: true, message: `User ${user.name} has been banned` });
  }

  if (action === 'unban') {
    unbanUser(user._id);
    addActivityLog({
      action: 'user_unbanned',
      performedBy: auth.payload!.userId,
      targetType: 'user',
      targetId: user._id,
      details: `User "${user.name}" (${user.email}) was unbanned`,
    });
    return NextResponse.json({ success: true, message: `User ${user.name} has been unbanned` });
  }

  if (action === 'suspend' && user.role === 'host') {
    suspendHost(user._id);
    addActivityLog({
      action: 'host_suspended',
      performedBy: auth.payload!.userId,
      targetType: 'user',
      targetId: user._id,
      details: `Host "${user.name}" (${user.email}) was suspended`,
    });
    return NextResponse.json({ success: true, message: `Host ${user.name} has been suspended` });
  }

  if (action === 'activate' && user.role === 'host') {
    activateHost(user._id);
    addActivityLog({
      action: 'host_activated',
      performedBy: auth.payload!.userId,
      targetType: 'user',
      targetId: user._id,
      details: `Host "${user.name}" (${user.email}) was activated`,
    });
    return NextResponse.json({ success: true, message: `Host ${user.name} has been activated` });
  }

  return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
}
