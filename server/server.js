const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');
const { sequelize } = require('./models');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

/**
 * Ensures critical secrets exist in production. If missing, automatically generates
 * cryptographically secure keys and permanently writes them to the .env file.
 */
function ensureProductionSecrets() {
  const criticalSecrets = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'BACKUP_ENCRYPTION_SECRET',
    'AUDIT_LOG_SECRET',
  ];
  const missing = criticalSecrets.filter((secret) => !process.env[secret]);

  if (missing.length > 0) {
    if (process.env.NODE_ENV === 'production') {
      console.log(
        `\n⚙️  [AUTO-CONFIG] Mendeteksi variabel lingkungan keamanan yang hilang di produksi: ${missing.join(', ')}`
      );
      console.log('⚙️  Membuat rahasia kriptografi aman secara otomatis...');

      const envPath = path.join(__dirname, '.env');
      const parentEnvPath = path.join(__dirname, '../.env');
      const targetEnvPath = fs.existsSync(parentEnvPath)
        ? parentEnvPath
        : fs.existsSync(envPath)
          ? envPath
          : parentEnvPath;

      let envContent = '';
      if (fs.existsSync(targetEnvPath)) {
        envContent = fs.readFileSync(targetEnvPath, 'utf8');
      }

      missing.forEach((secret) => {
        const secureVal = crypto.randomBytes(32).toString('hex');
        process.env[secret] = secureVal;

        if (envContent && !envContent.endsWith('\n')) {
          envContent += '\n';
        }
        envContent += `${secret}=${secureVal}\n`;
      });

      try {
        fs.writeFileSync(targetEnvPath, envContent, 'utf8');
        console.log(
          `✅ [AUTO-CONFIG] Variabel keamanan berhasil disimpan secara permanen di: ${targetEnvPath}\n`
        );
      } catch (err) {
        console.error(`⚠️  [AUTO-CONFIG ERROR] Gagal menulis ke file .env:`, err.message);
        console.warn(
          'Aplikasi akan tetap berjalan menggunakan rahasia memori sementara untuk sesi ini.\n'
        );
      }
    } else {
      // Development warning
      console.warn('\n⚠️ [SECURITY WARNING] BERJALAN DENGAN DEFAULT SECRET!');
      console.warn(`Variabel berikut menggunakan fallback dev: ${missing.join(', ')}`);
      console.warn('Sangat tidak disarankan untuk lingkungan produksi.\n');
    }
  }
}

async function start() {
  try {
    // Validate or auto-generate critical security secrets
    ensureProductionSecrets();

    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database terhubung ke MySQL');

    // Safe conditional sync for production
    if (process.env.NODE_ENV === 'production') {
      try {
        const tables = await sequelize.getQueryInterface().showAllTables();
        const hasUsersTable = tables.some((t) => t.toLowerCase() === 'users');
        if (hasUsersTable) {
          console.log(
            '✅ Tabel database sudah ada, melewati sequelize.sync() untuk stabilitas produksi'
          );
        } else {
          console.log('⚙️  Database kosong di produksi. Melakukan sinkronisasi tabel awal...');
          await sequelize.sync();
          console.log('✅ Semua tabel berhasil di-sync');
        }
      } catch (err) {
        console.error('⚠️  Gagal mengecek tabel database. Melakukan fallback sync...', err.message);
        await sequelize.sync();
      }
    } else {
      // Always sync in development/testing for schema alignment ease
      await sequelize.sync();
      console.log('✅ Semua tabel berhasil di-sync');
    }

    // Run token blacklist cleanup on startup
    const { tokenBlacklist } = require('./middleware/auth');
    await tokenBlacklist.cleanup();
    // Run cleanup every 6 hours
    setInterval(
      () => {
        tokenBlacklist
          .cleanup()
          .catch((err) => console.error('[Blacklist Cleanup Interval Error]', err.message));
      },
      6 * 60 * 60 * 1000
    );

    // Initialize Automated Scheduled Backups (Daily Cron)
    const { initializeScheduler } = require('./utils/scheduler');
    initializeScheduler();

    // Start server
    const server = http.createServer(app);

    // Request timeout — prevent hanging connections from exhausting resources
    const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS, 10) || 30000;
    server.setTimeout(REQUEST_TIMEOUT_MS);

    const io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
      },
    });

    app.set('io', io);

    // WebSocket authentication middleware — verify JWT before allowing connection
    const jwt = require('jsonwebtoken');
    io.use((socket, next) => {
      // Try Authorization header first (Bearer token)
      const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      let token = null;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (authHeader) {
        token = authHeader;
      }

      // Fallback: parse token from cookie header
      if (!token && socket.handshake.headers?.cookie) {
        const cookies = socket.handshake.headers.cookie.split(';').reduce((acc, c) => {
          const [k, ...v] = c.split('=');
          acc[k.trim()] = decodeURI(v.join('='));
          return acc;
        }, {});
        token = cookies.token || null;
      }

      if (!token) {
        return next(new Error('WebSocket authentication required'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
      } catch (err) {
        next(new Error('Invalid or expired token'));
      }
    });

    io.on('connection', (socket) => {
      console.log(
        `🔌 Client terhubung ke WebSocket: ${socket.id} (user: ${socket.user?.id || 'unknown'})`
      );
      // Join role-based room for targeted notifications
      if (socket.user?.role) {
        socket.join(`role:${socket.user.role}`);
      }
      socket.on('disconnect', () => {
        console.log(`🔌 Client terputus dari WebSocket: ${socket.id}`);
      });
    });

    server.listen(PORT, () => {
      console.log(`\n🚀 LokaLab API Server berjalan di http://localhost:${PORT}`);
      console.log(`📋 API Docs: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Login Page: http://localhost:${PORT}/login\n`);
    });

    // =============================================
    // Graceful Shutdown — clean up connections on SIGTERM/SIGINT
    // =============================================
    const gracefulShutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async () => {
        console.log('✅ HTTP server closed.');

        // Close WebSocket connections
        io.close(() => {
          console.log('✅ WebSocket server closed.');
        });

        // Close database connection
        try {
          await sequelize.close();
          console.log('✅ Database connection closed.');
        } catch (err) {
          console.error('❌ Error closing database:', err.message);
        }

        console.log('✅ Graceful shutdown complete.');
        process.exit(0);
      });

      // Force shutdown after 10 seconds if graceful shutdown fails
      setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err) {
    console.error('❌ Gagal menjalankan server:', err);
    process.exit(1);
  }
}

start();
