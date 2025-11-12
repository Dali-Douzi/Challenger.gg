import { io } from 'socket.io-client';

/**
 * Socket.IO Service
 * Manages WebSocket connection for real-time features
 */

let socket = null;

/**
 * Get access token from cookies
 */
const getAccessToken = () => {
  const cookies = document.cookie.split('; ');
  const tokenCookie = cookies.find(c => c.startsWith('accessToken='));
  return tokenCookie ? tokenCookie.split('=')[1] : null;
};

/**
 * Connect to Socket.IO server
 * @param {Array} userTeams - Array of team objects user belongs to
 * @returns {Socket} socket instance
 */
export const connectSocket = (userTeams = []) => {
  if (socket?.connected) {
    console.log('✅ Socket already connected:', socket.id);
    return socket;
  }

  const token = getAccessToken();
  
  if (!token) {
    console.error('❌ No access token found, cannot connect socket');
    return null;
  }

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4444';

  socket = io(API_BASE, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  // Connection success
  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
    
    // Join all team notification rooms
    if (userTeams && userTeams.length > 0) {
      const teamIds = userTeams.map(team => team._id);
      socket.emit('joinTeams', teamIds);
      console.log('📡 Joining team rooms:', teamIds);
    }
  });

  // Team rooms joined confirmation
  socket.on('teamsJoined', (data) => {
    console.log(`✅ Joined ${data.count} team notification rooms`);
    console.log('   Room names:', data.roomNames);
  });

  // Connection error
  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error.message);
  });

  // Disconnection
  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });

  // Reconnection attempt
  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`🔄 Reconnection attempt #${attemptNumber}`);
  });

  // Reconnection success
  socket.on('reconnect', (attemptNumber) => {
    console.log(`✅ Reconnected after ${attemptNumber} attempts`);
    
    // Re-join team rooms after reconnection
    if (userTeams && userTeams.length > 0) {
      const teamIds = userTeams.map(team => team._id);
      socket.emit('joinTeams', teamIds);
    }
  });

  return socket;
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    console.log('🔌 Disconnecting socket...');
    socket.disconnect();
    socket = null;
  }
};

/**
 * Get current socket instance
 * @returns {Socket|null}
 */
export const getSocket = () => socket;

/**
 * Join a chat room
 * @param {string} chatId - Chat ID to join
 */
export const joinChatRoom = (chatId) => {
  if (!socket) {
    console.error('❌ Socket not connected');
    return;
  }

  socket.emit('joinChat', chatId);
  console.log(`💬 Joining chat room: ${chatId}`);
};

/**
 * Leave a chat room
 * @param {string} chatId - Chat ID to leave
 */
export const leaveChatRoom = (chatId) => {
  if (!socket) return;

  socket.emit('leaveChat', chatId);
  console.log(`💬 Leaving chat room: ${chatId}`);
};

/**
 * Send typing indicator
 * @param {string} chatId - Chat ID
 * @param {boolean} isTyping - Whether user is typing
 */
export const sendTypingIndicator = (chatId, isTyping) => {
  if (!socket) return;

  socket.emit('typing', { chatId, isTyping });
};

/**
 * Listen for new messages
 * @param {Function} callback - Callback function (data) => {}
 */
export const onNewMessage = (callback) => {
  if (!socket) return;
  
  socket.on('newMessage', callback);
};

/**
 * Remove new message listener
 * @param {Function} callback - Callback function to remove
 */
export const offNewMessage = (callback) => {
  if (!socket) return;
  
  socket.off('newMessage', callback);
};

/**
 * Listen for new notifications
 * @param {Function} callback - Callback function (data) => {}
 */
export const onNewNotification = (callback) => {
  if (!socket) return;
  
  socket.on('newNotification', callback);
};

/**
 * Remove notification listener
 * @param {Function} callback - Callback function to remove
 */
export const offNewNotification = (callback) => {
  if (!socket) return;
  
  socket.off('newNotification', callback);
};

/**
 * Listen for typing indicators
 * @param {Function} callback - Callback function (data) => {}
 */
export const onUserTyping = (callback) => {
  if (!socket) return;
  
  socket.on('userTyping', callback);
};

/**
 * Remove typing listener
 * @param {Function} callback - Callback function to remove
 */
export const offUserTyping = (callback) => {
  if (!socket) return;
  
  socket.off('userTyping', callback);
};

/**
 * Check if socket is connected
 * @returns {boolean}
 */
export const isSocketConnected = () => {
  return socket?.connected || false;
};

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
  joinChatRoom,
  leaveChatRoom,
  sendTypingIndicator,
  onNewMessage,
  offNewMessage,
  onNewNotification,
  offNewNotification,
  onUserTyping,
  offUserTyping,
  isSocketConnected,
};