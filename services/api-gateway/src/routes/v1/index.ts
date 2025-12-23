import { Router } from 'express';
import { createServiceProxy, forwardProxyBody } from '../../services/proxy-service';
import { SERVICE_URLS } from '../../config/services';
import { Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const router = Router();

// ========================================
// AUTH SERVICE ROUTES
// ========================================

// Direct auth endpoints (register, login, logout, refresh)
router.post('/register', createProxyMiddleware({
  target: SERVICE_URLS.AUTH_SERVICE,
  changeOrigin: true,
  pathRewrite: { '^/api/v1/register': '/v1/register' },
  logLevel: 'debug',
  onProxyReq: (proxyReq, req) => {
    console.log(`[PROXY] Forwarding ${req.method} to Auth: ${proxyReq.path}`);
    forwardProxyBody(proxyReq, req);
  },
  onError: (err, req: Request, res: Response) => {
    console.error('[PROXY ERROR] Auth Service:', err.message);
    if (!res.headersSent) {
      res.status(503).json({ error: 'Auth service unavailable', details: err.message });
    }
  },
}));

router.post('/login', createProxyMiddleware({
  target: SERVICE_URLS.AUTH_SERVICE,
  changeOrigin: true,
  pathRewrite: { '^/api/v1/login': '/v1/login' },
  logLevel: 'debug',
  onProxyReq: (proxyReq, req) => {
    console.log(`[PROXY] Forwarding ${req.method} to Auth: ${proxyReq.path}`);
    forwardProxyBody(proxyReq, req);
  },
  onError: (err, req: Request, res: Response) => {
    console.error('[PROXY ERROR] Auth Service:', err.message);
    if (!res.headersSent) {
      res.status(503).json({ error: 'Auth service unavailable', details: err.message });
    }
  },
}));

router.post('/logout', createProxyMiddleware({
  target: SERVICE_URLS.AUTH_SERVICE,
  changeOrigin: true,
  pathRewrite: { '^/api/v1/logout': '/v1/logout' },
  logLevel: 'debug',
  onProxyReq: (proxyReq, req) => {
    console.log(`[PROXY] Forwarding ${req.method} to Auth: ${proxyReq.path}`);
    forwardProxyBody(proxyReq, req);
  },
  onError: (err, req: Request, res: Response) => {
    console.error('[PROXY ERROR] Auth Service:', err.message);
    if (!res.headersSent) {
      res.status(503).json({ error: 'Auth service unavailable', details: err.message });
    }
  },
}));

router.post('/refresh', createProxyMiddleware({
  target: SERVICE_URLS.AUTH_SERVICE,
  changeOrigin: true,
  pathRewrite: { '^/api/v1/refresh': '/v1/refresh' },
  logLevel: 'debug',
  onProxyReq: (proxyReq, req) => {
    console.log(`[PROXY] Forwarding ${req.method} to Auth: ${proxyReq.path}`);
    forwardProxyBody(proxyReq, req);
  },
  onError: (err, req: Request, res: Response) => {
    console.error('[PROXY ERROR] Auth Service:', err.message);
    if (!res.headersSent) {
      res.status(503).json({ error: 'Auth service unavailable', details: err.message });
    }
  },
}));

// User management routes (requires authentication)
router.use('/users', createProxyMiddleware({
  target: SERVICE_URLS.AUTH_SERVICE,
  changeOrigin: true,
  pathRewrite: { '^/api/v1/users': '/v1/users' },
  logLevel: 'debug',
  onProxyReq: (proxyReq, req) => {
    console.log(`[PROXY] Forwarding ${req.method} to Auth Users: ${proxyReq.path}`);
    forwardProxyBody(proxyReq, req);
  },
  onError: (err, req: Request, res: Response) => {
    console.error('[PROXY ERROR] Auth Service:', err.message);
    if (!res.headersSent) {
      res.status(503).json({ error: 'Auth service unavailable', details: err.message });
    }
  },
}));

// Hotel management routes (requires authentication)
router.use('/hotels', createProxyMiddleware({
  target: SERVICE_URLS.AUTH_SERVICE,
  changeOrigin: true,
  pathRewrite: { '^/api/v1/hotels': '/v1/hotels' },
  logLevel: 'debug',
  onProxyReq: (proxyReq, req) => {
    console.log(`[PROXY] Forwarding ${req.method} to Auth Hotels: ${proxyReq.path}`);
    forwardProxyBody(proxyReq, req);
  },
  onError: (err, req: Request, res: Response) => {
    console.error('[PROXY ERROR] Auth Service:', err.message);
    if (!res.headersSent) {
      res.status(503).json({ error: 'Auth service unavailable', details: err.message });
    }
  },
}));

// Legacy /auth/* routes (for backward compatibility)
router.use(
  '/auth',
  createServiceProxy(
    SERVICE_URLS.AUTH_SERVICE,
    { '^/api/v1/auth': '/v1' },
    'Auth Service'
  )
);

// ========================================
// SERPAPI SERVICE ROUTES
// ========================================

router.use(
  '/serpapi',
  createProxyMiddleware({
    target: SERVICE_URLS.HOTEL_SERVICE,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/serpapi': '/v1/serpapi' },
    logLevel: 'debug',
    onProxyReq: (proxyReq, req: any) => {
      console.log(`[PROXY] Forwarding ${req.method} to Hotel Service: ${proxyReq.path}`);
      forwardProxyBody(proxyReq, req);
    },
    onError: (err, req: Request, res: Response) => {
      console.error('[PROXY ERROR] Hotel Service:', err.message);
      if (!res.headersSent) {
        res.status(503).json({ error: 'Hotel service unavailable', details: err.message });
      }
    },
  })
);

// ========================================
// EXPORT SERVICE ROUTES
// ========================================

router.use(
  '/export',
  createServiceProxy(
    SERVICE_URLS.EXPORT_SERVICE,
    { '^/api/v1/export': '/v1' },
    'Export Service'
  )
);

// ========================================
// HOTEL INFO SERVICE ROUTES (now handled by Hotel Service)
// ========================================

router.use(
  '/hotel-info',
  createProxyMiddleware({
    target: SERVICE_URLS.HOTEL_SERVICE,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/hotel-info': '/v1/serpapi' },
    logLevel: 'debug',
    onProxyReq: (proxyReq, req: any) => {
      console.log(`[PROXY] Forwarding ${req.method} to Hotel Service (hotel-info): ${proxyReq.path}`);
      forwardProxyBody(proxyReq, req);
    },
    onError: (err, req: Request, res: Response) => {
      console.error('[PROXY ERROR] Hotel Service (hotel-info):', err.message);
      if (!res.headersSent) {
        res.status(503).json({ error: 'Hotel service unavailable', details: err.message });
      }
    },
  })
);

export default router;

