import React from 'react';
import { Box, Chip, Avatar, Tooltip } from '@mui/material';

/**
 * TeamIndicator
 * Small badge showing team name/logo and role (host/challenger)
 * Used in message bubbles to identify which team sent the message
 */
const TeamIndicator = ({ teamName, teamLogo, role, size = 'small' }) => {
  /**
   * Get color based on role
   */
  const getRoleColor = () => {
    switch (role) {
      case 'host':
        return 'primary';
      case 'challenger':
        return 'secondary';
      default:
        return 'default';
    }
  };

  /**
   * Get role label
   */
  const getRoleLabel = () => {
    switch (role) {
      case 'host':
        return 'Host';
      case 'challenger':
        return 'Challenger';
      default:
        return '';
    }
  };

  // Small size variant (for message bubbles)
  if (size === 'small') {
    return (
      <Tooltip title={`${teamName} (${getRoleLabel()})`} placement="top">
        <Chip
          avatar={
            teamLogo ? (
              <Avatar
                src={teamLogo}
                alt={teamName}
                sx={{ width: 16, height: 16 }}
              />
            ) : undefined
          }
          label={teamName}
          size="small"
          color={getRoleColor()}
          sx={{
            height: 18,
            fontSize: '0.65rem',
            '& .MuiChip-label': {
              px: 0.75,
            },
            '& .MuiChip-avatar': {
              width: 16,
              height: 16,
              ml: 0.5,
            },
          }}
        />
      </Tooltip>
    );
  }

  // Medium size variant (for headers, etc.)
  if (size === 'medium') {
    return (
      <Chip
        avatar={
          teamLogo ? (
            <Avatar
              src={teamLogo}
              alt={teamName}
              sx={{ width: 20, height: 20 }}
            />
          ) : undefined
        }
        label={`${teamName} (${getRoleLabel()})`}
        size="small"
        color={getRoleColor()}
        sx={{
          height: 24,
          fontSize: '0.75rem',
        }}
      />
    );
  }

  // Large size variant (for team info displays)
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: `${getRoleColor()}.light`,
        px: 2,
        py: 1,
        borderRadius: 2,
      }}
    >
      {teamLogo && (
        <Avatar
          src={teamLogo}
          alt={teamName}
          sx={{ width: 32, height: 32 }}
        >
          {teamName?.[0]?.toUpperCase()}
        </Avatar>
      )}
      <Box>
        <Box
          sx={{
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          {teamName}
        </Box>
        <Box
          sx={{
            fontSize: '0.7rem',
            color: 'text.secondary',
          }}
        >
          {getRoleLabel()}
        </Box>
      </Box>
    </Box>
  );
};

export default TeamIndicator;