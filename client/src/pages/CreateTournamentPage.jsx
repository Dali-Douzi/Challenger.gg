import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Typography, Box, Button, Alert, CircularProgress } from "@mui/material";
import TournamentForm from "../components/TournamentForm";
import ActionModal from "../components/ActionModal";
import { useAuth } from "../context/AuthContext";

const CreateTournamentPage = () => {
  const navigate = useNavigate();
  const { makeAuthenticatedRequest } = useAuth();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [refCode, setRefCode] = useState("");
  const [tourneyId, setTourneyId] = useState("");
  const [showCode, setShowCode] = useState(false);


  const handleCreate = async (formData) => {
    try {
      const response = await makeAuthenticatedRequest(
        "http://localhost:4444/api/tournaments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );
      
      if (response && response.ok) {
        const data = await response.json();
        setRefCode(data.refereeCode);
        setTourneyId(data._id);
        setShowCode(true);
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to create tournament");
      }
    } catch (err) {
      setErrorMsg(err.message || "Error creating tournament");
    }
  };

  const handleRefereeJoin = async (code) => {
    try {
      const res = await makeAuthenticatedRequest(
        `http://localhost:4444/api/tournaments/code/${code}`
      );
      
      if (res && res.ok) {
        const tournamentData = await res.json();
        
        const joinRes = await makeAuthenticatedRequest(
          `http://localhost:4444/api/tournaments/${tournamentData._id}/referees`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ code }),
          }
        );
        
        if (joinRes && joinRes.ok) {
          navigate(`/tournaments/${tournamentData._id}`);
        } else {
          const error = await joinRes.json();
          throw new Error(error.message || "Failed to join as referee");
        }
      } else {
        throw new Error("Invalid referee code");
      }
    } catch (err) {
      setErrorMsg(err.message || "Invalid referee code");
    }
  };

  return (
    <Container sx={{ py: 4, color: "white" }}>
      <Typography variant="h4" gutterBottom>
        Create Tournament
      </Typography>

      {errorMsg && (
        <Box mb={2}>
          <Alert severity="error">{errorMsg}</Alert>
        </Box>
      )}

      {!showCode ? (
        <>
          <TournamentForm onSubmit={handleCreate} />

          <Box mt={4}>
            <Button variant="outlined" onClick={() => setModalOpen(true)}>
              Enter Referee Code
            </Button>
          </Box>

          <ActionModal
            open={modalOpen}
            title="Enter Referee Code"
            label="Referee Code"
            placeholder="ABC123"
            onClose={() => setModalOpen(false)}
            onConfirm={async (value) => {
              setModalOpen(false);
              await handleRefereeJoin(value);
            }}
          />
        </>
      ) : (
        <Box sx={{ textAlign: "center", mt: 4 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            🎉 Tournament created! Your referee code is:{" "}
            <strong>{refCode}</strong>
          </Alert>
          <Button
            variant="contained"
            onClick={() => navigate(`/tournaments/${tourneyId}`)}
          >
            Go to Tournament
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default CreateTournamentPage;