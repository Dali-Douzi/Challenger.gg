import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Paper,
} from "@mui/material";
import api from '../services/apiClient';

export default function EditScrim() {
  const navigate = useNavigate();
  const scrimId = sessionStorage.getItem("editingScrimId");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formats, setFormats] = useState([]);
  const [format, setFormat] = useState("");

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const [dateOptions, setDateOptions] = useState([]);
  const [timeOptions, setTimeOptions] = useState([]);

  const getDayOptions = () => {
    const opts = ["Today", "Tomorrow"];
    const today = new Date();
    for (let i = 2; i <= 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      opts.push(d.toISOString().slice(0, 10));
    }
    return opts;
  };

  const getTimeOptions = () => {
    const opts = [];
    for (let h = 0; h < 24; h++) {
      const hh = h.toString().padStart(2, "0");
      ["00", "30"].forEach((mm) => opts.push(`${hh}:${mm}`));
    }
    return opts;
  };

  useEffect(() => {
    if (!scrimId) {
      navigate("/scrims");
      return;
    }

    const loadScrim = async () => {
      try {
        setLoading(true);
        
        const scrimData = await api.get(`/api/scrims/${scrimId}`);
        const scrim = scrimData.success ? scrimData.data : scrimData;

        const dt = new Date(scrim.scheduledTime);
        const isoDate = dt.toISOString().slice(0, 10);
        const isoTime = dt.toTimeString().slice(0, 5);
        setDate(isoDate);
        setTime(isoTime);

        const days = getDayOptions();
        if (!days.includes(isoDate)) days.unshift(isoDate);
        setDateOptions(days);

        const times = getTimeOptions();
        if (!times.includes(isoTime)) times.unshift(isoTime);
        setTimeOptions(times);

        const teamData = await api.get(`/api/teams/${scrim.teamA._id || scrim.teamA}`);
        const team = teamData.success ? teamData.data : teamData;

        const gamesData = await api.get('/api/teams/games');
        const games = gamesData.success ? gamesData.data : (Array.isArray(gamesData) ? gamesData : []);
        
        const gameDoc = games.find((g) => g._id === (team.game?._id || team.game) || g.name === team.game) || {};
        setFormats(gameDoc.formats || []);
        setFormat(scrim.format);
      } catch (err) {
        console.error(err);
        alert(err.message);
        navigate("/scrims");
      } finally {
        setLoading(false);
      }
    };

    loadScrim();
  }, [scrimId, navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let dt = new Date();
      if (date === "Tomorrow") dt.setDate(dt.getDate() + 1);
      else if (date !== "Today") dt = new Date(date);
      const [h, m] = time.split(":").map(Number);
      dt.setHours(h, m, 0, 0);

      await api.put(`/api/scrims/${scrimId}`, {
        format,
        scheduledTime: dt.toISOString(),
      });

      navigate("/scrims");
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this scrim?")) {
      return;
    }
    setSaving(true);
    try {
      await api.delete(`/api/scrims/${scrimId}`);
      navigate("/scrims");
    } catch (err) {
      console.error("Delete Error:", err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ maxWidth: 600, mx: "auto", p: 4, mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Edit Scrim
      </Typography>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="format-label">Format</InputLabel>
        <Select
          labelId="format-label"
          value={format}
          label="Format"
          onChange={(e) => setFormat(e.target.value)}
        >
          {formats.map((f) => (
            <MenuItem key={f} value={f}>
              {f}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="date-label">Date</InputLabel>
        <Select
          labelId="date-label"
          value={date}
          label="Date"
          onChange={(e) => setDate(e.target.value)}
        >
          {dateOptions.map((d) => (
            <MenuItem key={d} value={d}>
              {d}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="time-label">Time</InputLabel>
        <Select
          labelId="time-label"
          value={time}
          label="Time"
          onChange={(e) => setTime(e.target.value)}
        >
          {timeOptions.map((t) => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button variant="contained" onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save Changes"}
      </Button>
      <Button
        variant="outlined"
        color="error"
        onClick={handleDelete}
        disabled={saving}
        sx={{ ml: 2 }}
      >
        Delete Scrim
      </Button>
    </Paper>
  );
}