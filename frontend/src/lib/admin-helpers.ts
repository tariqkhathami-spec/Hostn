import { NextResponse } from 'next/server';
import { verifyToken } from './auth-helpers';
import { AdminActivityLog } from '@/types/index';

/**
 * Verify that the request is from an authenticated admin user.
 * Returns the token payload if valid, or a NextResponse error.
 */
export function requireAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 }) };
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    return { error: NextResponse.json({ success: false, message: 'Invalid or expired token' }, { status: 401 }) };
  }

  if (payload.role !== 'admin') {
    return { error: NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 }) };
  }

  return { payload };
}

// ─── In-Memory Activity Log Store ─────────────────────────────────────────────
// In production, this would be a database collection

let activityLogs: AdminActivityLog[] = [
  {
    _id: 'log_001',
    action: 'property_created',
    performedBy: 'system',
    targetType: 'property',
    targetId: '507f191e810c19729de860ea',
    details: 'Property "Luxury Villa with Private Pool in Al Olaya" was listed',
    createdAt: '2024-03-20T10:30:00Z',
  },
  {
    _id: 'log_002',
    action: 'booking_created',
    performedBy: '607f1f77bcf86cd799439001',
    targetType: 'booking',
    targetId: 'book_001',
    details: 'New booking created for "Luxury Villa with Private Pool in Al Olaya"',
    createdAt: '2024-03-19T14:20:00Z',
  },
  {
    _id: 'log_003',
    action: 'review_created',
    performedBy: '607f1f77bcf86cd799439002',
    targetType: 'review',
    targetId: '707f1f77bcf86cd799439001',
    details: 'New review (4.8★) for "Luxury Villa with Private Pool in Al Olaya"',
    createdAt: '2024-03-18T09:15:00Z',
  },
  {
    _id: 'log_004',
    action: 'property_approved',
    performedBy: '907f1f77bcf86cd799439001',
    targetType: 'property',
    targetId: '507f191e810c19729de860eb',
    details: 'Property "Modern Studio in Al Malqa" approved by admin',
    createdAt: '2024-03-17T16:45:00Z',
  },
  {
    _id: 'log_005',
    action: 'booking_created',
    performedBy: '607f1f77bcf86cd799439003',
    targetType: 'booking',
    targetId: 'book_002',
    details: 'New booking created for "Modern Studio in Al Malqa"',
    createdAt: '2024-03-16T11:30:00Z',
  },
];

export function getActivityLogs(): AdminActivityLog[] {
  return [...activityLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function addActivityLog(log: Omit<AdminActivityLog, '_id' | 'createdAt'>): AdminActivityLog {
  const newLog: AdminActivityLog = {
    ...log,
    _id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  activityLogs.unshift(newLog);
  // Keep last 500 logs
  if (activityLogs.length > 500) {
    activityLogs = activityLogs.slice(0, 500);
  }
  return newLog;
}

// ─── Moderation State ─────────────────────────────────────────────────────────
// Tracks property moderation status (in-memory, would be in DB in production)

interface ModerationEntry {
  propertyId: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  moderatedBy?: string;
  moderatedAt?: string;
}

const moderationState: Map<string, ModerationEntry> = new Map();

export function getPropertyModeration(propertyId: string): ModerationEntry {
  return moderationState.get(propertyId) || {
    propertyId,
    status: 'approved', // Existing properties default to approved
    moderatedAt: '2024-01-01T00:00:00Z',
    moderatedBy: 'system',
  };
}

export function setPropertyModeration(entry: ModerationEntry): void {
  moderationState.set(entry.propertyId, entry);
}

export function getAllModerations(): Map<string, ModerationEntry> {
  return moderationState;
}

// ─── User Ban State ───────────────────────────────────────────────────────────

const bannedUsers: Set<string> = new Set();

export function isUserBanned(userId: string): boolean {
  return bannedUsers.has(userId);
}

export function banUser(userId: string): void {
  bannedUsers.add(userId);
}

export function unbanUser(userId: string): void {
  bannedUsers.delete(userId);
}

// ─── Host Suspension State ────────────────────────────────────────────────────

const suspendedHosts: Set<string> = new Set();

export function isHostSuspended(hostId: string): boolean {
  return suspendedHosts.has(hostId);
}

export function suspendHost(hostId: string): void {
  suspendedHosts.add(hostId);
}

export function activateHost(hostId: string): void {
  suspendedHosts.delete(hostId);
}
