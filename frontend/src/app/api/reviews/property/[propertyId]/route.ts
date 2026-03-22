import { NextRequest, NextResponse } from 'next/server';
import { reviews } from '@/lib/data/seed-properties';

/**
 * GET /api/reviews/property/:propertyId
 * Returns reviews for a specific property with pagination
 */
export async function GET(request: NextRequest, { params }: { params: { propertyId: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);

    const propertyReviews = reviews.filter((r) => {
      const propId = typeof r.property === 'string' ? r.property : r.property._id;
      return propId === params.propertyId;
    });

    // Sort by date (newest first)
    propertyReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paginate
    const total = propertyReviews.length;
    const pages = Math.ceil(total / limit);
    const startIdx = (page - 1) * limit;
    const data = propertyReviews.slice(startIdx, startIdx + limit);

    return NextResponse.json({
      success: true,
      data,
      pagination: { total, page, pages, limit },
    });
  } catch (error) {
    console.error('Error fetching property reviews:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
