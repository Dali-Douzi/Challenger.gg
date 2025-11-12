import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat as useChatContext } from '../context/ChatContext';
import useSocket from './useSocket';
import chatService from '../services/chatService';

/**
 * useChat Hook
 * Comprehensive hook for chat operations
 * Handles fetching chat, messages, sending, and real-time updates
 */
export const useChat = (scrimId) => {
  const { user } = useAuth();
  const { setChatId, incrementUnread, isChatMinimized } = useChatContext();
  const { connected, joinChat, leaveChat, setTyping, onMessage, offMessage, onTyping, offTyping } = useSocket();

  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]); // Users currently typing

  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const chatIdRef = useRef(null);

  /**
   * Fetch chat by scrim ID with retry logic
   */
  const fetchChat = useCallback(async () => {
    if (!scrimId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await chatService.getChatByScrimIdWithRetry(scrimId);

      if (response.success && response.data) {
        setChat(response.data);
        chatIdRef.current = response.data._id;
        
        // Update chat ID in context
        setChatId(scrimId, response.data._id);

        // Join chat room via socket
        if (connected) {
          joinChat(response.data._id);
        }

        return response.data;
      }
    } catch (err) {
      console.error('Error fetching chat:', err);
      setError(err.message || 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  }, [scrimId, connected, joinChat, setChatId]);

  /**
   * Fetch messages for the chat
   */
  const fetchMessages = useCallback(async (chatId, limit = 50, skip = 0) => {
    if (!chatId) return;

    try {
      const response = await chatService.getChatById(chatId, limit, skip);

      if (response.success && response.data) {
        const formattedMessages = response.data.messages.map(msg =>
          chatService.formatMessage(msg, user)
        );

        setMessages(formattedMessages);
        setHasMore(response.data.pagination?.hasMore || false);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, [user]);

  /**
   * Load more messages (pagination)
   */
  const loadMoreMessages = useCallback(async () => {
    if (!chat?._id || loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);

      const response = await chatService.getChatById(
        chat._id,
        50,
        messages.length
      );

      if (response.success && response.data) {
        const formattedMessages = response.data.messages.map(msg =>
          chatService.formatMessage(msg, user)
        );

        setMessages(prev => [...formattedMessages, ...prev]);
        setHasMore(response.data.pagination?.hasMore || false);
      }
    } catch (err) {
      console.error('Error loading more messages:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [chat, messages.length, loadingMore, hasMore, user]);

  /**
   * Send a message
   */
  const sendMessage = useCallback(async (text) => {
    if (!chat?._id || !text.trim() || sending) return;

    try {
      setSending(true);

      await chatService.sendMessage(chat._id, text.trim());

      // Stop typing indicator
      if (isTypingRef.current) {
        setTyping(chat._id, false);
        isTypingRef.current = false;
      }

      // Message will arrive via socket
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    } finally {
      setSending(false);
    }
  }, [chat, sending, setTyping]);

  /**
   * Handle user typing
   */
  const handleTyping = useCallback(() => {
    if (!chat?._id || !connected) return;

    // Send typing indicator if not already typing
    if (!isTypingRef.current) {
      setTyping(chat._id, true);
      isTypingRef.current = true;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(chat._id, false);
      isTypingRef.current = false;
    }, 3000);
  }, [chat, connected, setTyping]);

  /**
   * Stop typing indicator
   */
  const stopTyping = useCallback(() => {
    if (!chat?._id || !isTypingRef.current) return;

    setTyping(chat._id, false);
    isTypingRef.current = false;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [chat, setTyping]);

  // Fetch chat on mount
  useEffect(() => {
    if (scrimId) {
      fetchChat();
    }
  }, [scrimId, fetchChat]);

  // Fetch messages when chat is loaded
  useEffect(() => {
    if (chat?._id) {
      fetchMessages(chat._id);
    }
  }, [chat?._id, fetchMessages]);

  // Join chat room when socket connects
  useEffect(() => {
    if (connected && chat?._id) {
      joinChat(chat._id);
    }

    return () => {
      if (chat?._id) {
        leaveChat(chat._id);
      }
    };
  }, [connected, chat?._id, joinChat, leaveChat]);

  // Listen for new messages
  useEffect(() => {
    if (!connected || !chat?._id) return;

    const handleNewMessage = (data) => {
      if (data.chatId !== chat._id) return;

      const formattedMessage = chatService.formatMessage(data.message, user);
      setMessages(prev => [...prev, formattedMessage]);

      // Increment unread if chat is minimized
      if (isChatMinimized(scrimId)) {
        incrementUnread(scrimId);
      }
    };

    onMessage(handleNewMessage);

    return () => {
      offMessage(handleNewMessage);
    };
  }, [connected, chat?._id, user, onMessage, offMessage, scrimId, isChatMinimized, incrementUnread]);

  // Listen for typing indicators
  useEffect(() => {
    if (!connected || !chat?._id) return;

    const handleTyping = (data) => {
      if (data.userId === user?.id) return; // Ignore own typing

      setTypingUsers(prev => {
        if (data.isTyping) {
          // Add user if not already in list
          if (!prev.find(u => u.userId === data.userId)) {
            return [...prev, { userId: data.userId, username: data.username }];
          }
        } else {
          // Remove user from typing list
          return prev.filter(u => u.userId !== data.userId);
        }
        return prev;
      });

      // Auto-remove typing indicator after 5 seconds
      if (data.isTyping) {
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
        }, 5000);
      }
    };

    onTyping(handleTyping);

    return () => {
      offTyping(handleTyping);
    };
  }, [connected, chat?._id, user, onTyping, offTyping]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    chat,
    messages,
    loading,
    sending,
    error,
    hasMore,
    loadingMore,
    typingUsers,
    sendMessage,
    loadMoreMessages,
    handleTyping,
    stopTyping,
    refetchChat: fetchChat,
  };
};

export default useChat;