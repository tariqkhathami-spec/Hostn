import { NextRequest, NextResponse } from 'next/server';
import { properties, users } from '@/lib/data/seed-properties';
import { Property, User } from '@/types/index';
import { getPropertyModeration, isHostSuspended, setPropertyModeration, addActivityLog } from '@/lib/admin-helpers';
import { extractToken, verifyToken } from '@/lib/auth-helpers';

/**
 * GET /api/properties
 * Filters and paginates properties
 * Query params: city, type, featured, limit, page, minPrice, maxPrice, guests, sort
 *
 * IMPORTANT: Only returns properties that are:
 * - Active (isActive === true)
 * - Approved by moderation (not pending or rejected)
 * - Not owned by a suspended host
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const city = searchParams.get('city');
    const type = searchParams.get('type');
    const featured = searchParams.get('featured') === 'true';
    const minPrice = searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : null;
    const maxPrice = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : null;
    const guests = searchParams.get('guests') ? parseInt(searchParams.get('guests')!) : null;
    const sort = searchParams.get('sort') || 'newest';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);

    // Filter properties
    let filtered = properties.filter((prop) => {
      if (!prop.isActive) return false;

      // CRITICAL: Only show approved properties to public
      const moderation = getPropertyModeration(prop._id);
      if (moderation.status !== 'approved') return false;

      // CRITICAL: Hide properties from suspended hosts
      const hostId = typeof prop.host === 'string' ? prop.host : prop.host._id;
      if (isHostSuspended(hostId)) return false;

      if (city && prop.location.city.toLowerCase() !== city.toLowerCase()) return false;
      if (type && prop.type !== type) return false;
      if (featured && !prop.isFeatured) return false;
      if (minPrice !== null && prop.pricing.perNight < minPrice) return false;
      if (maxPrice !== null && prop.pricing.perNight > maxPrice) return false;
      if (guests !== null && prop.capacity.maxGuests < guests) return false;
      return true;
    });

    // Sort
    if (sort === 'price-low') {
      filtered.sort((a, b) => a.pricing.perNight - b.pricing.perNight);
    } else if (sort === 'price-high') {
      filtered.sort((a, b) => b.pricing.perNight - a.pricing.perNight);
    } else if (sort === 'rating') {
      filtered.sort((a, b) => b.ratings.average - a.ratings.average);
    } else {
      // newest (default)
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // Populate host details
    const withHosts = filtered.map((prop) => ({
      ...prop,
      host:
        typeof prop.host === 'string' ? users.find((u) => u._id === prop.host) || prop.host : prop.host,
    }));

    // Paginate
    const total = withHosts.length;
    const pages = Math.ceil(total / limit);
    const startIdx = (page - 1) * limit;
    const data = withHosts.slice(startIdx, startIdx + limit);

    return NextResponse.json({
      success: true,
      data,
      pagination: { total, page, pages, limit },
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
    const token = extractToken(request.headers.get('Authorization'));
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'host') {
      return NextResponse.json({ success: false, message: 'Only hosts can create properties' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, type, city, district, address, images, amenities, perNight, cleaningFee, maxGuests, bedrooms, bathrooms, beds } = body;

    if (!title || !type || !city || !perNight) {
      return NextResponse.json({ success: false, message: 'Title, type, city, and price per night are required' }, { status: 400 });
    }

    const newPropertyId = `prop_${Date.now()}`;
    const newProperty = {
      _id: newPropertyId,
      host: payload.userId,
      title,
      description: description || '',
      type: type || 'villa',
      location: {
        city: city || '',
        district: district || '',
        address: address || '',
        coordinates: { lat: 24.7136, lng: 46.6753 },
      },
      images: images || [{ url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', caption: title, isPrimary: true }],
      amenities: amenities || ['wifi', 'parking'],
      pricing: {
        perNight: perNight || 500,
        cleaningFee: cleaningFee || 100,
        discountPercent: 0,
      },
      capacity: {
        maxGuests: maxGuests || 4,
        bedrooms: bedrooms || 1,
        bathrooms: bathrooms || 1,
        beds: beds || 1,
      },
      rules: { minNights: 1, maxNights: 30, checkInTime: '15:00', checkOutTime: '11:00' },
      ratings: { average: 0, count: 0 },
      isActive: true,
      isFeatured: false,
      tags: [],
      createdAt: new Date().toISOString(),
    };

    // Add to properties array
    properties.push(newProperty as unknown as Property);

    // CRITICAL: Set moderation status to 'pending' — property will NOT appear publicly until admin approves
    setPropertyModeration({
      propertyId: newPropertyId,
      status: 'pending',
    });

    // Log the activity
    addActivityLog({
      action: 'property_created',
      performedBy: payload.userId,
      targetType: 'property',
      targetId: newPropertyId,
      details: `New property "${title}" submitted for review`,
    });

    return NextResponse.json(
      {
        success: true,
        data: newProperty,
        message: 'Property submitted successfully. It will be visible after admin approval.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating property:', error);
    return NextResponse.json({ success: false, message: 'Failed to create property' }, { status: 500 });
  }
}
