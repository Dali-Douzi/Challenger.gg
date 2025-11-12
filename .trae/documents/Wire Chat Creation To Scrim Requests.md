## Diagnosis
- `POST /api/scrims/request/:scrimId` calls `requestScrim` and emits `scrim:request_created` (`server/controllers/scrimController.js:269–275`).
- `chatService` listens to `"scrim:request_created"` and creates a `type:"scrim"` chat, then emits `chat:created` (`server/services/chatService.js:18–26`, `50–149`, `137–143`).
- `requestScrim` immediately tries to find the chat to attach to a notification (`server/controllers/scrimController.js:277–287`) and emits a notification only to Team A (`server/controllers/scrimController.js:283–301`).
- No server listener broadcasts `chat:created` to clients or teams; clients receive no event to discover/join the new chat. The immediate lookup often returns `null` (race condition), so notifications lack a chat link.

## Plan
### Server Events
1. Add a subscriber for `chat:created` that notifies both teams.
   - Location: after IO is set and services initialized in `server/config/server.js`.
   - Behavior: resolve chat participants/teams, then `io.to(`team:${teamA}`).emit('chatCreated', { chatId, scrimId })` and similarly for `teamB`.
2. Move chat-linked notification creation to the `chat:created` subscriber.
   - Create notifications for Team A and Team B with `url: /chats/{chatId}`; emit `newNotification` to `team:{teamId}` rooms.

### Race Condition Fix
3. Remove or defer the immediate chat lookup in `requestScrim`.
   - Replace the inline chat query with relying on the `chat:created` listener to attach the chat ID in notifications.

### Optional Chat Room Signal
4. In `chatService.createScrimChat`, after emitting `chat:created`, also emit `io.to(chatId).emit('chatReady', { chatId })` so any client already joined can react.

### Client Integration
5. Listen for `chatCreated` on team sockets.
   - On event: fetch `GET /api/chats/scrim/:scrimId` or `GET /api/chats/:chatId`, update chat list, and auto-join via `joinChat`.
6. Show a toast/banner prompting users to open the chat; link to `/chats/{chatId}`.

### Verification
7. Add an integration test: calling `POST /api/scrims/request/:scrimId` results in one `Chat` created with `metadata.scrimId`, two notifications (A/B), and two socket emits (`chatCreated`).
8. Manual check: send a scrim request, observe `chatCreated` on both team rooms, open chat, send a message and see `newMessage` propagate.

This wiring ensures chat creation is reliably announced to both teams and removes the timing race that currently prevents the chat from being linked in notifications.