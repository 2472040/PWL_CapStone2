const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');
const { sequelize } = require('./models');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // Validate critical security secrets in production
    if (process.env.NODE_ENV === 'production') {
      const criticalSecrets = ['JWT_SECRET', 'BACKUP_ENCRYPTION_SECRET', 'AUDIT_LOG_SECRET'];
      const missing = criticalSecrets.filter(secret => !process.env[secret]);
      if (missing.length > 0) {
        console.error('\n⚠️🚨 [CRITICAL SECURITY ERROR] PRODUCTION STARTUP FAILED! 🚨⚠️');
        console.error(`Variabel lingkungan berikut wajib diatur di produksi: ${missing.join(', ')}`);
        console.error('=================================================================\n');
        throw new Error(`CRITICAL: Missing environment variables: ${missing.join(', ')}`);
      }
    } else {
      // Development warning
      const criticalSecrets = ['JWT_SECRET', 'BACKUP_ENCRYPTION_SECRET', 'AUDIT_LOG_SECRET'];
      const missing = criticalSecrets.filter(secret => !process.env[secret]);
      if (missing.length > 0) {
        console.warn('\n⚠️ [SECURITY WARNING] BERJALAN DENGAN DEFAULT SECRET!');
        console.warn(`Variabel berikut menggunakan fallback dev: ${missing.join(', ')}`);
        console.warn('Sangat tidak disarankan untuk lingkungan produksi.\n');
      }
    }

    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database terhubung ke MySQL');

    // Sync all models (creates tables if not exist)
    await sequelize.sync({ alter: true });
    console.log('✅ Semua tabel berhasil di-sync');

    // Run token blacklist cleanup on startup
    const { tokenBlacklist } = require('./middleware/auth');
    await tokenBlacklist.cleanup();
    // Run cleanup every 6 hours
    setInterval(async () => {
      await tokenBlacklist.cleanup();
    }, 6 * 60 * 60 * 1000);

    // Initialize Automated Scheduled Backups (Daily Cron)
    const { initializeScheduler } = require('./utils/scheduler');
    initializeScheduler();

    // Start server
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true
      }
    });

    app.set('io', io);

    io.on('connection', (socket) => {
      console.log(`🔌 Client terhubung ke WebSocket: ${socket.id}`);
      socket.on('disconnect', () => {
        console.log(`🔌 Client terputus dari WebSocket: ${socket.id}`);
      });
    });

    server.listen(PORT, () => {
      console.log(`\n🚀 LokaLab API Server berjalan di http://localhost:${PORT}`);
      console.log(`📋 API Docs: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Login Page: http://localhost:${PORT}/login\n`);
    });
  } catch (err) {
    console.error('❌ Gagal menjalankan server:', err);
    process.exit(1);
  }
}

start();
