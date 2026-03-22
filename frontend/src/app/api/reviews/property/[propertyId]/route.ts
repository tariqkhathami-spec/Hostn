import { NextRequest, NextResponse } from 'next/server';
import { reviews } from '@/lib/data/seed-properties';

/**
 * GET /api/reviews/property/:propertyId
 * Gets reviews for a property
 */
export async function GET(request: NextRequest, { params }: { params: { propertyId: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const propertyReviews = reviews.filter((r) => {
      const propId = typeof r.property === 'string' ? r.property : r.property._id;
      return propId === params.propertyId;
    });

    // Paginate
    const total = propertyReviews.length;
    const start = (page - 1) * limit;
    const paginated = propertyReviews.slice(start, start + limit);

    return NextResponse.json({
      success: true,
      data: paginated,
      pagination: { total, page, pages: Math.ceil(total / limit), limit },
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch reviews' }, { status: 500 });
  }
}
