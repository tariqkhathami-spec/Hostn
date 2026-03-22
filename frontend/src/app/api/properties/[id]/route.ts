import { NextRequest, NextResponse } from 'next/server';
import { properties, users } from '@/lib/data/seed-properties';

/**
 * GET /api/properties/:id
 * Returns a single property with populated host details
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const property = properties.find((p) => p._id === params.id);

    if (!property) {
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
