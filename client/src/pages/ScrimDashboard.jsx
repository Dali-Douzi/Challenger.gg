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
import { SportsEsports, AccessTime, EmojiEvents, FilterList } from "@mui/icons-material";
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
    if (!user || !team) return false;
    
    const userId = user.id || user._id || user.userId;
    if (!userId) return false;
    
    const ownerId = team.owner?._id || team.owner;
    const isOwner = ownerId?.toString() === userId.toString();
    
    const isManager = team.members?.some((m) => {
      const memberId = m.user?._id || m.user;
      return memberId?.toString() === userId.toString() && m.role === "manager";
    });
    
    return isOwner || isManager;
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get('/api/teams/my');
        
        let teamsArray = [];
        if (data && data.success && Array.isArray(data.data)) {
          teamsArray = data.data;
        } else if (Array.isArray(data)) {
          teamsArray = data;
        }
        
        const manageableTeams = teamsArray.filter(team => canManageTeam(team));
        
        setTeams(manageableTeams);
        
        if (manageableTeams.length > 0) {
          setSelectedTeam(manageableTeams[0]._id);
          setSelectedRequestTeam(manageableTeams[0]._id);
        }
      } catch (err) {
        console.error("Teams fetch error:", err);
        setTeams([]);
      } finally {
        setLoading((l) => ({ ...l, teams: false }));
      }
    })();
  }, [user]);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get('/api/teams/games');
        
        let gamesArray = [];
        if (data && data.success && Array.isArray(data.data)) {
          gamesArray = data.data;
        } else if (Array.isArray(data)) {
          gamesArray = data;
        }
        
        setGames(gamesArray);
      } catch (err) {
        console.error("Games fetch error:", err);
        setGames([]);
      } finally {
        setLoading((l) => ({ ...l, games: false }));
      }
    })();
  }, []);

  useEffect(() => {
    if (!loading.games && games.length) {
      const first = games[0];
      setSelectedGameFilter(first.name);
      setRankOptions(first.ranks || []);
      setServerOptions(first.servers || []);
    }
  }, [loading.games, games]);

  // Separate effect for updating formats when posting team changes
  useEffect(() => {
    if (!selectedTeam || !teams.length || !games.length) return;

    const team = teams.find((t) => t._id === selectedTeam);
    if (!team) return;

    let gameObj = null;
    if (team.game && team.game._id) {
      gameObj = games.find((g) => g._id === team.game._id);
    } else if (team.game) {
      gameObj = games.find((g) => g._id === team.game || g.name === team.game);
    }

    if (!gameObj) return;

    // Only update formats for the posting form, don't touch filters
    const fmts = gameObj.formats || [];
    setFormats(fmts);
    if (fmts.length && !format) {
      setFormat(fmts[0]);
    }
  }, [selectedTeam, teams, games]);

  const fetchScrims = async () => {
    setLoading((l) => ({ ...l, scrims: true }));
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (selectedGameFilter) params.append("game", selectedGameFilter);
      if (selectedServerFilter) params.append("server", selectedServerFilter);
      if (selectedRankFilter) params.append("rank", selectedRankFilter);

      const url = `/api/scrims?${params.toString()}`;
      const responseData = await api.get(url);

      let scrimsArray = [];
      if (responseData && responseData.success && Array.isArray(responseData.data)) {
        scrimsArray = responseData.data;
      } else if (Array.isArray(responseData)) {
        scrimsArray = responseData;
      }

      setScrims(scrimsArray);
      
    } catch (err) {
      console.error("Fetch scrims error:", err);
      setError(`Failed to load scrims: ${err.message}`);
      setScrims([]);
    } finally {
      setLoading((l) => ({ ...l, scrims: false }));
    }
  };

  useEffect(() => {
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
    const now = new Date();
    
    for (let h = 0; h < 24; h++) {
      const hh = h.toString().padStart(2, "0");
      ["00", "30"].forEach((mm) => {
        const timeStr = `${hh}:${mm}`;
        
        if (selectedDay === "Today") {
          const testDate = new Date();
          testDate.setHours(h, parseInt(mm), 0, 0);
          
          if (testDate > now) {
            times.push(timeStr);
          }
        } else {
          times.push(timeStr);
        }
      });
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

    setLoading((l) => ({ ...l, posting: true }));
    try {
      const responseData = await api.post('/api/scrims', {
        teamId: selectedTeam,
        format,
        scheduledTime: dt.toISOString(),
      });

      if (responseData.success) {
        setSelectedDay("");
        setSelectedTime("");
        await fetchScrims();
        alert("Scrim posted successfully!");
      }
    } catch (err) {
      alert(err.message || "Failed to post scrim");
    } finally {
      setLoading((l) => ({ ...l, posting: false }));
    }
  };

  const handleSendRequest = async (scrimId) => {
    if (!selectedRequestTeam || requested.includes(scrimId)) return;

    setRequested((prev) => [...prev, scrimId]);
    
    try {
      await api.post(`/api/scrims/request/${scrimId}`, {
        teamId: selectedRequestTeam
      });
    } catch (err) {
      if (err.message === "Scrim request already sent") return;
      alert(err.message);
      setRequested((prev) => prev.filter((id) => id !== scrimId));
    }
  };

  const handleEditScrim = (scrimId) => {
    sessionStorage.setItem("editingScrimId", scrimId);
    navigate("/scrims/edit");
  };

  const handleGameChange = (gameName) => {
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
    if (!team) return null;

    const teamLogo = team.logo && team.logo.startsWith('http') 
      ? team.logo 
      : team.logo 
        ? `${API_BASE}${team.logo.startsWith('/') ? '' : '/'}${team.logo}`
        : null;

    const teamInitials = getTeamInitials(team.name);

    const handleTeamClick = () => {
      navigate(`/teams/${team._id}`);
    };

    return (
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <IconButton
          onClick={handleTeamClick}
          sx={{
            p: 0,
            "&:hover": {
              transform: "scale(1.1)",
              transition: "transform 0.2s ease-in-out",
            },
          }}
        >
          <Avatar
            src={teamLogo}
            sx={{
              width: 48,
              height: 48,
              fontSize: "1rem",
              fontWeight: "bold",
              cursor: "pointer",
              background: teamLogo 
                ? 'transparent'
                : `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              border: `2px solid ${alpha(theme.palette.primary.main, 0.5)}`,
            }}
          >
            {!teamLogo && teamInitials}
          </Avatar>
        </IconButton>
        <Box>
          <Typography
            variant="h6"
            component="span"
            onClick={handleTeamClick}
            sx={{
              cursor: "pointer",
              fontWeight: 700,
              color: theme.palette.text.primary,
              "&:hover": {
                textDecoration: "underline",
                color: theme.palette.primary.main,
              },
            }}
          >
            {team.name}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
            <Chip
              label={team.server}
              size="small"
              sx={{
                bgcolor: alpha(theme.palette.info.main, 0.2),
                color: theme.palette.info.main,
                fontSize: "0.7rem",
                height: 20,
                fontWeight: 600,
              }}
            />
            <Chip
              label={team.rank}
              size="small"
              sx={{
                bgcolor: alpha(theme.palette.warning.main, 0.2),
                color: theme.palette.warning.main,
                fontSize: "0.7rem",
                height: 20,
                fontWeight: 600,
              }}
            />
          </Stack>
        </Box>
      </Stack>
    );
  };

  const getStatusColor = (scrim) => {
    if (scrim.status === "booked") return theme.palette.success.main;
    if (scrim.status === "completed") return theme.palette.secondary.main;
    return theme.palette.primary.main;
  };

  if (loading.teams || loading.games) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress sx={{ color: theme.palette.primary.main }} />
        <Typography sx={{ mt: 2, color: theme.palette.text.secondary }}>
          Loading {loading.teams ? "teams" : ""} {loading.games ? "games" : ""}
          ...
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box
        sx={{
          mb: 4,
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        <EmojiEvents
          sx={{
            fontSize: 48,
            background: `linear-gradient(135deg, ${theme.palette.warning.main}, ${theme.palette.error.main})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        />
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Scrim Dashboard
        </Typography>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3,
            bgcolor: alpha(theme.palette.error.main, 0.1),
            border: `1px solid ${theme.palette.error.main}`,
          }}
        >
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", gap: 3 }}>
        {/* Post Scrim Card - Fixed 25% width */}
        <Box sx={{ width: "25%", flexShrink: 0 }}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.success.main,
                0.05
              )} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
              backdropFilter: "blur(10px)",
              border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
              borderRadius: 3,
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
                fontWeight: 700,
                color: theme.palette.success.main,
              }}
            >
              <SportsEsports />
              Post a Scrim
            </Typography>

            <Box component="form" onSubmit={handlePostScrim}>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Your Team</InputLabel>
                <Select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  label="Your Team"
                  sx={{
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: alpha(theme.palette.success.main, 0.5),
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: theme.palette.success.main,
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

              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Format</InputLabel>
                <Select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  label="Format"
                  sx={{
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: alpha(theme.palette.info.main, 0.5),
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: theme.palette.info.main,
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

              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Day</InputLabel>
                <Select
                  value={selectedDay}
                  onChange={(e) => {
                    setSelectedDay(e.target.value);
                    setSelectedTime("");
                  }}
                  label="Day"
                  sx={{
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: alpha(theme.palette.warning.main, 0.5),
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: theme.palette.warning.main,
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

              <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                <InputLabel>Time</InputLabel>
                <Select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  label="Time"
                  disabled={!selectedDay}
                  sx={{
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: alpha(theme.palette.secondary.main, 0.5),
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: theme.palette.secondary.main,
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
                  fontWeight: 700,
                  fontSize: "1rem",
                  background: `linear-gradient(90deg, ${theme.palette.success.main}, ${theme.palette.primary.main})`,
                  "&:hover": {
                    background: `linear-gradient(90deg, ${theme.palette.success.dark}, ${theme.palette.primary.dark})`,
                    transform: "translateY(-2px)",
                  },
                  "&:disabled": {
                    background: alpha(theme.palette.text.disabled, 0.3),
                  },
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
        </Box>

        {/* Available Scrims Card - Fixed 75% width */}
        <Box sx={{ width: "75%", flexGrow: 1 }}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.primary.main,
                0.05
              )} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
              backdropFilter: "blur(10px)",
              border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
              borderRadius: 3,
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
                fontWeight: 700,
                color: theme.palette.primary.main,
              }}
            >
              <AccessTime />
              Available Scrims
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 2,
                  color: theme.palette.warning.main,
                }}
              >
                <FilterList />
                <Typography variant="subtitle2" fontWeight={600}>
                  Filters
                </Typography>
              </Box>

              <Box 
                sx={{ 
                  display: "flex", 
                  gap: 2, 
                  flexWrap: "wrap",
                  "& > *": {
                    flex: "1 1 calc(25% - 16px)",
                    minWidth: "200px"
                  }
                }}
              >
                <FormControl sx={{ minWidth: 200 }}>
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

                <FormControl sx={{ minWidth: 200 }}>
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

                <FormControl sx={{ minWidth: 200 }}>
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

                <FormControl sx={{ minWidth: 200 }}>
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
              </Box>
            </Box>

            {loading.scrims ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <CircularProgress sx={{ color: theme.palette.secondary.main }} />
                <Typography sx={{ mt: 2, color: theme.palette.text.secondary }}>
                  Loading scrims...
                </Typography>
              </Box>
            ) : scrims.length === 0 ? (
              <Box
                sx={{
                  textAlign: "center",
                  py: 8,
                  px: 3,
                  border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                  borderRadius: 3,
                }}
              >
                <SportsEsports
                  sx={{
                    fontSize: 64,
                    color: alpha(theme.palette.primary.main, 0.5),
                    mb: 2,
                  }}
                />
                <Typography variant="h6" sx={{ color: theme.palette.text.secondary }}>
                  No scrims available
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.disabled, mt: 1 }}>
                  Try adjusting your filters or post your own scrim
                </Typography>
              </Box>
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
                        p: 0,
                      }}
                    >
                      <Card
                        sx={{
                          width: "100%",
                          background: `linear-gradient(135deg, ${alpha(
                            getStatusColor(scrim),
                            0.05
                          )} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
                          border: `1px solid ${alpha(getStatusColor(scrim), 0.3)}`,
                          transition: "all 0.3s ease",
                          "&:hover": {
                            transform: "translateY(-4px)",
                            border: `1px solid ${getStatusColor(scrim)}`,
                            boxShadow: `0 8px 24px ${alpha(getStatusColor(scrim), 0.3)}`,
                          },
                        }}
                      >
                        <CardContent>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 3,
                            }}
                          >
                            {/* Left side: Team info - fixed width */}
                            <Box sx={{ minWidth: 0, flexShrink: 0, width: 300 }}>
                              {renderTeamWithLogo(scrim.teamA)}
                            </Box>

                            {/* Middle: Chips - flex grow to take available space */}
                            <Box
                              sx={{
                                display: "flex",
                                gap: 1,
                                flexWrap: "wrap",
                                flexGrow: 1,
                                minWidth: 0,
                              }}
                            >
                              <Chip
                                label={scrim.format}
                                size="small"
                                sx={{
                                  bgcolor: alpha(theme.palette.secondary.main, 0.2),
                                  color: theme.palette.secondary.main,
                                  fontWeight: 700,
                                  border: `1px solid ${alpha(theme.palette.secondary.main, 0.5)}`,
                                }}
                              />
                              <Chip
                                label={formatTime(scrim.scheduledTime)}
                                size="small"
                                icon={<AccessTime sx={{ color: theme.palette.primary.main }} />}
                                sx={{
                                  bgcolor: alpha(theme.palette.primary.main, 0.2),
                                  color: theme.palette.primary.main,
                                  fontWeight: 700,
                                  border: `1px solid ${alpha(theme.palette.primary.main, 0.5)}`,
                                }}
                              />
                              <Chip
                                label={scrim.status.toUpperCase()}
                                size="small"
                                sx={{
                                  bgcolor: alpha(getStatusColor(scrim), 0.2),
                                  color: getStatusColor(scrim),
                                  fontWeight: 700,
                                  border: `1px solid ${alpha(getStatusColor(scrim), 0.5)}`,
                                }}
                              />
                            </Box>

                            {/* Right side: Actions - fixed width, aligned to far right */}
                            <Box
                              sx={{
                                display: "flex",
                                gap: 1,
                                flexShrink: 0,
                                justifyContent: "flex-end",
                                minWidth: isMyScrim ? 240 : 140,
                              }}
                            >
                              {isMyScrim ? (
                                <>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() =>
                                      navigate(`/scrims/${scrim._id}/requests`)
                                    }
                                    sx={{
                                      borderColor: theme.palette.info.main,
                                      color: theme.palette.info.main,
                                      fontWeight: 600,
                                      whiteSpace: "nowrap",
                                      "&:hover": {
                                        borderColor: theme.palette.info.light,
                                        bgcolor: alpha(theme.palette.info.main, 0.1),
                                      },
                                    }}
                                  >
                                    View Requests
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => handleEditScrim(scrim._id)}
                                    sx={{
                                      borderColor: theme.palette.warning.main,
                                      color: theme.palette.warning.main,
                                      fontWeight: 600,
                                      whiteSpace: "nowrap",
                                      "&:hover": {
                                        borderColor: theme.palette.warning.light,
                                        bgcolor: alpha(theme.palette.warning.main, 0.1),
                                      },
                                    }}
                                  >
                                    Edit
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleSendRequest(scrim._id)}
                                  disabled={isRequested || !selectedRequestTeam}
                                  sx={{
                                    borderColor: '#FF00FF',
                                    color: '#FF00FF',
                                    fontWeight: 600,
                                    whiteSpace: "nowrap",
                                    minWidth: 120,
                                    "&:hover": {
                                      borderColor: '#CC00CC',
                                      bgcolor: 'rgba(255, 0, 255, 0.1)',
                                    },
                                    "&:disabled": {
                                      borderColor: alpha(theme.palette.text.disabled, 0.3),
                                      color: alpha(theme.palette.text.disabled, 0.3),
                                    },
                                  }}
                                >
                                  {isRequested ? "Requested" : "Send Request"}
                                </Button>
                              )}
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default ScrimDashboard;