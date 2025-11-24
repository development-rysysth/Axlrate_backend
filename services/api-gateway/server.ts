import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import express, { Request, Response } from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import http from 'http';

const app = express();
const PORT = process.env.GATEWAY_PORT || 3000;

// CORS
app.use(cors());

// Log each request early
app.use((req: Request, res: Response, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// ⭐ CRITICAL: Capture and parse raw body for SerpAPI routes
// This runs BEFORE Express body parsers to ensure we capture the raw stream
// We recreate the stream so Express body parsers can still read it (prevents "stream is not readable" error)
app.use('/api/serpapi', (req: any, res: Response, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const chunks: Buffer[] = [];
    
    // Capture the raw body stream
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    
    req.on('end', () => {
      if (chunks.length > 0) {
        req.rawBody = Buffer.concat(chunks);
        const bodyString = req.rawBody.toString('utf-8');
        
        console.log('[RAW BODY CAPTURE] Captured rawBody length:', req.rawBody.length);
        console.log('[RAW BODY CAPTURE] Content-Type:', req.get('Content-Type'));
        console.log('[RAW BODY CAPTURE] Raw body string:', bodyString);
        
        // Manually parse URL-encoded body
        try {
          const params = new URLSearchParams(bodyString);
          req.body = {};
          params.forEach((value, key) => {
            req.body[key] = value;
          });
          console.log('[RAW BODY CAPTURE] Parsed body:', req.body);
        } catch (err) {
          console.error('[RAW BODY CAPTURE] Error parsing body:', err);
          req.body = {};
        }
        
        // Mark that we've already parsed the body for this route
        // This will be checked by body parsers to skip parsing
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
      console.log('[BODY PARSER] URL-encoded: Captured rawBody length:', buf.length);
    }
  },
});

const jsonParser = express.json({
  limit: '5mb',
  verify: (req: any, res, buf) => {
    if (!req.rawBody) {
      req.rawBody = buf;
      console.log('[BODY PARSER] JSON: Captured rawBody length:', buf.length);
    }
  },
});

/**
 * Ensure proxied request streams include the already-consumed body.
 */
const forwardProxyBody = (proxyReq: any, req: any) => {
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

// Apply body parsers conditionally - skip for SerpAPI routes
app.use((req: any, res: Response, next) => {
  if (req.path.startsWith('/api/serpapi') && req._bodyParsed) {
    console.log('[BODY PARSER] Skipping for SerpAPI route (already parsed)');
    return next();
  }
  // Apply URL-encoded parser first
  urlencodedParser(req, res, (err?: any) => {
    if (err) return next(err);
    // Then apply JSON parser
    jsonParser(req, res, next);
  });
});

// Service URLs
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const SERPAPI_SERVICE_URL = process.env.SERPAPI_SERVICE_URL || 'http://localhost:3003';

/* -----------------------------------------
   AUTH PROXY (no body rewriting needed)
-------------------------------------------- */
app.use(
  '/api/auth',
  createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/auth': '/auth' },
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
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

/* -----------------------------------------
   USER ROUTES (Forwarded to Auth service)
-------------------------------------------- */
app.use(
  '/api/users',
  createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/users': '/users' },
    logLevel: 'debug',
    onProxyReq: (proxyReq, req) => {
      console.log(`[PROXY] Forwarding ${req.method} to Auth Users: ${proxyReq.path}`);
      forwardProxyBody(proxyReq, req);
    },
  })
);

/* -----------------------------------------
   SERPAPI PROXY — RAW BODY FORWARDING (IMPORTANT)
-------------------------------------------- */
app.use(
  '/api/serpapi',
  createProxyMiddleware({
    target: SERPAPI_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/serpapi': '/serpapi' },
    logLevel: 'debug',
    
    // ⭐ CRITICAL: Disable automatic body forwarding so we can handle it manually
    // This prevents the proxy from consuming the stream before we can capture it
    selfHandleResponse: false,
    
    // ⭐ KEY FIX: Forward rawBody exactly for URL-encoded requests
    onProxyReq: (proxyReq, req: any, res) => {
      console.log(`[PROXY] Forwarding ${req.method} to SerpAPI: ${proxyReq.path}`);
      console.log('[BODY RECEIVED]:', req.body); // parsed body
      console.log('[RAW BODY LENGTH]:', req.rawBody?.length);
      console.log('[CONTENT-TYPE]:', req.get('Content-Type'));

      const contentType = req.get('Content-Type') || 'application/x-www-form-urlencoded';

      // ⭐ CRITICAL: Manually write the body to prevent proxy from reading the consumed stream
      // The proxy middleware will try to forward req.body automatically, but since the stream
      // is already consumed, we need to write our captured rawBody instead
      if (req.rawBody && Buffer.isBuffer(req.rawBody)) {
        // We have the raw body - forward it exactly as received
        proxyReq.setHeader('Content-Type', contentType);
        proxyReq.setHeader('Content-Length', req.rawBody.length.toString());
        // Write the raw body - proxy will handle ending the request
        proxyReq.write(req.rawBody);
        console.log('[PROXY] Forwarded rawBody successfully, length:', req.rawBody.length);
      } 
      // Fallback: If rawBody is missing but body exists, reconstruct URL-encoded string
      else if (req.body && Object.keys(req.body).length > 0) {
        const urlEncodedBody = new URLSearchParams(req.body).toString();
        const bodyBuffer = Buffer.from(urlEncodedBody, 'utf-8');
        
        proxyReq.setHeader('Content-Type', contentType);
        proxyReq.setHeader('Content-Length', bodyBuffer.length.toString());
        proxyReq.write(bodyBuffer);
        
        console.log('[PROXY] Reconstructed body from req.body:', urlEncodedBody);
      }
      // If no body at all, ensure Content-Length is 0
      else {
        proxyReq.setHeader('Content-Length', '0');
        console.warn('[PROXY] WARNING: No body found to forward');
      }
    },

    onProxyRes: (proxyRes, req, res) => {
      console.log(`[PROXY] SerpAPI responded: ${proxyRes.statusCode}`);
    },

    onError: (err, req: Request, res: Response) => {
      console.error('[PROXY ERROR] SerpAPI:', err.message);
      if (!res.headersSent) {
        res.status(503).json({ error: 'SerpAPI service unavailable', details: err.message });
      }
    },
  })
);

/* -----------------------------------------
   CALENDAR DATA PROXY (Forwarded to SerpAPI service)
-------------------------------------------- */
app.use(
  '/api/calendarData',
  createProxyMiddleware({
    target: SERPAPI_SERVICE_URL,
    changeOrigin: true,
    logLevel: 'debug',
    onProxyReq: (proxyReq, req) => {
      console.log(`[PROXY] Forwarding ${req.method} to SerpAPI (calendarData): ${proxyReq.path}`);
    },
    onProxyRes: (proxyRes) => {
      console.log(`[PROXY] SerpAPI (calendarData) responded: ${proxyRes.statusCode}`);
    },
    onError: (err, _req: Request, res: Response) => {
      console.error('[PROXY ERROR] SerpAPI (calendarData):', err.message);
      if (!res.headersSent) {
        res.status(503).json({ error: 'SerpAPI service unavailable', details: err.message });
      }
    },
  })
);

/* -----------------------------------------
   HEALTH & ROOT
-------------------------------------------- */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    services: {
      auth: AUTH_SERVICE_URL,
      serpapi: SERPAPI_SERVICE_URL,
    },
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'API Gateway is running',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      serpapi: '/api/serpapi',
      calendarData: '/api/calendarData',
      health: '/health',
    },
  });
});

/* -----------------------------------------
   CHECK SERVICE CONNECTIVITY
-------------------------------------------- */
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
  console.log(`Auth service: ${AUTH_SERVICE_URL}`);
  console.log(`SerpAPI service: ${SERPAPI_SERVICE_URL}`);
  console.log('\nChecking service connectivity...');
  checkServiceHealth(AUTH_SERVICE_URL, 'Auth Service');
  checkServiceHealth(SERPAPI_SERVICE_URL, 'SerpAPI Service');
});

export default app;
