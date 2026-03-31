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

  socket.on('message:new', () => {
    queryClient?.invalidateQueries({ queryKey: ['conversations'] });
    queryClient?.invalidateQueries({ queryKey: ['messages'] });
  });

  socket.on('notification:new', () => {
    queryClient?.invalidateQueries({ queryKey: ['notifications'] });
  });

  socket.on('booking:confirmed', () => {
    queryClient?.invalidateQueries({ queryKey: ['bookings'] });
  });

  socket.on('booking:cancelled', () => {
    queryClient?.invalidateQueries({ queryKey: ['bookings'] });
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
