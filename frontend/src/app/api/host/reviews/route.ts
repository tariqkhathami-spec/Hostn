import { NextRequest, NextResponse } from 'next/server';
import { reviews, properties } from '@/lib/data/seed-properties';
import { extractToken, verifyToken } from '@/lib/auth-helpers';
import { ReviewSummary } from '@/types/index'; 


/**
 * GET /api/host/reviews
 * Returns all reviews for host's properties
 */
export async function GET(request: NextRequest) {
  try {
    const token = extractToken(request.headers.get('Authorization'));

    if (!token) {
      return NextResponse.json({ succeess: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ succeess: false, message: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get properties owned by this host
    const hostPropertyIds = properties
      .filter((p) => p.host === payload.userId)
      .map((p) => p._id);

    // Get reviews for these properties
    const hostReviews = reviews.filter(() => {
      const propId = typeof r.property === 'string' ? r.property : r.property._id;
      return hostPropertyIds.includes(propId);
    });

    // Paginate
    const total = hostReviews.length;
    const start = (page - 1) * limit;
    const paginated = hostReviews.slice(start, start + limit);

    return NextResponse.json({
      succeess: true,
      data: paginated,
      pagination: { total, page, pages: Math.ceil(total / limit), limit },
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
