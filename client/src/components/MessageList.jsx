import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import MessageBubble from './MessageBubble';

/**
 * MessageList
 * Scrollable container for chat messages
 * Auto-scrolls to bottom on new messages
 */
const MessageList = ({ messages, chat, typingUsers = [] }) => {
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = React.useState(true);

  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  /**
   * Check if user is scrolled near bottom
   */
  const isNearBottom = () => {
    if (!containerRef.current) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    return distanceFromBottom < 100; // Within 100px of bottom
  };

  /**
   * Handle scroll event
   */
  const handleScroll = () => {
    setShouldAutoScroll(isNearBottom());
  };

  /**
   * Auto-scroll to bottom when new messages arrive (if near bottom)
   */
  useEffect(() => {
    if (shouldAutoScroll && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, shouldAutoScroll]);

  /**
   * Scroll to bottom on mount (instant)
   */
  useEffect(() => {
    scrollToBottom('instant');
  }, []);

  /**
   * Group messages by date
   */
  const groupMessagesByDate = () => {
    const groups = [];
    let currentDate = null;

    messages.forEach((message) => {
      const messageDate = new Date(message.timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (messageDate !== currentDate) {
        groups.push({
          type: 'date',
          date: messageDate,
        });
        currentDate = messageDate;
      }

      groups.push({
        type: 'message',
        message,
      });
    });

    return groups;
  };

  const groupedMessages = groupMessagesByDate();

  return (
    <Box
      ref={containerRef}
      onScroll={handleScroll}
      sx={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        px: 2,
        py: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        // Custom scrollbar
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#888',
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: '#555',
        },
      }}
    >
      {/* Empty state */}
      {messages.length === 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'text.secondary',
          }}
        >
          <Typography variant="body2">
            No messages yet. Start the conversation!
          </Typography>
        </Box>
      )}

      {/* Messages grouped by date */}
      {groupedMessages.map((item, index) => {
        if (item.type === 'date') {
          return (
            <Box
              key={`date-${index}`}
              sx={{
                display: 'flex',
                justifyContent: 'center',
                my: 2,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  bgcolor: 'background.paper',
                  px: 2,
                  py: 0.5,
                  borderRadius: 1,
                  color: 'text.secondary',
                  fontSize: '0.7rem',
                  fontWeight: 500,
                }}
              >
                {item.date}
              </Typography>
            </Box>
          );
        }

        return (
          <MessageBubble
            key={item.message._id || index}
            message={item.message}
            chat={chat}
            isOwnMessage={item.message.sender._id === user?.id}
          />
        );
      })}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            py: 1,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              bgcolor: 'grey.200',
              borderRadius: 2,
              px: 2,
              py: 1,
            }}
          >
            <Box
              className="typing-dot"
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: 'grey.600',
                animation: 'typingDot 1.4s infinite',
                animationDelay: '0s',
                '@keyframes typingDot': {
                  '0%, 60%, 100%': { transform: 'translateY(0)' },
                  '30%': { transform: 'translateY(-8px)' },
                },
              }}
            />
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: 'grey.600',
                animation: 'typingDot 1.4s infinite',
                animationDelay: '0.2s',
                '@keyframes typingDot': {
                  '0%, 60%, 100%': { transform: 'translateY(0)' },
                  '30%': { transform: 'translateY(-8px)' },
                },
              }}
            />
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: 'grey.600',
                animation: 'typingDot 1.4s infinite',
                animationDelay: '0.4s',
                '@keyframes typingDot': {
                  '0%, 60%, 100%': { transform: 'translateY(0)' },
                  '30%': { transform: 'translateY(-8px)' },
                },
              }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {typingUsers[0].username} is typing...
          </Typography>
        </Box>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </Box>
  );
};

export default MessageList;