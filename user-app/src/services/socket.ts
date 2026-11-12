import { io, Socket } from 'socket.io-client';
import { QueryClient } from '@tanstack/react-query';
import { API_URL } from '../constants/config';
import { secureStorage } from '../utils/storage';

let socket: Socket | null = null;
let queryClient: QueryClient | null = null;

const BASE_URL = API_URL.replace('/api/v1', '');

export function setQueryClient(qc: QueryClient) {
  queryClient = qc;
}

export async function connectSocket() {
  if (socket?.connected) return;

  const token = await secureStorage.getToken();
  if (!token) return;

  socket = io(BASE_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected');
  });

  // Events the server emits (backend/src/controllers/*): each one refreshes
  // the react-query keys the screens read.
  const invalidate = (...keys: string[]) =>
    keys.forEach((key) => queryClient?.invalidateQueries({ queryKey: [key] }));

  // { conversationId, message } — pushed to the recipient of a chat message.
  socket.on('message:new', () => invalidate('conversations', 'messages'));

  socket.on('notification:new', () => invalidate('notifications'));

  // ['bookings', tab] is the list, ['booking', id] the detail screen.
  const onBookingChange = () => invalidate('bookings', 'booking', 'notifications');
  socket.on('booking:created', onBookingChange);
  socket.on('booking:updated', onBookingChange);
  socket.on('booking:cancelled', onBookingChange);

  // Dates of a property changed: search results, the home feed and any open
  // listing may now show stale availability.
  socket.on('availability:changed', () => invalidate('search', 'homeFeed', 'listing', 'wishlist', 'bookedDates'));

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

/**
 * `availability:changed` is only sent to sockets in the property's room.
 * Call while a listing of that property is on screen; returns the cleanup.
 */
export function watchProperty(propertyId?: string | null): () => void {
  if (!propertyId || !socket) return () => {};
  const current = socket;
  const join = () => current.emit('join:property', propertyId);
  join();
  // Rooms are lost on reconnect; join again.
  current.on('connect', join);
  return () => {
    current.off('connect', join);
    current.emit('leave:property', propertyId);
  };
}

export function getSocket(): Socket | null {
  return socket;
}
