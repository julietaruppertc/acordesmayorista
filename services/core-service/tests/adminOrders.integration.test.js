const crypto = require('crypto');
const http = require('http');
const request = require('supertest');
const app = require('../src/app');
const env = require('../src/config/env');
const { pool } = require('../src/config/database');
const { expireBatch } = require('../src/jobs/expireReservations');

let server, categoryId;
const originalPort = env.CORE_PORT;
const products = [], orders = [];
const suffix = crypto.randomUUID();
const identity = (role = 'admin') => ({ 'X-User-Id': `admin-${suffix}`, 'X-User-Role': role, 'X-Trace-Id': `admin-order-${suffix}` });
async function fixture() {
  const product = (await pool.query('INSERT INTO catalog.products(category_id,name,price) VALUES($1,$2,100) RETURNING id', [categoryId, `Admin ${crypto.randomUUID()}`])).rows[0].id;
  products.push(product);
  await pool.query('INSERT INTO inventory.stock(product_id,on_hand,reserved,version) VALUES($1,10,0,1)', [product]);
  const response = await request(app).post('/api/orders/checkout').set(identity('cliente')).send({ items: [{ productId: product, quantity: 3, expectedVersion: 1 }] });
  expect(response.status).toBe(201);
  orders.push(response.body.data.id);
  return { product, order: response.body.data.id };
}
const decide = (id, decision = 'APPROVED', role = 'admin') => request(app).post(`/api/orders/${id}/resolve`).set(identity(role)).send({ decision });
async function stock(id) { return (await pool.query('SELECT on_hand,reserved FROM inventory.stock WHERE product_id=$1', [id])).rows[0]; }
async function eventCount(id) { return (await pool.query("SELECT count(*)::int AS n FROM mq.outbox WHERE payload->>'orderId'=$1", [id])).rows[0].n; }

beforeAll(async () => {
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  env.CORE_PORT = server.address().port;
  categoryId = (await pool.query('INSERT INTO catalog.categories(name) VALUES($1) RETURNING id', [`Admin orders ${suffix}`])).rows[0].id;
});
afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
  env.CORE_PORT = originalPort;
  for (const id of orders) {
    await pool.query("DELETE FROM mq.outbox WHERE payload->>'orderId'=$1", [id]);
    await pool.query('DELETE FROM payments.payments WHERE order_id=$1', [id]);
    await pool.query('DELETE FROM payments.webhook_inbox WHERE order_id=$1', [id]);
    await pool.query('DELETE FROM orders.order_items WHERE order_id=$1', [id]);
    await pool.query('DELETE FROM orders.orders WHERE id=$1', [id]);
  }
  for (const id of products) {
    await pool.query('DELETE FROM inventory.stock WHERE product_id=$1', [id]);
    await pool.query('DELETE FROM catalog.products WHERE id=$1', [id]);
  }
  if (categoryId) await pool.query('DELETE FROM catalog.categories WHERE id=$1', [categoryId]);
  await pool.end();
});

describe.sequential('Resolucion administrativa de pagos simulados', () => {
  it('confirma por webhook HMAC real y reintentos/opciones opuestas no duplican la venta', async () => {
    const { product, order } = await fixture();
    expect(await stock(product)).toMatchObject({ on_hand: 10, reserved: 3 });
    const responses = await Promise.all([decide(order), decide(order)]);
    expect(responses.every(res => res.status === 200 && res.body.data.status === 'PAID')).toBe(true);
    const opposite = await decide(order, 'REJECTED');
    expect(opposite.body.data.status).toBe('PAID');
    expect(await stock(product)).toMatchObject({ on_hand: 7, reserved: 0 });
    expect(await eventCount(order)).toBe(1);
    const payments = await pool.query('SELECT count(*)::int AS n FROM payments.payments WHERE order_id=$1', [order]);
    expect(payments.rows[0].n).toBe(1);
    const event = await pool.query("SELECT trace_id FROM mq.outbox WHERE payload->>'orderId'=$1", [order]);
    expect(event.rows[0].trace_id).toBe(`admin-order-${suffix}`);
  });
  it('rechazo libera solo la reserva del pedido', async () => {
    const { product, order } = await fixture();
    const res = await decide(order, 'REJECTED');
    expect(res.status).toBe(200); expect(res.body.data.status).toBe('PAYMENT_FAILED');
    expect(await stock(product)).toMatchObject({ on_hand: 10, reserved: 0 });
    expect((await decide(order, 'REJECTED')).body.data.status).toBe('PAYMENT_FAILED');
    expect(await eventCount(order)).toBe(1);
  });
  it('cliente, operador y ausencia de identidad no pueden resolver; valida decision', async () => {
    const { product, order } = await fixture();
    for (const role of ['cliente', 'operador']) expect((await decide(order, 'APPROVED', role)).status).toBe(403);
    expect((await request(app).post(`/api/orders/${order}/resolve`).send({ decision: 'APPROVED' })).status).toBe(401);
    expect((await decide(order, 'INVALID')).status).toBe(400);
    expect(await stock(product)).toMatchObject({ on_hand: 10, reserved: 3 });
  });
  it('simulador deshabilitado no resuelve pedidos', async () => {
    const { product, order } = await fixture();
    const previous = env.ENABLE_PAYMENT_SIMULATOR;
    env.ENABLE_PAYMENT_SIMULATOR = false;
    try { expect((await decide(order)).status).toBe(403); }
    finally { env.ENABLE_PAYMENT_SIMULATOR = previous; }
    expect(await stock(product)).toMatchObject({ on_hand: 10, reserved: 3 });
  });
  it('ambas decisiones fuera de plazo expiran aunque el job no haya pasado', async () => {
    for (const decision of ['APPROVED', 'REJECTED']) {
      const { product, order } = await fixture();
      await pool.query("UPDATE orders.orders SET expires_at=NOW()-INTERVAL '1 minute' WHERE id=$1", [order]);
      const res = await decide(order, decision);
      expect(res.status).toBe(200); expect(res.body.data.status).toBe('EXPIRED');
      expect(await stock(product)).toMatchObject({ on_hand: 10, reserved: 0 });
      expect(await eventCount(order)).toBe(1);
    }
  });
  it('expirador y resolucion concurrentes no liberan dos veces', async () => {
    const { product, order } = await fixture();
    await pool.query("UPDATE orders.orders SET expires_at=NOW()-INTERVAL '1 minute' WHERE id=$1", [order]);
    const [, res] = await Promise.all([expireBatch(), decide(order)]);
    expect(res.status).toBe(200); expect(res.body.data.status).toBe('EXPIRED');
    expect(await stock(product)).toMatchObject({ on_hand: 10, reserved: 0 });
    expect(await eventCount(order)).toBe(1);
  });
});
