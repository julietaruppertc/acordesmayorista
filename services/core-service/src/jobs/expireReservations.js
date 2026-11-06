const { pool, withTransaction } = require('../config/database');
const env = require('../config/env');
const outbox = require('../modules/outbox/outbox.repository');
const AppError = require('../shared/AppError');

async function expireBatch() {
  return withTransaction(async (client) => {
    const orders = await client.query(
      `SELECT id, user_id, trace_id
         FROM orders.orders
        WHERE status = 'PENDING_PAYMENT' AND expires_at <= NOW()
        ORDER BY expires_at
        FOR UPDATE SKIP LOCKED
        LIMIT 50`
    );

    for (const order of orders.rows) {
      const items = await client.query(
        `SELECT product_id, quantity FROM orders.order_items WHERE order_id = $1`,
        [order.id]
      );
      for (const item of items.rows) {
        const released = await client.query(
          `UPDATE inventory.stock
              SET reserved = reserved - $1,
                  version = version + 1,
                  updated_at = NOW()
            WHERE product_id = $2 AND reserved >= $1`,
          [item.quantity, item.product_id]
        );
        if (released.rowCount !== 1) {
          throw new AppError(409, 'RESERVATION_STATE_CONFLICT', 'La reserva no pudo liberarse.');
        }
      }
      await client.query(
        `UPDATE orders.orders SET status = 'EXPIRED', updated_at = NOW() WHERE id = $1`,
        [order.id]
      );
      await outbox.enqueue(client, {
        eventType: 'ORDER_EXPIRED',
        payload: { orderId: order.id, userId: order.user_id },
        traceId: order.trace_id || 'expiration-job'
      });
    }
    return orders.rowCount;
  });
}

async function runOnce() {
  const count = await expireBatch();
  console.log(`[RESERVATIONS] Pedidos expirados: ${count}`);
  return count;
}

if (require.main === module) {
  const intervalMs = env.RESERVATION_JOB_INTERVAL_SECONDS * 1000;
  runOnce().catch(console.error);
  const timer = setInterval(() => runOnce().catch(console.error), intervalMs);

  async function shutdown() {
    clearInterval(timer);
    await pool.end();
    process.exit(0);
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = { expireBatch };
