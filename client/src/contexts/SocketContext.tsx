import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import Cookies from "js-cookie";
import { COOKIE_NAME } from "../../../shared/const";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export function useSocket() {
  return useContext(SocketContext);
}

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Get session token from cookie
    const token = Cookies.get(COOKIE_NAME);

    if (!token) {
      console.log("[Socket.io] No session token found");
      return;
    }

    // Connect to Socket.io server
    const socketInstance = io({
      path: "/socket.io/",
      auth: {
        token,
      },
    });

    socketInstance.on("connect", () => {
      console.log("[Socket.io] Connected");
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("[Socket.io] Disconnected");
      setIsConnected(false);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("[Socket.io] Connection error:", error.message);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
