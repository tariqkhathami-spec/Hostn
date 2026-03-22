import { NextResponse } from 'next/server';
import { requireAdmin, getActivityLogs } from '@/lib/admin-helpers';
import { seedUsers } from '@/lib/data/seed-properties';

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  let logs = getActivityLogs();

  // Filter by action type
  if (action && action !== 'all') {
    logs = logs.filter(l => l.action === action);
  }

  // Enrich with performer name
  const enrichedLogs = logs.map(log => {
    const performer = seedUsers.find(u => u._id === log.performedBy);
    return {
      ...log,
      performerName: performer?.name || (log.performedBy === 'system' ? 'System' : 'Unknown'),
    };
  });

  const total = enrichedLogs.length;
  const startIdx = (page - 1) * limit;
  const paginatedLogs = enrichedLogs.slice(startIdx, startIdx + limit);

  return NextResponse.json({
    success: true,
    data: paginatedLogs,
    pagination: { total, page, pages: Math.ceil(total / limit), limit },
  });
}
