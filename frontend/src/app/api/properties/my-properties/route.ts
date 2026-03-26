import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Property from '@/lib/models/Property';
import { requireHost } from '@/lib/auth-helpers';

/**
 * GET /api/properties/my-properties
 * Returns ALL properties owned by the authenticated host (regardless of moderation status)
 * Requires host or admin role
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const auth = await requireHost(request);
    if ('error' in auth) {
      return auth.error;
    }

    // Get all properties for this host
    const properties = await Property.find({ host: auth.payload.userId })
      .populate('host', 'name avatar email phone createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: properties,
    });
  } catch (error) {
    console.error('Error fetching my properties:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch properties' },
      { status: 500 }
    );
  }
}
