import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireHost } from '@/lib/auth-helpers';
import Property from '@/lib/models/Property';
import Review from '@/lib/models/Review';

interface ReviewSummary {
  total: number;
  averageRating: number;
  distribution: Record<number, number>;
  subRatings: {
    cleanliness: number;
    accuracy: number;
    communication: number;
    location: number;
    value: number;
  };
}

interface PaginationInfo {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

/**
 * GET /api/host/reviews
 * Returns reviews for all properties owned by the host with summary stats and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireHost(request);
    if ('error' in auth) return auth.error;
    const { payload } = auth;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);

    // Get properties owned by this host
    const hostProperties = await Property.find({ host: payload.userId });
    const hostPropertyIds = hostProperties.map((p) => p._id);

    // Get all reviews for these properties
    const allHostReviews = await Review.find({ property: { $in: hostPropertyIds } })
      .populate({
        path: 'guest',
        select: 'name',
      })
      .populate({
        path: 'property',
        select: 'title',
      })
      .sort({ createdAt: -1 });

    // Calculate summary stats
    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalRating = 0;
    let cleanlinessSum = 0;
    let accuracySum = 0;
    let communicationSum = 0;
    let locationSum = 0;
    let valueSum = 0;
    let cleanlinessCount = 0;
    let accuracyCount = 0;
    let communicationCount = 0;
    let locationCount = 0;
    let valueCount = 0;

    allHostReviews.forEach((r) => {
      const rating = r.ratings.overall as keyof typeof distribution;
      distribution[rating]++;
      totalRating += r.ratings.overall;

      if (r.ratings.cleanliness) {
        cleanlinessSum += r.ratings.cleanliness;
        cleanlinessCount++;
      }
      if (r.ratings.accuracy) {
        accuracySum += r.ratings.accuracy;
        accuracyCount++;
      }
      if (r.ratings.communication) {
        communicationSum += r.ratings.communication;
        communicationCount++;
      }
      if (r.ratings.location) {
        locationSum += r.ratings.location;
        locationCount++;
      }
      if (r.ratings.value) {
        valueSum += r.ratings.value;
        valueCount++;
      }
    });

    const count = allHostReviews.length;
    const averageRating = count > 0 ? Math.round((totalRating / count) * 10) / 10 : 0;

    const summary: ReviewSummary = {
      total: count,
      averageRating,
      distribution,
      subRatings: {
        cleanliness: cleanlinessCount > 0 ? Math.round((cleanlinessSum / cleanlinessCount) * 10) / 10 : 0,
        accuracy: accuracyCount > 0 ? Math.round((accuracySum / accuracyCount) * 10) / 10 : 0,
        communication:
          communicationCount > 0 ? Math.round((communicationSum / communicationCount) * 10) / 10 : 0,
        location: locationCount > 0 ? Math.round((locationSum / locationCount) * 10) / 10 : 0,
        value: valueCount > 0 ? Math.round((valueSum / valueCount) * 10) / 10 : 0,
      },
    };

    // Paginate
    const pages = Math.ceil(count / limit);
    const startIdx = (page - 1) * limit;
    const paginatedReviews = allHostReviews.slice(startIdx, startIdx + limit);

    const pagination: PaginationInfo = {
      total: count,
      page,
      pages,
      limit,
    };

    return NextResponse.json({
      success: true,
      data: paginatedReviews,
      summary,
      pagination,
    });
  } catch (error) {
    console.error('Error fetching host reviews:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch reviews' }, { status: 500 });
  }
}
