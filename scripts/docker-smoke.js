// Integration check restricted to the isolated acordes-prueba Compose project.
// Run from the repository root. Never prints credentials or tokens.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { randomUUID, createHmac } = require('node:crypto');
const path = require('node:path');
process.chdir(path.resolve(__dirname, '..'));
const docker = process.env.DOCKER_BIN || 'docker';
const compose = ['compose', '-f', 'docker-compose.test.yml'];
function command(args) {
  return execFileSync(docker, [...compose, ...args], { encoding: 'utf8', timeout: 30000 }).trim();
}
function runtimeEnv(service, name) {
  return command(['exec', '-T', service, 'node', '-p', `process.env.${name}`]);
}
const trace = `docker-smoke-${randomUUID()}`;
const base = 'http://127.0.0.1:4000';
async function request(route, expected, { method = 'GET', token, body, headers = {} } = {}) {
  const response = await fetch(base + route, {
    method, signal: AbortSignal.timeout(10000),
    headers: { 'X-Trace-Id': trace, ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    ...(body ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {})
  });
  assert.equal(response.status, expected, `${method} ${route}: expected ${expected}, got ${response.status}`);
  assert.equal(response.headers.get('x-trace-id'), trace, 'Trace must survive the Gateway');
  return response.json();
}
async function main() {
  const config = JSON.parse(command(['config', '--format', 'json']));
  assert.equal(config.name, 'acordes-prueba');
  assert.equal(config.networks['test-backend'].internal, true);
  const gatewayId = command(['ps', '-q', 'api-gateway']);
  assert.ok(gatewayId, 'Isolated Gateway must be running');
  const [gateway] = JSON.parse(execFileSync(docker, ['inspect', gatewayId], { encoding: 'utf8' }));
  const bindings = gateway.HostConfig.PortBindings['4000/tcp'];
  assert.deepEqual(bindings, [{ HostIp: '127.0.0.1', HostPort: '4000' }]);
  assert.ok(runtimeEnv('core-service', 'DATABASE_URL') ===
    'postgresql://acordes_test:local_test_only@postgres:5432/acordes_test', 'Core must use isolated PostgreSQL');
  assert.ok(runtimeEnv('auth-service', 'MONGO_URI') === 'mongodb://mongo:27017/acordes_auth_test', 'Auth must use isolated MongoDB');
  console.log('OK: isolated project, local databases and loopback-only Gateway');
  await request('/health', 200);
  const email = `docker-${randomUUID()}@example.test`;
  const password = randomUUID() + 'Aa1!';
  const registered = await request('/auth/register', 201, {
    method: 'POST', body: { email, password, rol: 'admin' }
  });
  assert.equal(registered.user.rol, 'cliente');
  const login = await request('/auth/login', 200, { method: 'POST', body: { email, password } });
  assert.ok(login.token);
  const token = login.token;
  console.log('OK: real registration and RS256 login; public registration preserves cliente role');
  await request('/api/orders', 401, { headers: { 'X-User-Role': 'admin' } });
  await request('/api/orders', 401, { token: 'invalid-token' });
  const products = await request('/api/products', 200);
  const product = products.data.find(item => item.availableStock > 0);
  assert.ok(product, 'Seeded product with stock required');
  await request(`/api/operator/products/${product.id}/stock`, 403, {
    method: 'PATCH', token, body: { onHand: 100, expectedVersion: product.version }
  });
  console.log('OK: forged identity and invalid JWT rejected; cliente cannot adjust stock');
  const order = (await request('/api/orders/checkout', 201, {
    method: 'POST', token,
    body: { items: [{ productId: product.id, quantity: 1, expectedVersion: product.version }] }
  })).data;
  assert.equal(order.status, 'PENDING_PAYMENT');
  assert.equal(order.userId, registered.user.id);
  const reserved = (await request(`/api/products/${product.id}`, 200)).data;
  assert.equal(reserved.availableStock, product.availableStock - 1);
  assert.ok(reserved.version > product.version);
  const payload = JSON.stringify({ paymentId: `docker-${randomUUID()}`, orderId: order.id,
    status: 'APPROVED', amount: order.total });
  await request('/api/payments/webhook', 401, { method: 'POST', body: payload });
  const secret = runtimeEnv('core-service', 'PAYMENT_WEBHOOK_SECRET');
  const signature = 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
  const options = { method: 'POST', body: payload, headers: { 'X-Webhook-Signature': signature } };
  const paid = await request('/api/payments/webhook', 200, options);
  assert.equal(paid.data.orderStatus, 'PAID');
  for (let i = 0; i < 4; i++) {
    const duplicate = await request('/api/payments/webhook', 200, options);
    assert.equal(duplicate.data.reason, 'already_processed');
  }
  const final = (await request(`/api/orders/${order.id}`, 200, { token })).data;
  assert.equal(final.status, 'PAID');
  const after = (await request(`/api/products/${product.id}`, 200)).data;
  assert.equal(after.availableStock, product.availableStock - 1);
  console.log('OK: checkout, exact-body HMAC, payment and four duplicate notifications via Gateway');
  // order.id is supplied by the API; validate before embedding in the diagnostic SQL.
  assert.match(order.id, /^[0-9a-f-]{36}$/i);
  const beforeWorker = command(['exec', '-T', 'postgres', 'psql', '-U', 'acordes_test', '-d',
    'acordes_test', '-Atc', `SELECT (SELECT count(*) FROM payments.payments WHERE order_id='${order.id}'), (SELECT count(*) FROM mq.outbox WHERE payload->>'orderId'='${order.id}' AND event_type='ORDER_PAID');`]);
  assert.equal(beforeWorker, '1|1');
  const workerCode = `(async()=>{const w=require('./src/workers/outboxWorker');const {pool}=require('./src/config/database');try{while(await w.processOne()){} }finally{await pool.end();}})().catch(()=>process.exit(1))`;
  command(['exec', '-T', 'core-service', 'node', '-e', workerCode]);
  const processed = command(['exec', '-T', 'postgres', 'psql', '-U', 'acordes_test', '-d',
    'acordes_test', '-Atc', `SELECT status FROM mq.outbox WHERE payload->>'orderId'='${order.id}' AND trace_id='${trace}' AND event_type='ORDER_PAID';`]);
  assert.equal(processed, 'PROCESSED');
  console.log('OK: exactly one payment and one event; Outbox processed with the same trace');
  console.log(`Trace: ${trace}`);
  console.log('PASS: temporary Docker integration check. Stop Compose when finished.');
}
main().catch(error => {
  console.error('FAIL:', error instanceof assert.AssertionError ? error.message : 'check failed; private details omitted');
  process.exitCode = 1;
});
