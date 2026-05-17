import https from 'node:https';
import http from 'node:http';
import net from 'node:net';
import { readFileSync } from 'node:fs';
import { resolve, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const cert = readFileSync(resolve(root, '.certs/cert.pem'));
const key = readFileSync(resolve(root, '.certs/key.pem'));

let config;
try {
  config = JSON.parse(readFileSync(resolve(root, 'config.json'), 'utf8'));
} catch (err) {
  console.error(`\nCannot read config.json: ${err.message}`);
  console.error(
    'Create config.json at the repo root with at least { "redmineServerUrl": "https://your-redmine.example.com" }.\n'
  );
  process.exit(1);
}

if (!config.redmineServerUrl) {
  console.error(
    '\nconfig.json is missing "redmineServerUrl" — the Redmine host the dev proxy forwards to.\n'
  );
  process.exit(1);
}

const AI_PROVIDER_HOSTS = {
  anthropic: 'https://api.anthropic.com',
  claude: 'https://api.anthropic.com',
  openai: 'https://api.openai.com',
};

const aiProvider = (config.aiProvider || 'anthropic').toLowerCase();
const aiTarget = AI_PROVIDER_HOSTS[aiProvider];
if (!aiTarget) {
  console.error(
    `\nconfig.json "aiProvider" = "${config.aiProvider}" is not recognized. Use one of: ${Object.keys(AI_PROVIDER_HOSTS).join(', ')}.\n`
  );
  process.exit(1);
}

// ── CORS proxy ──────────────────────────────────────────────────

const proxies = [
  { port: 8010, target: config.redmineServerUrl, label: 'Redmine' },
  { port: 8011, target: aiTarget, label: `AI (${aiProvider})` },
];

function startProxy({ port, target, label }) {
  const server = https.createServer({ cert, key }, (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, target);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: req.method,
      headers: { ...req.headers, host: url.hostname },
    };

    const proxy = https.request(options, (proxyRes) => {
      const headers = { ...proxyRes.headers, 'Access-Control-Allow-Origin': '*' };
      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res);
    });

    proxy.on('error', (err) => {
      res.writeHead(502);
      res.end(`Proxy error: ${err.message}`);
    });

    req.pipe(proxy);
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`  ${label} proxy: https://0.0.0.0:${port} → ${target}`);
  });
}

// ── Static file server ──────────────────────────────────────────

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
};

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (urlPath === '/') urlPath = '/index.html';

  // Cert download endpoint
  if (urlPath === '/cert') {
    res.writeHead(200, {
      'Content-Type': 'application/x-x509-ca-cert',
      'Content-Disposition': 'attachment; filename="redmine-calendar-dev.crt"',
    });
    res.end(cert);
    return;
  }

  const filePath = join(root, urlPath);

  // Path-traversal guard (string check; not subject to TOCTOU).
  if (!filePath.startsWith(root)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  // Try-read pattern instead of existsSync/statSync-then-readFileSync to
  // eliminate the time-of-check / time-of-use window. readFileSync throws:
  //   - ENOENT (file missing) — equivalent to the old existsSync miss
  //   - EISDIR (path is a directory) — equivalent to the old isDirectory()
  //   - EPERM / EACCES (permission) — silently 404'd by the old code, now too
  let data;
  try {
    data = readFileSync(filePath);
  } catch {
    // Stub /version.json in dev so the settings page doesn't 404. CI generates
    // the real file at deploy time.
    if (urlPath === '/version.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"version":"dev"}');
      return;
    }
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
  res.end(data);
}

// ── Dual HTTP/HTTPS on port 3000 ────────────────────────────────

const httpsServer = https.createServer({ cert, key }, serveStatic);
const httpServer = http.createServer((req, res) => {
  const host = req.headers.host?.replace(/:\d+$/, '') ?? 'localhost';
  res.writeHead(301, { Location: `https://${host}:3000${req.url}` });
  res.end();
});

const server = net.createServer((socket) => {
  socket.once('data', (buf) => {
    // TLS handshake starts with 0x16; plain HTTP starts with an ASCII letter
    const target = buf[0] === 0x16 ? httpsServer : httpServer;
    target.emit('connection', socket);
    socket.unshift(buf);
  });
});

server.listen(3000, '0.0.0.0', () => {
  console.log(`  App server: https://0.0.0.0:3000 (HTTP auto-redirects to HTTPS)`);
  console.log(`  Cert download: http://0.0.0.0:3000/cert`);
});

// ── Start everything ────────────────────────────────────────────

console.log('\nStarting dev server...\n');
proxies.forEach(startProxy);

process.on('SIGINT', () => process.exit());
