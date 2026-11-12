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

/**
 * Connect to the Socket.IO server. Called at app start and again right after
 * login (at app start there may be no token yet). Safe to call repeatedly:
 * an existing socket is reused, never duplicated.
 */
export async function connectSocket() {
  if (socket) {
    if (!socket.connected) socket.connect();
    return socket;
  }

  const token = await secureStorage.getToken();
  if (!token) {
    console.log('[SOCKET] No token — skipping connection');
    return null;
  }
  // Another call may have created the socket while the token was being read.
  if (socket) return socket;

  // Derive WS URL from API base (strip /api/v1 suffix)
  const baseUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

  socket = io(baseUrl, {
    // Read the token on every (re)connection so a refreshed token is used.
    auth: (cb) => {
      secureStorage.getToken().then((t) => cb({ token: t ?? '' })).catch(() => cb({ token: '' }));
    },
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
  for (const event of ['booking:created', 'booking:updated', 'booking:cancelled']) {
    socket.on(event, (booking) => {
      console.log(`[SOCKET] ${event}`, booking?._id, booking?.status);
      invalidateBookingCaches();
    });
  }

  // ── Availability changes → invalidate calendar ──────────────────
  socket.on('availability:changed', (data) => {
    console.log('[SOCKET] availability:changed', data?.propertyId);
    invalidate(['hostCalendar'], ['unitBookedDates'], ['properties']);
  });

  // ── Message events → invalidate conversation caches ────────────
  // message:new carries { conversationId, message }.
  socket.on('message:new', (data) => {
    console.log('[SOCKET] message:new', data?.conversationId);
    invalidateMessageCaches(data?.conversationId ?? data?.message?.conversation);
  });

  socket.on('message:read', (data) => {
    console.log('[SOCKET] message:read', data?.conversationId);
    invalidateMessageCaches(data?.conversationId);
  });

  socket.on('conversation:updated', () => {
    invalidate(['conversations']);
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
// The keys below are the ones the screens really use. React Query matches by
// prefix, so ['bookings'] also covers ['bookings', 'recent'] and the like.

function invalidate(...keys: unknown[][]) {
  if (!queryClientRef) return;
  for (const queryKey of keys) queryClientRef.invalidateQueries({ queryKey });
}

function invalidateMessageCaches(conversationId?: string) {
  invalidate(
    ['conversations'], // messages list (['conversations', filters]) and the open chat's header
    // The open thread: only that conversation when the event names it.
    conversationId ? ['conversation-messages', String(conversationId)] : ['conversation-messages'],
    ['notifications'], // notifications list and the unread badge (['notifications', 'unreadCount'])
  );
}

function invalidateBookingCaches() {
  invalidate(
    ['bookings'], // reservations tab, dashboard recent and upcoming lists
    ['upcomingGuests'],
    ['bookingDetail'],
    ['dashboard'], // ['dashboard', 'stats']
    ['host-stats'], // stats row on the "more" tab
    ['hostCalendar'], // calendar tab: ['hostCalendar', year, month]
    ['unitBookedDates'], // unit screen calendar
    ['notifications'],
  );
}
