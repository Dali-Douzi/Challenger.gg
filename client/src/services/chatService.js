import api from './apiClient';

/**
 * Chat Service
 * Handles all HTTP API calls for chat operations
 */

/**
 * Get all chats for the current user
 * @returns {Promise<Array>} List of chats
 */
export const getUserChats = async () => {
  try {
    const response = await api.get('/api/chats');
    return response.data || [];
  } catch (error) {
    console.error('Error fetching user chats:', error);
    throw error;
  }
};

/**
 * Get a specific chat by ID
 * @param {string} chatId - Chat ID
 * @param {number} limit - Number of messages to fetch
 * @param {number} skip - Number of messages to skip
 * @returns {Promise<Object>} Chat object with messages
 */
export const getChatById = async (chatId, limit = 50, skip = 0) => {
  try {
    const response = await api.get(`/api/chats/${chatId}?limit=${limit}&skip=${skip}`);
    return response;
  } catch (error) {
    console.error(`Error fetching chat ${chatId}:`, error);
    throw error;
  }
};

/**
 * Get chat by scrim ID
 * @param {string} scrimId - Scrim ID
 * @returns {Promise<Object>} Chat object
 */
export const getChatByScrimId = async (scrimId) => {
  try {
    const response = await api.get(`/api/chats/scrim/${scrimId}`);
    return response;
  } catch (error) {
    console.error(`Error fetching chat for scrim ${scrimId}:`, error);
    throw error;
  }
};

/**
 * Send a message to a chat
 * @param {string} chatId - Chat ID
 * @param {string} text - Message text
 * @returns {Promise<Object>} Sent message object
 */
export const sendMessage = async (chatId, text) => {
  try {
    const response = await api.post(`/api/chats/${chatId}/messages`, { text });
    return response;
  } catch (error) {
    console.error(`Error sending message to chat ${chatId}:`, error);
    throw error;
  }
};

/**
 * Create a new chat (DM or group)
 * @param {string} type - Chat type ('dm' or 'group')
 * @param {Array<string>} participants - Array of user IDs
 * @param {Object} metadata - Optional metadata
 * @returns {Promise<Object>} Created chat object
 */
export const createChat = async (type, participants, metadata = {}) => {
  try {
    const response = await api.post('/api/chats', {
      type,
      participants,
      metadata,
    });
    return response;
  } catch (error) {
    console.error('Error creating chat:', error);
    throw error;
  }
};

/**
 * Load more messages (pagination)
 * @param {string} chatId - Chat ID
 * @param {number} skip - Number of messages to skip
 * @param {number} limit - Number of messages to fetch
 * @returns {Promise<Array>} Array of messages
 */
export const loadMoreMessages = async (chatId, skip, limit = 50) => {
  try {
    const response = await api.get(`/api/chats/${chatId}?limit=${limit}&skip=${skip}`);
    return response.data?.messages || [];
  } catch (error) {
    console.error(`Error loading more messages for chat ${chatId}:`, error);
    throw error;
  }
};

/**
 * Retry getting chat by scrim ID with exponential backoff
 * Handles race condition where chat might not be created yet
 * @param {string} scrimId - Scrim ID
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} initialDelay - Initial delay in ms
 * @returns {Promise<Object>} Chat object
 */
export const getChatByScrimIdWithRetry = async (
  scrimId,
  maxRetries = 3,
  initialDelay = 500
) => {
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const chat = await getChatByScrimId(scrimId);
      
      if (chat && chat.success) {
        console.log(`✅ Chat found for scrim ${scrimId} on attempt ${attempt + 1}`);
        return chat;
      }
    } catch (error) {
      lastError = error;
      
      // If not 404, don't retry
      if (error.response?.status !== 404) {
        throw error;
      }

      // If this was the last attempt, throw
      if (attempt === maxRetries - 1) {
        break;
      }

      // Wait before retrying (exponential backoff)
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`⏳ Chat not found yet, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All retries failed
  console.error(`❌ Failed to find chat for scrim ${scrimId} after ${maxRetries} attempts`);
  throw lastError || new Error('Chat not found after retries');
};

/**
 * Format message for display
 * @param {Object} message - Raw message object
 * @param {Object} currentUser - Current user object
 * @returns {Object} Formatted message
 */
export const formatMessage = (message, currentUser) => {
  return {
    ...message,
    isOwnMessage: message.sender._id === currentUser?.id,
    senderName: message.sender.username,
    senderAvatar: message.sender.avatar,
    timestamp: new Date(message.timestamp),
    formattedTime: new Date(message.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
};

/**
 * Group messages by date
 * @param {Array} messages - Array of messages
 * @returns {Object} Messages grouped by date
 */
export const groupMessagesByDate = (messages) => {
  const grouped = {};

  messages.forEach(message => {
    const date = new Date(message.timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (!grouped[date]) {
      grouped[date] = [];
    }

    grouped[date].push(message);
  });

  return grouped;
};

export default {
  getUserChats,
  getChatById,
  getChatByScrimId,
  getChatByScrimIdWithRetry,
  sendMessage,
  createChat,
  loadMoreMessages,
  formatMessage,
  groupMessagesByDate,
};