import https from 'node:https';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const cert = readFileSync(resolve(root, '.certs/cert.pem'));
const key = readFileSync(resolve(root, '.certs/key.pem'));

const proxies = [
  { port: 8010, target: 'https://dc6c80cbaa.bigde5.easy8.com', label: 'Redmine' },
  { port: 8011, target: 'https://api.anthropic.com', label: 'AI (Anthropic)' },
];

function startProxy({ port, target, label }) {
  const targetUrl = new URL(target);
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

console.log('\nStarting dev proxies...');
proxies.forEach(startProxy);

console.log('\nStarting app server...');
const serve = spawn('npx', ['serve', '.', '-p', '3000', '--ssl-cert', '.certs/cert.pem', '--ssl-key', '.certs/key.pem'], {
  cwd: root,
  stdio: 'inherit',
});

serve.on('close', (code) => process.exit(code));
process.on('SIGINT', () => { serve.kill(); process.exit(); });
