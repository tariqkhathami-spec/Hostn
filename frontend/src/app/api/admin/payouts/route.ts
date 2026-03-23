import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helpers';
import Payment from '@/lib/models/Payment';
import Payout from '@/lib/models/Payout';
import mongoose from 'mongoose';

/**
 * GET /api/admin/payouts
 * List all host payouts with filtering and summary.
 *
 * Query: ?status=pending&page=1&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if ('error' in auth) return auth.error;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));
    const status = searchParams.get('status');
    const skip = (page - 1) * limit;

    const filter: Record<string, string> = {};
    if (status && ['pending', 'paid', 'failed'].includes(status)) {
      filter.status = status;
    }

    const [payouts, totalCount] = await Promise.all([
      Payout.find(filter)
        .populate('host', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payout.countDocuments(filter),
    ]);

    // Summary stats
    const summary = await Payout.aggregate([
      {
        $group: {
          _id: '$status',
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const summaryMap: Record<string, { total: number; count: number }> = {};
    summary.forEach((s: { _id: string; total: number; count: number }) => {
      summaryMap[s._id] = { total: s.total, count: s.count };
    });

    return NextResponse.json({
      success: true,
      data: payouts,
      summary: {
        pendingAmount: summaryMap.pending?.total || 0,
        pendingCount: summaryMap.pending?.count || 0,
        paidAmount: summaryMap.paid?.total || 0,
        paidCount: summaryMap.paid?.count || 0,
      },
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Admin payouts list error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/payouts
 * Create a payout for a host from their unpaid earnings.
 *
 * Body: { hostId: string, paymentIds?: string[], notes?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if ('error' in auth) return auth.error;

    await dbConnect();

    const body = await request.json();
    const { hostId, paymentIds, notes } = body;

    if (!hostId) {
      return NextResponse.json(
        { success: false, message: 'hostId is required' },
        { status: 400 }
      );
    }

    // Find paid payments for this host that haven't been included in a payout
    const hostObjectId = new mongoose.Types.ObjectId(hostId);
    const filter: Record<string, unknown> = {
      status: 'paid',
    };

    // Find properties owned by this host to get their payments
    const Property = mongoose.models.Property;
    const hostProperties = await Property.find({ host: hostObjectId }).select('_id');
    const propertyIds = hostProperties.map((p: { _id: mongoose.Types.ObjectId }) => p._id);

    filter.property = { $in: propertyIds };

    if (paymentIds && paymentIds.length > 0) {
      filter._id = { $in: paymentIds.map((id: string) => new mongoose.Types.ObjectId(id)) };
    }

    // Exclude payments already in a payout
    const existingPayoutPaymentIds = await Payout.distinct('payments');
    if (existingPayoutPaymentIds.length > 0) {
      filter._id = {
        ...(filter._id as Record<string, unknown> || {}),
        $nin: existingPayoutPaymentIds,
      };
    }

    const payments = await Payment.find(filter);

    if (payments.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No eligible payments found for payout' },
        { status: 400 }
      );
    }

    // Calculate total payout (hostPayout from fees)
    const totalAmount = payments.reduce((sum, p) => sum + (p.fees?.hostPayout || p.amount), 0);

    const payout = await Payout.create({
      host: hostObjectId,
      payments: payments.map(p => p._id),
      totalAmount,
      status: 'pending',
      notes,
      periodStart: payments.reduce((min, p) => (p.createdAt < min ? p.createdAt : min), payments[0].createdAt),
      periodEnd: payments.reduce((max, p) => (p.createdAt > max ? p.createdAt : max), payments[0].createdAt),
    });

    return NextResponse.json({
      success: true,
      data: payout,
    }, { status: 201 });
  } catch (error) {
    console.error('Create payout error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
