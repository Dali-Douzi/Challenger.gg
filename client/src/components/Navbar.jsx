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
    <Box sx={{ width: 250, pt: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end", px: 2, pb: 2 }}>
        <IconButton onClick={handleDrawerToggle}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItemButton
            key={item.label}
            onClick={() => handleNavigation(item.path)}
            selected={isActivePath(item.path)}
            sx={{
              mx: 1,
              borderRadius: 2,
              "&.Mui-selected": {
                backgroundColor: "rgba(0, 255, 255, 0.16)",
                "&:hover": {
                  backgroundColor: "rgba(0, 255, 255, 0.24)",
                },
              },
            }}
          >
            <ListItemIcon sx={{ color: isActivePath(item.path) ? "primary.main" : "inherit" }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              sx={{
                "& .MuiTypography-root": {
                  fontWeight: isActivePath(item.path) ? 700 : 400,
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
      <AppBar position="sticky" elevation={3}>
        <Toolbar sx={{ justifyContent: "space-between", minHeight: { xs: 64, sm: 70 } }}>
          {/* Left Section - Logo and Mobile Menu */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {isMobile && (
              <IconButton
                color="inherit"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 1 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography
              variant="h5"
              component="div"
              sx={{
                fontWeight: "bold",
                cursor: "pointer",
                background: "linear-gradient(45deg, #00FFFF 30%, #FF00FF 90%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textDecoration: "none",
                transition: "opacity 0.3s ease",
                "&:hover": {
                  opacity: 0.8,
                },
              }}
              onClick={handleLogoClick}
            >
              Challenger
            </Typography>
          </Box>

          {/* Center Section - Navigation Items (Desktop Only) */}
          {!isMobile && (
            <Box sx={{ display: "flex", gap: 1 }}>
              {navItems.map((item) => (
                <Button
                  key={item.label}
                  color="inherit"
                  onClick={() => navigate(item.path)}
                  startIcon={item.icon}
                  sx={{
                    fontWeight: isActivePath(item.path) ? "bold" : "normal",
                    backgroundColor: isActivePath(item.path)
                      ? "rgba(0, 255, 255, 0.16)"
                      : "transparent",
                    color: isActivePath(item.path) ? "primary.main" : "inherit",
                    "&:hover": {
                      backgroundColor: "rgba(0, 255, 255, 0.08)",
                    },
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    transition: "all 0.3s ease",
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
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                  },
                }}
              >
                <Badge badgeContent={3} color="error">
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
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                  },
                }}
              >
                <Badge badgeContent={5} color="error">
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
                  src={user?.avatar || undefined}
                  sx={{
                    width: { xs: 36, sm: 40 },
                    height: { xs: 36, sm: 40 },
                    fontSize: "0.9rem",
                    border: "2px solid",
                    borderColor: "primary.main",
                    transition: "transform 0.3s ease",
                    "&:hover": {
                      transform: "scale(1.05)",
                    },
                  }}
                >
                  {user?.username?.charAt(0).toUpperCase()}
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
                mt: 1,
                "& .MuiPaper-root": {
                  minWidth: 200,
                  borderRadius: 2,
                  boxShadow: "0px 8px 24px rgba(0,0,0,0.4)",
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {user?.username}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.email}
                </Typography>
              </Box>

              <MenuItem
                onClick={handleProfileMenuClick}
                sx={{
                  mx: 1,
                  my: 0.5,
                  borderRadius: 1,
                  "&:hover": {
                    backgroundColor: "rgba(0, 255, 255, 0.08)",
                  },
                }}
              >
                <ListItemIcon>
                  <Person fontSize="small" />
                </ListItemIcon>
                <ListItemText>Profile</ListItemText>
              </MenuItem>

              <MenuItem
                onClick={handleTeamsClick}
                sx={{
                  mx: 1,
                  my: 0.5,
                  borderRadius: 1,
                  "&:hover": {
                    backgroundColor: "rgba(0, 255, 255, 0.08)",
                  },
                }}
              >
                <ListItemIcon>
                  <Groups fontSize="small" />
                </ListItemIcon>
                <ListItemText>My Teams</ListItemText>
              </MenuItem>

              <Divider sx={{ my: 1 }} />

              <MenuItem
                onClick={handleLogout}
                sx={{
                  mx: 1,
                  my: 0.5,
                  borderRadius: 1,
                  color: "error.main",
                  "&:hover": {
                    backgroundColor: "rgba(255, 23, 68, 0.08)",
                  },
                }}
              >
                <ListItemIcon>
                  <Logout fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText>Logout</ListItemText>
              </MenuItem>
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