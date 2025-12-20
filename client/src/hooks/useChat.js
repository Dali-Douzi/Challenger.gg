import { useState, useEffect, useCallback, useRef } from 'react';
import { getChatByScrimIdWithRetry, sendMessage as sendMessageAPI } from '../services/chatService';
import { 
  getSocket, 
  joinChatRoom, 
  leaveChatRoom, 
  sendTypingIndicator,
  onNewMessage,
  offNewMessage,
  onUserTyping,
  offUserTyping
} from '../services/socket';

/**
 * Custom hook for managing chat functionality
 * @param {string} scrimId - The scrim ID to load chat for
 */
const useChat = (scrimId) => {
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  
  const typingTimeoutRef = useRef(null);
  const chatIdRef = useRef(null);

  /**
   * Load chat by scrim ID
   */
  const loadChat = useCallback(async () => {
    if (!scrimId) {
      setError('No scrim ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`💬 [useChat] Loading chat for scrim: ${scrimId}`);
      
      const response = await getChatByScrimIdWithRetry(scrimId, 5, 1000);
      
      if (response && response.success && response.data) {
        const chatData = response.data;
        setChat(chatData);
        setMessages(chatData.messages || []);
        chatIdRef.current = chatData._id;
        
        console.log(`✅ [useChat] Chat loaded: ${chatData._id}, Messages: ${chatData.messages?.length || 0}`);
        
        // Join Socket.IO room
        const socket = getSocket();
        if (socket && chatData._id) {
          joinChatRoom(chatData._id);
          console.log(`✅ [useChat] Joined chat room: ${chatData._id}`);
        }
      } else {
        throw new Error('Invalid chat response');
      }
    } catch (err) {
      console.error(`❌ [useChat] Error loading chat:`, err);
      setError(err.message || 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  }, [scrimId]);

  /**
   * Send a message
   */
  const sendMessage = useCallback(async (text) => {
    if (!chatIdRef.current || !text.trim()) {
      console.warn('⚠️ [useChat] Cannot send message: missing chatId or text');
      return;
    }

    setSending(true);

    try {
      console.log(`📤 [useChat] Sending message to chat: ${chatIdRef.current}`);
      
      const response = await sendMessageAPI(chatIdRef.current, text.trim());
      
      if (response && response.success && response.data) {
        // Update local state with new chat data
        setChat(response.data);
        setMessages(response.data.messages || []);
        console.log(`✅ [useChat] Message sent successfully`);
      }
    } catch (err) {
      console.error(`❌ [useChat] Error sending message:`, err);
      throw err;
    } finally {
      setSending(false);
    }
  }, []);

  /**
   * Handle typing indicator
   */
  const handleTyping = useCallback(() => {
    if (!chatIdRef.current) return;

    const socket = getSocket();
    if (!socket) return;

    // Send typing indicator
    sendTypingIndicator(chatIdRef.current, true);
    console.log(`⌨️ [useChat] Started typing in chat: ${chatIdRef.current}`);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, []);

  /**
   * Stop typing indicator
   */
  const stopTyping = useCallback(() => {
    if (!chatIdRef.current) return;

    const socket = getSocket();
    if (!socket) return;

    sendTypingIndicator(chatIdRef.current, false);
    console.log(`⌨️ [useChat] Stopped typing in chat: ${chatIdRef.current}`);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  /**
   * Handle incoming messages
   */
  useEffect(() => {
    const handleNewMessage = (data) => {
      console.log(`🔥 [useChat] New message received:`, data);
      
      if (data.chatId === chatIdRef.current) {
        setMessages(prevMessages => [...prevMessages, data.message]);
      }
    };

    onNewMessage(handleNewMessage);

    return () => {
      offNewMessage(handleNewMessage);
    };
  }, []);

  /**
   * Handle typing indicators
   */
  useEffect(() => {
    const handleTyping = (data) => {
      console.log(`⌨️ [useChat] Typing indicator:`, data);
      
      if (data.isTyping) {
        setTypingUsers(prev => {
          const exists = prev.some(u => u.userId === data.userId);
          if (exists) return prev;
          return [...prev, { userId: data.userId, username: data.username }];
        });
      } else {
        setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
      }
    };

    onUserTyping(handleTyping);

    return () => {
      offUserTyping(handleTyping);
    };
  }, []);

  /**
   * Load chat on mount
   */
  useEffect(() => {
    loadChat();

    return () => {
      // Leave chat room on unmount
      if (chatIdRef.current) {
        leaveChatRoom(chatIdRef.current);
        console.log(`👋 [useChat] Left chat room: ${chatIdRef.current}`);
      }

      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [loadChat]);

  return {
    chat,
    messages,
    loading,
    sending,
    error,
    typingUsers,
    sendMessage,
    handleTyping,
    stopTyping,
    reload: loadChat,
  };
};

export default useChat;