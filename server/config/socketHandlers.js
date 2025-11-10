const jwt = require("jsonwebtoken");

/**
 * Socket.IO authentication middleware
 * Verifies JWT token and attaches user info to socket
 */
const socketAuthMiddleware = (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    
    console.log(`🔐 Socket authenticated: ${socket.username} (${socket.userId})`);
    next();
  } catch (err) {
    console.error("Socket authentication failed:", err.message);
    next(new Error("Authentication error: Invalid token"));
  }
};

/**
 * Initialize all Socket.IO event handlers
 * @param {Server} io - Socket.IO server instance
 */
const initializeSocketHandlers = (io) => {
  // Apply authentication middleware
  io.use(socketAuthMiddleware);

  // Connection handler
  io.on("connection", (socket) => {
    console.log(`🔌 User connected: ${socket.username} (${socket.id})`);
    
    // ===================
    // CHAT ROOM HANDLERS
    // ===================
    
    /**
     * Join a chat room for real-time messaging
     * @event joinChat
     * @param {string} chatId - The chat ID to join
     */
    socket.on("joinChat", (chatId) => {
      if (!chatId) {
        return socket.emit("error", { message: "Chat ID is required" });
      }
      
      socket.join(chatId);
      console.log(`💬 ${socket.username} joined chat: ${chatId}`);
      
      // Notify others in the room
      socket.to(chatId).emit("userJoined", {
        userId: socket.userId,
        username: socket.username,
        timestamp: new Date(),
      });
      
      // Confirm join to the user
      socket.emit("chatJoined", {
        chatId,
        message: "Successfully joined chat",
      });
    });
    
    /**
     * Leave a chat room
     * @event leaveChat
     * @param {string} chatId - The chat ID to leave
     */
    socket.on("leaveChat", (chatId) => {
      if (!chatId) {
        return socket.emit("error", { message: "Chat ID is required" });
      }
      
      socket.leave(chatId);
      console.log(`💬 ${socket.username} left chat: ${chatId}`);
      
      // Notify others in the room
      socket.to(chatId).emit("userLeft", {
        userId: socket.userId,
        username: socket.username,
        timestamp: new Date(),
      });
    });
    
    /**
     * Typing indicator
     * @event typing
     * @param {Object} data - { chatId, isTyping }
     */
    socket.on("typing", ({ chatId, isTyping }) => {
      if (!chatId) {
        return socket.emit("error", { message: "Chat ID is required" });
      }
      
      socket.to(chatId).emit("userTyping", {
        userId: socket.userId,
        username: socket.username,
        isTyping: !!isTyping,
        timestamp: new Date(),
      });
      
      console.log(`⌨️  ${socket.username} ${isTyping ? "started" : "stopped"} typing in chat: ${chatId}`);
    });
    
    // ===================
    // TEAM ROOM HANDLERS (for notifications)
    // ===================
    
    /**
     * Join a team room for notifications
     * @event joinTeam
     * @param {string} teamId - The team ID to join
     */
    socket.on("joinTeam", (teamId) => {
      if (!teamId) {
        return socket.emit("error", { message: "Team ID is required" });
      }
      
      const roomName = `team:${teamId}`;
      socket.join(roomName);
      console.log(`👥 ${socket.username} joined team room: ${roomName}`);
      
      // Confirm join to the user
      socket.emit("teamJoined", {
        teamId,
        roomName,
        message: "Successfully joined team notifications",
      });
    });
    
    /**
     * Join multiple team rooms at once (for users in multiple teams)
     * @event joinTeams
     * @param {string[]} teamIds - Array of team IDs to join
     */
    socket.on("joinTeams", (teamIds) => {
      if (!Array.isArray(teamIds) || teamIds.length === 0) {
        return socket.emit("error", { message: "Team IDs array is required" });
      }
      
      const roomNames = [];
      teamIds.forEach((teamId) => {
        const roomName = `team:${teamId}`;
        socket.join(roomName);
        roomNames.push(roomName);
      });
      
      console.log(`👥 ${socket.username} joined ${teamIds.length} team rooms`);
      
      // Confirm joins to the user
      socket.emit("teamsJoined", {
        teamIds,
        roomNames,
        count: teamIds.length,
        message: `Successfully joined ${teamIds.length} team notification rooms`,
      });
    });
    
    /**
     * Leave a team room
     * @event leaveTeam
     * @param {string} teamId - The team ID to leave
     */
    socket.on("leaveTeam", (teamId) => {
      if (!teamId) {
        return socket.emit("error", { message: "Team ID is required" });
      }
      
      const roomName = `team:${teamId}`;
      socket.leave(roomName);
      console.log(`👥 ${socket.username} left team room: ${roomName}`);
      
      // Confirm leave to the user
      socket.emit("teamLeft", {
        teamId,
        roomName,
        message: "Successfully left team notifications",
      });
    });
    
    // ===================
    // PRESENCE & STATUS
    // ===================
    
    /**
     * Heartbeat/ping to keep connection alive
     * @event heartbeat
     */
    socket.on("heartbeat", () => {
      socket.emit("heartbeatAck", {
        timestamp: new Date(),
        userId: socket.userId,
      });
    });
    
    /**
     * Get list of rooms the user is currently in
     * @event getRooms
     */
    socket.on("getRooms", () => {
      const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
      socket.emit("roomsList", {
        rooms,
        count: rooms.length,
      });
      console.log(`📋 ${socket.username} requested rooms list: ${rooms.join(", ")}`);
    });
    
    // ===================
    // ERROR & DISCONNECT HANDLERS
    // ===================
    
    /**
     * Handle socket errors
     */
    socket.on("error", (error) => {
      console.error(`❌ Socket error for ${socket.username}:`, error);
    });
    
    /**
     * Handle disconnection
     */
    socket.on("disconnect", (reason) => {
      console.log(`🔌 User disconnected: ${socket.username} (${socket.id}) - Reason: ${reason}`);
    });
  });
  
  console.log("✅ Socket.IO handlers initialized");
};

module.exports = {
  socketAuthMiddleware,
  initializeSocketHandlers,
};