import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helpers';
import Payout from '@/lib/models/Payout';
import { logPaymentEvent } from '@/lib/logger';

/**
 * POST /api/admin/payouts/[id]/mark-paid
 * Mark a payout as paid (manual bank transfer completed).
 *
 * Body: { transactionId?: string, payoutMethod?: string, notes?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireAdmin(request);
    if ('error' in auth) return auth.error;

    await dbConnect();

    const { id } = params;
    let body: { transactionId?: string; payoutMethod?: string; notes?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine
    }

    const payout = await Payout.findById(id);
    if (!payout) {
      return NextResponse.json(
        { success: false, message: 'Payout not found' },
        { status: 404 }
      );
    }

    if (payout.status === 'paid') {
      return NextResponse.json(
        { success: false, message: 'Payout is already marked as paid' },
        { status: 400 }
      );
    }

    payout.status = 'paid';
    payout.paidAt = new Date();
    if (body.transactionId) payout.transactionId = body.transactionId;
    if (body.payoutMethod) payout.payoutMethod = body.payoutMethod;
    if (body.notes) payout.notes = body.notes;
    await payout.save();

    // Log the payout event (fire-and-forget)
    logPaymentEvent(
      id,
      'payout_completed',
      `Payout of ${payout.totalAmount} SAR to host marked as paid.${body.transactionId ? ` Txn: ${body.transactionId}` : ''}`,
      auth.payload.userId
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      data: payout,
    });
  } catch (error) {
    console.error('Mark payout paid error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
