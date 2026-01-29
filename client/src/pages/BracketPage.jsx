import React, {
  useState,
  useCallback,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { DndContext } from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  Alert,
  Container,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import {
  Add,
  EmojiEvents,
  Delete,
  Edit,
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  Undo,
  Redo,
  Save,
  Info,
  ArrowBack,
  AutoAwesome,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import api from "../services/apiClient";

const GRID_SIZE = 20;
const CANVAS_WIDTH = 4000;
const CANVAS_HEIGHT = 3000;

const hideSpinnerCSS = `
  .score-input::-webkit-outer-spin-button,
  .score-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .score-input[type=number] {
    -moz-appearance: textfield;
  }
`;

const snapToGrid = (value) => Math.round(value / GRID_SIZE) * GRID_SIZE;

const generateId = () =>
  `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const ConnectionPoint = ({
  type,
  position,
  componentId,
  pointId,
  isActive,
  onClick,
  color = "#3b82f6",
}) => {
  return (
    <div
      id={`connection-${componentId}-${pointId}`}
      style={{
        position: "absolute",
        width: "10px",
        height: "10px",
        borderRadius: "50%",
        backgroundColor: isActive ? color : "#374151",
        border: `2px solid ${color}`,
        cursor: "pointer",
        zIndex: 20,
        ...position,
        transition: "all 0.2s",
        transform: isActive ? "scale(1.3)" : "scale(1)",
        boxShadow: isActive ? `0 0 6px ${color}` : "none",
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(componentId, pointId, type);
      }}
    />
  );
};

const TeamSlot = ({
  id,
  team,
  score,
  onScoreChange,
  showScore,
  isWinner,
  disabled,
  onTeamRemove,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: String(id),
    disabled: Boolean(disabled),
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 6px",
        backgroundColor: isOver
          ? "rgba(59, 130, 246, 0.2)"
          : "rgba(71, 85, 105, 0.4)",
        borderRadius: "4px",
        border: isOver
          ? "1px solid #3b82f6"
          : "1px solid rgba(148, 163, 184, 0.2)",
        minHeight: "24px",
        transition: "all 0.2s",
        position: "relative",
      }}
    >
      {isWinner && <EmojiEvents sx={{ color: "gold", fontSize: "12px" }} />}

      <div
        style={{
          flex: 1,
          color: "#e2e8f0",
          fontSize: "0.7rem",
          fontWeight: "500",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {team && team.name ? (
          <span
            onClick={() => onTeamRemove && onTeamRemove()}
            style={{ cursor: onTeamRemove ? "pointer" : "default" }}
          >
            {String(team.name)}
          </span>
        ) : (
          <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "0.65rem" }}>
            {isOver ? "Drop" : "Empty"}
          </span>
        )}
      </div>

      {/* Score Square */}
      {showScore && (
        <input
          type="number"
          value={score !== null && score !== undefined ? String(score) : ""}
          onChange={(e) => {
            const newScore =
              e.target.value === "" ? 0 : parseInt(e.target.value) || 0;
            if (onScoreChange) onScoreChange(newScore);
          }}
          style={{
            width: "36px",
            height: "22px",
            backgroundColor: "rgba(30, 41, 59, 0.8)",
            border: "1px solid rgba(148, 163, 184, 0.3)",
            borderRadius: "3px",
            color: "#e2e8f0",
            textAlign: "center",
            fontSize: "0.75rem",
            fontWeight: "bold",
            MozAppearance: "textfield",
            WebkitAppearance: "none",
            appearance: "textfield",
          }}
          disabled={disabled}
          className="score-input"
        />
      )}
    </div>
  );
};

const GroupComponent = ({
  id,
  position,
  data,
  onUpdate,
  onDrag,
  onEdit,
  onDelete,
  selectedForConnection,
  onConnectionPoint,
  deleteMode,
  participants,
  zoom = 1,
  canEditStructure = true,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (deleteMode || !canEditStructure) return;
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    });
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      const canvas = document.getElementById("bracket-canvas");
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();
      const newX = snapToGrid((e.clientX - canvasRect.left) / zoom - dragOffset.x);
      const newY = snapToGrid((e.clientY - canvasRect.top) / zoom - dragOffset.y);
      onDrag(id, { x: newX, y: newY });
    },
    [isDragging, dragOffset, id, onDrag, zoom]
  );

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  const handleTeamDrop = (slotIndex, teamId) => {
    const currentData = data || {};
    const currentSlots = Array.isArray(currentData.slots)
      ? [...currentData.slots]
      : [];
    while (currentSlots.length <= slotIndex) {
      currentSlots.push(null);
    }
    currentSlots[slotIndex] = { teamId, score: 0 };
    onUpdate(id, { ...currentData, slots: currentSlots });
  };

  const handleTeamRemove = (slotIndex) => {
    const currentData = data || {};
    const currentSlots = Array.isArray(currentData.slots)
      ? [...currentData.slots]
      : [];
    if (slotIndex < currentSlots.length) {
      currentSlots[slotIndex] = null;
      onUpdate(id, { ...currentData, slots: currentSlots });
    }
  };

  const handleScoreChange = (slotIndex, score) => {
    const currentData = data || {};
    const currentSlots = Array.isArray(currentData.slots)
      ? [...currentData.slots]
      : [];
    if (slotIndex < currentSlots.length && currentSlots[slotIndex]) {
      currentSlots[slotIndex] = { ...currentSlots[slotIndex], score };
      onUpdate(id, { ...currentData, slots: currentSlots });
    }
  };

  const currentData = data || {};

  return (
    <div
      id={`component-${id}`}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: "140px",
        backgroundColor: deleteMode
          ? "rgba(239, 68, 68, 0.2)"
          : "rgba(30, 41, 59, 0.95)",
        border: deleteMode
          ? "1px solid #ef4444"
          : selectedForConnection
          ? "1px solid #3b82f6"
          : "1px solid #475569",
        borderRadius: "6px",
        padding: "6px",
        cursor: deleteMode ? "pointer" : !canEditStructure ? "default" : isDragging ? "grabbing" : "grab",
        backdropFilter: "blur(8px)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        userSelect: "none",
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        if (deleteMode) {
          e.stopPropagation();
          onDelete(id);
        }
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "4px",
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: "#e2e8f0", fontWeight: "600", fontSize: "0.7rem" }}
        >
          {currentData && currentData.name
            ? String(currentData.name)
            : `Group ${id.slice(-4)}`}
        </Typography>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(id);
          }}
          sx={{ padding: "2px" }}
        >
          <Edit sx={{ fontSize: "12px", color: "#94a3b8" }} />
        </IconButton>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        {Array.from(
          {
            length:
              currentData && typeof currentData.slotCount === "number"
                ? currentData.slotCount
                : 4,
          },
          (_, i) => {
            const slots = Array.isArray(currentData.slots)
              ? currentData.slots
              : [];
            const slot = slots[i] || null;
            const team =
              slot && slot.teamId
                ? participants.find(
                    (p) => String(p._id || p.id) === String(slot.teamId)
                  )
                : null;
            return (
              <TeamSlot
                key={i}
                id={`${id}-slot-${i}`}
                team={team}
                score={slot ? slot.score : null}
                showScore={true}
                isWinner={false}
                disabled={false}
                onScoreChange={(score) => handleScoreChange(i, score)}
                onTeamRemove={() => handleTeamRemove(i)}
              />
            );
          }
        )}
      </div>

      <ConnectionPoint
        type="output"
        position={{ right: "-5px", top: "30%" }}
        componentId={id}
        pointId="out"
        isActive={selectedForConnection === `${id}-out`}
        onClick={onConnectionPoint}
        color="#4ade80"
      />
      <ConnectionPoint
        type="input"
        position={{ left: "-5px", top: "50%" }}
        componentId={id}
        pointId="in"
        isActive={selectedForConnection === `${id}-in`}
        onClick={onConnectionPoint}
        color="#3b82f6"
      />
      <ConnectionPoint
        type="bottom"
        position={{
          left: "50%",
          bottom: "-5px",
          transform: "translateX(-50%)",
        }}
        componentId={id}
        pointId="bottom"
        isActive={selectedForConnection === `${id}-bottom`}
        onClick={onConnectionPoint}
        color="#ef4444"
      />
    </div>
  );
};

const SlotComponent = ({
  id,
  position,
  data,
  onUpdate,
  onDrag,
  onEdit,
  onDelete,
  selectedForConnection,
  onConnectionPoint,
  deleteMode,
  participants,
  zoom = 1,
  canEditStructure = true,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (deleteMode || !canEditStructure) return;
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    });
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      const canvas = document.getElementById("bracket-canvas");
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();
      const newX = snapToGrid((e.clientX - canvasRect.left) / zoom - dragOffset.x);
      const newY = snapToGrid((e.clientY - canvasRect.top) / zoom - dragOffset.y);
      onDrag(id, { x: newX, y: newY });
    },
    [isDragging, dragOffset, id, onDrag, zoom]
  );

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  const handleTeamRemove = () => {
    const currentData = data || {};
    onUpdate(id, { ...currentData, teamId: null });
  };

  const currentData = data || {};
  const team = currentData.teamId
    ? participants.find(
        (p) => String(p._id || p.id) === String(currentData.teamId)
      )
    : null;

  return (
    <div
      id={`component-${id}`}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: "120px",
        backgroundColor: deleteMode
          ? "rgba(239, 68, 68, 0.2)"
          : "rgba(30, 41, 59, 0.95)",
        border: deleteMode
          ? "1px solid #ef4444"
          : selectedForConnection
          ? "1px solid #3b82f6"
          : "1px solid #475569",
        borderRadius: "6px",
        padding: "6px",
        cursor: deleteMode ? "pointer" : !canEditStructure ? "default" : isDragging ? "grabbing" : "grab",
        backdropFilter: "blur(8px)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        userSelect: "none",
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        if (deleteMode) {
          e.stopPropagation();
          onDelete(id);
        }
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "4px",
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: "#e2e8f0", fontWeight: "600", fontSize: "0.7rem" }}
        >
          {currentData && currentData.name
            ? String(currentData.name)
            : `Slot ${id.slice(-4)}`}
        </Typography>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(id);
          }}
          sx={{ padding: "2px" }}
        >
          <Edit sx={{ fontSize: "12px", color: "#94a3b8" }} />
        </IconButton>
      </div>

      <TeamSlot
        id={`${id}-slot`}
        team={team}
        score={null}
        showScore={false}
        isWinner={false}
        disabled={false}
        onScoreChange={null}
        onTeamRemove={handleTeamRemove}
      />

      <ConnectionPoint
        type="output"
        position={{ right: "-5px", top: "30%" }}
        componentId={id}
        pointId="out"
        isActive={selectedForConnection === `${id}-out`}
        onClick={onConnectionPoint}
        color="#4ade80"
      />
      <ConnectionPoint
        type="input"
        position={{ left: "-5px", top: "50%" }}
        componentId={id}
        pointId="in"
        isActive={selectedForConnection === `${id}-in`}
        onClick={onConnectionPoint}
        color="#3b82f6"
      />
      <ConnectionPoint
        type="bottom"
        position={{
          left: "50%",
          bottom: "-5px",
          transform: "translateX(-50%)",
        }}
        componentId={id}
        pointId="bottom"
        isActive={selectedForConnection === `${id}-bottom`}
        onClick={onConnectionPoint}
        color="#ef4444"
      />
    </div>
  );
};

const MatchComponent = ({
  id,
  position,
  data,
  onUpdate,
  onDrag,
  onEdit,
  onDelete,
  selectedForConnection,
  onConnectionPoint,
  deleteMode,
  participants,
  zoom = 1,
  canEditStructure = true,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (deleteMode || !canEditStructure) return;
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    });
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      const canvas = document.getElementById("bracket-canvas");
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();
      const newX = snapToGrid((e.clientX - canvasRect.left) / zoom - dragOffset.x);
      const newY = snapToGrid((e.clientY - canvasRect.top) / zoom - dragOffset.y);
      onDrag(id, { x: newX, y: newY });
    },
    [isDragging, dragOffset, id, onDrag, zoom]
  );

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  const handleTeamRemove = (slot) => {
    const currentData = data || {};
    onUpdate(id, {
      ...currentData,
      [slot === "A" ? "teamA" : "teamB"]: null,
      [slot === "A" ? "scoreA" : "scoreB"]: 0,
    });
  };

  const handleScoreChange = (slot, score) => {
    const currentData = data || {};
    const newData = {
      ...currentData,
      [slot === "A" ? "scoreA" : "scoreB"]: score,
    };
    onUpdate(id, newData);
  };

  const currentData = data || {};
  const teamA = currentData.teamA
    ? participants.find(
        (p) => String(p._id || p.id) === String(currentData.teamA)
      )
    : null;
  const teamB = currentData.teamB
    ? participants.find(
        (p) => String(p._id || p.id) === String(currentData.teamB)
      )
    : null;

  const scoreA = Number(currentData.scoreA) || 0;
  const scoreB = Number(currentData.scoreB) || 0;
  const hasScores =
    currentData.scoreA !== undefined &&
    currentData.scoreA !== null &&
    currentData.scoreB !== undefined &&
    currentData.scoreB !== null;
  const winnerA = hasScores && scoreA > scoreB;
  const winnerB = hasScores && scoreB > scoreA;

  return (
    <div
      id={`component-${id}`}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: "140px",
        backgroundColor: deleteMode
          ? "rgba(239, 68, 68, 0.2)"
          : "rgba(30, 41, 59, 0.95)",
        border: deleteMode
          ? "1px solid #ef4444"
          : selectedForConnection
          ? "1px solid #3b82f6"
          : "1px solid #475569",
        borderRadius: "6px",
        padding: "6px",
        cursor: deleteMode ? "pointer" : !canEditStructure ? "default" : isDragging ? "grabbing" : "grab",
        backdropFilter: "blur(8px)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        userSelect: "none",
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        if (deleteMode) {
          e.stopPropagation();
          onDelete(id);
        }
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "4px",
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: "#e2e8f0", fontWeight: "600", fontSize: "0.7rem" }}
        >
          {currentData && currentData.name
            ? String(currentData.name)
            : `Match ${id.slice(-4)}`}
        </Typography>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(id);
          }}
          sx={{ padding: "2px" }}
        >
          <Edit sx={{ fontSize: "12px", color: "#94a3b8" }} />
        </IconButton>
      </div>

      <div style={{ marginBottom: "3px" }}>
        <TeamSlot
          id={`${id}-teamA`}
          team={teamA}
          score={scoreA}
          showScore={true}
          isWinner={winnerA}
          disabled={false}
          onScoreChange={(score) => handleScoreChange("A", score)}
          onTeamRemove={() => handleTeamRemove("A")}
        />
      </div>

      <div
        style={{
          textAlign: "center",
          margin: "2px 0",
          color: "#64748b",
          fontSize: "0.6rem",
          fontWeight: "bold",
        }}
      >
        VS
      </div>

      <TeamSlot
        id={`${id}-teamB`}
        team={teamB}
        score={scoreB}
        showScore={true}
        isWinner={winnerB}
        disabled={false}
        onScoreChange={(score) => handleScoreChange("B", score)}
        onTeamRemove={() => handleTeamRemove("B")}
      />

      <ConnectionPoint
        type="winner"
        position={{ right: "-5px", top: "30%" }}
        componentId={id}
        pointId="winner"
        isActive={selectedForConnection === `${id}-winner`}
        onClick={onConnectionPoint}
        color="#4ade80"
      />
      <ConnectionPoint
        type="loser"
        position={{
          left: "50%",
          bottom: "-5px",
          transform: "translateX(-50%)",
        }}
        componentId={id}
        pointId="loser"
        isActive={selectedForConnection === `${id}-loser`}
        onClick={onConnectionPoint}
        color="#ef4444"
      />
      <ConnectionPoint
        type="input"
        position={{ left: "-5px", top: "30%" }}
        componentId={id}
        pointId="inA"
        isActive={selectedForConnection === `${id}-inA`}
        onClick={onConnectionPoint}
        color="#3b82f6"
      />
      <ConnectionPoint
        type="input"
        position={{ left: "-5px", top: "70%" }}
        componentId={id}
        pointId="inB"
        isActive={selectedForConnection === `${id}-inB`}
        onClick={onConnectionPoint}
        color="#3b82f6"
      />
    </div>
  );
};

// Feature: H-shape bracket connections with color-coded winner/loser paths
const ConnectionLine = ({ connection, components, onDelete, deleteMode }) => {
  const fromComp = components.find((c) => c.id === connection.from.componentId);
  const toComp = components.find((c) => c.id === connection.to.componentId);

  if (!fromComp || !toComp) return null;

  const getConnectionPoint = (comp, pointId) => {
    const { position } = comp;

    const width = comp.type === "slot" ? 120 : 140;
    let height;

    if (comp.type === "group") {
      const slotCount =
        comp.data && typeof comp.data.slotCount === "number"
          ? comp.data.slotCount
          : 4;
      height = 30 + slotCount * 30;
    } else if (comp.type === "match") {
      height = 110;
    } else if (comp.type === "slot") {
      height = 55;
    } else {
      height = 70;
    }

    const dotOffset = 5;

    switch (pointId) {
      case "out":
      case "winner":
        return { x: position.x + width, y: position.y + height * 0.3 + dotOffset };
      case "loser":
        return { x: position.x + width / 2, y: position.y + height + dotOffset };
      case "in":
        return { x: position.x, y: position.y + height * 0.5 + dotOffset };
      case "inA":
        return { x: position.x, y: position.y + height * 0.3 + dotOffset };
      case "inB":
        return { x: position.x, y: position.y + height * 0.7 + dotOffset };
      case "bottom":
        return { x: position.x + width / 2, y: position.y + height + dotOffset };
      default:
        return { x: position.x + width / 2, y: position.y + height / 2 };
    }
  };

  const fromPoint = getConnectionPoint(fromComp, connection.from.pointId);
  const toPoint = getConnectionPoint(toComp, connection.to.pointId);

  const createOptimalPath = (from, to) => {
    const startX = from.x;
    const startY = from.y;
    const endX = to.x;
    const endY = to.y;

    const OFFSET = 40;

    const isFromRed =
      connection.from.pointId === "loser" ||
      connection.from.pointId === "bottom";
    const isFromGreen =
      connection.from.pointId === "winner" || connection.from.pointId === "out";
    const isToBlueInput =
      connection.to.pointId === "in" ||
      connection.to.pointId === "inA" ||
      connection.to.pointId === "inB";

    if (isFromRed) {
      const firstY = startY + OFFSET;
      const lastY = endY + OFFSET;
      if (isToBlueInput) {
        const approachX = endX - OFFSET;
        return `M ${startX} ${startY} L ${startX} ${firstY} L ${approachX} ${firstY} L ${approachX} ${endY} L ${endX} ${endY}`;
      } else {
        const midY = Math.max(firstY, lastY);
        return `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`;
      }
    }

    if (isFromGreen) {
      const firstX = startX + OFFSET;
      const lastX = endX - OFFSET;
      const midY = (startY + endY) / 2;
      return `M ${startX} ${startY} L ${firstX} ${startY} L ${firstX} ${midY} L ${lastX} ${midY} L ${lastX} ${endY} L ${endX} ${endY}`;
    }

    if (isToBlueInput) {
      const approachX = endX - OFFSET;
      const departX = startX - OFFSET;
      const midY = (startY + endY) / 2;
      return `M ${startX} ${startY} L ${departX} ${startY} L ${departX} ${midY} L ${approachX} ${midY} L ${approachX} ${endY} L ${endX} ${endY}`;
    }

    const firstX = startX + OFFSET;
    const lastX = endX - OFFSET;
    const midY = (startY + endY) / 2;
    return `M ${startX} ${startY} L ${firstX} ${startY} L ${firstX} ${midY} L ${lastX} ${midY} L ${lastX} ${endY} L ${endX} ${endY}`;
  };

  const colors = {
    winner: "#4ade80",
    loser: "#ef4444",
    normal: "#3b82f6",
  };

  const color = deleteMode ? "#ef4444" : colors[connection.type];
  const pathData = createOptimalPath(fromPoint, toPoint);

  const getArrowPoints = () => {
    const toPointId = connection.to.pointId;
    const x = toPoint.x;
    const y = toPoint.y;
    const size = 8;

    if (toPointId === "in" || toPointId === "inA" || toPointId === "inB") {
      return `${x - size},${y - size / 2} ${x},${y} ${x - size},${y + size / 2}`;
    }
    if (toPointId === "winner" || toPointId === "out") {
      return `${x + size},${y - size / 2} ${x},${y} ${x + size},${y + size / 2}`;
    }
    if (toPointId === "loser" || toPointId === "bottom") {
      return `${x - size / 2},${y + size} ${x},${y} ${x + size / 2},${y + size}`;
    }
    return `${x - size},${y - size / 2} ${x},${y} ${x - size},${y + size / 2}`;
  };

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      <path
        d={pathData}
        stroke={color}
        strokeWidth={deleteMode ? 4 : 3}
        strokeDasharray={connection.type === "loser" ? "8,4" : "none"}
        fill="none"
        style={{
          cursor: deleteMode ? "pointer" : "default",
          pointerEvents: deleteMode ? "stroke" : "none",
        }}
        onClick={(e) => {
          if (deleteMode) {
            e.stopPropagation();
            onDelete(connection.id);
          }
        }}
      />

      <polygon
        points={getArrowPoints()}
        fill={color}
        style={{
          cursor: deleteMode ? "pointer" : "default",
          pointerEvents: deleteMode ? "fill" : "none",
        }}
        onClick={(e) => {
          if (deleteMode) {
            e.stopPropagation();
            onDelete(connection.id);
          }
        }}
      />

      {deleteMode && (
        <path
          d={pathData}
          stroke="transparent"
          strokeWidth="12"
          fill="none"
          style={{
            cursor: "pointer",
            pointerEvents: "stroke",
          }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(connection.id);
          }}
        />
      )}
    </svg>
  );
};

const DraggableTeam = ({ team }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: String(team._id || team.id || `team-${Math.random()}`),
    });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
    width: "100%",
  };

  return (
    <Paper
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      sx={{
        p: 1.5,
        ...style,
        backgroundColor: team.color || "#424242",
        color: "white",
        borderRadius: "6px",
        textOverflow: "ellipsis",
        overflow: "hidden",
        whiteSpace: "nowrap",
        minHeight: "40px",
        display: "flex",
        alignItems: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
      elevation={2}
    >
      {team && team.name ? String(team.name) : "Unnamed Team"}
    </Paper>
  );
};

const componentsReducer = (state, action) => {
  switch (action.type) {
    case "SET_COMPONENTS":
      return action.payload;
    case "ADD_COMPONENT":
      return [...state, action.payload];
    case "DELETE_COMPONENT":
      return state.filter((comp) => comp.id !== action.id);
    case "UPDATE_COMPONENT":
      return state.map((comp) =>
        comp.id === action.id ? { ...comp, ...action.updates } : comp
      );
    case "UPDATE_POSITION":
      return state.map((comp) =>
        comp.id === action.id ? { ...comp, position: action.position } : comp
      );
    default:
      return state;
  }
};

const connectionsReducer = (state, action) => {
  switch (action.type) {
    case "SET_CONNECTIONS":
      return action.payload;
    case "ADD_CONNECTION":
      return [...state, action.payload];
    case "DELETE_CONNECTION":
      return state.filter((conn) => conn.id !== action.id);
    default:
      return state;
  }
};

const EditGroupDialog = ({ open, onClose, data, onSave }) => {
  const [name, setName] = useState("");
  const [slotCount, setSlotCount] = useState(4);

  useEffect(() => {
    if (open && data) {
      setName(data.name || "");
      setSlotCount(data.slotCount || 4);
    }
  }, [open, data]);

  const handleSave = () => {
    onSave({ name, slotCount });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Edit Group</DialogTitle>
      <DialogContent>
        <TextField
          label="Group Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Number of Slots"
          type="number"
          value={slotCount}
          onChange={(e) =>
            setSlotCount(Math.max(1, parseInt(e.target.value) || 1))
          }
          fullWidth
          margin="normal"
          inputProps={{ min: 1, max: 16 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const EditSlotDialog = ({ open, onClose, data, onSave }) => {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open && data) {
      setName(data.name || "");
    }
  }, [open, data]);

  const handleSave = () => {
    onSave({ name });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Edit Slot</DialogTitle>
      <DialogContent>
        <TextField
          label="Slot Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          margin="normal"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const EditMatchDialog = ({ open, onClose, data, onSave }) => {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open && data) {
      setName(data.name || "");
    }
  }, [open, data]);

  const handleSave = () => {
    onSave({ name });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Edit Match</DialogTitle>
      <DialogContent>
        <TextField
          label="Match Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          margin="normal"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const BracketPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [components, dispatchComponents] = useReducer(componentsReducer, []);
  const [connections, dispatchConnections] = useReducer(connectionsReducer, []);

  const [connectionMode, setConnectionMode] = useState(null);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const [editingComponent, setEditingComponent] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState({
    group: false,
    slot: false,
    match: false,
  });

  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/api/tournaments/${id}`);
        const tournamentData = response.data || response;
        setTournament(tournamentData);

        const teams = tournamentData.teams || [];
        setParticipants(teams);

        try {
          const matchesResponse = await api.get(`/api/tournaments/${id}/matches`);
          const matchesData = matchesResponse.data || matchesResponse || [];
          const matches = Array.isArray(matchesData) ? matchesData : [];

          if (matches.length > 0) {
            console.log('Loaded matches from backend:', matches);
          }
        } catch (matchErr) {
          console.log('No matches found or error loading matches:', matchErr);
        }

      } catch (err) {
        setError(err.message || "Failed to load tournament data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const isOrganizer = React.useMemo(() => {
    if (!tournament || !currentUser) return false;
    return tournament.isOrganizer ||
           (tournament.organizer && tournament.organizer._id === currentUser._id);
  }, [tournament, currentUser]);

  const isReferee = React.useMemo(() => {
    if (!tournament || !currentUser) return false;
    return tournament.isReferee ||
           (tournament.referees && tournament.referees.some(r => r._id === currentUser._id));
  }, [tournament, currentUser]);

  const isBracketLocked = React.useMemo(() => {
    if (!tournament) return false;
    return ["BRACKET_LOCKED", "IN_PROGRESS", "COMPLETE"].includes(tournament.status);
  }, [tournament]);

  const canEditScores = isOrganizer || isReferee;
  const canEditStructure = isOrganizer && !isBracketLocked;

  const getUnplacedTeams = () => {
    const placedTeamIds = new Set();
    components.forEach((comp) => {
      if (comp.type === "group" && Array.isArray(comp.data.slots)) {
        comp.data.slots.forEach((slot) => {
          if (slot && slot.teamId) placedTeamIds.add(String(slot.teamId));
        });
      } else if (comp.type === "slot" && comp.data.teamId) {
        placedTeamIds.add(String(comp.data.teamId));
      } else if (comp.type === "match") {
        if (comp.data.teamA) placedTeamIds.add(String(comp.data.teamA));
        if (comp.data.teamB) placedTeamIds.add(String(comp.data.teamB));
      }
    });
    return participants.filter(
      (team) => !placedTeamIds.has(String(team._id || team.id))
    );
  };

  const saveToHistory = () => {
    const state = { components, connections };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  useEffect(() => {
    if (!tournament) return;
    
    const tournamentStorageId = tournament._id || id;
    const saved = localStorage.getItem(`bracket-${tournamentStorageId}`);
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const savedComponents = Array.isArray(parsed.components)
          ? parsed.components
          : [];
        const savedConnections = Array.isArray(parsed.connections)
          ? parsed.connections
          : [];
        dispatchComponents({
          type: "SET_COMPONENTS",
          payload: savedComponents,
        });
        dispatchConnections({
          type: "SET_CONNECTIONS",
          payload: savedConnections,
        });
      } catch (e) {
        console.error("Error loading saved bracket:", e);
      }
    }
  }, [tournament, id]);

  useEffect(() => {
    if (!tournament) return;

    const tournamentStorageId = tournament._id || id;
    localStorage.setItem(
      `bracket-${tournamentStorageId}`,
      JSON.stringify({
        components: Array.isArray(components) ? components : [],
        connections: Array.isArray(connections) ? connections : [],
      })
    );
  }, [components, connections, tournament, id]);

  const handleAddComponent = (type) => {
    const newId = generateId();
    const centerX = 400 - panOffset.x;
    const centerY = 300 - panOffset.y;

    const newComponent = {
      id: newId,
      type,
      position: { x: snapToGrid(centerX), y: snapToGrid(centerY) },
      data: {},
    };

    if (type === "group") {
      newComponent.data = { slotCount: 4, slots: [] };
    } else if (type === "match") {
      newComponent.data = { scoreA: 0, scoreB: 0 };
    }

    saveToHistory();
    dispatchComponents({ type: "ADD_COMPONENT", payload: newComponent });
  };

  const handleComponentDrag = (componentId, position) => {
    dispatchComponents({ type: "UPDATE_POSITION", id: componentId, position });
  };

  const handleComponentUpdate = (componentId, data) => {
    dispatchComponents({ type: "UPDATE_COMPONENT", id: componentId, updates: { data } });

    if (data && data.scoreA !== undefined && data.scoreB !== undefined) {
      const component = components.find((c) => c.id === componentId);
      if (component && component.type === "match") {
        const scoreA = Number(data.scoreA) || 0;
        const scoreB = Number(data.scoreB) || 0;
        const hasWinner = scoreA !== scoreB && data.teamA && data.teamB;

        if (hasWinner) {
          const winnerId = scoreA > scoreB ? data.teamA : data.teamB;
          const loserId = scoreA > scoreB ? data.teamB : data.teamA;

          connections.forEach((conn) => {
            if (conn.from && conn.from.componentId === componentId) {
              const targetComp = components.find(
                (c) => c.id === conn.to.componentId
              );
              if (targetComp) {
                if (conn.type === "winner" && winnerId) {
                  routeTeamToComponent(winnerId, targetComp, conn.to.pointId);
                } else if (conn.type === "loser" && loserId) {
                  routeTeamToComponent(loserId, targetComp, conn.to.pointId);
                }
              }
            }
          });
        }
      }
    }
  };

  const routeTeamToComponent = (teamId, targetComp, pointId) => {
    if (targetComp.type === "slot") {
      dispatchComponents({
        type: "UPDATE_COMPONENT",
        id: targetComp.id,
        updates: { data: { ...targetComp.data, teamId } },
      });
    } else if (targetComp.type === "match") {
      const field = pointId === "inA" ? "teamA" : "teamB";
      dispatchComponents({
        type: "UPDATE_COMPONENT",
        id: targetComp.id,
        updates: { data: { ...targetComp.data, [field]: teamId } },
      });
    }
  };

  const handleComponentDelete = (componentId) => {
    saveToHistory();

    connections.forEach((conn) => {
      if (conn.from.componentId === componentId || conn.to.componentId === componentId) {
        dispatchConnections({ type: "DELETE_CONNECTION", id: conn.id });
      }
    });

    dispatchComponents({ type: "DELETE_COMPONENT", id: componentId });
  };

  const handleConnectionPoint = (componentId, pointId, type) => {
    const connectionId = `${componentId}-${pointId}`;
    let autoConnectionType = connectionMode;
    if (!autoConnectionType) {
      if (pointId === "winner" || pointId === "out") {
        autoConnectionType = "winner";
      } else if (pointId === "loser" || pointId === "bottom") {
        autoConnectionType = "loser";
      } else {
        autoConnectionType = "normal";
      }
      setConnectionMode(autoConnectionType);
    }

    if (!selectedConnection) {
      setSelectedConnection({ componentId, pointId, connectionId, type: autoConnectionType });
    } else {
      if (selectedConnection.componentId !== componentId) {
        const newConnection = {
          id: generateId(),
          type: selectedConnection.type || autoConnectionType,
          from: {
            componentId: selectedConnection.componentId,
            pointId: selectedConnection.pointId,
          },
          to: { componentId, pointId },
        };
        saveToHistory();
        dispatchConnections({ type: "ADD_CONNECTION", payload: newConnection });
      }
      setSelectedConnection(null);
      setConnectionMode(null);
    }
  };

  const handleConnectionDelete = (connectionId) => {
    saveToHistory();
    dispatchConnections({ type: "DELETE_CONNECTION", id: connectionId });
  };

  // Edit handlers
  const handleEdit = (componentId) => {
    const component = components.find((c) => c.id === componentId);
    if (component) {
      setEditingComponent(component);
      setEditDialogOpen({
        group: component.type === "group",
        slot: component.type === "slot",
        match: component.type === "match",
      });
    }
  };

  const handleEditSave = (data) => {
    if (editingComponent) {
      saveToHistory();
      dispatchComponents({
        type: "UPDATE_COMPONENT",
        id: editingComponent.id,
        updates: { data: { ...editingComponent.data, ...data } },
      });
    }
    setEditingComponent(null);
  };

  // Undo/Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      dispatchComponents({
        type: "SET_COMPONENTS",
        payload: prevState.components,
      });
      dispatchConnections({
        type: "SET_CONNECTIONS",
        payload: prevState.connections,
      });
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      dispatchComponents({
        type: "SET_COMPONENTS",
        payload: nextState.components,
      });
      dispatchConnections({
        type: "SET_CONNECTIONS",
        payload: nextState.connections,
      });
      setHistoryIndex(historyIndex + 1);
    }
  };

  const handleZoomIn = () => setZoom(Math.min(zoom + 0.1, 2));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.1, 0.5));
  const handleResetView = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Feature: Scroll wheel zoom with passive listener for preventDefault
  const canvasContainerRef = useRef(null);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prevZoom) => Math.min(Math.max(prevZoom + delta, 0.3), 3));
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panStartOffset, setPanStartOffset] = useState({ x: 0, y: 0 });

  const handleCanvasMouseDown = (e) => {
    if (
      e.target.id === "bracket-canvas" ||
      e.target.classList.contains("canvas-background")
    ) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setPanStartOffset({ x: panOffset.x, y: panOffset.y });
      e.preventDefault();
    }
  };

  const handleCanvasMouseMove = useCallback(
    (e) => {
      if (isPanning) {
        const deltaX = e.clientX - panStart.x;
        const deltaY = e.clientY - panStart.y;
        setPanOffset({
          x: panStartOffset.x + deltaX / zoom,
          y: panStartOffset.y + deltaY / zoom,
        });
      }
    },
    [isPanning, panStart, panStartOffset, zoom]
  );

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
  };

  useEffect(() => {
    if (isPanning) {
      document.addEventListener("mousemove", handleCanvasMouseMove);
      document.addEventListener("mouseup", handleCanvasMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleCanvasMouseMove);
        document.removeEventListener("mouseup", handleCanvasMouseUp);
      };
    }
  }, [isPanning, handleCanvasMouseMove]);

  const unplacedTeams = getUnplacedTeams();

  const seedTeams = (teams) => {
    const count = teams.length;
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(count)));
    const seeded = new Array(bracketSize).fill(null);

    const seedOrder = [];
    const generateSeedOrder = (start, end, arr) => {
      if (start >= end) return;
      if (end - start === 1) {
        arr.push(start);
        return;
      }
      const mid = Math.floor((start + end) / 2);
      generateSeedOrder(start, mid, arr);
      generateSeedOrder(mid, end, arr);
    };
    generateSeedOrder(0, bracketSize, seedOrder);

    teams.forEach((team, idx) => {
      if (idx < seedOrder.length) {
        seeded[seedOrder[idx]] = team;
      }
    });

    return seeded;
  };

  const generateSingleElimination = (teams) => {
    if (teams.length < 2) {
      alert("Need at least 2 teams to generate a bracket");
      return null;
    }

    const seededTeams = seedTeams(teams);
    const bracketSize = seededTeams.length;
    const rounds = Math.ceil(Math.log2(bracketSize));

    const newComponents = [];
    const newConnections = [];

    const MATCH_WIDTH = 140;
    const MATCH_HEIGHT = 110;
    const HORIZONTAL_GAP = 80;
    const BASE_VERTICAL_GAP = 20;
    const START_X = 100;
    const START_Y = 100;

    const matchesByRound = [];

    for (let round = 0; round < rounds; round++) {
      const matchesInRound = Math.pow(2, rounds - round - 1);
      const verticalSpacing = Math.pow(2, round) * (MATCH_HEIGHT + BASE_VERTICAL_GAP);
      const verticalOffset = (Math.pow(2, round) - 1) * (MATCH_HEIGHT + BASE_VERTICAL_GAP) / 2;

      matchesByRound[round] = [];

      for (let i = 0; i < matchesInRound; i++) {
        const matchId = generateId();
        const x = snapToGrid(START_X + round * (MATCH_WIDTH + HORIZONTAL_GAP));
        const y = snapToGrid(START_Y + verticalOffset + i * verticalSpacing);

        let matchData = { name: `R${round + 1} M${i + 1}` };
        if (round === 0) {
          const teamAIndex = i * 2;
          const teamBIndex = i * 2 + 1;
          const teamA = seededTeams[teamAIndex];
          const teamB = seededTeams[teamBIndex];

          matchData = {
            ...matchData,
            teamA: teamA ? (teamA._id || teamA.id) : null,
            teamB: teamB ? (teamB._id || teamB.id) : null,
            scoreA: 0,
            scoreB: 0,
          };
        }

        newComponents.push({
          id: matchId,
          type: "match",
          position: { x, y },
          data: matchData,
        });

        matchesByRound[round].push(matchId);
      }
    }

    for (let round = 0; round < rounds - 1; round++) {
      const currentRoundMatches = matchesByRound[round];
      const nextRoundMatches = matchesByRound[round + 1];

      for (let i = 0; i < currentRoundMatches.length; i++) {
        const fromMatchId = currentRoundMatches[i];
        const toMatchIndex = Math.floor(i / 2);
        const toMatchId = nextRoundMatches[toMatchIndex];
        const inputPoint = i % 2 === 0 ? "inA" : "inB";

        newConnections.push({
          id: generateId(),
          from: { componentId: fromMatchId, pointId: "winner" },
          to: { componentId: toMatchId, pointId: inputPoint },
          type: "winner",
        });
      }
    }

    if (matchesByRound.length > 0) {
      const finalMatchId = matchesByRound[matchesByRound.length - 1][0];
      const finalMatch = newComponents.find(c => c.id === finalMatchId);
      if (finalMatch) {
        finalMatch.data.name = "Finals";
      }
    }

    if (matchesByRound.length > 1) {
      const semiRound = matchesByRound[matchesByRound.length - 2];
      semiRound.forEach((matchId, idx) => {
        const match = newComponents.find(c => c.id === matchId);
        if (match) {
          match.data.name = `Semi-Final ${idx + 1}`;
        }
      });
    }

    return { components: newComponents, connections: newConnections };
  };

  const generateDoubleElimination = (teams) => {
    if (teams.length < 2) {
      alert("Need at least 2 teams to generate a bracket");
      return null;
    }

    const seededTeams = seedTeams(teams);
    const bracketSize = seededTeams.length;
    const winnersRounds = Math.ceil(Math.log2(bracketSize));
    const losersRounds = (winnersRounds - 1) * 2;

    const newComponents = [];
    const newConnections = [];

    const MATCH_WIDTH = 140;
    const MATCH_HEIGHT = 110;
    const HORIZONTAL_GAP = 80;
    const BASE_VERTICAL_GAP = 20;
    const START_X = 100;
    const WINNERS_START_Y = 100;
    const LOSERS_START_Y = WINNERS_START_Y + Math.pow(2, winnersRounds - 1) * (MATCH_HEIGHT + BASE_VERTICAL_GAP) + 150;

    const winnerMatchesByRound = [];
    const loserMatchesByRound = [];

    for (let round = 0; round < winnersRounds; round++) {
      const matchesInRound = Math.pow(2, winnersRounds - round - 1);
      const verticalSpacing = Math.pow(2, round) * (MATCH_HEIGHT + BASE_VERTICAL_GAP);
      const verticalOffset = (Math.pow(2, round) - 1) * (MATCH_HEIGHT + BASE_VERTICAL_GAP) / 2;

      winnerMatchesByRound[round] = [];

      for (let i = 0; i < matchesInRound; i++) {
        const matchId = generateId();
        const x = snapToGrid(START_X + round * (MATCH_WIDTH + HORIZONTAL_GAP));
        const y = snapToGrid(WINNERS_START_Y + verticalOffset + i * verticalSpacing);

        let matchData = { name: `WR${round + 1} M${i + 1}` };
        if (round === 0) {
          const teamAIndex = i * 2;
          const teamBIndex = i * 2 + 1;
          const teamA = seededTeams[teamAIndex];
          const teamB = seededTeams[teamBIndex];

          matchData = {
            ...matchData,
            teamA: teamA ? (teamA._id || teamA.id) : null,
            teamB: teamB ? (teamB._id || teamB.id) : null,
            scoreA: 0,
            scoreB: 0,
          };
        }

        newComponents.push({
          id: matchId,
          type: "match",
          position: { x, y },
          data: matchData,
        });

        winnerMatchesByRound[round].push(matchId);
      }
    }

    let loserMatchCount = Math.pow(2, winnersRounds - 2);
    let currentLoserRound = 0;

    for (let wRound = 0; wRound < winnersRounds - 1; wRound++) {
      loserMatchesByRound[currentLoserRound] = [];
      const dropMatches = wRound === 0 ? Math.pow(2, winnersRounds - 2) : Math.pow(2, winnersRounds - wRound - 2);

      for (let i = 0; i < dropMatches; i++) {
        const matchId = generateId();
        const x = snapToGrid(START_X + currentLoserRound * (MATCH_WIDTH + HORIZONTAL_GAP) / 1.5);
        const y = snapToGrid(LOSERS_START_Y + i * (MATCH_HEIGHT + BASE_VERTICAL_GAP));

        newComponents.push({
          id: matchId,
          type: "match",
          position: { x, y },
          data: { name: `LR${currentLoserRound + 1} M${i + 1}` },
        });

        loserMatchesByRound[currentLoserRound].push(matchId);
      }
      currentLoserRound++;

      if (wRound < winnersRounds - 2) {
        loserMatchesByRound[currentLoserRound] = [];
        const regularMatches = Math.pow(2, winnersRounds - wRound - 3);

        for (let i = 0; i < Math.max(1, regularMatches); i++) {
          const matchId = generateId();
          const x = snapToGrid(START_X + currentLoserRound * (MATCH_WIDTH + HORIZONTAL_GAP) / 1.5);
          const y = snapToGrid(LOSERS_START_Y + i * (MATCH_HEIGHT + BASE_VERTICAL_GAP) * 2);

          newComponents.push({
            id: matchId,
            type: "match",
            position: { x, y },
            data: { name: `LR${currentLoserRound + 1} M${i + 1}` },
          });

          loserMatchesByRound[currentLoserRound].push(matchId);
        }
        currentLoserRound++;
      }
    }

    const grandFinalsId = generateId();
    const gfX = snapToGrid(START_X + winnersRounds * (MATCH_WIDTH + HORIZONTAL_GAP));
    const gfY = snapToGrid((WINNERS_START_Y + LOSERS_START_Y) / 2);

    newComponents.push({
      id: grandFinalsId,
      type: "match",
      position: { x: gfX, y: gfY },
      data: { name: "Grand Finals" },
    });

    for (let round = 0; round < winnersRounds - 1; round++) {
      const currentRoundMatches = winnerMatchesByRound[round];
      const nextRoundMatches = winnerMatchesByRound[round + 1];

      for (let i = 0; i < currentRoundMatches.length; i++) {
        const fromMatchId = currentRoundMatches[i];
        const toMatchIndex = Math.floor(i / 2);
        const toMatchId = nextRoundMatches[toMatchIndex];
        const inputPoint = i % 2 === 0 ? "inA" : "inB";

        newConnections.push({
          id: generateId(),
          from: { componentId: fromMatchId, pointId: "winner" },
          to: { componentId: toMatchId, pointId: inputPoint },
          type: "winner",
        });
      }
    }

    const winnersFinalsId = winnerMatchesByRound[winnersRounds - 1][0];
    newConnections.push({
      id: generateId(),
      from: { componentId: winnersFinalsId, pointId: "winner" },
      to: { componentId: grandFinalsId, pointId: "inA" },
      type: "winner",
    });

    const winnersFinalsMatch = newComponents.find(c => c.id === winnersFinalsId);
    if (winnersFinalsMatch) {
      winnersFinalsMatch.data.name = "Winners Finals";
    }

    return { components: newComponents, connections: newConnections };
  };

  const generateRoundRobin = (teams) => {
    if (teams.length < 2) {
      alert("Need at least 2 teams to generate a bracket");
      return null;
    }

    const newComponents = [];
    const newConnections = [];

    const matches = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({ teamA: teams[i], teamB: teams[j] });
      }
    }

    const MATCH_WIDTH = 140;
    const MATCH_HEIGHT = 110;
    const GAP = 30;
    const COLS = Math.ceil(Math.sqrt(matches.length));
    const START_X = 100;
    const START_Y = 100;

    matches.forEach((match, idx) => {
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      const x = snapToGrid(START_X + col * (MATCH_WIDTH + GAP));
      const y = snapToGrid(START_Y + row * (MATCH_HEIGHT + GAP));

      newComponents.push({
        id: generateId(),
        type: "match",
        position: { x, y },
        data: {
          name: `Match ${idx + 1}`,
          teamA: match.teamA._id || match.teamA.id,
          teamB: match.teamB._id || match.teamB.id,
          scoreA: 0,
          scoreB: 0,
        },
      });
    });

    // No connections for round robin - standings based
    return { components: newComponents, connections: newConnections };
  };

  // Main generate bracket handler
  const handleGenerateBracket = () => {
    if (!tournament || !tournament.phases || tournament.phases.length === 0) {
      alert("No bracket type configured for this tournament");
      return;
    }

    const bracketType = tournament.phases[0].bracketType;
    let result = null;

    // Confirm if there are existing components
    if (components.length > 0) {
      if (!window.confirm("This will replace the current bracket. Are you sure?")) {
        return;
      }
    }

    switch (bracketType) {
      case "SINGLE_ELIM":
        result = generateSingleElimination(participants);
        break;
      case "DOUBLE_ELIM":
        result = generateDoubleElimination(participants);
        break;
      case "ROUND_ROBIN":
        result = generateRoundRobin(participants);
        break;
      case "SWISS_STAGE":
        alert("Swiss system brackets are generated round-by-round based on standings");
        return;
      case "WILD_CARD":
        alert("Wild card format requires manual bracket setup");
        return;
      default:
        alert(`Unknown bracket type: ${bracketType}`);
        return;
    }

    if (result) {
      dispatchComponents({ type: "SET_COMPONENTS", payload: result.components });
      dispatchConnections({ type: "SET_CONNECTIONS", payload: result.connections });
      saveToHistory();
    }
  };

  // Get display name for bracket type
  const getBracketTypeName = () => {
    if (!tournament || !tournament.phases || tournament.phases.length === 0) {
      return "Unknown";
    }
    const typeMap = {
      SINGLE_ELIM: "Single Elimination",
      DOUBLE_ELIM: "Double Elimination",
      ROUND_ROBIN: "Round Robin",
      SWISS_STAGE: "Swiss System",
      WILD_CARD: "Wild Card",
    };
    return typeMap[tournament.phases[0].bracketType] || tournament.phases[0].bracketType;
  };

  // ============================================
  // END BRACKET GENERATION FUNCTIONS
  // ============================================

  // Loading state
  if (loading) {
    return (
      <Container sx={{ py: 4, textAlign: "center", color: "white" }}>
        <CircularProgress color="inherit" size={60} />
        <Typography sx={{ mt: 2 }}>Loading bracket...</Typography>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container sx={{ py: 4, color: "white" }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate(`/tournaments/${id}`)}>
          Back to Tournament
        </Button>
      </Container>
    );
  }

  // No tournament found
  if (!tournament) {
    return (
      <Container sx={{ py: 4, color: "white" }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Tournament not found
        </Alert>
        <Button variant="contained" onClick={() => navigate('/tournaments')}>
          Back to Tournaments
        </Button>
      </Container>
    );
  }

  // Read-only view for non-organizers and non-referees
  if (!isOrganizer && !isReferee) {
    return (
      <Box sx={{ mb: 6, p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(`/tournaments/${id}`)}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1">
            {tournament.name} - Bracket
          </Typography>
        </Box>
        <Box
          sx={{
            position: "relative",
            height: "70vh",
            backgroundColor: "#0f172a",
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid rgba(148, 163, 184, 0.2)",
          }}
        >
          <div
            style={{
              position: "relative",
              width: `${CANVAS_WIDTH}px`,
              height: `${CANVAS_HEIGHT}px`,
              transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: "0 0",
            }}
          >
            <div
              className="canvas-background"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${CANVAS_WIDTH}px`,
                height: `${CANVAS_HEIGHT}px`,
                backgroundImage: `
                  linear-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(148, 163, 184, 0.15) 1px, transparent 1px)
                `,
                backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                pointerEvents: "auto",
              }}
            />

            {connections.map((connection) => (
              <ConnectionLine
                key={connection.id}
                connection={connection}
                components={components}
                onDelete={handleConnectionDelete}
                deleteMode={false}
              />
            ))}

            {components.map((comp) => {
              const ComponentType = {
                group: GroupComponent,
                slot: SlotComponent,
                match: MatchComponent,
              }[comp.type];

              return ComponentType ? (
                <ComponentType
                  key={comp.id}
                  id={comp.id}
                  position={comp.position}
                  data={comp.data}
                  participants={participants}
                  deleteMode={false}
                />
              ) : null;
            })}
          </div>
        </Box>
      </Box>
    );
  }

  // Full editor view for organizers
  return (
    <DndContext
      onDragEnd={({ active, over }) => {
        if (!over) return;

        const teamId = String(active.id);
        const dropId = String(over.id);

        if (dropId.indexOf("-slot") !== -1 || dropId.indexOf("-team") !== -1) {
          const parts = dropId.split("-");
          const componentId = parts[0];
          const component = components.find((c) => c.id === componentId);

          if (component) {
            saveToHistory();

            if (component.type === "group") {
              const slotIndex = parseInt(parts[2]) || 0;
              const newSlots = Array.isArray(component.data.slots)
                ? [...component.data.slots]
                : [];
              while (newSlots.length <= slotIndex) {
                newSlots.push(null);
              }
              newSlots[slotIndex] = { teamId, score: 0 };
              handleComponentUpdate(componentId, {
                ...component.data,
                slots: newSlots,
              });
            } else if (component.type === "slot") {
              handleComponentUpdate(componentId, { ...component.data, teamId });
            } else if (component.type === "match") {
              const isTeamA = parts[1] === "teamA";
              const field = isTeamA ? "teamA" : "teamB";
              const scoreField = isTeamA ? "scoreA" : "scoreB";
              const currentData = component.data || {};
              handleComponentUpdate(componentId, {
                ...currentData,
                [field]: teamId,
                [scoreField]: currentData[scoreField] || 0,
              });
            }
          }
        }
      }}
    >
      {/* CSS to hide number input spinners */}
      <style>{hideSpinnerCSS}</style>

      <Box sx={{ mb: 6, p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate(`/tournaments/${id}`)}
              sx={{ mr: 2 }}
            >
              Back
            </Button>
            <Typography variant="h4" component="h1">
              {tournament.name} - Bracket Designer
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            mb: 3,
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {/* Structure editing buttons - only for organizers */}
          {canEditStructure && (
            <>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AutoAwesome />}
                onClick={handleGenerateBracket}
                size="small"
                disabled={participants.length < 2}
                sx={{ mr: 2 }}
              >
                Generate {getBracketTypeName()}
              </Button>

              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => handleAddComponent("group")}
                size="small"
              >
                Group
              </Button>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => handleAddComponent("slot")}
                size="small"
              >
                Slot
              </Button>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => handleAddComponent("match")}
                size="small"
              >
                Match
              </Button>

              <Button
                variant={connectionMode === "winner" ? "contained" : "outlined"}
                onClick={() => {
                  setConnectionMode(connectionMode === "winner" ? null : "winner");
                  setSelectedConnection(null);
                  setDeleteMode(false);
                }}
                size="small"
                sx={{
                  color: connectionMode === "winner" ? "white" : "#4ade80",
                  borderColor: "#4ade80",
                  backgroundColor:
                    connectionMode === "winner" ? "#4ade80" : "transparent",
                }}
              >
                🟢 Winner
              </Button>
              <Button
                variant={connectionMode === "loser" ? "contained" : "outlined"}
                onClick={() => {
                  setConnectionMode(connectionMode === "loser" ? null : "loser");
                  setSelectedConnection(null);
                  setDeleteMode(false);
                }}
                size="small"
                sx={{
                  color: connectionMode === "loser" ? "white" : "#ef4444",
                  borderColor: "#ef4444",
                  backgroundColor:
                    connectionMode === "loser" ? "#ef4444" : "transparent",
                }}
              >
                🔴 Loser
              </Button>
              <Button
                variant={connectionMode === "normal" ? "contained" : "outlined"}
                onClick={() => {
                  setConnectionMode(connectionMode === "normal" ? null : "normal");
                  setSelectedConnection(null);
                  setDeleteMode(false);
                }}
                size="small"
                sx={{
                  color: connectionMode === "normal" ? "white" : "#3b82f6",
                  borderColor: "#3b82f6",
                  backgroundColor:
                    connectionMode === "normal" ? "#3b82f6" : "transparent",
                }}
              >
                🔵 Link
              </Button>

              <Button
                variant={deleteMode ? "contained" : "outlined"}
                startIcon={<Delete />}
                onClick={() => {
                  setDeleteMode(!deleteMode);
                  setConnectionMode(null);
                  setSelectedConnection(null);
                }}
                size="small"
                color="error"
              >
                Delete {deleteMode ? "(ON)" : "(OFF)"}
              </Button>
            </>
          )}

          {/* Referee indicator */}
          {isReferee && !isOrganizer && (
            <Chip
              label="Referee Mode - Score Editing Only"
              color="warning"
              size="small"
              sx={{ ml: 1 }}
            />
          )}

          {/* Bracket locked indicator for organizer */}
          {isOrganizer && isBracketLocked && (
            <Chip
              label="Bracket Locked - Score Editing Only"
              color="info"
              size="small"
              sx={{ ml: 1 }}
            />
          )}

          <Box sx={{ ml: 2, display: "flex", gap: 1, alignItems: "center" }}>
            <IconButton size="small" onClick={handleZoomIn}>
              <ZoomIn />
            </IconButton>
            <IconButton size="small" onClick={handleZoomOut}>
              <ZoomOut />
            </IconButton>
            <IconButton size="small" onClick={handleResetView}>
              <CenterFocusStrong />
            </IconButton>
            <Tooltip title="Click and drag on empty areas to pan">
              <IconButton size="small" disabled>
                <Info sx={{ fontSize: "16px" }} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Undo/Redo - only for organizers */}
          {canEditStructure && (
            <Box sx={{ ml: 1, display: "flex", gap: 1 }}>
              <IconButton
                size="small"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
              >
                <Undo />
              </IconButton>
              <IconButton
                size="small"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
              >
                <Redo />
              </IconButton>
            </Box>
          )}

          <Chip
            icon={<Save />}
            label="Auto-saved"
            size="small"
            color="success"
            variant="outlined"
            sx={{ ml: 2 }}
          />
        </Box>

        {/* Unplaced teams - only for organizers */}
        {canEditStructure && unplacedTeams.length > 0 && (
          <Paper
            sx={{ mb: 3, p: 2, bgcolor: "background.paper" }}
            elevation={3}
          >
            <Typography
              variant="subtitle1"
              gutterBottom
              sx={{ color: "text.primary" }}
            >
              Unplaced Teams ({unplacedTeams.length})
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              Drag teams into component slots below
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 1,
              }}
            >
              {unplacedTeams.map((team) => (
                <DraggableTeam key={team._id || team.id} team={team} />
              ))}
            </Box>
          </Paper>
        )}

        <Box
          ref={canvasContainerRef}
          sx={{
            position: "relative",
            height: "70vh",
            backgroundColor: "#0f172a",
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid rgba(148, 163, 184, 0.2)",
          }}
          onMouseDown={handleCanvasMouseDown}
        >
          <div
            id="bracket-canvas"
            className="canvas-background"
            style={{
              position: "relative",
              width: `${CANVAS_WIDTH}px`,
              height: `${CANVAS_HEIGHT}px`,
              transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: "0 0",
              cursor: deleteMode
                ? "crosshair"
                : isPanning
                ? "grabbing"
                : "grab",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${CANVAS_WIDTH}px`,
                height: `${CANVAS_HEIGHT}px`,
                backgroundImage: `
                  linear-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(148, 163, 184, 0.15) 1px, transparent 1px)
                `,
                backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                pointerEvents: "none",
              }}
            />

            {connections.map((connection) => {
              // Include component positions in key to force re-render when they move
              const fromComp = components.find((c) => c.id === connection.from.componentId);
              const toComp = components.find((c) => c.id === connection.to.componentId);
              const posKey = fromComp && toComp
                ? `${fromComp.position.x}-${fromComp.position.y}-${toComp.position.x}-${toComp.position.y}`
                : '';
              return (
                <ConnectionLine
                  key={`${connection.id}-${posKey}`}
                  connection={connection}
                  components={components}
                  onDelete={handleConnectionDelete}
                  deleteMode={deleteMode}
                />
              );
            })}

            {components.map((comp) => {
              const ComponentType = {
                group: GroupComponent,
                slot: SlotComponent,
                match: MatchComponent,
              }[comp.type];

              return ComponentType ? (
                <ComponentType
                  key={comp.id}
                  id={comp.id}
                  position={comp.position}
                  data={comp.data}
                  onUpdate={handleComponentUpdate}
                  onDrag={handleComponentDrag}
                  onEdit={handleEdit}
                  onDelete={handleComponentDelete}
                  selectedForConnection={selectedConnection?.connectionId}
                  onConnectionPoint={handleConnectionPoint}
                  deleteMode={deleteMode}
                  participants={participants}
                  zoom={zoom}
                  canEditStructure={canEditStructure}
                />
              ) : null;
            })}
          </div>
        </Box>

        <EditGroupDialog
          open={editDialogOpen.group}
          onClose={() => {
            setEditDialogOpen({ group: false, slot: false, match: false });
            setEditingComponent(null);
          }}
          data={editingComponent?.data}
          onSave={handleEditSave}
        />
        <EditSlotDialog
          open={editDialogOpen.slot}
          onClose={() => {
            setEditDialogOpen({ group: false, slot: false, match: false });
            setEditingComponent(null);
          }}
          data={editingComponent?.data}
          onSave={handleEditSave}
        />
        <EditMatchDialog
          open={editDialogOpen.match}
          onClose={() => {
            setEditDialogOpen({ group: false, slot: false, match: false });
            setEditingComponent(null);
          }}
          data={editingComponent?.data}
          onSave={handleEditSave}
        />
      </Box>
    </DndContext>
  );
};

export default BracketPage;