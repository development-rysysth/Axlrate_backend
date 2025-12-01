import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { Request, Response } from 'express';
import { SERVICE_URLS } from '../config/services';

/**
 * Forward body to proxied request
 */
export const forwardProxyBody = (proxyReq: any, req: any) => {
  const hasBuffer = req.rawBody && Buffer.isBuffer(req.rawBody);
  const hasBodyObject = req.body && Object.keys(req.body).length > 0;

  if (!hasBuffer && !hasBodyObject) {
    return;
  }

  const buffer = hasBuffer
    ? req.rawBody
    : Buffer.from(JSON.stringify(req.body), 'utf-8');

  proxyReq.setHeader('Content-Type', req.get?.('Content-Type') || 'application/json');
  proxyReq.setHeader('Content-Length', buffer.length.toString());
  proxyReq.write(buffer);
};

/**
 * Create proxy middleware for a service
 */
export function createServiceProxy(
  target: string,
  pathRewrite: { [key: string]: string },
  serviceName: string
) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    logLevel: 'debug',
    onProxyReq: (proxyReq, req) => {
      console.log(`[PROXY] Forwarding ${req.method} to ${serviceName}: ${proxyReq.path}`);
      forwardProxyBody(proxyReq, req);
    },
    onProxyRes: (proxyRes) => {
      console.log(`[PROXY] ${serviceName} responded: ${proxyRes.statusCode}`);
    },
    onError: (err, req: Request, res: Response) => {
      console.error(`[PROXY ERROR] ${serviceName}:`, err.message);
      if (!res.headersSent) {
        res.status(503).json({ 
          error: `${serviceName} unavailable`, 
          details: err.message 
        });
      }
    },
  });
}

