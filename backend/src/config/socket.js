const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

/**
 * Initialize Socket.IO on the existing HTTP server.
 * Call once after `app.listen()`.
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        // Same CORS logic as Express: allow no-origin (mobile) + all localhost + whitelist
        if (!origin) return cb(null, true);
        if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
          return cb(null, true);
        }
        const allowed = process.env.CORS_ORIGINS
          ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
          : [process.env.CLIENT_URL || 'http://localhost:3000'];
        if (allowed.includes(origin)) return cb(null, true);
        cb(new Error('CORS'));
      },
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
    transports: ['websocket', 'polling'],
  });

  // ── Auth middleware — validate JWT on connect ───────────────────────
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('AUTH_REQUIRED'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error('AUTH_INVALID'));
    }
  });

  // ── Connection handler ─────────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.userId;

    // Every user joins their personal room for targeted events
    socket.join(`user:${userId}`);

    console.log(`[SOCKET] User ${userId} connected (${socket.id})`);

    // Clients can join property-specific rooms (for calendar/availability)
    socket.on('join:property', (propertyId) => {
      if (propertyId) {
        socket.join(`property:${propertyId}`);
      }
    });

    socket.on('leave:property', (propertyId) => {
      if (propertyId) {
        socket.leave(`property:${propertyId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[SOCKET] User ${userId} disconnected (${reason})`);
    });
  });

  console.log('[SOCKET] Socket.IO initialized');
  return io;
}

/**
 * Get the Socket.IO server instance.
 * Returns null if not yet initialized.
 */
function getIO() {
  return io;
}

// ── Emit helpers (safe — no-op if io not initialized) ────────────────

/** Send event to a specific user by their MongoDB _id */
function emitToUser(userId, event, data) {
  if (io) io.to(`user:${userId}`).emit(event, data);
}

/** Send event to everyone watching a specific property */
function emitToProperty(propertyId, event, data) {
  if (io) io.to(`property:${propertyId}`).emit(event, data);
}

/** Broadcast to all connected clients */
function emitToAll(event, data) {
  if (io) io.emit(event, data);
}

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToProperty,
  emitToAll,
};
