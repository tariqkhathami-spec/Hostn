'use client';

import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
const SOCKET_URL = API_URL.replace(/\/api\/v1\/?$/, '') || 'http://localhost:5000';

let socket: Socket | null = null;
let eventCallbacks: Map<string, Set<(data: any) => void>> = new Map();

/**
 * Connect to Socket.IO server using the auth token from cookies.
 * For the web app, the token is in an HttpOnly cookie, so we also
 * accept passing it explicitly from AuthContext.
 */
export function connectSocket(token?: string) {
  if (socket?.connected) return socket;

  // On the web, try to get token from localStorage as fallback
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('hostn_token') : null);

  socket = io(SOCKET_URL, {
    auth: authToken ? { token: authToken } : undefined,
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 30000,
  });

  socket.on('connect', () => {
    console.log('[SOCKET] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[SOCKET] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.log('[SOCKET] Error:', err.message);
  });

  // Re-emit to all registered listeners
  const events = [
    'booking:created',
    'booking:updated',
    'booking:cancelled',
    'availability:changed',
  ];

  events.forEach((event) => {
    socket!.on(event, (data: any) => {
      const callbacks = eventCallbacks.get(event);
      if (callbacks) {
        callbacks.forEach((cb) => cb(data));
      }
    });
  });

  return socket;
}

/** Disconnect the socket */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/** Subscribe to a socket event. Returns unsubscribe function. */
export function onSocketEvent(event: string, callback: (data: any) => void): () => void {
  if (!eventCallbacks.has(event)) {
    eventCallbacks.set(event, new Set());
  }
  eventCallbacks.get(event)!.add(callback);

  return () => {
    eventCallbacks.get(event)?.delete(callback);
  };
}

/** Get current socket instance */
export function getSocket() {
  return socket;
}

/** Join a property room for availability updates */
export function joinPropertyRoom(propertyId: string) {
  socket?.emit('join:property', propertyId);
}

/** Leave a property room */
export function leavePropertyRoom(propertyId: string) {
  socket?.emit('leave:property', propertyId);
}
