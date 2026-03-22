import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Property from '@/lib/models/Property';

/**
 * GET /api/properties/cities
 * Returns list of distinct cities from approved, active properties
 */
export async function GET() {
  try {
    await dbConnect();

    const cities = await Property.distinct('location.city', {
      isActive: true,
      moderationStatus: 'approved',
    });

    // Sort cities alphabetically
    const sortedCities = cities.sort();

    return NextResponse.json({
      success: true,
      data: sortedCities,
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch cities' }, { status: 500 });
  }
}
