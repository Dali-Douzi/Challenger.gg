import React, { useState, useEffect, useRef } from 'react';
import {
  Paper,
  Box,
  Typography,
  IconButton,
  Badge,
  CircularProgress,
  Collapse,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Minimize as MinimizeIcon,
  Maximize as MaximizeIcon,
} from '@mui/icons-material';
import { useChat as useChatContext } from '../../context/ChatContext';
import useChat from '../../hooks/useChat';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

/**
 * ChatWindow
 * Individual floating chat window
 * Can be minimized/maximized/closed
 */
const ChatWindow = ({ scrimId, chatId, minimized, unreadCount }) => {
  const { closeChat, toggleMinimize, resetUnread } = useChatContext();
  const {
    chat,
    messages,
    loading,
    sending,
    error,
    typingUsers,
    sendMessage,
    handleTyping,
    stopTyping,
  } = useChat(scrimId);

  const [isExpanded, setIsExpanded] = useState(!minimized);
  const windowRef = useRef(null);

  // Sync minimized state with context
  useEffect(() => {
    setIsExpanded(!minimized);
  }, [minimized]);

  // Reset unread when expanding
  useEffect(() => {
    if (isExpanded && unreadCount > 0) {
      resetUnread(scrimId);
    }
  }, [isExpanded, unreadCount, scrimId, resetUnread]);

  const handleClose = () => {
    closeChat(scrimId);
  };

  const handleToggleMinimize = () => {
    toggleMinimize(scrimId);
  };

  const handleSendMessage = async (text) => {
    try {
      await sendMessage(text);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Get chat title
  const getChatTitle = () => {
    if (!chat?.metadata?.teams) return 'Loading...';
    
    const { host, challenger } = chat.metadata.teams;
    return `${host.name} vs ${challenger.name}`;
  };

  return (
    <Paper
      ref={windowRef}
      elevation={8}
      sx={{
        width: 320,
        height: isExpanded ? 450 : 'auto',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '8px 8px 0 0',
        overflow: 'hidden',
        transition: 'height 0.3s ease',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1.5,
          bgcolor: 'primary.main',
          color: 'white',
          cursor: 'pointer',
        }}
        onClick={handleToggleMinimize}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {getChatTitle()}
          </Typography>
          
          {!isExpanded && unreadCount > 0 && (
            <Badge
              badgeContent={unreadCount}
              color="error"
              sx={{
                '& .MuiBadge-badge': {
                  position: 'relative',
                  transform: 'none',
                },
              }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
          <IconButton
            size="small"
            onClick={handleToggleMinimize}
            sx={{ color: 'white', p: 0.5 }}
          >
            {isExpanded ? (
              <MinimizeIcon fontSize="small" />
            ) : (
              <MaximizeIcon fontSize="small" />
            )}
          </IconButton>
          <IconButton
            size="small"
            onClick={handleClose}
            sx={{ color: 'white', p: 0.5 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Body (Collapsible) */}
      <Collapse in={isExpanded} timeout={300}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: 394, // Total height (450) - header height (56)
          }}
        >
          {/* Loading State */}
          {loading && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
              }}
            >
              <CircularProgress size={32} />
            </Box>
          )}

          {/* Error State */}
          {error && !loading && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                p: 2,
              }}
            >
              <Typography variant="body2" color="error" align="center">
                {error}
              </Typography>
            </Box>
          )}

          {/* Chat Content */}
          {!loading && !error && chat && (
            <>
              {/* Messages */}
              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <MessageList
                  messages={messages}
                  chat={chat}
                  typingUsers={typingUsers}
                />
              </Box>

              <Divider />

              {/* Input */}
              <Box sx={{ p: 1 }}>
                <MessageInput
                  onSend={handleSendMessage}
                  onTyping={handleTyping}
                  onStopTyping={stopTyping}
                  disabled={sending}
                  placeholder="Type a message..."
                />
              </Box>
            </>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default ChatWindow;