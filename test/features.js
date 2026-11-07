'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { io: connect } = require('socket.io-client');
const { createChatServer } = require('../server');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const request = (socket, event, payload) => new Promise((resolve, reject) => socket.timeout(3000).emit(event, payload, (error, result) => error ? reject(error) : resolve(result)));
async function main() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cn-chat-features-'));
  const dataFile = path.join(directory, 'chat.json'), clients = [];
  let instance = createChatServer({ apiKey: '', dataFile }), url;
  async function start() { instance.server.listen(0, '127.0.0.1'); await once(instance.server, 'listening'); url = 'http://127.0.0.1:' + instance.server.address().port; }
  async function client() {
    const socket = connect(url, { forceNew: true, reconnection: false, transports: ['websocket'] }); clients.push(socket);
    socket.log = { messages: [], updates: [], typing: [], reads: [], groups: [] };
    for (const [event, key] of Object.entries({ message_new: 'messages', message_update: 'updates', typing_update: 'typing', read_update: 'reads' })) socket.on(event, value => socket.log[key].push(value));
    socket.on('groups_update', value => { socket.log.groups = value; });
    await once(socket, 'connect'); return socket;
  }
  const ok = async (s, event, payload) => { const r = await request(s, event, payload); assert.equal(r.ok, true, event + ': ' + r.error); return r; };
  const deny = async (s, event, payload) => assert.equal((await request(s, event, payload)).ok, false, event + ' denied');
  const history = async (s, roomId) => (await ok(s, 'room_open', { roomId, read: false })).messages;
  try {
    await start();
    let a = await client(), b = await client(); const outsider = await client(), guest = await client();
    const ar = await ok(a, 'register', { username: 'Alice', password: 'secret123' });
    const br = await ok(b, 'register', { username: 'Bob Smith', password: 'secret123' });
    await ok(outsider, 'register', { username: 'Carol', password: 'secret123' });
    const group = (await ok(a, 'group_create', { name: 'Legacy' })).roomId;
    await ok(b, 'group_join', { roomId: group });
    await ok(a, 'message_send', { roomId: group, text: 'Legacy general history' });
    // Simulate a genuine old data file before channels existed, then reload it.
    clients.forEach(s => s.disconnect()); await new Promise(r => instance.io.close(r));
    const legacy = JSON.parse(await fs.readFile(dataFile, 'utf8')); delete legacy.channels;
    await fs.writeFile(dataFile, JSON.stringify(legacy));
    instance = createChatServer({ apiKey: '', dataFile }); await start();
    a = await client(); b = await client(); const c = await client(), g = await client();
    await ok(a, 'resume', { token: ar.token }); await ok(b, 'resume', { token: br.token });
    await ok(c, 'login', { username: 'Carol', password: 'secret123' });
    assert.equal((await history(a, group)).at(-1).text, 'Legacy general history');
    const channel = (await ok(b, 'channel_create', { groupId: group, name: '  Study Room  ' })).roomId;
    const other = (await ok(a, 'channel_create', { groupId: group, name: 'other' })).roomId;
    await delay(30);
    assert.deepEqual(a.log.groups[0].channels.map(ch => ch.name), ['general', 'study-room', 'other']);
    assert.equal(Object.hasOwn(c.log.groups[0], 'channels'), false, 'Channel names stay private');
    for (const name of ['general', 'STUDY ROOM', '', 'bad!', 'a'.repeat(31)]) await deny(a, 'channel_create', { groupId: group, name });
    await deny(c, 'channel_create', { groupId: group, name: 'hidden' });
    await deny(g, 'channel_create', { groupId: group, name: 'hidden' });
    await deny(b, 'channel_delete', { roomId: channel }); await deny(a, 'channel_delete', { roomId: group });
    for (const s of [c, g]) for (const [event, payload] of [
      ['room_open', {}], ['room_read', {}], ['message_send', { text: 'intrude' }], ['typing', { typing: true }],
      ['file_send', { name: 'x', data: Buffer.from('x') }], ['file_get', { fileId: 'x' }], ['ai_summarize', {}],
      ['channel_delete', {}], ['message_unsend', { messageId: 'x' }]
    ]) await deny(s, event, { roomId: channel, ...payload });
    await ok(a, 'message_send', { roomId: channel, text: 'private channel' });
    const original = (await history(b, channel)).at(-1);
    assert.equal((await history(a, other)).length, 0, 'Histories are per-channel');
    await ok(a, 'typing', { roomId: channel, typing: true });
    await delay(30);
    assert.ok(b.log.typing.some(t => t.roomId === channel && t.typing));
    assert.equal(a.log.typing.some(t => t.roomId === channel && t.typing), false, 'Typing excludes sender');
    assert.equal(c.log.typing.length, 0); assert.equal(c.log.messages.length, 0);
    assert.equal(b.log.messages.filter(m => m.roomId === channel).length, 1);
    const file = (await ok(a, 'file_send', { roomId: channel, name: 'notes.txt', data: Buffer.from('private'), replyTo: original.id })).message;
    assert.equal(file.reply.id, original.id);
    for (const s of [c, g]) await deny(s, 'file_get', { roomId: channel, fileId: file.file.id });
    await deny(a, 'file_get', { roomId: other, fileId: file.file.id });
    await ok(b, 'message_send', { roomId: channel, text: 'reply', replyTo: file.id });
    const reply = (await history(b, channel)).at(-1); assert.equal(reply.reply.text, 'notes.txt');
    await deny(b, 'message_unsend', { roomId: channel, messageId: file.id });
    await deny(a, 'message_send', { roomId: other, text: 'bad reply', replyTo: original.id });
    await deny(a, 'file_send', { roomId: other, name: 'x', data: Buffer.from('x'), replyTo: original.id });
    instance.flush();
    const unreadBeforeUpdate = JSON.parse(await fs.readFile(dataFile, 'utf8')).accounts.find(a => a.username === 'Bob Smith').unread;
    await ok(a, 'message_unsend', { roomId: channel, messageId: file.id });
    instance.flush();
    assert.deepEqual(JSON.parse(await fs.readFile(dataFile, 'utf8')).accounts.find(a => a.username === 'Bob Smith').unread, unreadBeforeUpdate, 'Updates do not increment unread');
    await assert.rejects(fs.access(path.join(directory, 'uploads', file.file.id)), { code: 'ENOENT' });
    await deny(a, 'file_get', { roomId: channel, fileId: file.file.id });
    await deny(a, 'message_send', { roomId: channel, text: 'bad reply', replyTo: file.id });
    await deny(a, 'file_send', { roomId: channel, name: 'x', data: Buffer.from('x'), replyTo: file.id });
    await ok(a, 'message_unsend', { roomId: channel, messageId: original.id });
    const deleted = (await history(b, channel)).find(m => m.id === original.id);
    assert.equal(deleted.deleted, true); assert.equal(deleted.sender, original.sender); assert.equal(deleted.time, original.time); assert.equal(deleted.text, '');
    const snapshots = await history(a, channel); assert.equal(snapshots.find(m => m.id === reply.id).reply.deleted, true);
    await delay(30); assert.ok(b.log.updates.some(m => m.id === file.id && m.deleted && !m.file)); assert.equal(c.log.updates.length, 0);
    const dm = (await ok(a, 'room_open', { target: 'Bob Smith' })).roomId;
    await ok(a, 'message_send', { roomId: dm, text: '@ai explain TCP' }); await delay(30);
    assert.ok(b.log.messages.some(m => m.roomId === dm && m.kind === 'ai' && /no Gemini API key/.test(m.text)));
    const ai = (await history(a, dm)).at(-1); await deny(a, 'message_unsend', { roomId: dm, messageId: ai.id });
    // Leaving and joining update subscriptions for every channel.
    await ok(b, 'group_leave', { roomId: group }); const before = b.log.messages.length;
    await ok(a, 'message_send', { roomId: channel, text: 'after leave' }); await delay(30); assert.equal(b.log.messages.length, before);
    await deny(b, 'room_open', { roomId: channel });
    await ok(b, 'group_join', { roomId: group });
    await ok(a, 'message_send', { roomId: channel, text: 'after rejoin' }); await delay(30); assert.ok(b.log.messages.some(m => m.text === 'after rejoin'));
    // Persistence, unread previews, replies and subscriptions after resume/restart.
    const last = (await ok(a, 'file_send', { roomId: other, name: 'last.txt', data: Buffer.from('last') })).message;
    await ok(a, 'message_unsend', { roomId: other, messageId: last.id });
    clients.forEach(s => s.disconnect()); await new Promise(r => instance.io.close(r));
    const saved = JSON.parse(await fs.readFile(dataFile, 'utf8'));
    assert.equal(saved.files.some(([id]) => id === file.file.id), false);
    assert.equal(saved.channels.length, 2);
    instance = createChatServer({ apiKey: '', dataFile }); await start(); a = await client(); b = await client();
    const restored = await ok(b, 'resume', { token: br.token }); await ok(a, 'resume', { token: ar.token });
    assert.ok(restored.unread[channel] > 0); assert.equal(restored.lastMessages[other].deleted, true);
    assert.equal((await history(a, channel)).find(m => m.id === reply.id).reply.deleted, true);
    await ok(a, 'typing', { roomId: group, typing: true }); await delay(30); assert.ok(b.log.typing.some(t => t.roomId === group && t.typing));
    await ok(a, 'message_send', { roomId: channel, text: 'resumed channel' }); await delay(30); assert.ok(b.log.messages.some(m => m.text === 'resumed channel'));
    const doomed = (await ok(a, 'file_send', { roomId: channel, name: 'delete.txt', data: Buffer.from('x') })).message;
    await ok(a, 'channel_delete', { roomId: channel });
    await assert.rejects(fs.access(path.join(directory, 'uploads', doomed.file.id)), { code: 'ENOENT' }); await deny(b, 'room_open', { roomId: channel });
    const remainingFile = (await ok(a, 'file_send', { roomId: other, name: 'remaining.txt', data: Buffer.from('x') })).message;
    await ok(b, 'room_read', { roomId: other, messageId: remainingFile.id });
    await ok(a, 'group_leave', { roomId: group }); await ok(b, 'group_leave', { roomId: group });
    await assert.rejects(fs.access(path.join(directory, 'uploads', remainingFile.file.id)), { code: 'ENOENT' });
    instance.flush(); const cleaned = JSON.parse(await fs.readFile(dataFile, 'utf8'));
    assert.equal(cleaned.channels.length, 0); assert.equal(cleaned.histories.some(([id]) => id === channel || id === other || id === group), false);
    assert.equal(cleaned.readState.some(([id]) => id === channel || id === other || id === group), false);
    for (const account of cleaned.accounts) for (const room of [channel, other, group]) assert.equal(account.unread[room], undefined);
    const doomedGroup = (await ok(a, 'group_create', { name: 'Delete with channels' })).roomId;
    await ok(b, 'group_join', { roomId: doomedGroup });
    const doomedChannel = (await ok(b, 'channel_create', { groupId: doomedGroup, name: 'attachments' })).roomId;
    const groupFile = (await ok(b, 'file_send', { roomId: doomedChannel, name: 'x', data: Buffer.from('x') })).message;
    await ok(a, 'room_read', { roomId: doomedChannel, messageId: groupFile.id });
    await ok(a, 'group_delete', { roomId: doomedGroup });
    await assert.rejects(fs.access(path.join(directory, 'uploads', groupFile.file.id)), { code: 'ENOENT' });
    await deny(b, 'room_open', { roomId: doomedChannel });
    instance.flush(); const deletedGroupData = JSON.parse(await fs.readFile(dataFile, 'utf8'));
    assert.equal(deletedGroupData.channels.length, 0); assert.equal(deletedGroupData.files.some(([id]) => id === groupFile.file.id), false);
    console.log('PASS: legacy general, private channels, permissions, subscriptions, typing, unsend and reply privacy, file cleanup, DM AI, unread and restart.');
  } finally {
    clients.forEach(s => s.disconnect()); await new Promise(r => instance.io.close(r)); await fs.rm(directory, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
