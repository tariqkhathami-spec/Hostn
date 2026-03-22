import { NextRequest, NextResponse } from 'next/server';
import { properties } from '@/lib/data/seed-properties';

/**
 * GET /api/properties/:id/availability
 * Check availability for a date range
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');

    const property = properties.find((p) => p._id === params.id);

    if (!property) {
      return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 });
    }

    // Simple availability check for seed data - always true
    return NextResponse.json({
      success: true,
      data: {
        available: true,
        propertyId: params.id,
        checkIn,
        checkOut,
      }
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json({ success: false, message: 'Failed to check availability' }, { status: 500 });
  }
}
