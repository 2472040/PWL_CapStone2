import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import helmet from 'helmet';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// Dotenv loading
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import { requestLogger } from './utils/logger';
import { correlationMiddleware } from './middleware/correlation';
import { parseCookies } from './utils/cookies';

import { sequelize, User, Label, Inventory } from './models';

// Middlewares
import csrfProtection from './middleware/csrf';
import { tokenBlacklist } from './middleware/auth';
import globalErrorHandler from './middleware/errorHandler';

// Utils
import { setupSwagger } from './utils/swagger';

// Routes
import authRouter from './routes/auth';
import adminRouter from './routes/admin';
import inventoryRouter from './routes/inventory';
import procurementRouter from './routes/procurement';
import maintenanceRouter from './routes/maintenance';
import dashboardRouter from './routes/dashboard';
import redisClient from './utils/redis';

const app = express();

// Middleware
app.use(correlationMiddleware);
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(requestLogger);
app.use(compression({ level: 6, threshold: 1024 }));
const whitelist = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || whitelist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use((req: Request, res: Response, next: NextFunction) => {
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

setupSwagger(app);

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use('/static', express.static(path.join(__dirname, 'public')));

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath, { maxAge: '1y', etag: true }));
}

// Health check
app.get(['/api/health', '/api/v1/health'], async (req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  try {
    await sequelize.authenticate();
    dbStatus = 'connected';
  } catch (err) {
    console.error('Database connection verification failed in health check:', err);
  }

  let redisStatus = 'disconnected';
  if (redisClient && redisClient.status === 'ready') {
    try {
      await redisClient.ping();
      redisStatus = 'connected';
    } catch (err) {
      console.error('Redis connection verification failed in health check:', err);
    }
  }

  const memoryUsage = process.memoryUsage();
  const status = dbStatus === 'connected' ? 'ok' : 'degraded';

  res.status(status === 'ok' ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      redis: redisStatus,
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
app.use('/api/v1/auth', authRouter);
app.use('/api/v1', adminRouter);
app.use('/api/v1/inventory', inventoryRouter);
app.use('/api/v1/procurement', procurementRouter);
app.use('/api/v1', maintenanceRouter);
app.use('/api/v1/dashboard', dashboardRouter);

// Pug print label route
app.get(
  '/print/label/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    const cookies = req.headers.cookie ? parseCookies(req.headers.cookie) : {};
    if (!cookies.token) {
      return res.redirect('/login');
    }
    try {
      const decoded: any = jwt.verify(cookies.token, process.env.JWT_SECRET || 'secret');

      if (decoded.jti && (await tokenBlacklist.has(decoded.jti))) {
        return res.redirect('/login');
      }

      const labelUser: any = await User.findByPk(decoded.id);
      if (!labelUser || labelUser.status !== 'active') {
        return res.redirect('/login');
      }
      if (decoded.tokenVersion === undefined || decoded.tokenVersion !== labelUser.token_version) {
        return res.redirect('/login');
      }

      next();
    } catch (err) {
      return res.redirect('/login');
    }
  },
  async (req: Request, res: Response) => {
    try {
      const label: any = await Label.findByPk(req.params.id as string, {
        include: [{ model: Inventory, attributes: ['id', 'code', 'name', 'category', 'serial'] }],
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
    } catch (err) {
      res.status(500).render('error', { title: 'Error', message: 'Terjadi kesalahan.' });
    }
  }
);

if (process.env.NODE_ENV === 'production') {
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

app.use((req: Request, res: Response, next: NextFunction) => {
  if (!res.headersSent) {
    res.status(404).json({ error: 'Endpoint tidak ditemukan.' });
  } else {
    next();
  }
});

app.use(globalErrorHandler);

export default app;
export { app };
