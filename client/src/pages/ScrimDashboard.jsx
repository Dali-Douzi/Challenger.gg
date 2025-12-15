import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  List,
  ListItem,
  Paper,
  Avatar,
  Stack,
  IconButton,
  Card,
  CardContent,
  Chip,
  Grid,
  useTheme,
  alpha,
  Alert,
} from "@mui/material";
import { SportsEsports, AccessTime, BugReport } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import api, { getApiBaseUrl } from '../services/apiClient';

const API_BASE = getApiBaseUrl();

const getTeamInitials = (teamName) => {
  if (typeof teamName !== "string" || !teamName.trim()) return "";
  return teamName
    .trim()
    .split(/\s+/)
    .map((word) => word[0].toUpperCase())
    .slice(0, 2)
    .join("");
};

const ScrimDashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const theme = useTheme();

  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedRequestTeam, setSelectedRequestTeam] = useState("");
  const [games, setGames] = useState([]);
  const [formats, setFormats] = useState([]);
  const [format, setFormat] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [scrims, setScrims] = useState([]);
  const [requested, setRequested] = useState([]);
  const [selectedGameFilter, setSelectedGameFilter] = useState("");
  const [serverOptions, setServerOptions] = useState([]);
  const [rankOptions, setRankOptions] = useState([]);
  const [selectedServerFilter, setSelectedServerFilter] = useState("");
  const [selectedRankFilter, setSelectedRankFilter] = useState("");
  const [loading, setLoading] = useState({
    teams: true,
    games: true,
    scrims: true,
    posting: false,
  });
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState([]);

  // 🐛 DEBUG: Add debug message
  const addDebug = (message, data = null) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
    const debugEntry = `[${timestamp}] ${message}${data ? `: ${JSON.stringify(data, null, 2)}` : ''}`;
    console.log(`🐛 ${debugEntry}`);
    setDebugInfo(prev => [...prev, debugEntry].slice(-20)); // Keep last 20
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0)
      return `Today, ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    if (diffDays === 1)
      return `Tomorrow, ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    if (diffDays > 1 && diffDays <= 7)
      return date.toLocaleDateString([], {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const canManageTeam = (team) => {
    if (!user || !team) {
      addDebug("canManageTeam: No user or team");
      return false;
    }
    
    const userId = user.id || user._id || user.userId;
    if (!userId) {
      addDebug("canManageTeam: User missing ID", { userKeys: Object.keys(user) });
      return false;
    }
    
    const ownerId = team.owner?._id || team.owner;
    const isOwner = ownerId?.toString() === userId.toString();
    
    const isManager = team.members?.some((m) => {
      const memberId = m.user?._id || m.user;
      return memberId?.toString() === userId.toString() && m.role === "manager";
    });
    
    addDebug(`canManageTeam: ${team.name}`, { userId, ownerId, isOwner, isManager });
    return isOwner || isManager;
  };

  // Fetch user's teams
  useEffect(() => {
    (async () => {
      try {
        addDebug("Fetching teams", { 
          userId: user?.id || user?._id || user?.userId,
          userKeys: user ? Object.keys(user) : []
        });
        
        const data = await api.get('/api/teams/my');
        addDebug("Teams API response received", { 
          success: data?.success, 
          hasData: !!data?.data,
          isArray: Array.isArray(data?.data),
          count: Array.isArray(data?.data) ? data.data.length : 'N/A'
        });
        
        let teamsArray = [];
        if (data && data.success && Array.isArray(data.data)) {
          teamsArray = data.data;
        } else if (Array.isArray(data)) {
          teamsArray = data;
        } else if (data && data.data && Array.isArray(data.data)) {
          teamsArray = data.data;
        }
        
        addDebug("Teams extracted", { count: teamsArray.length });
        
        const manageableTeams = teamsArray.filter(team => {
          const canManage = canManageTeam(team);
          return canManage;
        });
        
        addDebug("Manageable teams filtered", { 
          total: teamsArray.length,
          manageable: manageableTeams.length,
          names: manageableTeams.map(t => t.name)
        });
        
        setTeams(manageableTeams);
        
        if (manageableTeams.length > 0) {
          setSelectedTeam(manageableTeams[0]._id);
          setSelectedRequestTeam(manageableTeams[0]._id);
        }
      } catch (err) {
        addDebug("Teams fetch ERROR", { 
          message: err.message,
          status: err.status,
          response: err.response
        });
        setTeams([]);
      } finally {
        setLoading((l) => ({ ...l, teams: false }));
      }
    })();
  }, [user]);

  // Fetch all games
  useEffect(() => {
    (async () => {
      try {
        addDebug("Fetching games");
        const res = await fetch(`${API_BASE}/api/teams/games`);
        addDebug("Games fetch response", { ok: res.ok, status: res.status });
        
        if (res.ok) {
          const data = await res.json();
          addDebug("Games parsed", { count: Array.isArray(data) ? data.length : 'N/A' });
          const gamesArray = Array.isArray(data) ? data : [];
          setGames(gamesArray);
        } else {
          addDebug("Games fetch failed", { status: res.status });
          setGames([]);
        }
      } catch (err) {
        addDebug("Games fetch ERROR", { message: err.message });
        setGames([]);
      } finally {
        setLoading((l) => ({ ...l, games: false }));
      }
    })();
  }, []);

  // Initialize filters
  useEffect(() => {
    if (!loading.games && games.length) {
      const first = games[0];
      setSelectedGameFilter(first.name);
      setRankOptions(first.ranks || []);
      setServerOptions(first.servers || []);
      addDebug("Initialized filters", { game: first.name });
    }
  }, [loading.games, games]);

  // Auto-populate when team changes
  useEffect(() => {
    if (!selectedTeam || !teams.length || !games.length) return;

    const team = teams.find((t) => t._id === selectedTeam);
    if (!team) return;

    addDebug("Team changed", { teamName: team.name, gameId: team.game });

    let gameObj = null;
    if (team.game && team.game._id) {
      gameObj = games.find((g) => g._id === team.game._id);
    } else if (team.game) {
      gameObj = games.find((g) => g._id === team.game || g.name === team.game);
    }

    if (!gameObj) {
      addDebug("Game not found for team", { teamGame: team.game });
      return;
    }

    addDebug("Setting filters from team", { 
      game: gameObj.name,
      server: team.server,
      rank: team.rank
    });

    setSelectedGameFilter(gameObj.name);
    setServerOptions(gameObj.servers || []);
    setRankOptions(gameObj.ranks || []);
    setSelectedServerFilter(team.server || "");
    setSelectedRankFilter(team.rank || "");

    const fmts = gameObj.formats || [];
    setFormats(fmts);
    if (fmts.length && !format) {
      setFormat(fmts[0]);
    }
  }, [selectedTeam, teams, games, format]);

  // 🐛 ENHANCED: Fetch scrims with detailed debugging
  const fetchScrims = async () => {
    addDebug("=== FETCH SCRIMS START ===");
    setLoading((l) => ({ ...l, scrims: true }));
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (selectedGameFilter) params.append("game", selectedGameFilter);
      if (selectedServerFilter) params.append("server", selectedServerFilter);
      if (selectedRankFilter) params.append("rank", selectedRankFilter);

      const url = `/api/scrims?${params.toString()}`;
      addDebug("Fetch URL", { url, params: params.toString() });

      // 🐛 Test direct fetch first
      addDebug("Testing direct fetch...");
      const testResponse = await fetch(`${API_BASE}${url}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      addDebug("Direct fetch response", {
        ok: testResponse.ok,
        status: testResponse.status,
        statusText: testResponse.statusText,
        contentType: testResponse.headers.get('content-type'),
      });

      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        addDebug("Direct fetch ERROR body", { errorText });
        throw new Error(`HTTP ${testResponse.status}: ${errorText}`);
      }

      const testData = await testResponse.json();
      addDebug("Direct fetch SUCCESS", { 
        dataType: typeof testData,
        hasSuccess: 'success' in testData,
        hasData: 'data' in testData,
        isArray: Array.isArray(testData),
        keys: Object.keys(testData || {}),
      });

      // Now use api.get
      addDebug("Using api.get...");
      const responseData = await api.get(url);
      addDebug("api.get response", {
        dataType: typeof responseData,
        keys: Object.keys(responseData || {}),
        hasSuccess: 'success' in (responseData || {}),
        hasData: 'data' in (responseData || {}),
      });

      // Handle different response formats
      let scrimsArray = [];
      if (responseData && responseData.success && Array.isArray(responseData.data)) {
        scrimsArray = responseData.data;
        addDebug("Using responseData.data format");
      } else if (Array.isArray(responseData)) {
        scrimsArray = responseData;
        addDebug("Using direct array format");
      } else if (responseData && Array.isArray(responseData.data)) {
        scrimsArray = responseData.data;
        addDebug("Using nested data format");
      } else {
        addDebug("Unexpected response format", { responseData });
        scrimsArray = [];
      }

      addDebug("Scrims loaded", { count: scrimsArray.length });
      setScrims(scrimsArray);
      
    } catch (err) {
      addDebug("=== FETCH SCRIMS ERROR ===", {
        message: err.message,
        status: err.status,
        response: err.response,
        stack: err.stack?.split('\n').slice(0, 3),
      });
      
      setError(`Failed to load scrims: ${err.message}`);
      setScrims([]);
    } finally {
      addDebug("=== FETCH SCRIMS END ===");
      setLoading((l) => ({ ...l, scrims: false }));
    }
  };

  // Fetch scrims when ready
  useEffect(() => {
    addDebug("Scrims effect triggered", {
      isAuthenticated,
      gamesLoaded: !loading.games,
      teamsLoaded: !loading.teams,
      gameFilter: selectedGameFilter
    });
    
    if (isAuthenticated && !loading.games && !loading.teams && selectedGameFilter) {
      fetchScrims();
    }
  }, [
    isAuthenticated,
    selectedGameFilter,
    selectedServerFilter,
    selectedRankFilter,
    loading.games,
    loading.teams,
  ]);

  // Track requested scrims
  useEffect(() => {
    if (!selectedTeam) return;
    const persisted = scrims
      .filter((s) =>
        s.requests?.some((r) =>
          typeof r === "string" ? r === selectedTeam : r._id === selectedTeam
        )
      )
      .map((s) => s._id);
    setRequested(persisted);
  }, [scrims, selectedTeam]);

  const getDayOptions = () => {
    const opts = ["Today", "Tomorrow"];
    const today = new Date();
    for (let i = 2; i <= 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      opts.push(d.toISOString().split("T")[0]);
    }
    return opts;
  };

  const getTimeOptions = () => {
    const times = [];
    for (let h = 0; h < 24; h++) {
      const hh = h.toString().padStart(2, "0");
      ["00", "30"].forEach((mm) => times.push(`${hh}:${mm}`));
    }
    return times;
  };

  const handlePostScrim = async (e) => {
    e.preventDefault();
    
    if (!selectedTeam) {
      alert("Please select a team.");
      return;
    }
    if (!format) {
      alert("Please select a format.");
      return;
    }
    if (!selectedDay) {
      alert("Please select a day.");
      return;
    }
    if (!selectedTime) {
      alert("Please select a time.");
      return;
    }

    const [h, m] = selectedTime.split(":").map(Number);
    let dt = new Date();
    if (selectedDay === "Tomorrow") dt.setDate(dt.getDate() + 1);
    else if (selectedDay !== "Today") dt = new Date(selectedDay);
    dt.setHours(h, m, 0, 0);

    if (dt <= new Date()) {
      alert("Scheduled time must be in the future.");
      return;
    }

    setLoading((l) => ({ ...l, posting: true }));
    try {
      addDebug("Posting scrim", { teamId: selectedTeam, format, scheduledTime: dt.toISOString() });

      const responseData = await api.post('/api/scrims', {
        teamId: selectedTeam,
        format,
        scheduledTime: dt.toISOString(),
      });

      addDebug("Post scrim response", { success: responseData.success });

      if (responseData.success) {
        setSelectedDay("");
        setSelectedTime("");
        await fetchScrims();
        alert("Scrim posted successfully!");
      } else {
        throw new Error(responseData.message || "Failed to post scrim");
      }
    } catch (err) {
      addDebug("Post scrim ERROR", { message: err.message });
      alert(err.message || "Failed to post scrim");
    } finally {
      setLoading((l) => ({ ...l, posting: false }));
    }
  };

  const handleSendRequest = async (scrimId) => {
    if (!selectedRequestTeam || requested.includes(scrimId)) return;

    addDebug("Sending request", { scrimId, teamId: selectedRequestTeam });
    setRequested((prev) => [...prev, scrimId]);
    
    try {
      const responseData = await api.post(`/api/scrims/request/${scrimId}`, {
        teamId: selectedRequestTeam
      });

      addDebug("Send request response", { success: responseData.success });

      if (!responseData.success) {
        throw new Error(responseData.message || "Failed to send request");
      }
    } catch (err) {
      addDebug("Send request ERROR", { message: err.message });
      if (err.message === "Scrim request already sent") return;
      alert(err.message);
      setRequested((prev) => prev.filter((id) => id !== scrimId));
    }
  };

  const handleEditScrim = (scrimId) => {
    addDebug("Editing scrim", { scrimId });
    sessionStorage.setItem("editingScrimId", scrimId);
    navigate("/scrims/edit");
  };

  const handleGameChange = (gameName) => {
    addDebug("Game filter changed", { gameName });
    setSelectedGameFilter(gameName);
    const game = games.find((g) => g.name === gameName) || {};
    setServerOptions(game.servers || []);
    setRankOptions(game.ranks || []);
    setSelectedServerFilter("");
    setSelectedRankFilter("");

    const fmts = game.formats || [];
    setFormats(fmts);
    if (fmts.length) {
      setFormat(fmts[0]);
    } else {
      setFormat("");
    }
  };

  const renderTeamWithLogo = (team) => {
    if (!team) return "Unknown";

    const teamLogo = team.logo
      ? `${API_BASE}/${team.logo}?t=${Date.now()}`
      : null;

    const teamInitials = getTeamInitials(team.name);

    const handleTeamClick = () => {
      navigate(`/teams/${team._id}`);
    };

    return (
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton
          onClick={handleTeamClick}
          sx={{
            p: 0,
            "&:hover": {
              transform: "scale(1.05)",
              transition: "transform 0.2s ease-in-out",
            },
          }}
        >
          <Avatar
            src={teamLogo}
            sx={{
              width: 32,
              height: 32,
              fontSize: "0.75rem",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {!teamLogo && teamInitials}
          </Avatar>
        </IconButton>
        <Typography
          variant="body2"
          component="span"
          onClick={handleTeamClick}
          sx={{
            cursor: "pointer",
            "&:hover": {
              textDecoration: "underline",
            },
          }}
        >
          {team.name}
        </Typography>
      </Stack>
    );
  };

  if (loading.teams || loading.games) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>
          Loading {loading.teams ? "teams" : ""} {loading.games ? "games" : ""}
          ...
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* 🐛 DEBUG PANEL */}
      <Paper
        elevation={3}
        sx={{
          p: 2,
          mb: 3,
          background: alpha(theme.palette.error.main, 0.05),
          border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <BugReport color="error" />
          <Typography variant="h6" color="error">Debug Console</Typography>
          <Button 
            size="small" 
            onClick={() => setDebugInfo([])}
            sx={{ ml: 'auto' }}
          >
            Clear
          </Button>
        </Box>
        <Box
          sx={{
            maxHeight: 200,
            overflow: 'auto',
            bgcolor: 'rgba(0,0,0,0.8)',
            p: 1,
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            color: '#00ff00',
          }}
        >
          {debugInfo.length === 0 ? (
            <Typography sx={{ color: 'grey', fontStyle: 'italic' }}>
              No debug messages yet...
            </Typography>
          ) : (
            debugInfo.map((msg, idx) => (
              <Box key={idx} sx={{ whiteSpace: 'pre-wrap', mb: 0.5 }}>
                {msg}
              </Box>
            ))
          )}
        </Box>
      </Paper>

      <Typography
        variant="h4"
        gutterBottom
        sx={{
          fontWeight: 600,
          mb: 4,
          background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Scrim Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* POST A SCRIM */}
        <Grid item xs={12} lg={4}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.primary.main,
                0.05
              )} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
              backdropFilter: "blur(10px)",
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              borderRadius: 2,
            }}
          >
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 3,
                fontWeight: 600,
              }}
            >
              <SportsEsports color="primary" />
              Post a Scrim
            </Typography>

            <Box component="form" onSubmit={handlePostScrim}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Your Team</InputLabel>
                <Select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  label="Your Team"
                >
                  {teams.map((t) => (
                    <MenuItem key={t._id} value={t._id}>
                      {t.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Format</InputLabel>
                <Select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  label="Format"
                >
                  {formats.map((f) => (
                    <MenuItem key={f} value={f}>
                      {f}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Day</InputLabel>
                <Select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  label="Day"
                >
                  {getDayOptions().map((d) => (
                    <MenuItem key={d} value={d}>
                      {d}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Time</InputLabel>
                <Select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  label="Time"
                >
                  {getTimeOptions().map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading.posting || teams.length === 0}
                sx={{
                  py: 1.5,
                  fontWeight: 600,
                  textTransform: "none",
                  fontSize: "1rem",
                }}
              >
                {loading.posting ? (
                  <CircularProgress size={24} color="inherit" />
                ) : teams.length === 0 ? (
                  "No Manageable Teams"
                ) : (
                  "Post Scrim"
                )}
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* AVAILABLE SCRIMS */}
        <Grid item xs={12} lg={8}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.primary.main,
                0.05
              )} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
              backdropFilter: "blur(10px)",
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              borderRadius: 2,
            }}
          >
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 3,
                fontWeight: 600,
              }}
            >
              <AccessTime color="primary" />
              Available Scrims
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Game</InputLabel>
                  <Select
                    value={selectedGameFilter}
                    onChange={(e) => handleGameChange(e.target.value)}
                    label="Game"
                  >
                    {games.map((g) => (
                      <MenuItem key={g._id} value={g.name}>
                        {g.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Server</InputLabel>
                  <Select
                    value={selectedServerFilter}
                    onChange={(e) => setSelectedServerFilter(e.target.value)}
                    label="Server"
                  >
                    <MenuItem value="">All</MenuItem>
                    {serverOptions.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Rank</InputLabel>
                  <Select
                    value={selectedRankFilter}
                    onChange={(e) => setSelectedRankFilter(e.target.value)}
                    label="Rank"
                  >
                    <MenuItem value="">All</MenuItem>
                    {rankOptions.map((r) => (
                      <MenuItem key={r} value={r}>
                        {r}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Request Team</InputLabel>
                  <Select
                    value={selectedRequestTeam}
                    onChange={(e) => setSelectedRequestTeam(e.target.value)}
                    label="Request Team"
                  >
                    {teams.map((t) => (
                      <MenuItem key={t._id} value={t._id}>
                        {t.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {loading.scrims ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <CircularProgress />
                <Typography sx={{ mt: 2 }}>Loading scrims...</Typography>
              </Box>
            ) : scrims.length === 0 ? (
              <Typography sx={{ textAlign: "center", py: 4, opacity: 0.6 }}>
                No scrims available
              </Typography>
            ) : (
              <List sx={{ maxHeight: 600, overflow: "auto" }}>
                {scrims.map((scrim) => {
                  const isRequested = requested.includes(scrim._id);
                  const isMyScrim =
                    scrim.teamA?._id === selectedTeam ||
                    scrim.teamB?._id === selectedTeam;

                  return (
                    <ListItem
                      key={scrim._id}
                      sx={{
                        mb: 2,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.background.paper, 0.6),
                        border: `1px solid ${alpha(
                          theme.palette.divider,
                          0.1
                        )}`,
                        "&:hover": {
                          bgcolor: alpha(theme.palette.primary.main, 0.05),
                          border: `1px solid ${alpha(
                            theme.palette.primary.main,
                            0.2
                          )}`,
                        },
                      }}
                    >
                      <Card
                        sx={{
                          width: "100%",
                          bgcolor: "transparent",
                          boxShadow: "none",
                        }}
                      >
                        <CardContent>
                          <Grid container alignItems="center" spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 2,
                                }}
                              >
                                {renderTeamWithLogo(scrim.teamA)}
                                <Typography
                                  variant="body2"
                                  sx={{ opacity: 0.6 }}
                                >
                                  vs
                                </Typography>
                                {scrim.teamB
                                  ? renderTeamWithLogo(scrim.teamB)
                                  : "TBD"}
                              </Box>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                              <Box
                                sx={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 1,
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 1,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <Chip
                                    label={scrim.format}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                  />
                                  <Chip
                                    label={formatTime(scrim.scheduledTime)}
                                    size="small"
                                    icon={<AccessTime />}
                                  />
                                </Box>

                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 1,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {isMyScrim ? (
                                    <>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() =>
                                          navigate(
                                            `/scrims/${scrim._id}/requests`
                                          )
                                        }
                                      >
                                        View Requests
                                      </Button>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() =>
                                          handleEditScrim(scrim._id)
                                        }
                                      >
                                        Edit
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      size="small"
                                      variant="contained"
                                      onClick={() =>
                                        handleSendRequest(scrim._id)
                                      }
                                      disabled={
                                        isRequested || !selectedRequestTeam
                                      }
                                    >
                                      {isRequested
                                        ? "Requested"
                                        : "Send Request"}
                                    </Button>
                                  )}
                                </Box>
                              </Box>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ScrimDashboard;