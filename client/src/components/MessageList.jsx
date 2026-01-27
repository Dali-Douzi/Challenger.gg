import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext';
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
        px: 2.5,
        py: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        bgcolor: 'background.default',
        // Custom scrollbar
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
          margin: '8px 0',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'linear-gradient(180deg, #00FFFF 0%, #FF00FF 100%)',
          borderRadius: '10px',
          border: '2px solid transparent',
          backgroundClip: 'padding-box',
          transition: 'all 0.2s',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: 'linear-gradient(180deg, #5DFDFD 0%, #FF5DFF 100%)',
          backgroundClip: 'padding-box',
        },
      }}
    >
      {/* Empty state */}
      {messages.length === 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: 2,
            animation: 'fadeInUp 0.5s ease-out',
            '@keyframes fadeInUp': {
              from: { opacity: 0, transform: 'translateY(20px)' },
              to: { opacity: 1, transform: 'translateY(0)' },
            },
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00FFFF 0%, #FF00FF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0, 255, 255, 0.5), 0 0 40px rgba(255, 0, 255, 0.3)',
            }}
          >
            <Typography variant="h3" sx={{ fontSize: '2.5rem' }}>
              💬
            </Typography>
          </Box>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
              textAlign: 'center',
            }}
          >
            No messages yet
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.disabled',
              fontSize: '0.75rem',
            }}
          >
            Start the conversation!
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
                alignItems: 'center',
                my: 3,
                gap: 2,
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.1) 50%, transparent 100%)',
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  bgcolor: 'rgba(0, 255, 255, 0.15)',
                  px: 2.5,
                  py: 0.75,
                  borderRadius: '12px',
                  color: '#00FFFF',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  boxShadow: '0 2px 15px rgba(0, 255, 255, 0.4)',
                  border: '1px solid rgba(0, 255, 255, 0.4)',
                  letterSpacing: '0.02em',
                }}
              >
                {item.date}
              </Typography>
              <Box
                sx={{
                  flex: 1,
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.1) 50%, transparent 100%)',
                }}
              />
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
            gap: 1.5,
            py: 1,
            animation: 'fadeIn 0.3s ease-in',
            '@keyframes fadeIn': {
              from: { opacity: 0, transform: 'translateY(10px)' },
              to: { opacity: 1, transform: 'translateY(0)' },
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              gap: 0.75,
              bgcolor: 'rgba(0, 255, 255, 0.15)',
              borderRadius: '18px',
              px: 2.5,
              py: 1.5,
              boxShadow: '0 2px 15px rgba(0, 255, 255, 0.4)',
              border: '1px solid rgba(0, 255, 255, 0.4)',
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00FFFF 0%, #FF00FF 100%)',
                animation: 'typingDotBounce 1.4s ease-in-out infinite',
                animationDelay: '0s',
                '@keyframes typingDotBounce': {
                  '0%, 60%, 100%': {
                    transform: 'translateY(0) scale(1)',
                    opacity: 0.7,
                  },
                  '30%': {
                    transform: 'translateY(-10px) scale(1.2)',
                    opacity: 1,
                  },
                },
              }}
            />
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00FFFF 0%, #FF00FF 100%)',
                animation: 'typingDotBounce 1.4s ease-in-out infinite',
                animationDelay: '0.2s',
                '@keyframes typingDotBounce': {
                  '0%, 60%, 100%': {
                    transform: 'translateY(0) scale(1)',
                    opacity: 0.7,
                  },
                  '30%': {
                    transform: 'translateY(-10px) scale(1.2)',
                    opacity: 1,
                  },
                },
              }}
            />
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00FFFF 0%, #FF00FF 100%)',
                animation: 'typingDotBounce 1.4s ease-in-out infinite',
                animationDelay: '0.4s',
                '@keyframes typingDotBounce': {
                  '0%, 60%, 100%': {
                    transform: 'translateY(0) scale(1)',
                    opacity: 0.7,
                  },
                  '30%': {
                    transform: 'translateY(-10px) scale(1.2)',
                    opacity: 1,
                  },
                },
              }}
            />
          </Box>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
              fontSize: '0.75rem',
              fontStyle: 'italic',
            }}
          >
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