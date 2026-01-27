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
        maxRows={4}
        size="small"
        variant="outlined"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={handleSend}
                disabled={!message.trim() || disabled}
                size="medium"
                sx={{
                  background: message.trim()
                    ? 'linear-gradient(135deg, #00FFFF 0%, #FF00FF 100%)'
                    : 'transparent',
                  color: message.trim() ? '#000000' : 'text.disabled',
                  width: 36,
                  height: 36,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: message.trim() ? '0 0 15px rgba(0, 255, 255, 0.5)' : 'none',
                  '&:hover': {
                    background: message.trim()
                      ? 'linear-gradient(135deg, #5DFDFD 0%, #FF5DFF 100%)'
                      : 'transparent',
                    transform: message.trim() ? 'scale(1.1) rotate(15deg)' : 'none',
                    boxShadow: message.trim() ? '0 0 20px rgba(0, 255, 255, 0.7)' : 'none',
                  },
                  '&:active': {
                    transform: message.trim() ? 'scale(0.95)' : 'none',
                  },
                  '&.Mui-disabled': {
                    background: 'transparent',
                    color: 'text.disabled',
                  },
                }}
              >
                <SendIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
          sx: {
            borderRadius: '20px',
            bgcolor: 'background.paper',
            transition: 'all 0.2s ease',
            '& input, & textarea': {
              fontSize: '0.9rem',
              color: 'text.primary',
            },
          },
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'rgba(0, 255, 255, 0.3)',
              borderWidth: 2,
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0, 255, 255, 0.5)',
              boxShadow: '0 0 10px rgba(0, 255, 255, 0.3)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#00FFFF',
              boxShadow: '0 0 15px rgba(0, 255, 255, 0.6), 0 0 5px rgba(255, 0, 255, 0.3)',
            },
            '&.Mui-focused': {
              bgcolor: 'background.paper',
            },
          },
          '& .MuiInputBase-input::placeholder': {
            color: 'text.disabled',
            opacity: 1,
          },
        }}
      />
    </Box>
  );
};

export default MessageInput;