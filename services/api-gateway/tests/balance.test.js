const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const createApp = require('../src/app');
const createCorePool = require('../src/corePool');

async function fixture(t) {
  const servers = [];
  const state = [{ name: 'A', ready: true, slow: false, breakRequest: false, calls: 0 },
    { name: 'B', ready: true, slow: false, breakRequest: false, calls: 0 }];
  async function listen(server) {
    servers.push(server);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${server.address().port}`;
  }
  const targets = [];
  for (const item of state) {
    targets.push(await listen(http.createServer(async (req, res) => {
      if (req.url === '/ready') {
        if (item.slow) return; // closed during teardown after the probe times out
        res.writeHead(item.ready ? 200 : 503); return res.end();
      }
      item.calls++;
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      if (item.breakRequest) return req.socket.destroy();
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ name: item.name, body: Buffer.concat(chunks).toString(),
        trace: req.headers['x-trace-id'], signature: req.headers['x-webhook-signature'] }));
    })));
  }
  const pool = createCorePool(targets, { timeoutMs: 100, intervalMs: 30 });
  const gateway = await listen(http.createServer(createApp({ authUrl: targets[0], corePool: pool,
    publicKey: '', corsOrigin: 'http://localhost:3000' })));
  t.after(async () => {
    pool.stop();
    await Promise.all(servers.map(server => new Promise(resolve => {
      server.closeAllConnections(); server.close(resolve);
    })));
  });
  async function request(options) {
    const response = await fetch(gateway + (options ? '/api/payments/webhook' : '/api/products'), {
      ...options, signal: AbortSignal.timeout(2000)
    });
    return { status: response.status, body: await response.json(), headers: response.headers };
  }
  return { state, pool, request };
}

test('round-robin alterna replicas sin cambiar traza ni bytes del webhook', async t => {
  const { pool, request } = await fixture(t);
  await pool.refresh();
  const names = [];
  for (let i = 0; i < 4; i++) names.push((await request()).body.name);
  assert.deepEqual(names, ['A', 'B', 'A', 'B']);
  const raw = '{  "paymentId": "demo",\n "status": "APPROVED" }';
  const response = await request({ method: 'POST', body: raw, headers: {
    'Content-Type': 'application/json', 'X-Trace-Id': 'balance-test', 'X-Webhook-Signature': 'sha256=demo'
  }});
  assert.equal(response.body.body, raw);
  assert.equal(response.body.trace, 'balance-test');
  assert.equal(response.body.signature, 'sha256=demo');
  assert.equal(response.headers.get('x-trace-id'), 'balance-test');
});

test('sondeo periodico aparta replica caida y readmite la recuperada; ambas caidas dan 502', async t => {
  const { state, pool, request } = await fixture(t);
  await pool.start();
  state[0].ready = false;
  async function until(check) {
    const deadline = Date.now() + 2500;
    while (Date.now() < deadline) {
      if (await check()) return;
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    assert.fail('Health state did not converge');
  }
  await until(async () => {
    const names = [];
    for (let i = 0; i < 4; i++) names.push((await request()).body.name);
    return names.every(name => name === 'B');
  });
  state[0].ready = true;
  await until(async () => (await request()).body.name === 'A');
  state[0].ready = false; state[1].ready = false;
  await until(async () => (await request()).status === 502);
  assert.equal((await request()).body.error, 'UPSTREAM_UNAVAILABLE');
});

test('timeout de salud excluye replica y fallo de POST no reintenta en otra', async t => {
  const { state, pool, request } = await fixture(t);
  state[1].slow = true;
  await pool.refresh();
  assert.equal(pool.next(), pool.targets[0]);
  state[1].slow = false;
  await pool.refresh();
  assert.equal(pool.next(), pool.targets[1]);
  state[0].breakRequest = true;
  const response = await request({ method: 'POST', body: '{"demo":true}', headers: {
    'Content-Type': 'application/json'
  }});
  assert.equal(response.status, 502);
  assert.equal(state[0].calls, 1);
  assert.equal(state[1].calls, 0);
  const next = await request();
  assert.equal(next.status, 200);
  assert.equal(next.body.name, 'B');
  assert.equal(state[0].calls, 1);
});

test('rechaza listas vacias, credenciales en URL y tiempos invalidos', () => {
  assert.throws(() => createCorePool([]));
  assert.throws(() => createCorePool(['http://user:pass@localhost:4002']));
  assert.throws(() => createCorePool(['http://localhost:4002'], { timeoutMs: 0 }));
});
