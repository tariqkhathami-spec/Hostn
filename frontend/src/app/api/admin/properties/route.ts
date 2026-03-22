import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helpers';
import Property from '@/lib/models/Property';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if ('error' in auth) return auth.error;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '10'));
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const city = searchParams.get('city');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;
    const filter: any = {};

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.moderationStatus = status;
    }

    if (type) {
      filter.type = type;
    }

    if (city) {
      filter['location.city'] = { $regex: city, $options: 'i' };
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } },
      ];
    }

    const totalCount = await Property.countDocuments(filter);
    const properties = await Property.find(filter)
      .populate('host', 'name email')
      .populate('moderatedBy', 'name email')
      .sort({ moderationStatus: 'asc', createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json(
      {
        success: true,
        data: properties,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Admin properties list error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
