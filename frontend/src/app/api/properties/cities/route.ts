import { NextResponse } from 'next/server';
import { properties } from '@/lib/data/seed-properties';

/**
 * GET /api/properties/cities
 * Returns list of distinct cities from properties
 */
export async function GET() {
  try {
    const cities = Array.from(new Set(properties.map((p) => p.location.city))).sort();

    return NextResponse.json({
      success: true,
      data: cities,
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch cities' }, { status: 500 });
  }
}
