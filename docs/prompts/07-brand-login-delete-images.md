You are improving WongChat (Node.js + Socket.IO chat, Computer Network term project, Discord-style layout). Read `server.js`,
`public/index.html`, `public/client.js`, `public/style.css`, `test/smoke.js`, `docs/PROTOCOL.md` first. Keep plain HTML/CSS/JS, no
frameworks, no new npm deps, Socket.IO-only chat traffic, user text via textContent, existing tokens/type scale, every existing feature
and privacy rule. `npm test` must pass. When done bump `?v=` on style.css and client.js in index.html by one.

## 1. New original WongChat brand (logo + wordmark)
- Drop the plain "W" tile. Design an ORIGINAL inline-SVG logo mark. Concept: "วง" (wong) means a circle / a group of friends sitting in a
  circle in Thai — draw a rounded chat bubble whose inner shape is a ring of 3 small dots/heads forming a circle (friends in a circle), or a
  ring that turns into a speech-bubble tail. Geometric, works at 16 px (favicon) and 96 px, one accent gradient (indigo #5865F2 → violet
  #8B5CF6) plus a monochrome variant for small sizes. Must not resemble Discord's controller mascot or any other company's logo.
- Wordmark "WongChat": IBM Plex Sans Thai 700, "Wong" in text colour + "Chat" in the accent gradient, tight letter-spacing (-0.02em).
- Put the SVG in `public/logo.svg` AND reuse it inline via a `logoMark(size)` helper in client.js (one source of truth: copy the same paths).
  Use it in: rail Home button, login page, browser favicon (`<link rel="icon" href="/logo.svg" type="image/svg+xml">`; keep the existing
  unread-dot favicon logic working by drawing the logo onto the canvas instead of the W), and the README title.

## 2. Login page redesign (desktop, 2K, mobile)
- Full-viewport background: deep navy (#0B0D17) with two soft blurred radial gradient blobs (indigo + violet, low opacity, slow 20 s drift
  animation, disabled under prefers-reduced-motion) and a subtle dot-grid pattern.
- Centred glass card (max 440 px, 32 px padding, 24 px radius, 1 px white/8% border, backdrop-filter blur 16 px, surface rgba(17,19,34,.72)):
  logo mark 56 px + wordmark, headline "ยินดีต้อนรับสู่ WongChat" (22px 600) and a 14px muted subline "แชทกับเพื่อนในวง แบบเรียลไทม์".
  Segmented control Log in / Create account (pill, sliding indicator). Inputs 48 px tall, 16px, leading SVG icons (user, lock),
  show/hide password eye button, inline errors under the field, primary button full width 48 px with gradient + loading spinner while
  waiting for the socket ack. Footer line: small chips "Private chats · Groups · AI · Files" with icons, muted 12px.
- On wide screens (≥ 1200 px) place the card on the right ~40% and on the left a short hero: big wordmark (28px), 3 feature rows with icons
  (Real-time over WebSocket, Groups & DMs, AI summary with Gemini) — but keep it clean, not crowded. On mobile only the card, full width with
  16 px margins, no horizontal scroll, safe-area aware.
- Light theme variant: background #F5F6FB with the same blobs at lower opacity, card white with shadow.

## 3. Fix the settings (gear) icon and audit all icons
Replace the hand-drawn `settings` icon with the real Lucide "settings" icon (ISC licence):
`M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z`
plus `<circle cx="12" cy="12" r="3"/>` (make `icon()` support circle elements or express it as a path `M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0`).
Check every other icon in `icon()` against its Lucide original (stroke-width 2, round caps/joins, 24 viewBox) and fix any that are
hand-drawn or distorted. All icon buttons: 40 px hit box (44 on touch), icon 20 px, centred.

## 4. Delete group ("server") and clear messages — server-enforced
- `group_delete { roomId }`: only the group's creator. Server notifies members with `group_deleted { roomId, name, by }`, removes the
  Socket.IO room, history, read state, unread counts and the group's uploaded files from disk, then broadcasts the updated group list.
  Clients viewing it go back to Home with a toast "CN Project was deleted by Bob".
- `room_clear { roomId, scope }`:
  - `scope: 'everyone'` — group creator only (for groups): deletes the room history + files + read state for all and emits
    `room_cleared { roomId, by }` to members; clients empty that room and show a system line "Bob cleared the chat".
  - `scope: 'me'` — any participant (DM or group): stores a per-user `clearedAt` message id/timestamp so that user's `room_open` /
    history no longer includes earlier messages (and their files are not fetchable by that user via file_get? keep it simple: only hide
    history for them; files stay for others). Persist in the JSON data file.
  - DMs cannot be cleared for everyone (privacy: one person cannot erase the other's copy).
- UI: group header dropdown gets "Clear chat for me", and for the creator "Clear chat for everyone" and a red "Delete group" (both in a
  danger section). DM header/menu gets "Clear chat for me". Every destructive action asks for confirmation in a modal
  (type the group name to confirm delete; simple confirm for clear) and shows a toast after.
- Tests: non-creator cannot delete/clear-for-everyone; delete removes files from disk and notifies only members; clear-for-me hides history
  only for that user and survives restart; DM clear-for-everyone is rejected; third users get no events.

## 5. Image sizing for every screen (the user is on a 2K monitor; images look tiny)
- Size images from their real width/height (stored in metadata) — never squash them into a 300 px box. Rules:
  max-width = min(100%, 520 px on ≥ 1440 px screens, 440 px on desktop, 80vw on mobile); max-height = min(60vh, 560 px);
  keep the aspect ratio exactly (set `aspect-ratio: w / h` from metadata, `width: <computed>px`, `height:auto`), so portrait photos are tall
  and landscape photos wide. Very small images (< 160 px) display at their natural size, never upscaled.
- Reserve the computed box while loading (skeleton) so the list does not jump; for old messages without width/height read them from the
  loaded image and then size it.
- Lightbox: image fills up to 92vw × 86vh, centred, dark backdrop, close on Esc/backdrop click, download button.
- Also scale the whole UI sensibly on large screens: at ≥ 2000 px wide cap the chat column's message max-width at ~900 px of readable text
  per line (images may be wider up to the rule above) and bump base font to 17 px only if it keeps the type scale consistent — otherwise leave it.

When done: `npm test`, `node --check public/client.js`, print a short summary.
