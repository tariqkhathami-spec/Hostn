'use client';

import { useEffect, useRef } from 'react';
import { onSocketEvent } from './socket';

/**
 * React hook to subscribe to socket events.
 * Automatically cleans up on unmount.
 *
 * Usage:
 *   useSocketEvent('booking:created', (booking) => {
 *     // refetch bookings
 *   });
 */
export function useSocketEvent(event: string, callback: (data: any) => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const unsub = onSocketEvent(event, (data) => callbackRef.current(data));
    return unsub;
  }, [event]);
}
