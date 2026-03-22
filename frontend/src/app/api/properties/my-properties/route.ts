import { NextRequest, NextResponse } from 'next/server';
import { properties, users } from '@/lib/data/seed-properties';
import { extractToken, verifyToken } from '@/lib/auth-helpers';

/**
 * GET /api/properties/my-properties
 * Returns properties owned by the authenticated host
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

    // Get host's properties
    const hostProperties = properties.filter((p) => p.host === payload.userId);

    // Populate host details
    const withHosts = hostProperties.map((prop) => ({
      ...prop,
      host:
        typeof prop.host === 'string' ? users.find((u) => u._id === prop.host) || prop.host : prop.host,
    }));

    return NextResponse.json({
      success: true,
      data: withHosts,
    });
  } catch (error) {
    console.error('Error fetching my properties:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch properties' },
      { status: 500 }
    );
  }
}
