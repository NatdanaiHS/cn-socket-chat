You are building a university Computer Network term project: a "Simple Chat Application" using socket programming.
Work in the current directory (it is empty except .gitignore and docs/). Write clean, well-commented, beginner-readable code —
the student must explain every socket event to an instructor, so prefer clarity over cleverness. Comments in English.

## Stack (fixed)
- Node.js 20+ (CommonJS), `express` (only to serve static client files), `socket.io` v4 (server), `dotenv`.
- Client: plain HTML/CSS/JS in `public/` using the socket.io client served at `/socket.io/socket.io.js`. No React, no build step.
- Server and client MUST be in separate files: `server.js` (server process) and `public/index.html`, `public/client.js`, `public/style.css` (client).
- All chat traffic between client and server must go through Socket.IO events only (no REST endpoints for chat).
- Config from env: `PORT` (default 3000), `HOST` (default 0.0.0.0), `GEMINI_API_KEY`, `GEMINI_MODEL` (default `gemini-2.5-flash`).
  Create `.env.example` with empty placeholders. Never hard-code keys. Never log the key.
- Server state is in memory (no database).

## Required features (each one is graded — implement every one exactly)
- R3: Each client must have a unique name. Login screen asks for a name; server rejects empty, >20 chars, or duplicate (case-insensitive) names with an error message shown on the login screen.
- R4: Each client sees a live list of all currently connected clients' names, including its own (mark own as "(you)"). Updates on connect/disconnect.
- R5: Every chat (private and group) has its own chat room. Private room id = `dm:` + the two names sorted and joined with `|`. Group room id = `group:` + group name. Clicking a user or group opens that room in the main panel; switching rooms keeps each room's own history.
- R6: Each chat room has a chat window (scrolling message list showing sent messages and new incoming messages, with sender name and time) and a chat box (text input + Send button; Enter sends).
- R7: Private message: a client can send a direct message to any client in the list. Server delivers ONLY to the sender and the receiver (emit to their socket ids — never broadcast). Server must validate the target exists.
- R8: A client can create chat groups (any number). A new group initially contains ONLY the creator. Group names are unique; reject empty/duplicate.
- R9: Every client sees a live list of all existing groups with their member lists (shown under each group name), updating whenever groups are created/joined/left.
- R10: Clients join a group only by themselves (a "Join" button next to groups they are not in). There must be NO way for a creator to add other people. Also provide "Leave".
- R11: A client can send a message to a group they joined. Server must check membership before accepting, and deliver only to members (use `socket.join(room)` + `io.to(room).emit`). Non-members cannot read the group history or send to it.
- On disconnect: remove user from user list and from all groups (delete a group when it becomes empty) and broadcast updated lists.

## Special features (bonus points)
1. AI feature (Gemini): (a) a "✨ Summarize" button in every room sends `ai_summarize` for that room; server calls Gemini REST API
   `POST https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent` with header `x-goog-api-key`
   (use global `fetch`, not a URL query key), summarizing the last 50 messages of that room, and returns the summary only to the requester
   (shown as a special AI message). (b) In a group room, a message starting with `@ai ` makes the server ask Gemini and post the answer to
   that group as sender "AI Bot". If no key configured or API fails, return a friendly error message instead of crashing. Timeout 20s.
2. Typing indicator: "X is typing…" shown in the room for the other participant(s) only (same privacy rules as messages).
3. Unread badges: a count bubble on users/groups with new messages in rooms that are not currently open; plus message history kept on
   the server per room (last 200 messages) and sent when a permitted user opens the room.
4. Cloud deployment (handled separately — just make the server work behind a reverse proxy: serve on HOST/PORT, Socket.IO default path).

## UI
Clean, modern, responsive single page: left sidebar (my name, Online users, Groups with members + Create group input), main panel (room header,
chat window, chat box). Own messages right-aligned, others left. Works on a phone width too. Escape all user text (use textContent, never innerHTML with user data).

## Socket event protocol
Document every event (name, direction, payload) in a table in `docs/PROTOCOL.md`, and keep names consistent with the code.

## Tests
Add `test/smoke.js` using `socket.io-client` (devDependency) that starts the server on a random port in-process or as a child process,
and asserts with node:assert: R3 duplicate name rejected; R4 list contains all names; R7 a third client does NOT receive a DM between two others;
R8 new group has only the creator; R9 group list visible to all with members; R10 no add-others path and join works; R11 non-member gets no group message
and cannot send. Exit code 0 on pass. `npm test` runs it. Do not call Gemini in tests.

## Also create
- `package.json` with scripts `start` and `test`.
- `README.md`: what it is, how to run locally (`npm install`, copy `.env.example` to `.env`, `npm start`, open http://localhost:3000 on two computers),
  features mapped to R3–R11 with file/function references.
- `deploy/cn-chat.service` (systemd unit: runs `node server.js` from /opt/cn-chat as a dedicated non-root user `cnchat`, HOST=127.0.0.1, PORT=3100,
  EnvironmentFile=/etc/cn-chat.env, Restart=always) and `deploy/Caddyfile.snippet` for `chat.natdanaihs.com { reverse_proxy 127.0.0.1:3100 }`.

If you cannot run `npm install` because of sandbox/network limits, still write all files; the supervisor will install and run tests.
When done, print a short summary of files created.
