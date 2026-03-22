import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Review from '@/lib/models/Review';
import mongoose from 'mongoose';

/**
 * GET /api/reviews/property/:propertyId
 * Returns reviews for a specific property with pagination (PUBLIC)
 * Populates guest details, sorts by creation date (newest first)
 * Default limit: 10, max limit: 50
 */
export async function GET(request: NextRequest, { params }: { params: { propertyId: string } }) {
  try {
    await dbConnect();

    // Validate property ID format
    if (!mongoose.Types.ObjectId.isValid(params.propertyId)) {
      return NextResponse.json({ success: false, message: 'Invalid property ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    // Query reviews with pagination
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Review.find({ property: new mongoose.Types.ObjectId(params.propertyId) })
        .populate('guest', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments({ property: new mongoose.Types.ObjectId(params.propertyId) }),
    ]);

    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    });
  } catch (error) {
    console.error('Error fetching property reviews:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
