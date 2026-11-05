You are re-skinning WongChat (Node.js + Socket.IO chat, Computer Network term project) to a Discord-style layout.
Read `server.js`, `public/index.html`, `public/client.js`, `public/style.css`, `test/smoke.js` first. This is a CLIENT UI change:
do not change server events or privacy rules unless something below strictly needs it. Keep plain HTML/CSS/JS, no frameworks, no new
dependencies, user text only via textContent, the `icon()` SVG helper, IBM Plex Sans Thai, the type scale (12/14/16/18/22/28,
weights 400/500/600), 16px inputs. Keep EVERY feature working: accounts/login, DMs, groups (create/join/leave, members), unread + banners,
typing, read receipts, files + image lightbox + photo compression, profiles + accent colour, light/dark/system theme, AI summarize + @ai +
AI button, emoji picker, search, mobile keyboard handling, history back. `npm test` must pass.

Use your own WongChat "W" logo and name — do not copy Discord's logo, wordmark, mascot or exact brand assets; only the layout pattern.

## Desktop layout (≥ 1024 px): 4 columns
1. **Rail (72 px)**: Home button (W logo) at top → DMs; separator; one round 48 px icon per JOINED group (initials of the group name, coloured
   from the name hash) — hover/active morphs to a rounded square (radius 16) with a white pill indicator on the left edge
   (small pill = unread, tall pill = selected); unread count badge bottom-right; "+" (create group) and compass (discover groups) icons at the end.
   Tooltips with the group name on hover (and aria-labels).
2. **Side panel (240 px)**:
   - Home: search box ("Find or start a conversation"), "Direct Messages" header with + (start DM picker of online users), DM rows
     (avatar with status dot, name, unread bold + badge, "typing…" in accent).
   - Group selected: group name header with a dropdown (Members, Leave group); a single text channel row "# general" (the group chat);
     below it the AI tools ("Summarize chat").
   - Bottom **user panel** (52 px): my avatar with online dot, my username + bio (ellipsis), icon buttons: theme toggle, settings (opens Edit
     profile / Notifications / Log out sheet).
3. **Chat (flex)**: header bar 48 px ("@ Bob" for DMs with online status, "# general · CN Project" for groups, member-list toggle icon, summarize
   icon). Messages in **Discord style — NOT bubbles**: every message (mine too) is left-aligned; first message of a group shows a 40 px avatar,
   username in the sender's accent colour (600), and a 12px muted timestamp on the same line; following messages from the same sender within
   5 minutes are compact rows without avatar, with the time shown in the left gutter on hover. Row hover background `--hover`.
   AI Bot messages: avatar with sparkles icon and an "AI" tag next to the name. System join/leave lines: muted 14px with an arrow icon.
   Images: shown under the text, rounded 8 px, max 400×300; files as a compact attachment card. Date separators: horizontal line with the date
   centred. "New messages" divider: red line with a "NEW" tag on the right.
   Read receipts: small muted "Read" / "Read by N" under my latest message (right-aligned within the row).
   **Composer** at the bottom: one rounded 44 px input bar with "+" (attach) on the left, then the textarea ("Message @Bob" / "Message #general"),
   then AI sparkles button, emoji button; Enter sends. **Typing indicator below the composer** (Discord style): 12px, animated dots + "Bob is typing…",
   in a reserved 24 px line so nothing jumps.
4. **Member list (240 px, groups only, toggleable)**: "ONLINE — n" and "OFFLINE — n" sections, rows with avatar + status dot + name + bio;
   click opens the profile card. For DMs the right column shows the other person's profile panel (banner colour from their accent, big avatar,
   bio, "Member since" if available, else omit).

Between 768–1023 px: hide the member list by default (toggle opens it as an overlay drawer).

## Mobile (< 768 px)
- Screen 1: rail on the left (64 px) + side panel filling the rest (like Discord mobile). Tapping a DM/channel opens Screen 2.
- Screen 2: the chat full screen with header (back button with unread badge, title, members button opening a right drawer). Composer +
  typing line pinned above the keyboard (keep the existing visualViewport `--app-height` and safe-area handling). History back works.
- Touch targets ≥ 44 px, no horizontal scroll at 360 px, in-app banner still works.

## Theme tokens (Discord-like neutral greys, keep light theme too)
- Dark (default for new users when system is dark): rail #1E1F22, side panel #2B2D31, chat #313338, input bar #383A40, hover #2E3035,
  text #F2F3F5, muted #B5BAC1 (≥4.5:1 on #313338), border #3F4147. Default accent #5865F2 (user accent still overrides), online #23A55A,
  danger #F23F43, mention/unread pill #FFFFFF.
- Light: rail #E3E5E8, side panel #F2F3F5, chat #FFFFFF, input #EBEDEF, hover #F2F3F5, text #060607, muted #4E5058, border #E1E2E4.
- Rewrite style.css cleanly around these tokens (no override piles). Transitions 150 ms; respect prefers-reduced-motion.

## Tests/docs
`npm test` must still pass (update element-id dependent code consistently). Update README's UI section with a short description of the layout.
When done run `npm test`, `node --check public/client.js`, and print a short summary.
