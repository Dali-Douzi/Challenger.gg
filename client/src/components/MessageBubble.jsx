import React from 'react';
import { Box, Typography, Avatar, Tooltip } from '@mui/material';
import TeamIndicator from './TeamIndicator';

/**
 * MessageBubble
 * Individual message display with sender info and team context
 */
const MessageBubble = ({ message, chat, isOwnMessage }) => {
  const { sender, text, timestamp, teamInfo } = message;

  /**
   * Format time (e.g., "2:30 PM")
   */
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isOwnMessage ? 'row-reverse' : 'row',
        gap: 1,
        alignItems: 'flex-end',
        mb: 0.5,
      }}
    >
      {/* Avatar */}
      {!isOwnMessage && (
        <Tooltip title={sender.username} placement="left">
          <Avatar
            src={sender.avatar}
            alt={sender.username}
            sx={{
              width: 28,
              height: 28,
              fontSize: '0.75rem',
            }}
          >
            {sender.username?.[0]?.toUpperCase()}
          </Avatar>
        </Tooltip>
      )}

      {/* Message Content */}
      <Box
        sx={{
          maxWidth: '70%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
        }}
      >
        {/* Sender Name + Team Indicator (only for opponent messages) */}
        {!isOwnMessage && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mb: 0.25,
              ml: 0.5,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: 'text.secondary',
                fontSize: '0.7rem',
              }}
            >
              {sender.username}
            </Typography>
            
            {teamInfo && (
              <TeamIndicator
                teamName={teamInfo.teamName}
                teamLogo={teamInfo.teamLogo}
                role={teamInfo.role}
                size="small"
              />
            )}
          </Box>
        )}

        {/* Message Bubble */}
        <Box
          sx={{
            bgcolor: isOwnMessage ? 'primary.main' : 'grey.200',
            color: isOwnMessage ? 'white' : 'text.primary',
            borderRadius: 2,
            px: 1.5,
            py: 1,
            wordWrap: 'break-word',
            position: 'relative',
            // Tail/pointer
            '&::before': {
              content: '""',
              position: 'absolute',
              bottom: 4,
              width: 0,
              height: 0,
              borderStyle: 'solid',
              ...(isOwnMessage
                ? {
                    right: -6,
                    borderWidth: '6px 0 0 6px',
                    borderColor: `transparent transparent transparent`,
                    borderLeftColor: 'primary.main',
                  }
                : {
                    left: -6,
                    borderWidth: '6px 6px 0 0',
                    borderColor: `transparent`,
                    borderTopColor: 'grey.200',
                  }),
            },
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.875rem',
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
            }}
          >
            {text}
          </Typography>
        </Box>

        {/* Timestamp */}
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.65rem',
            color: 'text.secondary',
            mt: 0.25,
            mx: 0.5,
          }}
        >
          {formatTime(timestamp)}
        </Typography>
      </Box>
    </Box>
  );
};

export default MessageBubble;