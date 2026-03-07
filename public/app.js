const authSection = document.getElementById('authSection');
const chatSection = document.getElementById('chatSection');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const sendBtn = document.getElementById('sendBtn');
const messageInput = document.getElementById('messageInput');
const messages = document.getElementById('messages');
const chatTitle = document.getElementById('chatTitle');

const usernameInput = document.getElementById('username');
const roomInput = document.getElementById('room');
const secretInput = document.getElementById('secret');
const avatarInput = document.getElementById('avatar');

let state = null;
let pollingTimer = null;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function loadSavedProfile() {
  const raw = localStorage.getItem('secure-chat-profile');
  if (!raw) return;
  try {
    const profile = JSON.parse(raw);
    usernameInput.value = profile.username || '';
    roomInput.value = profile.room || 'main';
    secretInput.value = profile.secret || '';
  } catch {
    // ignore broken data
  }
}

async function avatarToDataUrl(file) {
  if (!file) return null;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function deriveKey(secret) {
  const baseKey = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('secure-chat-fixed-salt-v1'),
      iterations: 180000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptMessage(key, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(text));
  return {
    iv: btoa(String.fromCharCode(...iv)),
    cipher: btoa(String.fromCharCode(...new Uint8Array(cipherBuffer)))
  };
}

async function decryptMessage(key, ivBase64, cipherBase64) {
  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
  const bytes = Uint8Array.from(atob(cipherBase64), (c) => c.charCodeAt(0));
  const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, bytes);
  return decoder.decode(plainBuffer);
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function addMessage({ sender, avatar, text, sentAt }) {
  const node = document.createElement('div');
  node.className = 'msg';

  const avatarEl = document.createElement('img');
  avatarEl.alt = sender;
  avatarEl.src =
    avatar ||
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="100%" height="100%" fill="%23334155"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="30" fill="white">🙂</text></svg>';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = `<div class="meta">${sender} • ${formatTime(sentAt)}</div><div>${text}</div>`;

  node.append(avatarEl, bubble);
  messages.append(node);
  messages.scrollTop = messages.scrollHeight;
}

async function pollLoop() {
  if (!state) return;
  try {
    const res = await fetch(`/api/poll?room=${encodeURIComponent(state.room)}&cursor=${state.cursor}`);
    const data = await res.json();
    state.cursor = data.cursor;

    for (const payload of data.messages) {
      try {
        const text = await decryptMessage(state.key, payload.iv, payload.cipher);
        addMessage({ sender: payload.sender, avatar: payload.avatar, text, sentAt: payload.sentAt });
      } catch {
        addMessage({
          sender: payload.sender || 'unknown',
          avatar: payload.avatar,
          text: '⚠️ Не удалось расшифровать сообщение (вероятно другой ключ).',
          sentAt: payload.sentAt || Date.now()
        });
      }
    }
  } catch {
    addMessage({ sender: 'system', text: '⚠️ Ошибка сети при синхронизации.', sentAt: Date.now() });
  } finally {
    pollingTimer = setTimeout(pollLoop, 900);
  }
}

async function joinChat() {
  const username = usernameInput.value.trim();
  const room = roomInput.value.trim() || 'main';
  const secret = secretInput.value;

  if (!username || !secret) {
    alert('Введите имя пользователя и секретный ключ комнаты.');
    return;
  }

  const avatar = await avatarToDataUrl(avatarInput.files?.[0]);
  const key = await deriveKey(secret);
  const joinRes = await fetch('/api/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room })
  });
  const joinData = await joinRes.json();

  state = {
    username,
    room,
    avatar,
    key,
    cursor: joinData.cursor
  };

  localStorage.setItem('secure-chat-profile', JSON.stringify({ username, room, secret }));

  chatTitle.textContent = `Комната: ${room}`;
  authSection.classList.add('hidden');
  chatSection.classList.remove('hidden');
  messages.innerHTML = '';

  addMessage({ sender: 'system', text: 'Вы подключились. Сервер хранит только шифротекст.', sentAt: Date.now() });
  pollLoop();
}

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !state) return;

  const encrypted = await encryptMessage(state.key, text);

  await fetch('/api/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      room: state.room,
      sender: state.username,
      avatar: state.avatar,
      ...encrypted
    })
  });

  messageInput.value = '';
  messageInput.focus();
}

registerBtn.addEventListener('click', joinChat);
sendBtn.addEventListener('click', sendMessage);
logoutBtn.addEventListener('click', () => location.reload());
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

document.querySelectorAll('.emoji-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    messageInput.value += btn.dataset.emoji || '';
    messageInput.focus();
  });
});

window.addEventListener('beforeunload', () => {
  if (pollingTimer) clearTimeout(pollingTimer);
});

loadSavedProfile();
