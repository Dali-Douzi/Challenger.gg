import React from "react";
import { Button, Menu, MenuItem, Typography } from "@mui/material";

const RoleDropdown = ({
  memberRole,
  memberId,
  memberUserId,
  currentUserRole,
  currentUserId,
  onRoleChange,
  onKick,
  onLeave,
}) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  // Normalize IDs to strings for comparison
  const memberUserIdStr = memberUserId?.toString?.() || memberUserId;
  const currentUserIdStr = currentUserId?.toString?.() || currentUserId;
  const isCurrentUser = memberUserIdStr === currentUserIdStr;

  // Build the allowed actions based on viewer role
  const actions = [];

  if (currentUserRole === "owner") {
    // Owner can assign any non-owner role (but not to themselves)
    if (!isCurrentUser) {
      // Assign Manager - only if member is not already a manager
      if (memberRole !== "manager") {
        actions.push({ label: "Promote to Manager", action: () => onRoleChange("manager") });
      }
      // Demote to Player - only if member is currently a manager
      if (memberRole === "manager") {
        actions.push({ label: "Demote to Player", action: () => onRoleChange("player") });
      }
      // Assign Substitute - only if member is not already a substitute
      if (memberRole !== "substitute") {
        actions.push({ label: "Assign Substitute", action: () => onRoleChange("substitute") });
      }
      // Promote to Player - only if member is currently a substitute
      if (memberRole === "substitute") {
        actions.push({ label: "Promote to Player", action: () => onRoleChange("player") });
      }
      // Owner can kick anyone except themselves
      actions.push({ label: "Kick from Team", action: onKick });
    }
  } else if (currentUserRole === "manager") {
    // Manager can only switch between player ↔ substitute (not for themselves, owner, or other managers)
    if (!isCurrentUser && memberRole !== "owner" && memberRole !== "manager") {
      if (memberRole === "player") {
        actions.push({ label: "Assign Substitute", action: () => onRoleChange("substitute") });
      } else if (memberRole === "substitute") {
        actions.push({ label: "Promote to Player", action: () => onRoleChange("player") });
      }
    }
  }

  // Any non-owner member can leave the team (for their own row)
  if (isCurrentUser && memberRole !== "owner") {
    actions.push({ label: "Leave Team", action: onLeave });
  }

  // If no actions for this viewer, just show static text
  if (actions.length === 0) {
    return <Typography variant="body2">{memberRole}</Typography>;
  }

  return (
    <>
      <Button variant="outlined" size="small" onClick={handleClick}>
        {memberRole}
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        {actions.map((item, idx) => (
          <MenuItem
            key={idx}
            onClick={() => {
              item.action();
              handleClose();
            }}
          >
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default RoleDropdown;