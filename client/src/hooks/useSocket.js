import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
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
} from '../services/socket';

/**
 * useSocket Hook
 * Provides Socket.IO functionality to components
 */
export const useSocket = () => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  /**
   * Initialize socket connection when user is authenticated
   */
  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socket) {
        disconnectSocket();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    // Get user's teams (assumes they're loaded in AuthContext)
    const userTeams = user.teams || [];

    // Connect socket
    const socketInstance = connectSocket(userTeams);
    
    if (socketInstance) {
      setSocket(socketInstance);
      setConnected(socketInstance.connected);

      // Listen for connection events
      socketInstance.on('connect', () => {
        console.log('✅ useSocket: Connected');
        setConnected(true);
      });

      socketInstance.on('disconnect', () => {
        console.log('🔌 useSocket: Disconnected');
        setConnected(false);
      });
    }

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        socketInstance.off('connect');
        socketInstance.off('disconnect');
      }
    };
  }, [isAuthenticated, user]);

  /**
   * Join a chat room
   */
  const joinChat = useCallback((chatId) => {
    if (!socket || !connected) {
      console.warn('Socket not connected, cannot join chat');
      return;
    }
    joinChatRoom(chatId);
  }, [socket, connected]);

  /**
   * Leave a chat room
   */
  const leaveChat = useCallback((chatId) => {
    if (!socket) return;
    leaveChatRoom(chatId);
  }, [socket]);

  /**
   * Send typing indicator
   */
  const setTyping = useCallback((chatId, isTyping) => {
    if (!socket || !connected) return;
    sendTypingIndicator(chatId, isTyping);
  }, [socket, connected]);

  /**
   * Listen for new messages in a specific chat
   */
  const onMessage = useCallback((callback) => {
    if (!socket) return;
    onNewMessage(callback);
  }, [socket]);

  /**
   * Stop listening for messages
   */
  const offMessage = useCallback((callback) => {
    if (!socket) return;
    offNewMessage(callback);
  }, [socket]);

  /**
   * Listen for typing indicators
   */
  const onTyping = useCallback((callback) => {
    if (!socket) return;
    onUserTyping(callback);
  }, [socket]);

  /**
   * Stop listening for typing indicators
   */
  const offTyping = useCallback((callback) => {
    if (!socket) return;
    offUserTyping(callback);
  }, [socket]);

  /**
   * Get raw socket instance (use with caution)
   */
  const getRawSocket = useCallback(() => {
    return getSocket();
  }, []);

  return {
    socket,
    connected,
    isConnected: connected,
    joinChat,
    leaveChat,
    setTyping,
    onMessage,
    offMessage,
    onTyping,
    offTyping,
    getRawSocket,
  };
};

export default useSocket;