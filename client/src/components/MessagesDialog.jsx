import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Badge,
  Typography,
  Box,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Search as SearchIcon,
  Message as MessageIcon,
} from '@mui/icons-material';
import { useChat } from '../context/ChatContext';
import api from '../services/apiClient';

/**
 * MessagesDialog
 * Shows a list of all user's chats with unread counts
 * Clicking a chat opens it in a floating ChatWindow
 */
const MessagesDialog = ({ open, onClose }) => {
  const { openChat } = useChat();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (open) {
      fetchChats();
    }
  }, [open]);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/chats');
      setChats(response.chats || []);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChatClick = (chat) => {
    // Open the chat in a floating window
    openChat(chat.scrimId, chat._id);
    onClose();
  };

  const filteredChats = chats.filter((chat) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      chat.scrim?.title?.toLowerCase().includes(searchLower) ||
      chat.participants?.some((p) =>
        p.team?.name?.toLowerCase().includes(searchLower)
      )
    );
  });

  const getOtherTeamName = (chat) => {
    // Get the name of the other team in the chat
    const otherTeam = chat.participants?.find((p) => p.team)?.team;
    return otherTeam?.name || 'Unknown Team';
  };

  const getLastMessagePreview = (chat) => {
    if (!chat.lastMessage) return 'No messages yet';

    const message = chat.lastMessage;
    const preview = message.message || '';

    // Truncate long messages
    return preview.length > 50 ? preview.substring(0, 50) + '...' : preview;
  };

  const getLastMessageTime = (chat) => {
    if (!chat.lastMessage) return '';

    const date = new Date(chat.lastMessage.createdAt);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          minHeight: '60vh',
          maxHeight: '80vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 2,
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          Messages
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ px: 3, pb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Divider />

      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 200,
            }}
          >
            <CircularProgress />
          </Box>
        ) : filteredChats.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 200,
              p: 4,
              textAlign: 'center',
            }}
          >
            <MessageIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {searchQuery ? 'No chats found' : 'No messages yet'}
            </Typography>
            <Typography variant="body2" color="text.disabled">
              {searchQuery
                ? 'Try a different search term'
                : 'Your scrim chats will appear here'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {filteredChats.map((chat, index) => (
              <React.Fragment key={chat._id}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleChatClick(chat)}
                    sx={{
                      py: 2,
                      px: 3,
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Badge
                        badgeContent={chat.unreadCount || 0}
                        color="error"
                        overlap="circular"
                      >
                        <Avatar
                          sx={{
                            bgcolor: 'primary.main',
                            width: 48,
                            height: 48,
                          }}
                        >
                          {getOtherTeamName(chat).charAt(0).toUpperCase()}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Typography
                            variant="subtitle1"
                            fontWeight={chat.unreadCount > 0 ? 700 : 500}
                          >
                            {chat.scrim?.title || 'Scrim Chat'}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ ml: 1, flexShrink: 0 }}
                          >
                            {getLastMessageTime(chat)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontWeight: chat.unreadCount > 0 ? 600 : 400,
                            }}
                          >
                            {getLastMessagePreview(chat)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
                {index < filteredChats.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MessagesDialog;
