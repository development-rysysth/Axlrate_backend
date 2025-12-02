import dotenv from 'dotenv';
dotenv.config({ path: '../../../.env' });

import express, { Request, Response } from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import http from 'http';
import { SERVICE_URLS } from './config/services';
import { forwardProxyBody } from './services/proxy-service';
import v1Routes from './routes/v1/index';

const app = express();
const PORT = process.env.GATEWAY_PORT || 3000;

// CORS
app.use(cors());

// Log each request
app.use((req: Request, res: Response, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Capture raw body for SerpAPI routes
app.use('/api/v1/serpapi', (req: any, res: Response, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const chunks: Buffer[] = [];
    
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    
    req.on('end', () => {
      if (chunks.length > 0) {
        req.rawBody = Buffer.concat(chunks);
        const bodyString = req.rawBody.toString('utf-8');
        
        try {
          const params = new URLSearchParams(bodyString);
          req.body = {};
          params.forEach((value, key) => {
            req.body[key] = value;
          });
        } catch (err) {
          console.error('[RAW BODY CAPTURE] Error parsing body:', err);
          req.body = {};
        }
        
        req._bodyParsed = true;
      }
      next();
    });
    
    req.on('error', (err: Error) => {
      console.error('[RAW BODY CAPTURE ERROR]:', err);
      next(err);
    });
  } else {
    next();
  }
});

const urlencodedParser = express.urlencoded({
  extended: true,
  limit: '5mb',
  verify: (req: any, res, buf) => {
    if (!req.rawBody) {
      req.rawBody = buf;
    }
  },
});

const jsonParser = express.json({
  limit: '5mb',
  verify: (req: any, res, buf) => {
    if (!req.rawBody) {
      req.rawBody = buf;
    }
  },
});

// Apply body parsers conditionally
app.use((req: any, res: Response, next) => {
  if (req.path.startsWith('/api/v1/serpapi') && req._bodyParsed) {
    return next();
  }
  urlencodedParser(req, res, (err?: any) => {
    if (err) return next(err);
    jsonParser(req, res, next);
  });
});

// API versioning - v1 routes
app.use('/api/v1', v1Routes);

// Legacy routes (for backward compatibility during migration)
app.use(
  '/api/auth',
  createProxyMiddleware({
    target: SERVICE_URLS.AUTH_SERVICE,
    changeOrigin: true,
    pathRewrite: { '^/api/auth': '/auth' },
    logLevel: 'debug',
    onProxyReq: (proxyReq, req) => {
      console.log(`[PROXY] Forwarding ${req.method} to Auth: ${proxyReq.path}`);
      forwardProxyBody(proxyReq, req);
    },
    onError: (err, req, res) => {
      console.error('[PROXY ERROR] Auth:', err.message);
      if (!res.headersSent) {
        res.status(503).json({ error: 'Auth service unavailable', details: err.message });
      }
    },
  })
);

app.use(
  '/api/users',
  createProxyMiddleware({
    target: SERVICE_URLS.AUTH_SERVICE,
    changeOrigin: true,
    pathRewrite: { '^/api/users': '/users' },
    logLevel: 'debug',
    onProxyReq: (proxyReq, req) => {
      console.log(`[PROXY] Forwarding ${req.method} to Auth Users: ${proxyReq.path}`);
      forwardProxyBody(proxyReq, req);
    },
  })
);

app.use(
  '/api/serpapi',
  createProxyMiddleware({
    target: SERVICE_URLS.SERPAPI_SERVICE,
    changeOrigin: true,
    pathRewrite: { '^/api/serpapi': '/serpapi' },
    logLevel: 'debug',
    onProxyReq: (proxyReq, req: any) => {
      console.log(`[PROXY] Forwarding ${req.method} to SerpAPI: ${proxyReq.path}`);
      
      const contentType = req.get('Content-Type') || 'application/x-www-form-urlencoded';

      if (req.rawBody && Buffer.isBuffer(req.rawBody)) {
        proxyReq.setHeader('Content-Type', contentType);
        proxyReq.setHeader('Content-Length', req.rawBody.length.toString());
        proxyReq.write(req.rawBody);
      } else if (req.body && Object.keys(req.body).length > 0) {
        const urlEncodedBody = new URLSearchParams(req.body).toString();
        const bodyBuffer = Buffer.from(urlEncodedBody, 'utf-8');
        
        proxyReq.setHeader('Content-Type', contentType);
        proxyReq.setHeader('Content-Length', bodyBuffer.length.toString());
        proxyReq.write(bodyBuffer);
      } else {
        proxyReq.setHeader('Content-Length', '0');
      }
    },
    onError: (err, req: Request, res: Response) => {
      console.error('[PROXY ERROR] SerpAPI:', err.message);
      if (!res.headersSent) {
        res.status(503).json({ error: 'SerpAPI service unavailable', details: err.message });
      }
    },
  })
);

// Calendar Data - Now using Aggregator Service with PostgreSQL
app.use(
  '/api/calendarData',
  createProxyMiddleware({
    target: SERVICE_URLS.AGGREGATOR_SERVICE,
    changeOrigin: true,
    pathRewrite: { '^/api/calendarData': '/v1/calendar-data' },
    logLevel: 'debug',
    onProxyReq: (proxyReq, req: any) => {
      console.log(`[PROXY] Forwarding ${req.method} to Aggregator (calendarData): ${proxyReq.path}`);
      forwardProxyBody(proxyReq, req);
    },
    onError: (err, _req: Request, res: Response) => {
      console.error('[PROXY ERROR] Aggregator (calendarData):', err.message);
      if (!res.headersSent) {
        res.status(503).json({ error: 'Aggregator service unavailable', details: err.message });
      }
    },
  })
);

// Health & Root
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    services: SERVICE_URLS,
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'API Gateway is running',
    version: 'v1',
    endpoints: {
      v1: '/api/v1',
      auth: '/api/v1/auth',
      serpapi: '/api/v1/serpapi',
      calendarData: '/api/v1/calendar-data',
      aggregator: '/api/v1/aggregator',
      export: '/api/v1/export',
      health: '/health',
    },
  });
});

// Check service connectivity
function checkServiceHealth(url: string, serviceName: string) {
  const healthUrl = url.replace(/\/$/, '') + '/health';
  http
    .get(healthUrl, (res) => {
      console.log(`✓ ${serviceName} reachable at ${url} (status: ${res.statusCode})`);
    })
    .on('error', (err) => {
      console.warn(`⚠ ${serviceName} not reachable: ${err.message}`);
    });
}

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Auth service: ${SERVICE_URLS.AUTH_SERVICE}`);
  console.log(`SerpAPI service: ${SERVICE_URLS.SERPAPI_SERVICE}`);
  console.log('\nChecking service connectivity...');
  checkServiceHealth(SERVICE_URLS.AUTH_SERVICE, 'Auth Service');
  checkServiceHealth(SERVICE_URLS.SERPAPI_SERVICE, 'SerpAPI Service');
});

export default app;

