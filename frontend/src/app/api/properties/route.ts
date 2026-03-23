import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Property from '@/lib/models/Property';
import User from '@/lib/models/User';
import ActivityLog from '@/lib/models/ActivityLog';
import { extractToken, verifyToken } from '@/lib/auth-helpers';
import { escapeRegex, sanitizeText } from '@/lib/sanitize';
import { createPropertySchema } from '@/lib/validation';

/**
 * GET /api/properties
 * Filters and paginates properties
 * Query params: city, type, featured, limit, page, minPrice, maxPrice, guests, search, sort
 *
 * IMPORTANT: Only returns properties that are:
 * - Active (isActive === true)
 * - Approved by moderation (moderationStatus === 'approved')
 * - Not owned by a suspended host
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);

    const city = searchParams.get('city');
    const type = searchParams.get('type');
    const featured = searchParams.get('featured') === 'true';
    const minPrice = searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : null;
    const maxPrice = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : null;
    const guests = searchParams.get('guests') ? parseInt(searchParams.get('guests')!) : null;
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'rating';
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 50);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);

    // Build filter query
    const filter: any = {
      isActive: true,
      moderationStatus: 'approved',
    };

    if (city) {
      // SECURITY: Escape regex special characters to prevent ReDoS
      filter['location.city'] = { $regex: escapeRegex(city), $options: 'i' };
    }

    if (type) {
      filter.type = type;
    }

    if (featured) {
      filter.isFeatured = true;
    }

    if (minPrice !== null) {
      filter['pricing.perNight'] = { ...filter['pricing.perNight'], $gte: minPrice };
    }

    if (maxPrice !== null) {
      filter['pricing.perNight'] = { ...filter['pricing.perNight'], $lte: maxPrice };
    }

    if (guests !== null) {
      filter['capacity.maxGuests'] = { $gte: guests };
    }

    if (search) {
      filter.$text = { $search: search };
    }

    // Get suspended host IDs
    const suspendedHosts = await User.find({ isSuspended: true }).select('_id');
    const suspendedHostIds = suspendedHosts.map((h) => h._id);

    // Add filter to exclude suspended hosts
    if (suspendedHostIds.length > 0) {
      filter.host = { $nin: suspendedHostIds };
    }

    // Build sort object
    let sortObj: any = { 'ratings.average': -1 };
    if (sort === 'price_asc') {
      sortObj = { 'pricing.perNight': 1 };
    } else if (sort === 'price_desc') {
      sortObj = { 'pricing.perNight': -1 };
    } else if (sort === 'rating') {
      sortObj = { 'ratings.average': -1 };
    } else if (sort === 'newest') {
      sortObj = { createdAt: -1 };
    }

    // Get total count
    const total = await Property.countDocuments(filter);
    const pages = Math.ceil(total / limit);

    // Fetch properties with pagination
    const properties = await Property.find(filter)
      .populate('host', 'name avatar email phone createdAt')
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: properties,
      pagination: { page, limit, total, pages },
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch properties' }, { status: 500 });
  }
}

/**
 * POST /api/properties
 * Creates a new property listing (host only)
 * New properties start with 'pending' moderation status and must be approved by admin
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const token = extractToken(request.headers.get('Authorization'));
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'host') {
      return NextResponse.json({ success: false, message: 'Only hosts can create properties' }, { status: 403 });
    }

    const body = await request.json();

    // Validate input with Zod
    const parsed = createPropertySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      type,
      city,
      district,
      address,
      images,
      amenities,
      perNight,
      cleaningFee,
      maxGuests,
      bedrooms,
      bathrooms,
      beds,
      rules,
      tags,
    } = parsed.data;

    // Sanitize text fields to prevent stored XSS
    const sanitizedTitle = sanitizeText(title);
    const sanitizedDescription = sanitizeText(description || '');

    const newProperty = new Property({
      host: payload.userId,
      title: sanitizedTitle,
      description: sanitizedDescription,
      type,
      location: {
        city,
        district: district || '',
        address: address || '',
        coordinates: { lat: 24.7136, lng: 46.6753 },
      },
      images: images || [{ url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', caption: title, isPrimary: true }],
      amenities: amenities || ['wifi', 'parking'],
      pricing: {
        perNight,
        cleaningFee: cleaningFee || 0,
        discountPercent: 0,
        weeklyDiscount: 0,
      },
      capacity: {
        maxGuests: maxGuests || 4,
        bedrooms: bedrooms || 1,
        bathrooms: bathrooms || 1,
        beds: beds || 1,
      },
      rules: rules || {
        minNights: 1,
        maxNights: 30,
        checkInTime: '14:00',
        checkOutTime: '12:00',
        smokingAllowed: false,
        petsAllowed: false,
        partiesAllowed: false,
      },
      ratings: { average: 0, count: 0 },
      moderationStatus: 'pending',
      isActive: true,
      isFeatured: false,
      tags: tags || [],
      unavailableDates: [],
    });

    const savedProperty = await newProperty.save();

    // Log the activity
    await ActivityLog.create({
      action: 'property_created',
      performedBy: payload.userId,
      targetType: 'property',
      targetId: savedProperty._id.toString(),
      details: `New property "${title}" submitted for review`,
    });

    return NextResponse.json(
      {
        success: true,
        data: savedProperty,
        message: 'Property submitted for review',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating property:', error);
    return NextResponse.json({ success: false, message: 'Failed to create property' }, { status: 500 });
  }
}
