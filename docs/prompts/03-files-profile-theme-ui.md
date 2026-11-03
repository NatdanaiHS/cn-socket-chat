You are extending an existing Node.js + Socket.IO chat app (Computer Network term project). Read every file first
(`server.js`, `public/*`, `test/smoke.js`, `docs/PROTOCOL.md`, `README.md`). Keep the style (CommonJS, plain HTML/CSS/JS,
no build step, no frameworks, no new npm dependencies, beginner-readable comments). All client↔server chat/data traffic stays on
Socket.IO events (the only HTTP is serving static files). Every existing feature and privacy rule must keep working
(R3–R11, accounts/sessions, persistence, Gemini summarize + @ai, typing indicator, unread badges). `npm test` must pass.

## 1. File & image sharing over sockets (new special point)
- A 📎 button in the chat box picks a file (any type) — max 5 MB. Images (png/jpeg/gif/webp) show as an inline thumbnail in the
  chat window (click → full-size lightbox with a download button); other files show as a file card (icon, name, size, Download).
- Upload: the client sends the file as binary (ArrayBuffer) in a Socket.IO event `file_send { roomId, name, type, data }`.
  Raise the server `maxHttpBufferSize` to 6 MB. Server checks room access exactly like `message_send` (R7/R11 privacy),
  validates size, sanitizes the file name, stores bytes at `<dir of DATA_FILE>/uploads/<uuid>` (not in the JSON), and saves a
  chat message `{ kind: 'file', file: { id, name, type, size } }` in the room history, delivered with the normal `message_new` rules.
- Download: client emits `file_get { roomId, fileId }`; server checks access to that room AND that the file belongs to that room,
  then returns the bytes in the ack; client shows it via a Blob URL. Never serve uploads over a public HTTP path.
- Show an upload progress state ("Sending…") and a friendly error for too-large files. Drag-and-drop a file onto the chat window
  and pasting an image (Ctrl+V) also send it.
- When a group is deleted, delete its files from disk too.

## 2. Profiles
- Each account has a profile: display avatar (either an uploaded image, resized client-side with <canvas> to 128×128 JPEG,
  sent as a data URL ≤ 60 KB, or default = initials on a colour chosen from the username hash), a short status/bio (≤ 80 chars),
  and a favourite accent colour (one of 6 presets). Username stays the unique identity (R3) and cannot be changed.
- "Edit profile" opens a modal from the sidebar identity card (avatar preview, upload/remove photo, bio, accent colour, Save).
  Events: `profile_update` (validated server-side: data URL must be `data:image/jpeg;base64,` and ≤ 60 KB) and the server
  broadcasts updated public profiles (`profiles_update { username: { avatar, bio, color } }`) to everyone logged in.
- Avatars appear in: online user list, group member list (small stacked avatars), DM room header, and next to other people's
  messages. Clicking a user's avatar/name opens a profile card (avatar, username, bio, online/offline, "Message" button).
- Persist profiles in the existing JSON data file.

## 3. Theme
- Light, Dark and System themes, toggle in the sidebar footer (sun/moon/monitor segmented control), stored in localStorage and
  applied before first paint (tiny inline script in <head>) so there is no flash. Implement with CSS custom properties on `:root`
  and `[data-theme="dark"]`; every colour in style.css must come from tokens. The user's accent colour from their profile sets
  `--accent` (own message bubbles, primary buttons, selection, badges) — ensure white text stays readable on every accent preset
  in both themes (WCAG AA contrast).

## 4. UX/UI polish (make it look like a modern, polished chat product — think Linear/Telegram-level care)
- Typography: Inter from Google Fonts with system fallback; consistent spacing scale (4/8/12/16/24/32); subtle borders and shadows.
- Sidebar: search box that filters users and groups; sections "Online", "Direct messages" (history, incl. offline people) and "Groups";
  each row shows avatar, name, last message preview + relative time, unread badge; online dot on avatars.
- Group rows: member count + stacked avatars, Join/Leave as clear buttons; group header shows members (click → member list popover
  with online status). Creating a group uses a small inline form with validation feedback.
- Chat window: date separators ("Today", "Yesterday", date); consecutive messages from the same sender are grouped (avatar + name only
  on the first); timestamps on hover; own messages right in accent colour; AI messages with a distinct ✨ style; system notices
  (e.g. "Bob joined the group") centred and muted — emit these from the server on join/leave as `kind: 'system'` messages.
- Auto-scroll to bottom on new messages only if the user is already near the bottom; otherwise show a "↓ New messages" pill.
- Composer: auto-growing textarea (Enter = send, Shift+Enter = newline), 📎 attach, emoji picker button with ~40 common emojis
  (no library), Send button. Disabled states clearly visible.
- Typing indicator as an animated three-dot bubble with names.
- Empty states with friendly illustration-like emoji and a hint; loading skeleton while a room's history loads.
- Toast notifications (bottom-right) for errors and events like "Profile saved"; replace raw error paragraphs.
- Login screen: split layout on desktop (left: brand panel with gradient + short feature list "Private chats • Groups • AI summary •
  File sharing"; right: form); show/hide password toggle; inline validation; theme respected.
- Responsive: on ≤ 768 px, the sidebar and the chat are separate screens (list → tap → room, with a back button in the room header).
  No horizontal scroll at 360 px. Touch targets ≥ 40 px.
- Accessibility: keyboard navigable, visible focus rings, aria-labels on icon buttons, `prefers-reduced-motion` respected,
  user text always via textContent (never innerHTML with user data).
- Browser tab title shows the total unread count, e.g. "(3) Campus Chat".

## 5. Tests & docs
Extend `test/smoke.js`: a group member can send and fetch a file; a non-member and a third user cannot `file_get` it (and do not receive
the message); a DM file is only visible to the two participants; oversized file rejected; `file_get` with a fileId from another room rejected;
profile_update validation (rejects non-JPEG data URL and >60 KB) and profiles broadcast; system join/leave messages appear for members.
Update `docs/PROTOCOL.md` (all new events) and `README.md` (features list incl. special points: AI, cloud deployment, accounts +
persistence, file sharing, profiles + themes, typing/unread). Keep `.gitignore` excluding `data/`.

When done, run `npm test` and `node --check` on client files, and print a short summary.
