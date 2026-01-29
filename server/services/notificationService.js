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

  /**
   * Create notification for a user (tournament notifications, etc.)
   */
  async createUserNotification({ userId, tournamentId, message, type, url }) {
    try {
      const notification = await Notification.create({
        user: userId,
        tournament: tournamentId,
        message,
        type,
        url,
      });

      // Emit to user room using eventService IO
      const io = eventService.getIO();
      if (io) {
        const userRoom = `user:${userId}`;
        io.to(userRoom).emit("newNotification", {
          userId: userId,
          notification: notification,
        });
      }

      return notification;
    } catch (error) {
      console.error("Error creating user notification:", error);
      throw error;
    }
  }

  /**
   * Notify tournament organizer of a join request
   */
  async notifyTournamentJoinRequest({ tournament, team, organizerId }) {
    try {
      const notification = await this.createUserNotification({
        userId: organizerId,
        tournamentId: tournament._id,
        message: `Team "${team.name}" has requested to join "${tournament.name}"`,
        type: "tournament_join_request",
        url: `/tournaments/${tournament._id}`,
      });
      console.log(`📬 Tournament join request notification sent to organizer ${organizerId}`);
      return notification;
    } catch (error) {
      console.error("Error notifying tournament join request:", error);
    }
  }

  /**
   * Notify team owner their request was approved
   */
  async notifyTournamentApproved({ tournament, team }) {
    try {
      const notification = await this.createUserNotification({
        userId: team.owner,
        tournamentId: tournament._id,
        message: `Your team "${team.name}" has been approved to join "${tournament.name}"!`,
        type: "tournament_approved",
        url: `/tournaments/${tournament._id}`,
      });
      console.log(`📬 Tournament approval notification sent to team owner ${team.owner}`);
      return notification;
    } catch (error) {
      console.error("Error notifying tournament approval:", error);
    }
  }

  /**
   * Notify team owner their request was denied
   */
  async notifyTournamentDenied({ tournament, team }) {
    try {
      const notification = await this.createUserNotification({
        userId: team.owner,
        tournamentId: tournament._id,
        message: `Your team "${team.name}" was not accepted to "${tournament.name}"`,
        type: "tournament_denied",
        url: `/tournaments/${tournament._id}`,
      });
      console.log(`📬 Tournament denial notification sent to team owner ${team.owner}`);
      return notification;
    } catch (error) {
      console.error("Error notifying tournament denial:", error);
    }
  }

  /**
   * Notify all members of all participating teams that registration is locked
   * and bracket generation will begin
   */
  async notifyRegistrationLocked({ tournament, teams }) {
    try {
      const notifications = [];

      for (const team of teams) {
        // Get all unique user IDs from the team (owner + members)
        const memberIds = new Set();

        // Add owner
        if (team.owner) {
          memberIds.add(team.owner.toString());
        }

        // Add all team members
        if (team.members && Array.isArray(team.members)) {
          team.members.forEach(member => {
            if (member.user) {
              memberIds.add(member.user.toString());
            }
          });
        }

        // Send notification to each member
        for (const userId of memberIds) {
          try {
            const notification = await this.createUserNotification({
              userId: userId,
              tournamentId: tournament._id,
              message: `Registration for "${tournament.name}" is now locked! The bracket will be generated soon. Good luck, ${team.name}!`,
              type: "tournament_registration_locked",
              url: `/tournaments/${tournament._id}`,
            });
            notifications.push(notification);
          } catch (err) {
            console.error(`Error notifying user ${userId}:`, err);
          }
        }
      }

      console.log(`📬 Tournament registration locked notifications sent to ${notifications.length} users across ${teams.length} teams`);
      return notifications;
    } catch (error) {
      console.error("Error notifying registration locked:", error);
    }
  }
}

// Export singleton instance
module.exports = new NotificationService();