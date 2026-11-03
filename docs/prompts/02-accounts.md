You are extending an existing Node.js + Socket.IO chat app (Computer Network term project). Read `server.js`, `public/*`,
`test/smoke.js`, `docs/PROTOCOL.md` and `README.md` first, keep the existing style (clear comments, beginner-readable, CommonJS,
no build step), and keep every existing feature working (R3–R11, Gemini summarize + @ai, typing indicator, unread badges, history).

## Goal: user accounts with passwords + persistent data (a bonus "special point")
Replace the name-only login with real accounts. All auth traffic stays on Socket.IO events (no REST endpoints).

### Accounts
- Login screen has two modes: "Log in" and "Create account" (username + password; confirm password on create).
- Username rules: 1–20 chars, trimmed, no `|` or control chars, unique case-insensitively (this still satisfies R3: unique client name).
- Password: 6–72 chars. Hash with `crypto.scrypt` (node:crypto, random 16-byte salt per user, 64-byte key), compare with
  `crypto.timingSafeEqual`. Never store or log plain passwords. No new npm dependencies.
- On successful register/login the server returns a random session token (`crypto.randomBytes(32).toString('base64url')`).
  Store only a SHA-256 hash of the token server-side, with 7-day expiry. The client keeps the token in `localStorage`
  and on page load / reconnect emits `resume` with it to log in automatically. A "Log out" button emits `logout`
  (server deletes that session) and clears localStorage.
- If the same account logs in from another tab/computer, the new session wins: the old socket gets a `kicked` event
  ("Logged in from another place") and is disconnected.
- Basic brute-force protection: max 5 failed logins per username per 5 minutes (in memory), then a friendly error.
- Generic error message for wrong username OR wrong password ("Incorrect username or password").

### Persistence (no database server)
- Store accounts, sessions, groups (name + member usernames + creator) and per-room message history (last 200 per room)
  in a JSON file at `DATA_FILE` env (default `./data/chat-data.json`). Load at startup; save with an atomic write
  (write temp file then rename), debounced ~500 ms, and on SIGINT/SIGTERM. Add `data/` to `.gitignore`.
- Group membership is now by username and survives disconnects/restarts: a user stays in a group until they click Leave.
  A group is deleted only when its last member leaves. Group member lists (R9) show all member usernames, and mark who is online.
- R4 is unchanged: the "Online users" list shows only currently connected accounts, including yourself.
- DM rooms are keyed by the two usernames as before and their history persists (safe now because names are accounts).
  Remove the old "delete DM history on disconnect" logic.
- Socket.IO room membership: on login/resume, `socket.join` every group room the user belongs to.
- R7/R11 privacy rules stay exactly the same (DM only to the two participants; group messages and history only to members).
  Users can open a DM with any online user; opening an existing DM history with an offline user is allowed but sending to an offline user
  should still be allowed and stored (they see it next login with an unread badge) — show "(offline)" in the room header.

### Tests
Update `test/smoke.js`: use a temporary DATA_FILE (os.tmpdir) and clean it up. Keep all existing R3–R11 privacy assertions, and add:
register + duplicate username rejected; wrong password rejected; resume with token works; logout invalidates token; second login kicks
the first socket; group membership survives a disconnect/reconnect; data is reloaded after creating a new server instance on the same DATA_FILE;
the data file contains no plain password. `npm test` must pass. Do not call Gemini in tests.

### Docs
Update `docs/PROTOCOL.md` (all events incl. register/login/resume/logout/kicked), `README.md` (accounts + persistence section, env vars incl.
DATA_FILE), and `.env.example` (`DATA_FILE=`). Keep `deploy/cn-chat.service` but add `Environment=DATA_FILE=/var/lib/cn-chat/chat-data.json`
and `StateDirectory=cn-chat`.

If `npm install` fails due to sandbox limits that's fine — dependencies are already installed in node_modules; run `npm test`.
When done, print a short summary.
