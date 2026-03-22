import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Property from '@/lib/models/Property';
import User from '@/lib/models/User';

/**
 * GET /api/properties/:id
 * Returns a single property with populated host details
 * Only returns approved, active properties where host is not suspended
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();

    // Find property
    const property = await Property.findById(params.id).populate('host', 'name avatar email phone createdAt').lean();

    if (!property) {
      return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 });
    }

    // Check moderation status — only show approved properties
    if (property.moderationStatus !== 'approved') {
      return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 });
    }

    // Check if active
    if (!property.isActive) {
      return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 });
    }

    // Check if host is suspended
    if (property.host && (property.host as any).isSuspended) {
      return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: property,
    });
  } catch (error) {
    console.error('Error fetching property:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch property' }, { status: 500 });
  }
}
