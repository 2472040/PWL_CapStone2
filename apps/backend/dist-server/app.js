"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const path_1 = __importDefault(require("path"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Dotenv loading
dotenv_1.default.config({ path: path_1.default.join(__dirname, '..', '..', '.env') });
const logger_1 = require("./utils/logger");
const correlation_1 = require("./middleware/correlation");
const cookies_1 = require("./utils/cookies");
const models_1 = require("./models");
// Middlewares
const csrf_1 = __importDefault(require("./middleware/csrf"));
const auth_1 = require("./middleware/auth");
const errorHandler_1 = __importDefault(require("./middleware/errorHandler"));
// Utils
const swagger_1 = require("./utils/swagger");
// Routes
const auth_2 = __importDefault(require("./routes/auth"));
const admin_1 = __importDefault(require("./routes/admin"));
const inventory_1 = __importDefault(require("./routes/inventory"));
const procurement_1 = __importDefault(require("./routes/procurement"));
const maintenance_1 = __importDefault(require("./routes/maintenance"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const app = (0, express_1.default)();
exports.app = app;
// Middleware
app.use(correlation_1.correlationMiddleware);
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));
app.use(logger_1.requestLogger);
app.use((0, compression_1.default)({ level: 6, threshold: 1024 }));
const whitelist = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin || whitelist.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
app.use((req, res, next) => {
    const isProd = process.env.NODE_ENV === 'production';
    const scriptSrc = isProd ? "'self'" : "'self' 'unsafe-inline' 'unsafe-eval'";
    const connectSrc = isProd
        ? "'self'"
        : "'self' ws://localhost:5173 http://localhost:3000 http://localhost:5173 ws://localhost:*";
    res.setHeader('Content-Security-Policy', `default-src 'self'; ` +
        `script-src ${scriptSrc}; ` +
        `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ` +
        `font-src 'self' data: https://fonts.gstatic.com; ` +
        `img-src 'self' data: blob:; ` +
        `connect-src ${connectSrc}; ` +
        `frame-ancestors 'none';`);
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
app.use(csrf_1.default);
(0, swagger_1.setupSwagger)(app);
app.set('view engine', 'pug');
app.set('views', path_1.default.join(__dirname, 'views'));
app.use('/static', express_1.default.static(path_1.default.join(__dirname, 'public')));
if (process.env.NODE_ENV === 'production') {
    const distPath = path_1.default.join(__dirname, '..', 'dist');
    app.use(express_1.default.static(distPath, { maxAge: '1y', etag: true }));
}
// Health check
app.get(['/api/health', '/api/v1/health'], async (req, res) => {
    let dbStatus = 'disconnected';
    try {
        await models_1.sequelize.authenticate();
        dbStatus = 'connected';
    }
    catch (err) {
        console.error('Database connection verification failed in health check:', err);
    }
    const memoryUsage = process.memoryUsage();
    const status = dbStatus === 'connected' ? 'ok' : 'degraded';
    res.status(status === 'ok' ? 200 : 503).json({
        status,
        timestamp: new Date().toISOString(),
        services: {
            database: dbStatus,
        },
        uptime: Math.floor(process.uptime()),
        memory: {
            heapUsed: Math.floor(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
            heapTotal: Math.floor(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
            rss: Math.floor(memoryUsage.rss / 1024 / 1024) + 'MB',
        },
    });
});
// API Routes
app.use('/api/v1/auth', auth_2.default);
app.use('/api/v1', admin_1.default);
app.use('/api/v1/inventory', inventory_1.default);
app.use('/api/v1/procurement', procurement_1.default);
app.use('/api/v1', maintenance_1.default);
app.use('/api/v1/dashboard', dashboard_1.default);
// Pug print label route
app.get('/print/label/:id', async (req, res, next) => {
    const cookies = req.headers.cookie ? (0, cookies_1.parseCookies)(req.headers.cookie) : {};
    if (!cookies.token) {
        return res.redirect('/login');
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(cookies.token, process.env.JWT_SECRET || 'secret');
        if (decoded.jti && (await auth_1.tokenBlacklist.has(decoded.jti))) {
            return res.redirect('/login');
        }
        const labelUser = await models_1.User.findByPk(decoded.id);
        if (!labelUser || labelUser.status !== 'active') {
            return res.redirect('/login');
        }
        if (decoded.tokenVersion === undefined || decoded.tokenVersion !== labelUser.token_version) {
            return res.redirect('/login');
        }
        next();
    }
    catch (err) {
        return res.redirect('/login');
    }
}, async (req, res) => {
    try {
        const label = await models_1.Label.findByPk(req.params.id, {
            include: [{ model: models_1.Inventory, attributes: ['id', 'code', 'name', 'category', 'serial'] }],
        });
        if (!label) {
            return res
                .status(404)
                .render('error', { title: 'Not Found', message: 'Label tidak ditemukan.' });
        }
        if (!label.Inventory) {
            return res.status(404).render('error', {
                title: 'Not Found',
                message: 'Item inventaris untuk label ini tidak ditemukan.',
            });
        }
        res.render('print-label', {
            title: `Label ${label.Inventory.code}`,
            label,
            item: label.Inventory,
        });
    }
    catch (err) {
        res.status(500).render('error', { title: 'Error', message: 'Terjadi kesalahan.' });
    }
});
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
            return next();
        }
        res.sendFile(path_1.default.join(__dirname, '..', 'dist', 'index.html'));
    });
}
app.use((req, res, next) => {
    if (!res.headersSent) {
        res.status(404).json({ error: 'Endpoint tidak ditemukan.' });
    }
    else {
        next();
    }
});
app.use(errorHandler_1.default);
exports.default = app;
