'use strict';
const socket = io();
const $ = id => document.getElementById(id);

// All UI icons share one SVG source; user content is always written with textContent.
function icon(name) {
  const paths = {
    // Paths follow the Lucide icon set (ISC licence), 24×24 grid, stroke 2.
    compass: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z','m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z'],
    chevron: ['m6 9 6 6 6-6'], arrow: ['M5 12h14','m12 5 7 7-7 7'],
    settings: ['M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z','M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'],
    user: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2','M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z'],
    lock: ['M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z','M7 11V7a5 5 0 0 1 10 0v4'],
    zap: ['M13 2 3 14h9l-1 8 10-12h-9l1-8z'],
    trash: ['M3 6h18','M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6','M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2','M10 11v6','M14 11v6'],
    eraser: ['m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21','M22 21H7','m5 11 9 9'],
    logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4','m16 17 5-5-5-5','M21 12H9'],
    more: ['M13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z','M13 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z','M13 19a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z'],
    chat: ['M21 11.5a8.5 8.5 0 0 1-8.5 8.5H3l2-5a8.5 8.5 0 1 1 16-3.5Z','M8 10h8M8 14h5'],
    plus: ['M12 5v14M5 12h14'], close: ['m6 6 12 12M6 18 18 6'],
    reply: ['m9 10-5 5 5 5','M4 15h10a6 6 0 0 0 0-12h-2'],
    copy: ['M9 9h13v13H9Z','M5 15H2V2h13v3'],
    back: ['m15 18-6-6 6-6'], send: ['M12 19V5m-6 6 6-6 6 6'],
    attach: ['m21 11-8 8a6 6 0 0 1-8-8l9-9a4 4 0 0 1 6 6l-9 9a2 2 0 0 1-3-3l8-8'],
    smile: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM8 14s1 3 4 3 4-3 4-3M8 9h.01M16 9h.01'],
    sparkles: ['m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4m-2-2h4'],
    users: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.9','M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM17 3a4 4 0 0 1 0 8'],
    image: ['M3 3h18v18H3Z','m3 17 6-6 4 4 3-3 5 5M8 7h.01'],
    file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M8 13h8M8 17h5'],
    download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4','m7 10 5 5 5-5','M12 15V3'],
    sun: ['M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z','M12 2v2','M12 20v2','m4.93 4.93 1.41 1.41','m17.66 17.66 1.41 1.41','M2 12h2','M20 12h2','m6.34 17.66-1.41 1.41','m19.07 4.93-1.41 1.41'],
    moon: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'],
    monitor: ['M3 3h18v14H3ZM8 21h8M12 17v4'],
    eye: ['M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z','M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'],
    check: ['m5 12 4 4L19 6'], alert: ['m12 3 10 18H2ZM12 9v4m0 4h.01']
  };
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: 'icon' })) svg.setAttribute(key, value);
  for (const d of paths[name] || paths.chat) { const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', d); svg.append(path); }
  return svg;
}
// Same shapes as public/logo.svg: a speech bubble holding a ring of three friends ("วง" = a circle of people).
let logoCount = 0;
function logoMark(size) {
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'), id = 'wong-g' + (++logoCount);
  const make = (tag, attributes) => { const node = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attributes)) node.setAttribute(k, v); return node; };
  for (const [k, v] of Object.entries({ viewBox: '0 0 64 64', width: size, height: size, 'aria-hidden': 'true', class: 'logo-mark' })) svg.setAttribute(k, v);
  const gradient = make('linearGradient', { id, x1: 8, y1: 4, x2: 58, y2: 60, gradientUnits: 'userSpaceOnUse' });
  gradient.append(make('stop', { offset: 0, 'stop-color': '#5865F2' }), make('stop', { offset: 1, 'stop-color': '#8B5CF6' }));
  const defs = make('defs', {}); defs.append(gradient);
  svg.append(defs,
    make('path', { fill: 'url(#' + id + ')', d: 'M22 5h20a17 17 0 0 1 17 17v10a17 17 0 0 1-17 17H27l-11.6 9.3c-1.6 1.3-3.9-.1-3.5-2.1L13.6 47A17 17 0 0 1 5 32V22A17 17 0 0 1 22 5Z' }),
    make('circle', { cx: 32, cy: 27, r: 10.5, fill: 'none', stroke: '#fff', 'stroke-opacity': '.38', 'stroke-width': 3 }),
    make('circle', { cx: 32, cy: 16.5, r: 4.6, fill: '#fff' }), make('circle', { cx: 41.1, cy: 32.25, r: 4.6, fill: '#fff' }),
    make('circle', { cx: 22.9, cy: 32.25, r: 4.6, fill: '#fff' }));
  return svg;
}
document.querySelectorAll('[data-logo]').forEach(node => node.replaceChildren(logoMark(node.dataset.logo)));
document.querySelectorAll('[data-icon]').forEach(node => node.replaceChildren(icon(node.dataset.icon)));
for (const [id, name] of Object.entries({ 'back-button': 'back', 'attach-button': 'plus', 'emoji-button': 'smile', 'ai-button': 'sparkles', 'password-toggle': 'eye' })) $(id).replaceChildren(icon(name));
document.querySelectorAll('[data-close]').forEach(node => node.replaceChildren(icon('close')));
document.querySelectorAll('[data-theme-choice]').forEach(node => node.replaceChildren(icon({light:'sun',dark:'moon',system:'monitor'}[node.dataset.themeChoice])));
$('new-messages').replaceChildren(icon('download'), document.createTextNode('New messages'));
const backUnread = document.createElement('span'); backUnread.id = 'back-unread'; backUnread.className = 'badge'; backUnread.hidden = true; $('back-button').append(backUnread);
let firstUnreadId = null, typingExpiryTimer, typingSignature = '', bannerTimer;
let notificationsEnabled = false;
try { notificationsEnabled = localStorage.getItem('wongchat-notifications') === 'true'; } catch {}
function updateNotifications() {
  const enabled = notificationsEnabled && 'Notification' in window && Notification.permission === 'granted';
  $('notifications-toggle').setAttribute('aria-pressed', String(enabled));
  $('notifications-toggle').textContent = enabled ? 'Notifications on' : 'Notifications off';
}
updateNotifications();
$('notifications-toggle').onclick = async () => {
  if (!('Notification' in window)) return toast('This browser does not support notifications.', true);
  try {
    if (notificationsEnabled && Notification.permission === 'granted') notificationsEnabled = false;
    else notificationsEnabled = (await Notification.requestPermission()) === 'granted';
    try { localStorage.setItem('wongchat-notifications', String(notificationsEnabled)); } catch {}
    updateNotifications();
  } catch (error) { showError(error); }
};
$('me-button').onclick = () => $('me-sheet').showModal();
$('create-group-button').onclick = () => $('create-group-sheet').showModal();
function dismissBanner() { clearTimeout(bannerTimer); $('message-banner').hidden = true; }
$('banner-close').onclick = dismissBanner;
let bannerStartX = 0;
$('message-banner').addEventListener('touchstart', e => { bannerStartX = e.changedTouches[0].clientX; }, { passive: true });
$('message-banner').addEventListener('touchend', e => { if (Math.abs(e.changedTouches[0].clientX - bannerStartX) > 48) dismissBanner(); }, { passive: true });
function announceMessage(message) {
  const group = groupFor(message.roomId);
  const title = group?.name || message.roomId.slice(3).split('|').find(n => n !== myName);
  const open = () => { dismissBanner(); void openRoom({ roomId: message.roomId }, title, group ? 'group' : 'private'); };
  const copy = element('span', 'banner-copy'); copy.append(element('strong', '', message.roomId.startsWith('group:') ? message.sender + ' · ' + message.roomId.slice(6) : message.sender), element('span', '', preview(message)));
  photoIcon(copy.lastChild, message);
  $('banner-open').replaceChildren(avatar(message.sender, '', false), copy); $('banner-open').onclick = open;
  $('message-banner').hidden = false; clearTimeout(bannerTimer); bannerTimer = setTimeout(dismissBanner, 4000);
  if (notificationsEnabled && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
    try { const notice = new Notification(message.sender, { body: preview(message), tag: message.roomId }); notice.onclick = () => { window.focus(); open(); notice.close(); }; } catch {}
  }
}
function maintainViewport() {
  const follow = activeRoom && nearBottom();
  document.documentElement.style.setProperty('--app-height', (window.visualViewport?.height || window.innerHeight) + 'px');
  positionComposerPopups();
  if (follow) requestAnimationFrame(scrollBottom);
}
window.visualViewport?.addEventListener('resize', maintainViewport);
window.visualViewport?.addEventListener('scroll', maintainViewport);
window.addEventListener('resize', maintainViewport);
window.addEventListener('popstate', () => { if (myName) { clearRoom(); renderLists(); } });
history.replaceState({ wongchat: 'list' }, '');
window.addEventListener('DOMContentLoaded', maintainViewport);

const colors = ['#4f46e5', '#2563eb', '#0f766e', '#a21caf', '#be123c', '#b45309'];
const colorNames = ['Indigo', 'Blue', 'Teal', 'Purple', 'Rose', 'Amber'];
let myName = '', users = [], groups = [], directRooms = [], profiles = {};
let creatingAccount = false, sessionToken = '', explicitLogin = false;
let activeRoom = null, openingVersion = 0, accountVersion = 0;
let typingTimer, lastTypingSent = 0, sendingCount = 0;
let draftAvatar = null, draftColor = colors[0], photoVersion = 0;

let selectedGroupId = null;

const mentionUnread = new Set();
let replying = null, mentionOptions = [], mentionIndex = 0, mentionStart = -1;
function groupFor(roomId) { return groups.find(g => g.roomId === roomId || g.channels?.some(c => c.roomId === roomId)); }
function channelList(group) { return group.channels || [{ roomId: group.roomId, name: 'general' }]; }
function channelName(roomId) { const group = groupFor(roomId); return group && channelList(group).find(c => c.roomId === roomId)?.name || 'general'; }
function unreadBadge(roomId) { return element('span', 'badge' + (mentionUnread.has(roomId) ? ' mention-badge' : ''), (mentionUnread.has(roomId) ? '@ ' : '') + unread.get(roomId)); }
function renderChannels(group) {
  $('channels').replaceChildren();
  if (!group) return;
  for (const channel of channelList(group)) {
    const row = element('div', 'channel-entry'), button = element('button', 'channel' + (activeRoom?.roomId === channel.roomId ? ' selected' : ''), '# ' + channel.name);
    button.type = 'button'; button.onclick = () => void openRoom({ roomId: channel.roomId }, group.name, 'group');
    if (unread.get(channel.roomId)) button.append(unreadBadge(channel.roomId)); row.append(button);
    if (group.creator === myName && channel.roomId !== group.roomId) {
      const remove = element('button', 'icon-button channel-delete', '×'); remove.type = 'button'; remove.setAttribute('aria-label', 'Delete channel ' + channel.name);
      remove.onclick = () => void deleteChannel(channel.roomId); row.append(remove);
    }
    $('channels').append(row);
  }
}
$('create-channel').onclick = () => { $('channel-error').textContent = ''; $('channel-input').value = ''; $('create-channel-sheet').dataset.groupId = selectedGroupId; $('create-channel-sheet').showModal(); };
$('channel-form').onsubmit = async event => {
  event.preventDefault(); $('channel-submit').disabled = true; $('channel-error').textContent = '';
  const groupId = $('create-channel-sheet').dataset.groupId;
  try {
    const result = await request('channel_create', { groupId, name: $('channel-input').value });
    $('create-channel-sheet').close(); await openRoom({ roomId: result.roomId }, groupFor(result.roomId)?.name || '', 'group');
  } catch (error) { $('channel-error').textContent = error.message; }
  finally { $('channel-submit').disabled = false; }
};
async function deleteChannel(roomId) {
  if (!await confirmAction({ title: 'Delete channel?', body: 'Its messages and attachments will be deleted for everyone.', confirmLabel: 'Delete channel' })) return;
  try { await request('channel_delete', { roomId }); } catch (error) { showError(error); }
}
function cancelReply() { replying = null; $('reply-bar').hidden = true; }
$('cancel-reply').onclick = cancelReply;
function startReply(message) { replying = message; $('reply-label').textContent = 'Replying to ' + message.sender; $('reply-bar').hidden = false; $('message-input').focus(); }
function candidates(roomId) {
  const group = groupFor(roomId);
  const names = group ? group.members : [directRooms.find(r => r.roomId === roomId)?.target];
  return [...new Set([...names, 'ai'])].filter(Boolean).sort((a, b) => b.length - a.length);
}
function mentionTokens(message) {
  const text = message.text || '', names = [...new Set([...candidates(message.roomId), myName])].sort((a, b) => b.length - a.length), tokens = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '@' || (i && /[\p{L}\p{N}_@]/u.test(text[i - 1]))) continue;
    const name = names.find(n => text.slice(i + 1, i + 1 + n.length).toLowerCase() === n.toLowerCase() && !/[\p{L}\p{N}_]/u.test(text[i + 1 + n.length] || ''));
    if (name) { tokens.push({ start: i, end: i + 1 + name.length, name }); i += name.length; }
  }
  return tokens;
}
function mentionsMe(message) { return !message.deleted && mentionTokens(message).some(t => t.name.toLowerCase() === myName.toLowerCase()); }
function renderMentionText(node, message) {
  let start = 0;
  for (const token of mentionTokens(message)) {
    node.append(document.createTextNode(message.text.slice(start, token.start)), element('span', 'mention' + (token.name.toLowerCase() === myName.toLowerCase() ? ' mention-self' : ''), message.text.slice(token.start, token.end))); start = token.end;
  }
  node.append(document.createTextNode(message.text.slice(start)));
}
function closeMentions() { $('mention-popup').hidden = true; $('message-input').setAttribute('aria-expanded', 'false'); $('message-input').removeAttribute('aria-activedescendant'); }
function closeComposerMenus() {
  closeMentions(); $('ai-menu').hidden = true; $('ai-button').setAttribute('aria-expanded', 'false');
  $('emoji-picker').hidden = true; $('emoji-button').setAttribute('aria-expanded', 'false');
}
function positionComposerPopups() {
  const wrap = $('message-form').closest('.composer-wrap'), rect = wrap.getBoundingClientRect();
  const available = Math.max(0, rect.top - (window.visualViewport?.offsetTop || 0) - 8);
  wrap.style.setProperty('--popup-height', Math.min(240, available) + 'px');
  const button = $('ai-button').getBoundingClientRect();
  // Align with the AI button, while keeping the popover inside narrow composers.
  $('ai-menu').style.right = Math.max(8, Math.min(rect.right - button.right, rect.width - 268)) + 'px';
}
function pickMention(index) {
  const input = $('message-input'), name = mentionOptions[index]; if (!name) return;
  input.setRangeText('@' + name + ' ', mentionStart, input.selectionStart, 'end'); closeMentions(); input.focus(); growComposer();
}
function paintMentionPopup() {
  closeComposerMenus();
  const popup = $('mention-popup'); popup.replaceChildren(); popup.hidden = !mentionOptions.length;
  $('message-input').setAttribute('aria-expanded', String(!!mentionOptions.length));
  mentionOptions.forEach((name, i) => {
    const button = element('button', i === mentionIndex ? 'selected' : ''); button.type = 'button'; button.id = 'mention-option-' + i; button.tabIndex = -1;
    button.setAttribute('aria-label', name === 'ai' ? 'AI assistant' : name + (users.includes(name) ? ', online' : ', offline'));
    if (name === 'ai') { const bot = element('span', 'avatar small bot-avatar'); bot.append(icon('sparkles')); button.append(bot); }
    else button.append(avatar(name, 'small', false));
    button.append(element('span', 'mention-name', name === 'ai' ? 'AI assistant' : name));
    button.setAttribute('role', 'option'); button.setAttribute('aria-selected', String(i === mentionIndex));
    button.onmouseenter = () => selectMention(i);
    button.onmousedown = e => e.preventDefault(); button.onclick = () => pickMention(i); popup.append(button);
  });
  if (mentionOptions.length) { positionComposerPopups(); selectMention(mentionIndex); }
}
function selectMention(index, scroll = false) {
  mentionIndex = index;
  const popup = $('mention-popup');
  for (const [i, option] of [...popup.children].entries()) { option.classList.toggle('selected', i === index); option.setAttribute('aria-selected', String(i === index)); }
  $('message-input').setAttribute('aria-activedescendant', 'mention-option-' + index);
  const option = popup.children[index];
  if (scroll && option) {
    if (option.offsetTop < popup.scrollTop) popup.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > popup.scrollTop + popup.clientHeight) popup.scrollTop = option.offsetTop + option.offsetHeight - popup.clientHeight;
  }
}
function updateMentionPopup() {
  const input = $('message-input'), before = input.value.slice(0, input.selectionStart), match = /(?:^|\s)@([^@\n]*)$/.exec(before);
  if (!match || !activeRoom) return closeMentions();
  mentionStart = before.lastIndexOf('@'); mentionOptions = candidates(activeRoom.roomId).filter(n => n.toLowerCase().startsWith(match[1].toLowerCase())); mentionIndex = 0; paintMentionPopup();
}
function mentionKey(event) {
  if ($('mention-popup').hidden || event.isComposing) return false;
  if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(event.key)) {
    event.preventDefault();
    if (event.key === 'Escape') closeMentions();
    else if (event.key === 'Enter' || event.key === 'Tab') pickMention(mentionIndex);
    else selectMention((mentionIndex + (event.key === 'ArrowDown' ? 1 : -1) + mentionOptions.length) % mentionOptions.length, true);
    return true;
  }
  return false;
}
$('message-input').setAttribute('aria-controls', 'mention-popup'); $('message-input').setAttribute('aria-autocomplete', 'list');
$('message-input').setAttribute('aria-haspopup', 'listbox'); $('message-input').setAttribute('aria-expanded', 'false');
$('ai-button').onclick = () => { const open = $('ai-menu').hidden; closeComposerMenus(); $('ai-menu').hidden = !open; $('ai-button').setAttribute('aria-expanded', String(open)); if (open) { positionComposerPopups(); $('summarize').focus(); } };
document.addEventListener('click', e => {
  if ((!$('ai-menu').hidden && !e.target.closest('#ai-menu, #ai-button')) ||
      (!$('mention-popup').hidden && !e.target.closest('#mention-popup, #message-input')) ||
      (!$('emoji-picker').hidden && !e.target.closest('#emoji-picker, #emoji-button'))) closeComposerMenus();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') {
  const returnTo = !$('ai-menu').hidden ? $('ai-button') : !$('emoji-picker').hidden ? $('emoji-button') : null;
  cancelReply(); closeComposerMenus(); returnTo?.focus();
} });
function addMessageActions(row, message) {
  if (message.deleted || message.kind === 'system') return;
  row.tabIndex = 0; row.setAttribute('aria-label', 'Message from ' + message.sender);
  const bar = element('div', 'message-actions'); bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Message actions');
  const action = (label, glyph, run) => { const button = element('button', label === 'Unsend' ? 'danger-action' : ''); button.type = 'button'; button.title = label; button.setAttribute('aria-label', label); button.append(icon(glyph)); button.onclick = () => { row.classList.remove('actions-open'); more.setAttribute('aria-expanded', 'false'); run(); }; bar.append(button); };
  action('Reply', 'reply', () => startReply(message));
  action('Copy text', 'copy', async () => { try { await navigator.clipboard.writeText(message.text || message.file?.name || ''); } catch { toast('Could not copy text.', true); } });
  if (message.sender === myName && ['chat', 'file'].includes(message.kind)) action('Unsend', 'trash', async () => {
    if (!await confirmAction({ title: 'Unsend message?', body: 'Everyone will see Message unsent.', confirmLabel: 'Unsend' })) return;
    try { await request('message_unsend', { roomId: message.roomId, messageId: message.id }); } catch (error) { showError(error); }
  });
  const more = element('button', 'message-more icon-button', '⋯'); more.type = 'button'; more.setAttribute('aria-label', 'Message actions'); more.setAttribute('aria-expanded', 'false');
  more.onclick = () => { const open = row.classList.toggle('actions-open'); more.setAttribute('aria-expanded', String(open)); if (open) bar.querySelector('button').focus(); };
  row.append(bar, more);
}

let contextVisible = matchMedia('(min-width: 1024px)').matches;
function setContext(visible) {
  contextVisible = visible; renderContext();
}
function renderNavigation() {
  const group = groups.find(g => g.roomId === selectedGroupId && g.members.includes(myName));
  $('home-panel').hidden = !!group; $('group-panel').hidden = !group;
  $('home-button').classList.toggle('selected', !group);
  const dmUnread = directRooms.reduce((sum, r) => sum + (unread.get(r.roomId) || 0), 0);
  $('home-button').classList.toggle('has-unread', dmUnread > 0);
  $('home-button').setAttribute('aria-current', group ? 'false' : 'page');
  $('home-button').setAttribute('aria-label', 'WongChat Home' + (dmUnread ? ', ' + dmUnread + ' unread' : ''));
  $('home-button').querySelector('.badge')?.remove();
  if (dmUnread) $('home-button').append(element('span', 'badge' + (directRooms.some(r => mentionUnread.has(r.roomId)) ? ' mention-badge' : ''), (directRooms.some(r => mentionUnread.has(r.roomId)) ? '@ ' : '') + (dmUnread > 99 ? '99+' : String(dmUnread))));
  $('joined-groups').replaceChildren();
  for (const g of groups.filter(g => g.members.includes(myName))) {
    const count = channelList(g).reduce((sum, c) => sum + (unread.get(c.roomId) || 0), 0), button = element('button', 'rail-icon' + (group?.roomId === g.roomId ? ' selected' : '') + (count ? ' has-unread' : ''));
    button.type = 'button'; button.setAttribute('aria-current', group?.roomId === g.roomId ? 'page' : 'false'); button.style.setProperty('--group-color', defaultColor(g.name));
    button.setAttribute('aria-label', g.name + (count ? ', ' + count + ' unread' : '')); button.title = g.name;
    button.append(element('span', '', g.name.trim().split(/\s+/).slice(0, 2).map(n => [...n][0]).join('').toUpperCase()));
    button.append(element('span', 'rail-tooltip', g.name));
    if (count) { const badge = element('span', 'badge', count > 99 ? '99+' : String(count)); if (channelList(g).some(c => mentionUnread.has(c.roomId))) { badge.classList.add('mention-badge'); badge.textContent = '@ ' + count; } button.append(badge); }
    button.onclick = () => {
      $('group-menu').hidden = true; $('group-menu-button').setAttribute('aria-expanded', 'false'); selectedGroupId = g.roomId;
      if (matchMedia('(max-width: 767px)').matches) { clearRoom(); renderLists(); }
      else void openRoom({ roomId: g.roomId }, g.name, 'group');
    };
    $('joined-groups').append(button);
  }
  if (group) $('selected-group-name').textContent = group.name;
  renderChannels(group);
}
function renderContext() {
  const available = !!activeRoom;
  $('chat-app').classList.toggle('context-open', available && contextVisible);
  $('context-panel').hidden = !available || !contextVisible;
  $('members-toggle').disabled = !available;
  $('members-toggle').setAttribute('aria-expanded', String(available && contextVisible));
  $('drawer-backdrop').hidden = !available || !contextVisible || matchMedia('(min-width: 1024px)').matches;
  const content = $('context-content'); content.replaceChildren();
  if (!activeRoom) return;
  if (activeRoom.kind === 'private') {
    $('context-title').textContent = 'Profile';
    const name = activeRoom.title, profile = profileFor(name), banner = element('div', 'profile-banner'); banner.style.background = profile.color;
    const details = element('div', 'profile-details');
    details.append(avatar(name, 'large', false), element('h2', '', name), element('small', '', users.includes(name) ? 'Online' : 'Offline'), element('h3', '', 'ABOUT ME'), element('p', '', profile.bio || 'No bio yet.'));
    if (profile.createdAt && !Number.isNaN(Date.parse(profile.createdAt))) details.append(element('h3', '', 'MEMBER SINCE'), element('p', '', new Date(profile.createdAt).toLocaleDateString()));
    content.append(banner, details); return;
  }
  $('context-title').textContent = 'Members';
  const group = groupFor(activeRoom.roomId); if (!group) return;
  for (const online of [true, false]) {
    const names = group.members.filter(n => users.includes(n) === online);
    content.append(element('h3', '', (online ? 'ONLINE — ' : 'OFFLINE — ') + names.length));
    for (const name of names) {
      const row = element('button', 'context-member'); row.type = 'button';
      const copy = element('span', 'user-copy'); copy.append(element('strong', '', name), element('small', '', profileFor(name).bio || (online ? 'Online' : 'Offline')));
      row.append(avatar(name, '', false), copy); row.onclick = () => showProfile(name); content.append(row);
    }
  }
}
$('home-button').onclick = () => { selectedGroupId = null; clearRoom(); renderLists(); };
$('discover-button').onclick = () => { renderLists(); $('discover-sheet').showModal(); };
$('start-dm').onclick = () => { renderLists(); $('dm-picker').showModal(); };
$('settings-button').onclick = () => $('me-sheet').showModal();
$('theme-toggle').onclick = () => {
  themeChoice = ['system', 'light', 'dark'][(['system', 'light', 'dark'].indexOf(themeChoice) + 1) % 3];
  try { localStorage.setItem('campus-chat-theme', themeChoice); } catch {}
  applyTheme(); $('theme-toggle').setAttribute('aria-label', 'Theme: ' + themeChoice + '. Cycle colour theme');
};
$('members-toggle').onclick = () => setContext(!contextVisible);
$('close-context').onclick = $('drawer-backdrop').onclick = () => setContext(false);
// One menu builder for the sidebar group menu and the chat header "⋮" menu; the server re-checks every permission.
function menuItems(roomId) {
  const group = groupFor(roomId);
  if (!group) {
    const room = directRooms.find(r => r.roomId === roomId); if (!room) return [];
    return [
      { label: 'View profile', icon: 'user', run: () => showProfile(room.target) },
      { label: 'Clear chat for me', icon: 'eraser', run: () => clearChat(roomId, room.target, 'me') }
    ];
  }
  if (roomId !== group.roomId) return [
    { label: 'Clear chat for me', icon: 'eraser', run: () => clearChat(roomId, channelName(roomId), 'me') },
    ...(group.creator === myName ? [{ label: 'Delete channel', icon: 'trash', danger: true, run: () => deleteChannel(roomId) }] : [])
  ];
  const items = [
    { label: 'Members', icon: 'users', run: () => { if (activeRoom?.roomId === roomId) setContext(true); else { selectedGroupId = roomId; renderMembers(); $('member-list').showModal(); } } },
    { label: 'Clear chat for me', icon: 'eraser', run: () => clearChat(roomId, group.name, 'me') }
  ];
  if (group.creator === myName) {
    items.push({ separator: true },
      { label: 'Clear chat for everyone', icon: 'eraser', danger: true, run: () => clearChat(roomId, group.name, 'everyone') },
      { label: 'Delete group', icon: 'trash', danger: true, run: () => deleteGroup(group) });
  }
  items.push({ separator: true }, { label: 'Leave group', icon: 'logout', danger: true, run: () => { selectedGroupId = roomId; void leaveSelectedGroup(); } });
  return items;
}
function closeMenus() {
  for (const [menu, button] of [['group-menu', 'group-menu-button'], ['room-menu', 'room-menu-button']]) { $(menu).hidden = true; $(button).setAttribute('aria-expanded', 'false'); }
}
function toggleMenu(menuId, buttonId, roomId) {
  const menu = $(menuId), opening = menu.hidden; closeMenus(); if (!opening || !roomId) return;
  menu.replaceChildren();
  for (const item of menuItems(roomId)) {
    if (item.separator) { menu.append(element('div', 'menu-separator')); continue; }
    const button = element('button', 'menu-item' + (item.danger ? ' danger' : '')); button.type = 'button'; button.setAttribute('role', 'menuitem');
    button.append(icon(item.icon), element('span', '', item.label));
    button.onclick = () => { closeMenus(); item.run(); }; menu.append(button);
  }
  menu.hidden = false; $(buttonId).setAttribute('aria-expanded', 'true'); menu.querySelector('button')?.focus();
}
$('group-menu-button').onclick = event => { event.stopPropagation(); toggleMenu('group-menu', 'group-menu-button', selectedGroupId); };
$('room-menu-button').onclick = event => { event.stopPropagation(); toggleMenu('room-menu', 'room-menu-button', activeRoom?.roomId); };
document.addEventListener('click', event => { if (!event.target.closest('.dropdown-menu')) closeMenus(); });
// Resolves true only when the user confirms; destructive actions can require typing a name.
function confirmAction({ title, body, confirmLabel, requireText }) {
  return new Promise(resolve => {
    const dialog = $('confirm-dialog'); let done = false;
    const finish = value => { if (done) return; done = true; dialog.close(); resolve(value); };
    $('confirm-title').textContent = title; $('confirm-body').textContent = body; $('confirm-ok').textContent = confirmLabel;
    $('confirm-type-field').hidden = !requireText; $('confirm-type-input').value = '';
    $('confirm-type-label').textContent = requireText ? 'Type "' + requireText + '" to confirm' : '';
    $('confirm-ok').disabled = !!requireText;
    $('confirm-type-input').oninput = () => { $('confirm-ok').disabled = $('confirm-type-input').value.trim() !== requireText; };
    $('confirm-form').onsubmit = event => { event.preventDefault(); if (!$('confirm-ok').disabled) finish(true); };
    $('confirm-cancel').onclick = () => finish(false);
    dialog.onclose = () => finish(false);
    dialog.showModal(); (requireText ? $('confirm-type-input') : $('confirm-cancel')).focus();
  });
}
// Forget everything cached for a room so cleared messages and their files disappear immediately.
function wipeLocalRoom(roomId) {
  histories.set(roomId, []); summaries.delete(roomId); lastMessages.delete(roomId); unread.delete(roomId);
  readStates.set(roomId, {}); forgetFiles(roomId);
  if (activeRoom?.roomId === roomId) { firstUnreadId = null; renderMessages(true); }
  renderLists();
}
async function clearChat(roomId, title, scope) {
  const everyone = scope === 'everyone';
  const confirmed = await confirmAction({
    title: everyone ? 'Clear chat for everyone?' : 'Clear chat for you?',
    body: everyone ? 'All messages and files in ' + title + ' will be deleted for every member. This cannot be undone.'
      : 'Messages in ' + title + ' will disappear for you only. Everyone else still sees them.',
    confirmLabel: everyone ? 'Clear for everyone' : 'Clear for me'
  });
  if (!confirmed) return;
  try { await request('room_clear', { roomId, scope }); if (!everyone) wipeLocalRoom(roomId); toast(everyone ? 'Chat cleared for everyone' : 'Chat cleared for you'); }
  catch (error) { showError(error); }
}
async function deleteGroup(group) {
  const confirmed = await confirmAction({ title: 'Delete ' + group.name + '?', body: 'The group, its messages and every shared file will be removed for all members. This cannot be undone.', confirmLabel: 'Delete group', requireText: group.name });
  if (!confirmed) return;
  try { await request('group_delete', { roomId: group.roomId }); toast('Deleted ' + group.name); }
  catch (error) { showError(error); }
}

const wideLayout = matchMedia('(min-width: 1024px)');
wideLayout.addEventListener('change', () => setContext(wideLayout.matches));
window.addEventListener('resize', renderContext);
document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeMenus(); if (!wideLayout.matches) setContext(false); } });

const tokenStorageKey = 'campus-chat-token';
const histories = new Map(), summaries = new Map(), unread = new Map(), typers = new Map();
const lastMessages = new Map(), readStates = new Map();
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
  const close = element('button', 'icon-button'); close.append(icon('close'));
  close.type = 'button'; close.setAttribute('aria-label', 'Dismiss notification');
  close.onclick = () => node.remove();
  node.append(icon(error ? 'alert' : 'check'), element('span', '', text), close);
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
    element('small', '', users.includes(name) ? 'Online' : 'Offline'),
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
  $('panel-name').textContent = myName; $('panel-bio').textContent = profileFor(myName).bio || 'Online';
  $('my-avatar').replaceChildren(avatar(myName, '', false));
  document.documentElement.style.setProperty('--accent', profileFor(myName).color);
  try { localStorage.setItem('campus-chat-accent', profileFor(myName).color); } catch {}
}
function updateTitle() {
  const total = [...unread.values()].reduce((sum, count) => sum + count, 0);
  document.title = (total ? '(' + total + ') ' : '') + 'WongChat';
  const other = total - (unread.get(activeRoom?.roomId) || 0);
  backUnread.hidden = !other; backUnread.textContent = other > 99 ? '99+' : String(other);
  // The favicon is the logo; unread adds a red dot drawn on a canvas copy.
  if (!total || !faviconImage.complete) { document.querySelector('link[rel="icon"]').href = '/logo.svg'; return; }
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d'); ctx.drawImage(faviconImage, 0, 0, 64, 64);
  ctx.beginPath(); ctx.arc(52, 12, 11, 0, Math.PI * 2); ctx.fillStyle = '#F23F43'; ctx.fill();
  document.querySelector('link[rel="icon"]').href = canvas.toDataURL();
}
const faviconImage = new Image(); faviconImage.onload = () => updateTitle(); faviconImage.src = '/logo.svg';
function relativeTime(time) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(time)) / 60000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return minutes + 'm';
  if (minutes < 1440) return Math.floor(minutes / 60) + 'h';
  return new Date(time).toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function preview(message) {
  if (!message) return '';
  if (message.deleted) return 'Message unsent';
  return (message.sender === myName && message.kind !== 'system' ? 'You: ' : '') + (message.kind === 'file' ? (isImage(message.file) ? 'Photo' : 'File: ' + message.file.name) : message.text);
}
function isImage(file) { return ['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file?.type); }
function photoIcon(node, message) { if (isImage(message?.file)) node.prepend(icon('image')); return node; }
function makeRow(name, roomId, open, fallback, group = false) {
  const li = element('li', 'list-row' + (activeRoom?.roomId === roomId ? ' selected' : '') + (unread.get(roomId) ? ' unread' : ''));
  const groupAvatar = element('span', 'avatar'); groupAvatar.append(icon('users')); li.append(group ? groupAvatar : avatar(name));
  const button = element('button', 'list-button'); button.type = 'button';
  const copy = element('span', 'row-copy'), top = element('span', 'row-top');
  top.append(element('strong', '', name + (name === myName ? ' (you)' : '')));
  const last = lastMessages.get(roomId);
  if (last) {
    const time = element('time', '', relativeTime(last.time)); time.dateTime = last.time;
    top.append(time);
  }
  const typing = typingNames(roomId).length > 0;
  copy.append(top, element('span', 'row-preview' + (typing ? ' is-typing' : ''), typing ? 'typing…' : preview(last) || fallback));
  if (!typing) photoIcon(copy.lastChild, last);
  button.append(copy); button.onclick = open;
  if (unread.get(roomId)) button.append(unreadBadge(roomId));
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
  $('room-title').textContent = activeRoom.kind === 'group' ? '# ' + channelName(activeRoom.roomId) : '@ ' + activeRoom.title;
  $('message-input').placeholder = activeRoom.kind === 'group' ? 'Message #' + channelName(activeRoom.roomId) : 'Message @' + activeRoom.title;
  if (activeRoom.kind === 'private') {
    $('header-avatar').append(avatar(activeRoom.title));
    $('room-kind').textContent = users.includes(activeRoom.title) ? 'online' : 'offline';
    $('room-title').onclick = () => showProfile(activeRoom.title);
    $('room-title').tabIndex = 0; $('room-title').setAttribute('role', 'button');
  } else {
    const groupAvatar = element('span', 'avatar'); groupAvatar.append(icon('users')); $('header-avatar').append(groupAvatar);
    const group = groupFor(activeRoom.roomId);
    $('room-kind').textContent = (group?.name || '') + ' \u00b7 ' + memberCount(group?.members.length || 0);
    $('room-members').textContent = memberCount(group?.members.length || 0);
    $('room-members').setAttribute('aria-label', 'View group members');
    $('room-title').onclick = null; $('room-title').removeAttribute('tabindex'); $('room-title').removeAttribute('role');
  }
}
$('room-title').onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); $('room-title').click(); } };
function renderLists() {
  const search = $('sidebar-search').value.trim().toLowerCase();
  const matches = name => name.toLowerCase().includes(search);
  $('users').replaceChildren(); $('direct-messages').replaceChildren(); $('groups').replaceChildren();
  const peopleSearch = $('dm-search').value.trim().toLowerCase();
  const online = users.filter(name => name !== myName && name.toLowerCase().includes(peopleSearch));
  $('user-count').textContent = online.length;
  for (const name of online) {
    const row = element('li', 'online-person'), button = element('button'); button.type = 'button';
    button.append(avatar(name, '', false), element('span', '', name)); button.onclick = () => { $('dm-picker').close(); void openRoom({ target: name }, name, 'private'); };
    row.append(button); $('users').append(row);
  }
  const chats = directRooms.map(r => ({ ...r, title: r.target, kind: 'private' }));
  chats.sort((a, b) => Number(!!unread.get(b.roomId)) - Number(!!unread.get(a.roomId)) ||
    (lastMessages.get(b.roomId)?.time || '').localeCompare(lastMessages.get(a.roomId)?.time || '') || a.title.localeCompare(b.title));
  for (const room of chats.filter(r => matches(r.title))) {
    $('direct-messages').append(makeRow(room.title, room.roomId, () => openRoom({ roomId: room.roomId }, room.title, room.kind), 'Start the conversation', room.kind === 'group'));
  }
  for (const group of groups.filter(g => !g.members.includes(myName) && g.name.toLowerCase().includes($('discover-search').value.trim().toLowerCase()))) {
    const row = makeRow(group.name, group.roomId, () => {}, memberCount(group.members.length), true);
    const join = element('button', 'small-button', 'Join'); join.type = 'button'; join.setAttribute('aria-label', 'Join ' + group.name);
    join.onclick = async () => { join.disabled = true; try { await request('group_join', { roomId: group.roomId }); $('discover-sheet').close(); await openRoom({ roomId: group.roomId }, group.name, 'group'); } catch (error) { showError(error); join.disabled = false; } };
    row.querySelector('.list-button').onclick = () => join.click();
    row.append(join); $('groups').append(row);
  }
  for (const [id, text] of [['users', 'No one else is online.'], ['direct-messages', 'Your conversations will appear here.'], ['groups', 'No new groups to discover.']]) {
    if (!$(id).childElementCount) { const empty = element('li', 'list-empty'); empty.append(icon('chat'), element('span', '', search ? 'No matches found.' : text)); $(id).append(empty); }
  }
  updateTitle(); renderHeader(); renderNavigation(); renderContext();
}
$('sidebar-search').oninput = $('dm-search').oninput = $('discover-search').oninput = renderLists;
function setComposer(enabled) {
  for (const id of ['message-input', 'send-button', 'summarize', 'attach-button', 'emoji-button', 'ai-button', 'room-menu-button']) $(id).disabled = !enabled;
}
function clearRoom() {
  cancelReply(); closeComposerMenus(); stopTyping(); openingVersion++; activeRoom = null; firstUnreadId = null;
  if (!wideLayout.matches) contextVisible = false;
  $('messages').removeAttribute('aria-busy');
  setComposer(false); $('chat-app').classList.remove('room-open'); syncScreens();
  $('new-messages').hidden = true;
  renderHeader(); renderNavigation(); renderContext(); renderMessages(true);
}
async function openRoom(payload, title, kind) {
  cancelReply(); closeComposerMenus(); stopTyping(); firstUnreadId = null; const version = ++openingVersion;
  const requestedId = payload.roomId || dmId(payload.target);
  const unreadCount = unread.get(requestedId) || 0;
  activeRoom = null; setComposer(false);
  if (matchMedia('(max-width: 767px)').matches && history.state?.wongchat !== 'room') history.pushState({ wongchat: 'room' }, '');
  $('chat-app').classList.add('room-open'); syncScreens();
  $('room-title').textContent = title; $('room-kind').textContent = 'LOADING CONVERSATION…';
  $('messages').replaceChildren(); $('messages').setAttribute('aria-busy', 'true');
  for (let i = 0; i < 4; i++) $('messages').append(element('div', 'skeleton'));
  try {
    const result = await request('room_open', { ...payload, read: document.visibilityState === 'visible' });
    if (version !== openingVersion) return;
    activeRoom = { roomId: result.roomId, title, kind };
    selectedGroupId = kind === 'group' ? groupFor(result.roomId)?.roomId : null;
    const combined = new Map(result.messages.map(message => [message.id, message]));
    // Keep echoes received while the room history was in flight.
    for (const message of histories.get(result.roomId) || []) {
      if (!combined.has(message.id) && (!result.messages.length || message.time >= result.messages[0].time)) combined.set(message.id, message);
    }
    const messages = [...combined.values()].sort((a, b) => a.time.localeCompare(b.time)).slice(-200);
    histories.set(result.roomId, messages);
    readStates.set(result.roomId, result.readState || {});
    if (messages.length) lastMessages.set(result.roomId, messages.at(-1));
    if (kind === 'private' && !directRooms.some(room => room.roomId === result.roomId)) directRooms.push({ roomId: result.roomId, target: title });
    const incoming = messages.filter(message => message.sender !== myName);
    firstUnreadId = unreadCount ? incoming[Math.max(0, incoming.length - unreadCount)]?.id : null;
    markOpenRead();
    setComposer(true); $('message-input').value = ''; growComposer();
    $('new-messages').hidden = true; renderLists(); renderMessages(true);
    if (firstUnreadId) requestAnimationFrame(() => $('unread-divider')?.scrollIntoView({ block: 'start' }));
    if (matchMedia('(min-width: 768px)').matches) $('message-input').focus();
  } catch (error) {
    if (version === openingVersion) { clearRoom(); showError(error); }
  } finally { if (version === openingVersion) $('messages').removeAttribute('aria-busy'); }
}
$('back-button').onclick = () => { if (history.state?.wongchat === 'room') history.back(); else { clearRoom(); renderLists(); } };
function nearBottom() { const node = $('messages'); return node.scrollHeight - node.scrollTop - node.clientHeight < 100; }
function scrollBottom() { $('messages').scrollTop = $('messages').scrollHeight; $('new-messages').hidden = true; }
$('new-messages').onclick = scrollBottom;
function markOpenRead() {
  if (!activeRoom || document.visibilityState !== 'visible') return;
  const roomId = activeRoom.roomId, messageId = histories.get(roomId)?.at(-1)?.id;
  unread.delete(roomId); mentionUnread.delete(roomId);
  if (messageId) socket.emit('room_read', { roomId, messageId });
}
$('messages').onscroll = () => { if (nearBottom()) { $('new-messages').hidden = true; markOpenRead(); updateTitle(); } };
function dateLabel(time) {
  const date = new Date(time), today = new Date(), yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
function emptyState(emoji, title, hint) {
  const node = element('div', 'empty'), symbol = element('span', 'empty-symbol'); symbol.append(icon('chat')); node.append(symbol, element('h2', '', title), element('p', '', hint)); return node;
}
function renderMessages(forceBottom = false) {
  const shouldScroll = forceBottom || nearBottom(), position = $('messages').scrollTop;
  $('messages').replaceChildren(); $('messages').removeAttribute('aria-busy');
  if (!activeRoom) $('messages').append(emptyState('chat', 'Your next conversation starts here.', 'Choose someone online, pick up a direct message, or join a group.'));
  else {
    const messages = [...(histories.get(activeRoom.roomId) || []), ...(summaries.get(activeRoom.roomId) || [])].sort((a, b) => a.time.localeCompare(b.time));
    if (!messages.length) $('messages').append(emptyState('chat', 'Break the ice.', 'Share a thought, send a file, or just say hello.'));
    const sameGroup = (a, b) => a && b && a.kind !== 'system' && b.kind !== 'system' && a.sender === b.sender &&
      (a.kind === 'ai') === (b.kind === 'ai') && new Date(a.time).toDateString() === new Date(b.time).toDateString() &&
      Math.abs(new Date(b.time) - new Date(a.time)) < 5 * 60000 && b.id !== firstUnreadId;
    let lastDate = '';
    messages.forEach((message, index) => {
      const day = new Date(message.time).toDateString();
      if (day !== lastDate) { $('messages').append(element('div', 'date-separator', dateLabel(message.time))); lastDate = day; }
      if (message.id && message.id === firstUnreadId) { const divider = element('div', 'unread-divider'); divider.append(element('span', 'new-tag', 'NEW')); divider.id = 'unread-divider'; $('messages').append(divider); }
      if (message.kind === 'system') { const line = element('p', 'system-message'); line.append(icon('arrow'), element('span', '', message.text)); $('messages').append(line); return; }
      const own = message.sender === myName && ['chat', 'file'].includes(message.kind);
      const grouped = sameGroup(messages[index - 1], message), ai = message.kind === 'ai' || message.sender === 'AI Bot';
      const row = element('div', 'message-row' + (own ? ' own' : '') + (grouped ? ' grouped' : '') + (ai ? ' ai' : ''));
      const time = element('time', '', new Date(message.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })); time.dateTime = message.time;
      const slot = element('div', 'message-avatar');
      if (!grouped) {
        if (ai) { const bot = element('span', 'avatar bot-avatar'); bot.append(icon('sparkles')); slot.append(bot); }
        else slot.append(avatar(message.sender));
      } else { time.className = 'gutter-time'; slot.append(time); }
      row.append(slot);
      const stack = element('div', 'message-stack'), article = element('article', 'message' + (message.kind === 'file' ? (isImage(message.file) ? ' photo-message' : ' attachment') : ''));
      if (!grouped) {
        const heading = element('div', 'message-heading'), name = element(ai ? 'span' : 'button', 'message-name', message.sender);
        name.style.color = ai ? 'var(--accent)' : profileFor(message.sender).color;
        if (!ai) { name.type = 'button'; name.onclick = () => showProfile(message.sender); }
        heading.append(name); if (ai) heading.append(element('span', 'ai-chip', 'AI')); heading.append(time); stack.append(heading);
      }
      if (message.reply) {
        const quote = element('button', 'reply-quote'), excerpt = element('span', 'reply-excerpt');
        quote.append(icon('reply'), excerpt);
        if (message.reply.deleted) excerpt.textContent = 'Original message was unsent';
        else excerpt.append(element('strong', 'reply-sender', message.reply.sender), document.createTextNode(': ' + message.reply.text));
        quote.type = 'button'; quote.onclick = () => {
          const original = [...$('messages').querySelectorAll('[data-message-id]')].find(n => n.dataset.messageId === message.reply.id);
          if (original) { original.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); original.classList.add('reply-flash'); setTimeout(() => original.classList.remove('reply-flash'), 1400); }
        }; stack.append(quote);
      }
      if (message.deleted) article.append(element('p', 'unsent', 'Message unsent'));
      else if (message.kind === 'file') article.append(fileContent(message));
      else { const text = element('p', 'message-text'); renderMentionText(text, message); article.append(text); }
      if (!message.deleted && mentionsMe(message)) row.classList.add('mentioned');
      if (message.id) { row.dataset.messageId = message.id; addMessageActions(row, message); }
      stack.append(article);
      if (own) { row.dataset.messageId = message.id; stack.dataset.ownMessage = message.id; }
      row.append(stack);
      $('messages').append(row);
    });
  }
  if (shouldScroll) scrollBottom(); else $('messages').scrollTop = position;
  renderReceipts(); renderTyping();
}
function fileSize(size) { return size < 1024 ? size + ' B' : size < 1024 * 1024 ? (size / 1024).toFixed(1) + ' KB' : (size / (1024 * 1024)).toFixed(1) + ' MB'; }
function roomAllowed(roomId) {
  return myName && (!!groupFor(roomId)?.members.includes(myName) || directRooms.some(r => r.roomId === roomId));
}
async function fileURL(roomId, file) {
  const key = roomId + '/' + file.id;
  if (fileURLs.has(key)) return fileURLs.get(key);
  const version = accountVersion;
  const pending = request('file_get', { roomId, fileId: file.id }).then(result => {
    if (version !== accountVersion || !roomAllowed(roomId) || fileURLs.get(key) !== pending) throw new Error('This attachment is no longer available.');
    const url = URL.createObjectURL(new Blob([result.data], { type: result.file.type }));
    fileURLs.set(key, url); return url;
  }).catch(error => { if (fileURLs.get(key) === pending) fileURLs.delete(key); throw error; });
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
  if (isImage(file)) {
    const button = element('button', 'image-button loading'); button.type = 'button';
    button.setAttribute('aria-label', 'Open image ' + file.name);
    // CSS sizes the box from the real dimensions (see .image-button), so it fits every screen without JS on resize.
    const sizeTo = (w, h) => { button.style.setProperty('--w', w); button.style.setProperty('--h', h); button.style.setProperty('--ratio', w / h); };
    const width = file.width || 0, height = file.height || 0;
    sizeTo(width || 320, height || 240);
    button.setAttribute('aria-busy', 'true');
    const unavailable = () => {
      button.classList.remove('loading'); button.removeAttribute('aria-busy');
      button.onclick = null; button.disabled = true; button.setAttribute('aria-label', 'Image unavailable');
      button.replaceChildren(element('span', 'image-status', 'Image unavailable'));
    };
    fileURL(roomId, file).then(url => {
      if (!button.isConnected) return;
      const image = element('img', 'image-preview'); image.alt = 'Shared photo';
      if (width) { image.width = width; image.height = height; }
      image.onload = () => {
        // Older messages have no stored size: use the real one once the bytes are here.
        if (!width && image.naturalWidth) sizeTo(image.naturalWidth, image.naturalHeight);
        button.classList.remove('loading'); button.removeAttribute('aria-busy');
      };
      image.onerror = unavailable; image.decoding = 'async'; button.append(image); image.src = url;
      button.onclick = () => {
        if (!roomAllowed(roomId)) return;
        $('lightbox-image').src = url; $('lightbox-image').alt = file.name;
        $('lightbox-name').textContent = file.name;
        $('lightbox-download').href = url; $('lightbox-download').download = file.name;
        $('lightbox').showModal();
      };
    }).catch(() => { if (button.isConnected) unavailable(); });
    return button;
  }
  const card = element('div', 'file-card'); card.append(icon('file'));
  const info = element('span', 'file-info'); info.append(element('strong', '', middleFilename(file.name)), element('small', '', fileSize(file.size)));
  info.firstChild.title = file.name;
  const download = element('button', 'file-download'); download.append(icon('download')); download.setAttribute('aria-label', 'Download ' + file.name); download.type = 'button';
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
function middleFilename(name) { return name.length > 36 ? name.slice(0, 20) + '…' + name.slice(-12) : name; }
async function preparePhoto(file) {
  if (!isImage(file)) return { file };
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    let width = bitmap.width, height = bitmap.height;
    if (file.type === 'image/gif' || (file.size <= 400 * 1024 && Math.max(width, height) <= 2048)) {
      return { file, width, height };
    }
    const scale = Math.min(1, 2048 / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale)); height = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d'); context.drawImage(bitmap, 0, 0, width, height);
    const encode = type => new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not compress this photo.')), type, .85));
    let blob;
    if (file.type === 'image/png') {
      const pixels = context.getImageData(0, 0, width, height).data;
      let transparent = false;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] < 255) { transparent = true; break; }
      if (transparent) { const png = await encode('image/png'); if (png.size <= 1.5 * 1024 * 1024) blob = png; }
    }
    if (!blob) {
      context.globalCompositeOperation = 'destination-over'; context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height);
      blob = await encode('image/jpeg');
    }
    const extension = blob.type === 'image/png' ? '.png' : '.jpg';
    const base = file.name.replace(/\.[^.]+$/, '');
    const randomName = base.length > 24 && base.replace(/[^0-9a-f]/gi, '').length > 24;
    const date = new Date(), pad = n => String(n).padStart(2, '0');
    const name = randomName ? 'photo-' + date.getFullYear() + pad(date.getMonth()+1) + pad(date.getDate()) + '-' + pad(date.getHours()) + pad(date.getMinutes()) + extension : base + extension;
    return { file: new File([blob], name, { type: blob.type }), width, height };
  } finally { bitmap.close(); }
}
async function sendFile(file) {
  if (!activeRoom) return toast('Choose a conversation before sharing a file.', true);
  if (file.size > 5 * 1024 * 1024 && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return toast('That file is too large. The maximum size is 5 MB.', true);
  stopTyping();
  const roomId = activeRoom.roomId, version = accountVersion, replyTo = replying?.id;
  sendingCount++; $('sending-state').hidden = false; $('sending-state').textContent = 'Sending… ' + file.name;
  try {
    $('sending-state').textContent = isImage(file) && file.type !== 'image/gif' ? 'Preparing photo…' : 'Sending… ' + file.name;
    const prepared = await preparePhoto(file); file = prepared.file;
    if (file.size > 5 * 1024 * 1024) throw new Error('That file is too large. The maximum size is 5 MB.');
    if (version !== accountVersion) return;
    $('sending-state').textContent = 'Sending… ' + file.name;
    const data = await file.arrayBuffer();
    if (version !== accountVersion) return;
    await request('file_send', { roomId, name: file.name, type: file.type || 'application/octet-stream', data, width: prepared.width, height: prepared.height, replyTo });
    if (replying?.id === replyTo) cancelReply();
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
function typingNames(roomId) {
  return [...(typers.get(roomId) || [])].filter(([, expiry]) => expiry > Date.now()).map(([name]) => name).sort();
}
function renderTyping() {
  clearTimeout(typingExpiryTimer);
  let nextExpiry = Infinity;
  for (const [room, people] of typers) {
    for (const [name, expiry] of people) { if (expiry <= Date.now()) people.delete(name); else nextExpiry = Math.min(nextExpiry, expiry); }
    if (!people.size) typers.delete(room);
  }
  const names = typingNames(activeRoom?.roomId), signature = JSON.stringify(names);
  if (signature !== typingSignature) {
    typingSignature = signature;
    $('typing-text').textContent = names.length >= 4 ? 'Several people are typing\u2026' : names.length === 3 ? names[0] + ', ' + names[1] + ' and ' + names[2] + ' are typing\u2026' : names.length === 2 ? names.join(' and ') + ' are typing\u2026' : names.length === 1 ? names[0] + ' is typing\u2026' : '';
    $('typing-indicator').classList.toggle('is-visible', names.length > 0);
  }
  if (nextExpiry < Infinity) typingExpiryTimer = setTimeout(() => { renderTyping(); renderLists(); }, Math.max(1, nextExpiry - Date.now()));
}
function stopTyping() {
  clearTimeout(typingTimer); lastTypingSent = 0;
  if (activeRoom && socket.connected) socket.emit('typing', { roomId: activeRoom.roomId, typing: false });
}
function growComposer() { const input = $('message-input'); input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 140) + 'px'; positionComposerPopups(); }
$('message-input').onkeydown = event => {
  if (mentionKey(event)) return;
  if (event.key === 'Escape') { cancelReply(); closeComposerMenus(); return; }
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('message-form').requestSubmit(); }
};
$('message-input').oninput = () => {
  growComposer(); updateMentionPopup(); if (!activeRoom) return;
  if (!$('message-input').value.trim()) return stopTyping();
  if (!lastTypingSent || Date.now() - lastTypingSent >= 2000) { socket.emit('typing', { roomId: activeRoom.roomId, typing: true }); lastTypingSent = Date.now(); }
  clearTimeout(typingTimer); typingTimer = setTimeout(stopTyping, 3000);
};
$('message-input').onblur = stopTyping;
const emojis = ['😀','😄','😁','😂','🤣','😊','🙂','😉','😍','🥰','😘','😎','🤔','😅','😭','🥲','😮','😴','🙃','🥳','👍','👎','👏','🙌','🤝','🙏','💪','👋','❤️','🧡','💛','💚','💙','💜','🔥','✨','🎉','🎊','🎯','✅','💯','👀','💬','📚','☕','🍕','🚀','🌟'];
for (const emoji of emojis) {
  const button = element('button', '', emoji); button.type = 'button'; button.setAttribute('aria-label', 'Insert ' + emoji);
  button.onclick = () => {
    const input = $('message-input'); if (input.value.length + emoji.length > 4000) return;
    input.setRangeText(emoji, input.selectionStart, input.selectionEnd, 'end');
    input.dispatchEvent(new Event('input')); input.focus();
  }; $('emoji-picker').append(button);
}
$('emoji-button').onclick = () => { const open = $('emoji-picker').hidden; closeComposerMenus(); $('emoji-picker').hidden = !open; $('emoji-button').setAttribute('aria-expanded', String(open)); if (open) positionComposerPopups(); };
$('message-form').onsubmit = async event => {
  event.preventDefault(); if (!activeRoom || !$('message-input').value.trim()) return;
  const roomId = activeRoom.roomId, version = accountVersion, text = $('message-input').value, replyTo = replying?.id;
  $('message-input').value = ''; growComposer(); stopTyping();
  cancelReply(); closeComposerMenus();
  try { await request('message_send', { roomId, text, replyTo }); }
  catch (error) {
    if (version !== accountVersion) return;
    if (activeRoom?.roomId === roomId && !$('message-input').value) { $('message-input').value = text; growComposer(); }
    showError(error);
  }
};
function setAuthMode(create) {
  creatingAccount = create; $('confirm-field').hidden = !create; $('confirm-input').required = create;
  $('password-input').autocomplete = create ? 'new-password' : 'current-password';
  $('login-mode').setAttribute('aria-pressed', String(!create)); $('register-mode').setAttribute('aria-pressed', String(create));
  document.querySelector('.auth-modes').classList.toggle('create', create);
  $('login-label').textContent = create ? 'Create account' : 'Log in'; $('login-error').textContent = '';
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
  lastMessages.clear(); for (const [id, message] of Object.entries(result.lastMessages || {})) { lastMessages.set(id, message); if (unread.get(id) && mentionsMe(message)) mentionUnread.add(id); }
  $('password-input').value = $('confirm-input').value = ''; $('password-input').type = 'password'; $('password-toggle').setAttribute('aria-label', 'Show password'); $('password-toggle').setAttribute('aria-pressed', 'false');
  document.body.classList.add('chatting');
  $('login-screen').hidden = true; $('chat-app').hidden = false; updateIdentity(); renderLists(); renderMessages(true);
}
function signedOut(message) {
  mentionUnread.clear(); accountVersion++; clearRoom(); forgetFiles();
  dismissBanner(); clearTimeout(typingExpiryTimer); typingSignature = ''; $('typing-text').textContent = ''; $('typing-indicator').classList.remove('is-visible');
  if (history.state?.wongchat === 'room') history.replaceState({ wongchat: 'list' }, '');
  selectedGroupId = null; myName = ''; users = []; groups = []; directRooms = []; profiles = {};
  readStates.clear(); histories.clear(); summaries.clear(); unread.clear(); typers.clear(); lastMessages.clear();
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  $('toasts').replaceChildren(); $('sidebar-search').value = ''; $('message-input').value = '';
  document.body.classList.remove('chatting');
  $('chat-app').hidden = true; $('login-screen').hidden = false; $('login-error').textContent = message;
  $('sending-state').hidden = true; document.documentElement.style.removeProperty('--accent'); updateTitle();
}
$('login-form').onsubmit = async event => {
  event.preventDefault(); $('login-button').disabled = true; $('login-button').classList.add('loading'); $('login-error').textContent = '';
  try {
    const username = $('name-input').value.trim(), password = $('password-input').value;
    if (!username || [...username].length > 20 || /[|\p{Cc}]/u.test(username)) throw new Error('Use 1–20 characters without | or control characters.');
    if ([...password].length < 6 || [...password].length > 72) throw new Error('Use a password with 6–72 characters.');
    if (creatingAccount && password !== $('confirm-input').value) throw new Error('Passwords do not match.');
    explicitLogin = true; if (!socket.connected) socket.connect();
    signedIn(await request(creatingAccount ? 'register' : 'login', { username, password }));
  } catch (error) { $('login-error').textContent = error.message; }
  finally { explicitLogin = false; $('login-button').disabled = false; $('login-button').classList.remove('loading'); }
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
    const result = await request('group_create', { name }); $('group-input').value = ''; $('create-group-sheet').close();
    await openRoom({ roomId: result.roomId }, name, 'group');
  } catch (error) { $('group-error').textContent = error.message; showError(error); }
  finally { button.disabled = false; }
};
$('summarize').onclick = async () => {
  closeComposerMenus();
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
$('edit-profile').onclick = () => { $('me-sheet').close(); editProfile(); };
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
  const group = groups.find(g => g.roomId === (selectedGroupId || activeRoom?.roomId)); $('member-list-content').replaceChildren();
  if (!group) { $('member-list').close(); return; }
  for (const name of group.members) {
    const row = element('li', 'member-row'), button = element('button', 'text-button', name); button.type = 'button';
    button.onclick = () => { $('member-list').close(); showProfile(name); };
    row.append(avatar(name), button, element('small', '', users.includes(name) ? 'Online' : 'Offline'));
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
  if (selectedGroupId && !groups.some(g => g.roomId === selectedGroupId && g.members.includes(myName))) selectedGroupId = null;
  if (activeRoom?.kind === 'group' && !groupFor(activeRoom.roomId)?.members.includes(myName)) clearRoom();
  const cached = new Set([...histories.keys(), ...unread.keys(), ...lastMessages.keys()]);
  for (const id of cached) {
    if ((id.startsWith('group:') || id.startsWith('channel:')) && !groupFor(id)?.members.includes(myName)) {
      readStates.delete(id); histories.delete(id); summaries.delete(id); unread.delete(id); typers.delete(id); lastMessages.delete(id); mentionUnread.delete(id); forgetFiles(id);
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
  if (activeRoom?.roomId === message.roomId && document.visibilityState === 'visible') {
    const wasNearBottom = nearBottom(); markOpenRead();
    renderMessages(); if (!wasNearBottom) $('new-messages').hidden = false;
  } else if (message.sender !== myName) {
    if (mentionsMe(message)) mentionUnread.add(message.roomId);
    unread.set(message.roomId, (unread.get(message.roomId) || 0) + 1);
    if (message.sender !== myName) announceMessage(message);
  }
  typers.get(message.roomId)?.delete(message.sender); renderTyping();
  renderLists();
});
socket.on('typing_update', ({ roomId, name, typing }) => {
  const people = typers.get(roomId) || new Map();
  if (typing) people.set(name, Date.now() + 5000); else people.delete(name);
  typers.set(roomId, people); renderTyping(); renderLists();
});

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

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopTyping();
  else if (activeRoom && document.visibilityState === 'visible') { markOpenRead(); renderLists(); renderMessages(); }
});
const leaveGroup = element('button', 'secondary', 'Leave group'); leaveGroup.type = 'button';
async function leaveSelectedGroup() {
  const room = groups.find(g => g.roomId === (selectedGroupId || activeRoom?.roomId)); if (!room) return;
  leaveGroup.disabled = true;
  try { await request('group_leave', { roomId: room.roomId }); if (selectedGroupId === room.roomId) selectedGroupId = null; $('member-list').close(); renderLists(); toast('Left ' + room.name); }
  catch (error) { showError(error); }
  finally { leaveGroup.disabled = false; }
}
leaveGroup.onclick = leaveSelectedGroup;
$('member-list-content').after(leaveGroup);

function syncScreens() {
  const mobile = matchMedia('(max-width: 767px)').matches, open = $('chat-app').classList.contains('room-open');
  document.querySelector('.sidebar').inert = mobile && open;
  $('chat-window').inert = mobile && !open;
  document.querySelector('.rail').inert = mobile && open;
}
window.addEventListener('resize', syncScreens); syncScreens();
// The AI button starts the message with "@ai " so users discover the AI command.
$('ask-ai').onclick = () => {
  closeComposerMenus();
  const input = $('message-input');
  if (!/^@ai\b/i.test(input.value)) input.value = '@ai ' + input.value.trimStart();
  input.focus(); input.setSelectionRange(input.value.length, input.value.length); input.dispatchEvent(new Event('input'));
};
function memberCount(count) { return count + (count === 1 ? ' member' : ' members'); }

function readersFor(message) {
  const messages = histories.get(message.roomId) || [], index = messages.findIndex(m => m.id === message.id);
  const members = groupFor(message.roomId)?.members || message.roomId.slice(3).split('|');
  return members.filter(name => name !== myName && messages.findIndex(m => m.id === readStates.get(message.roomId)?.[name]) >= index);
}
function renderReadSheet() {
  const roomId = $('read-sheet').dataset.roomId, messageId = $('read-sheet').dataset.messageId;
  const message = histories.get(roomId)?.find(m => m.id === messageId);
  if (!message || !roomAllowed(roomId)) { $('read-sheet').close(); return; }
  const list = $('read-list'); list.replaceChildren();
  for (const name of readersFor(message)) {
    const row = element('li', 'member-row'); row.append(avatar(name, '', false), element('span', '', name)); list.append(row);
  }
  if (!list.childElementCount) list.append(element('li', 'muted', 'No readers yet.'));
}
function renderReceipts() {
  $('messages').querySelectorAll('.read-receipt').forEach(node => node.remove());
  if (!activeRoom) return;
  const own = (histories.get(activeRoom.roomId) || []).filter(m => m.sender === myName && ['chat', 'file'].includes(m.kind));
  const latest = own.at(-1);
  for (const stack of $('messages').querySelectorAll('[data-own-message]')) {
    const message = own.find(m => m.id === stack.dataset.ownMessage);
    if (!message) continue;
    const readers = readersFor(message);
    if (activeRoom.kind === 'group') {
      if (message !== latest || !readers.length) continue;
      const receipt = element('button', 'read-receipt', 'Read by ' + readers.length); receipt.type = 'button';
      receipt.onclick = () => {
        $('read-sheet').dataset.roomId = message.roomId; $('read-sheet').dataset.messageId = message.id;
        renderReadSheet(); $('read-sheet').showModal();
      }; stack.append(receipt);
    } else if (message === latest) {
      stack.append(element('small', 'read-receipt', readers.length ? 'Read' : 'Sent'));
    }
  }
}
socket.on('read_update', ({ roomId, username, messageId }) => {
  if (!roomAllowed(roomId)) return;
  const state = readStates.get(roomId) || {};
  const messages = histories.get(roomId) || [];
  const current = messages.findIndex(m => m.id === state[username]), next = messages.findIndex(m => m.id === messageId);
  if (next < current) return;
  Object.defineProperty(state, username, { value: messageId, enumerable: true, configurable: true, writable: true });
  readStates.set(roomId, state);
  if (activeRoom?.roomId === roomId) renderReceipts();
  if ($('read-sheet').open) renderReadSheet();
});
$('lightbox-download').replaceChildren(icon('download'));
$('lightbox-download').setAttribute('aria-label', 'Download photo');
// Members learn about deletes/clears from the server; the creator already got a toast from their own action.
socket.on('group_deleted', ({ roomId, name, by }) => {
  if (activeRoom?.roomId === roomId) clearRoom();
  if (selectedGroupId === roomId) selectedGroupId = null;
  wipeLocalRoom(roomId); histories.delete(roomId); readStates.delete(roomId);
  if (by !== myName) toast(name + ' was deleted by ' + by);
});
socket.on('room_cleared', ({ roomId, by }) => {
  wipeLocalRoom(roomId);
  if (by !== myName && activeRoom?.roomId === roomId) toast(by + ' cleared this chat');
});

// Updates are private and never count as new unread messages.
socket.on('message_update', message => {
  if (!roomAllowed(message.roomId)) return;
  const messages = histories.get(message.roomId) || [], index = messages.findIndex(m => m.id === message.id);
  if (index >= 0) messages[index] = message;
  if (lastMessages.get(message.roomId)?.id === message.id) lastMessages.set(message.roomId, message);
  if (message.deleted) {
    forgetFiles(message.roomId);
    if (replying?.id === message.id) cancelReply();
    for (const cached of messages) if (cached.reply?.id === message.id) cached.reply = { ...cached.reply, text: '', deleted: true };
    if (!messages.some(mentionsMe)) mentionUnread.delete(message.roomId);
  }
  if (activeRoom?.roomId === message.roomId) renderMessages(); renderLists();
});
