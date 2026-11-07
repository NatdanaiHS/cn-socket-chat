# 09 — Polish: composer popups, message toolbar, header

Follow-up to docs/prompts/08-channels-mentions-unsend-reply.md in the same repository. Same hard rules
(AGENTS.md; textContent only for user data; no new deps; no server protocol changes unless needed;
do not commit/push/deploy; keep `npm test` passing). Client-only work in public/client.js,
public/style.css, public/index.html. Bump asset query strings v=9 → v=10.

Bugs found in browser testing (desktop 800×600 and 1024×768, dark theme):
1. The @mention popup (#mention-popup) renders BELOW the composer, off screen. It must open ABOVE the
   composer (bottom-anchored), max-height ~240px with internal scroll, never clipped, also at 375 px width
   and with the mobile visual-viewport/keyboard handling. Each option: avatar (existing avatar/initials
   helper), name, small online dot; the "ai" option uses the sparkles icon and the label "AI assistant".
   Mouse hover updates the active option; aria-activedescendant / role=listbox / role=option correct.
2. The ✨ AI menu does not close on Escape, on outside click, on choosing an item, or when the room changes.
   Fix all four and keep aria-expanded in sync. Make it a compact popover (~260 px) anchored to the right
   edge above the ✨ button instead of full composer width. Items get an icon and a one-line hint:
   "Summarize this chat — only you see it" and "Ask AI — the answer is visible to this room".
   Only one composer popup (AI menu, mention list, emoji picker) may be open at a time.

Polish:
3. Message hover toolbar: icon buttons (reply arrow, copy, trash for own Unsend) using the existing
   icon() SVG helper (add missing icons in the same style), each with aria-label and a tooltip/title.
   Small elevated pill, top-right of the row, offset upward like Discord, theme tokens for light and dark.
   Unsend uses the danger colour. Do not show the toolbar for system messages or unsent messages
   (unsent: no actions at all). On touch devices keep the long-press / ⋯ behaviour.
4. Chat header duplicates the group name ("# homework · Network  Network · 2 members"). Show
   "# homework" as the title and "Network · 2 members" as the subtitle; DMs unchanged.
5. Hide the "Read by 0" label: show the read label only when at least one other member has read it.
6. The reply quote line in messages: prefix with a small reply-curve icon, sender name in bold accent,
   one line ellipsis; clicking still jumps to the original.

Verify: `npm test`, `node --check public/client.js`. Report changed files.
