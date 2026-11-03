# Campus Chat — Simple Chat Application

A university Computer Network term project built with Node.js 20+, CommonJS,
Express static hosting, and Socket.IO v4. The browser uses plain HTML, CSS and
JavaScript with no build step. All chat traffic uses Socket.IO events. State is
in memory and disappears when the server restarts.

## Run locally

1. Install Node.js 20 or newer.
2. Run npm install in this directory.
3. Copy .env.example to .env (PowerShell: Copy-Item .env.example .env).
4. Optionally fill in GEMINI_API_KEY. Leave it blank to use chat without AI.
5. Run npm start.
6. Open http://localhost:3000 in two browser tabs with different names.

For two computers, run the server on one computer. Open http://localhost:3000
on that host, and http://SERVER_LAN_IP:3000 on the second computer on the same
network. localhost always refers to the computer opening the browser, so both
computers cannot use localhost to reach a single host. Allow inbound TCP 3000
in the host firewall for this LAN demo if needed.

| Environment variable | Default when empty/unset |
| --- | --- |
| PORT | 3000 |
| HOST | 0.0.0.0 |
| GEMINI_API_KEY | Empty; AI gives a friendly unavailable error |
| GEMINI_MODEL | gemini-3.5-flash |
| GEMINI_FALLBACK_MODEL | gemini-flash-lite-latest (used when the main model is busy) |

Keep .env private; it is ignored by Git. The API key is only used on the server,
never logged, placed in a URL, or sent to a browser.

## Demo and requirement map

Log in as Alice, Bob, and Carol in three tabs. Click Bob from Alice's user list,
send a private message, and check Carol sees nothing. Create Study: Alice is its
only member. Bob clicks Join; Carol can see membership but cannot open Study until
joining. Send group messages, switch rooms to see histories and unread badges,
then leave or disconnect to observe live list updates.

| Requirement | Implementation references |
| --- | --- |
| R3 unique names | server.js: login handler validates trimmed name, length and case-insensitive uniqueness; public/client.js: login-form handler shows rejection on login screen. |
| R4 live users | server.js: userList, broadcastLists, login/disconnect handlers; public/client.js: users_update and renderLists mark own name "(you)". |
| R5 separate rooms | server.js: room_open, directRooms, groups, histories; public/client.js: dmId, openRoom, histories. |
| R6 window and chat box | public/index.html: messages, message-form; public/client.js: renderMessages and message-form handler; public/style.css: message/own/composer layouts. |
| R7 private delivery | server.js: message_send, requireRoom, canAccess, deliver; target validated by room_open, DM uses only participant socket ids. |
| R8 group creation | server.js: group_create; creates a Set containing only creator socket id. |
| R9 group/member lists | server.js: groupList, broadcastLists; public/client.js: groups_update, renderLists. |
| R10 self join/leave | server.js: group_join/group_leave accept only roomId; public/client.js: renderLists Join/Leave buttons; no invite/add-member handler. |
| R11 member-only messages | server.js: canAccess, message_send, deliver, socket.join/socket.leave; group delivery uses io.to(roomId).emit. |
| Disconnect cleanup | server.js: disconnect; removes user from every group, deletes empty groups and affected DMs, broadcasts lists. |

The registered socket handlers are intentionally explicit and commented in English.
A Socket.IO connection creates a transport session; login associates a name with
its socket id. Joining a group subscribes that socket to its room. Emitting a
message delivers an event to the chosen socket ids or group. Acknowledgements
return success or validation errors. Disconnect releases the temporary identity.
See [docs/PROTOCOL.md](docs/PROTOCOL.md) for every event and payload.

## Bonus features

- Summarize in any open room sends ai_summarize. Gemini summarizes the last 50
  messages and returns a local AI message only to the requester.
- In a joined group, send @ai Explain TCP to ask Gemini. AI Bot replies only to
  that group. No configured key, failed requests and the 20-second timeout produce
  friendly errors. No external AI request is made without a configured key.
- Typing indicators follow the same access and delivery rules as messages and
  exclude the sender. Indicators expire if a stop event is lost.
- Unread badges count messages received while a room is closed. The server stores
  the last 200 messages per room and checks access before sending history.
- Responsive layout supports narrow phone screens. User-supplied text is rendered
  with textContent, including AI output; HTML in messages is displayed as text.

Names are temporary identities, not authenticated accounts. To keep a later visitor
from inheriting someone else's private history, DMs are deleted when either party
disconnects. Groups persist while at least one member remains online. A newly
joined member can read the group's existing history. Refresh/reconnection returns
to login and resets local unread counts. No database, file uploads, or offline
delivery is implemented.

## Tests

Run npm test. test/smoke.js uses node:assert and socket.io-client, starts an
isolated server on a random loopback port, and closes every socket/server on exit.
It checks R3–R11, forbidden DM/group/history/typing access, self-only membership,
history length, leave/disconnect cleanup, and missing-key AI behavior. Tests force
an empty API key so Gemini is never contacted. Exit code 0 means all checks passed.

## Reverse proxy deployment files

deploy/cn-chat.service expects Node at /usr/bin/node, code in /opt/cn-chat,
a dedicated non-root user/group cnchat, and /etc/cn-chat.env. Install runtime
dependencies with npm install --omit=dev after copying package.json. Once a lockfile
is generated and committed, use npm ci --omit=dev for repeatable deployments.
Create /etc/cn-chat.env with GEMINI_API_KEY and optional GEMINI_MODEL; restrict
the file to the service administrator. HOST=127.0.0.1 and PORT=3100 are set in the
unit. EnvironmentFile values override unit Environment values, so keep HOST/PORT
out of that file unless intentionally changing them.

deploy/Caddyfile.snippet configures chat.natdanaihs.com to reverse proxy
127.0.0.1:3100, including Socket.IO upgrades on its default path. DNS, TLS,
service installation and production deployment are separate administrator tasks.
