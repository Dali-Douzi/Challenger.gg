import React, { useState } from "react";
import {
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  CircularProgress,
  Box,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import RoleDropdown from "./RoleDropdown";
import RankDropdown from "./RankDropdown";
import api from '../services/apiClient';

const MemberRow = ({
  member,
  currentUserRole,
  availableRanks,
  teamId,
  onMemberChange,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const handleRankChange = async (newRank) => {
    setLoading(true);
    try {
      await api.put(
        `/api/teams/${teamId}/members/${member._id}/rank`,
        { rank: newRank }
      );
      onMemberChange();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to change rank");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (newRole) => {
    setLoading(true);
    try {
      await api.put(
        `/api/teams/${teamId}/members/${member._id}/role`,
        { role: newRole }
      );
      onMemberChange();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to change role");
    } finally {
      setLoading(false);
    }
  };

  const handleKick = async () => {
    if (
      !window.confirm(`Are you sure you want to kick ${member.user.username}?`)
    ) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`/api/teams/${teamId}/members/${member._id}`);
      onMemberChange();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to kick member");
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (
      !window.confirm(
        "Are you sure you want to leave this team? This action cannot be undone."
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`/api/teams/${teamId}/members/self`);
      onMemberChange();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to leave team");
    } finally {
      setLoading(false);
    }
  };

  const avatarUrl =
    member.user.avatar && !avatarError ? member.user.avatar : "";

  const getUserInitials = (username) => {
    if (!username) return "?";
    const names = username.trim().split(/\s+/);
    if (names.length === 1) {
      return names[0][0].toUpperCase();
    }
    return names
      .slice(0, 2)
      .map((name) => name[0].toUpperCase())
      .join("");
  };

  const handleAvatarError = () => {
    setAvatarError(true);
  };

  return (
    <ListItem divider sx={{ display: "flex", alignItems: "center" }}>
      <ListItemAvatar>
        <Avatar
          src={avatarUrl}
          alt={member.user.username}
          onError={handleAvatarError}
          sx={{
            width: 40,
            height: 40,
            bgcolor: avatarUrl ? "transparent" : "primary.main",
            fontSize: "1rem",
            fontWeight: "bold",
          }}
        >
          {getUserInitials(member.user.username)}
        </Avatar>
      </ListItemAvatar>

      <ListItemText
        primary={member.user.username}
        sx={{
          "& .MuiListItemText-primary": {
            fontWeight: 500,
          },
        }}
      />

      {loading ? (
        <CircularProgress size={20} sx={{ ml: "auto" }} />
      ) : (
        <Box sx={{ display: "flex", gap: 1, ml: "auto" }}>
          <RankDropdown
            memberRank={member.rank}
            rankOptions={availableRanks}
            currentUserRole={currentUserRole}
            onRankChange={handleRankChange}
          />
          <RoleDropdown
            memberId={member._id}
            memberUserId={member.user._id || member.user}
            memberRole={member.role}
            currentUserRole={currentUserRole}
            currentUserId={user?.id || user?._id}
            onRoleChange={handleRoleChange}
            onKick={handleKick}
            onLeave={handleLeave}
          />
        </Box>
      )}
    </ListItem>
  );
};

export default MemberRow;