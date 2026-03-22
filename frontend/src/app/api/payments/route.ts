import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helpers';
import Payment from '@/lib/models/Payment';
import mongoose from 'mongoose';

interface PaginationQuery {
  page?: string;
  limit?: string;
  status?: string;
  provider?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * GET /api/payments
 * Admin only - Returns payment records with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const auth = requireAdmin(request);
    if ('error' in auth) return auth.error;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status');
    const provider = searchParams.get('provider');
    const paymentMethod = searchParams.get('paymentMethod');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, message: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    // Build filter object
    const filter: Record<string, any> = {};

    if (status) {
      filter.status = status;
    }

    if (provider) {
      filter.provider = provider;
    }

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    // Add date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Execute queries in parallel
    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('booking', 'status paymentStatus checkIn checkOut pricing')
        .populate('user', 'name email')
        .populate('property', 'title location')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(filter),
    ]);

    // Calculate summary statistics
    const [totalPaidResult, totalPendingResult, totalFailedResult, totalRefundedResult] =
      await Promise.all([
        Payment.aggregate([
          { $match: { status: 'paid' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Payment.aggregate([
          { $match: { status: 'pending' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Payment.aggregate([
          { $match: { status: 'failed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Payment.aggregate([
          { $match: { status: 'refunded' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

    const stats = {
      totalPaid: totalPaidResult[0]?.total || 0,
      totalPending: totalPendingResult[0]?.total || 0,
      totalFailed: totalFailedResult[0]?.total || 0,
      totalRefunded: totalRefundedResult[0]?.total || 0,
      count: total,
    };

    return NextResponse.json(
      {
        success: true,
        data: payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        stats,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
