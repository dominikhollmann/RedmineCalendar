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

// ── AI key injection (issue #114) ───────────────────────────────
// The AI API key is NEVER shipped to the browser via config.json. The proxy
// reads it from the AI_API_KEY env var and injects the provider-specific auth
// header server-side, so the key stays on the server. Any auth header a client
// happens to send is stripped before forwarding.
const aiApiKey = process.env.AI_API_KEY || '';
if (!aiApiKey) {
  console.warn(
    '\n⚠  AI_API_KEY env var is not set — the AI assistant will get 401s from the provider.'
  );
  console.warn('   Start with:  AI_API_KEY=sk-... npm run dev\n');
}

const isAnthropic = aiProvider === 'anthropic' || aiProvider === 'claude';

/**
 * Strip any client-supplied auth headers and inject the server-side key.
 * @param {Record<string, any>} headers  Outgoing request headers (mutated).
 */
function injectAiAuth(headers) {
  delete headers['x-api-key'];
  delete headers['authorization'];
  if (!aiApiKey) return;
  if (isAnthropic) headers['x-api-key'] = aiApiKey;
  else headers['authorization'] = `Bearer ${aiApiKey}`;
}

// ── CORS proxy ──────────────────────────────────────────────────

// Only loopback and RFC-1918 private addresses are reflected as the allowed
// origin.  Public origins are rejected — this dev proxy must never be
// reachable from the public internet.
const LOOPBACK_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const PRIVATE_ORIGIN_RE =
  /^https?:\/\/(10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/;

/** @param {string|undefined} origin @returns {string|null} */
function devCorsOrigin(origin) {
  if (!origin) return null;
  return LOOPBACK_ORIGIN_RE.test(origin) || PRIVATE_ORIGIN_RE.test(origin) ? origin : null;
}

const proxies = [
  { port: 8010, target: config.redmineServerUrl, label: 'Redmine' },
  { port: 8011, target: aiTarget, label: `AI (${aiProvider})`, injectAuth: injectAiAuth },
];

function startProxy({ port, target, label, injectAuth }) {
  const server = https.createServer({ cert, key }, (req, res) => {
    const origin = req.headers['origin'];
    const allowedOrigin = devCorsOrigin(origin);

    if (!allowedOrigin) {
      // Reject all requests that either carry a public-network Origin or omit
      // the Origin header entirely (non-browser HTTP clients such as curl or
      // python-requests never send Origin and would otherwise bypass the CORS
      // guard).  The check is intentionally strict: only loopback and
      // RFC-1918 private-network origins are accepted.
      res.writeHead(403);
      res.end('Dev proxy: only loopback/private-network origins are permitted.');
      return;
    }

    if (allowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    // Reflect whatever headers the client requests — the proxy is dev-only and
    // restricted to loopback/private origins above, so blanket reflection is safe.
    const requestedHeaders = req.headers['access-control-request-headers'];
    res.setHeader(
      'Access-Control-Allow-Headers',
      requestedHeaders ?? 'X-Redmine-API-Key, Content-Type, Accept'
    );

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, target);
    const headers = { ...req.headers, host: url.hostname };
    if (injectAuth) injectAuth(headers);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: req.method,
      headers,
    };

    const proxy = https.request(options, (proxyRes) => {
      const responseHeaders = { ...proxyRes.headers };
      // Remove upstream CORS headers — we control them ourselves.
      delete responseHeaders['access-control-allow-origin'];
      delete responseHeaders['access-control-allow-headers'];
      if (allowedOrigin) {
        responseHeaders['access-control-allow-origin'] = allowedOrigin;
        responseHeaders['vary'] = 'Origin';
      }
      res.writeHead(proxyRes.statusCode, responseHeaders);
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

  // When the AI key is absent, strip aiProxyUrl before serving config.json so
  // the browser's isAiConfigured() check returns false and hides the chat button.
  // This mirrors the production pattern where admins simply omit aiProxyUrl.
  if (urlPath === '/config.json' && !aiApiKey) {
    const cfg = JSON.parse(data.toString('utf8'));
    delete cfg.aiProxyUrl;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(cfg));
    return;
  }

  const ext = extname(filePath);
  if (ext === '.html') {
    // HTTP response headers cannot loosen a <meta http-equiv="CSP"> policy —
    // both policies are AND-combined by the browser. Rewrite the meta tag on
    // the fly so the dev proxies on :8010/:8011 are allowed.
    let html = data.toString('utf8');
    html = html.replace(
      /(http-equiv="Content-Security-Policy"[\s\S]*?content=")([^"]+)/i,
      (_, pre, policy) =>
        `${pre}${policy
          .trimEnd()
          .replace(/;?\s*$/, '')
          // html2canvas clones stylesheets; allow both localhost and 127.0.0.1
          // so the origin check passes regardless of which hostname the dev uses.
          .replace(
            /style-src ([^;]+)/,
            'style-src $1 https://localhost:3000 https://127.0.0.1:3000'
          )}; connect-src 'self' https://localhost:8010 https://localhost:8011;`
    );
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
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
console.warn(
  '⚠️  DEV SERVER — not for production use.\n' +
    '   CORS is restricted to localhost and RFC-1918 private addresses.\n' +
    '   Never expose ports 3000 / 8010 / 8011 on a public network.\n' +
    '   See deploy/nginx.conf.example for a production-safe proxy config.\n'
);
proxies.forEach(startProxy);

process.on('SIGINT', () => process.exit());
process.on('SIGTERM', () => process.exit());
