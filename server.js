require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('./db/supabase');
const { supabase, sb } = db;
const auth = require('./db/auth');
const uploads = require('./db/uploads');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

// Server-side folders/files that must never be served as static files
// (credentials in data/, .env, server code, backups, source).
const PRIVATE_TOP_LEVEL = new Set(['data', 'db', 'scripts', 'supabase', 'node_modules', 'backup-original', 'src']);
const PRIVATE_FILES = new Set(['server.js', 'package.json', 'package-lock.json']);

function isPublicStaticPath(relPath) {
  const parts = relPath.split(/[\\/]+/).filter(Boolean);
  if (parts.some((part) => part.startsWith('.'))) return false;
  if (parts.length > 0 && PRIVATE_TOP_LEVEL.has(parts[0])) return false;
  if (parts.length === 1 && PRIVATE_FILES.has(parts[0])) return false;
  return true;
}

uploads.ensureUploadDir();

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// Collects raw Buffers (so multi-byte Thai characters split across chunks stay intact)
// and stops reading once the limit is exceeded.
function parseBody(req, maxBytes = 10 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let done = false;
    const fail = (err) => {
      if (done) return;
      done = true;
      reject(err);
    };
    req.on('data', chunk => {
      if (done) return;
      size += chunk.length;
      if (size > maxBytes) {
        chunks.length = 0;
        req.resume(); // drain the rest without buffering it
        return fail(httpError(413, 'Payload too large'));
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (done) return;
      done = true;
      const body = Buffer.concat(chunks).toString('utf8');
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(httpError(400, 'Invalid JSON body'));
      }
    });
    req.on('error', fail);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  const [rawPath] = req.url.split('?');
  const cleanUrl = rawPath.split('#')[0];

  // ----------------------------------------------------------------
  // REST API Endpoints
  // ----------------------------------------------------------------
  if (cleanUrl.startsWith('/api/')) {
    try {
      // 1. Health & Database Status Check
      if (cleanUrl === '/api/health' && req.method === 'GET') {
        return sendJson(res, 200, {
          status: 'ok',
          database: db.isCloudConfigured ? 'supabase_cloud' : 'local_storage',
          timestamp: new Date().toISOString(),
        });
      }

      // 1.1 Authentication Endpoints
      if (cleanUrl === '/api/auth/login' && req.method === 'POST') {
        const { username, password } = await parseBody(req);
        const result = await auth.login(username, password);
        return sendJson(res, result.success ? 200 : 401, result);
      }

      if (cleanUrl === '/api/auth/register' && req.method === 'POST') {
        const body = await parseBody(req);
        const result = await auth.register(body);
        return sendJson(res, result.success ? 200 : 400, result);
      }

      if (cleanUrl === '/api/auth/accounts' && req.method === 'GET') {
        return sendJson(res, 200, auth.getQuickAccounts());
      }

      // 2. Fetch full system state
      if (cleanUrl === '/api/state' && req.method === 'GET') {
        const state = await db.getState();
        return sendJson(res, 200, state);
      }

      // 3. Dispatch & Sync an Action
      if (cleanUrl === '/api/action' && req.method === 'POST') {
        const { action, currentState } = await parseBody(req);
        if (!action) {
          return sendJson(res, 400, { error: 'Action object is required' });
        }
        const result = await db.syncAction(action, currentState);
        return sendJson(res, 200, result);
      }

      // 4. Batch Sync State to Supabase Cloud & Local Storage
      if (cleanUrl === '/api/sync' && req.method === 'POST') {
        const { state } = await parseBody(req);
        if (!state) {
          return sendJson(res, 400, { error: 'State object is required' });
        }
        const result = await db.syncFullState(state);
        return sendJson(res, 200, { success: true, ...result, savedAt: new Date().toISOString() });
      }

      // 5. File upload: { filename, mimeType, dataUrl } (or { filename, mimeType, base64 })
      //    -> { ok: true, url: "/uploads/<unique-filename>" }
      if (cleanUrl === '/api/upload' && req.method === 'POST') {
        const body = await parseBody(req, uploads.MAX_UPLOAD_BODY_BYTES).catch((err) => {
          throw err.statusCode === 413 ? httpError(413, 'ไฟล์ต้องมีขนาดไม่เกิน 10 MB') : err;
        });
        const result = await uploads.saveUpload(body, supabase);
        return sendJson(res, 200, result);
      }

      return sendJson(res, 404, { error: 'API endpoint not found' });
    } catch (err) {
      const status = err.statusCode || 500;
      if (status >= 500) console.error('[API Error]:', err);
      return sendJson(res, status, { ok: false, error: err.message });
    }
  }

  // ----------------------------------------------------------------
  // Uploaded files: /uploads/<name> -> data/uploads/<name>
  // ----------------------------------------------------------------
  if (cleanUrl.startsWith('/uploads/')) {
    const target = uploads.resolveUploadPath(cleanUrl);
    if (!target) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }
    return fs.stat(target.filePath, (statErr, stat) => {
      if (statErr || !stat.isFile()) {
        // Local copy missing (e.g. fresh deploy) -> fall back to the Supabase Storage copy if any.
        const cloudUrl = uploads.cloudUrlFor(supabase, target.name);
        if (cloudUrl) {
          res.writeHead(302, { Location: cloudUrl });
          return res.end();
        }
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Not found');
      }
      const ext = path.extname(target.filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Content-Length': stat.size,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      });
      fs.createReadStream(target.filePath).pipe(res);
    });
  }

  // ----------------------------------------------------------------
  // Static File Serving
  // ----------------------------------------------------------------
  let filePath = path.resolve(__dirname, '.' + (cleanUrl === '/' ? '/index.html' : cleanUrl));
  const relPath = path.relative(__dirname, filePath);

  // Never serve files outside the project or server-only files (passwords, .env, DB, source).
  if (relPath.startsWith('..') || path.isAbsolute(relPath) || !isPublicStaticPath(relPath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Not found');
  }

  // SPA fallback for non-file requests
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(__dirname, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Server Error: ' + err.message);
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log('====================================================');
  console.log(`EduMarket is running at: http://localhost:${PORT}`);
  console.log(`Database Mode: ${db.isCloudConfigured ? '🟢 Supabase Cloud' : '🟡 Local Storage (data/local-db.json)'}`);
  console.log('API Endpoints available: /api/state, /api/action, /api/sync, /api/health, /api/auth/*, /api/upload');
  console.log('====================================================');
});
