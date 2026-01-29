import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  useMediaQuery,
  useTheme,
  Drawer,
  List,
  ListItemButton,
  Badge,
  Popover,
  Paper,
  CircularProgress,
  alpha,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import {
  Notifications,
  Message,
  Groups,
  SportsEsports,
  EmojiEvents,
  Logout,
  Person,
  Menu as MenuIcon,
  Close as CloseIcon,
  CheckCircle,
  Delete,
  MarkEmailRead,
  DeleteSweep,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { useChat } from "../context/ChatContext";
import { getUserChats } from "../services/chatService";
import { formatDistanceToNow } from "date-fns";
import api from "../services/apiClient";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user, logout } = useAuth();
  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
  } = useNotifications();
  const { totalUnreadCount, openChat } = useChat();

  const [anchorEl, setAnchorEl] = useState(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);
  const [messagesAnchorEl, setMessagesAnchorEl] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chats, setChats] = useState([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const open = Boolean(anchorEl);
  const notifOpen = Boolean(notifAnchorEl);
  const messagesOpen = Boolean(messagesAnchorEl);

  // Filter out message notifications from bell (they go to messages dropdown)
  const bellNotifications = notifications.filter(n => n.type !== 'message');
  const bellUnreadCount = bellNotifications.filter(n => !n.read).length;

  // Calculate unread conversations count (1 per conversation with unread messages)
  const unreadConversationsCount = chats.filter(chat => (chat.unreadCount || 0) > 0).length;

  const handleLogoClick = () => {
    navigate("/dashboard");
    setMobileOpen(false);
  };

  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileMenuClick = () => {
    handleMenuClose();
    navigate("/profile");
  };

  const handleTeamsClick = () => {
    handleMenuClose();
    navigate("/teams");
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate("/login");
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Notification handlers
  const handleNotificationClick = (event) => {
    setNotifAnchorEl(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotifAnchorEl(null);
  };

  const handleNotificationItemClick = async (notification) => {
    // Mark as read if unread
    if (!notification.read) {
      await markAsRead(notification._id);
    }

    // Navigate to the notification's URL
    if (notification.url) {
      navigate(notification.url);
    }

    handleNotificationClose();
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    await markAllAsRead();
  };

  const handleDeleteNotification = async (e, notificationId) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  const handleDeleteAllClick = () => {
    setDeleteAllDialogOpen(true);
  };

  const handleDeleteAllConfirm = async () => {
    await deleteAllRead();
    setDeleteAllDialogOpen(false);
  };

  const handleDeleteAllCancel = () => {
    setDeleteAllDialogOpen(false);
  };

  // Messages handlers
  const handleMessagesClick = async (event) => {
    setMessagesAnchorEl(event.currentTarget);
    if (chats.length === 0) {
      await fetchChats();
    }
  };

  const handleMessagesClose = () => {
    setMessagesAnchorEl(null);
  };

  const fetchChats = async () => {
    setChatsLoading(true);
    try {
      const response = await getUserChats();
      if (response.success) {
        // Deduplicate chats by _id
        const uniqueChats = (response.data || []).reduce((acc, chat) => {
          if (!acc.find(c => c._id === chat._id)) {
            acc.push(chat);
          }
          return acc;
        }, []);
        setChats(uniqueChats);
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setChatsLoading(false);
    }
  };

  const handleChatClick = async (chat) => {
    // Mark as read if there are unread messages
    if ((chat.unreadCount || 0) > 0) {
      try {
        await api.put(`/api/chats/${chat._id}/read`);
        // Update local state
        setChats(prevChats =>
          prevChats.map(c =>
            c._id === chat._id ? { ...c, unreadCount: 0 } : c
          )
        );
      } catch (error) {
        console.error('Failed to mark chat as read:', error);
      }
    }

    // Navigate and open chat
    if (chat.type === 'scrim' && chat.metadata?.scrimId) {
      navigate(`/scrims`);
      openChat(chat.metadata.scrimId, chat._id);
    }
    handleMessagesClose();
  };

  // Fetch chats on mount
  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

  const navItems = [
    {
      label: "Teams",
      path: "/teams",
      icon: <Groups />,
    },
    {
      label: "Scrims",
      path: "/scrims",
      icon: <SportsEsports />,
    },
    {
      label: "Tournaments",
      path: "/tournaments",
      icon: <EmojiEvents />,
    },
  ];

  const isActivePath = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const handleNavigation = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  // Mobile drawer content
  const drawer = (
    <Box sx={{ width: 250, pt: 2, height: "100%" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2, pb: 2 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            background: "linear-gradient(45deg, #00FFFF 30%, #FF00FF 90%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Challenger
        </Typography>
        <IconButton onClick={handleDrawerToggle} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider sx={{ mb: 2 }} />
      <List>
        {navItems.map((item) => {
          const getHoverColor = () => {
            if (item.label === "Teams") return "rgba(0, 255, 255, 0.16)";
            if (item.label === "Scrims") return "rgba(255, 0, 255, 0.16)";
            if (item.label === "Tournaments") return "rgba(255, 180, 0, 0.16)";
            return "rgba(0, 255, 255, 0.16)";
          };

          const getActiveTextColor = () => {
            if (item.label === "Teams") return "#00FFFF";
            if (item.label === "Scrims") return "#FF00FF";
            if (item.label === "Tournaments") return "#FFB400";
            return "#00FFFF";
          };

          return (
            <ListItemButton
              key={item.label}
              onClick={() => handleNavigation(item.path)}
              selected={isActivePath(item.path)}
              sx={{
                mx: 1,
                mb: 0.5,
                borderRadius: 2,
                transition: "all 0.2s ease",
                "&:hover": {
                  backgroundColor: getHoverColor(),
                  "& .MuiListItemIcon-root": {
                    color: getActiveTextColor(),
                  },
                  "& .MuiTypography-root": {
                    color: getActiveTextColor(),
                  },
                },
                "&.Mui-selected": {
                  backgroundColor: getHoverColor(),
                  "& .MuiListItemIcon-root": {
                    color: getActiveTextColor(),
                  },
                  "& .MuiTypography-root": {
                    color: getActiveTextColor(),
                  },
                  "&:hover": {
                    backgroundColor: getHoverColor(),
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                sx={{
                  "& .MuiTypography-root": {
                    fontWeight: isActivePath(item.path) ? 700 : 500,
                  },
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{
          backdropFilter: "blur(16px)",
          backgroundColor: "rgba(18, 18, 18, 0.95)",
          borderBottom: "2px solid transparent",
          backgroundImage: "linear-gradient(rgba(18, 18, 18, 0.95), rgba(18, 18, 18, 0.95)), linear-gradient(90deg, rgba(0, 255, 255, 0.3), rgba(255, 0, 255, 0.3))",
          backgroundOrigin: "border-box",
          backgroundClip: "padding-box, border-box",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 255, 255, 0.1)",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between", minHeight: { xs: 64, sm: 70 }, px: { xs: 2, sm: 3 } }}>
          {/* Left Section - Logo and Mobile Menu */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {isMobile && (
              <IconButton
                color="inherit"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ 
                  mr: 1,
                  "&:hover": {
                    backgroundColor: "rgba(0, 255, 255, 0.08)",
                  },
                }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Box
              onClick={handleLogoClick}
              sx={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                transition: "transform 0.2s ease",
                "&:hover": {
                  transform: "scale(1.05)",
                },
              }}
            >
              <Typography
                variant="h5"
                component="div"
                sx={{
                  fontWeight: 900,
                  background: "linear-gradient(45deg, #00FFFF 30%, #FF00FF 90%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.02em",
                  fontSize: { xs: "1.3rem", sm: "1.5rem" },
                  filter: "drop-shadow(0 0 8px rgba(0, 255, 255, 0.3))",
                }}
              >
                CHALLENGER
              </Typography>
            </Box>
          </Box>

          {/* Center Section - Navigation Items (Desktop Only) */}
          {!isMobile && (
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              {navItems.map((item) => {
                const getHoverColor = () => {
                  if (item.label === "Teams") return "rgba(0, 255, 255, 0.15)";
                  if (item.label === "Scrims") return "rgba(255, 0, 255, 0.15)";
                  if (item.label === "Tournaments") return "rgba(255, 180, 0, 0.15)";
                  return "rgba(255, 255, 255, 0.08)";
                };

                const getHoverBorderColor = () => {
                  if (item.label === "Teams") return "rgba(0, 255, 255, 0.5)";
                  if (item.label === "Scrims") return "rgba(255, 0, 255, 0.5)";
                  if (item.label === "Tournaments") return "rgba(255, 180, 0, 0.5)";
                  return "rgba(255, 255, 255, 0.1)";
                };

                const getActiveTextColor = () => {
                  if (item.label === "Teams") return "#00FFFF";
                  if (item.label === "Scrims") return "#FF00FF";
                  if (item.label === "Tournaments") return "#FFB400";
                  return "#00FFFF";
                };

                // Active background matches hover color for each section
                const getActiveBackgroundColor = () => {
                  if (item.label === "Teams") return "rgba(0, 255, 255, 0.16)";
                  if (item.label === "Scrims") return "rgba(255, 0, 255, 0.16)";
                  if (item.label === "Tournaments") return "rgba(255, 180, 0, 0.16)";
                  return "rgba(0, 255, 255, 0.16)";
                };

                const getActiveBorderColor = () => {
                  if (item.label === "Teams") return "rgba(0, 255, 255, 0.3)";
                  if (item.label === "Scrims") return "rgba(255, 0, 255, 0.3)";
                  if (item.label === "Tournaments") return "rgba(255, 180, 0, 0.3)";
                  return "rgba(0, 255, 255, 0.3)";
                };

                return (
                  <Button
                    key={item.label}
                    color="inherit"
                    onClick={() => navigate(item.path)}
                    startIcon={item.icon}
                    sx={{
                      fontWeight: isActivePath(item.path) ? 700 : 500,
                      backgroundColor: isActivePath(item.path)
                        ? getActiveBackgroundColor()
                        : "transparent",
                      color: isActivePath(item.path) ? getActiveTextColor() : "inherit",
                      border: isActivePath(item.path)
                        ? `1px solid ${getActiveBorderColor()}`
                        : "1px solid transparent",
                      "&:hover": {
                        backgroundColor: getHoverColor(),
                        borderColor: getHoverBorderColor(),
                        color: getActiveTextColor(),
                      },
                      borderRadius: 2,
                      px: 2.5,
                      py: 1,
                      transition: "all 0.2s ease",
                      textTransform: "none",
                      fontSize: "0.95rem",
                    }}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Box>
          )}

          {/* Right Section - Icons and Profile */}
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1 } }}>
            {/* Notifications */}
            <Tooltip title="Notifications">
              <IconButton
                color="inherit"
                aria-label="notifications"
                onClick={handleNotificationClick}
                sx={{
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: "rgba(0, 255, 255, 0.08)",
                    transform: "scale(1.05)",
                  },
                }}
              >
                <Badge badgeContent={bellUnreadCount} color="secondary">
                  <Notifications />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Messages */}
            <Tooltip title="Messages">
              <IconButton
                color="inherit"
                aria-label="messages"
                onClick={handleMessagesClick}
                sx={{
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: "rgba(255, 0, 255, 0.08)",
                    transform: "scale(1.05)",
                  },
                }}
              >
                <Badge badgeContent={unreadConversationsCount} color="secondary">
                  <Message />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Profile */}
            <Tooltip title="Account settings">
              <IconButton
                onClick={handleProfileClick}
                sx={{
                  ml: { xs: 0.5, sm: 1 },
                  p: 0.5,
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                  },
                }}
                aria-label="profile"
                aria-controls={open ? "profile-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={open ? "true" : undefined}
              >
                <Avatar
                  src={user?.discordAvatar || user?.avatar || undefined}
                  sx={{
                    width: { xs: 36, sm: 40 },
                    height: { xs: 36, sm: 40 },
                    fontSize: "0.9rem",
                    border: "2px solid",
                    borderColor: user?.discordAvatar ? "#5865F2" : "primary.main",
                    boxShadow: user?.discordAvatar 
                      ? "0 0 12px rgba(88, 101, 242, 0.4)"
                      : "0 0 12px rgba(0, 255, 255, 0.4)",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "scale(1.05)",
                      boxShadow: user?.discordAvatar 
                        ? "0 0 16px rgba(88, 101, 242, 0.6)"
                        : "0 0 16px rgba(0, 255, 255, 0.6)",
                    },
                  }}
                >
                  {!user?.discordAvatar && !user?.avatar && user?.username?.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>

            {/* Profile Dropdown Menu */}
            <Menu
              id="profile-menu"
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
              MenuListProps={{
                "aria-labelledby": "profile-button",
              }}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              sx={{
                mt: 1.5,
                "& .MuiPaper-root": {
                  minWidth: 220,
                  borderRadius: 3,
                  boxShadow: "0px 12px 32px rgba(0,0,0,0.5)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(10px)",
                  backgroundColor: "rgba(18, 18, 18, 0.95)",
                },
              }}
            >
              <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                  {user?.username}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                  {user?.email}
                </Typography>
              </Box>

              <Box sx={{ py: 1 }}>
                <MenuItem
                  onClick={handleProfileMenuClick}
                  sx={{
                    mx: 1,
                    my: 0.5,
                    borderRadius: 2,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: "rgba(0, 255, 255, 0.12)",
                    },
                  }}
                >
                  <ListItemIcon>
                    <Person fontSize="small" sx={{ color: "primary.main" }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Profile"
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </MenuItem>

                <MenuItem
                  onClick={handleTeamsClick}
                  sx={{
                    mx: 1,
                    my: 0.5,
                    borderRadius: 2,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: "rgba(0, 255, 255, 0.12)",
                    },
                  }}
                >
                  <ListItemIcon>
                    <Groups fontSize="small" sx={{ color: "primary.main" }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="My Teams"
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </MenuItem>
              </Box>

              <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.1)" }} />

              <Box sx={{ py: 1 }}>
                <MenuItem
                  onClick={handleLogout}
                  sx={{
                    mx: 1,
                    my: 0.5,
                    borderRadius: 2,
                    color: "error.main",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: "rgba(255, 23, 68, 0.12)",
                    },
                  }}
                >
                  <ListItemIcon>
                    <Logout fontSize="small" color="error" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Logout"
                    primaryTypographyProps={{ fontWeight: 600 }}
                  />
                </MenuItem>
              </Box>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Notification Popover */}
      <Popover
        open={notifOpen}
        anchorEl={notifAnchorEl}
        onClose={handleNotificationClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        sx={{
          mt: 1.5,
          "& .MuiPaper-root": {
            width: 380,
            maxHeight: 500,
            borderRadius: 3,
            boxShadow: "0px 12px 32px rgba(0,0,0,0.5)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
            backgroundColor: "rgba(18, 18, 18, 0.95)",
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="h6" fontWeight={700}>
              Notifications
            </Typography>
            {bellUnreadCount > 0 && (
              <Button
                size="small"
                startIcon={<MarkEmailRead />}
                onClick={handleMarkAllRead}
                sx={{
                  fontSize: "0.75rem",
                  textTransform: "none",
                  color: "primary.main",
                }}
              >
                Mark all read
              </Button>
            )}
          </Box>
          {bellNotifications.filter(n => n.read).length > 0 && (
            <Button
              size="small"
              startIcon={<DeleteSweep />}
              onClick={handleDeleteAllClick}
              fullWidth
              sx={{
                fontSize: "0.75rem",
                textTransform: "none",
                color: "error.main",
                justifyContent: "flex-start",
              }}
            >
              Delete all read
            </Button>
          )}
        </Box>

        <Box sx={{ maxHeight: 400, overflow: "auto" }}>
          {notificationsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : bellNotifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Notifications sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No notifications yet
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {bellNotifications.slice(0, 10).map((notification) => (
                <ListItemButton
                  key={notification._id}
                  onClick={() => handleNotificationItemClick(notification)}
                  sx={{
                    py: 2,
                    px: 2,
                    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                    backgroundColor: notification.read ? "transparent" : alpha(theme.palette.primary.main, 0.05),
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: notification.read ? 400 : 600,
                        color: notification.read ? "text.secondary" : "text.primary",
                        mb: 0.5,
                      }}
                    >
                      {notification.message}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {notification.timeAgo}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => handleDeleteNotification(e, notification._id)}
                    sx={{
                      ml: 1,
                      color: "text.disabled",
                      "&:hover": {
                        color: "error.main",
                      },
                    }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>

        {bellNotifications.length > 10 && (
          <Box sx={{ p: 2, borderTop: "1px solid rgba(255, 255, 255, 0.1)", textAlign: "center" }}>
            <Button
              size="small"
              onClick={() => {
                handleNotificationClose();
                // Navigate to full notifications page when it exists
              }}
              sx={{
                textTransform: "none",
                color: "primary.main",
              }}
            >
              View all notifications
            </Button>
          </Box>
        )}
      </Popover>

      {/* Messages Popover */}
      <Popover
        open={messagesOpen}
        anchorEl={messagesAnchorEl}
        onClose={handleMessagesClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        sx={{
          mt: 1.5,
          "& .MuiPaper-root": {
            width: 380,
            maxHeight: 500,
            borderRadius: 3,
            boxShadow: "0px 12px 32px rgba(0,0,0,0.5)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
            backgroundColor: "rgba(18, 18, 18, 0.95)",
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <Typography variant="h6" fontWeight={700}>
            Messages
          </Typography>
        </Box>

        <Box sx={{ maxHeight: 400, overflow: "auto" }}>
          {chatsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : chats.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Message sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No messages yet
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {chats.slice(0, 10).filter(chat => {
                // Only show chats with messages
                const lastMessage = chat.messages?.[chat.messages.length - 1];
                return lastMessage && (lastMessage.text || lastMessage.content);
              }).map((chat) => {
                const lastMessage = chat.messages?.[chat.messages.length - 1];
                const unreadCount = chat.unreadCount || 0;

                // Get chat title based on type
                const getChatTitle = () => {
                  if (chat.type === 'scrim' && chat.metadata?.teams) {
                    const { host, challenger } = chat.metadata.teams;
                    return `${host.name} vs ${challenger.name}`;
                  }
                  return 'Chat';
                };

                return (
                  <ListItemButton
                    key={chat._id}
                    onClick={() => handleChatClick(chat)}
                    sx={{
                      py: 2,
                      px: 2,
                      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      backgroundColor: unreadCount > 0 ? alpha(theme.palette.secondary.main, 0.05) : "transparent",
                      "&:hover": {
                        backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                      },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: unreadCount > 0 ? 600 : 400,
                            color: unreadCount > 0 ? "text.primary" : "text.secondary",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {getChatTitle()}
                        </Typography>
                        {unreadCount > 0 && (
                          <Chip
                            label={unreadCount}
                            size="small"
                            sx={{
                              height: 20,
                              minWidth: 20,
                              bgcolor: theme.palette.secondary.main,
                              color: "white",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                            }}
                          />
                        )}
                      </Box>

                      {lastMessage && (
                        <>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "text.secondary",
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              mb: 0.5,
                            }}
                          >
                            {lastMessage.sender?.username}: {lastMessage.text || lastMessage.content}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "text.disabled",
                              fontSize: "0.65rem",
                            }}
                          >
                            {formatDistanceToNow(new Date(lastMessage.timestamp || lastMessage.createdAt), { addSuffix: true })}
                          </Typography>
                        </>
                      )}
                    </Box>
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </Box>

        {chats.length > 10 && (
          <Box sx={{ p: 2, borderTop: "1px solid rgba(255, 255, 255, 0.1)", textAlign: "center" }}>
            <Button
              size="small"
              onClick={() => {
                navigate('/scrims');
                handleMessagesClose();
              }}
              sx={{
                fontSize: "0.75rem",
                textTransform: "none",
                color: "secondary.main",
              }}
            >
              View all messages
            </Button>
          </Box>
        )}
      </Popover>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: 250,
            backgroundColor: "background.paper",
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Delete All Confirmation Dialog */}
      <Dialog
        open={deleteAllDialogOpen}
        onClose={handleDeleteAllCancel}
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: 'background.paper',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Delete All Read Notifications?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.secondary' }}>
            This will permanently delete all read notifications. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={handleDeleteAllCancel} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAllConfirm}
            variant="contained"
            color="error"
            sx={{ textTransform: 'none' }}
          >
            Delete All
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Navbar;