import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/apiClient";
import {
  Container,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  CircularProgress,
  Box,
  Alert,
} from "@mui/material";

const ScrimRequests = () => {
  const { scrimId } = useParams();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState(null);

  console.log("🔍 [REQUESTS] ScrimRequests mounted - scrimId:", scrimId);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        console.log("🔍 [REQUESTS] Fetching scrim details for:", scrimId);
        
        const response = await api.get(`/api/scrims/${scrimId}`);
        console.log("🔍 [REQUESTS] Full API response:", response);

        // Handle different response formats
        let scrim;
        if (response && response.success && response.data) {
          scrim = response.data;
        } else if (response && response._id) {
          scrim = response;
        } else {
          throw new Error("Invalid response format");
        }

        console.log("🔍 [REQUESTS] Parsed scrim data:", scrim);

        // Map populated scrim.requests (Team docs) into UI rows
        const mapped = (scrim.requests || []).map((team) => ({
          id: team._id,
          fromTeamName: team.name,
          scrimTitle: `${scrim.teamA.name} vs ${scrim.teamB?.name || "TBD"}`,
          proposedDate: new Date(scrim.scheduledTime).toLocaleString(),
          status: scrim.status,
        }));
        
        console.log("🔍 [REQUESTS] Mapped requests:", mapped);
        setRequests(mapped);
      } catch (err) {
        console.error("🚨 [REQUESTS] fetchRequests error:", err);
        const errorMsg = err.response?.data?.message || err.message;
        console.error("🚨 [REQUESTS] Error details:", {
          message: errorMsg,
          status: err.response?.status,
          data: err.response?.data
        });
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    if (scrimId) {
      fetchRequests();
    }
  }, [scrimId]);

  const handleAction = async (teamId, action) => {
    console.log(`🔍 [REQUESTS] Handling ${action} for team:`, teamId);
    
    setActionLoading((prev) => ({ ...prev, [teamId]: true }));
    try {
      const response = await api.put(`/api/scrims/${action}/${scrimId}`, { teamId });
      
      console.log(`✅ [REQUESTS] ${action} response:`, response);
      
      // Remove the request from the list
      setRequests((prev) => prev.filter((r) => r.id !== teamId));
      
      if (action === 'accept') {
        console.log("🔍 [REQUESTS] Accept successful, processing navigation...");
        
        // Handle different response formats for chatId
        let chatId = null;
        if (response && response.success && response.chatId) {
          chatId = response.chatId;
        } else if (response && response.data && response.data.chatId) {
          chatId = response.data.chatId;
        } else if (response && response.chatId) {
          chatId = response.chatId;
        }
        
        if (chatId) {
          console.log("✅ [REQUESTS] Found chatId:", chatId);
          // Navigate to chat after a short delay to ensure backend operations complete
          setTimeout(() => {
            navigate(`/chats/${chatId}`, { replace: true });
          }, 500);
        } else {
          console.warn("⚠️ [REQUESTS] No chatId in response, trying fallback...");
          
          // Fallback: Try to fetch the chat manually after a delay
          setTimeout(async () => {
            try {
              console.log("🔍 [REQUESTS] Attempting to fetch chat by scrimId...");
              const chatResponse = await api.get(`/api/chats/scrim/${scrimId}`);
              console.log("🔍 [REQUESTS] Chat fetch response:", chatResponse);
              
              let fetchedChat = null;
              if (chatResponse && chatResponse.success && chatResponse.data) {
                fetchedChat = chatResponse.data;
              } else if (chatResponse && chatResponse._id) {
                fetchedChat = chatResponse;
              }
              
              if (fetchedChat && fetchedChat._id) {
                console.log("✅ [REQUESTS] Found chat via fallback:", fetchedChat._id);
                navigate(`/chats/${fetchedChat._id}`, { replace: true });
              } else {
                throw new Error("Chat not found in fallback");
              }
            } catch (fallbackErr) {
              console.error("❌ [REQUESTS] Fallback chat fetch failed:", fallbackErr);
              alert("Scrim accepted successfully! Please check your chats page.");
              navigate('/chats');
            }
          }, 1000);
        }
      } else {
        // For decline action, show success
        console.log("✅ [REQUESTS] Decline successful");
      }
    } catch (err) {
      console.error(`🚨 [REQUESTS] Failed to ${action} request:`, err);
      const errorMessage = err.response?.data?.message || err.message;
      console.error("🚨 [REQUESTS] Error details:", {
        message: errorMessage,
        status: err.response?.status,
        data: err.response?.data
      });
      alert(`Error: ${errorMessage}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [teamId]: false }));
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Scrim Requests
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {requests.length === 0 ? (
        <Typography>No pending requests.</Typography>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Requesting Team</TableCell>
              <TableCell>Fixture</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((req) => (
              <TableRow key={req.id}>
                <TableCell>{req.fromTeamName}</TableCell>
                <TableCell>{req.scrimTitle}</TableCell>
                <TableCell>{req.proposedDate}</TableCell>
                <TableCell>{req.status}</TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    variant="contained"
                    disabled={actionLoading[req.id]}
                    onClick={() => handleAction(req.id, "accept")}
                    sx={{ mr: 1 }}
                  >
                    {actionLoading[req.id] ? (
                      <CircularProgress size={16} />
                    ) : (
                      "Accept"
                    )}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    disabled={actionLoading[req.id]}
                    onClick={() => handleAction(req.id, "decline")}
                  >
                    {actionLoading[req.id] ? (
                      <CircularProgress size={16} />
                    ) : (
                      "Decline"
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Container>
  );
};

export default ScrimRequests;