import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helpers';
import Property from '@/lib/models/Property';
import ActivityLog from '@/lib/models/ActivityLog';
import mongoose from 'mongoose';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = requireAdmin(request);
    if ('error' in auth) return auth.error;

    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid property ID' },
        { status: 400 }
      );
    }

    const property = await Property.findById(params.id);
    if (!property) {
      return NextResponse.json(
        { success: false, message: 'Property not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { action, reason } = body;

    if (action === 'approve') {
      property.moderationStatus = 'approved';
      property.moderatedBy = new mongoose.Types.ObjectId(auth.payload.userId);
      property.moderatedAt = new Date();
      property.moderationReason = undefined;
      await property.save();

      await ActivityLog.create({
        action: 'property_approved',
        performedBy: auth.payload.userId,
        targetType: 'property',
        targetId: property._id.toString(),
        details: `Property "${property.title}" was approved`,
      });

      return NextResponse.json(
        { success: true, message: `Property "${property.title}" has been approved` },
        { status: 200 }
      );
    }

    if (action === 'reject') {
      if (!reason) {
        return NextResponse.json(
          { success: false, message: 'Rejection reason is required' },
          { status: 400 }
        );
      }

      property.moderationStatus = 'rejected';
      property.moderationReason = reason;
      property.moderatedBy = new mongoose.Types.ObjectId(auth.payload.userId);
      property.moderatedAt = new Date();
      await property.save();

      await ActivityLog.create({
        action: 'property_rejected',
        performedBy: auth.payload.userId,
        targetType: 'property',
        targetId: property._id.toString(),
        details: `Property "${property.title}" was rejected: ${reason}`,
      });

      return NextResponse.json(
        { success: true, message: `Property "${property.title}" has been rejected` },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action. Use "approve" or "reject"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Property moderation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
