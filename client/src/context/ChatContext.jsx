import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * ChatContext
 * Manages global state for floating chat windows
 * - Which chats are open
 * - Which chats are minimized
 * - Chat window positioning
 */

const ChatContext = createContext(null);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  // Array of open chat windows
  // Structure: [{ scrimId, chatId, minimized, unreadCount }]
  const [openChats, setOpenChats] = useState([]);

  // Maximum number of chat windows allowed
  const MAX_OPEN_CHATS = 3;

  /**
   * Open a chat window by scrim ID
   * @param {string} scrimId - Scrim ID
   * @param {string} chatId - Chat ID (optional, will be fetched if not provided)
   */
  const openChat = useCallback((scrimId, chatId = null) => {
    setOpenChats((prev) => {
      // Check if chat is already open
      const existing = prev.find(chat => chat.scrimId === scrimId);
      
      if (existing) {
        // If minimized, maximize it
        if (existing.minimized) {
          return prev.map(chat =>
            chat.scrimId === scrimId
              ? { ...chat, minimized: false, unreadCount: 0 }
              : chat
          );
        }
        // Already open and maximized, do nothing
        return prev;
      }

      // If at max capacity, close the oldest chat
      let updated = prev;
      if (prev.length >= MAX_OPEN_CHATS) {
        updated = prev.slice(1); // Remove first (oldest)
      }

      // Add new chat
      return [
        ...updated,
        {
          scrimId,
          chatId,
          minimized: false,
          unreadCount: 0,
        },
      ];
    });
  }, []);

  /**
   * Close a chat window
   * @param {string} scrimId - Scrim ID
   */
  const closeChat = useCallback((scrimId) => {
    setOpenChats((prev) => prev.filter(chat => chat.scrimId !== scrimId));
  }, []);

  /**
   * Minimize a chat window
   * @param {string} scrimId - Scrim ID
   */
  const minimizeChat = useCallback((scrimId) => {
    setOpenChats((prev) =>
      prev.map(chat =>
        chat.scrimId === scrimId
          ? { ...chat, minimized: true }
          : chat
      )
    );
  }, []);

  /**
   * Maximize a chat window
   * @param {string} scrimId - Scrim ID
   */
  const maximizeChat = useCallback((scrimId) => {
    setOpenChats((prev) =>
      prev.map(chat =>
        chat.scrimId === scrimId
          ? { ...chat, minimized: false, unreadCount: 0 }
          : chat
      )
    );
  }, []);

  /**
   * Toggle minimize/maximize
   * @param {string} scrimId - Scrim ID
   */
  const toggleMinimize = useCallback((scrimId) => {
    setOpenChats((prev) =>
      prev.map(chat =>
        chat.scrimId === scrimId
          ? { 
              ...chat, 
              minimized: !chat.minimized,
              unreadCount: chat.minimized ? 0 : chat.unreadCount // Reset unread when maximizing
            }
          : chat
      )
    );
  }, []);

  /**
   * Update chat ID after it's been fetched
   * @param {string} scrimId - Scrim ID
   * @param {string} chatId - Chat ID
   */
  const setChatId = useCallback((scrimId, chatId) => {
    setOpenChats((prev) =>
      prev.map(chat =>
        chat.scrimId === scrimId
          ? { ...chat, chatId }
          : chat
      )
    );
  }, []);

  /**
   * Increment unread count for a minimized chat
   * @param {string} scrimId - Scrim ID
   */
  const incrementUnread = useCallback((scrimId) => {
    setOpenChats((prev) =>
      prev.map(chat =>
        chat.scrimId === scrimId && chat.minimized
          ? { ...chat, unreadCount: (chat.unreadCount || 0) + 1 }
          : chat
      )
    );
  }, []);

  /**
   * Reset unread count for a chat
   * @param {string} scrimId - Scrim ID
   */
  const resetUnread = useCallback((scrimId) => {
    setOpenChats((prev) =>
      prev.map(chat =>
        chat.scrimId === scrimId
          ? { ...chat, unreadCount: 0 }
          : chat
      )
    );
  }, []);

  /**
   * Check if a chat is open
   * @param {string} scrimId - Scrim ID
   * @returns {boolean}
   */
  const isChatOpen = useCallback((scrimId) => {
    return openChats.some(chat => chat.scrimId === scrimId);
  }, [openChats]);

  /**
   * Check if a chat is minimized
   * @param {string} scrimId - Scrim ID
   * @returns {boolean}
   */
  const isChatMinimized = useCallback((scrimId) => {
    const chat = openChats.find(chat => chat.scrimId === scrimId);
    return chat?.minimized || false;
  }, [openChats]);

  /**
   * Get chat by scrim ID
   * @param {string} scrimId - Scrim ID
   * @returns {Object|null}
   */
  const getChat = useCallback((scrimId) => {
    return openChats.find(chat => chat.scrimId === scrimId) || null;
  }, [openChats]);

  /**
   * Close all chats
   */
  const closeAllChats = useCallback(() => {
    setOpenChats([]);
  }, []);

  /**
   * Minimize all chats
   */
  const minimizeAllChats = useCallback(() => {
    setOpenChats((prev) =>
      prev.map(chat => ({ ...chat, minimized: true }))
    );
  }, []);

  const value = {
    openChats,
    openChat,
    closeChat,
    minimizeChat,
    maximizeChat,
    toggleMinimize,
    setChatId,
    incrementUnread,
    resetUnread,
    isChatOpen,
    isChatMinimized,
    getChat,
    closeAllChats,
    minimizeAllChats,
    MAX_OPEN_CHATS,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext;
