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
  const criticalSecrets = ['JWT_SECRET', 'BACKUP_ENCRYPTION_SECRET', 'AUDIT_LOG_SECRET'];
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
      async () => {
        await tokenBlacklist.cleanup();
      },
      6 * 60 * 60 * 1000
    );

    // Initialize Automated Scheduled Backups (Daily Cron)
    const { initializeScheduler } = require('./utils/scheduler');
    initializeScheduler();

    // Start server
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
      },
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
