import React, { useState, useRef } from 'react';
import { Box, TextField, IconButton, InputAdornment } from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';

/**
 * MessageInput
 * Text input with send button and typing detection
 * Handles Enter key to send, Shift+Enter for new line
 */
const MessageInput = ({
  onSend,
  onTyping,
  onStopTyping,
  disabled = false,
  placeholder = 'Type a message...',
}) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);

  /**
   * Handle input change
   */
  const handleChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    // Trigger typing indicator
    if (value.trim() && onTyping) {
      onTyping();
    } else if (!value.trim() && onStopTyping) {
      onStopTyping();
    }
  };

  /**
   * Handle send message
   */
  const handleSend = () => {
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage || disabled) return;

    // Send message
    onSend(trimmedMessage);

    // Clear input
    setMessage('');

    // Stop typing indicator
    if (onStopTyping) {
      onStopTyping();
    }

    // Refocus input
    inputRef.current?.focus();
  };

  /**
   * Handle key press
   * Enter = send
   * Shift+Enter = new line
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 1,
      }}
    >
      <TextField
        inputRef={inputRef}
        value={message}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        disabled={disabled}
        fullWidth
        multiline
        maxRows={3}
        size="small"
        variant="outlined"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={handleSend}
                disabled={!message.trim() || disabled}
                size="small"
                color="primary"
                sx={{
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'scale(1.1)',
                  },
                }}
              >
                <SendIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
          sx: {
            borderRadius: 2,
            bgcolor: 'background.default',
          },
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'divider',
            },
            '&:hover fieldset': {
              borderColor: 'primary.main',
            },
          },
        }}
      />
    </Box>
  );
};

export default MessageInput;