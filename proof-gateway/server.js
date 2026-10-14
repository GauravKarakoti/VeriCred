import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 8080;
// Render will inject the internal URL of the private proof server
const PROOF_SERVER_URL = process.env.INTERNAL_PROOF_SERVER_URL || 'http://localhost:6300';
// Lock this down to your Vercel/Netlify frontend URL in production
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*'; 

// 1. Strict CORS Policy
app.use(cors({ origin: ALLOWED_ORIGIN }));

// 2. Aggressive Rate Limiting (Protects CPU from DDoS)
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 proof requests per minute
  message: 'Too many ZK proofs requested, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// 3. Proxy all legitimate requests to the internal Midnight server
app.use('/', createProxyMiddleware({
  target: PROOF_SERVER_URL,
  changeOrigin: true,
  ws: true,
  logLevel: 'info'
}));

app.listen(PORT, () => {
  console.log(`🛡️ ZK Proof Gateway running on port ${PORT}`);
  console.log(`🔀 Proxying to internal proof server: ${PROOF_SERVER_URL}`);
});