import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { sdk } from "./sdk";

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.io server
 */
export function initializeSocketIO(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/socket.io/",
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const user = await sdk.verifySession(token);

      if (!user || !user.openId) {
        return next(new Error("Invalid token"));
      }

      // Attach user to socket
      (socket as any).userId = user.openId;
      (socket as any).userName = user.name || "Unknown";

      next();
    } catch (error) {
      console.error("[Socket.io] Auth error:", error);
      next(new Error("Authentication failed"));
    }
  });

  // Connection handler
  io.on("connection", (socket) => {
    const userId = (socket as any).userId;
    const userName = (socket as any).userName;

    console.log(`[Socket.io] User connected: ${userName} (${userId})`);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`[Socket.io] User disconnected: ${userName} (${userId})`);
    });

    // Ping/pong for connection health
    socket.on("ping", () => {
      socket.emit("pong");
    });
  });

  console.log("🔌 Socket.io server initialized");

  return io;
}

/**
 * Get Socket.io server instance
 */
export function getSocketIO(): SocketIOServer | null {
  return io;
}

/**
 * Emit notification to a specific user
 */
export function emitToUser(userId: string, event: string, data: any) {
  if (!io) {
    console.warn("[Socket.io] Server not initialized");
    return;
  }

  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Emit notification to all connected users
 */
export function emitToAll(event: string, data: any) {
  if (!io) {
    console.warn("[Socket.io] Server not initialized");
    return;
  }

  io.emit(event, data);
}
