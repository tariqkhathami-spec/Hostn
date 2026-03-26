import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireHost } from '@/lib/auth-helpers';
import Property from '@/lib/models/Property';
import mongoose from 'mongoose';

/**
 * PUT /api/host/properties/:id/toggle
 * Toggles the active status of a property
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireHost(request);
    if ('error' in auth) return auth.error;
    const { payload } = auth;

    await dbConnect();

    // Validate property ID
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, message: 'Invalid property ID' }, { status: 400 });
    }

    const propertyId = new mongoose.Types.ObjectId(params.id);

    // Find the property
    const property = await Property.findById(propertyId);

    if (!property) {
      return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 });
    }

    // Verify host ownership
    if (!property.host.equals(new mongoose.Types.ObjectId(payload.userId))) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    // Toggle active status
    property.isActive = !property.isActive;
    await property.save();

    return NextResponse.json({
      success: true,
      data: property,
      message: `Property ${property.isActive ? 'activated' : 'deactivated'}`,
    });
  } catch (error) {
    console.error('Error toggling property status:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to toggle property status' },
      { status: 500 }
    );
  }
}
