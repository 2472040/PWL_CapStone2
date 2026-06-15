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
function hardenSecrets() {
  const criticalSecrets = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'BACKUP_ENCRYPTION_SECRET',
    'AUDIT_LOG_SECRET',
  ];
  const defaultSecrets = [
    'lokalab-super-secure-jwt-secret-key-2026',
    'lokalab-refresh-secret-key-separate-from-access-2026',
    'eb5f0e6264ffbc28019083f3763ac0f9c0947988a5fd86cb67c13f78be35e5cd',
    'b87b24b57409f1268e3b5a55ec1348a5aa4a770687c97bd05772e5df8a92b249',
    'your-super-secure-jwt-access-secret-key',
    'your-super-secure-jwt-refresh-secret-key',
    'your-32-byte-hex-secret-for-backups',
    'your-32-byte-hex-secret-for-audit-logs',
  ];

  const envPath = path.join(__dirname, '..', '.env');
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

  let modified = false;
  const lines = envContent.split(/\r?\n/);

  criticalSecrets.forEach((secret) => {
    const val = process.env[secret];
    const isDefault = defaultSecrets.includes(val);
    const isMissing = !val;

    if (isMissing || isDefault) {
      const secureVal = crypto.randomBytes(32).toString('hex');
      process.env[secret] = secureVal;
      modified = true;

      let found = false;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith(`${secret}=`)) {
          lines[i] = `${secret}=${secureVal}`;
          found = true;
          break;
        }
      }
      if (!found) {
        lines.push(`${secret}=${secureVal}`);
      }
      console.log(`⚙️  [SECURITY HARDENING] Auto-generated secure replacement for ${secret}`);
    }
  });

  if (modified) {
    try {
      fs.writeFileSync(targetEnvPath, lines.join('\n'), 'utf8');
      console.log(`✅ [SECURITY HARDENING] Hardened secrets saved to: ${targetEnvPath}\n`);
    } catch (err) {
      console.error(`⚠️  [SECURITY HARDENING ERROR] Gagal menulis ke file .env:`, err.message);
    }
  }
}

async function start() {
  try {
    // Validate or auto-generate critical security secrets
    hardenSecrets();

    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database terhubung ke MySQL');

    // In production, sync is disabled for enterprise database stability.
    // Database schema changes must be applied via migrations (sequelize-cli db:migrate).
    if (process.env.NODE_ENV === 'production') {
      console.log(
        '🔒 Production environment: sequelize.sync() is disabled. Database schema is managed via migrations.'
      );
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
    const { User } = require('./models');
    io.use(async (socket, next) => {
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
          try {
            acc[k.trim()] = decodeURI(v.join('='));
          } catch {
            acc[k.trim()] = v.join('=');
          }
          return acc;
        }, {});
        token = cookies.token || null;
      }

      if (!token) {
        return next(new Error('WebSocket authentication required'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 1. Verify blacklist (JTI revocation)
        if (decoded.jti && (await tokenBlacklist.has(decoded.jti))) {
          return next(new Error('Session revoked'));
        }

        // 2. Fetch user to verify status and token version
        const user = await User.findByPk(decoded.id);
        if (!user) {
          return next(new Error('User not found'));
        }

        if (user.status !== 'active') {
          return next(new Error('User account is deactivated'));
        }

        // 3. Verify token version
        if (decoded.tokenVersion === undefined || decoded.tokenVersion !== user.token_version) {
          return next(new Error('Session invalid (credentials changed)'));
        }

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
    // Track active connections to drain in-flight requests before closing DB
    const activeConnections = new Set();
    server.on('connection', (conn) => {
      activeConnections.add(conn);
      conn.on('close', () => activeConnections.delete(conn));
    });

    const gracefulShutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async () => {
        console.log('✅ HTTP server closed (all in-flight requests drained).');

        // Close WebSocket connections
        io.close(() => {
          console.log('✅ WebSocket server closed.');
        });

        // Close database connection — safe because all requests are drained
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
        // Destroy lingering connections before force-exit
        activeConnections.forEach((conn) => conn.destroy());
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
