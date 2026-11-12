'use client';

import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

/**
 * Where the realtime server lives.
 *
 * In production the API is reached through a same-origin proxy ('/api/v1'),
 * which cannot carry WebSockets, so the socket goes to the API host directly.
 * NEXT_PUBLIC_SOCKET_URL overrides everything.
 */
function resolveSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  if (/^https?:\/\//.test(API_URL)) return API_URL.replace(/\/api\/v1\/?$/, '');
  if (typeof window !== 'undefined' && /(^|\.)hostn\.co$/.test(window.location.hostname)) {
    return 'https://hostn-production.up.railway.app';
  }
  return process.env.NEXT_PUBLIC_DEV_SOCKET_URL || 'http://localhost:5050';
}

let socket: Socket | null = null;
let connecting = false;
let eventCallbacks: Map<string, Set<(data: any) => void>> = new Map();

/** Ask the API (with the session cookie) for a short-lived socket token. */
async function fetchSocketToken(): Promise<string | null> {
  try {
    const base = API_URL.replace(/\/$/, '');
    const res = await fetch(`${base}/auth/socket-token`, { credentials: 'include' });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.data?.token || null;
  } catch {
    return null;
  }
}

/**
 * Connect to the Socket.IO server.
 *
 * The session lives in an HttpOnly cookie the page cannot read, and the
 * socket host is a different domain, so the page first asks the API for a
 * short-lived token and presents that. A fresh token is fetched on every
 * (re)connection attempt because each one expires after a few minutes.
 */
export function connectSocket(token?: string) {
  if (socket || connecting) return socket;
  connecting = true;

  socket = io(resolveSocketUrl(), {
    autoConnect: false,
    auth: (cb) => {
      if (token) return cb({ token });
      fetchSocketToken().then((t) => cb(t ? { token: t } : {}));
    },
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 30000,
  });
  connecting = false;
  socket.connect();

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
