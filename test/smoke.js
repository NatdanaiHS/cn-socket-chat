'use strict';
const assert = require('node:assert/strict');
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
  const { server, io } = createChatServer({ apiKey: '' });
  const clients = [];
  const events = new Map();
  try {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const url = 'http://127.0.0.1:' + server.address().port;
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
    const alice = await client(), bob = await client(), carol = await client(), guest = await client();
    assert.equal((await request(guest, 'group_create', { name: 'No login' })).ok, false);
    assert.equal((await request(alice, 'login', { name: 'Alice' })).ok, true);
    assert.equal((await request(bob, 'login', { name: 'Bob' })).ok, true);
    assert.equal((await request(carol, 'login', { name: 'Carol' })).ok, true);
    for (const name of ['', ' '.repeat(3), 'x'.repeat(21), 'aLiCe']) {
      const result = await request(guest, 'login', { name });
      assert.equal(result.ok, false, 'R3 must reject invalid/duplicate names');
      assert.equal(typeof result.error, 'string');
    }
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
    await waitUntil(() => events.get(carol).groups.length === 0 && events.get(carol).users.length === 2, 'Disconnect cleanup');
    assert.equal((await request(bob, 'room_open', { roomId: dm })).ok, false);
    console.log('PASS: R3–R11, DM/group privacy, typing, history limit, AI fallback, and disconnect cleanup.');
  } finally {
    clients.forEach(socket => socket.disconnect());
    await new Promise(resolve => io.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
