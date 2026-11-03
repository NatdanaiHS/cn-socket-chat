# Socket event protocol

All chat requests use Socket.IO's default path, /socket.io. Express serves static
files only. C → S means client to server; S → C means server to client.
Application requests accept an object and an optional Socket.IO acknowledgement
callback. Acknowledgements always return { ok: true, ...result } on success or
{ ok: false, error: string } on failure. The browser supplies callbacks for actions;
typing is sent without one. Every request except login requires login.

| Event | Direction | Payload / success acknowledgement |
| --- | --- | --- |
| connection | Socket.IO → server | Built-in: a connected socket; registers handlers, but does not reserve a name. |
| connect | Socket.IO → client | Built-in, no payload: transport connected; login is still required. |
| connect_error | Socket.IO → client | Built-in Error: browser shows a connection error. |
| login | C → S | { name: string }; ack { ok, name, users: string[], groups: Group[] }. Trims names, rejects empty, over 20 Unicode characters, case-insensitive duplicates, pipe delimiter and control characters. |
| users_update | S → C | string[] of all logged-in online names, including the recipient. Sent to logged-in clients after login/disconnect. |
| groups_update | S → C | Group[] of every existing group and its member names. Sent after login/create/join/leave/disconnect. Metadata is public to logged-in clients; message contents are restricted. |
| room_open | C → S | Private: { target: exactDisplayName }, or existing permitted room: { roomId }. Ack { ok, roomId, messages: Message[] }. Only a private participant or current group member can get history. |
| group_create | C → S | { name: string }; ack { ok, roomId }. Trimmed, unique case-insensitively, 1–60 Unicode characters, no control characters. Only creator joins. Other fields cannot add members. |
| group_join | C → S | { roomId }; ack { ok, roomId }. Only the requesting socket joins; no target/member field is accepted. |
| group_leave | C → S | { roomId }; ack { ok, roomId }. Removes requesting member from group and Socket.IO room; deletes empty groups and their history. |
| message_send | C → S | { roomId, text: string }; ack { ok }. Text trimmed, 1–4000 UTF-16 code units. Server validates room access; DM target must be online. Group messages starting with "@ai " also request an AI answer. |
| message_new | S → C | Message. A DM goes only to sender and receiver socket ids; a group message goes only to Socket.IO room members. AI group replies use sender "AI Bot" and kind "ai". |
| typing | C → S | { roomId, typing: boolean }; ack { ok } if supplied. Server checks room access and excludes sender from delivery. |
| typing_update | S → C | { roomId, name: string, typing: boolean }. Delivered using message privacy rules, excluding sender. False sent on message, leave, disconnect; browser expires stale indicators after 2.5s. |
| ai_summarize | C → S | { roomId }; ack { ok, roomId, text: string }. Uses last 50 messages. Summary returned only through requester's ack, displayed locally as an AI message. Error ack for empty history, missing key, timeout, API failure or lost room access. |
| disconnect | Socket.IO → both | Built-in reason string; server removes name and memberships, deletes empty groups and affected DM histories, broadcasts lists. Browser clears session and returns to login. |

Group = { roomId: string, name: string, members: string[] }.

Message = { id: UUID string, roomId: string, sender: string, text: string,
time: ISO-8601 string, kind: "chat" | "ai" }.

Private ids are "dm:" + [name1, name2].sort().join("|"), using JavaScript's
default case-sensitive sort of the exact registered display names. Group ids are
"group:" + trimmedGroupName. The pipe is reserved in user names to prevent room
id collisions. Room history is held in memory and capped at 200 messages.
Group members may see existing group history when joining; non-members may not.
DM history is deleted when either user disconnects because names are temporary
session identities, with no passwords or persistent accounts.

Room switching fetches history again. Incoming messages for inactive rooms increment
local unread badges; opening that room resets its badge. Own messages are echoed by
the server, so the client never creates duplicate optimistic messages.
Unexpected or unsupported events (including any add-member event) have no handlers.

Gemini requests use global fetch, an x-goog-api-key header, and a 20-second timeout.
The group AI response arrives separately after the human-message acknowledgement.
The server verifies the original group still exists before delivering an answer.
Summary access and room identity are checked again after awaiting Gemini.
