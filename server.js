/**
 * Play game - Local Server
 * Run: node server.js
 * No npm install needed — uses only built-in Node.js modules!
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT = process.env.PORT || 3000;
const BASE_DIR = __dirname;
const APK_DIR  = path.join(BASE_DIR, 'apk');
const UPL_DIR  = path.join(BASE_DIR, 'uploads');
const ICON_DIR = path.join(UPL_DIR, 'icons');
const SS_DIR   = path.join(UPL_DIR, 'screenshots');
const DATA_FILE = path.join(BASE_DIR, 'data', 'data.json');

// Create folders if missing
[path.join(BASE_DIR, 'data'), APK_DIR, ICON_DIR, SS_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

// ── MIME types ────────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.apk': 'application/vnd.android.package-archive',
  '.ico': 'image/x-icon'
};

// ── Data helpers ──────────────────────────────────────────────────────────────
function readData() {
  if (!fs.existsSync(DATA_FILE)) { writeData(defaultData()); return defaultData(); }
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); } catch(e) { return defaultData(); }
}
function writeData(d) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2), 'utf-8');
}
function defaultData() {
  return {
    appInfo: {
      appName: 'Play game', developerName: 'Knight Studios',
      description: 'An epic medieval strategy and action game. Command your knights, conquer kingdoms, and rise to glory in this immersive fantasy world. Featuring rich graphics, smooth gameplay, and unlimited adventure.',
      version: '1.0.0', size: '45 MB', ageRating: '3+', category: 'Games',
      containsAds: false, inAppPurchases: false,
      iconFile: null, apkFileName: null, apkUrl: null,
      apkUploadedAt: null, apkFileSizeBytes: null, downloadCount: 5000
    },
    reviews: [
      { id:1, userName:'Rahul Sharma', rating:5, comment:'Amazing game! Graphics are stunning. Must play!', createdAt:'2025-03-22T10:00:00Z' },
      { id:2, userName:'Priya Verma',  rating:4, comment:'Really good medieval game. Love the knight characters!', createdAt:'2025-03-20T10:00:00Z' },
      { id:3, userName:'Amit Patel',   rating:5, comment:'Best game I played this year! Epic battles.', createdAt:'2025-03-18T10:00:00Z' }
    ],
    screenshots: [], nextId: 4
  };
}

// ── Body reader ───────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ── Static file server ────────────────────────────────────────────────────────
function serveFile(res, filePath) {
  if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('Not found'); return; }
  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    'Content-Type': mime,
    'Content-Length': stat.size,
    'Cache-Control': 'no-cache'
  });
  fs.createReadStream(filePath).pipe(res);
}

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ── Router ────────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const method   = req.method;

  try {

    // ── GET /api/data ─────────────────────────────────────────────────────────
    if (method === 'GET' && pathname === '/api/data') {
      return json(res, readData());
    }

    // ── POST /api/count-download (frontend calls this for external URL) ──────
    if (method === 'POST' && pathname === '/api/count-download') {
      const d = readData();
      d.appInfo.downloadCount = (d.appInfo.downloadCount || 0) + 1;
      writeData(d);
      return json(res, { ok: true });
    }

    // ── GET /api/download-apk ─────────────────────────────────────────────────
    if (method === 'GET' && pathname === '/api/download-apk') {
      const d = readData();
      // External URL — proxy download (user stays on our page, no redirect)
      if (d.appInfo.apkUrl) {
        d.appInfo.downloadCount = (d.appInfo.downloadCount || 0) + 1;
        writeData(d);
        res.writeHead(200, {
          'Content-Type': 'application/vnd.android.package-archive',
          'Content-Disposition': 'attachment; filename="game.apk"',
          'Cache-Control': 'no-cache'
        });
        // Follow redirects and stream file to user
        const proxyDownload = (targetUrl, hops) => {
          if (hops > 10) return res.end();
          const mod = targetUrl.startsWith('https') ? require('https') : require('http');
          const opts = Object.assign(require('url').parse(targetUrl), {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
          });
          mod.get(opts, (r) => {
            if ((r.statusCode === 301 || r.statusCode === 302 || r.statusCode === 303 || r.statusCode === 307 || r.statusCode === 308) && r.headers.location) {
              r.resume();
              proxyDownload(r.headers.location, hops + 1);
            } else {
              r.pipe(res);
            }
          }).on('error', () => res.end());
        };
        proxyDownload(d.appInfo.apkUrl, 0);
        return;
      }
      // Local file
      if (!d.appInfo.apkFileName) { return json(res, { error: 'No APK' }, 404); }
      const fp = path.join(APK_DIR, d.appInfo.apkFileName);
      if (!fs.existsSync(fp)) { return json(res, { error: 'File missing' }, 404); }
      d.appInfo.downloadCount = (d.appInfo.downloadCount || 0) + 1;
      writeData(d);
      const stat = fs.statSync(fp);
      res.writeHead(200, {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': `attachment; filename="${d.appInfo.apkFileName}"`,
        'Content-Length': stat.size
      });
      return fs.createReadStream(fp).pipe(res);
    }

    // ── POST /api/update-info ─────────────────────────────────────────────────
    if (method === 'POST' && pathname === '/api/update-info') {
      const body = JSON.parse((await readBody(req)).toString());
      const d = readData();
      Object.assign(d.appInfo, body);
      writeData(d);
      return json(res, { ok: true });
    }

    // ── POST /api/upload-apk  (base64 JSON) ───────────────────────────────────
    if (method === 'POST' && pathname === '/api/upload-apk') {
      const raw  = (await readBody(req)).toString();
      const body = JSON.parse(raw);                // { fileName, data: base64 }
      if (!body.fileName || !body.data) return json(res, { error: 'Missing fields' }, 400);

      // Sanitise filename — only keep safe chars
      const safeName = path.basename(body.fileName).replace(/[^a-zA-Z0-9._\-]/g, '_');
      const buf = Buffer.from(body.data, 'base64');
      fs.writeFileSync(path.join(APK_DIR, safeName), buf);

      const d = readData();
      d.appInfo.apkFileName     = safeName;
      d.appInfo.apkUrl          = null; // clear any external URL
      d.appInfo.apkUploadedAt   = new Date().toISOString();
      d.appInfo.apkFileSizeBytes = buf.length;
      writeData(d);
      return json(res, { ok: true, fileName: safeName, sizeBytes: buf.length });
    }

    // ── POST /api/set-apk-url ─────────────────────────────────────────────────
    if (method === 'POST' && pathname === '/api/set-apk-url') {
      const body = JSON.parse((await readBody(req)).toString());
      if (!body.url) return json(res, { error: 'url required' }, 400);
      const d = readData();
      // Delete old local APK file if it exists
      if (d.appInfo.apkFileName) {
        const oldFile = path.join(APK_DIR, d.appInfo.apkFileName);
        if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
      }
      d.appInfo.apkFileName      = null;
      d.appInfo.apkUrl           = body.url;
      d.appInfo.apkUploadedAt    = new Date().toISOString();
      d.appInfo.apkFileSizeBytes = null;
      writeData(d);
      return json(res, { ok: true, url: body.url });
    }

    // ── POST /api/delete-apk ──────────────────────────────────────────────────
    if (method === 'POST' && pathname === '/api/delete-apk') {
      const d = readData();
      // Delete local file if it exists
      if (d.appInfo.apkFileName) {
        const fp = path.join(APK_DIR, d.appInfo.apkFileName);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
      d.appInfo.apkFileName      = null;
      d.appInfo.apkUrl           = null;
      d.appInfo.apkUploadedAt    = null;
      d.appInfo.apkFileSizeBytes = null;
      writeData(d);
      return json(res, { ok: true });
    }

    // ── POST /api/upload-icon (base64 JSON) ───────────────────────────────────
    if (method === 'POST' && pathname === '/api/upload-icon') {
      const body = JSON.parse((await readBody(req)).toString()); // { fileName, data }
      if (!body.fileName || !body.data) return json(res, { error: 'Missing fields' }, 400);
      const safeName = 'icon' + path.extname(body.fileName);
      const buf = Buffer.from(body.data, 'base64');
      fs.writeFileSync(path.join(ICON_DIR, safeName), buf);
      const d = readData();
      d.appInfo.iconFile = '/uploads/icons/' + safeName;
      writeData(d);
      return json(res, { ok: true, iconUrl: d.appInfo.iconFile });
    }

    // ── POST /api/upload-screenshot (base64 JSON) ─────────────────────────────
    if (method === 'POST' && pathname === '/api/upload-screenshot') {
      const body = JSON.parse((await readBody(req)).toString()); // { fileName, data }
      if (!body.fileName || !body.data) return json(res, { error: 'Missing fields' }, 400);
      const safeName = 'ss-' + Date.now() + path.extname(body.fileName);
      const buf = Buffer.from(body.data, 'base64');
      fs.writeFileSync(path.join(SS_DIR, safeName), buf);
      const d = readData();
      const ss = { id: d.nextId++, url: '/uploads/screenshots/' + safeName, caption: body.caption || null, createdAt: new Date().toISOString() };
      d.screenshots.push(ss);
      writeData(d);
      return json(res, ss, 201);
    }

    // ── POST /api/add-screenshot-url ──────────────────────────────────────────
    if (method === 'POST' && pathname === '/api/add-screenshot-url') {
      const body = JSON.parse((await readBody(req)).toString());
      if (!body.url) return json(res, { error: 'url required' }, 400);
      const d = readData();
      const ss = { id: d.nextId++, url: body.url, caption: body.caption || null, createdAt: new Date().toISOString() };
      d.screenshots.push(ss);
      writeData(d);
      return json(res, ss, 201);
    }

    // ── POST /api/add-review ──────────────────────────────────────────────────
    if (method === 'POST' && pathname === '/api/add-review') {
      const body = JSON.parse((await readBody(req)).toString());
      if (!body.userName || !body.rating || !body.comment) return json(res, { error: 'Missing fields' }, 400);
      const d = readData();
      const r = { id: d.nextId++, userName: body.userName, rating: Number(body.rating), comment: body.comment, createdAt: new Date().toISOString() };
      d.reviews.unshift(r);
      writeData(d);
      return json(res, r, 201);
    }

    // ── DELETE /api/delete-review/:id ─────────────────────────────────────────
    if (method === 'DELETE' && pathname.startsWith('/api/delete-review/')) {
      const id = Number(pathname.split('/').pop());
      const d  = readData();
      d.reviews = d.reviews.filter(r => r.id !== id);
      writeData(d);
      return json(res, { ok: true });
    }

    // ── DELETE /api/delete-screenshot/:id ─────────────────────────────────────
    if (method === 'DELETE' && pathname.startsWith('/api/delete-screenshot/')) {
      const id = Number(pathname.split('/').pop());
      const d  = readData();
      const ss = d.screenshots.find(s => s.id === id);
      if (ss && ss.url && ss.url.startsWith('/uploads/')) {
        const fp = path.join(BASE_DIR, ss.url);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
      d.screenshots = d.screenshots.filter(s => s.id !== id);
      writeData(d);
      return json(res, { ok: true });
    }

    // ── Static files: /uploads/* and /apk/* ───────────────────────────────────
    if (pathname.startsWith('/uploads/') || pathname.startsWith('/apk/')) {
      return serveFile(res, path.join(BASE_DIR, pathname));
    }

    // ── Static HTML/assets ────────────────────────────────────────────────────
    let filePath = path.join(BASE_DIR, pathname === '/' ? 'index.html' : pathname);
    // Security: prevent directory traversal
    if (!filePath.startsWith(BASE_DIR)) { res.writeHead(403); res.end(); return; }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return serveFile(res, filePath);
    }

    res.writeHead(404); res.end('Not found');

  } catch (err) {
    console.error('Error:', err.message);
    if (!res.headersSent) json(res, { error: err.message }, 500);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log('\n================================================');
  console.log('  ⚔️  Play game Server — Chalu ho gaya!');
  console.log('================================================');
  console.log(`\n  🌐 User Page   →  http://localhost:${PORT}`);
  console.log(`  ⚙️  Admin Panel →  http://localhost:${PORT}/admin.html`);
  console.log('\n  Server band karne ke liye: Ctrl + C');
  console.log('================================================\n');
});
