'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { connectSocket, disconnectSocket } from '@/lib/socket';

/**
 * Invisible component that manages the Socket.IO connection lifecycle.
 * Connects when user is authenticated, disconnects on logout.
 */
export default function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      connectSocket();
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [user]);

  return <>{children}</>;
}
