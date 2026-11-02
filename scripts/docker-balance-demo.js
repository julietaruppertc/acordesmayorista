// Small DEC-09 demo. Starts only the isolated test project and always tears it down.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
process.chdir(path.resolve(__dirname, '..'));
const docker = process.env.DOCKER_BIN || 'docker';
const flags = ['compose', '-f', 'docker-compose.test.yml', '-f', 'docker-compose.balance.yml', '--profile', 'balance'];
function run(args, quiet = false) {
  return execFileSync(docker, [...flags, ...args], { encoding: 'utf8', timeout: 120000,
    stdio: quiet ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'pipe', 'inherit'] }).trim();
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const prefix = 'balance-' + randomUUID();
let sequence = 0;
async function request() {
  const trace = `${prefix}-${sequence++}`;
  const response = await fetch('http://127.0.0.1:4000/api/products', {
    headers: { 'X-Trace-Id': trace }, signal: AbortSignal.timeout(3000)
  });
  assert.equal(response.headers.get('x-trace-id'), trace);
  await response.arrayBuffer();
  return { trace, status: response.status };
}
async function sample() {
  const requests = [];
  for (let i = 0; i < 6; i++) requests.push(await request());
  const logs = run(['logs', '--no-color', '--no-log-prefix', 'api-gateway'], true).split(/\r?\n/);
  return requests.map(item => ({ ...item,
    target: logs.find(line => line.startsWith(`[BALANCE] ${item.trace} -> `))?.split(' -> ')[1] }));
}
async function until(label, check) {
  const end = Date.now() + 20000;
  while (Date.now() < end) {
    try { const result = await sample(); if (check(result)) { console.log(`OK ${label}: ${result.map(item => item.target || item.status).join(', ')}`); return; } }
    catch { /* startup or readiness transition; only these diagnostic GETs are repeated */ }
    await delay(300);
  }
  assert.fail(`No converge: ${label}`);
}
async function main() {
  const cfg = JSON.parse(run(['config', '--format', 'json'], true));
  assert.equal(cfg.name, 'acordes-prueba');
  assert.equal(cfg.services['core-service'].environment.DATABASE_URL,
    'postgresql://acordes_test:local_test_only@postgres:5432/acordes_test');
  assert.equal(cfg.networks['test-backend'].internal, true);
  const port = cfg.services['api-gateway'].ports[0];
  assert.equal(port.host_ip, '127.0.0.1');
  try {
    run(['up', '-d', '--wait', 'postgres', 'mongo']);
    run(['run', '--rm', '--no-deps', 'core-service', 'npm', 'run', 'migrate']);
    run(['run', '--rm', '--no-deps', 'core-service', 'npm', 'run', 'seed']);
    run(['up', '-d', '--no-build', 'auth-service', 'core-service', 'core-replica', 'api-gateway']);
    await until('reparto A/B', rows => rows.every(item => item.status === 200) &&
      new Set(rows.map(item => item.target)).size === 2 &&
      rows.every((item, i) => i === 0 || item.target !== rows[i - 1].target));
    run(['stop', 'core-service']);
    await until('A apagado, solo B', rows => rows.every(item => item.status === 200 && item.target === 'http://core-replica:4002'));
    run(['start', 'core-service']);
    await until('A recuperado, A/B', rows => rows.every(item => item.status === 200) &&
      new Set(rows.map(item => item.target)).size === 2 && rows.every((item, i) => i === 0 || item.target !== rows[i - 1].target));
    // Existing smoke check also confirms real login, checkout, HMAC and Outbox with the pool enabled.
    execFileSync(process.execPath, ['scripts/docker-smoke.js'], { stdio: 'inherit', timeout: 60000 });
    run(['stop', 'core-service', 'core-replica']);
    await until('sin replicas disponibles: 502', rows => rows.every(item => item.status === 502));
    console.log('PASS DEC-09: reparto, caida, recuperacion y error controlado. No prueba 250 usuarios.');
  } finally {
    run(['down']);
    assert.equal(run(['ps', '-aq'], true), '', 'Deben quedar cero contenedores');
    console.log('OK: contenedores de prueba retirados; volumenes locales conservados.');
  }
}
main().catch(error => { console.error('FAIL:', error.message); process.exitCode = 1; });
