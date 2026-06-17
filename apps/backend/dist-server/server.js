"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '..', '..', '.env') });
const models_1 = require("./models");
// Middlewares
const auth_1 = require("./middleware/auth");
// Utils
const scheduler_1 = require("./utils/scheduler");
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
        const invalidSecrets = [];
        criticalSecrets.forEach((secret) => {
            const val = process.env[secret];
            const isDefault = val ? defaultSecrets.includes(val) : false;
            const isMissing = !val;
            if (isMissing || isDefault) {
                invalidSecrets.push(`${secret} (${isMissing ? 'Missing' : 'Using default/insecure value'})`);
            }
        });
        if (invalidSecrets.length > 0) {
            console.error(`\n❌ [SECURITY ERROR] Server failed to start due to insecure environment configuration:\n` +
                invalidSecrets.map((s) => `   - ${s}`).join('\n') +
                `\n\n[FATAL] Di lingkungan produksi, Anda WAJIB mengatur variabel lingkungan di atas dengan nilai unik dan aman.` +
                ` Auto-generation dan penulisan file .env dinonaktifkan di produksi.\n`);
            process.exit(1);
        }
        return;
    }
    // Development/Test fallback with automatic file writing convenience
    const rootEnvPath = path_1.default.join(__dirname, '../../.env');
    const backendEnvPath = path_1.default.join(__dirname, '../.env');
    const targetEnvPath = fs_1.default.existsSync(rootEnvPath)
        ? rootEnvPath
        : fs_1.default.existsSync(backendEnvPath)
            ? backendEnvPath
            : rootEnvPath;
    let envContent = '';
    if (fs_1.default.existsSync(targetEnvPath)) {
        envContent = fs_1.default.readFileSync(targetEnvPath, 'utf8');
    }
    let modified = false;
    const lines = envContent.split(/\r?\n/);
    criticalSecrets.forEach((secret) => {
        const val = process.env[secret];
        const isDefault = val ? defaultSecrets.includes(val) : false;
        const isMissing = !val;
        if (isMissing || isDefault) {
            const secureVal = crypto_1.default.randomBytes(32).toString('hex');
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
            fs_1.default.writeFileSync(targetEnvPath, lines.join('\n'), 'utf8');
            console.log(`✅ [SECURITY HARDENING] Hardened secrets saved to: ${targetEnvPath}\n`);
        }
        catch (err) {
            console.error(`⚠️  [SECURITY HARDENING ERROR] Gagal menulis ke file .env:`, err.message);
        }
    }
}
async function start() {
    try {
        hardenSecrets();
        await models_1.sequelize.authenticate();
        console.log('✅ Database terhubung ke MySQL');
        if (process.env.NODE_ENV === 'production') {
            console.log('🔒 Production environment: sequelize.sync() is disabled. Database schema is managed via migrations.');
        }
        else {
            await models_1.sequelize.sync();
            console.log('✅ Semua tabel berhasil di-sync');
        }
        await auth_1.tokenBlacklist.cleanup();
        setInterval(() => {
            auth_1.tokenBlacklist
                .cleanup()
                .catch((err) => console.error('[Blacklist Cleanup Interval Error]', err.message));
        }, 6 * 60 * 60 * 1000);
        (0, scheduler_1.initializeScheduler)();
        const server = http_1.default.createServer(app_1.default);
        const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10);
        server.setTimeout(REQUEST_TIMEOUT_MS);
        const io = new socket_io_1.Server(server, {
            cors: {
                origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
                credentials: true,
            },
        });
        app_1.default.set('io', io);
        io.use(async (socket, next) => {
            const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
            let token = null;
            if (authHeader && typeof authHeader === 'string') {
                if (authHeader.startsWith('Bearer ')) {
                    const bearerToken = authHeader.substring(7);
                    if (bearerToken && bearerToken !== 'true') {
                        token = bearerToken;
                    }
                }
                else if (authHeader !== 'true') {
                    token = authHeader;
                }
            }
            if (!token && socket.handshake.headers?.cookie) {
                const cookies = socket.handshake.headers.cookie.split(';').reduce((acc, c) => {
                    const [k, ...v] = c.split('=');
                    try {
                        acc[k.trim()] = decodeURIComponent(v.join('='));
                    }
                    catch {
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
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
                if (decoded.jti && (await auth_1.tokenBlacklist.has(decoded.jti))) {
                    return next(new Error('Session revoked'));
                }
                const user = await models_1.User.findByPk(decoded.id);
                if (!user) {
                    return next(new Error('User not found'));
                }
                if (user.status !== 'active') {
                    return next(new Error('User account is deactivated'));
                }
                if (decoded.tokenVersion === undefined || decoded.tokenVersion !== user.token_version) {
                    return next(new Error('Session invalid (credentials changed)'));
                }
                socket.user = decoded;
                next();
            }
            catch (err) {
                next(new Error('Invalid or expired token'));
            }
        });
        io.on('connection', (socket) => {
            const socketUser = socket.user;
            console.log(`🔌 Client terhubung ke WebSocket: ${socket.id} (user: ${socketUser?.id || 'unknown'})`);
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
        const activeConnections = new Set();
        server.on('connection', (conn) => {
            activeConnections.add(conn);
            conn.on('close', () => activeConnections.delete(conn));
        });
        const gracefulShutdown = async (signal) => {
            console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
            server.close(async () => {
                console.log('✅ HTTP server closed (all in-flight requests drained).');
                io.close(() => {
                    console.log('✅ WebSocket server closed.');
                });
                try {
                    await models_1.sequelize.close();
                    console.log('✅ Database connection closed.');
                }
                catch (err) {
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
    }
    catch (err) {
        console.error('❌ Gagal menjalankan server:', err);
        process.exit(1);
    }
}
start();
