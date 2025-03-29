import { useState, useEffect } from "react";

export function useWebSocket(onMessage: (data: string) => void) {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const connectWebSocket = (token: string) => {
    const newSocket = new WebSocket(import.meta.env.VITE_BACKEND_URL || "");

    newSocket.onopen = () => {
      console.log("WebSocket connected");
      newSocket.send(JSON.stringify({ token }));
    };

    newSocket.onclose = (event) => {
      console.log("WebSocket disconnected:", event.code);
    };

    newSocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    newSocket.onmessage = (event) => {
      if (onMessage) {
        onMessage(event.data);
      }
    };

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  };

  const disconnectWebSocket = () => {
    if (socket) {
      socket.close();
      setSocket(null);
    }
  };

  const sendMessage = (messageText: string, token: string) => {
    const payload = { message: messageText, token: token };

    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn("WebSocket is not connected. Attempting to reconnect...");
        connectWebSocket(token);
        return false;   
    }
    
    socket.send(JSON.stringify(payload));

    return true;
  };

  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [socket]);

  return { connectWebSocket, disconnectWebSocket, sendMessage };
}