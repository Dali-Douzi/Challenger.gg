import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CircularProgress, Box, Typography } from "@mui/material";

/**
 * ProtectedRoute Component
 * Wraps routes that require authentication
 * Redirects to login if user is not authenticated
 */
const ProtectedRoute = ({ children, redirectTo = "/login" }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "background.default",
          gap: 2,
        }}
      >
        <CircularProgress
          size={60}
          thickness={4}
          sx={{
            color: "primary.main",
            filter: "drop-shadow(0 0 8px rgba(0, 255, 255, 0.5))",
          }}
        />
        <Typography
          variant="body1"
          sx={{
            color: "text.secondary",
            fontWeight: 500,
            background: "linear-gradient(45deg, #00FFFF 30%, #FF00FF 90%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Loading...
        </Typography>
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Render children if authenticated
  return children;
};

export default ProtectedRoute;