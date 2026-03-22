import { NextRequest, NextResponse } from 'next/server';
import { properties } from '@/lib/data/seed-properties';

/**
 * GET /api/properties/cities
 * Gets list of distinct cities
 */
export async function GET(request: NextRequest) {
  try {
    const cities = [...new Set(properties.map((p) => p.address.city))];

    return NextResponse.json({
      success: true,
      data: cities,
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch cities' }, { status: 500 });
  }
}
