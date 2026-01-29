import { io } from 'socket.io-client';
import { getApiBaseUrl } from './apiClient';

let socket = null;

export const connectSocket = (userTeams = []) => {
  if (socket && socket.connected) {
    console.log('✅ Socket already connected');
    return socket;
  }

  const API_URL = getApiBaseUrl();
  
  console.log('🔌 Connecting to Socket.IO:', API_URL);

  // ✅ FIXED: Don't try to extract token from cookies (they're httpOnly)
  // The browser will automatically send cookies in the Socket.IO handshake
  socket = io(API_URL, {
    // Remove auth.token - rely on automatic cookie sending
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    withCredentials: true, // ✅ This ensures cookies are sent!
  });

  socket.on('connect', () => {
    console.log('✅ Socket.IO connected:', socket.id);
    
    if (userTeams && userTeams.length > 0) {
      console.log('👥 Joining team rooms:', userTeams);
      socket.emit('joinTeams', userTeams);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket.IO disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error.message);
  });

  if (import.meta.env.MODE === 'development') {
    socket.onAny((event, ...args) => {
      console.log(`📡 Socket event: ${event}`, args);
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    console.log('🔌 Disconnecting socket...');
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;
export const isSocketConnected = () => socket && socket.connected;

// Subscribe to socket connection events
export const onSocketConnect = (callback) => {
  if (!socket) return;
  socket.on('connect', callback);
};

export const offSocketConnect = (callback) => {
  if (!socket) return;
  socket.off('connect', callback);
};

export const joinChatRoom = (chatId) => {
  if (!socket) {
    console.warn('⚠️ Socket not initialized, cannot join chat room');
    return;
  }

  // If socket is connected, join immediately
  if (socket.connected) {
    console.log('💬 Joining chat room:', chatId);
    socket.emit('joinChat', chatId);
  } else {
    // If not connected, wait for connection then join
    console.log('⏳ Waiting for socket connection to join chat room:', chatId);
    const onConnect = () => {
      console.log('💬 Socket connected, now joining chat room:', chatId);
      socket.emit('joinChat', chatId);
      socket.off('connect', onConnect);
    };
    socket.on('connect', onConnect);
  }
};

export const leaveChatRoom = (chatId) => {
  if (!socket) return;
  socket.emit('leaveChat', chatId);
};

export const sendTypingIndicator = (chatId, isTyping) => {
  if (!socket) return;
  socket.emit('typing', { chatId, isTyping });
};

export const onNewMessage = (callback) => {
  if (!socket) return;
  socket.on('newMessage', callback);
};

export const offNewMessage = (callback) => {
  if (!socket) return;
  socket.off('newMessage', callback);
};

export const onUserTyping = (callback) => {
  if (!socket) return;
  socket.on('userTyping', callback);
};

export const offUserTyping = (callback) => {
  if (!socket) return;
  socket.off('userTyping', callback);
};

export const onNewNotification = (callback) => {
  if (!socket) return;
  socket.on('newNotification', callback);
};

export const offNewNotification = (callback) => {
  if (!socket) return;
  socket.off('newNotification', callback);
};

export const onChatCreated = (callback) => {
  if (!socket) return;
  socket.on('chatCreated', callback);
};

export const offChatCreated = (callback) => {
  if (!socket) return;
  socket.off('chatCreated', callback);
};

export const onChatJoined = (callback) => {
  if (!socket) return;
  socket.on('chatJoined', callback);
};

export const offChatJoined = (callback) => {
  if (!socket) return;
  socket.off('chatJoined', callback);
};

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
  isSocketConnected,
  joinChatRoom,
  leaveChatRoom,
  sendTypingIndicator,
  onNewMessage,
  offNewMessage,
  onUserTyping,
  offUserTyping,
  onNewNotification,
  offNewNotification,
  onChatCreated,
  offChatCreated,
  onChatJoined,
  offChatJoined,
  onSocketConnect,
  offSocketConnect,
};