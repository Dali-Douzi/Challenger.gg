const Notification = require("../models/Notification");
const Team = require("../models/Team");
const eventService = require("./eventService");

/**
 * NotificationService - Handles notification creation from events
 */
class NotificationService {
  constructor() {
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Message sent → Create notifications
    eventService.on("message:sent", async (data) => {
      try {
        await this.handleMessageNotification(data);
      } catch (error) {
        console.error("Error handling message notification:", error);
      }
    });

    console.log("✅ NotificationService event listeners initialized");
  }

  /**
   * Handle notification for new message
   */
  async handleMessageNotification({ chatId, chat, message, senderTeam, teamInfo }) {
    try {
      // Only create notifications for scrim chats
      if (chat.type !== "scrim" || !chat.metadata.scrimId) {
        return;
      }

      // Get all teams in the scrim
      const allTeams = [
        chat.metadata.teams.host.id.toString(),
        chat.metadata.teams.challenger.id.toString(),
      ];

      // Notify all teams EXCEPT the sender's team
      const recipientTeams = allTeams.filter(
        (teamId) => teamId !== senderTeam?.toString()
      );

      // Get Socket.IO from eventService
      const io = eventService.getIO();

      // Create notification for each recipient team
      await Promise.all(
        recipientTeams.map(async (teamId) => {
          const notification = await Notification.create({
            team: teamId,
            scrim: chat.metadata.scrimId,
            chat: chatId,
            message: `New message from ${teamInfo?.teamName || "opponent"}: ${message.text.substring(0, 50)}${message.text.length > 50 ? "..." : ""}`,
            type: "message",
            url: `/chats/${chatId}`,
          });

          // Emit to specific team room
          if (io) {
            const teamRoom = `team:${teamId}`;
            io.to(teamRoom).emit("newNotification", {
              teamId: teamId,
              notification: notification,
            });
            console.log(
              `📬 Emitted notification to team room: ${teamRoom}`
            );
          }

          return notification;
        })
      );
    } catch (error) {
      console.error("Error in handleMessageNotification:", error);
      throw error;
    }
  }

  /**
   * Create notification manually (for other use cases)
   */
  async createNotification({ teamId, scrimId, chatId, message, type, url }) {
    try {
      const notification = await Notification.create({
        team: teamId,
        scrim: scrimId,
        chat: chatId,
        message,
        type,
        url,
      });

      // Emit to team room using eventService IO
      const io = eventService.getIO();
      if (io) {
        const teamRoom = `team:${teamId}`;
        io.to(teamRoom).emit("newNotification", {
          teamId: teamId,
          notification: notification,
        });
      }

      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new NotificationService();