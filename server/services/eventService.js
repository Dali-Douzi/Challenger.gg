const EventEmitter = require("events");

/**
 * EventService - Central event bus for the application
 * Allows modules to communicate without direct dependencies
 */
class EventService extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(20); // Increase if you have many listeners
    this.io = null; // Socket.IO instance
    
    // Log all events in development
    if (process.env.NODE_ENV === "development") {
      this.onAny((event, data) => {
        console.log(`📢 Event: ${event}`, data ? `(${Object.keys(data).length} keys)` : "");
      });
    }
  }

  /**
   * Set Socket.IO instance for real-time notifications
   */
  setIO(io) {
    this.io = io;
    console.log("✅ Socket.IO instance set in EventService");
  }

  /**
   * Get Socket.IO instance
   */
  getIO() {
    return this.io;
  }

  /**
   * Listen to all events (for logging/debugging)
   */
  onAny(callback) {
    const originalEmit = this.emit;
    this.emit = function (event, ...args) {
      callback(event, ...args);
      return originalEmit.apply(this, [event, ...args]);
    };
  }

  /**
   * Scrim Events
   */
  emitScrimRequestCreated(data) {
    this.emit("scrim:request_created", data);
  }

  emitScrimAccepted(data) {
    this.emit("scrim:accepted", data);
  }

  emitScrimCompleted(data) {
    this.emit("scrim:completed", data);
  }

  emitScrimCancelled(data) {
    this.emit("scrim:cancelled", data);
  }

  /**
   * Chat Events
   */
  emitMessageSent(data) {
    this.emit("message:sent", data);
  }

  emitChatCreated(data) {
    this.emit("chat:created", data);
  }

  /**
   * Team Events
   */
  emitTeamCreated(data) {
    this.emit("team:created", data);
  }

  emitTeamMemberAdded(data) {
    this.emit("team:member_added", data);
  }

  emitTeamMemberRemoved(data) {
    this.emit("team:member_removed", data);
  }

  /**
   * User Events
   */
  emitUserDMRequest(data) {
    this.emit("user:dm_request", data);
  }
}

// Export singleton instance
const eventService = new EventService();

// Graceful error handling
eventService.on("error", (error) => {
  console.error("❌ EventService error:", error);
});

module.exports = eventService;