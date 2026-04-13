import { io, Socket } from 'socket.io-client';
import { QueryClient } from '@tanstack/react-query';
import { secureStorage } from '../utils/storage';
import { API_BASE_URL } from '../constants/config';

let socket: Socket | null = null;
let queryClientRef: QueryClient | null = null;

/** Store reference to the app's QueryClient so socket events can invalidate caches */
export function setQueryClient(qc: QueryClient) {
  queryClientRef = qc;
}

/** Connect to the Socket.IO server. Safe to call multiple times — reconnects if needed. */
export async function connectSocket() {
  if (socket?.connected) return socket;

  const token = await secureStorage.getToken();
  if (!token) {
    console.log('[SOCKET] No token — skipping connection');
    return null;
  }

  // Derive WS URL from API base (strip /api/v1 suffix)
  const baseUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

  socket = io(baseUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 30000,
    timeout: 15000,
  });

  socket.on('connect', () => {
    console.log('[SOCKET] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[SOCKET] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.log('[SOCKET] Connection error:', err.message);
  });

  // ── Booking events → invalidate React Query caches ──────────────
  socket.on('booking:created', (booking) => {
    console.log('[SOCKET] booking:created', booking._id);
    invalidateBookingCaches();
  });

  socket.on('booking:updated', (booking) => {
    console.log('[SOCKET] booking:updated', booking._id, booking.status);
    invalidateBookingCaches();
  });

  socket.on('booking:cancelled', (booking) => {
    console.log('[SOCKET] booking:cancelled', booking._id);
    invalidateBookingCaches();
  });

  // ── Availability changes → invalidate calendar ──────────────────
  socket.on('availability:changed', (data) => {
    console.log('[SOCKET] availability:changed', data.propertyId);
    if (queryClientRef) {
      queryClientRef.invalidateQueries({ queryKey: ['calendar'] });
      queryClientRef.invalidateQueries({ queryKey: ['properties'] });
    }
  });

  // ── Message events → invalidate conversation caches ────────────
  socket.on('message:new', (data) => {
    console.log('[SOCKET] message:new', data?.conversationId);
    invalidateMessageCaches(data?.conversationId);
  });

  socket.on('message:read', (data) => {
    console.log('[SOCKET] message:read', data?.conversationId);
    invalidateMessageCaches(data?.conversationId);
  });

  socket.on('conversation:updated', (data) => {
    console.log('[SOCKET] conversation:updated', data?.conversationId);
    if (queryClientRef) {
      queryClientRef.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  return socket;
}

/** Disconnect the socket (call on logout) */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/** Get the current socket instance */
export function getSocket() {
  return socket;
}

/** Join a property room to receive availability updates */
export function joinPropertyRoom(propertyId: string) {
  socket?.emit('join:property', propertyId);
}

/** Leave a property room */
export function leavePropertyRoom(propertyId: string) {
  socket?.emit('leave:property', propertyId);
}

// ── Internal helpers ─────────────────────────────────────────────────

function invalidateMessageCaches(conversationId?: string) {
  if (!queryClientRef) return;
  queryClientRef.invalidateQueries({ queryKey: ['conversations'] });
  if (conversationId) {
    queryClientRef.invalidateQueries({ queryKey: ['conversation-messages', conversationId] });
  }
}

function invalidateBookingCaches() {
  if (!queryClientRef) return;
  // Invalidate all booking-related queries so screens auto-refresh
  queryClientRef.invalidateQueries({ queryKey: ['bookings'] });
  queryClientRef.invalidateQueries({ queryKey: ['hostBookings'] });
  queryClientRef.invalidateQueries({ queryKey: ['upcomingGuests'] });
  queryClientRef.invalidateQueries({ queryKey: ['dashboard'] });
  queryClientRef.invalidateQueries({ queryKey: ['calendar'] });
}
