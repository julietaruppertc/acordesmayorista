const crypto = require('crypto');
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

const suffix = crypto.randomUUID();
let categoryId;
let productId;
let orderId;

const identityHeaders = {
  'X-User-Id': `test-user-${suffix}`,
  'X-User-Role': 'cliente',
  'X-Trace-Id': `test-trace-${suffix}`
};

beforeAll(async () => {
  const category = await pool.query(
    `INSERT INTO catalog.categories (name) VALUES ($1) RETURNING id`,
    [`Pruebas ${suffix}`]
  );
  categoryId = category.rows[0].id;

  const product = await pool.query(
    `INSERT INTO catalog.products (category_id, name, description, price)
     VALUES ($1, $2, 'Producto temporal de prueba', 1000)
     RETURNING id`,
    [categoryId, `Producto prueba ${suffix}`]
  );
  productId = product.rows[0].id;
  await pool.query(
    `INSERT INTO inventory.stock (product_id, on_hand, reserved, version)
     VALUES ($1, 1, 0, 1)`,
    [productId]
  );
});

afterAll(async () => {
  if (orderId) {
    await pool.query(`DELETE FROM mq.outbox WHERE payload->>'orderId' = $1`, [orderId]);
    await pool.query(`DELETE FROM payments.payments WHERE order_id = $1`, [orderId]);
    await pool.query(`DELETE FROM payments.webhook_inbox WHERE order_id = $1`, [orderId]);
    await pool.query(`DELETE FROM orders.order_items WHERE order_id = $1`, [orderId]);
    await pool.query(`DELETE FROM orders.orders WHERE id = $1`, [orderId]);
  }
  if (productId) await pool.query(`DELETE FROM inventory.stock WHERE product_id = $1`, [productId]);
  if (productId) await pool.query(`DELETE FROM catalog.products WHERE id = $1`, [productId]);
  if (categoryId) await pool.query(`DELETE FROM catalog.categories WHERE id = $1`, [categoryId]);
  await pool.end();
});

describe('Flujos críticos con PostgreSQL', () => {
  it('acepta una sola reserva cuando diez checkouts compiten por una unidad', async () => {
    const payload = {
      items: [{ productId, quantity: 1, expectedVersion: 1 }]
    };

    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app).post('/api/orders/checkout').set(identityHeaders).send(payload)
      )
    );

    const successes = responses.filter((response) => response.status === 201);
    const conflicts = responses.filter((response) => response.status === 409);

    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(9);
    expect(
      conflicts.every((response) =>
        ['STOCK_VERSION_CONFLICT', 'INSUFFICIENT_STOCK'].includes(response.body.error)
      )
    ).toBe(true);
    const success = successes[0];
    orderId = success.body.data.id;

    const stock = await pool.query(
      `SELECT on_hand, reserved FROM inventory.stock WHERE product_id = $1`,
      [productId]
    );
    expect(Number(stock.rows[0].on_hand)).toBe(1);
    expect(Number(stock.rows[0].reserved)).toBe(1);
  });

  it('procesa una sola vez un webhook de pago repetido', async () => {
    const webhook = {
      paymentId: `PAY-${suffix}`,
      orderId,
      status: 'APPROVED',
      amount: 1000
    };

    const first = await request(app).post('/api/payments/webhook').send(webhook).expect(200);
    const duplicate = await request(app).post('/api/payments/webhook').send(webhook).expect(200);

    expect(first.body.data).toEqual({ status: 'processed', orderStatus: 'PAID' });
    expect(duplicate.body.data).toEqual({ status: 'ignored', reason: 'already_processed' });

    const stock = await pool.query(
      `SELECT on_hand, reserved FROM inventory.stock WHERE product_id = $1`,
      [productId]
    );
    expect(Number(stock.rows[0].on_hand)).toBe(0);
    expect(Number(stock.rows[0].reserved)).toBe(0);

    const paymentCount = await pool.query(
      `SELECT COUNT(*)::int AS total FROM payments.payments WHERE order_id = $1`,
      [orderId]
    );
    const outboxCount = await pool.query(
      `SELECT COUNT(*)::int AS total FROM mq.outbox
        WHERE event_type = 'ORDER_PAID' AND payload->>'orderId' = $1`,
      [orderId]
    );
    expect(paymentCount.rows[0].total).toBe(1);
    expect(outboxCount.rows[0].total).toBe(1);
  });
});
