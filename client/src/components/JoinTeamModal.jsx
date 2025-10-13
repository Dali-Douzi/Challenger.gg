import React, { useState } from "react";
import {
  TextField,
  Button,
  Box,
  Typography,
  Modal,
  Paper,
  CircularProgress,
  Alert,
} from "@mui/material";
import teamService from "../services/teamService";

const JoinTeamModal = ({ isOpen, closeModal, onSuccess }) => {
  const [teamCode, setTeamCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!teamCode.trim()) {
      setError("Please enter a team code");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const data = await teamService.joinTeamByCode(teamCode.trim().toUpperCase());

      if (data.success) {
        alert(`Successfully joined ${data.team.name}!`);
        setTeamCode("");
        closeModal();
        onSuccess();
      } else {
        setError(data.message || "Failed to join team");
      }
    } catch (err) {
      console.error("Join team error:", err);
      setError(err.message || "Server error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTeamCode("");
    setError("");
    setIsSubmitting(false);
    closeModal();
  };

  return (
    <Modal open={isOpen} onClose={handleClose}>
      <Paper 
        sx={{ 
          padding: 4, 
          maxWidth: 400, 
          margin: "auto", 
          mt: 10,
          borderRadius: 3,
        }}
      >
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Join a Team
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter the team code shared by the team owner to join their team.
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="Team Code"
            value={teamCode}
            onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
            fullWidth
            required
            variant="outlined"
            sx={{ mb: 2 }}
            placeholder="e.g. ABC123"
            inputProps={{
              style: { textTransform: "uppercase" },
              maxLength: 10,
            }}
            disabled={isSubmitting}
          />

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Box
            sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}
          >
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
              sx={{ flex: 1, py: 1.5 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              type="submit"
              disabled={isSubmitting || !teamCode.trim()}
              sx={{ flex: 1, py: 1.5 }}
            >
              {isSubmitting ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={20} color="inherit" />
                  Joining...
                </Box>
              ) : (
                "Join Team"
              )}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Modal>
  );
};

export default JoinTeamModal;