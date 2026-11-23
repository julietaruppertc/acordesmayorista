const crypto = require('crypto');
const http = require('http');
const request = require('supertest');
const app = require('../src/app');
const env = require('../src/config/env');
const { pool } = require('../src/config/database');
const { processOne } = require('../src/workers/outboxWorker');

const suffix = crypto.randomUUID();
const userId = `blockchain-client-${suffix}`;
const products = [];
const orders = [];
let server;
let categoryId;

const original = {
  port: env.CORE_PORT,
  enabled: env.BLOCKCHAIN_ENABLED,
  threshold: env.HIGH_VALUE_THRESHOLD_ARS,
  address: env.ATTESTATION_CONTRACT_ADDRESS,
  network: env.BLOCKCHAIN_NETWORK
};

function identity(role = 'admin', id = userId) {
  return {
    'X-User-Id': id,
    'X-User-Role': role,
    'X-Trace-Id': `blockchain-${suffix}`
  };
}

async function highValueFixture() {
  const product = (
    await pool.query(
      'INSERT INTO catalog.products(category_id,name,price) VALUES($1,$2,2500000) RETURNING id',
      [categoryId, `Blockchain ${crypto.randomUUID()}`]
    )
  ).rows[0].id;
  products.push(product);
  await pool.query(
    'INSERT INTO inventory.stock(product_id,on_hand,reserved,version) VALUES($1,2,0,1)',
    [product]
  );
  const response = await request(app)
    .post('/api/orders/checkout')
    .set(identity('cliente'))
    .send({ items: [{ productId: product, quantity: 1, expectedVersion: 1 }] });
  expect(response.status).toBe(201);
  orders.push(response.body.data.id);
  return response.body.data.id;
}

function decide(id) {
  return request(app)
    .post(`/api/orders/${id}/resolve`)
    .set(identity('admin'))
    .send({ decision: 'APPROVED' });
}

beforeAll(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  env.CORE_PORT = server.address().port;
  env.BLOCKCHAIN_ENABLED = true;
  env.HIGH_VALUE_THRESHOLD_ARS = 2000000;
  env.ATTESTATION_CONTRACT_ADDRESS = '0x1111111111111111111111111111111111111111';
  env.BLOCKCHAIN_NETWORK = 'sepolia';
  categoryId = (
    await pool.query('INSERT INTO catalog.categories(name) VALUES($1) RETURNING id', [
      `Blockchain ${suffix}`
    ])
  ).rows[0].id;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  env.CORE_PORT = original.port;
  env.BLOCKCHAIN_ENABLED = original.enabled;
  env.HIGH_VALUE_THRESHOLD_ARS = original.threshold;
  env.ATTESTATION_CONTRACT_ADDRESS = original.address;
  env.BLOCKCHAIN_NETWORK = original.network;

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

describe.sequential('Notarización blockchain de alto valor', () => {
  it('encola una sola evidencia, la procesa y protege el endpoint', async () => {
    const order = await highValueFixture();
    expect((await decide(order)).status).toBe(200);
    expect((await decide(order)).status).toBe(200);

    const blockchainEvents = await pool.query(
      `SELECT id, status FROM mq.outbox
        WHERE event_type='ATTEST_HIGH_VALUE' AND payload->>'orderId'=$1`,
      [order]
    );
    expect(blockchainEvents.rowCount).toBe(1);
    expect(
      (await pool.query('SELECT blockchain_status FROM orders.orders WHERE id=$1', [order])).rows[0]
        .blockchain_status
    ).toBe('PENDING');

    const fakeResult = {
      transactionHash: `0x${'ab'.repeat(32)}`,
      evidenceHash: `0x${'cd'.repeat(32)}`
    };
    let blockchainStatus;
    do {
      await processOne({ attestHighValueOrder: async () => fakeResult });
      blockchainStatus = (
        await pool.query('SELECT blockchain_status FROM orders.orders WHERE id=$1', [order])
      ).rows[0].blockchain_status;
    } while (blockchainStatus === 'PENDING');
    expect(blockchainStatus).toBe('CONFIRMED');

    const enabled = env.BLOCKCHAIN_ENABLED;
    env.BLOCKCHAIN_ENABLED = false;
    try {
      const own = await request(app)
        .get(`/api/orders/${order}/blockchain-proof`)
        .set(identity('cliente'));
      expect(own.status).toBe(200);
      expect(own.body.data).toMatchObject({
        orderId: order,
        required: true,
        status: 'CONFIRMED',
        transactionHash: fakeResult.transactionHash,
        evidenceHash: fakeResult.evidenceHash,
        verificationStatus: 'BLOCKCHAIN_DISABLED'
      });
      expect(
        (
          await request(app)
            .get(`/api/orders/${order}/blockchain-proof`)
            .set(identity('cliente', 'another-client'))
        ).status
      ).toBe(403);
      expect(
        (await request(app).get(`/api/orders/${order}/blockchain-proof`).set(identity('operador')))
          .status
      ).toBe(403);
      expect(
        (await request(app).get(`/api/orders/${order}/blockchain-proof`).set(identity('admin')))
          .status
      ).toBe(200);
    } finally {
      env.BLOCKCHAIN_ENABLED = enabled;
    }
  });

  it('reintenta y marca FAILED al agotar intentos', async () => {
    const order = await highValueFixture();
    expect((await decide(order)).status).toBe(200);
    const failingHandler = async () => {
      throw new Error('RPC temporalmente no disponible');
    };

    for (
      let expectedAttempts = 1;
      expectedAttempts <= env.OUTBOX_MAX_ATTEMPTS;
      expectedAttempts += 1
    ) {
      let event;
      do {
        await processOne({ attestHighValueOrder: failingHandler });
        event = (
          await pool.query(
            `SELECT status, attempts FROM mq.outbox
            WHERE event_type='ATTEST_HIGH_VALUE' AND payload->>'orderId'=$1`,
            [order]
          )
        ).rows[0];
      } while (Number(event.attempts) < expectedAttempts);
    }

    const event = (
      await pool.query(
        `SELECT status, attempts, last_error FROM mq.outbox
        WHERE event_type='ATTEST_HIGH_VALUE' AND payload->>'orderId'=$1`,
        [order]
      )
    ).rows[0];
    expect(event.status).toBe('FAILED');
    expect(Number(event.attempts)).toBe(env.OUTBOX_MAX_ATTEMPTS);
    expect(event.last_error).toContain('RPC temporalmente no disponible');
    expect(
      (await pool.query('SELECT blockchain_status FROM orders.orders WHERE id=$1', [order])).rows[0]
        .blockchain_status
    ).toBe('FAILED');
  });
});
