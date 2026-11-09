const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPairSync } = require('node:crypto');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const createApp = require('../src/app');

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
let authServer;
let coreServer;
let gatewayServer;
let gatewayUrl;

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve(`http://127.0.0.1:${server.address().port}`);
    });
  });
}

function echo(service) {
  return http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString('utf8');
    const status = req.url.includes('conflict=1') ? 409 : 200;
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      service,
      method: req.method,
      url: req.url,
      body,
      traceId: req.headers['x-trace-id'],
      userId: req.headers['x-user-id'] || null,
      userRole: req.headers['x-user-role'] || null,
      wholesaleStatus: req.headers['x-user-wholesale-status'] || null,
      signature: req.headers['x-webhook-signature'] || null,
      authorizationPresent: Boolean(req.headers.authorization)
    }));
  });
}

function sign(role, options = {}) {
  return jwt.sign({
    sub: '507f1f77bcf86cd799439011',
    rol: role,
    estado_mayorista: 'APROBADO'
  }, privateKey, {
    algorithm: 'RS256',
    issuer: 'acordes-auth-service',
    expiresIn: '1h',
    ...options
  });
}

async function request(path, options = {}) {
  const response = await fetch(`${gatewayUrl}${path}`, options);
  return { status: response.status, headers: response.headers, body: await response.json() };
}

before(async () => {
  authServer = echo('auth');
  coreServer = echo('core');
  const authUrl = await listen(authServer);
  const coreUrl = await listen(coreServer);
  gatewayServer = http.createServer(
    createApp({ authUrl, coreUrl, publicKey, corsOrigin: 'http://localhost:3000' })
  );
  gatewayUrl = await listen(gatewayServer);
});

after(async () => {
  await Promise.all([gatewayServer, authServer, coreServer].map((server) =>
    new Promise((resolve) => {
      server.closeAllConnections();
      server.close(resolve);
    })
  ));
});

test('health del Gateway genera un trace id', async () => {
  const result = await request('/health');
  assert.equal(result.status, 200);
  assert.equal(result.body.service, 'api-gateway');
  assert.equal(result.headers.get('x-trace-id'), result.body.traceId);
});

test('rutea login y catálogo conservando ruta y traza, sin aceptar identidad del cliente', async () => {
  const login = await request('/auth/login?source=web', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Trace-Id': 'trace-login-1', 'X-User-Role': 'admin' },
    body: '{"email":"a@example.com","password":"demo"}'
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.service, 'auth');
  assert.equal(login.body.url, '/auth/login?source=web');
  assert.equal(login.body.traceId, 'trace-login-1');
  assert.equal(login.body.userRole, null);

  const catalog = await request('/api/products?category=guitarras', {
    headers: { 'X-User-Id': 'forged', 'X-User-Role': 'admin' }
  });
  assert.equal(catalog.status, 200);
  assert.equal(catalog.body.service, 'core');
  assert.equal(catalog.body.url, '/api/products?category=guitarras');
  assert.equal(catalog.body.userId, null);
  assert.equal(catalog.body.userRole, null);
});

test('checkout exige cliente autenticado e inyecta identidad verificada', async () => {
  const missing = await request('/api/orders/checkout', {
    method: 'POST',
    headers: { 'X-User-Role': 'cliente' }
  });
  assert.equal(missing.status, 401);
  assert.equal(missing.body.error, 'TOKEN_REQUIRED');

  const payload = '{ "items": [{ "productId": "p1", "quantity": 1, "expectedVersion": 3 }] }';
  const accepted = await request('/api/orders/checkout?conflict=1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sign('cliente')}`,
      'X-User-Id': 'forged',
      'X-User-Role': 'admin',
      'X-Trace-Id': 'trace-checkout-1'
    },
    body: payload
  });
  assert.equal(accepted.status, 409);
  assert.equal(accepted.body.service, 'core');
  assert.equal(accepted.body.body, payload);
  assert.equal(accepted.body.userId, '507f1f77bcf86cd799439011');
  assert.equal(accepted.body.userRole, 'cliente');
  assert.equal(accepted.body.wholesaleStatus, 'APROBADO');
  assert.equal(accepted.body.traceId, 'trace-checkout-1');
  assert.equal(accepted.body.authorizationPresent, false);
});

test('restringe ajustes de stock y aprobación mayorista por rol', async () => {
  const stockDenied = await request('/api/operator/products/p1/stock', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sign('cliente')}` }
  });
  assert.equal(stockDenied.status, 403);

  const stockAllowed = await request('/api/operator/products/p1/stock', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sign('operador')}` }
  });
  assert.equal(stockAllowed.status, 200);
  assert.equal(stockAllowed.body.userRole, 'operador');

  const approvalDenied = await request('/auth/users/u1/approve-wholesale', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sign('cliente')}`, 'X-User-Role': 'admin' }
  });
  assert.equal(approvalDenied.status, 403);

  const approvalAllowed = await request('/auth/users/u1/approve-wholesale', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sign('admin')}` }
  });
  assert.equal(approvalAllowed.status, 200);
  assert.equal(approvalAllowed.body.service, 'auth');
  assert.equal(approvalAllowed.body.authorizationPresent, true);
  assert.equal(approvalAllowed.body.userRole, null);
});

test('rechaza token inválido y no envía rutas desconocidas a servicios internos', async () => {
  const invalid = await request('/api/orders', {
    headers: { Authorization: `Bearer ${sign('admin', { issuer: 'otro-emisor' })}` }
  });
  assert.equal(invalid.status, 401);
  assert.equal(invalid.body.error, 'INVALID_TOKEN');

  const unknown = await request('/api/unknown');
  assert.equal(unknown.status, 404);
});

test('reenvía el webhook firmado sin modificar los bytes del cuerpo', async () => {
  const body = '{  "paymentId": "PAY-1",\n "status": "APPROVED" }';
  const result = await request('/api/payments/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': 'sha256=example',
      'X-Trace-Id': 'trace-payment-1',
      'X-User-Role': 'admin'
    },
    body
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.service, 'core');
  assert.equal(result.body.body, body);
  assert.equal(result.body.signature, 'sha256=example');
  assert.equal(result.body.traceId, 'trace-payment-1');
  assert.equal(result.body.userRole, null);
});


test('CRUD de usuarios exige admin y conserva Authorization para Auth', async () => {
  for (const [method, path] of [['GET', '/auth/users'], ['POST', '/auth/users'], ['PATCH', '/auth/users/u1'], ['DELETE', '/auth/users/u1']]) {
    const missing = await request(path, { method });
    assert.equal(missing.status, 401);
    for (const role of ['cliente', 'operador']) {
      const denied = await request(path, { method, headers: { Authorization: `Bearer ${sign(role)}`, 'X-User-Role': 'admin' } });
      assert.equal(denied.status, 403);
    }
    const allowed = await request(path, { method, headers: { Authorization: `Bearer ${sign('admin')}` } });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.body.service, 'auth');
    assert.equal(allowed.body.method, method);
    assert.equal(allowed.body.authorizationPresent, true);
    assert.equal(allowed.body.userRole, null);
  }
});
