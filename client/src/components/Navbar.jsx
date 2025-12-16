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
          // Define hover colors based on item
          const getHoverColor = () => {
            if (item.label === "Teams") return "rgba(0, 255, 255, 0.16)"; // Cyan
            if (item.label === "Scrims") return "rgba(255, 0, 255, 0.16)"; // Magenta
            if (item.label === "Tournaments") return "rgba(255, 180, 0, 0.16)"; // Yellow
            return "rgba(0, 255, 255, 0.16)";
          };

          const getActiveTextColor = () => {
            if (item.label === "Teams") return "#00FFFF"; // Cyan
            if (item.label === "Scrims") return "#FF00FF"; // Magenta
            if (item.label === "Tournaments") return "#FFB400"; // Yellow
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
                  backgroundColor: "rgba(0, 255, 255, 0.16)",
                  "& .MuiListItemIcon-root": {
                    color: getActiveTextColor(),
                  },
                  "& .MuiTypography-root": {
                    color: getActiveTextColor(),
                  },
                  "&:hover": {
                    backgroundColor: "rgba(0, 255, 255, 0.24)",
                  },
                },
              }}
            >
              <ListItemIcon sx={{ 
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
                // Define hover colors based on button
                const getHoverColor = () => {
                  if (item.label === "Teams") return "rgba(0, 255, 255, 0.15)"; // Cyan
                  if (item.label === "Scrims") return "rgba(255, 0, 255, 0.15)"; // Magenta
                  if (item.label === "Tournaments") return "rgba(255, 180, 0, 0.15)"; // Yellow
                  return "rgba(255, 255, 255, 0.08)";
                };
                
                const getHoverBorderColor = () => {
                  if (item.label === "Teams") return "rgba(0, 255, 255, 0.5)"; // Cyan
                  if (item.label === "Scrims") return "rgba(255, 0, 255, 0.5)"; // Magenta
                  if (item.label === "Tournaments") return "rgba(255, 180, 0, 0.5)"; // Yellow
                  return "rgba(255, 255, 255, 0.1)";
                };

                const getActiveTextColor = () => {
                  if (item.label === "Teams") return "#00FFFF"; // Cyan
                  if (item.label === "Scrims") return "#FF00FF"; // Magenta
                  if (item.label === "Tournaments") return "#FFB400"; // Yellow
                  return "#00FFFF";
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
                        ? "rgba(0, 255, 255, 0.16)"
                        : "transparent",
                      color: isActivePath(item.path) ? getActiveTextColor() : "inherit",
                      border: isActivePath(item.path) 
                        ? "1px solid rgba(0, 255, 255, 0.3)"
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
                sx={{
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: "rgba(0, 255, 255, 0.08)",
                    transform: "scale(1.05)",
                  },
                }}
              >
                <Notifications />
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
                <Message />
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