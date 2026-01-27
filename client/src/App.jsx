import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, Box } from "@mui/material";
import theme from "./styles/theme";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ChatProvider } from "./context/ChatContext";
import { NotificationProvider } from "./context/NotificationContext";
import { connectSocket, disconnectSocket } from "./services/socket";

// Import components
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import OAuthCallback from "./components/OAuthCallback";
import Footer from "./components/Footer";
import ChatManager from "./components/ChatManager";

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
import ScrimRequests from "./pages/ScrimRequests";
import EditScrim from "./pages/EditScrim";

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
 * Socket Connection Manager
 * Handles socket connection/disconnection based on auth state
 */
const SocketManager = () => {
  const { user, isAuthenticated } = useAuth();
  const [teams, setTeams] = React.useState([]);

  // Fetch user's teams for socket room joining
  useEffect(() => {
    const fetchTeams = async () => {
      if (!isAuthenticated || !user) return;

      try {
        const response = await fetch('/api/teams/my', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          const teamsArray = data?.data || data || [];
          setTeams(teamsArray);
        }
      } catch (error) {
        console.error('Failed to fetch teams for socket:', error);
        setTeams([]);
      }
    };

    fetchTeams();
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && user && teams.length > 0) {
      console.log('🔌 [SocketManager] Connecting socket for user:', user.id || user._id);
      console.log('👥 [SocketManager] User teams:', teams.length);
      
      connectSocket(teams);
    } else if (isAuthenticated && user && teams.length === 0) {
      // Connect even without teams (user might create teams later)
      console.log('🔌 [SocketManager] Connecting socket without teams');
      connectSocket([]);
    } else {
      console.log('🔌 [SocketManager] Disconnecting socket - user not authenticated');
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, user, teams]);

  return null; // This component doesn't render anything
};

/**
 * Main App Component
 */
const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <NotificationProvider>
          <ChatProvider>
            <SocketManager />
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
                      <Footer />
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
                      <Footer />
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
                      <Footer />
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
                      <Footer />
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
                      <Footer />
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
                      <Footer />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/scrims/:scrimId/requests"
                  element={
                    <ProtectedRoute>
                      <Navbar />
                      <Box sx={{ flex: 1 }}>
                        <ScrimRequests />
                      </Box>
                      <Footer />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/scrims/edit"
                  element={
                    <ProtectedRoute>
                      <Navbar />
                      <Box sx={{ flex: 1 }}>
                        <EditScrim />
                      </Box>
                      <Footer />
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
                      <Footer />
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
                      <Footer />
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
                      <Footer />
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
                      <Footer />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/tournaments/:id/bracket"
                  element={
                    <ProtectedRoute>
                      <Navbar />
                      <Box sx={{ flex: 1 }}>
                        <BracketPage />
                      </Box>
                      <Footer />
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

              {/* Floating chat windows - renders globally */}
              <ChatManager />
            </Box>
          </Router>
        </ChatProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;