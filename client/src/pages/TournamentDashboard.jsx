import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import api from "../services/apiClient";

const TournamentDashboard = () => {
  const navigate = useNavigate();
  
  // State for tournaments
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch tournaments data
  const fetchTournaments = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get('/api/tournaments');
      const tournamentsData = Array.isArray(data) ? data : [];
      setTournaments(tournamentsData);
    } catch (err) {
      setError(err.message || "Failed to load tournaments");
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  };

  // Load tournaments on component mount
  useEffect(() => {
    fetchTournaments();
  }, []);

  if (loading) {
    return (
      <Container sx={{ py: 4, textAlign: "center", color: "white" }}>
        <CircularProgress color="inherit" />
        <Typography sx={{ mt: 2 }}>Loading tournaments...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 4, color: "white" }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchTournaments}>
          Retry
        </Button>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 4, color: "white" }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4">Tournaments</Typography>
        <Button
          variant="contained"
          onClick={() => navigate("/tournaments/create")}
        >
          Create Tournament
        </Button>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 3,
          mt: 4,
        }}
      >
        {Array.isArray(tournaments) && tournaments.length > 0 ? (
          tournaments.map((t) => (
            <Card key={t._id} sx={{ width: "100%", minHeight: 200 }}>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  {t.name}
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 1 }}>
                  Game: {t.game}
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 1 }}>
                  Starts: {new Date(t.startDate).toLocaleDateString()}
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 1 }}>
                  Status: {t.status.replace(/_/g, " ")}
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Participants: {t.teams?.length || 0} / {t.maxParticipants || "N/A"}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    component={Link}
                    to={`/tournaments/${t._id}`}
                  >
                    View
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))
        ) : (
          <Typography variant="h6" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
            No tournaments found. Create your first tournament!
          </Typography>
        )}
      </Box>
    </Container>
  );
};

export default TournamentDashboard;