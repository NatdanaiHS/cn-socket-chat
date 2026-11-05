'use strict';
// Group delete and clear-chat permissions: who may do what, who gets told, and what survives a restart.
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
async function main() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cn-chat-delete-'));
  const dataFile = path.join(directory, 'chat-data.json');
  let instance = createChatServer({ apiKey: '', dataFile });
  const clients = [];
  async function start() {
    instance.server.listen(0, '127.0.0.1');
    await once(instance.server, 'listening');
    return 'http://127.0.0.1:' + instance.server.address().port;
  }
  let url = await start();
  async function user(name) {
    const socket = connect(url, { forceNew: true, reconnection: false, transports: ['websocket'] });
    clients.push(socket);
    const log = { deleted: [], cleared: [], messages: [] };
    socket.on('group_deleted', e => log.deleted.push(e));
    socket.on('room_cleared', e => log.cleared.push(e));
    socket.on('message_new', m => log.messages.push(m));
    socket.log = log;
    await once(socket, 'connect');
    let result = await request(socket, 'register', { username: name, password: name + '-secret-1' });
    if (!result.ok) result = await request(socket, 'login', { username: name, password: name + '-secret-1' });
    assert.equal(result.ok, true, 'login ' + name);
    return socket;
  }
  try {
    const owner = await user('Owner'), member = await user('Member'), outsider = await user('Outsider');
    const { roomId: group } = await request(owner, 'group_create', { name: 'Doomed' });
    await request(member, 'group_join', { roomId: group });
    await request(owner, 'message_send', { roomId: group, text: 'before clear' });
    const upload = await request(owner, 'file_send', { roomId: group, name: 'a.txt', type: 'text/plain', data: Buffer.from('x') });
    const filePath = path.join(directory, 'uploads', upload.message.file.id);
    await fs.access(filePath);

    // Clear for everyone: creator only, groups only, members notified, files removed.
    assert.equal((await request(member, 'room_clear', { roomId: group, scope: 'everyone' })).ok, false, 'Non-creator cannot clear for everyone');
    assert.equal((await request(outsider, 'room_clear', { roomId: group, scope: 'me' })).ok, false, 'Outsider cannot clear');
    assert.equal((await request(owner, 'room_clear', { roomId: group, scope: 'everyone' })).ok, true);
    await delay(100);
    assert.equal(member.log.cleared.length, 1, 'Member told about clear');
    assert.equal(outsider.log.cleared.length, 0, 'Outsider not told about clear');
    await assert.rejects(fs.access(filePath), { code: 'ENOENT' });
    const afterClear = (await request(member, 'room_open', { roomId: group })).messages;
    assert.deepEqual(afterClear.map(m => m.kind), ['system'], 'Only the "cleared" notice remains');

    // Clear for me: hides history for that user only, and survives a restart.
    await request(owner, 'message_send', { roomId: group, text: 'old for member' });
    await delay(5);
    assert.equal((await request(member, 'room_clear', { roomId: group, scope: 'me' })).ok, true);
    await delay(5);
    await request(owner, 'message_send', { roomId: group, text: 'new for member' });
    const memberView = (await request(member, 'room_open', { roomId: group })).messages.map(m => m.text);
    assert.deepEqual(memberView, ['new for member'], 'Clear for me hides older messages');
    assert.ok((await request(owner, 'room_open', { roomId: group })).messages.some(m => m.text === 'old for member'), 'Others keep history');

    // DMs: clear for me works, clear for everyone is refused.
    const { roomId: dm } = await request(owner, 'room_open', { target: 'Member' });
    await request(owner, 'message_send', { roomId: dm, text: 'private' });
    assert.equal((await request(member, 'room_clear', { roomId: dm, scope: 'everyone' })).ok, false, 'DM cannot be cleared for everyone');
    assert.equal((await request(member, 'room_clear', { roomId: dm, scope: 'me' })).ok, true);
    assert.equal((await request(member, 'room_open', { roomId: dm })).messages.length, 0);
    assert.equal((await request(owner, 'room_open', { roomId: dm })).messages.length, 1, 'Other DM participant keeps the message');

    // Restart: clearedAt persisted.
    clients.forEach(s => s.disconnect()); clients.length = 0;
    instance.flush();
    await new Promise(resolve => instance.io.close(resolve));
    instance = createChatServer({ apiKey: '', dataFile });
    url = await start();
    const member2 = await user('Member'), owner2 = await user('Owner'), outsider2 = await user('Outsider');
    assert.deepEqual((await request(member2, 'room_open', { roomId: group })).messages.map(m => m.text), ['new for member'], 'Clear for me survives restart');

    // Delete group: creator only; members (not outsiders) notified; group and files gone.
    const upload2 = await request(owner2, 'file_send', { roomId: group, name: 'b.txt', type: 'text/plain', data: Buffer.from('y') });
    assert.equal((await request(member2, 'group_delete', { roomId: group })).ok, false, 'Non-creator cannot delete');
    assert.equal((await request(owner2, 'group_delete', { roomId: group })).ok, true);
    await delay(100);
    assert.equal(member2.log.deleted[0]?.name, 'Doomed', 'Member told about delete');
    assert.equal(outsider2.log.deleted.length, 0, 'Outsider not told about delete');
    await assert.rejects(fs.access(path.join(directory, 'uploads', upload2.message.file.id)), { code: 'ENOENT' });
    assert.equal((await request(member2, 'room_open', { roomId: group })).ok, false, 'Deleted group is gone');
    assert.equal((await request(owner2, 'message_send', { roomId: group, text: 'ghost' })).ok, false);
    console.log('PASS: group delete and clear-chat permissions, notifications, file cleanup and persistence.');
  } finally {
    clients.forEach(socket => socket.disconnect());
    await new Promise(resolve => instance.io.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
