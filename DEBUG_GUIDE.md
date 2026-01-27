# Chat Debug Guide

## Overview
Comprehensive debugging has been added to trace the entire chat creation flow from scrim request to chat display.

## Debugging Points

### 1. EventService (server/services/eventService.js)
**Lines 14-19**: Enhanced event logging
- Logs every event emitted with full data
- Shows listener count for each event
- Format: `📢 [EventService] ========== EVENT EMITTED ==========`

### 2. ChatService (server/services/chatService.js)

#### Constructor (Lines 11-14)
- `🚀 [ChatService] Constructor called - initializing service`
- `🚀 [ChatService] Constructor complete`

#### Event Listener Setup (Line 76)
- `✅ ChatService event listeners initialized`

#### Scrim Request Event Handler (Lines 21-32)
- `📨 [CHAT-SERVICE] ========== SCRIM REQUEST EVENT RECEIVED ==========`
- Shows event data in JSON format
- `📨 [CHAT-SERVICE] Creating chat for scrim: {scrimId}`
- `✅ [CHAT-SERVICE] Chat created successfully: {chatId}`
- `❌ [CHAT-SERVICE] Error creating scrim chat:` (if error)

#### createScrimChat Function (Lines 81-87)
- `📨 [createScrimChat] Starting chat creation for scrim: {scrimId}`
- `📨 [createScrimChat] Teams - Host: {teamA}, Challenger: {teamB}`
- `💬 [createScrimChat] Scrim chat already exists: {chatId}` (if exists)
- `📨 [createScrimChat] No existing chat found, creating new one...` (if new)

### 3. ScrimController (server/controllers/scrimController.js)

#### Request Scrim (Lines 391-399)
- `📨 [SCRIM-CONTROLLER] Emitting scrim request event:`
- Shows event data in JSON format

### 4. ChatController (server/controllers/chatController.js)

#### getChatByScrimId (Lines 103-147)
- `🔍 [getChatByScrimId] ========== GET CHAT REQUEST ==========`
- `🔍 [getChatByScrimId] Request params - scrimId: {scrimId}`
- `🔍 [getChatByScrimId] Request userId: {userId}`
- `🔍 [getChatByScrimId] Querying for chat with:` (shows query)
- `🔍 [getChatByScrimId] Query result - chat found: {boolean}`
- If found: Shows chat details (chatId, type, participants, metadata)
- If not found: Shows all scrim chats in database for comparison
- `🔍 [getChatByScrimId] User is participant: {boolean}`
- `✅ [getChatByScrimId] Returning chat successfully`
- `❌ [getChatByScrimId] Error:` (if error)

## Testing Flow

### 1. Start Backend
```bash
cd server
npm run dev
```

**Expected startup logs:**
```
✅ Socket.IO instance set in EventService
🚀 [ChatService] Constructor called - initializing service
✅ ChatService event listeners initialized
🚀 [ChatService] Constructor complete
✅ ChatService initialized
```

### 2. Create Scrim Request
When User 2 requests User 1's scrim:

**Expected backend logs:**
```
📨 [SCRIM-CONTROLLER] Emitting scrim request event:
{
  "scrimId": "...",
  "teamA": "...",
  "teamB": "...",
  "game": "..."
}

📢 [EventService] ========== EVENT EMITTED ==========
📢 [EventService] Event name: scrim:request_created
📢 [EventService] Event data: {...}
📢 [EventService] Listener count for "scrim:request_created": 1

📨 [CHAT-SERVICE] ========== SCRIM REQUEST EVENT RECEIVED ==========
📨 [CHAT-SERVICE] Event data: {...}
📨 [CHAT-SERVICE] Creating chat for scrim: ...

📨 [createScrimChat] Starting chat creation for scrim: ...
📨 [createScrimChat] Teams - Host: ..., Challenger: ...
📨 [createScrimChat] No existing chat found, creating new one...
👥 Creating chat with X participants
💬 Created scrim chat ... for scrim ...

✅ [CHAT-SERVICE] Chat created successfully: ...
```

### 3. Open Chat in Frontend
When frontend calls `GET /api/chats/scrim/{scrimId}`:

**Expected backend logs:**
```
🔍 [getChatByScrimId] ========== GET CHAT REQUEST ==========
🔍 [getChatByScrimId] Request params - scrimId: ...
🔍 [getChatByScrimId] Request userId: ...
🔍 [getChatByScrimId] Querying for chat with: { type: "scrim", "metadata.scrimId": "..." }
🔍 [getChatByScrimId] Query result - chat found: true
🔍 [getChatByScrimId] Chat details: {
  "chatId": "...",
  "type": "scrim",
  "participants": [...],
  "metadata": {...}
}
🔍 [getChatByScrimId] User is participant: true
✅ [getChatByScrimId] Returning chat successfully
```

## Common Issues & What to Look For

### Issue 1: Event Not Received
**Symptom:** See `📨 [SCRIM-CONTROLLER]` but not `📨 [CHAT-SERVICE]`
**Cause:** Event listener not registered
**Look for:** `✅ ChatService event listeners initialized` on startup

### Issue 2: Chat Not Found
**Symptom:** `❌ [getChatByScrimId] No chat found in database`
**Cause:** Chat wasn't created or scrimId mismatch
**Look for:** Compare the scrimId in request vs. the list of all scrim chats shown in logs

### Issue 3: Wrong ScrimId Format
**Symptom:** Chat exists but query doesn't find it
**Cause:** ObjectId vs String mismatch
**Look for:** In `All scrim chats in DB` log, compare scrimId format

### Issue 4: User Not Participant
**Symptom:** `🔍 [getChatByScrimId] User is participant: false`
**Cause:** User not added to participants array
**Look for:** Check participants list in chat details

## Next Steps After Getting Logs

1. **Copy the entire console output** from backend startup through the error
2. **Look for gaps** in the expected flow above
3. **Compare scrimId values** - are they the same format throughout?
4. **Check listener count** - should be 1 for `scrim:request_created`
5. **Verify chat creation** - does `Chat created successfully` appear?
6. **Check database query** - does it find the chat?
