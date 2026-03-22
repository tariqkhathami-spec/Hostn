import { NextRequest, NextResponse } from 'next/server';
import { properties, users } from '@/lib/data/seed-properties';
import { getPropertyModeration, isHostSuspended } from '@/lib/admin-helpers';

/**
 * GET /api/properties/:id
 * Returns a single property with populated host details
 * Only returns approved, non-suspended properties to public users
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const property = properties.find((p) => p._id === params.id);

    if (!property) {
      return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 });
    }

    // Check moderation status — rejected/pending properties should not be accessible publicly
    const moderation = getPropertyModeration(property._id);
    if (moderation.status !== 'approved') {
      return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 });
    }

    // Check if host is suspended
    const hostId = typeof property.host === 'string' ? property.host : property.host._id;
    if (isHostSuspended(hostId)) {
      return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 });
    }

    // Populate host details
    const host = typeof property.host === 'string' ? users.find((u) => u._id === property.host) : property.host;

    return NextResponse.json({
      success: true,
      data: {
        ...property,
        host,
      },
    });
  } catch (error) {
    console.error('Error fetching property:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch property' }, { status: 500 });
  }
}
