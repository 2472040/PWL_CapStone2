const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const helmet = require('helmet');
const { requestLogger, logger } = require('./utils/logger');
require('dotenv').config();

const app = express();

// =============================================
// Middleware
// =============================================
// Security Hardening with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(requestLogger);

// Gzip/Brotli response compression — reduces payload size 80-90%
app.use(compression({ level: 6, threshold: 1024 }));

// Strict CORS configuration supporting HTTP credentials (cookies)
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

const csrfProtection = require('./middleware/csrf');

// Strict Security Headers
app.use((req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';
  const scriptSrc = isProd ? "'self'" : "'self' 'unsafe-inline' 'unsafe-eval'";
  const connectSrc = isProd
    ? "'self'"
    : "'self' ws://localhost:5173 http://localhost:3000 http://localhost:5173 ws://localhost:*";

  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; ` +
      `script-src ${scriptSrc}; ` +
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ` +
      `font-src 'self' data: https://fonts.gstatic.com; ` +
      `img-src 'self' data: blob:; ` +
      `connect-src ${connectSrc}; ` +
      `frame-ancestors 'none';`
  );
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(csrfProtection);

// Swagger Documentation
const { setupSwagger } = require('./utils/swagger');
setupSwagger(app);

// Pug view engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Static files for Pug pages
app.use('/static', express.static(path.join(__dirname, 'public')));

// Serve built frontend assets in production (eliminates Vite dev server)
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath, { maxAge: '1y', etag: true }));
}

// =============================================
// Health check (no auth required)
// =============================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// =============================================
// API Routes
// =============================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/admin'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/procurement', require('./routes/procurement'));
app.use('/api/procurement', require('./routes/pdf'));
app.use('/api', require('./routes/maintenance'));
app.use('/api/dashboard', require('./routes/dashboard'));

// =============================================
// Pug Routes (Server-rendered pages)
// =============================================
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login — LokaLab' });
});

app.get(
  '/print/label/:id',
  (req, res, next) => {
    // Lightweight auth gate for server-rendered page: redirect to login if no token cookie
    const cookies = req.headers.cookie
      ? req.headers.cookie.split(';').reduce((acc, c) => {
          const [k, ...v] = c.split('=');
          acc[k.trim()] = decodeURI(v.join('='));
          return acc;
        }, {})
      : {};
    if (!cookies.token) {
      return res.redirect('/login');
    }
    // Verify the JWT token to ensure the user is actually authenticated
    const jwt = require('jsonwebtoken');
    try {
      jwt.verify(cookies.token, process.env.JWT_SECRET);
      next();
    } catch (err) {
      return res.redirect('/login');
    }
  },
  async (req, res) => {
    try {
      const { Label, Inventory } = require('./models');
      const label = await Label.findByPk(req.params.id, {
        include: [{ model: Inventory, attributes: ['id', 'code', 'name', 'category', 'serial'] }],
      });
      if (!label)
        return res
          .status(404)
          .render('error', { title: 'Not Found', message: 'Label tidak ditemukan.' });
      if (!label.Inventory)
        return res.status(404).render('error', {
          title: 'Not Found',
          message: 'Item inventaris untuk label ini tidak ditemukan.',
        });
      res.render('print-label', {
        title: `Label ${label.Inventory.code}`,
        label,
        item: label.Inventory,
      });
    } catch (err) {
      res.status(500).render('error', { title: 'Error', message: 'Terjadi kesalahan.' });
    }
  }
);

// 404 handler — in production, fallback to SPA index for client-side routing
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

app.use((req, res, next) => {
  if (!res.headersSent) {
    res.status(404).json({ error: 'Endpoint tidak ditemukan.' });
  } else {
    next();
  }
});

// Centralized Global Error Handler
const globalErrorHandler = require('./middleware/errorHandler');
app.use(globalErrorHandler);

module.exports = app;
