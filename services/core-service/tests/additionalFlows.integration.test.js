const crypto = require('crypto');
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');
const { expireBatch } = require('../src/jobs/expireReservations');
const { processOne } = require('../src/workers/outboxWorker');
const { signPayload } = require('../src/modules/payments/webhookSignature');

const suffix = crypto.randomUUID();
const productIds = [];
const orderIds = [];
let categoryId;

function headers(userId, role = 'cliente') {
  return {
    'X-User-Id': userId,
    'X-User-Role': role,
    'X-Trace-Id': `trace-${userId}`
  };
}

async function createProduct(onHand) {
  const product = await pool.query(
    `INSERT INTO catalog.products (category_id, name, description, price)
     VALUES ($1, $2, 'Producto temporal de prueba', 1000)
     RETURNING id`,
    [categoryId, `Producto ${crypto.randomUUID()}`]
  );
  const productId = product.rows[0].id;
  productIds.push(productId);
  await pool.query(
    `INSERT INTO inventory.stock (product_id, on_hand, reserved, version)
     VALUES ($1, $2, 0, 1)`,
    [productId, onHand]
  );
  return productId;
}

async function checkout(productId, userId, quantity = 1) {
  const response = await request(app)
    .post('/api/orders/checkout')
    .set(headers(userId))
    .send({ items: [{ productId, quantity, expectedVersion: 1 }] });
  if (response.status === 201) orderIds.push(response.body.data.id);
  return response;
}

beforeAll(async () => {
  const category = await pool.query(
    `INSERT INTO catalog.categories (name) VALUES ($1) RETURNING id`,
    [`Pruebas adicionales ${suffix}`]
  );
  categoryId = category.rows[0].id;
});

afterAll(async () => {
  for (const orderId of orderIds) {
    await pool.query(`DELETE FROM mq.outbox WHERE payload->>'orderId' = $1`, [orderId]);
    await pool.query(`DELETE FROM payments.payments WHERE order_id = $1`, [orderId]);
    await pool.query(`DELETE FROM payments.webhook_inbox WHERE order_id = $1`, [orderId]);
    await pool.query(`DELETE FROM orders.order_items WHERE order_id = $1`, [orderId]);
    await pool.query(`DELETE FROM orders.orders WHERE id = $1`, [orderId]);
  }
  await pool.query(`DELETE FROM mq.outbox WHERE trace_id = $1`, [`worker-${suffix}`]);
  for (const productId of productIds) {
    await pool.query(`DELETE FROM inventory.stock WHERE product_id = $1`, [productId]);
    await pool.query(`DELETE FROM catalog.products WHERE id = $1`, [productId]);
  }
  if (categoryId) await pool.query(`DELETE FROM catalog.categories WHERE id = $1`, [categoryId]);
  await pool.end();
});

describe.sequential('Reglas adicionales del Core', () => {
  it('libera la reserva cuando el pago es rechazado', async () => {
    const productId = await createProduct(2);
    const order = await checkout(productId, `rejected-${suffix}`);
    expect(order.status).toBe(201);
    const orderId = order.body.data.id;

    const webhook = {
      paymentId: `REJECTED-${suffix}`,
      orderId,
      status: 'REJECTED',
      amount: 1000
    };
    const response = await request(app)
      .post('/api/payments/webhook')
      .set('X-Webhook-Signature', signPayload(webhook))
      .send(webhook);
    expect(response.status).toBe(200);
    expect(response.body.data.orderStatus).toBe('PAYMENT_FAILED');

    const stock = await pool.query(
      `SELECT on_hand, reserved FROM inventory.stock WHERE product_id = $1`,
      [productId]
    );
    expect(Number(stock.rows[0].on_hand)).toBe(2);
    expect(Number(stock.rows[0].reserved)).toBe(0);
  });

  it('expira una reserva pendiente y recupera el stock disponible', async () => {
    const productId = await createProduct(1);
    const order = await checkout(productId, `expired-${suffix}`);
    expect(order.status).toBe(201);
    const orderId = order.body.data.id;
    await pool.query(
      `UPDATE orders.orders SET expires_at = NOW() - INTERVAL '1 minute' WHERE id = $1`,
      [orderId]
    );

    const count = await expireBatch();
    expect(count).toBeGreaterThanOrEqual(1);

    const state = await pool.query(`SELECT status FROM orders.orders WHERE id = $1`, [orderId]);
    const stock = await pool.query(
      `SELECT on_hand, reserved FROM inventory.stock WHERE product_id = $1`,
      [productId]
    );
    expect(state.rows[0].status).toBe('EXPIRED');
    expect(Number(stock.rows[0].on_hand)).toBe(1);
    expect(Number(stock.rows[0].reserved)).toBe(0);
  });

  it('no confirma un pago aprobado recibido después del vencimiento', async () => {
    const productId = await createProduct(1);
    const order = await checkout(productId, `late-${suffix}`);
    expect(order.status).toBe(201);
    const orderId = order.body.data.id;
    await pool.query(
      `UPDATE orders.orders SET expires_at = NOW() - INTERVAL '1 minute' WHERE id = $1`,
      [orderId]
    );

    const webhook = {
      paymentId: `LATE-${suffix}`,
      orderId,
      status: 'APPROVED',
      amount: 1000
    };
    const response = await request(app)
      .post('/api/payments/webhook')
      .set('X-Webhook-Signature', signPayload(webhook))
      .send(webhook);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ status: 'ignored', reason: 'order_expired' });

    const state = await pool.query(`SELECT status FROM orders.orders WHERE id = $1`, [orderId]);
    const payments = await pool.query(
      `SELECT COUNT(*)::int AS total FROM payments.payments WHERE order_id = $1`,
      [orderId]
    );
    expect(state.rows[0].status).toBe('EXPIRED');
    expect(payments.rows[0].total).toBe(0);
  });

  it('aplica permisos de cliente y operador', async () => {
    const productId = await createProduct(5);

    await request(app)
      .patch(`/api/operator/products/${productId}/stock`)
      .set(headers(`customer-${suffix}`))
      .send({ onHand: 6, expectedVersion: 1 })
      .expect(403);

    const update = await request(app)
      .patch(`/api/operator/products/${productId}/stock`)
      .set(headers(`operator-${suffix}`, 'operador'))
      .send({ onHand: 6, expectedVersion: 1 })
      .expect(200);
    expect(update.body.data.onHand).toBe(6);

    await request(app)
      .post('/api/orders/checkout')
      .set(headers(`operator-${suffix}`, 'operador'))
      .send({ items: [{ productId, quantity: 1, expectedVersion: 2 }] })
      .expect(403);
  });

  it('rechaza webhooks sin firma antes de procesar sus datos', async () => {
    const response = await request(app).post('/api/payments/webhook').send({
      paymentId: `UNSIGNED-${suffix}`,
      orderId: crypto.randomUUID(),
      status: 'APPROVED',
      amount: 1000
    });
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('WEBHOOK_SIGNATURE_REQUIRED');

    const inbox = await pool.query(
      `SELECT COUNT(*)::int AS total FROM payments.webhook_inbox WHERE payment_id = $1`,
      [`UNSIGNED-${suffix}`]
    );
    expect(inbox.rows[0].total).toBe(0);
  });

  it('revierte todas las reservas si falla un producto del checkout', async () => {
    const availableProduct = await createProduct(1);
    const unavailableProduct = await createProduct(0);
    const userId = `rollback-${suffix}`;

    const response = await request(app)
      .post('/api/orders/checkout')
      .set(headers(userId))
      .send({
        items: [
          { productId: availableProduct, quantity: 1, expectedVersion: 1 },
          { productId: unavailableProduct, quantity: 1, expectedVersion: 1 }
        ]
      });
    expect(response.status).toBe(409);

    const stocks = await pool.query(
      `SELECT product_id, reserved FROM inventory.stock WHERE product_id = ANY($1::uuid[])`,
      [[availableProduct, unavailableProduct]]
    );
    expect(stocks.rows.every((row) => Number(row.reserved) === 0)).toBe(true);
    const orders = await pool.query(
      `SELECT COUNT(*)::int AS total FROM orders.orders WHERE user_id = $1`,
      [userId]
    );
    expect(orders.rows[0].total).toBe(0);
  });

  it('procesa los eventos pendientes mediante el worker de Outbox', async () => {
    const insert = await pool.query(
      `INSERT INTO mq.outbox (event_type, payload, trace_id, status)
       VALUES ('TEST_NOTIFICATION', $1::jsonb, $2, 'PENDING')
       RETURNING id`,
      [JSON.stringify({ orderId: `worker-order-${suffix}` }), `worker-${suffix}`]
    );

    while (await processOne()) {
      // Procesa también eventos anteriores que sigan pendientes.
    }

    const event = await pool.query(`SELECT status, attempts FROM mq.outbox WHERE id = $1`, [
      insert.rows[0].id
    ]);
    expect(event.rows[0].status).toBe('PROCESSED');
    expect(Number(event.rows[0].attempts)).toBe(1);
  });
});
