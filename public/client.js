'use strict';
const socket = io();
const $ = id => document.getElementById(id);
const colors = ['#4f46e5', '#2563eb', '#0f766e', '#a21caf', '#be123c', '#b45309'];
const colorNames = ['Indigo', 'Blue', 'Teal', 'Purple', 'Rose', 'Amber'];
let myName = '', users = [], groups = [], directRooms = [], profiles = {};
let creatingAccount = false, sessionToken = '', explicitLogin = false;
let activeRoom = null, openingVersion = 0, accountVersion = 0;
let typingTimer, lastTypingSent = 0, sendingCount = 0;
let draftAvatar = null, draftColor = colors[0], photoVersion = 0;
const tokenStorageKey = 'campus-chat-token';
const histories = new Map(), summaries = new Map(), unread = new Map(), typers = new Map();
const lastMessages = new Map();
const fileURLs = new Map(); // Room + file -> private Blob URL, revoked on leave/logout.
let themeChoice = 'system';
try { themeChoice = localStorage.getItem('campus-chat-theme') || 'system'; } catch {}
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  document.documentElement.dataset.theme = themeChoice === 'system' ? (systemTheme.matches ? 'dark' : 'light') : themeChoice;
  document.querySelectorAll('[data-theme-choice]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.themeChoice === themeChoice));
  });
}
document.querySelectorAll('[data-theme-choice]').forEach(button => {
  button.onclick = () => {
    themeChoice = button.dataset.themeChoice;
    try { localStorage.setItem('campus-chat-theme', themeChoice); } catch {}
    applyTheme();
  };
});
systemTheme.addEventListener('change', applyTheme);
applyTheme();
// Storage can be disabled in private browsing; this page can still chat.
function storedToken() { try { return localStorage.getItem(tokenStorageKey) || ''; } catch { return ''; } }
function storeToken(token) {
  try { if (token) localStorage.setItem(tokenStorageKey, token); else localStorage.removeItem(tokenStorageKey); } catch {}
}
function request(event, payload) {
  return new Promise((resolve, reject) => {
    socket.timeout(['ai_summarize', 'file_send', 'file_get'].includes(event) ? 25000 : 5000)
      .emit(event, payload, (error, result) => {
        if (error) {
          const timeout = new Error('Connection timed out. Please try again.');
          timeout.requestTimeout = true;
          reject(timeout);
        } else if (!result.ok) reject(new Error(result.error));
        else resolve(result);
      });
  });
}
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function toast(text, error = false) {
  const node = element('div', 'toast' + (error ? ' error' : ''));
  const close = element('button', 'icon-button', '×');
  close.type = 'button'; close.setAttribute('aria-label', 'Dismiss notification');
  close.onclick = () => node.remove();
  node.append(element('span', '', (error ? '⚠ ' : '✓ ') + text), close);
  const container = document.querySelector('dialog[open]') || document.body;
  container.append($('toasts'));
  $('toasts').append(node);
  setTimeout(() => node.remove(), error ? 8000 : 4000);
}
function showError(error) { toast(error.message, true); }
function dmId(name) { return 'dm:' + [myName, name].sort().join('|'); }
function defaultColor(name) {
  let hash = 0;
  for (const character of name) hash = ((hash * 31) + character.codePointAt(0)) >>> 0;
  return colors[hash % colors.length];
}
function profileFor(name) { return Object.hasOwn(profiles, name) ? profiles[name] : { avatar: null, bio: '', color: defaultColor(name) }; }
function avatar(name, size = '', clickable = true, override) {
  const node = element('span', 'avatar ' + size + (users.includes(name) ? ' online' : ''));
  node.style.setProperty('--avatar-color', profileFor(name).color);
  const photo = override === undefined ? profileFor(name).avatar : override;
  if (photo) {
    const image = element('img'); image.src = photo; image.alt = '';
    node.append(image);
  } else node.textContent = [...name].slice(0, 2).join('').toUpperCase();
  if (!clickable) { node.setAttribute('aria-label', name); return node; }
  const button = element('button', 'avatar-button'); button.type = 'button';
  button.setAttribute('aria-label', 'View ' + name + '’s profile');
  button.append(node); button.onclick = () => showProfile(name);
  return button;
}
function showProfile(name) {
  const profile = profileFor(name), content = $('profile-card-content');
  content.replaceChildren(avatar(name, 'large', false), element('h2', '', name),
    element('small', '', users.includes(name) ? '● Online' : 'Offline'),
    element('p', 'muted', profile.bio || 'No bio yet. A hello is a good place to start.'));
  const button = element('button', 'button', name === myName ? 'Edit profile' : 'Message');
  button.disabled = name !== myName && !users.includes(name) && !directRooms.some(r => r.target === name);
  button.onclick = () => {
    $('profile-card').close();
    if (name === myName) editProfile();
    else openRoom({ target: name }, name, 'private');
  };
  content.append(button);
  if (button.disabled) content.append(element('small', '', 'Start a new chat when this person is online.'));
  if (!$('profile-card').open) $('profile-card').showModal();
}
function updateIdentity() {
  if (!myName) return;
  $('my-name').textContent = myName;
  $('my-avatar').replaceChildren(avatar(myName, '', false));
  document.documentElement.style.setProperty('--accent', profileFor(myName).color);
  try { localStorage.setItem('campus-chat-accent', profileFor(myName).color); } catch {}
}
function updateTitle() {
  const total = [...unread.values()].reduce((sum, count) => sum + count, 0);
  document.title = (total ? '(' + total + ') ' : '') + 'WongChat';
}
function relativeTime(time) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(time)) / 60000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return minutes + 'm';
  if (minutes < 1440) return Math.floor(minutes / 60) + 'h';
  return new Date(time).toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function preview(message) {
  if (!message) return '';
  return (message.sender === myName ? 'You: ' : '') + (message.kind === 'file' ? '📎 ' + message.file.name : message.text);
}
function makeRow(name, roomId, open, fallback, group = false) {
  const li = element('li', 'list-row' + (activeRoom?.roomId === roomId ? ' selected' : ''));
  li.append(group ? element('span', 'avatar', '#') : avatar(name));
  const button = element('button', 'list-button'); button.type = 'button';
  const copy = element('span', 'row-copy'), top = element('span', 'row-top');
  top.append(element('strong', '', name + (name === myName ? ' (you)' : '')));
  const last = lastMessages.get(roomId);
  if (last) {
    const time = element('time', '', relativeTime(last.time)); time.dateTime = last.time;
    top.append(time);
  }
  copy.append(top, element('span', 'row-preview', preview(last) || fallback));
  button.append(copy); button.onclick = open;
  if (unread.get(roomId)) button.append(element('span', 'badge', String(unread.get(roomId))));
  li.append(button);
  return li;
}
function renderHeader() {
  $('header-avatar').replaceChildren();
  $('room-title').onclick = null; $('room-title').removeAttribute('tabindex'); $('room-title').removeAttribute('role');
  $('room-members').hidden = activeRoom?.kind !== 'group';
  if (!activeRoom) {
    $('room-title').textContent = 'A little closer, in real time.';
    $('room-kind').textContent = 'YOUR CONVERSATIONS'; $('room-title').onclick = null; $('room-title').removeAttribute('tabindex'); $('room-title').removeAttribute('role'); return;
  }
  $('room-title').textContent = activeRoom.title;
  if (activeRoom.kind === 'private') {
    $('header-avatar').append(avatar(activeRoom.title));
    $('room-kind').textContent = users.includes(activeRoom.title) ? 'ONLINE · PRIVATE CONVERSATION' : 'OFFLINE · PRIVATE CONVERSATION';
    $('room-title').onclick = () => showProfile(activeRoom.title);
    $('room-title').tabIndex = 0; $('room-title').setAttribute('role', 'button');
  } else {
    $('header-avatar').append(element('span', 'avatar', '#'));
    const group = groups.find(g => g.roomId === activeRoom.roomId);
    $('room-kind').textContent = 'GROUP CONVERSATION';
    $('room-members').textContent = (group?.members.length || 0) + ' members ⌄';
    $('room-members').setAttribute('aria-label', 'View group members');
    $('room-title').onclick = null; $('room-title').removeAttribute('tabindex'); $('room-title').removeAttribute('role');
  }
}
$('room-title').onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); $('room-title').click(); } };
function renderLists() {
  const search = $('sidebar-search').value.trim().toLowerCase();
  const matches = name => name.toLowerCase().includes(search);
  $('users').replaceChildren(); $('direct-messages').replaceChildren(); $('groups').replaceChildren();
  $('user-count').textContent = users.length;
  for (const name of users.filter(matches)) {
    $('users').append(makeRow(name, dmId(name), () => name === myName ? showProfile(name) : openRoom({ target: name }, name, 'private'),
      name === myName ? 'That’s you. Looking good!' : profileFor(name).bio || 'Online · Say hello'));
  }
  for (const room of directRooms.filter(room => matches(room.target))) {
    $('direct-messages').append(makeRow(room.target, room.roomId, () => openRoom({ roomId: room.roomId }, room.target, 'private'),
      users.includes(room.target) ? 'Online · Start the conversation' : 'Offline · Leave a message'));
  }
  for (const group of groups.filter(g => matches(g.name))) {
    const joined = group.members.includes(myName);
    const item = element('li', 'group-item');
    const row = makeRow(group.name, group.roomId, () => openRoom({ roomId: group.roomId }, group.name, 'group'), joined ? 'Start the conversation' : 'Join to see messages', true);
    // A div avoids nesting list items while reusing the row layout.
    const wrapper = element('div', row.className); wrapper.append(...row.childNodes);
    wrapper.querySelector('.list-button').disabled = !joined;
    const action = element('button', 'small-button', joined ? 'Leave' : 'Join'); action.type = 'button';
    action.setAttribute('aria-label', (joined ? 'Leave ' : 'Join ') + group.name);
    action.onclick = async () => {
      action.disabled = true;
      try {
        await request(joined ? 'group_leave' : 'group_join', { roomId: group.roomId });
        if (!joined) await openRoom({ roomId: group.roomId }, group.name, 'group');
        else toast('Left ' + group.name);
      } catch (error) { showError(error); action.disabled = false; }
    };
    wrapper.append(action);
    const details = element('div', 'group-details'), stack = element('span', 'avatar-stack');
    for (const name of group.members.slice(0, 3)) stack.append(avatar(name, 'small'));
    details.append(stack, element('span', '', group.members.length + (group.members.length === 1 ? ' member' : ' members')));
    item.append(wrapper, details); $('groups').append(item);
  }
  for (const [id, text] of [['users', '🌿 No people online right now.'], ['direct-messages', '💬 Your conversations will appear here.'], ['groups', '👥 Create a space for your people.']]) {
    if (!$(id).childElementCount) $(id).append(element('li', 'list-empty', search ? 'No matches found.' : text));
  }
  updateTitle(); renderHeader();
}
$('sidebar-search').oninput = renderLists;
function setComposer(enabled) {
  for (const id of ['message-input', 'send-button', 'summarize', 'attach-button', 'emoji-button']) $(id).disabled = !enabled;
}
function clearRoom() {
  stopTyping(); openingVersion++; activeRoom = null;
  $('messages').removeAttribute('aria-busy');
  setComposer(false); $('chat-app').classList.remove('room-open');
  $('emoji-picker').hidden = true; $('emoji-button').setAttribute('aria-expanded', 'false');
  $('new-messages').hidden = true;
  renderHeader(); renderMessages(true);
}
async function openRoom(payload, title, kind) {
  stopTyping(); const version = ++openingVersion;
  activeRoom = null; setComposer(false);
  $('chat-app').classList.add('room-open');
  $('room-title').textContent = title; $('room-kind').textContent = 'LOADING CONVERSATION…';
  $('messages').replaceChildren(); $('messages').setAttribute('aria-busy', 'true');
  for (let i = 0; i < 4; i++) $('messages').append(element('div', 'skeleton'));
  try {
    const result = await request('room_open', payload);
    if (version !== openingVersion) return;
    activeRoom = { roomId: result.roomId, title, kind };
    const combined = new Map(result.messages.map(message => [message.id, message]));
    // Keep echoes received while the room history was in flight.
    for (const message of histories.get(result.roomId) || []) {
      if (!result.messages.length || message.time >= result.messages[0].time) combined.set(message.id, message);
    }
    const messages = [...combined.values()].sort((a, b) => a.time.localeCompare(b.time)).slice(-200);
    histories.set(result.roomId, messages);
    if (messages.length) lastMessages.set(result.roomId, messages.at(-1));
    if (kind === 'private' && !directRooms.some(room => room.roomId === result.roomId)) directRooms.push({ roomId: result.roomId, target: title });
    unread.delete(result.roomId); socket.emit('room_read', { roomId: result.roomId });
    setComposer(true); $('message-input').value = ''; growComposer();
    $('new-messages').hidden = true; renderLists(); renderMessages(true);
    if (matchMedia('(min-width: 769px)').matches) $('message-input').focus();
  } catch (error) {
    if (version === openingVersion) { clearRoom(); showError(error); }
  } finally { if (version === openingVersion) $('messages').removeAttribute('aria-busy'); }
}
$('back-button').onclick = () => { clearRoom(); renderLists(); };
function nearBottom() { const node = $('messages'); return node.scrollHeight - node.scrollTop - node.clientHeight < 100; }
function scrollBottom() { $('messages').scrollTop = $('messages').scrollHeight; $('new-messages').hidden = true; }
$('new-messages').onclick = scrollBottom;
$('messages').onscroll = () => { if (nearBottom()) $('new-messages').hidden = true; };
function dateLabel(time) {
  const date = new Date(time), today = new Date(), yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
function emptyState(emoji, title, hint) {
  const node = element('div', 'empty'); node.append(element('span', 'empty-emoji', emoji), element('h2', '', title), element('p', '', hint)); return node;
}
function renderMessages(forceBottom = false) {
  const shouldScroll = forceBottom || nearBottom(), position = $('messages').scrollTop;
  $('messages').replaceChildren(); $('messages').removeAttribute('aria-busy');
  if (!activeRoom) $('messages').append(emptyState('💬', 'Your next conversation starts here.', 'Choose someone online, pick up a direct message, or join a group.'));
  else {
    const messages = [...(histories.get(activeRoom.roomId) || []), ...(summaries.get(activeRoom.roomId) || [])].sort((a, b) => a.time.localeCompare(b.time));
    if (!messages.length) $('messages').append(emptyState('👋', 'Break the ice.', 'Share a thought, send a file, or just say hello.'));
    let previous = null, lastDate = '';
    for (const message of messages) {
      const day = new Date(message.time).toDateString();
      if (day !== lastDate) { $('messages').append(element('div', 'date-separator', dateLabel(message.time))); previous = null; lastDate = day; }
      if (message.kind === 'system') { $('messages').append(element('p', 'system-message', message.text)); previous = null; continue; }
      const own = message.sender === myName && ['chat', 'file'].includes(message.kind);
      const grouped = previous && previous.sender === message.sender && previous.kind !== 'system' &&
        (previous.kind === 'ai') === (message.kind === 'ai') && new Date(message.time) - new Date(previous.time) < 5 * 60000;
      const row = element('div', 'message-row' + (own ? ' own' : '') + (grouped ? ' grouped' : '') + (message.kind === 'ai' ? ' ai' : ''));
      if (!own && !grouped) row.append(message.kind === 'ai' ? element('span', 'avatar', '✨') : avatar(message.sender));
      const article = element('article', 'message');
      if (!own && !grouped) {
        const name = element('button', 'message-name', message.kind === 'ai' ? '✨ ' + message.sender : message.sender);
        name.type = 'button'; if (message.kind !== 'ai') name.onclick = () => showProfile(message.sender);
        article.append(name);
      }
      if (message.kind === 'file') article.append(fileContent(message));
      else article.append(element('p', 'message-text', message.text));
      const time = element('time', '', new Date(message.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      time.dateTime = message.time; article.tabIndex = 0; article.title = new Date(message.time).toLocaleString(); article.append(time);
      row.append(article); $('messages').append(row); previous = message;
    }
  }
  if (shouldScroll) scrollBottom(); else $('messages').scrollTop = position;
  renderTyping();
}
function fileSize(size) { return size < 1024 ? size + ' B' : size < 1024 * 1024 ? (size / 1024).toFixed(1) + ' KB' : (size / (1024 * 1024)).toFixed(1) + ' MB'; }
function roomAllowed(roomId) {
  return myName && (groups.some(g => g.roomId === roomId && g.members.includes(myName)) || directRooms.some(r => r.roomId === roomId));
}
async function fileURL(roomId, file) {
  const key = roomId + '/' + file.id;
  if (fileURLs.has(key)) return fileURLs.get(key);
  const version = accountVersion;
  const pending = request('file_get', { roomId, fileId: file.id }).then(result => {
    if (version !== accountVersion || !roomAllowed(roomId)) throw new Error('This conversation is no longer available.');
    const url = URL.createObjectURL(new Blob([result.data], { type: result.file.type }));
    fileURLs.set(key, url); return url;
  }).catch(error => { fileURLs.delete(key); throw error; });
  fileURLs.set(key, pending); return pending;
}
function forgetFiles(roomId) {
  for (const [key, value] of fileURLs) {
    if (roomId && !key.startsWith(roomId + '/')) continue;
    if (typeof value === 'string') URL.revokeObjectURL(value);
    fileURLs.delete(key);
  }
  $('lightbox').close(); $('lightbox-image').removeAttribute('src'); $('lightbox-download').removeAttribute('href');
}
function fileContent(message) {
  const { file, roomId } = message;
  const content = element('div');
  if (['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
    const button = element('button', 'image-button'); button.type = 'button'; button.setAttribute('aria-label', 'Open image ' + file.name);
    const status = element('span', 'image-status', 'Loading image…'); button.append(status); content.append(button);
    fileURL(roomId, file).then(url => {
      if (!button.isConnected) return;
      const follow = nearBottom();
      const image = element('img', 'image-preview'); image.onload = () => { if (follow && button.isConnected) scrollBottom(); }; image.src = url; image.alt = file.name;
      image.onerror = () => { button.replaceChildren(element('span', 'image-status', 'Image preview unavailable. Download below.')); };
      button.replaceChildren(image);
      button.onclick = () => {
        if (!roomAllowed(roomId)) return;
        $('lightbox-image').src = url; $('lightbox-image').alt = file.name;
        $('lightbox-name').textContent = file.name;
        $('lightbox-download').href = url; $('lightbox-download').download = file.name;
        $('lightbox').showModal();
      };
    }).catch(error => { if (button.isConnected) { status.textContent = 'Preview unavailable. Click to retry.'; button.onclick = () => { button.replaceWith(fileContent(message)); showError(error); }; } });
  }
  const card = element('div', 'file-card'); card.append(element('span', 'file-icon', '📄'));
  const info = element('span', 'file-info'); info.append(element('strong', '', file.name), element('small', '', fileSize(file.size)));
  const download = element('button', 'file-download', '↓ Download'); download.type = 'button';
  download.onclick = async () => {
    download.disabled = true;
    try {
      const url = await fileURL(roomId, file);
      if (!roomAllowed(roomId)) return;
      const link = element('a'); link.href = url; link.download = file.name; link.click();
    } catch (error) { showError(error); } finally { download.disabled = false; }
  };
  card.append(info, download); content.append(card); return content;
}
async function sendFile(file) {
  if (!activeRoom) return toast('Choose a conversation before sharing a file.', true);
  if (file.size > 5 * 1024 * 1024) return toast('That file is too large. The maximum size is 5 MB.', true);
  const roomId = activeRoom.roomId, version = accountVersion;
  sendingCount++; $('sending-state').hidden = false; $('sending-state').textContent = 'Sending… ' + file.name;
  try {
    const data = await file.arrayBuffer();
    if (version !== accountVersion) return;
    await request('file_send', { roomId, name: file.name, type: file.type || 'application/octet-stream', data });
  } catch (error) { if (version === accountVersion) showError(error); }
  finally { sendingCount = Math.max(0, sendingCount - 1); $('sending-state').hidden = !sendingCount; }
}
$('attach-button').onclick = () => $('file-input').click();
$('file-input').onchange = () => { const file = $('file-input').files[0]; if (file) void sendFile(file); $('file-input').value = ''; };
let dragDepth = 0;
$('chat-window').ondragenter = event => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); dragDepth++; $('drop-hint').hidden = !activeRoom; } };
$('chat-window').ondragover = event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); };
$('chat-window').ondragleave = () => { if (--dragDepth <= 0) { dragDepth = 0; $('drop-hint').hidden = true; } };
$('chat-window').ondrop = event => {
  event.preventDefault(); dragDepth = 0; $('drop-hint').hidden = true;
  const file = event.dataTransfer.files[0]; if (file) void sendFile(file);
};
$('chat-window').onpaste = event => {
  const item = [...(event.clipboardData?.items || [])].find(item => item.kind === 'file' && item.type.startsWith('image/'));
  if (item && activeRoom) { event.preventDefault(); const file = item.getAsFile(); if (file) void sendFile(file); }
};
function renderTyping() {
  const names = [...(typers.get(activeRoom?.roomId) || [])].filter(([, expiry]) => expiry > Date.now()).map(([name]) => name);
  $('typing-indicator').replaceChildren();
  if (names.length) {
    const dots = element('span', 'typing-dots'); dots.setAttribute('aria-hidden', 'true');
    dots.append(element('i'), element('i'), element('i'));
    $('typing-indicator').append(dots, element('span', '', names.join(', ') + (names.length === 1 ? ' is typing' : ' are typing')));
  }
}
function stopTyping() {
  clearTimeout(typingTimer); lastTypingSent = 0;
  if (activeRoom && socket.connected) socket.emit('typing', { roomId: activeRoom.roomId, typing: false });
}
function growComposer() { const input = $('message-input'); input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 140) + 'px'; }
$('message-input').onkeydown = event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('message-form').requestSubmit(); }
};
$('message-input').oninput = () => {
  growComposer(); if (!activeRoom) return;
  if (!$('message-input').value.trim()) return stopTyping();
  if (Date.now() - lastTypingSent > 800) { socket.emit('typing', { roomId: activeRoom.roomId, typing: true }); lastTypingSent = Date.now(); }
  clearTimeout(typingTimer); typingTimer = setTimeout(stopTyping, 1200);
};
const emojis = ['😀','😄','😁','😂','🤣','😊','🙂','😉','😍','🥰','😘','😎','🤔','😅','😭','🥲','😮','😴','🙃','🥳','👍','👎','👏','🙌','🤝','🙏','💪','👋','❤️','🧡','💛','💚','💙','💜','🔥','✨','🎉','🎊','🎯','✅','💯','👀','💬','📚','☕','🍕','🚀','🌟'];
for (const emoji of emojis) {
  const button = element('button', '', emoji); button.type = 'button'; button.setAttribute('aria-label', 'Insert ' + emoji);
  button.onclick = () => {
    const input = $('message-input'); if (input.value.length + emoji.length > 4000) return;
    input.setRangeText(emoji, input.selectionStart, input.selectionEnd, 'end');
    input.dispatchEvent(new Event('input')); input.focus();
  }; $('emoji-picker').append(button);
}
$('emoji-button').onclick = () => { $('emoji-picker').hidden = !$('emoji-picker').hidden; $('emoji-button').setAttribute('aria-expanded', String(!$('emoji-picker').hidden)); };
document.addEventListener('click', event => { if (!$('emoji-picker').contains(event.target) && !$('emoji-button').contains(event.target)) { $('emoji-picker').hidden = true; $('emoji-button').setAttribute('aria-expanded', 'false'); } });
document.addEventListener('keydown', event => { if (event.key === 'Escape') { $('emoji-picker').hidden = true; $('emoji-button').setAttribute('aria-expanded', 'false'); } });
$('message-form').onsubmit = async event => {
  event.preventDefault(); if (!activeRoom || !$('message-input').value.trim()) return;
  const roomId = activeRoom.roomId, version = accountVersion, text = $('message-input').value;
  $('message-input').value = ''; growComposer(); stopTyping();
  try { await request('message_send', { roomId, text }); }
  catch (error) {
    if (version !== accountVersion) return;
    if (activeRoom?.roomId === roomId && !$('message-input').value) { $('message-input').value = text; growComposer(); }
    showError(error);
  }
};
function setAuthMode(create) {
  creatingAccount = create; $('confirm-label').hidden = $('confirm-input').hidden = !create; $('confirm-input').required = create;
  $('password-input').autocomplete = create ? 'new-password' : 'current-password';
  $('login-mode').setAttribute('aria-pressed', String(!create)); $('register-mode').setAttribute('aria-pressed', String(create));
  $('login-button').textContent = create ? 'Create account →' : 'Log in →'; $('login-error').textContent = '';
}
$('login-mode').onclick = () => setAuthMode(false); $('register-mode').onclick = () => setAuthMode(true);
$('password-toggle').onclick = () => {
  const show = $('password-input').type === 'password'; $('password-input').type = show ? 'text' : 'password';
  $('password-toggle').setAttribute('aria-pressed', String(show)); $('password-toggle').setAttribute('aria-label', show ? 'Hide password' : 'Show password');
};
function signedIn(result) {
  accountVersion++; sessionToken = result.token; storeToken(sessionToken);
  myName = result.name; users = result.users; groups = result.groups; directRooms = result.directRooms; profiles = result.profiles;
  unread.clear(); for (const [id, count] of Object.entries(result.unread)) unread.set(id, count);
  lastMessages.clear(); for (const [id, message] of Object.entries(result.lastMessages || {})) lastMessages.set(id, message);
  $('password-input').value = $('confirm-input').value = ''; $('password-input').type = 'password'; $('password-toggle').setAttribute('aria-label', 'Show password'); $('password-toggle').setAttribute('aria-pressed', 'false');
  $('login-screen').hidden = true; $('chat-app').hidden = false; updateIdentity(); renderLists(); renderMessages(true);
}
function signedOut(message) {
  accountVersion++; clearRoom(); forgetFiles();
  myName = ''; users = []; groups = []; directRooms = []; profiles = {};
  histories.clear(); summaries.clear(); unread.clear(); typers.clear(); lastMessages.clear();
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  $('toasts').replaceChildren(); $('sidebar-search').value = ''; $('message-input').value = '';
  $('chat-app').hidden = true; $('login-screen').hidden = false; $('login-error').textContent = message;
  $('sending-state').hidden = true; document.documentElement.style.removeProperty('--accent'); updateTitle();
}
$('login-form').onsubmit = async event => {
  event.preventDefault(); $('login-button').disabled = true; $('login-error').textContent = '';
  try {
    const username = $('name-input').value.trim(), password = $('password-input').value;
    if (!username || [...username].length > 20 || /[|\p{Cc}]/u.test(username)) throw new Error('Use 1–20 characters without | or control characters.');
    if ([...password].length < 6 || [...password].length > 72) throw new Error('Use a password with 6–72 characters.');
    if (creatingAccount && password !== $('confirm-input').value) throw new Error('Passwords do not match.');
    explicitLogin = true; if (!socket.connected) socket.connect();
    signedIn(await request(creatingAccount ? 'register' : 'login', { username, password }));
  } catch (error) { $('login-error').textContent = error.message; }
  finally { explicitLogin = false; $('login-button').disabled = false; }
};
$('logout-button').onclick = async () => {
  try { await request('logout', {}); storeToken(''); sessionToken = ''; signedOut('You have logged out.'); }
  catch (error) { showError(error); }
};
$('group-form').onsubmit = async event => {
  event.preventDefault(); $('group-error').textContent = '';
  const button = $('group-form').querySelector('button'); button.disabled = true;
  try {
    const name = $('group-input').value.trim();
    if (!name || [...name].length > 60 || /\p{Cc}/u.test(name)) throw new Error('Use 1–60 characters without control characters.');
    const result = await request('group_create', { name }); $('group-input').value = '';
    await openRoom({ roomId: result.roomId }, name, 'group');
  } catch (error) { $('group-error').textContent = error.message; showError(error); }
  finally { button.disabled = false; }
};
$('summarize').onclick = async () => {
  if (!activeRoom) return; const roomId = activeRoom.roomId, version = accountVersion; $('summarize').disabled = true;
  try {
    const result = await request('ai_summarize', { roomId });
    if (version !== accountVersion || !roomAllowed(roomId)) return;
    const message = { sender: 'AI Summary · only you', kind: 'ai', text: result.text, time: new Date().toISOString() };
    summaries.set(roomId, [...(summaries.get(roomId) || []), message]);
    if (activeRoom?.roomId === roomId) renderMessages();
  } catch (error) { if (version === accountVersion) showError(error); }
  finally { $('summarize').disabled = !activeRoom; }
};
function renderProfileDraft() {
  $('avatar-preview').replaceChildren(avatar(myName, 'large', false, draftAvatar));
  $('profile-colors').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.color === draftColor)));
}
function editProfile() {
  const profile = profileFor(myName); photoVersion++;
  draftAvatar = profile.avatar; draftColor = profile.color; $('profile-bio').value = profile.bio;
  renderProfileDraft(); $('profile-editor').showModal();
}
$('edit-profile').onclick = editProfile;
for (let index = 0; index < colors.length; index++) {
  const color = colors[index], button = element('button', 'color-option'); button.type = 'button';
  button.style.setProperty('--swatch', color); button.dataset.color = color; button.setAttribute('aria-label', colorNames[index]);
  button.onclick = () => { draftColor = color; renderProfileDraft(); }; $('profile-colors').append(button);
}
$('upload-avatar').onclick = () => $('avatar-input').click();
$('remove-avatar').onclick = () => { photoVersion++; draftAvatar = null; renderProfileDraft(); };
$('avatar-input').onchange = async () => {
  const file = $('avatar-input').files[0]; $('avatar-input').value = ''; if (!file) return;
  const version = ++photoVersion, account = accountVersion;
  if (!file.type.startsWith('image/')) return toast('Choose an image for your profile.', true);
  if (file.size > 5 * 1024 * 1024) return toast('Choose a profile image smaller than 5 MB.', true);
  const url = URL.createObjectURL(file); $('save-profile').disabled = true;
  try {
    const image = new Image(); image.src = url; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const context = canvas.getContext('2d');
    // Fill transparency before making a square JPEG crop.
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, 128, 128);
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 128, 128);
    const photo = canvas.toDataURL('image/jpeg', .85);
    if (photo.length > 60 * 1024) throw new Error('This photo is too detailed. Please choose another image.');
    if (version === photoVersion && account === accountVersion) { draftAvatar = photo; renderProfileDraft(); }
  } catch (error) { if (account === accountVersion) toast('Could not read this image. Try a PNG or JPEG.', true); }
  finally { URL.revokeObjectURL(url); $('save-profile').disabled = false; }
};
$('profile-form').onsubmit = async event => {
  event.preventDefault(); const version = accountVersion; $('save-profile').disabled = true;
  try {
    const bio = $('profile-bio').value;
    if ([...bio].length > 80) throw new Error('Bio must be at most 80 characters.');
    await request('profile_update', { avatar: draftAvatar, bio, color: draftColor });
    if (version === accountVersion) { $('profile-editor').close(); toast('Profile saved'); }
  } catch (error) { if (version === accountVersion) showError(error); }
  finally { $('save-profile').disabled = false; }
};
function renderMembers() {
  const group = groups.find(g => g.roomId === activeRoom?.roomId); $('member-list-content').replaceChildren();
  if (!group) { $('member-list').close(); return; }
  for (const name of group.members) {
    const row = element('li', 'member-row'), button = element('button', 'text-button', name); button.type = 'button';
    button.onclick = () => { $('member-list').close(); showProfile(name); };
    row.append(avatar(name), button, element('small', '', users.includes(name) ? '● Online' : 'Offline'));
    $('member-list-content').append(row);
  }
}
$('room-members').onclick = () => { renderMembers(); $('member-list').showModal(); };
document.querySelectorAll('[data-close]').forEach(button => { button.onclick = () => button.closest('dialog').close(); });
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('close', () => document.body.append($('toasts')));
  dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } }); });
socket.on('users_update', list => { users = list; renderLists(); if ($('member-list').open) renderMembers(); });
socket.on('profiles_update', list => { profiles = list; if (!myName) return; updateIdentity(); renderLists(); renderMessages(); if ($('member-list').open) renderMembers(); });
socket.on('groups_update', list => {
  groups = list;
  if (activeRoom?.kind === 'group' && !groups.some(g => g.roomId === activeRoom.roomId && g.members.includes(myName))) clearRoom();
  const cached = new Set([...histories.keys(), ...unread.keys(), ...lastMessages.keys()]);
  for (const id of cached) {
    if (id.startsWith('group:') && !groups.some(g => g.roomId === id && g.members.includes(myName))) {
      histories.delete(id); summaries.delete(id); unread.delete(id); typers.delete(id); lastMessages.delete(id); forgetFiles(id);
    }
  }
  renderLists(); if ($('member-list').open) renderMembers();
});
socket.on('message_new', message => {
  if (!myName) return;
  const history = histories.get(message.roomId) || []; if (history.some(m => m.id === message.id)) return;
  histories.set(message.roomId, [...history, message].slice(-200)); lastMessages.set(message.roomId, message);
  if (message.roomId.startsWith('dm:') && !directRooms.some(room => room.roomId === message.roomId)) {
    directRooms.push({ roomId: message.roomId, target: message.roomId.slice(3).split('|').find(name => name !== myName) });
  }
  if (activeRoom?.roomId === message.roomId) {
    const wasNearBottom = nearBottom(); socket.emit('room_read', { roomId: message.roomId });
    renderMessages(); if (!wasNearBottom) $('new-messages').hidden = false;
  } else if (message.sender !== myName || !['chat', 'file'].includes(message.kind)) {
    unread.set(message.roomId, (unread.get(message.roomId) || 0) + 1);
  }
  renderLists();
});
socket.on('typing_update', ({ roomId, name, typing }) => {
  const people = typers.get(roomId) || new Map();
  if (typing) people.set(name, Date.now() + 2500); else people.delete(name);
  typers.set(roomId, people); renderTyping();
});
setInterval(renderTyping, 500);
setInterval(() => { if (myName) renderLists(); }, 60000);
socket.on('connect', async () => {
  const token = storedToken(); if (!token || explicitLogin) return;
  $('login-button').disabled = true; sessionToken = token;
  try { signedIn(await request('resume', { token })); }
  catch (error) {
    if (!error.requestTimeout) { storeToken(''); sessionToken = ''; }
    signedOut(error.message);
  } finally { $('login-button').disabled = false; }
});
socket.on('kicked', ({ message }) => {
  if (storedToken() === sessionToken) storeToken(''); sessionToken = ''; signedOut(message);
});
socket.on('disconnect', () => { signedOut(sessionToken ? 'Disconnected. Reconnecting automatically…' : $('login-error').textContent); });
socket.on('connect_error', () => { $('login-error').textContent = 'Cannot reach the server. Check your connection.'; });
renderMessages(true);
