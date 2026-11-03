'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { io: connect } = require('socket.io-client');
const { createChatServer } = require('../server');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function request(socket, event, payload) {
  return new Promise((resolve, reject) => {
    socket.timeout(3000).emit(event, payload, (error, result) => {
      if (error) reject(error); else resolve(result);
    });
  });
}
async function waitUntil(check, description) {
  const deadline = Date.now() + 3000;
  while (!check()) {
    if (Date.now() > deadline) throw new Error('Timed out: ' + description);
    await delay(10);
  }
}
async function main() {
  // An explicit empty key prevents accidental paid API calls even if .env has a key.
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cn-chat-test-'));
  const dataFile = path.join(directory, 'chat-data.json');
  let instance = createChatServer({ apiKey: '', dataFile });
  let { server, io } = instance;
  const clients = [];
  const events = new Map();
  try {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    let url = 'http://127.0.0.1:' + server.address().port;
    for (const file of ['/', '/client.js', '/style.css', '/socket.io/socket.io.js']) {
      const response = await fetch(url + file);
      assert.equal(response.status, 200, 'Static asset served: ' + file);
      assert.ok((await response.text()).length > 0);
    }
    async function client() {
      const socket = connect(url, { forceNew: true, reconnection: false, transports: ['websocket'] });
      clients.push(socket);
      const log = { messages: [], typing: [], users: [], groups: [] };
      events.set(socket, log);
      socket.on('message_new', m => log.messages.push(m));
      socket.on('typing_update', t => log.typing.push(t));
      socket.on('users_update', u => { log.users = u; });
      socket.on('groups_update', g => { log.groups = g; });
      await once(socket, 'connect');
      return socket;
    }
    let alice = await client();
    const bob = await client(), carol = await client(), guest = await client();
    assert.equal((await request(guest, 'group_create', { name: 'No login' })).ok, false);
    const aliceRegistration = await request(alice, 'register', { username: ' Alice ', password: 'Alice-secret-123' });
    assert.equal(aliceRegistration.ok, true);
    assert.equal(aliceRegistration.name, 'Alice');
    let aliceToken = aliceRegistration.token;
    assert.match(aliceToken, /^[A-Za-z0-9_-]{43}$/);
    assert.equal((await request(bob, 'register', { username: 'Bob', password: 'Bob-secret-123' })).ok, true);
    assert.equal((await request(carol, 'register', { username: 'Carol', password: 'Carol-secret-123' })).ok, true);
    for (const name of ['', ' '.repeat(3), 'x'.repeat(21), 'aLiCe', 'a|b', 'a\u0000b']) {
      const result = await request(guest, 'register', { username: name, password: 'Valid-password' });
      assert.equal(result.ok, false, 'R3 must reject invalid/duplicate names');
      assert.equal(typeof result.error, 'string');
    }
    for (const password of ['short', 'x'.repeat(73)]) {
      assert.equal((await request(guest, 'register', { username: 'BadPassword', password })).ok, false);
    }
    const wrong = await request(guest, 'login', { username: 'Alice', password: 'Wrong-password' });
    const missing = await request(guest, 'login', { username: 'Nobody', password: 'Wrong-password' });
    assert.equal(wrong.error, 'Incorrect username or password');
    assert.equal(missing.error, wrong.error);
    for (let i = 1; i < 5; i++) await request(guest, 'login', { username: 'Nobody', password: 'Wrong-password' });
    assert.match((await request(guest, 'login', { username: 'NOBODY', password: 'Wrong-password' })).error, /5 minutes/);
    alice.disconnect();
    alice = await client();
    assert.equal((await request(alice, 'resume', { token: aliceToken })).ok, true);
    assert.equal((await request(alice, 'logout', {})).ok, true);
    assert.equal((await request(alice, 'resume', { token: aliceToken })).ok, false);
    assert.equal((await request(alice, 'group_create', { name: 'Logged out' })).ok, false);
    const loggedIn = await request(alice, 'login', { username: 'aLiCe', password: 'Alice-secret-123' });
    assert.equal(loggedIn.ok, true);
    const kicked = once(alice, 'kicked');
    const disconnected = once(alice, 'disconnect');
    const replacement = await client();
    const secondLogin = await request(replacement, 'login', { username: 'Alice', password: 'Alice-secret-123' });
    assert.equal(secondLogin.ok, true);
    assert.equal((await kicked)[0].message, 'Logged in from another place');
    await disconnected;
    assert.equal((await request(guest, 'resume', { token: loggedIn.token })).ok, false);
    alice = replacement;
    aliceToken = secondLogin.token;
    await waitUntil(() => [alice, bob, carol].every(s => events.get(s).users.length === 3), 'R4 lists');
    for (const socket of [alice, bob, carol]) {
      assert.deepEqual(events.get(socket).users.slice().sort(), ['Alice', 'Bob', 'Carol']);
    }
    const opened = await request(alice, 'room_open', { target: 'Bob' });
    const dm = opened.roomId;
    assert.equal(dm, 'dm:Alice|Bob', 'R5 deterministic private room');
    assert.equal((await request(alice, 'room_open', { target: 'Nobody' })).ok, false);
    assert.equal((await request(carol, 'room_open', { roomId: dm })).ok, false);
    assert.equal((await request(carol, 'message_send', { roomId: dm, text: 'Intrude' })).ok, false);
    assert.equal((await request(alice, 'message_send', { roomId: dm, text: 'Private hello' })).ok, true);
    await waitUntil(() => events.get(bob).messages.length === 1 && events.get(alice).messages.length === 1, 'R7 DM delivery');
    await delay(100); // Allow a forbidden delivery time to arrive before negative assertions.
    assert.equal(events.get(carol).messages.length, 0, 'R7 third client cannot receive a DM');
    assert.equal(events.get(guest).messages.length, 0);
    assert.equal((await request(bob, 'room_open', { target: 'Alice' })).messages[0].text, 'Private hello');
    await request(alice, 'typing', { roomId: dm, typing: true });
    await waitUntil(() => events.get(bob).typing.some(t => t.roomId === dm && t.typing), 'DM typing');
    assert.equal(events.get(carol).typing.length, 0);
    assert.equal(events.get(alice).typing.some(t => t.typing), false, 'Typing excludes its sender');

    // Forged membership fields are ignored: creating a group only joins the creator.
    const made = await request(alice, 'group_create', { name: 'Study', members: ['Bob', 'Carol'] });
    const group = made.roomId;
    assert.equal(group, 'group:Study');
    await waitUntil(() => [alice, bob, carol].every(s => events.get(s).groups.length === 1), 'R9 shared group list');
    for (const socket of [alice, bob, carol]) {
      assert.deepEqual(events.get(socket).groups[0].members, ['Alice'], 'R8 creator only / R9 members');
    }
    assert.equal((await request(bob, 'group_create', { name: 'study' })).ok, false);
    assert.equal((await request(bob, 'group_create', { name: '' })).ok, false);
    assert.equal((await request(carol, 'room_open', { roomId: group })).ok, false);
    assert.equal((await request(carol, 'ai_summarize', { roomId: group })).ok, false);
    assert.equal((await request(carol, 'typing', { roomId: group, typing: true })).ok, false);
    assert.equal((await request(carol, 'message_send', { roomId: group, text: 'Intrude' })).ok, false);
    // R10 has no add-others event; verify the actual registered server handlers.
    const handlers = io.sockets.sockets.get(alice.id).eventNames();
    assert.equal(handlers.some(name => /add|invite/i.test(String(name))), false);
    assert.equal((await request(bob, 'group_join', { roomId: group, target: 'Carol' })).ok, true);
    await waitUntil(() => events.get(carol).groups[0].members.length === 2, 'R10 self join');
    assert.deepEqual(events.get(carol).groups[0].members.slice().sort(), ['Alice', 'Bob']);
    await request(alice, 'message_send', { roomId: group, text: 'Members only' });
    await waitUntil(() => events.get(bob).messages.some(m => m.roomId === group), 'R11 member delivery');
    await delay(100);
    assert.equal(events.get(alice).messages.filter(m => m.roomId === group).length, 1);
    assert.equal(events.get(carol).messages.length, 0, 'R11 non-member gets no group messages');
    assert.equal((await request(bob, 'room_open', { roomId: group })).messages[0].text, 'Members only');
    await request(alice, 'typing', { roomId: group, typing: true });
    await waitUntil(() => events.get(bob).typing.some(t => t.roomId === group && t.typing), 'Group typing');
    assert.equal(events.get(carol).typing.length, 0);

    // No Gemini network request: missing-key errors must be friendly and nonfatal.
    const summary = await request(alice, 'ai_summarize', { roomId: group });
    assert.equal(summary.ok, false);
    assert.match(summary.error, /no Gemini API key/);
    await request(alice, 'message_send', { roomId: group, text: '@ai Explain TCP' });
    await waitUntil(() => events.get(bob).messages.some(m => m.sender === 'AI Bot'), 'AI fallback');
    assert.equal(events.get(carol).messages.length, 0);

    for (let i = 0; i < 205; i++) {
      assert.equal((await request(alice, 'message_send', { roomId: group, text: 'History ' + i })).ok, true);
    }
    const history = await request(bob, 'room_open', { roomId: group });
    assert.equal(history.messages.length, 200);
    assert.equal(history.messages.at(-1).text, 'History 204');
    assert.equal((await request(bob, 'group_leave', { roomId: group })).ok, true);
    assert.equal((await request(bob, 'room_open', { roomId: group })).ok, false);
    const before = events.get(bob).messages.length;
    await request(alice, 'message_send', { roomId: group, text: 'After leave' });
    await delay(100);
    assert.equal(events.get(bob).messages.length, before, 'Leaving removes live room delivery');
    alice.disconnect();
    await waitUntil(() => events.get(carol).groups.length === 1 && events.get(carol).users.length === 2, 'Persistent membership / R4 offline removal');
    assert.deepEqual(events.get(carol).groups[0].members, ['Alice']);
    assert.deepEqual(events.get(carol).groups[0].onlineMembers, []);
    assert.equal((await request(bob, 'room_open', { roomId: dm })).ok, true);
    assert.equal((await request(bob, 'message_send', { roomId: dm, text: 'Offline hello' })).ok, true);
    alice = await client();
    const resumed = await request(alice, 'resume', { token: aliceToken });
    assert.equal(resumed.ok, true);
    assert.equal(resumed.unread[dm], 1, 'Offline DM has unread badge');
    assert.equal((await request(alice, 'room_open', { roomId: dm })).messages.at(-1).text, 'Offline hello');
    assert.equal((await request(alice, 'room_open', { roomId: group })).messages.at(-1).text, 'After leave');
    await request(alice, 'message_send', { roomId: group, text: 'Rejoined transport' });
    await waitUntil(() => events.get(alice).messages.some(m => m.text === 'Rejoined transport'), 'Resume restores Socket.IO group membership');
    assert.equal((await request(carol, 'room_open', { roomId: group })).ok, false);

    // An offline unread message must survive a full process-state reload too.
    alice.disconnect();
    await waitUntil(() => !events.get(bob).users.includes('Alice'), 'Offline before restart');
    await request(bob, 'message_send', { roomId: dm, text: 'Unread across restart' });

    // Debounced writes happen without closing the server. Rename leaves no temp file.
    await delay(650);
    const debounced = JSON.parse(await fs.readFile(dataFile, 'utf8'));
    assert.equal(debounced.histories.find(([id]) => id === dm)[1].at(-1).text, 'Unread across restart');
    await assert.rejects(fs.access(dataFile + '.tmp'), { code: 'ENOENT' });

    // Close flushes pending writes; create an entirely new server using the same file.
    clients.forEach(socket => socket.disconnect());
    await new Promise(resolve => io.close(resolve));
    const savedText = await fs.readFile(dataFile, 'utf8');
    for (const secret of ['Alice-secret-123', 'Bob-secret-123', 'Carol-secret-123', aliceToken]) {
      assert.equal(savedText.includes(secret), false, 'Only hashes are stored');
    }
    const saved = JSON.parse(savedText);
    assert.equal(saved.accounts[0].salt.length, 32);
    assert.equal(saved.accounts[0].passwordHash.length, 128);
    assert.notEqual(saved.accounts[0].salt, saved.accounts[1].salt, 'Each account has a random salt');
    assert.ok(saved.sessions.every(([hash, session]) => /^[a-f0-9]{64}$/.test(hash) && session.expiresAt > Date.now()));
    assert.equal(saved.histories.find(([id]) => id === group)[1].length, 200);
    instance = createChatServer({ apiKey: '', dataFile });
    ({ server, io } = instance);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    url = 'http://127.0.0.1:' + server.address().port;
    const restoredAlice = await client(), restoredBob = await client(), restoredCarol = await client();
    const restored = await request(restoredAlice, 'resume', { token: aliceToken });
    assert.equal(restored.ok, true, 'Sessions survive restart');
    assert.equal(restored.unread[dm], 1, 'Offline unread count persists across restart');
    assert.deepEqual(restored.groups[0].members, ['Alice']);
    assert.equal(restored.groups[0].creator, 'Alice');
    assert.equal((await request(restoredBob, 'register', { username: 'ALICE', password: 'Other-secret' })).ok, false);
    assert.equal((await request(restoredBob, 'login', { username: 'Bob', password: 'Bob-secret-123' })).ok, true);
    assert.equal((await request(restoredCarol, 'login', { username: 'Carol', password: 'Carol-secret-123' })).ok, true);
    assert.equal((await request(restoredAlice, 'room_open', { target: 'Bob' })).messages.at(-1).text, 'Unread across restart');
    assert.equal((await request(restoredAlice, 'room_open', { roomId: group })).messages.at(-1).text, 'Rejoined transport');
    assert.equal((await request(restoredCarol, 'room_open', { roomId: dm })).ok, false);
    assert.equal((await request(restoredCarol, 'room_open', { roomId: group })).ok, false);
    await request(restoredAlice, 'message_send', { roomId: group, text: 'After restart' });
    await waitUntil(() => events.get(restoredAlice).messages.some(m => m.text === 'After restart'), 'Restart restores Socket.IO group room');
    await request(restoredBob, 'group_join', { roomId: group });
    const countBeforeLogout = events.get(restoredAlice).messages.length;
    assert.equal((await request(restoredAlice, 'logout', {})).ok, true);
    assert.equal((await request(restoredAlice, 'resume', { token: aliceToken })).ok, false);
    await request(restoredBob, 'message_send', { roomId: group, text: 'While logged out' });
    await delay(100);
    assert.equal(events.get(restoredAlice).messages.length, countBeforeLogout, 'Logout removes group transport subscription');
    assert.equal((await request(restoredAlice, 'room_read', { roomId: group })).ok, false);
    assert.equal((await request(restoredAlice, 'login', { username: 'Alice', password: 'Alice-secret-123' })).ok, true);
    assert.equal((await request(restoredAlice, 'room_open', { roomId: group })).messages.at(-1).text, 'While logged out');
    await request(restoredBob, 'group_leave', { roomId: group });
    assert.equal((await request(restoredAlice, 'group_leave', { roomId: group })).ok, true);
    await waitUntil(() => events.get(restoredCarol).groups.length === 0, 'Last member leaving deletes group');
    console.log('PASS: R3–R11 privacy, accounts, sessions, kicks, brute-force limit, offline DMs, persistent groups/history, AI fallback, and restart.');
  } finally {
    clients.forEach(socket => socket.disconnect());
    await new Promise(resolve => io.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
