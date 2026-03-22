import { NextRequest, NextResponse } from 'next/server';
import { properties, users } from '@/lib/data/seed-properties';
import { Property, User } from '@/types/index';

/**
 * GET /api/properties
 * Filters and paginates properties
 * Query params: city, type, featured, limit, page, minPrice, maxPrice, guests, sort
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
      if (city && prop.location.city.toLowerCase() !== city.toLowerCase()) return false;
      if (type && prop.type !== type) return false;
      if (featured && !prop.isFeatured) return false;
      if (minPrice !== null && prop.pricing.perNight < minPrice) return false;
      if (maxPrice !== null && prop.pricing.perNight > maxPrice) return false;
      if (guests !== null && prop.capacity.maxGuests < guests) return false;
      if (!prop.isActive) return false;
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
