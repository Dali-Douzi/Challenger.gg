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
import { useChat as useChatContext } from '../context/ChatContext';
import useChat from '../hooks/useChat';
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
      elevation={24}
      sx={{
        width: 360,
        height: isExpanded ? 500 : 'auto',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '16px 16px 0 0',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          background: 'linear-gradient(135deg, #00FFFF 0%, #FF00FF 100%)',
          color: '#000000',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            background: 'linear-gradient(135deg, #5DFDFD 0%, #FF5DFF 100%)',
          },
        }}
        onClick={handleToggleMinimize}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: '#00E676',
              boxShadow: '0 0 12px rgba(0, 230, 118, 0.8)',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.5 },
              },
            }}
          />
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '0.95rem',
              letterSpacing: '0.02em',
            }}
          >
            {getChatTitle()}
          </Typography>

          {!isExpanded && unreadCount > 0 && (
            <Badge
              badgeContent={unreadCount}
              sx={{
                '& .MuiBadge-badge': {
                  position: 'relative',
                  transform: 'none',
                  bgcolor: '#ef4444',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  minWidth: 20,
                  height: 20,
                  borderRadius: '10px',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                },
              }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
          <IconButton
            size="small"
            onClick={handleToggleMinimize}
            sx={{
              color: '#000000',
              p: 0.75,
              transition: 'all 0.2s',
              width: 32,
              height: 32,
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.15)',
                transform: 'scale(1.1)',
              },
            }}
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
            sx={{
              color: '#000000',
              p: 0.75,
              transition: 'all 0.2s',
              width: 32,
              height: 32,
              '&:hover': {
                bgcolor: 'rgba(255, 23, 68, 0.3)',
                transform: 'scale(1.1)',
              },
            }}
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
            height: 436, // Total height (500) - header height (64)
            bgcolor: 'background.default',
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

              {/* Input */}
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'background.paper',
                  borderTop: '1px solid rgba(0, 255, 255, 0.3)',
                  boxShadow: '0 -2px 15px rgba(0, 255, 255, 0.2)',
                }}
              >
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