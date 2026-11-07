# 08 — Text channels, @mentions, unsend, reply, unified AI menu, typing indicator

You are working in a Node.js CommonJS + Express + Socket.IO v4 chat app (WongChat / CN Chat),
a university Computer Network socket-programming term project. Plain HTML/CSS/JS frontend,
no build step, no new npm dependencies.

Before changing anything read: AGENTS.md, README.md, docs/PROTOCOL.md, server.js,
public/client.js, public/index.html, public/style.css, test/smoke.js, test/delete-clear.js.

## Hard rules
- All chat traffic stays on Socket.IO events (no new REST endpoints).
- Keep account/session, DM/group membership and private attachment authorization checks intact.
  Every new event must check authentication and room access on the server.
- User content and AI output must stay text: use textContent / DOM nodes, never innerHTML with user data.
- Existing JSON data files must still load (legacy groups without channels, messages without
  reply/deleted fields). No destructive migration.
- Do not touch .env, do not deploy, do not git commit or push, do not upgrade packages.
- Keep the existing R3–R11 behaviour and existing tests passing.
- Bump the asset version query strings in public/index.html (style.css?v=8, client.js?v=8 → v=9).

## Features

### 1. Text channels inside groups (Discord-like)
- Each group has channels. The existing group roomId ("group:<name>") IS its #general channel,
  so existing history becomes #general without migration.
- Extra channels get ids "channel:<uuid>" and store { roomId, groupId, name, creator, createdAt }.
- Channel name: trimmed, lowercased, spaces → "-", 1–30 chars, Unicode letters/digits/-/_ only,
  unique per group; "general" reserved.
- Any member of the group may create a channel (`channel_create { groupId, name }` → ack { ok, roomId }).
- Only the group creator may delete a non-general channel (`channel_delete { roomId }` → ack { ok }).
  Deleting removes its history, readState, unread counts and attachment files (disk + registry).
- Access to a channel = membership of its parent group. Non-members must not open, read,
  send, type, upload, fetch files, summarize or see channel names.
- Socket subscriptions: when a socket logs in/resumes or joins a group it joins all channel
  rooms of that group; leaving a group leaves them all; creating a channel subscribes the
  online members' sockets; deleting unsubscribes.
- groups_update must stay compatible (roomId, name, creator, members, onlineMembers) and add
  `channels: [{ roomId, name }]` ONLY for groups the recipient is a member of (emit per socket).
- Last member leaving a group deletes the group and all its channels, histories and files.
- Unread counts are per channel; the rail icon of a group shows the sum.
- Client: channel list in the channel panel ("TEXT CHANNELS" with # name), a "+" to create,
  delete option for the group creator, header shows "# channel" and group name.
  Replace the fake static "# general" button.

### 2. @mentions
- In the composer, typing "@" opens an autocomplete popup with candidates: in a group channel
  the group members + "ai"; in a DM the other participant + "ai". Filter by typed prefix,
  ↑/↓ to move, Enter/Tab to pick, Esc to close, click to pick. Usernames may contain spaces.
- Rendering: "@name" tokens that match a real candidate (case-insensitive, longest match) and
  "@ai" render as coloured mention chips (span with textContent). A mention of the current user
  uses a stronger chip and highlights the whole message row (left accent bar + tinted background,
  works in light and dark themes).
- If an unread room received a message mentioning me, its badge shows "@" styling (client-side).
- @ai should also work in DMs (AI reply visible to both DM participants), not just groups.

### 3. Unsend (delete own message)
- `message_unsend { roomId, messageId }` → ack { ok }. Only the original human sender, only kind
  "chat" or "file", any time. Server keeps the message id/sender/time but sets `deleted: true`,
  clears text, removes the attachment bytes + registry entry, and delivers
  `message_update` (the updated Message) through the same private delivery path.
- Everyone sees an italic "Message unsent" placeholder. Room previews (lastMessages) update.
- Replies that quote an unsent message show "Original message was unsent".

### 4. Reply
- message_send (and file_send) accept optional `replyTo: messageId`; it must exist in the same
  room's retained history and not be deleted. Server stores `reply: { id, sender, text (≤120 chars
  excerpt, or file name), kind }` on the new message. On unsend, update reply snapshots in that
  room to deleted.
- Composer shows a "Replying to <name> ✕" bar; Esc cancels. Rendered messages show a compact
  quote line above the text; clicking scrolls to and briefly highlights the original if loaded.

### 5. Message hover action bar
- Desktop: hovering/focusing a message row shows a small floating toolbar (top-right):
  Reply, Copy text, Unsend (own messages only, with confirm). Keyboard accessible.
- Touch/mobile: a long-press (or a visible "⋯" on tap) opens the same actions as a sheet/menu.

### 6. Unified AI entry point
- Remove duplicated AI controls: the header Summarize button and the sidebar "AI TOOLS / Summarize chat".
- Keep one ✨ button in the composer that opens a small menu: "Summarize this chat (only you see it)"
  and "Ask AI (@ai)" which inserts "@ai " in the composer. Works in DMs and channels.

### 7. Typing indicator
- Do NOT reserve an empty line. The indicator appears only while someone is typing, as a small
  bar inserted directly above the composer (smooth, no jump of the message list; respect
  prefers-reduced-motion).
- Must work in group channels as well as DMs (check the server typing path for channels).
- Multiple typers: "A is typing…", "A and B are typing…", "A, B and C are typing…",
  "Several people are typing…" (4+), with the animated dots.

## Design
Keep the existing Discord-style layout, tokens, IBM Plex Sans Thai, light/dark themes, accents,
mobile breakpoints and safe-area handling. New UI must look native to the current design,
meet WCAG AA contrast, have visible focus states, and work at 375 px width.

## Docs and tests
- Update docs/PROTOCOL.md (new events/fields) and README.md (features + requirement map).
- Add socket tests (e.g. test/features.js, wired into `npm test`) covering: channel create/delete
  permissions, non-member denial for channels, per-channel delivery isolation, legacy group
  still works as #general, unsend by sender only + file removal + message_update delivery,
  reply validation (other-room / deleted ids rejected), @ai in DM path (with empty API key → friendly error),
  group typing_update delivery excluding sender.
- Finish by running: `npm test`, `node --check server.js`, `node --check public/client.js`.
  Report results and a concise summary of changed files.
