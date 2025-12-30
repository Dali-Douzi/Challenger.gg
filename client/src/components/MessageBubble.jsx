import React from 'react';
import { Box, Typography, Avatar, Tooltip } from '@mui/material';
import TeamIndicator from './TeamIndicator';

const MessageBubble = ({ message, chat, isOwnMessage }) => {
  // ✅ Handle both field name formats
  const sender = message.sender || {};
  const text = message.content || message.text || '';
  const timestamp = message.createdAt || message.timestamp;
  
  /**
   * Get team info from chat metadata based on senderTeam
   */
  const getTeamInfo = () => {
    if (!chat?.metadata?.teams || !message.senderTeam) {
      return null;
    }

    const { host, challenger } = chat.metadata.teams;
    
    // Check if sender is from host team
    if (message.senderTeam.toString() === host.id.toString()) {
      return {
        teamName: host.name,
        teamLogo: host.logo,
        role: 'host',
      };
    }
    
    // Check if sender is from challenger team
    if (message.senderTeam.toString() === challenger.id.toString()) {
      return {
        teamName: challenger.name,
        teamLogo: challenger.logo,
        role: 'challenger',
      };
    }
    
    return null;
  };

  const teamInfo = getTeamInfo();

  /**
   * Format timestamp to readable time (e.g., "2:30 PM")
   */
  const formatTime = (date) => {
    if (!date) return '';
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
      {/* Avatar - only show for opponent messages */}
      {!isOwnMessage && (
        <Tooltip title={sender.username || 'Unknown'} placement="left">
          <Avatar
            src={sender.avatar}
            alt={sender.username}
            sx={{
              width: 28,
              height: 28,
              fontSize: '0.75rem',
            }}
          >
            {sender.username?.[0]?.toUpperCase() || '?'}
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
              {sender.username || 'Unknown'}
            </Typography>
            
            {/* Team Indicator Badge */}
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
            // Speech bubble tail/pointer
            '&::before': {
              content: '""',
              position: 'absolute',
              bottom: 4,
              width: 0,
              height: 0,
              borderStyle: 'solid',
              ...(isOwnMessage
                ? {
                    // Tail on right for own messages
                    right: -6,
                    borderWidth: '6px 0 0 6px',
                    borderColor: `transparent transparent transparent`,
                    borderLeftColor: 'primary.main',
                  }
                : {
                    // Tail on left for opponent messages
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
              whiteSpace: 'pre-wrap', // Preserve line breaks
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