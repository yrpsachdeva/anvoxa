require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./auth');
const apiRoutes = require('./api');

const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4000',
  credentials: true,
}));
app.use(express.json());

// Trust proxy
app.set('trust proxy', 1);

// ── Zoom fix: inject zoom:0.5 into every HTML page automatically ──
// Fixes HiDPI/4K design appearing 2x too large on standard displays
function sendZoomedHTML(res, filePath) {
  fs.readFile(filePath, 'utf8', (err, html) => {
    if (err) return res.status(500).json({ error: 'Page load error' });
    html = html.replace(/<html([^>]*)>/i, '<html$1 style="zoom:0.5;">');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  });
}

// ── API routes (must come before static, so /auth/login doesn't get
//    confused with /login the page) ────────────────────────────
app.use('/auth', authRoutes);
app.use('/', apiRoutes); // /engagements, /profile, /me

// ── Page routes ───────────────────────────────────────────────
// Sign-in page — root / landing URL
app.get('/', (req, res) => {
  sendZoomedHTML(res, path.join(__dirname, 'public', 'index.html'));
});

// Home (auth-gated; client-side guard redirects to / if not signed in)
app.get('/home', (req, res) => {
  sendZoomedHTML(res, path.join(__dirname, 'public', 'home.html'));
});

// Dashboard (auth-gated client-side; the HTML itself does the redirect)
app.get('/dashboard', (req, res) => {
  sendZoomedHTML(res, path.join(__dirname, 'public', 'dashboard.html'));
});

// Service pages
app.get('/write', (req, res) => {
  sendZoomedHTML(res, path.join(__dirname, 'public', 'write.html'));
});
app.get('/deploy', (req, res) => {
  sendZoomedHTML(res, path.join(__dirname, 'public', 'deploy.html'));
});
app.get('/run', (req, res) => {
  sendZoomedHTML(res, path.join(__dirname, 'public', 'run.html'));
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'anvoxa-backend' }));

// Static assets (CSS, images, JS files in /public — but NOT the HTMLs above,
// which are explicitly routed) ────────────────────────────────
// Intercept .html files accessed directly and apply zoom fix
app.use((req, res, next) => {
  if (req.path.endsWith('.html')) {
    const filePath = path.join(__dirname, 'public', req.path);
    if (fs.existsSync(filePath)) {
      return sendZoomedHTML(res, filePath);
    }
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// 404 catch-all
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n  Anvoxa running on http://localhost:${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}\n`);
  console.log(`  /          → sign in (landing)`);
  console.log(`  /home      → app home (auth-gated)`);
  console.log(`  /dashboard → app (auth-gated)\n`);
});