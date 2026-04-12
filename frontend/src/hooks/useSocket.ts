'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  'http://localhost:4000';

let socketInstance: Socket | null = null;

export function useSocket(namespace = '/seats') {
  const { accessToken } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      socketRef.current = null;
      setConnected(false);
      return;
    }

    if (!socketInstance) {
      socketInstance = io(`${SOCKET_URL}${namespace}`, {
        auth: { token: accessToken },
        transports: ['websocket'],
      });
    }

    socketRef.current = socketInstance;
    setConnected(socketInstance.connected);

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);

    return () => {
      socketInstance?.off('connect', handleConnect);
      socketInstance?.off('disconnect', handleDisconnect);
    };
  }, [accessToken, namespace]);

  const joinEventRoom = useCallback((eventId: string) => {
    socketRef.current?.emit('join-event-room', eventId);
  }, []);

  const leaveEventRoom = useCallback((eventId: string) => {
    socketRef.current?.emit('leave-event-room', eventId);
  }, []);

  const onSeatUpdate = useCallback(
    (handler: (data: { seatId: string; status: string; heldUntil?: string }) => void) => {
      socketRef.current?.on('seat-updated', handler);
      return () => socketRef.current?.off('seat-updated', handler);
    },
    [],
  );

  const onSeatSummary = useCallback(
    (handler: (data: { summary: Record<string, number> }) => void) => {
      socketRef.current?.on('seat-summary', handler);
      return () => socketRef.current?.off('seat-summary', handler);
    },
    [],
  );

  return { socket: socketRef.current, connected, joinEventRoom, leaveEventRoom, onSeatUpdate, onSeatSummary };
}
