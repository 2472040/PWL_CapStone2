import app from './app';
import http from 'http';
import { Server, Socket } from 'socket.io';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import { sequelize, User } from './models';

// Middlewares
import { tokenBlacklist } from './middleware/auth';

// Utils
import { initializeScheduler } from './utils/scheduler';

const PORT = process.env.PORT || 3000;

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

  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    // Fail-secure validation in production
    const invalidSecrets: string[] = [];
    criticalSecrets.forEach((secret) => {
      const val = process.env[secret];
      const isDefault = val ? defaultSecrets.includes(val) : false;
      const isMissing = !val;

      if (isMissing || isDefault) {
        invalidSecrets.push(
          `${secret} (${isMissing ? 'Missing' : 'Using default/insecure value'})`
        );
      }
    });

    if (invalidSecrets.length > 0) {
      console.error(
        `\n❌ [SECURITY ERROR] Server failed to start due to insecure environment configuration:\n` +
          invalidSecrets.map((s) => `   - ${s}`).join('\n') +
          `\n\n[FATAL] Di lingkungan produksi, Anda WAJIB mengatur variabel lingkungan di atas dengan nilai unik dan aman.` +
          ` Auto-generation dan penulisan file .env dinonaktifkan di produksi.\n`
      );
      process.exit(1);
    }
    return;
  }

  // Development/Test fallback with automatic file writing convenience
  const rootEnvPath = path.join(__dirname, '../../.env');
  const backendEnvPath = path.join(__dirname, '../.env');
  const targetEnvPath = fs.existsSync(rootEnvPath)
    ? rootEnvPath
    : fs.existsSync(backendEnvPath)
      ? backendEnvPath
      : rootEnvPath;

  let envContent = '';
  if (fs.existsSync(targetEnvPath)) {
    envContent = fs.readFileSync(targetEnvPath, 'utf8');
  }

  let modified = false;
  const lines = envContent.split(/\r?\n/);

  criticalSecrets.forEach((secret) => {
    const val = process.env[secret];
    const isDefault = val ? defaultSecrets.includes(val) : false;
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
    } catch (err: any) {
      console.error(`⚠️  [SECURITY HARDENING ERROR] Gagal menulis ke file .env:`, err.message);
    }
  }
}

async function start() {
  try {
    hardenSecrets();

    await sequelize.authenticate();
    console.log('✅ Database terhubung ke MySQL');

    if (process.env.NODE_ENV === 'production') {
      console.log(
        '🔒 Production environment: sequelize.sync() is disabled. Database schema is managed via migrations.'
      );
    } else {
      await sequelize.sync();
      console.log('✅ Semua tabel berhasil di-sync');
    }

    await tokenBlacklist.cleanup();
    setInterval(
      () => {
        tokenBlacklist
          .cleanup()
          .catch((err: any) => console.error('[Blacklist Cleanup Interval Error]', err.message));
      },
      6 * 60 * 60 * 1000
    );

    initializeScheduler();

    const server = http.createServer(app);

    const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10);
    server.setTimeout(REQUEST_TIMEOUT_MS);

    const io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
      },
    });

    app.set('io', io);

    io.use(async (socket: Socket, next) => {
      const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      let token: string | null = null;

      if (authHeader && typeof authHeader === 'string') {
        if (authHeader.startsWith('Bearer ')) {
          const bearerToken = authHeader.substring(7);
          if (bearerToken && bearerToken !== 'true') {
            token = bearerToken;
          }
        } else if (authHeader !== 'true') {
          token = authHeader;
        }
      }

      if (!token && socket.handshake.headers?.cookie) {
        const cookies = socket.handshake.headers.cookie.split(';').reduce((acc: any, c) => {
          const [k, ...v] = c.split('=');
          try {
            acc[k.trim()] = decodeURIComponent(v.join('='));
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
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');

        if (decoded.jti && (await tokenBlacklist.has(decoded.jti))) {
          return next(new Error('Session revoked'));
        }

        const user: any = await User.findByPk(decoded.id);
        if (!user) {
          return next(new Error('User not found'));
        }

        if (user.status !== 'active') {
          return next(new Error('User account is deactivated'));
        }

        if (decoded.tokenVersion === undefined || decoded.tokenVersion !== user.token_version) {
          return next(new Error('Session invalid (credentials changed)'));
        }

        (socket as any).user = decoded;
        next();
      } catch (err) {
        next(new Error('Invalid or expired token'));
      }
    });

    io.on('connection', (socket: Socket) => {
      const socketUser = (socket as any).user;
      console.log(
        `🔌 Client terhubung ke WebSocket: ${socket.id} (user: ${socketUser?.id || 'unknown'})`
      );
      if (socketUser?.role) {
        socket.join(`role:${socketUser.role}`);
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

    const activeConnections = new Set<any>();
    server.on('connection', (conn) => {
      activeConnections.add(conn);
      conn.on('close', () => activeConnections.delete(conn));
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        console.log('✅ HTTP server closed (all in-flight requests drained).');

        io.close(() => {
          console.log('✅ WebSocket server closed.');
        });

        try {
          await sequelize.close();
          console.log('✅ Database connection closed.');
        } catch (err: any) {
          console.error('❌ Error closing database:', err.message);
        }

        console.log('✅ Graceful shutdown complete.');
        process.exit(0);
      });

      setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout.');
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
