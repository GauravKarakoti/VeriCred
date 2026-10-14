import http from 'node:http';
import { spawn } from 'node:child_process';

const PORT = process.env.PORT || 8080;
const PROOF_PORT = 6300;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://veri-cred.vercel.app';

// 1. Spawn the official Midnight Proof Server on internal port 6300
console.log('🚀 Starting internal Midnight Proof Server on port 6300...');
const proofServer = spawn('midnight-proof-server', ['-v', '--num-workers', '2'], {
  stdio: 'inherit',
  env: { ...process.env, RUST_BACKTRACE: 'full' }
});

proofServer.on('exit', (code, signal) => {
  console.error(`❌ midnight-proof-server exited with code ${code} (signal: ${signal})`);
  process.exit(1);
});

// 2. Simple in-memory rate limiter (10 requests per minute per IP)
const rateLimitMap = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const windowStart = now - 60_000;
  const timestamps = (rateLimitMap.get(ip) || []).filter((t) => t > windowStart);
  if (timestamps.length >= 10) return true;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return false;
}

// 3. Create public HTTP Gateway with CORS
const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGIN === '*' || origin === ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle CORS preflight immediately
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Healthcheck endpoint for Render so deploy succeeds while S3 params download
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  // Rate limit only heavy proof generation POST requests
  if (req.method === 'POST') {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (isRateLimited(ip)) {
      res.writeHead(429, { 'Content-Type': 'text/plain' });
      res.end('Too many ZK proofs requested, please try again in a minute.');
      return;
    }
  }

  // Proxy request to internal Midnight Proof Server (127.0.0.1:6300)
  const proxyReq = http.request(
    {
      hostname: '127.0.0.1',
      port: PROOF_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    }
  );

  proxyReq.on('error', (err) => {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Proof server is still warming up or downloading ZK parameters. Try again in 30 seconds.',
      details: err.message
    }));
  });

  req.pipe(proxyReq, { end: true });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🛡️ ZK Proof Gateway listening on 0.0.0.0:${PORT}`);
  console.log(`🔀 Forwarding traffic to http://127.0.0.1:${PROOF_PORT}`);
});