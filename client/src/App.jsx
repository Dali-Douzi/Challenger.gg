import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, Box } from "@mui/material";
import theme from "./styles/theme";
import { AuthProvider } from "./context/AuthContext";

// Import components
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import OAuthCallback from "./pages/OAuthCallback";
import Footer from "./components/Footer";

// Import pages
import LoginPage from "./pages/Login";
import SignupPage from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";

// Team pages
import TeamDashboard from "./pages/TeamDashboard";
import CreateTeam from "./pages/CreateTeam";
import TeamProfile from "./pages/TeamProfile";

// Scrim pages
import ScrimDashboard from "./pages/ScrimDashboard";

// Tournament pages
import TournamentDashboard from "./pages/TournamentDashboard";
import CreateTournamentPage from "./pages/CreateTournamentPage";
import TournamentPage from "./pages/TournamentPage";
import EditTournamentPage from "./pages/EditTournamentPage";
import BracketPage from "./pages/BracketPage";

/**
 * Public Route Component
 * Redirects to dashboard if user is already authenticated
 */
const PublicRoute = ({ children }) => {
  // Check for token in sessionStorage (matching your existing auth)
  const token = sessionStorage.getItem("token");
  return !token ? children : <Navigate to="/dashboard" replace />;
};

/**
 * Main App Component
 */
const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              minHeight: "100vh",
              backgroundColor: "background.default",
            }}
          >
            <Routes>
              {/* Root redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Public routes - redirect to dashboard if authenticated */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                }
              />

              <Route
                path="/signup"
                element={
                  <PublicRoute>
                    <SignupPage />
                  </PublicRoute>
                }
              />

              {/* OAuth callback routes */}
              <Route path="/auth/success" element={<OAuthCallback />} />
              <Route path="/auth/error" element={<OAuthCallback />} />

              {/* Protected routes - require authentication */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Navbar />
                    <Box sx={{ flex: 1 }}>
                      <Dashboard />
                    </Box>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Navbar />
                    <Box sx={{ flex: 1 }}>
                      <Profile />
                    </Box>
                  </ProtectedRoute>
                }
              />

              {/* Team routes */}
              <Route
                path="/teams"
                element={
                  <ProtectedRoute>
                    <Navbar />
                    <Box sx={{ flex: 1 }}>
                      <TeamDashboard />
                    </Box>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/create-team"
                element={
                  <ProtectedRoute>
                    <Navbar />
                    <Box sx={{ flex: 1 }}>
                      <CreateTeam />
                    </Box>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/teams/:id"
                element={
                  <ProtectedRoute>
                    <Navbar />
                    <Box sx={{ flex: 1 }}>
                      <TeamProfile />
                    </Box>
                  </ProtectedRoute>
                }
              />

              {/* Scrim routes */}
              <Route
                path="/scrims"
                element={
                  <ProtectedRoute>
                    <Navbar />
                    <Box sx={{ flex: 1 }}>
                      <ScrimDashboard />
                    </Box>
                  </ProtectedRoute>
                }
              />

              {/* Tournament routes */}
              <Route
                path="/tournaments"
                element={
                  <ProtectedRoute>
                    <Navbar />
                    <Box sx={{ flex: 1 }}>
                      <TournamentDashboard />
                    </Box>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/tournaments/create"
                element={
                  <ProtectedRoute>
                    <Navbar />
                    <Box sx={{ flex: 1 }}>
                      <CreateTournamentPage />
                    </Box>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/tournaments/:id"
                element={
                  <ProtectedRoute>
                    <Navbar />
                    <Box sx={{ flex: 1 }}>
                      <TournamentPage />
                    </Box>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/tournaments/:id/edit"
                element={
                  <ProtectedRoute>
                    <Navbar />
                    <Box sx={{ flex: 1 }}>
                      <EditTournamentPage />
                    </Box>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/tournaments/:tournamentId/bracket"
                element={
                  <ProtectedRoute>
                    <Navbar />
                    <Box sx={{ flex: 1 }}>
                      <BracketPage />
                    </Box>
                  </ProtectedRoute>
                }
              />

              {/* 404 catch-all route */}
              <Route
                path="*"
                element={
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      minHeight: "100vh",
                      bgcolor: "background.default",
                      color: "text.primary",
                      textAlign: "center",
                      p: 3,
                    }}
                  >
                    <Box
                      component="h1"
                      sx={{
                        fontSize: "6rem",
                        fontWeight: "bold",
                        margin: 0,
                        background:
                          "linear-gradient(45deg, #00FFFF 30%, #FF00FF 90%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      404
                    </Box>
                    <Box
                      component="p"
                      sx={{
                        fontSize: "1.5rem",
                        margin: "1rem 0 2rem 0",
                        color: "text.secondary",
                      }}
                    >
                      Page Not Found
                    </Box>
                    <Box
                      component="a"
                      href="/dashboard"
                      sx={{
                        color: "primary.main",
                        textDecoration: "none",
                        fontSize: "1.1rem",
                        fontWeight: 600,
                        "&:hover": {
                          textDecoration: "underline",
                        },
                      }}
                    >
                      Return to Dashboard
                    </Box>
                  </Box>
                }
              />
            </Routes>
          </Box>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;