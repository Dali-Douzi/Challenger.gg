import React from 'react';
import { Box } from '@mui/material';
import { useChat } from '../../context/ChatContext';
import ChatWindow from './ChatWindow';

/**
 * ChatManager
 * Container for all floating chat windows
 * Renders at bottom-right of screen, persists across pages
 */
const ChatManager = () => {
  const { openChats } = useChat();

  // Don't render anything if no chats are open
  if (openChats.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        right: 16,
        display: 'flex',
        gap: 1,
        alignItems: 'flex-end',
        zIndex: 1300, // Above most content, below modals
        pointerEvents: 'none', // Allow clicking through empty space
      }}
    >
      {openChats.map((chat) => (
        <Box
          key={chat.scrimId}
          sx={{
            pointerEvents: 'auto', // Re-enable pointer events for chat windows
          }}
        >
          <ChatWindow
            scrimId={chat.scrimId}
            chatId={chat.chatId}
            minimized={chat.minimized}
            unreadCount={chat.unreadCount}
          />
        </Box>
      ))}
    </Box>
  );
};

export default ChatManager;