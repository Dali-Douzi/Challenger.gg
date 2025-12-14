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
} from "@mui/material";
import { SportsEsports, AccessTime } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import api, { getApiBaseUrl } from '../services/apiClient';

// Get API base URL
const API_BASE = getApiBaseUrl();

// Helper to get team name initials
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

  // Visual helper for time formatting
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

  // ✅ FIXED: Helper to check if user can manage a team
  const canManageTeam = (team) => {
    if (!user || !team) {
      console.log("🔍 [PERMISSION] No user or team");
      return false;
    }
    
    // ✅ FIX: Get consistent user ID (check all possible properties)
    const userId = user.id || user._id || user.userId;
    if (!userId) {
      console.warn("⚠️ [PERMISSION] User object missing ID property:", user);
      return false;
    }
    
    // Check if user is owner (team.owner can be string or object)
    const ownerId = team.owner?._id || team.owner;
    const isOwner = ownerId?.toString() === userId.toString();
    
    // Check if user is a manager
    const isManager = team.members?.some((m) => {
      const memberId = m.user?._id || m.user;
      return memberId?.toString() === userId.toString() && m.role === "manager";
    });
    
    console.log(`🔍 [PERMISSION] Team "${team.name}" - UserId: ${userId}, OwnerId: ${ownerId}, Owner: ${isOwner}, Manager: ${isManager}`);
    return isOwner || isManager;
  };

  // ✅ FIXED: Fetch user's teams with improved debugging
  useEffect(() => {
    (async () => {
      try {
        console.log("🔍 [TEAMS] User object:", {
          id: user?.id,
          _id: user?._id,
          userId: user?.userId,
          keys: user ? Object.keys(user) : [],
          fullUser: user
        });
        
        console.log("🔍 [TEAMS] Fetching teams...");
        
        const data = await api.get('/api/teams/my');
        console.log("🔍 [TEAMS] Raw API response:", data);
        
        let teamsArray = [];
        if (data && data.success && Array.isArray(data.data)) {
          teamsArray = data.data;
          console.log("✅ [TEAMS] Using data.data format (CORRECT)");
        } else if (Array.isArray(data)) {
          teamsArray = data;
          console.log("⚠️ [TEAMS] Using direct array format (OLD)");
        } else if (data && data.data && Array.isArray(data.data)) {
          teamsArray = data.data;
        } else {
          console.warn("⚠️ [TEAMS] Unexpected format:", data);
        }
        
        console.log("🔍 [TEAMS] Teams array before filter:", teamsArray.length);
        console.log("🔍 [TEAMS] Teams data:", teamsArray.map(t => ({
          id: t._id,
          name: t.name,
          owner: t.owner,
          ownerId: t.owner?._id || t.owner,
          members: t.members?.map(m => ({
            userId: m.user?._id || m.user,
            role: m.role
          }))
        })));
        
        // ✅ FIX: Filter to only teams the user can manage
        const manageableTeams = teamsArray.filter(team => {
          const canManage = canManageTeam(team);
          console.log(`🔍 [TEAMS] Team "${team.name}" - can manage:`, canManage);
          return canManage;
        });
        
        console.log("🔍 [TEAMS] Total teams:", teamsArray.length);
        console.log("🔍 [TEAMS] Manageable teams:", manageableTeams.length);
        console.log("🔍 [TEAMS] Manageable team names:", manageableTeams.map(t => t.name));
        
        setTeams(manageableTeams);
        
        if (manageableTeams.length > 0) {
          setSelectedTeam(manageableTeams[0]._id);
          setSelectedRequestTeam(manageableTeams[0]._id);
          console.log("✅ [TEAMS] Teams loaded! Count:", manageableTeams.length);
        } else {
          console.warn("⚠️ [TEAMS] No manageable teams found");
          // Check if there were any teams at all
          if (teamsArray.length > 0) {
            console.warn("⚠️ [TEAMS] User has teams but can't manage any of them");
            console.warn("⚠️ [TEAMS] This indicates a permission issue");
          }
        }
      } catch (err) {
        console.error("❌ [TEAMS] Fetch error:", err);
        console.error("❌ [TEAMS] Error details:", {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
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
        const res = await fetch(`${API_BASE}/api/teams/games`);
        if (res.ok) {
          const data = await res.json();
          console.log("🎮 [GAMES] Fetched:", data);
          const gamesArray = Array.isArray(data) ? data : [];
          setGames(gamesArray);
        } else {
          console.error("❌ [GAMES] Failed to fetch");
          setGames([]);
        }
      } catch (err) {
        console.error("❌ [GAMES] Error:", err);
        setGames([]);
      } finally {
        setLoading((l) => ({ ...l, games: false }));
      }
    })();
  }, []);

  // Initialize filters from first game
  useEffect(() => {
    if (!loading.games && games.length) {
      const first = games[0];
      setSelectedGameFilter(first.name);
      setRankOptions(first.ranks || []);
      setServerOptions(first.servers || []);
      console.log("🎮 [GAMES] Initialized filters with:", first.name);
    }
  }, [loading.games, games]);

  // Auto-populate when team changes
  useEffect(() => {
    if (!selectedTeam || !teams.length || !games.length) return;

    const team = teams.find((t) => t._id === selectedTeam);
    if (!team) return;

    console.log("🔍 [TEAM-CHANGE] Selected team:", team.name);

    // Find the game object
    let gameObj = null;
    if (team.game && team.game._id) {
      gameObj = games.find((g) => g._id === team.game._id);
    } else if (team.game) {
      gameObj = games.find((g) => g._id === team.game || g.name === team.game);
    }

    if (!gameObj) {
      console.warn("⚠️ [TEAM-CHANGE] Game not found for team");
      return;
    }

    console.log("🔍 [TEAM-CHANGE] Game:", gameObj.name);

    // Set filters from team
    setSelectedGameFilter(gameObj.name);
    setServerOptions(gameObj.servers || []);
    setRankOptions(gameObj.ranks || []);
    setSelectedServerFilter(team.server || "");
    setSelectedRankFilter(team.rank || "");

    // Set formats
    const fmts = gameObj.formats || [];
    setFormats(fmts);
    if (fmts.length && !format) {
      setFormat(fmts[0]);
    }
  }, [selectedTeam, teams, games, format]);

  // Fetch scrims
  const fetchScrims = async () => {
    console.log("📡 [SCRIMS] fetchScrims called");
    setLoading((l) => ({ ...l, scrims: true }));
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (selectedGameFilter) params.append("game", selectedGameFilter);
      if (selectedServerFilter) params.append("server", selectedServerFilter);
      if (selectedRankFilter) params.append("rank", selectedRankFilter);

      const url = `/api/scrims?${params.toString()}`;
      console.log("📡 [SCRIMS] Fetching from:", url);

      const responseData = await api.get(url);
      console.log("📥 [SCRIMS] Response:", responseData);

      // Handle different response formats
      if (responseData && responseData.success && Array.isArray(responseData.data)) {
        console.log("✅ [SCRIMS] Loaded (success format):", responseData.data.length);
        setScrims(responseData.data);
      } else if (Array.isArray(responseData)) {
        console.log("✅ [SCRIMS] Loaded (array format):", responseData.length);
        setScrims(responseData);
      } else if (responseData && Array.isArray(responseData.data)) {
        console.log("✅ [SCRIMS] Loaded (data format):", responseData.data.length);
        setScrims(responseData.data);
      } else {
        console.warn("⚠️ [SCRIMS] Unexpected format:", responseData);
        setScrims([]);
      }
    } catch (err) {
      console.error("❌ [SCRIMS] Error:", err);
      console.error("❌ [SCRIMS] Details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      // Don't set error state if it's just an empty result
      if (err.message && !err.message.includes("404")) {
        setError(`Failed to load scrims: ${err.message}`);
      }
      setScrims([]);
    } finally {
      console.log("✅ [SCRIMS] Setting loading to false");
      setLoading((l) => ({ ...l, scrims: false }));
    }
  };

  // Fetch scrims when authenticated and data ready
  useEffect(() => {
    console.log("📡 [SCRIMS] Effect triggered:", {
      isAuthenticated,
      gamesLoaded: !loading.games,
      teamsLoaded: !loading.teams,
      gameFilter: selectedGameFilter
    });
    
    if (isAuthenticated && !loading.games && !loading.teams && selectedGameFilter) {
      console.log("📡 [SCRIMS] Calling fetchScrims");
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
    
    console.log("📤 [POST] Validating scrim post...");
    
    // ✅ FIX: Validate all required fields
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

    // ✅ Validate future time
    if (dt <= new Date()) {
      alert("Scheduled time must be in the future.");
      return;
    }

    setLoading((l) => ({ ...l, posting: true }));
    try {
      console.log("📤 [POST] Posting scrim:", {
        teamId: selectedTeam,
        format,
        scheduledTime: dt.toISOString(),
      });

      const responseData = await api.post('/api/scrims', {
        teamId: selectedTeam,
        format,
        scheduledTime: dt.toISOString(),
      });

      console.log("📥 [POST] Response:", responseData);

      if (responseData.success) {
        setSelectedDay("");
        setSelectedTime("");
        await fetchScrims();
        alert("Scrim posted successfully!");
      } else {
        throw new Error(responseData.message || "Failed to post scrim");
      }
    } catch (err) {
      console.error("❌ [POST] Error:", err);
      alert(err.message || "Failed to post scrim");
    } finally {
      setLoading((l) => ({ ...l, posting: false }));
    }
  };

  const handleSendRequest = async (scrimId) => {
    if (!selectedRequestTeam || requested.includes(scrimId)) return;

    console.log("📤 [REQUEST] Sending request for scrim:", scrimId);
    setRequested((prev) => [...prev, scrimId]);
    
    try {
      const responseData = await api.post(`/api/scrims/request/${scrimId}`, {
        teamId: selectedRequestTeam
      });

      console.log("📥 [REQUEST] Response:", responseData);

      if (!responseData.success) {
        throw new Error(responseData.message || "Failed to send request");
      }
    } catch (err) {
      console.error("❌ [REQUEST] Error:", err);
      if (err.message === "Scrim request already sent") return;
      alert(err.message);
      setRequested((prev) => prev.filter((id) => id !== scrimId));
    }
  };

  const handleEditScrim = (scrimId) => {
    console.log("✏️ [EDIT] Editing scrim:", scrimId);
    sessionStorage.setItem("editingScrimId", scrimId);
    navigate("/scrims/edit");
  };

  // Game filter change
  const handleGameChange = (gameName) => {
    console.log("🎮 [FILTER] Game changed to:", gameName);
    setSelectedGameFilter(gameName);
    const game = games.find((g) => g.name === gameName) || {};
    setServerOptions(game.servers || []);
    setRankOptions(game.ranks || []);
    setSelectedServerFilter("");
    setSelectedRankFilter("");

    // Update formats when game changes
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
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        maxHeight: 400,
                        width: 400,
                      },
                    },
                  }}
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
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        maxHeight: 400,
                        width: 400,
                      },
                    },
                  }}
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
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        maxHeight: 400,
                        width: 400,
                      },
                    },
                  }}
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
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        maxHeight: 400,
                        width: 400,
                      },
                    },
                  }}
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

            {/* Filters */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Game</InputLabel>
                  <Select
                    value={selectedGameFilter}
                    onChange={(e) => handleGameChange(e.target.value)}
                    label="Game"
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          maxHeight: 400,
                          width: 300,
                        },
                      },
                    }}
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
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          maxHeight: 400,
                          width: 250,
                        },
                      },
                    }}
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
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          maxHeight: 400,
                          width: 250,
                        },
                      },
                    }}
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
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          maxHeight: 400,
                          width: 400,
                        },
                      },
                    }}
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

            {error && (
              <Typography color="error" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}

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