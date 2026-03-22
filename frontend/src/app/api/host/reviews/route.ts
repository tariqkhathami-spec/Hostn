import { NextRequest, NextResponse } from 'next/server';
import { reviews, properties } from '@/lib/data/seed-properties';
import { extractToken, verifyToken } from '@/lib/auth-helpers';
import { ReviewSummary } from '@/types/index';

/**
 * GET /api/host/reviews
 * Returns reviews for all properties owned by the host with summary stats
 */
export async function GET(request: NextRequest) {
  try {
    const token = extractToken(request.headers.get('Authorization'));

    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);

    // Get properties owned by this host
    const hostPropertyIds = properties
      .filter((p) => p.host === payload.userId)
      .map((p) => p._id);

    // Get reviews for these properties
    const hostReviews = reviews.filter((r) => {
      const propId = typeof r.property === 'string' ? r.property : r.property._id;
      return hostPropertyIds.includes(propId);
    });

    // Sort by date (newest first)
    hostReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Calculate summary
    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalRating = 0;
    let cleanlinessSum = 0;
    let accuracySum = 0;
    let communicationSum = 0;
    let locationSum = 0;
    let valueSum = 0;

    hostReviews.forEach((r) => {
      distribution[r.ratings.overall as keyof typeof distribution]++;
      totalRating += r.ratings.overall;
      if (r.ratings.cleanliness) cleanlinessSum += r.ratings.cleanliness;
      if (r.ratings.accuracy) accuracySum += r.ratings.accuracy;
      if (r.ratings.communication) communicationSum += r.ratings.communication;
      if (r.ratings.location) locationSum += r.ratings.location;
      if (r.ratings.value) valueSum += r.ratings.value;
    });

    const count = hostReviews.length;
    const averageRating = count > 0 ? Math.round((totalRating / count) * 10) / 10 : 0;

    const summary: ReviewSummary = {
      total: count,
      averageRating,
      distribution,
      subRatings: {
        cleanliness: count > 0 ? Math.round((cleanlinessSum / count) * 10) / 10 : 0,
        accuracy: count > 0 ? Math.round((accuracySum / count) * 10) / 10 : 0,
        communication: count > 0 ? Math.round((communicationSum / count) * 10) / 10 : 0,
        location: count > 0 ? Math.round((locationSum / count) * 10) / 10 : 0,
        value: count > 0 ? Math.round((valueSum / count) * 10) / 10 : 0,
      },
    };

    // Paginate
    const total = count;
    const pages = Math.ceil(total / limit);
    const startIdx = (page - 1) * limit;
    const data = hostReviews.slice(startIdx, startIdx + limit);

    return NextResponse.json({
      success: true,
      data,
      summary,
      pagination: { total, page, pages, limit },
    });
  } catch (error) {
    console.error('Error fetching host reviews:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch reviews' }, { status: 500 });
  }
}
