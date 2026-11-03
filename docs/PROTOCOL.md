# Socket event protocol

All application requests use Socket.IO's default path, /socket.io. Express serves
static files only; there are no REST authentication endpoints. C → S means client
to server; S → C means server to client. Requests accept an object and an optional
acknowledgement callback: { ok: true, ...result } or { ok: false, error: string }.
Every request except register, login and resume requires an authenticated socket.

| Event | Direction | Payload / success acknowledgement |
| --- | --- | --- |
| connection | Socket.IO → server | Built-in: registers handlers; does not authenticate. |
| connect | Socket.IO → client | Built-in: transport connected. Browser sends resume if localStorage contains a token. |
| connect_error | Socket.IO → client | Built-in Error: browser shows a connection error. |
| register | C → S | { username, password }; ack AuthResult. Username is trimmed, 1–20 Unicode characters, unique case-insensitively, without pipe or control characters. Password is 6–72 Unicode characters, without trimming. Creates account and logs in. Browser confirms password before sending. |
| login | C → S | { username, password }; ack AuthResult. Username matching ignores case and surrounding whitespace; response uses saved spelling. Wrong username/password both return "Incorrect username or password". At most 5 failed attempts per username in 5 minutes; subsequent attempts get a friendly wait error. Successful login resets failures. |
| resume | C → S | { token }; ack AuthResult, keeping the same token and expiry. Missing, invalid or expired token requires login again. Restores all persistent group room subscriptions. |
| logout | C → S | {}; ack { ok }. Deletes this session, removes presence and Socket.IO group subscriptions; account, memberships and history remain. Browser clears localStorage and returns to login. |
| kicked | S → C | { message: "Logged in from another place" }, followed by transport disconnect. New login/resume wins over the old socket. Browser clears its credential and returns to login; explicit login can reconnect. |
| users_update | S → C | string[] of currently connected account usernames, including the recipient. Sent after login/resume/logout/disconnect. |
| groups_update | S → C | Group[] of every existing group and all persistent members, with onlineMembers for presence. Sent after login/resume/create/join/leave/logout/disconnect. Metadata is visible to authenticated users; contents are restricted. |
| room_open | C → S | { target: username } for a DM, or { roomId } for existing permitted history. Ack { ok, roomId, messages: Message[] }. New DMs require an online target; existing DMs may be opened while the target is offline. Only participants or group members can get history. Clears requester's persisted unread count. |
| room_read | C → S | { roomId }; ack { ok } if supplied. Checks access, then clears persisted unread count. Browser sends this when a message arrives in its active room. |
| group_create | C → S | { name }; ack { ok, roomId }. Trimmed, unique case-insensitively, 1–60 Unicode characters, no control characters. Saves creator username; joins only creator. Other fields cannot add members. |
| group_join | C → S | { roomId }; ack { ok, roomId }. Adds requesting username and subscribes its socket. A new membership saves and delivers a kind=system join notice to members including the joiner; repeat join is idempotent. No target/member field is accepted. |
| group_leave | C → S | { roomId }; ack { ok, roomId }. Removes requesting username and socket subscription; clears unread count. Only the final member leaving deletes a group, its history and all its files from disk and registry. A leave notice is delivered after removal to remaining members. |
| message_send | C → S | { roomId, text }; ack { ok }. Trimmed text, 1–4000 UTF-16 code units. Validates access; offline DM recipients are allowed. Group messages starting with "@ai " also request an AI answer. |
| message_new | S → C | Message. DMs go only to connected participant sockets; group messages only to subscribed members. Saved before delivery, including when recipients are offline. AI group replies use sender "AI Bot" and kind "ai". File and system messages use the same private delivery path. |
| file_send | C → S | { roomId, name, type, data: ArrayBuffer }; ack { ok, message: Message }. Authenticated room members/DM participants only. Binary bytes up to 5 × 1024 × 1024, including empty files; invalid binary, name or access is rejected. Names lose path separators, control/reserved characters and trailing dots/spaces, capped at 180 characters. MIME defaults to application/octet-stream. Saves UUID-named bytes privately, then delivers kind=file using message_new. |
| file_get | C → S | { roomId, fileId }; ack { ok, file: File, data: binary }. Checks room access and the file registry owning room. Unknown, cross-room and missing files are rejected. No public upload URL exists. |
| profile_update | C → S | { avatar: null or JPEG data URL, bio: string, color: preset }; ack { ok, profile }. Bio at most 80 Unicode characters (trimmed). Avatar must start with data:image/jpeg;base64, contain canonical base64 with JPEG start/end markers, and the complete data URL must be at most 60 × 1024 UTF-8 bytes. Other MIME types are rejected. Username is never changed. |
| profiles_update | S → C | { [username]: { avatar, bio, color } }. Public profiles of all registered accounts; sent only to logged-in sockets after authentication and profile edits. Never contains passwords, tokens or unread counts. |
| typing | C → S | { roomId, typing: boolean }; ack { ok } if supplied. Checks access; excludes sender. |
| typing_update | S → C | { roomId, name, typing: boolean }. Same privacy rules as messages, excluding sender. False on message, leave, logout, disconnect; browser expires stale indicators after 2.5s. |
| ai_summarize | C → S | { roomId }; ack { ok, roomId, text }. Uses last 50 messages, returned only to requester and displayed locally. Errors for empty history, missing key, timeout, API failure or lost access. |
| disconnect | Socket.IO → both | Built-in reason string. Removes online presence and transient typing only. Memberships, sessions and histories remain. Browser hides chat and automatically resumes on reconnect. A server kick stops automatic reconnection. |

AuthResult = { ok: true, name: string, token: string, users: string[],
groups: Group[], directRooms: { roomId, target }[], unread: { [roomId]: count }, profiles: { [username]: Profile },
lastMessages: { [roomId]: Message } }.
Only this account's DM metadata, unread counts and accessible room previews are included.
Public group metadata never contains message previews for non-members.

Group = { roomId: string, name: string, creator: string, members: string[],
onlineMembers: string[] }. Members includes offline users; onlineMembers is a subset.

Message = { id: UUID string, roomId: string, sender: string, text: string,
time: ISO-8601 string, kind: "chat" | "ai" | "file" | "system", file?: File }.
File = { id: UUID string, name: string, type: MIME string, size: bytes }.
File messages use empty text and metadata only; system notices use text and a human sender.
Profile = { avatar: null | JPEG data URL, bio: string, color: preset }.
Presets: #4f46e5, #2563eb, #0f766e, #a21caf, #be123c, #b45309.
Missing legacy profiles default to initials with a username-hashed preset.

DM ids are "dm:" + [username1, username2].sort().join("|"), using JavaScript's
case-sensitive sort of canonical registered names. Group ids are "group:" +
trimmedGroupName. Pipe is reserved in usernames to prevent room id collisions.
DM histories survive disconnect, logout and restart. Group members may see existing
history when joining; non-members may not. No add-member/invite handler exists.

## Credentials and storage

Passwords use node:crypto scrypt with a random 16-byte salt and 64-byte key.
Salt and key are stored as hex; verification uses timingSafeEqual. Plain passwords
are never stored or logged. Tokens are randomBytes(32).toString('base64url'); only
a SHA-256 hash plus username and a fixed 7-day expiry is stored server-side.
Fresh credential login invalidates older tokens for that account. Resume keeps
its expiry and displaces the previous socket. The browser stores the raw token in
localStorage under campus-chat-token. Tabs share localStorage, so opening another
tab normally resumes the same account and kicks the previous tab.

DATA_FILE (default ./data/chat-data.json, relative to the working directory)
contains accounts, hashed sessions, groups, DM participant metadata, per-room
history (last 200 messages), profiles, per-account unread counts and a file registry.
Startup loads existing data and ignores expired sessions. Attachment bytes are stored
separately as described below; uploads have no public HTTP route. Mutations schedule a save after 500ms of inactivity.
Writes use a temporary file in the same directory and atomic rename. Server close,
SIGINT and SIGTERM flush pending state. A missing file starts empty; malformed or
unreadable saved data fails startup. A single server process owns a data file.

Room switching fetches history again and clears the badge. Incoming messages for
inactive rooms increment badges; persisted counts restore after reconnect/restart,
including offline delivery. Own human messages do not increment unread counts.
The server echoes own messages, avoiding duplicate optimistic messages. Typing and
local AI summaries are transient, and summaries are visible only to their requester.

Gemini uses global fetch, an x-goog-api-key header and a 20-second timeout.
Group AI replies arrive separately after human-message acknowledgement. The server
checks that the original group still exists before delivery. Summary access and
room identity are checked again after awaiting Gemini.

## Attachments and browser preferences

Socket.IO maxHttpBufferSize is 6 × 1024 × 1024 bytes, allowing a 5 MB file plus metadata.
Files are stored at <directory of DATA_FILE>/uploads/<uuid>. JSON stores a file
registry with owning room and metadata, never attachment bytes. The registry keeps
files older than the 200-message history so group deletion can remove every file.
Back up the JSON and uploads directory together. HTTP serves public/ only.
The browser creates Blob URLs from file_get acknowledgements, revokes them on logout
and membership loss, and only previews PNG/JPEG/GIF/WebP; other types download.

Profile photos are centre-cropped in a browser canvas to 128 × 128 JPEG before
profile_update. Photos are public to logged-in accounts. Account accents apply to
primary controls, own bubbles, selections and badges; all presets meet 4.5:1 with white.
Theme choice (light/dark/system) stays in localStorage under campus-chat-theme;
campus-chat-accent caches the own accent for first paint. Neither preference sends
chat data over HTTP. System mode follows prefers-color-scheme live. Typing, local
AI summaries and Blob URLs are transient.
