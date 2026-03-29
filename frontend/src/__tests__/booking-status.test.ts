/**
 * Unit tests for booking status transitions and payment enforcement.
 *
 * These test the business logic extracted from the booking status route:
 * - Valid status transition map
 * - Payment verification before confirmation
 */

describe('Booking Status Transitions', () => {
  const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
    pending: ['confirmed', 'rejected', 'cancelled'],
    confirmed: ['completed', 'cancelled'],
    completed: [],
    rejected: [],
    cancelled: [],
  };

  it('allows pending -> confirmed', () => {
    expect(VALID_STATUS_TRANSITIONS['pending']).toContain('confirmed');
  });

  it('allows pending -> rejected', () => {
    expect(VALID_STATUS_TRANSITIONS['pending']).toContain('rejected');
  });

  it('allows pending -> cancelled', () => {
    expect(VALID_STATUS_TRANSITIONS['pending']).toContain('cancelled');
  });

  it('allows confirmed -> completed', () => {
    expect(VALID_STATUS_TRANSITIONS['confirmed']).toContain('completed');
  });

  it('allows confirmed -> cancelled', () => {
    expect(VALID_STATUS_TRANSITIONS['confirmed']).toContain('cancelled');
  });

  it('does NOT allow completed -> any status', () => {
    expect(VALID_STATUS_TRANSITIONS['completed']).toHaveLength(0);
  });

  it('does NOT allow rejected -> any status', () => {
    expect(VALID_STATUS_TRANSITIONS['rejected']).toHaveLength(0);
  });

  it('does NOT allow cancelled -> any status', () => {
    expect(VALID_STATUS_TRANSITIONS['cancelled']).toHaveLength(0);
  });

  it('does NOT allow pending -> completed (must go through confirmed)', () => {
    expect(VALID_STATUS_TRANSITIONS['pending']).not.toContain('completed');
  });

  it('does NOT allow confirmed -> rejected', () => {
    expect(VALID_STATUS_TRANSITIONS['confirmed']).not.toContain('rejected');
  });
});

describe('Payment Verification for Booking Confirmation', () => {
  // Simulates the guard logic from bookings/[id]/status/route.ts
  function canConfirmBooking(booking: { paymentStatus: string; status: string }): {
    allowed: boolean;
    reason?: string;
  } {
    if (booking.status !== 'pending') {
      return { allowed: false, reason: `Cannot transition from '${booking.status}' to 'confirmed'` };
    }
    if (booking.paymentStatus !== 'paid') {
      return { allowed: false, reason: 'Cannot confirm booking: payment has not been verified' };
    }
    return { allowed: true };
  }

  it('allows confirmation when payment is verified', () => {
    const result = canConfirmBooking({ paymentStatus: 'paid', status: 'pending' });
    expect(result.allowed).toBe(true);
  });

  it('blocks confirmation when payment is pending', () => {
    const result = canConfirmBooking({ paymentStatus: 'pending', status: 'pending' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('payment has not been verified');
  });

  it('blocks confirmation when payment failed', () => {
    const result = canConfirmBooking({ paymentStatus: 'failed', status: 'pending' });
    expect(result.allowed).toBe(false);
  });

  it('blocks confirmation of already-confirmed booking', () => {
    const result = canConfirmBooking({ paymentStatus: 'paid', status: 'confirmed' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Cannot transition');
  });
});
