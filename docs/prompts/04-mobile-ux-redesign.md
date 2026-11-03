You are improving the UI/UX of WongChat, an existing Node.js + Socket.IO chat app (Computer Network term project).
Read `server.js`, `public/index.html`, `public/client.js`, `public/style.css`, `test/smoke.js` first. Keep: plain HTML/CSS/JS,
no frameworks, no build step, no new npm dependencies, all chat traffic on Socket.IO, every existing feature and privacy rule
(R3–R11, accounts, files, profiles, themes, AI). `npm test` must still pass. User text only via textContent.

The real users say: "on mobile it is not usable at all", "the typing banner resets on every key press", "I never see unread",
"name/profile should not be inside the message bubble", "fix fonts, colours, sizes and weights". Fix all of it, to the quality of
LINE / Messenger / Telegram. Guidance below comes from the ui-ux-pro-max design skill (Minimalism/Swiss style, messenger blue + online green).

## A. Rewrite `public/style.css` from scratch (it is currently a pile of overrides)
- One token block on `:root` + `[data-theme="dark"]` (keep light/dark/system and per-user `--accent`). Semantic tokens: `--bg`, `--surface`,
  `--surface-2`, `--text`, `--text-muted` (≥4.5:1 on its background in both themes), `--border`, `--accent`, `--on-accent`, `--online`, `--danger`.
  Light: bg #FFFFFF, surface-2 #F1F5F9, text #0F172A, muted #475569, border #E2E8F0. Dark: bg #0B1120, surface #111827, surface-2 #1F2937,
  text #F1F5F9, muted #94A3B8, border #263244. Default accent #2563EB, online #16A34A.
- Font: "IBM Plex Sans Thai" (Google Fonts, weights 400/500/600/700, display=swap; it covers Thai + Latin) with system-ui fallback.
- Type scale ONLY these sizes: 12 (timestamps/captions — never smaller), 14 (secondary text, previews, labels), 16 (body, message text,
  ALL inputs/textarea — prevents iOS zoom), 18 (room title), 22 (page titles), 28 (login hero). Line-height 1.5 body, 1.25 headings.
  Weights: 400 body; 500 labels/buttons; 600 names, room title, section headers; 700 only for the logo/hero. Section headers: 13px is NOT allowed —
  use 12px uppercase 600 with letter-spacing .06em, or 14px sentence-case 600.
- Spacing scale 4/8/12/16/24/32. Radius: 12 for controls, 18 for bubbles, 999 for pills/badges. Touch targets ≥ 44×44 px everywhere on mobile.
- Replace every emoji used as a UI icon (📎 ✨ 😀 ⌕ ↩ ☀ ☾ 🖥 # etc.) with inline SVG icons (Lucide style, 24 viewBox, stroke 2,
  `aria-hidden="true"`, sized via tokens 20/24 px). Define them once in client.js as an `icon(name)` helper. Emoji inside user messages stay.
- `prefers-reduced-motion` respected; transitions 150–250 ms.

## B. Mobile (≤ 768 px) — must be genuinely usable on iPhone Safari and Android Chrome
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">`.
- Use a JS-maintained `--app-height` from `window.visualViewport.height` (update on resize/scroll) so the layout shrinks when the
  on-screen keyboard opens; the composer must stay visible right above the keyboard and the message list must keep the last message in view.
- Two screens: List screen and Room screen (slide transition). Opening a room does `history.pushState`; the hardware/browser Back
  button (popstate) returns to the list instead of leaving the site. Back button in the room header is 44×44.
- List screen: sticky top bar (logo + avatar button that opens a "Me" sheet with Edit profile, Theme, Notifications, Log out);
  search field (16px); sections "Chats" (DMs + joined groups sorted by latest message, with unread first-class), "Online now"
  (horizontal scroll of avatars like Messenger), "Discover groups" (groups not joined, with Join). Create group = "+" icon button in the
  top bar that opens a bottom sheet with the name field. Remove the long sidebar footer text on mobile.
- Room screen: compact 56 px header (back, avatar, name + "online"/"n members", Summarize icon button); messages; composer pinned to the
  bottom with `padding-bottom: max(8px, env(safe-area-inset-bottom))`; attach + emoji + auto-grow textarea (16px) + round Send button.
- No horizontal scroll at 360 px. Test layouts mentally at 360, 390, 768, 1024, 1440.
- Desktop keeps a 2-column layout (340 px sidebar) using the same components.

## C. Message bubbles (LINE/Messenger pattern)
- Name and avatar are OUTSIDE the bubble. For others' messages: avatar (32 px) on the left aligned to the bottom of the last bubble of a
  consecutive group; sender name (12px, 600, muted) above the FIRST bubble of the group, outside the bubble — in groups only (not in DMs).
- Own messages: right aligned, accent background, no name/avatar. Bubble text 16px/1.5, max-width 75% (mobile 80%), radius 18 with the
  corner nearest the avatar reduced on grouped bubbles.
- Timestamp (12px muted) outside the bubble, next to the last bubble of a group (always visible on mobile — no hover-only info).
- Images: rounded, max 240 px wide, no bubble padding. File: compact card with SVG file icon, name, size, download icon button.
- AI messages: neutral bubble with a small "AI" chip + sparkles SVG; system notices centred, 12px muted pill.
- Date separators as centred 12px pills.

## D. Typing indicator — fix the reset bug
- Never rebuild the indicator DOM on a timer. Keep one persistent element; only update its text when the SET of typing names changes,
  so the three-dot CSS animation runs continuously. Remove `setInterval(renderTyping, 500)`; instead schedule a single timeout to the next
  expiry.
- Show it as a typing bubble (three animated dots in a bubble + "Bob is typing…") at the bottom of the message list, in a reserved
  slot so the layout does not jump. Also show "typing…" in accent colour instead of the last-message preview in the chat list row.
- Sender: emit `typing:true` on first keystroke, re-emit at most every 2 s while still typing; emit `typing:false` after 3 s idle, on send,
  on blur, on room switch. Receiver expiry 5 s.

## E. Unread — make it impossible to miss
- Chat list row with unread: bold name (600) + bold preview + accent badge (min 20×20, 12px 600, white text, pill), row sorted to top.
- Mobile room header back button shows the total unread of OTHER rooms as a badge.
- In-app banner: when a message arrives for a room that is not open (or the app is on the list screen), show a top banner
  (avatar + "Bob" + preview, slides down, auto-hides after 4 s, tap opens that room, swipe/close button dismisses). Not for own messages.
- When opening a room with unread messages, insert a "New messages" divider above the first unread message and scroll to it.
- Tab title "(3) WongChat" and a small dot on the favicon when unread > 0 (generate favicon with <canvas>).
- Optional browser notifications: a toggle in the Me sheet asks `Notification.requestPermission()` only when the user taps it; when
  enabled and the tab is hidden, show a Notification for new messages.
- Server: keep unread counts per account (already exists); make sure group messages increment unread for every member except the sender,
  and that `room_read` resets it. Add/adjust a smoke test that a member gets unread incremented and room_read clears it after reconnect.

## F. Polish
- Login: on mobile, single column with the logo, title 28px, inputs 16px 48px tall, primary button 48px; desktop keeps the split layout.
- Focus rings 2px accent with offset; visible pressed states on touch (`:active` scale .97).
- Empty states with an SVG illustration-style icon, not emoji.
- Keep all existing element ids that tests or code rely on, or update the code consistently.

When finished: run `npm test` and `node --check public/client.js`, then print a short summary of what changed.
