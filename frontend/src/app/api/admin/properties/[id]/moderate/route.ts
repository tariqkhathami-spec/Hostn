import { NextResponse } from 'next/server';
import { requireAdmin, setPropertyModeration, addActivityLog } from '@/lib/admin-helpers';
import { seedProperties } from '@/lib/data/seed-properties';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request);
  if ('error' in auth) return auth.error;

  const property = seedProperties.find(p => p._id === params.id);
  if (!property) {
    return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 });
  }

  const body = await request.json();
  const { action, reason } = body;

  if (action === 'approve') {
    setPropertyModeration({
      propertyId: params.id,
      status: 'approved',
      moderatedBy: auth.payload!.userId,
      moderatedAt: new Date().toISOString(),
    });

    addActivityLog({
      action: 'property_approved',
      performedBy: auth.payload!.userId,
      targetType: 'property',
      targetId: params.id,
      details: `Property "${property.title}" was approved`,
    });

    return NextResponse.json({ success: true, message: `Property "${property.title}" has been approved` });
  }

  if (action === 'reject') {
    if (!reason) {
      return NextResponse.json({ success: false, message: 'Rejection reason is required' }, { status: 400 });
    }

    setPropertyModeration({
      propertyId: params.id,
      status: 'rejected',
      rejectionReason: reason,
      moderatedBy: auth.payload!.userId,
      moderatedAt: new Date().toISOString(),
    });

    addActivityLog({
      action: 'property_rejected',
      performedBy: auth.payload!.userId,
      targetType: 'property',
      targetId: params.id,
      details: `Property "${property.title}" was rejected: ${reason}`,
    });

    return NextResponse.json({ success: true, message: `Property "${property.title}" has been rejected` });
  }

  return NextResponse.json({ success: false, message: 'Invalid action. Use "approve" or "reject"' }, { status: 400 });
}
