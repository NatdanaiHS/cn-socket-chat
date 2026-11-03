'use strict';
const socket = io();
const $ = id => document.getElementById(id);
let myName = '';
let users = [];
let groups = [];
let directRooms = [];
let creatingAccount = false;
let sessionToken = '';
let explicitLogin = false;
const tokenStorageKey = 'campus-chat-token';
// Private browsing may disable storage; chat still works for the current page.
function storedToken() { try { return localStorage.getItem(tokenStorageKey) || ''; } catch { return ''; } }
function storeToken(token) {
  try { if (token) localStorage.setItem(tokenStorageKey, token); else localStorage.removeItem(tokenStorageKey); } catch {}
}
let activeRoom = null; // { roomId, title, kind }
let openingVersion = 0; // Ignore an old room_open acknowledgement after a newer click.
let typingTimer;
let lastTypingSent = 0;
const histories = new Map();
const summaries = new Map(); // Local-only AI messages; never sent to other users.
const unread = new Map();
const typers = new Map(); // room id -> Map(name, expiry time)

function request(event, payload) {
  return new Promise((resolve, reject) => {
    socket.timeout(event === 'ai_summarize' ? 25000 : 5000)
      .emit(event, payload, (error, result) => {
        if (error) {
          const timeout = new Error('Connection timed out. Please try again.');
          timeout.requestTimeout = true;
          reject(timeout);
        }
        else if (!result.ok) reject(new Error(result.error));
        else resolve(result);
      });
  });
}
function showError(error) { $('app-error').textContent = error.message; }
function dmId(name) { return 'dm:' + [myName, name].sort().join('|'); }
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function badge(roomId) {
  return unread.get(roomId) ? element('span', 'badge', String(unread.get(roomId))) : null;
}
function clearRoom() {
  stopTyping();
  openingVersion++;
  activeRoom = null;
  $('room-title').textContent = 'Choose a conversation';
  $('room-kind').textContent = 'YOUR CONVERSATIONS';
  $('message-input').disabled = $('send-button').disabled = $('summarize').disabled = true;
  renderMessages();
}
function renderLists() {
  $('users').replaceChildren();
  $('user-count').textContent = '(' + users.length + ')';
  for (const name of users) {
    const li = element('li');
    const button = element('button', 'list-button', name + (name === myName ? ' (you)' : ''));
    button.disabled = name === myName;
    const roomId = dmId(name);
    if (activeRoom?.roomId === roomId) button.classList.add('selected');
    const count = badge(roomId);
    if (count) button.append(count);
    button.onclick = () => openRoom({ target: name }, name, 'private');
    li.append(button);
    $('users').append(li);
  }
  $('offline-dms').replaceChildren();
  for (const room of directRooms.filter(room => !users.includes(room.target))) {
    const li = element('li');
    const button = element('button', 'list-button', room.target + ' (offline)');
    const count = badge(room.roomId);
    if (count) button.append(count);
    button.onclick = () => openRoom({ roomId: room.roomId }, room.target, 'private');
    li.append(button);
    $('offline-dms').append(li);
  }
  if (activeRoom?.kind === 'private') {
    $('room-title').textContent = activeRoom.title + (users.includes(activeRoom.title) ? '' : ' (offline)');
  }
  $('groups').replaceChildren();
  for (const group of groups) {
    const joined = group.members.includes(myName);
    const li = element('li', 'group-item');
    const row = element('div', 'group-row');
    const button = element('button', 'list-button', group.name);
    button.disabled = !joined;
    if (activeRoom?.roomId === group.roomId) button.classList.add('selected');
    const count = badge(group.roomId);
    if (count) button.append(count);
    button.onclick = () => openRoom({ roomId: group.roomId }, group.name, 'group');
    const action = element('button', 'small-button', joined ? 'Leave' : 'Join');
    action.onclick = async () => {
      try {
        await request(joined ? 'group_leave' : 'group_join', { roomId: group.roomId });
        if (!joined) await openRoom({ roomId: group.roomId }, group.name, 'group');
      } catch (error) { showError(error); }
    };
    row.append(button, action);
    li.append(row, element('p', 'members', group.members.map(name => name + (group.onlineMembers.includes(name) ? ' (online)' : ' (offline)')).join(', ')));
    $('groups').append(li);
  }
}
async function openRoom(payload, title, kind) {
  stopTyping();
  const version = ++openingVersion;
  try {
    const result = await request('room_open', payload);
    if (version !== openingVersion) return;
    activeRoom = { roomId: result.roomId, title, kind };
    histories.set(result.roomId, result.messages);
    if (kind === 'private' && !directRooms.some(room => room.roomId === result.roomId)) {
      directRooms.push({ roomId: result.roomId, target: title });
    }
    unread.delete(result.roomId);
    $('room-title').textContent = title;
    $('room-kind').textContent = kind === 'group' ? 'GROUP CONVERSATION' : 'PRIVATE CONVERSATION';
    $('message-input').disabled = $('send-button').disabled = $('summarize').disabled = false;
    $('message-input').value = '';
    $('app-error').textContent = '';
    renderLists();
    renderMessages();
    $('message-input').focus();
  } catch (error) { if (version === openingVersion) showError(error); }
}
function renderMessages() {
  $('messages').replaceChildren();
  if (!activeRoom) {
    $('messages').append(element('p', 'empty', 'Choose someone online or join a group to start chatting.'));
  } else {
    const messages = [...(histories.get(activeRoom.roomId) || []),
      ...(summaries.get(activeRoom.roomId) || [])].sort((a, b) => a.time.localeCompare(b.time));
    if (!messages.length) $('messages').append(element('p', 'empty', 'Start the conversation. Say hello!'));
    for (const message of messages) {
      const own = message.sender === myName && message.kind === 'chat';
      const article = element('article', 'message' + (own ? ' own' : '') + (message.kind === 'ai' ? ' ai' : ''));
      const meta = element('div', 'message-meta');
      const time = element('time', '', new Date(message.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      time.dateTime = message.time;
      meta.append(element('strong', '', message.sender), time);
      article.append(meta, element('p', 'message-text', message.text));
      $('messages').append(article);
    }
  }
  $('messages').scrollTop = $('messages').scrollHeight;
  renderTyping();
}
function renderTyping() {
  const names = [...(typers.get(activeRoom?.roomId) || [])]
    .filter(([, expiry]) => expiry > Date.now()).map(([name]) => name);
  $('typing-indicator').textContent = names.length ? names.join(', ') + ' is typing…' : '';
}
function stopTyping() {
  clearTimeout(typingTimer);
  lastTypingSent = 0;
  if (activeRoom && socket.connected) socket.emit('typing', { roomId: activeRoom.roomId, typing: false });
}
function setAuthMode(create) {
  creatingAccount = create;
  $('confirm-label').hidden = $('confirm-input').hidden = !create;
  $('confirm-input').required = create;
  $('password-input').autocomplete = create ? 'new-password' : 'current-password';
  $('login-mode').setAttribute('aria-pressed', String(!create));
  $('register-mode').setAttribute('aria-pressed', String(create));
  $('login-button').textContent = create ? 'Create account →' : 'Log in →';
  $('login-error').textContent = '';
}
$('login-mode').onclick = () => setAuthMode(false);
$('register-mode').onclick = () => setAuthMode(true);
function signedIn(result) {
  sessionToken = result.token;
  storeToken(sessionToken);
  myName = result.name;
  users = result.users;
  groups = result.groups;
  directRooms = result.directRooms;
  unread.clear();
  for (const [roomId, count] of Object.entries(result.unread)) unread.set(roomId, count);
  $('password-input').value = $('confirm-input').value = '';
  $('my-name').textContent = myName;
  $('login-screen').hidden = true;
  $('chat-app').hidden = false;
  renderLists();
}
function signedOut(message) {
  clearRoom();
  myName = ''; users = []; groups = []; directRooms = [];
  histories.clear(); summaries.clear(); unread.clear(); typers.clear();
  $('chat-app').hidden = true;
  $('login-screen').hidden = false;
  $('login-error').textContent = message;
}
$('login-form').onsubmit = async event => {
  event.preventDefault();
  $('login-button').disabled = true;
  $('login-error').textContent = '';
  try {
    if (creatingAccount && $('password-input').value !== $('confirm-input').value) {
      throw new Error('Passwords do not match.');
    }
    // A server kick stops automatic reconnection; an explicit login starts it again.
    explicitLogin = true;
    if (!socket.connected) socket.connect();
    const result = await request(creatingAccount ? 'register' : 'login', {
      username: $('name-input').value, password: $('password-input').value
    });
    signedIn(result);
  } catch (error) { $('login-error').textContent = error.message; }
  finally { explicitLogin = false; $('login-button').disabled = false; }
};
$('logout-button').onclick = async () => {
  try {
    await request('logout', {});
    storeToken(''); sessionToken = '';
    signedOut('You have logged out.');
  } catch (error) { showError(error); }
};
$('group-form').onsubmit = async event => {
  event.preventDefault();
  try {
    const name = $('group-input').value.trim();
    const result = await request('group_create', { name });
    $('group-input').value = '';
    await openRoom({ roomId: result.roomId }, name, 'group');
  } catch (error) { showError(error); }
};
$('message-form').onsubmit = async event => {
  event.preventDefault();
  if (!activeRoom || !$('message-input').value.trim()) return;
  const roomId = activeRoom.roomId;
  const text = $('message-input').value;
  $('message-input').value = '';
  stopTyping();
  try { await request('message_send', { roomId, text }); $('app-error').textContent = ''; }
  catch (error) {
    if (activeRoom?.roomId === roomId && !$('message-input').value) $('message-input').value = text;
    showError(error);
  }
};
$('message-input').oninput = () => {
  if (!activeRoom) return;
  if (Date.now() - lastTypingSent > 800) {
    socket.emit('typing', { roomId: activeRoom.roomId, typing: true });
    lastTypingSent = Date.now();
  }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(stopTyping, 1200);
};
$('summarize').onclick = async () => {
  if (!activeRoom) return;
  const roomId = activeRoom.roomId;
  $('summarize').disabled = true;
  try {
    const result = await request('ai_summarize', { roomId });
    const message = { sender: 'AI Summary · only you', kind: 'ai', text: result.text, time: new Date().toISOString() };
    summaries.set(roomId, [...(summaries.get(roomId) || []), message]);
    if (activeRoom?.roomId === roomId) renderMessages();
  } catch (error) { showError(error); }
  finally { $('summarize').disabled = !activeRoom; }
};
// Presence changes never discard account-owned DM histories.
socket.on('users_update', list => {
  users = list;
  renderLists();
});
// Membership metadata is visible to everyone; cached messages require membership.
socket.on('groups_update', list => {
  groups = list;
  if (activeRoom?.kind === 'group' && !groups.some(g => g.roomId === activeRoom.roomId && g.members.includes(myName))) clearRoom();
  for (const roomId of histories.keys()) {
    if (roomId.startsWith('group:') && !groups.some(g => g.roomId === roomId && g.members.includes(myName))) {
      histories.delete(roomId); summaries.delete(roomId); unread.delete(roomId); typers.delete(roomId);
    }
  }
  renderLists();
});
// One server echo represents a sent message as well as an incoming message.
socket.on('message_new', message => {
  const history = histories.get(message.roomId) || [];
  if (history.some(m => m.id === message.id)) return;
  histories.set(message.roomId, [...history, message].slice(-200));
  if (message.roomId.startsWith('dm:') && !directRooms.some(room => room.roomId === message.roomId)) {
    const target = message.roomId.slice(3).split('|').find(name => name !== myName);
    directRooms.push({ roomId: message.roomId, target });
  }
  if (activeRoom?.roomId === message.roomId) {
    socket.emit('room_read', { roomId: message.roomId });
    renderMessages();
  }
  else {
    if (message.sender !== myName || message.kind !== 'chat') {
      unread.set(message.roomId, (unread.get(message.roomId) || 0) + 1);
    }
    renderLists();
  }
});
// Typing notifications are transient and never added to message history.
socket.on('typing_update', ({ roomId, name, typing }) => {
  const people = typers.get(roomId) || new Map();
  if (typing) people.set(name, Date.now() + 2500);
  else people.delete(name);
  typers.set(roomId, people);
  renderTyping();
});
setInterval(renderTyping, 500);
// Reconnect with the saved credential; a transport disconnect keeps it intact.
socket.on('connect', async () => {
  const token = storedToken();
  if (!token || explicitLogin) return;
  $('login-button').disabled = true;
  sessionToken = token;
  try { signedIn(await request('resume', { token })); }
  catch (error) {
    // A network interruption does not revoke the saved server-side session.
    if (!error.requestTimeout) { storeToken(''); sessionToken = ''; }
    signedOut(error.message);
  }
  finally { $('login-button').disabled = false; }
});
socket.on('kicked', ({ message }) => {
  if (storedToken() === sessionToken) storeToken('');
  sessionToken = '';
  signedOut(message);
});
socket.on('disconnect', () => {
  signedOut(sessionToken ? 'Disconnected. Reconnecting automatically…' : $('login-error').textContent);
});
socket.on('connect_error', () => {
  $('login-error').textContent = 'Cannot reach the server. Check your connection.';
});
