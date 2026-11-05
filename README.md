# WongChat — Simple Chat Application

A university Computer Network term project built with Node.js 20+, CommonJS,
Express static hosting, and Socket.IO v4. The browser uses plain HTML, CSS and
JavaScript with no build step. All chat and authentication traffic uses Socket.IO
events. Accounts, sessions, groups and message history persist in a local JSON file.

## Run locally

1. Install Node.js 20 or newer.
2. Run npm install in this directory.
3. Copy .env.example to .env (PowerShell: Copy-Item .env.example .env).
4. Optionally fill in GEMINI_API_KEY. Leave it blank to use chat without AI.
5. Run npm start.
6. Open http://localhost:3000 in two browser profiles and create different accounts.

For two computers, run the server on one computer. Open http://localhost:3000
on that host, and http://SERVER_LAN_IP:3000 on the second computer on the same
network. localhost always refers to the computer opening the browser, so both
computers cannot use localhost to reach a single host. Allow inbound TCP 3000
in the host firewall for this LAN demo if needed.

| Environment variable | Default when empty/unset |
| --- | --- |
| PORT | 3000 |
| HOST | 0.0.0.0 |
| DATA_FILE | ./data/chat-data.json (relative to working directory) |
| GEMINI_API_KEY | Empty; AI gives a friendly unavailable error |
| GEMINI_MODEL | gemini-3.5-flash |
| GEMINI_FALLBACK_MODEL | gemini-flash-lite-latest (used when the main model is busy) |

Keep .env private; it is ignored by Git. The API key is only used on the server,
never logged, placed in a URL, or sent to a browser.

## Demo and requirement map

Create accounts Alice, Bob, and Carol in separate browser profiles or computers. Click Bob from Alice's user list,
send a private message, and check Carol sees nothing. Create Study: Alice is its
only member. Bob clicks Join; Carol can see membership but cannot open Study until
joining. Send group messages, switch rooms to see histories and unread badges,
then leave or disconnect to observe live list updates. Offline members remain in
the group, marked offline; Online users includes only connected accounts.

| Requirement | Implementation references |
| --- | --- |
| R3 unique names | server.js: register handler validates trimmed username, length and case-insensitive uniqueness; public/client.js: login-form handler shows rejection on login screen. |
| R4 live users | server.js: userList, broadcastLists, login/disconnect handlers; public/client.js: users_update and renderLists mark own name "(you)". |
| R5 separate rooms | server.js: room_open, directRooms, groups, histories; public/client.js: dmId, openRoom, histories. |
| R6 window and chat box | public/index.html: messages, message-form; public/client.js: renderMessages and message-form handler; public/style.css: message/own/composer layouts. |
| R7 private delivery | server.js: message_send, requireRoom, canAccess, deliver; target validated by room_open, DM uses only participant socket ids. |
| R8 group creation | server.js: group_create; creates a Set containing only creator username. |
| R9 group/member lists | server.js: groupList, broadcastLists; public/client.js: groups_update, renderLists. |
| R10 self join/leave | server.js: group_join/group_leave accept only roomId; public/client.js: renderLists Join/Leave buttons; no invite/add-member handler. |
| R11 member-only messages | server.js: canAccess, message_send, deliver, socket.join/socket.leave; group delivery uses io.to(roomId).emit. |
| Disconnect cleanup | server.js: removePresence; removes online presence/typing and broadcasts lists; keeps account memberships and histories. |

The registered socket handlers are intentionally explicit and commented in English.
A Socket.IO connection creates a transport session; authenticated login/resume
associates an account username with its socket id. Joining a group subscribes that socket to its room. Emitting a
message delivers an event to the chosen socket ids or group. Acknowledgements
return success or validation errors. Disconnect removes online presence while preserving account data.
See [docs/PROTOCOL.md](docs/PROTOCOL.md) for every event and payload.

## Special points and product features

- **AI:** Gemini summarizes the open room privately for the requester. In a group,
  send @ai Explain TCP for a reply visible only to members. Missing keys, timeouts
  and upstream errors produce friendly messages.
- **File sharing:** send any file up to 5 MB using 📎, drag-and-drop or image paste.
  PNG/JPEG/GIF/WebP have thumbnails and a full-size lightbox with Download; other
  files have name/size/download cards. Binary uploads and authorized downloads
  use Socket.IO only; uploads never have public HTTP URLs.
- **Accounts and persistence:** scrypt passwords, hashed seven-day sessions, saved
  memberships, history, unread counts, profiles and private attachment metadata.
- **Profiles and themes:** edit a 128×128 JPEG avatar, 80-character bio and one of
  six accent colours. Profile cards show presence and a Message action. Light,
  Dark and System themes apply before first paint and persist in localStorage.
  All six accents meet WCAG AA contrast with white text.
- **Typing and unread:** private typing indicators expire if a stop event is lost.
  Saved unread badges and the browser tab total update as conversations are read.
- **Chat UI:** Discord-style layout with WongChat’s own W identity: a 72 px joined-group rail, 240 px DM/channel panel with user settings, left-aligned message rows, and a toggleable 240 px member/profile column. Compact follow-ups, date and unread dividers, read receipts, search, emoji, AI tools and private attachments remain available. Below 1024 px the right panel opens as a drawer; below 768 px the 64 px rail and conversation list lead to a full-screen chat with browser Back support. The composer and reserved typing line follow the mobile visual viewport and safe area. Light, dark and system themes use IBM Plex Sans Thai and respect reduced motion.
- **Cloud deployment:** systemd and Caddy templates support a single persistent
  Node.js service, HTTPS and Socket.IO upgrades. Deployment remains an
  administrator operation; these templates do not deploy the app.
- User text and AI output use textContent, so HTML is displayed as plain text.

## Accounts and persistence

Choose Log in or Create account. Registration needs a username, password and matching
confirmation. Usernames are trimmed, 1–20 Unicode characters, unique ignoring case,
and cannot contain | or control characters. Passwords are 6–72 Unicode characters;
they are not trimmed. No additional npm dependencies are needed. The server stores
only a scrypt hash (64-byte key with a random 16-byte salt per account), verified
with timingSafeEqual. Wrong username and wrong password share a generic error.
After 5 failed logins for one username within 5 minutes, wait before trying again.
This basic attempt limit is in memory and resets on server restart.

Successful registration/login returns a random 32-byte session token. The browser
keeps it in localStorage and resumes automatically after refresh or reconnect.
The server stores only its SHA-256 hash and a fixed 7-day expiry. Log out deletes
that session and clears the browser token. A fresh credential login invalidates
older tokens. Login/resume from another place kicks the old socket with
"Logged in from another place"; only one socket per account is online at a time.
Tabs in the same browser profile share localStorage, so a new tab resumes the same
account and kicks the previous tab. For a multi-user demo, use separate browser
profiles, different browsers or different computers.

DATA_FILE selects the JSON file; its default is ./data/chat-data.json. The server
creates its parent directory, loads existing data at startup, and saves after about
500ms of inactivity using a temporary file plus atomic rename. SIGINT/SIGTERM and
normal server close flush pending state. An abrupt crash can lose changes still in
the debounce window. Malformed/unreadable saved data stops startup rather than
silently replacing it. Use one server process per file. Back up this file to keep
accounts and chat history; data/ is ignored by Git. Plain passwords and raw session
tokens are never written to the file or logged.

Groups save their creator and member usernames. Disconnect, logout and restart keep
membership; login/resume subscribes the new socket to all joined groups. Click Leave
to remove membership; only the last member leaving deletes a group, its history and files.
A newly joined member can read existing group history. Member lists show all names
and mark who is online. Online users lists only currently connected accounts,
including yourself.

DM ids use the two account usernames, and histories survive offline periods and
restarts. Start a new DM with an online user. Existing conversations remain available
when the other person is offline, in the Direct messages sidebar section
and an "(offline)" header. Sending while they are offline stores the message; they
see an unread badge next login. History is capped at 200 messages per room. Unread
counts persist and clear when a room is opened/read; typing and local AI summaries
are transient. No database server is required. File bytes live next to DATA_FILE in uploads/<uuid>;
back up that directory with the JSON. The file registry keeps attachment metadata
beyond history pruning. Last-member group deletion removes every attachment for
that group; DM files remain private to the two participants.

## Tests

Run npm test. Check browser JavaScript syntax with node --check public/client.js. test/smoke.js uses node:assert and socket.io-client, starts an
isolated server on a random loopback port, and closes every socket/server on exit.
It checks R3–R11, forbidden DM/group/history/typing access, self-only membership,
history limits, self leave, registration/duplicate names, password rejection,
resume/logout, second-login kicks, brute-force limits, offline delivery/unread counts,
persistent membership, reload in a new server instance, and hash-only saved credentials.
It also checks binary file send/fetch, outsider rejection, cross-room IDs, size limits,
non-public upload paths, profile validation/broadcast, join/leave notices, attachment
and profile persistence, history pruning and group-file cleanup.
It also checks binary file round trips, non-member/third-user denial and delivery
privacy, oversized and malformed uploads, cross-room file ids, public HTTP denial,
file persistence past history pruning, disk cleanup on group deletion, profile
validation/broadcast/persistence, immutable usernames, and member-only join/leave
notices. Existing accounts without profile/file fields load with defaults.
Each run uses and removes a temporary DATA_FILE under the OS temp directory. Tests force
an empty API key so Gemini is never contacted. Exit code 0 means all checks passed.

## Reverse proxy deployment files

deploy/cn-chat.service expects Node at /usr/bin/node, code in /opt/cn-chat,
a dedicated non-root user/group cnchat, and /etc/cn-chat.env. Install runtime
dependencies with npm install --omit=dev after copying package.json. Once a lockfile
is generated and committed, use npm ci --omit=dev for repeatable deployments.
Create /etc/cn-chat.env with GEMINI_API_KEY and optional GEMINI_MODEL; restrict
the file to the service administrator. HOST=127.0.0.1 and PORT=3100 are set in the
unit. DATA_FILE=/var/lib/cn-chat/chat-data.json and StateDirectory=cn-chat give the
service a persistent writable directory owned by cnchat. EnvironmentFile values
override unit Environment values, so keep HOST/PORT/DATA_FILE out of that file
unless intentionally changing them.

deploy/Caddyfile.snippet configures chat.natdanaihs.com to reverse proxy
127.0.0.1:3100, including Socket.IO upgrades on its default path. DNS, TLS,
service installation and production deployment are separate administrator tasks.

The UI uses IBM Plex Sans Thai with system fallbacks. All chat, profile and attachment data travels through Socket.IO. No build step or new npm dependencies are needed. Enter sends and Shift+Enter adds a line. Unread totals appear in the tab title.
