const crypto = require('crypto');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const routePolicy = require('./routePolicy');

const validRoles = new Set(['cliente', 'operador', 'admin']);
const validWholesaleStatuses = new Set(['NO_APLICA', 'PENDIENTE', 'APROBADO', 'RECHAZADO']);

function createApp({ authUrl, coreUrl, corePool, onCoreSelected, publicKey, corsOrigin }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());

  app.use((req, res, next) => {
    const supplied = req.headers['x-trace-id'];
    const traceId = typeof supplied === 'string' && /^[A-Za-z0-9._-]{1,128}$/.test(supplied)
      ? supplied
      : crypto.randomUUID();
    req.traceId = traceId;
    req.headers['x-trace-id'] = traceId;
    res.setHeader('X-Trace-Id', traceId);

    // Identity headers received from clients are never trusted.
    delete req.headers['x-user-id'];
    delete req.headers['x-user-role'];
    delete req.headers['x-user-wholesale-status'];
    next();
  });
  app.use(cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PATCH'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Trace-Id', 'X-Webhook-Signature'],
    exposedHeaders: ['X-Trace-Id']
  }));

  const proxyOptions = (target, onUnavailable) => ({
    target,
    changeOrigin: true,
    proxyTimeout: 10000,
    timeout: 10000,
    on: {
      error(_error, _req, res) {
        onUnavailable?.();
        if (res.headersSent) return res.end();
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'UPSTREAM_UNAVAILABLE' }));
      }
    }
  });
  const authProxy = createProxyMiddleware(proxyOptions(authUrl));
  const coreProxy = corePool ? null : createProxyMiddleware(proxyOptions(coreUrl));
  const coreProxies = new Map(corePool ? corePool.targets.map(target => [
    target, createProxyMiddleware(proxyOptions(target, () => corePool.markUnavailable(target)))
  ]) : []);

  app.use((req, res, next) => {
    const policy = routePolicy(req.method, req.path);
    if (!policy) {
      return res.status(404).json({ error: 'NOT_FOUND', traceId: req.traceId });
    }
    if (policy.service === 'gateway') {
      return res.status(200).json({ status: 'ok', service: 'api-gateway', traceId: req.traceId });
    }

    let payload;
    const authorization = req.headers.authorization;
    if (policy.access === 'roles' || (policy.service === 'core' && policy.access === 'public' && authorization)) {
      if (typeof authorization !== 'string' || !/^Bearer \S+$/.test(authorization)) {
        return res.status(401).json({ error: 'TOKEN_REQUIRED', traceId: req.traceId });
      }
      try {
        payload = jwt.verify(authorization.slice(7), publicKey, {
          algorithms: ['RS256'],
          issuer: 'acordes-auth-service'
        });
      } catch (_error) {
        return res.status(401).json({ error: 'INVALID_TOKEN', traceId: req.traceId });
      }
      if (
        typeof payload.sub !== 'string' || payload.sub.length === 0 ||
        !validRoles.has(payload.rol) ||
        !validWholesaleStatuses.has(payload.estado_mayorista)
      ) {
        return res.status(401).json({ error: 'INVALID_TOKEN', traceId: req.traceId });
      }
      if (policy.access === 'roles' && !policy.roles.includes(payload.rol)) {
        return res.status(403).json({ error: 'FORBIDDEN', traceId: req.traceId });
      }
    }

    if (policy.service === 'core') {
      delete req.headers.authorization;
      if (payload) {
        req.headers['x-user-id'] = payload.sub;
        req.headers['x-user-role'] = payload.rol;
        req.headers['x-user-wholesale-status'] = payload.estado_mayorista;
      }
      if (!corePool) return coreProxy(req, res, next);
      const target = corePool.next();
      if (!target) return res.status(502).json({ error: 'UPSTREAM_UNAVAILABLE', traceId: req.traceId });
      onCoreSelected?.(target, req.traceId);
      // One attempt only, including checkout and webhook. Never replay a request.
      return coreProxies.get(target)(req, res, next);
    }

    if (policy.access === 'public') {
      delete req.headers.authorization;
    }
    return authProxy(req, res, next);
  });

  return app;
}

module.exports = createApp;
