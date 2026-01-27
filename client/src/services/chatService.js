import api from './apiClient';

/**
 * Chat Service
 * Frontend service for chat-related API calls
 */

/**
 * Get chat by scrim ID with retry logic
 * @param {string} scrimId - Scrim ID
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in ms
 * @returns {Promise<Object>} Chat data
 */
export const getChatByScrimIdWithRetry = async (scrimId, maxRetries = 10, delay = 1500) => {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 [chatService] Fetching chat for scrim ${scrimId} (attempt ${attempt}/${maxRetries})`);

      const response = await api.get(`/api/chats/scrim/${scrimId}`);

      console.log(`✅ [chatService] Chat found:`, response);

      return {
        success: true,
        data: response.data || response,
      };
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ [chatService] Attempt ${attempt}/${maxRetries} failed:`, err.message);

      // For 404 errors, keep retrying because chat might still be creating
      // Only stop retrying on 403 (forbidden - permission denied)
      if (err.response?.status === 403) {
        throw new Error(err.response?.data?.message || 'Access denied to this chat');
      }

      // Wait before retrying (except on last attempt)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If all retries failed
  throw new Error(lastError?.response?.data?.message || lastError?.message || 'Chat not found - it may still be creating. Please try again in a moment.');
};

/**
 * Get chat by ID
 * @param {string} chatId - Chat ID
 * @returns {Promise<Object>} Chat data
 */
export const getChatById = async (chatId) => {
  try {
    const response = await api.get(`/api/chats/${chatId}`);
    return {
      success: true,
      data: response.data || response,
    };
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || 'Failed to load chat');
  }
};

/**
 * Get all user chats
 * @returns {Promise<Array>} List of chats
 */
export const getUserChats = async () => {
  try {
    const response = await api.get('/api/chats');
    return {
      success: true,
      data: response.data || response,
    };
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || 'Failed to load chats');
  }
};

/**
 * Send a message to a chat
 * @param {string} chatId - Chat ID
 * @param {string} content - Message content
 * @returns {Promise<Object>} Updated chat data
 */
export const sendMessage = async (chatId, content) => {
  try {
    console.log(`📤 [chatService] Sending message to chat ${chatId}`);
    
    const response = await api.post(`/api/chats/${chatId}/messages`, {
      content: content.trim(),
    });
    
    console.log(`✅ [chatService] Message sent:`, response);
    
    // Fetch updated chat to get all messages
    const updatedChat = await getChatById(chatId);
    
    return updatedChat;
  } catch (err) {
    console.error(`❌ [chatService] Error sending message:`, err);
    throw new Error(err.response?.data?.message || err.message || 'Failed to send message');
  }
};

/**
 * Mark chat as read
 * @param {string} chatId - Chat ID
 * @returns {Promise<Object>} Response
 */
export const markChatAsRead = async (chatId) => {
  try {
    const response = await api.put(`/api/chats/${chatId}/read`);
    return {
      success: true,
      data: response.data || response,
    };
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || 'Failed to mark chat as read');
  }
};

/**
 * Delete a chat
 * @param {string} chatId - Chat ID
 * @returns {Promise<Object>} Response
 */
export const deleteChat = async (chatId) => {
  try {
    const response = await api.delete(`/api/chats/${chatId}`);
    return {
      success: true,
      data: response.data || response,
    };
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || 'Failed to delete chat');
  }
};

export default {
  getChatByScrimIdWithRetry,
  getChatById,
  getUserChats,
  sendMessage,
  markChatAsRead,
  deleteChat,
};