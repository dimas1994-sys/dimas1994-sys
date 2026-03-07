const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { messages: [], clients: new Set() });
  }
  return rooms.get(roomId);
}

function sendJson(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (chunk) => {
      buf += chunk;
      if (buf.length > 1e6) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(buf ? JSON.parse(buf) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : req.url;
  const safePath = path.normalize(urlPath).replace(/^\/+/, '');
  const fullPath = path.join(PUBLIC_DIR, safePath);

  if (!fullPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }

    const ext = path.extname(fullPath);
    const contentType =
      ext === '.html' ? 'text/html; charset=utf-8' :
      ext === '.css' ? 'text/css; charset=utf-8' :
      ext === '.js' ? 'application/javascript; charset=utf-8' :
      'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/join') {
    try {
      const body = await parseBody(req);
      const room = String(body.room || 'main');
      const clientId = randomUUID();
      const roomState = getRoom(room);
      roomState.clients.add(clientId);
      return sendJson(res, 200, { clientId, room, cursor: roomState.messages.length });
    } catch {
      return sendJson(res, 400, { error: 'Bad request' });
    }
  }

  if (req.method === 'POST' && req.url === '/api/send') {
    try {
      const body = await parseBody(req);
      const room = String(body.room || 'main');
      const roomState = getRoom(room);

      roomState.messages.push({
        sender: body.sender,
        avatar: body.avatar,
        cipher: body.cipher,
        iv: body.iv,
        sentAt: Date.now()
      });

      if (roomState.messages.length > 2000) {
        roomState.messages.shift();
      }

      return sendJson(res, 200, { ok: true });
    } catch {
      return sendJson(res, 400, { error: 'Bad request' });
    }
  }

  if (req.method === 'GET' && req.url.startsWith('/api/poll')) {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const room = requestUrl.searchParams.get('room') || 'main';
    const cursor = Number(requestUrl.searchParams.get('cursor') || '0');
    const roomState = getRoom(room);
    const messages = roomState.messages.slice(Math.max(0, cursor));
    return sendJson(res, 200, { messages, cursor: roomState.messages.length });
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  return serveStatic(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Chat server is running on http://localhost:${PORT}`);
});
