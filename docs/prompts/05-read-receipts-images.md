You are improving WongChat (Node.js + Socket.IO chat, Computer Network term project). Read `server.js`, `public/*`,
`test/smoke.js`, `docs/PROTOCOL.md` first. Keep plain HTML/CSS/JS, no new dependencies, Socket.IO-only chat traffic, every existing feature
and privacy rule, the design tokens/type scale in style.css (sizes 12/14/16/18/22/28, weights 400/500/600, SVG icons via `icon()`).
`npm test` must pass. User text only via textContent.

## 1. Read receipts ("Seen")
- Server keeps, per room, the last message id each member has read: `readState: Map<roomId, Map<username, messageId>>`, persisted in the JSON
  data file. It is updated when a user opens a room (`room_open`), sends `room_read`, or receives `message_new` while that room is open
  (the client already emits `room_read` then — extend it to `room_read { roomId, messageId }`). Never move a read pointer backwards.
- Server emits `read_update { roomId, username, messageId }` with the SAME privacy rules as messages (DM: only the two participants;
  group: only members). `room_open` returns the room's current read state for its members too.
- UI (LINE/Messenger style), shown only under the LAST own message that the others have read up to:
  - DM: "Read" + time-less small text (12px, muted) under my latest message that the other person has read; "Sent" under my latest message
    if they have not read it yet. Update live when `read_update` arrives.
  - Group: "Read by N" under my latest message (N = members other than me whose pointer is at or after that message); tapping it opens a
    small sheet listing who has read it (avatars + names).
- Do not mark as read while the page is hidden (`document.visibilityState !== 'visible'`) — emit `room_read` on `visibilitychange` back to
  visible for the open room instead. Also emit it when the user scrolls to the bottom of an open room.
- Tests: in a DM, B opening the room produces a `read_update` for A but not for a third user C; pointer never moves backwards;
  group read state only goes to members; read state survives a server restart.

## 2. Image messages look like images, not file cards
- Image files (png/jpeg/gif/webp) render as just the picture: no bubble background, no padding, no file name, no size, no download row.
  Rounded 18px corners (the corner nearest the sender reduced like bubbles), max 260×320 px on desktop, max 70vw on mobile, keep aspect ratio
  with `object-fit: cover` only when taller than the max; reserve space with the known width/height so the list does not jump while loading
  (send `width`/`height` in file metadata; server validates as positive integers ≤ 10000 and stores them).
- While the image bytes are loading show a skeleton block of the same size; on error show a compact "Image unavailable" placeholder.
- Tapping the image opens the existing lightbox (full size, dark backdrop, close button, a Download icon button with the file name there).
- The timestamp / read receipt sits next to the image like other bubbles.
- Non-image files keep a compact file card (icon, name with middle-ellipsis for long names, size, download icon button), bubble-styled.
- Chat list preview / banner for images: "Photo" (with an image SVG icon), not the file name.

## 3. Compress photos before sending (phones send 4–5 MB photos)
- Before `file_send`, for jpeg/png/webp images larger than 400 KB or wider/taller than 2048 px: draw onto a canvas, scale so the longest side
  is ≤ 2048 px, encode JPEG quality 0.85 (keep PNG only if it has transparency and stays ≤ 1.5 MB), respect EXIF orientation
  (use `createImageBitmap(file, { imageOrientation: 'from-image' })`). Name the result like `photo-YYYYMMDD-HHMM.jpg` when the original name is
  a long camera/random name (> 24 chars of digits/hex). GIFs are sent unchanged. Keep the 5 MB limit for everything else.
- Show the upload progress state while compressing/sending.

When done: `npm test`, `node --check public/client.js`, and print a short summary.
