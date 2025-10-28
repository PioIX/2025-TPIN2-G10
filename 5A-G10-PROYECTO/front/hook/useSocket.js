"use client";

import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

export function useSocket(serverUrl = "http://localhost:4001") {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketIo = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true
    });

    socketIo.on('connect', () => {
      setIsConnected(true);
      console.log('WebSocket conectado:', socketIo.id);
    });

    socketIo.on('disconnect', () => {
      setIsConnected(false);
      console.log('WebSocket desconectado');
    });

    setSocket(socketIo);

    return () => {
      socketIo.disconnect();
    };
  }, [serverUrl]);

  return { socket, isConnected };
}