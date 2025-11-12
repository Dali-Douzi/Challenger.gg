import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Container,
  Paper,
  Button,
  Chip,
  Stack,
  Alert,
  Grid,
} from "@mui/material";
import {
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
  Groups as GroupsIcon,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import teamService from "../services/teamService";

// Import join team modal
import JoinTeamModal from "../components/JoinTeamModal";

const TeamDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const teamsData = await teamService.getMyTeams();
      const teamsArray = Array.isArray(teamsData) ? teamsData : [];
      setTeams(teamsArray);
    } catch (err) {
      console.error("Error fetching teams:", err);
      setError("Failed to load your teams. Please try again.");
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setError("Please log in to view your teams.");
      setTeams([]);
      setLoading(false);
      return;
    }
    fetchTeams();
  }, [fetchTeams, isAuthenticated]);

  const handleCreateTeam = () => {
    navigate("/create-team");
  };

  const handleJoinTeam = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const onJoinSuccess = () => {
    fetchTeams();
  };

  const getTeamInitials = (teamName) => {
    if (typeof teamName !== "string" || !teamName.trim()) return "";
    return teamName
      .trim()
      .split(/\s+/)
      .map((word) => word[0].toUpperCase())
      .slice(0, 2)
      .join("");
  };

  const getGameName = (game) => {
    if (!game) return "Unknown Game";
    if (typeof game === "string") return game;
    if (typeof game === "object" && game.name) return game.name;
    return "Unknown Game";
  };

  const getUserRole = (team) => {
    if (!team.members || !user) return null;
    const member = team.members.find((m) => {
      const uid = m.user && (m.user._id || m.user);
      return uid && uid.toString() === user.id;
    });
    return member?.role || "player";
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "owner":
        return "error";
      case "manager":
        return "warning";
      case "player":
        return "primary";
      case "substitute":
        return "secondary";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Your Teams
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Manage your teams and start your competitive journey
        </Typography>

        {/* Action Buttons */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateTeam}
            size="large"
            sx={{
              fontWeight: 600,
              boxShadow: "0 4px 16px rgba(0, 255, 255, 0.3)",
              "&:hover": {
                boxShadow: "0 6px 24px rgba(0, 255, 255, 0.5)",
              },
            }}
          >
            Create New Team
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<PersonAddIcon />}
            onClick={handleJoinTeam}
            size="large"
            sx={{
              fontWeight: 600,
              borderWidth: 2,
              "&:hover": {
                borderWidth: 2,
              },
            }}
          >
            Join a Team
          </Button>
        </Stack>
      </Box>

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Empty State */}
      {!error && teams.length === 0 && (
        <Paper
          elevation={3}
          sx={{
            p: 6,
            textAlign: "center",
            borderRadius: 3,
            background: "linear-gradient(135deg, rgba(0, 255, 255, 0.05) 0%, rgba(255, 0, 255, 0.05) 100%)",
          }}
        >
          <GroupsIcon
            sx={{
              fontSize: 100,
              color: "text.secondary",
              opacity: 0.5,
              mb: 2,
            }}
          />
          <Typography variant="h5" fontWeight="600" gutterBottom>
            No Teams Yet
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            You haven't created or joined any teams yet. Start your esports journey now!
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="center"
          >
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateTeam}
              size="large"
            >
              Create Your First Team
            </Button>
            <Button
              variant="outlined"
              startIcon={<PersonAddIcon />}
              onClick={handleJoinTeam}
              size="large"
            >
              Join an Existing Team
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Teams List */}
      {!error && teams.length > 0 && (
        <Grid container spacing={3}>
          {teams.map((team) => (
            <Grid item xs={12} sm={6} md={4} key={team._id}>
              <Paper
                elevation={4}
                sx={{
                  borderRadius: 3,
                  overflow: "hidden",
                  transition: "all 0.3s ease",
                  border: "1px solid",
                  borderColor: "rgba(0, 255, 255, 0.2)",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: "0 12px 32px rgba(0, 255, 255, 0.3)",
                    borderColor: "primary.main",
                  },
                }}
              >
                <Box
                  onClick={() => navigate(`/teams/${team._id}`)}
                  sx={{ cursor: "pointer" }}
                >
                  <Box
                    sx={{
                      p: 3,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                    }}
                  >
                    <Avatar
                      src={team.logo || ""}
                      alt={team.name}
                      sx={{
                        width: 80,
                        height: 80,
                        mb: 2,
                        bgcolor: team.logo ? "transparent" : "primary.main",
                        fontSize: "2rem",
                        fontWeight: "bold",
                        border: "3px solid",
                        borderColor: "primary.main",
                        boxShadow: "0 4px 16px rgba(0, 255, 255, 0.3)",
                      }}
                    >
                      {!team.logo && getTeamInitials(team.name)}
                    </Avatar>

                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      {team.name}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      {getGameName(team.game)}
                    </Typography>

                    <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
                      <Chip
                        label={getUserRole(team)}
                        color={getRoleColor(getUserRole(team))}
                        size="small"
                        sx={{
                          textTransform: "capitalize",
                          fontWeight: 600,
                        }}
                      />
                      {team.rank && (
                        <Chip
                          label={team.rank}
                          variant="outlined"
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      )}
                      {team.server && (
                        <Chip
                          label={team.server}
                          variant="outlined"
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      )}
                    </Stack>

                    {team.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {team.description}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Join Team Modal */}
      <JoinTeamModal
        isOpen={isModalOpen}
        closeModal={closeModal}
        onSuccess={onJoinSuccess}
      />
    </Container>
  );
};

export default TeamDashboard;
