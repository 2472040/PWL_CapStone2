const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// =============================================
// Middleware
// =============================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Pug view engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Static files for Pug pages
app.use('/static', express.static(path.join(__dirname, 'public')));

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
app.use('/api', require('./routes/maintenance'));
app.use('/api/dashboard', require('./routes/dashboard'));

// =============================================
// Pug Routes (Server-rendered pages)
// =============================================
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login — LokaLab' });
});

app.get('/print/label/:id', async (req, res) => {
  try {
    const { Label, Inventory } = require('./models');
    const label = await Label.findByPk(req.params.id, {
      include: [{ model: Inventory, attributes: ['id', 'code', 'name', 'category', 'serial'] }],
    });
    if (!label) return res.status(404).render('error', { title: 'Not Found', message: 'Label tidak ditemukan.' });
    res.render('print-label', { title: `Label ${label.Inventory.code}`, label, item: label.Inventory });
  } catch (err) {
    res.status(500).render('error', { title: 'Error', message: 'Terjadi kesalahan.' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan.' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Terjadi kesalahan internal server.' });
});

module.exports = app;
