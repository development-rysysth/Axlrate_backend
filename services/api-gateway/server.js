require('dotenv').config({ path: '../../.env' });
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.GATEWAY_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Service URLs
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const SERPAPI_SERVICE_URL = process.env.SERPAPI_SERVICE_URL || 'http://localhost:3003';

// Proxy middleware for auth service
app.use('/api/auth', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': '/auth', // Remove /api prefix when forwarding
  },
  onError: (err, req, res) => {
    console.error('Auth service proxy error:', err);
    res.status(503).json({ error: 'Auth service unavailable' });
  },
}));

// Proxy middleware for user endpoints (now handled by auth service)
app.use('/api/users', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/users': '/users', // Remove /api prefix when forwarding
  },
  onError: (err, req, res) => {
    console.error('Auth service proxy error:', err);
    res.status(503).json({ error: 'Auth service unavailable' });
  },
}));

// Proxy middleware for SerpAPI service
app.use('/api/serpapi', createProxyMiddleware({
  target: SERPAPI_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/serpapi': '/serpapi', // Remove /api prefix when forwarding
  },
  onError: (err, req, res) => {
    console.error('SerpAPI service proxy error:', err);
    res.status(503).json({ error: 'SerpAPI service unavailable' });
  },
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'api-gateway',
    services: {
      auth: AUTH_SERVICE_URL,
      serpapi: SERPAPI_SERVICE_URL,
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Gateway is running',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      serpapi: '/api/serpapi',
      health: '/health',
    }
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Auth service: ${AUTH_SERVICE_URL}`);
  console.log(`SerpAPI service: ${SERPAPI_SERVICE_URL}`);
});

module.exports = app;

