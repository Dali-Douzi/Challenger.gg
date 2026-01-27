import React from 'react';
import { Box, Typography, Avatar, Tooltip, Fade, Zoom } from '@mui/material';
import { CheckCircle, Done, DoneAll } from '@mui/icons-material';
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
    <Zoom in timeout={300}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: isOwnMessage ? 'row-reverse' : 'row',
          gap: 1,
          alignItems: 'flex-end',
          mb: 1,
          animation: 'slideIn 0.3s ease-out',
          '@keyframes slideIn': {
            from: {
              opacity: 0,
              transform: isOwnMessage ? 'translateX(20px)' : 'translateX(-20px)',
            },
            to: {
              opacity: 1,
              transform: 'translateX(0)',
            },
          },
        }}
      >
        {/* Avatar - only show for opponent messages */}
        {!isOwnMessage && (
          <Tooltip title={sender.username || 'Unknown'} placement="left" arrow>
            <Avatar
              src={sender.avatar}
              alt={sender.username}
              sx={{
                width: 32,
                height: 32,
                fontSize: '0.8rem',
                border: '2px solid white',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.1)',
                },
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
            background: isOwnMessage
              ? 'linear-gradient(135deg, #00FFFF 0%, #FF00FF 100%)'
              : 'rgba(0, 255, 255, 0.08)',
            color: isOwnMessage ? '#000000' : 'text.primary',
            borderRadius: isOwnMessage ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            px: 2,
            py: 1.25,
            wordWrap: 'break-word',
            position: 'relative',
            boxShadow: isOwnMessage
              ? '0 4px 20px rgba(0, 255, 255, 0.5), 0 0 15px rgba(255, 0, 255, 0.3)'
              : '0 2px 10px rgba(0, 255, 255, 0.2)',
            transition: 'all 0.2s ease',
            border: isOwnMessage
              ? '1px solid rgba(255, 0, 255, 0.5)'
              : '1px solid rgba(0, 255, 255, 0.3)',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: isOwnMessage
                ? '0 6px 25px rgba(0, 255, 255, 0.7), 0 0 20px rgba(255, 0, 255, 0.5)'
                : '0 4px 15px rgba(0, 255, 255, 0.3)',
              border: isOwnMessage
                ? '1px solid rgba(255, 0, 255, 0.7)'
                : '1px solid rgba(0, 255, 255, 0.5)',
            },
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.9rem',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {text}
          </Typography>
        </Box>

        {/* Timestamp and Status */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            mt: 0.25,
            mx: 0.5,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.7rem',
              color: 'text.disabled',
              fontWeight: 500,
            }}
          >
            {formatTime(timestamp)}
          </Typography>

          {/* Delivery Status (only for own messages) */}
          {isOwnMessage && (
            <Tooltip title="Delivered" placement="top" arrow>
              <DoneAll
                sx={{
                  fontSize: '0.85rem',
                  color: '#00FFFF',
                  transition: 'color 0.2s',
                }}
              />
            </Tooltip>
          )}
        </Box>
      </Box>
      </Box>
    </Zoom>
  );
};

export default MessageBubble;