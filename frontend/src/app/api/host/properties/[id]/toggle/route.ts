import { NextRequest, NextResponse } from 'next/server';
import { properties } from '@/lib/data/seed-properties';
import { extractToken, verifyToken } from '@/lib/auth-helpers';

/**
 * PUT /api/host/properties/:id/toggle
 * Toggles the active status of a property
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = extractToken(request.headers.get('Authorization'));

    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    const propertyIndex = properties.findIndex((p) => p._id === params.id);

    if (propertyIndex === -1) {
      return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 });
    }

    const property = properties[propertyIndex];

    // Verify host ownership
    if (property.host !== payload.userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    // Toggle active status
    property.isActive = !property.isActive;

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
