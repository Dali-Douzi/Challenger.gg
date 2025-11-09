import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Avatar,
  Badge,
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
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";

// Discord SVG Icon Component
const DiscordIcon = ({ sx = {} }) => (
  <Box
    component="svg"
    viewBox="0 0 24 24"
    sx={{
      width: 24,
      height: 24,
      fill: "currentColor",
      ...sx,
    }}
  >
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
  </Box>
);

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const open = Boolean(anchorEl);

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

  const handleDiscordClick = () => {
    // Replace with your Discord server invite link
    window.open("https://discord.gg/yourserver", "_blank");
  };

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
        {navItems.map((item) => (
          <ListItemButton
            key={item.label}
            onClick={() => handleNavigation(item.path)}
            selected={isActivePath(item.path)}
            sx={{
              mx: 1,
              mb: 0.5,
              borderRadius: 2,
              transition: "all 0.2s ease",
              "&.Mui-selected": {
                backgroundColor: "rgba(0, 255, 255, 0.16)",
                "&:hover": {
                  backgroundColor: "rgba(0, 255, 255, 0.24)",
                },
              },
            }}
          >
            <ListItemIcon sx={{ 
              color: isActivePath(item.path) ? "primary.main" : "inherit",
              minWidth: 40,
            }}>
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
        ))}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{
          backdropFilter: "blur(10px)",
          backgroundColor: "rgba(18, 18, 18, 0.9)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
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
                }}
              >
                CHALLENGER
              </Typography>
            </Box>
          </Box>

          {/* Center Section - Navigation Items (Desktop Only) */}
          {!isMobile && (
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              {navItems.map((item) => (
                <Button
                  key={item.label}
                  color="inherit"
                  onClick={() => navigate(item.path)}
                  startIcon={item.icon}
                  sx={{
                    fontWeight: isActivePath(item.path) ? 700 : 500,
                    backgroundColor: isActivePath(item.path)
                      ? "rgba(0, 255, 255, 0.16)"
                      : "transparent",
                    color: isActivePath(item.path) ? "primary.main" : "inherit",
                    "&:hover": {
                      backgroundColor: isActivePath(item.path) 
                        ? "rgba(0, 255, 255, 0.24)"
                        : "rgba(255, 255, 255, 0.08)",
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
              ))}
            </Box>
          )}

          {/* Right Section - Icons and Profile */}
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1 } }}>
            {/* Notifications */}
            <Tooltip title="Notifications">
              <IconButton
                color="inherit"
                aria-label="notifications"
                sx={{
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: "rgba(0, 255, 255, 0.08)",
                    transform: "scale(1.05)",
                  },
                }}
              >
                <Badge 
                  badgeContent={3} 
                  color="error"
                  sx={{
                    "& .MuiBadge-badge": {
                      fontSize: "0.7rem",
                      fontWeight: 700,
                    },
                  }}
                >
                  <Notifications />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Messages */}
            <Tooltip title="Messages">
              <IconButton
                color="inherit"
                aria-label="messages"
                sx={{
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: "rgba(255, 0, 255, 0.08)",
                    transform: "scale(1.05)",
                  },
                }}
              >
                <Badge 
                  badgeContent={5} 
                  color="secondary"
                  sx={{
                    "& .MuiBadge-badge": {
                      fontSize: "0.7rem",
                      fontWeight: 700,
                    },
                  }}
                >
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
                    transition: "transform 0.3s ease",
                    "&:hover": {
                      transform: "scale(1.05)",
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

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better mobile performance
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
    </>
  );
};

export default Navbar;