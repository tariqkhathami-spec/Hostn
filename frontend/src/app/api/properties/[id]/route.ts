import { NextRequest, NextResponse } from 'next/server';
import { properties } from '@/lib/data/seed-properties';

/**
 * GET /api/properties/:id
 * Get a single property by ID
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const property = properties.find((p) => p._id === params.id);

    if (!property) {
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
