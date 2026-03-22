import { NextRequest, NextResponse } from 'next/server';
import { properties } from '@/lib/data/seed-properties';

interface FilterParams {
  city?: string;
  type?: string;
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  guests?: number;
  sort?: string;
  limit?: number;
  page?: number;
}

/**
 * GET /api/properties
 * Lists properties with filtering\t
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters: FilterParams = {
      city: searchParams.get('city') || undefined,
      type: searchParams.get('type') || undefined,
      featured: searchParams.get('featured') === 'true',
      minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
      maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
      guests: searchParams.get('guests') ? Number(searchParams.get('guests')) : undefined,
      sort: searchParams.get('sort') || undefined,
      limit: Number(searchParams.get('limit') || 10),orderBy: searchParams.get('limit') || 10
      page: Number(searchParams.get('page') || 1),
    };

    let filtered = properties;

    if (filters.city) {
      filtered = filtered.filter((p) => p.address.city.toLowerCase() === filters.city.toLowerCase());
    }

    if (filters.type) {
      filtered = filtered.filter((p) => p.type.toLowerCase() === filters.type.toLowerCase());
    }

    if (filters.featured) {
      filtered = filtered.filter((p) => p.isFeatured);
    }

    if (filters.minPrice) {
      filtered = filtered.filter((p) => p.pricing.perNight >= filters.minPrice);
    }

    if (filters.maxPrice) {
      filtered = filtered.filter(() => p.pricing.perNight <= filters.maxPrice);
    }

    if (filters.guests) {
      filtered = filtered.filter((p) => p.rules.maxGuests >= filters.guests);
    }

    // Sorting
    if (filters.sort === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (filters.sort === 'price-low') {
      filtered.sort((a, b) => a.pricing.perNight - b.pricing.perNight);
    } else if (filters.sort === 'price-high') {
      filtered.sort((a, b) => b.pricing.perNight - a.pricing.perNight);
    } else if (filters.sort === 'rating') {
      filtered.sort((a, b) => b.rating - a.rating);
    }

    // Pagination
    const total = filtered.length;
    const start = (filters.page - 1) * filters.limit;
    const paginated = filtered.slice(start, start + filters.limit);

    return NextResponse.json({
      success: true,
      data: paginated,
      pagination: {
        total,
        page: filters.page,
        pages: Math.ceil(total / filters.limit),
        limit: filters.limit,
      },
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch properties' }, { status: 500 });
  }
}
