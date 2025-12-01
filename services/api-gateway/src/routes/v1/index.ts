import { Router } from 'express';
import { createServiceProxy, forwardProxyBody } from '../../services/proxy-service';
import { SERVICE_URLS } from '../../config/services';
import { Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const router = Router();

// Auth routes
router.use(
  '/auth',
  createServiceProxy(
    SERVICE_URLS.AUTH_SERVICE,
    { '^/api/v1/auth': '/v1' },
    'Auth Service'
  )
);

// SerpAPI routes
router.use(
  '/serpapi',
  createProxyMiddleware({
    target: SERVICE_URLS.SERPAPI_SERVICE,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/serpapi': '/v1/serpapi' },
    logLevel: 'debug',
    onProxyReq: (proxyReq, req: any) => {
      console.log(`[PROXY] Forwarding ${req.method} to SerpAPI: ${proxyReq.path}`);
      forwardProxyBody(proxyReq, req);
    },
    onError: (err, req: Request, res: Response) => {
      console.error('[PROXY ERROR] SerpAPI:', err.message);
      if (!res.headersSent) {
        res.status(503).json({ error: 'SerpAPI service unavailable', details: err.message });
      }
    },
  })
);

// Calendar data
router.use(
  '/calendar-data',
  createServiceProxy(
    SERVICE_URLS.SERPAPI_SERVICE,
    { '^/api/v1/calendar-data': '/v1/serpapi/calendar-data' },
    'SerpAPI Service (Calendar)'
  )
);

// Aggregator routes (placeholder for future service)
router.use(
  '/aggregator',
  createServiceProxy(
    SERVICE_URLS.AGGREGATOR_SERVICE,
    { '^/api/v1/aggregator': '/v1' },
    'Aggregator Service'
  )
);

// Export routes (placeholder for future service)
router.use(
  '/export',
  createServiceProxy(
    SERVICE_URLS.EXPORT_SERVICE,
    { '^/api/v1/export': '/v1' },
    'Export Service'
  )
);

export default router;

