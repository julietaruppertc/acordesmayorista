const { withTransaction } = require('../../config/database');
const AppError = require('../../shared/AppError');
const outbox = require('../outbox/outbox.repository');

async function insertInbox(client, input) {
  const result = await client.query(
    `INSERT INTO payments.webhook_inbox
       (payment_id, order_id, payload, received_at)
     VALUES ($1, $2, $3::jsonb, NOW())
     ON CONFLICT (payment_id) DO NOTHING
     RETURNING payment_id`,
    [input.paymentId, input.orderId, JSON.stringify(input)]
  );
  return result.rowCount === 1;
}

async function lockOrder(client, orderId) {
  const result = await client.query(
    `SELECT id, user_id, status, total, expires_at
       FROM orders.orders
      WHERE id = $1
      FOR UPDATE`,
    [orderId]
  );
  return result.rows[0] || null;
}

async function releaseReservation(client, orderId) {
  const items = await client.query(
    `SELECT product_id, quantity FROM orders.order_items WHERE order_id = $1`,
    [orderId]
  );
  for (const item of items.rows) {
    const result = await client.query(
      `UPDATE inventory.stock
          SET reserved = reserved - $1,
              version = version + 1,
              updated_at = NOW()
        WHERE product_id = $2 AND reserved >= $1`,
      [item.quantity, item.product_id]
    );
    if (result.rowCount !== 1) {
      throw new AppError(409, 'RESERVATION_STATE_CONFLICT', 'La reserva no pudo liberarse.');
    }
  }
}

async function consolidateReservation(client, orderId) {
  const items = await client.query(
    `SELECT product_id, quantity FROM orders.order_items WHERE order_id = $1`,
    [orderId]
  );
  for (const item of items.rows) {
    const result = await client.query(
      `UPDATE inventory.stock
          SET on_hand = on_hand - $1,
              reserved = reserved - $1,
              version = version + 1,
              updated_at = NOW()
        WHERE product_id = $2
          AND reserved >= $1
          AND on_hand >= $1`,
      [item.quantity, item.product_id]
    );
    if (result.rowCount !== 1) {
      throw new AppError(409, 'RESERVATION_STATE_CONFLICT', 'La reserva no pudo confirmarse.');
    }
  }
}

async function recordPayment(client, input, order, status) {
  await client.query(
    `INSERT INTO payments.payments
       (external_payment_id, order_id, status, amount, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (external_payment_id) DO NOTHING`,
    [input.paymentId, order.id, status, input.amount ?? order.total]
  );
}

async function handleWebhook(input, traceId) {
  return withTransaction(async (client) => {
    const isNew = await insertInbox(client, input);
    if (!isNew) {
      return { status: 'ignored', reason: 'already_processed' };
    }

    const order = await lockOrder(client, input.orderId);
    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'El pedido informado no existe.');
    }

    if (order.status !== 'PENDING_PAYMENT') {
      return { status: 'ignored', reason: `order_${order.status.toLowerCase()}` };
    }

    if (new Date(order.expires_at).getTime() <= Date.now()) {
      await releaseReservation(client, order.id);
      await client.query(
        `UPDATE orders.orders SET status = 'EXPIRED', updated_at = NOW() WHERE id = $1`,
        [order.id]
      );
      await outbox.enqueue(client, {
        eventType: 'ORDER_EXPIRED',
        payload: { orderId: order.id, userId: order.user_id },
        traceId
      });
      return { status: 'ignored', reason: 'order_expired' };
    }

    if (input.status === 'APPROVED') {
      await consolidateReservation(client, order.id);
      await client.query(
        `UPDATE orders.orders SET status = 'PAID', updated_at = NOW() WHERE id = $1`,
        [order.id]
      );
      await recordPayment(client, input, order, 'APPROVED');
      await outbox.enqueue(client, {
        eventType: 'ORDER_PAID',
        payload: { orderId: order.id, paymentId: input.paymentId, userId: order.user_id },
        traceId
      });
      return { status: 'processed', orderStatus: 'PAID' };
    }

    await releaseReservation(client, order.id);
    await client.query(
      `UPDATE orders.orders SET status = 'PAYMENT_FAILED', updated_at = NOW() WHERE id = $1`,
      [order.id]
    );
    await recordPayment(client, input, order, 'REJECTED');
    await outbox.enqueue(client, {
      eventType: 'ORDER_PAYMENT_FAILED',
      payload: { orderId: order.id, paymentId: input.paymentId, userId: order.user_id },
      traceId
    });
    return { status: 'processed', orderStatus: 'PAYMENT_FAILED' };
  });
}

module.exports = { handleWebhook };
