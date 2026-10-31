async function findProductForCheckout(client, productId) {
  const result = await client.query(
    `SELECT p.id, p.name, p.price, p.active,
            s.on_hand, s.reserved, s.version
       FROM catalog.products p
       JOIN inventory.stock s ON s.product_id = p.id
      WHERE p.id = $1`,
    [productId]
  );
  return result.rows[0] || null;
}

async function reserveStock(client, { productId, quantity, expectedVersion }) {
  const result = await client.query(
    `UPDATE inventory.stock
        SET reserved = reserved + $1,
            version = version + 1,
            updated_at = NOW()
      WHERE product_id = $2
        AND version = $3
        AND (on_hand - reserved) >= $1
      RETURNING version, on_hand, reserved, (on_hand - reserved)::int AS available`,
    [quantity, productId, expectedVersion]
  );
  return result.rows[0] || null;
}

async function createOrder(client, { userId, total, expiresAt, traceId }) {
  const result = await client.query(
    `INSERT INTO orders.orders (user_id, status, total, expires_at, trace_id)
     VALUES ($1, 'PENDING_PAYMENT', $2, $3, $4)
     RETURNING id, user_id, status, total, expires_at, created_at`,
    [userId, total, expiresAt, traceId]
  );
  return result.rows[0];
}

async function createOrderItem(client, orderId, item) {
  await client.query(
    `INSERT INTO orders.order_items
       (order_id, product_id, product_name, unit_price, quantity)
     VALUES ($1, $2, $3, $4, $5)`,
    [orderId, item.productId, item.productName, item.unitPrice, item.quantity]
  );
}

async function listOrders({ userId, userRole }) {
  const values = [];
  const filter = userRole === 'cliente' ? 'WHERE o.user_id = $1' : '';
  if (userRole === 'cliente') values.push(userId);

  const { pool } = require('../../config/database');
  const result = await pool.query(
    `SELECT o.id, o.user_id, o.status, o.total, o.expires_at, o.created_at, o.updated_at
       FROM orders.orders o
       ${filter}
      ORDER BY o.created_at DESC`,
    values
  );
  return result.rows;
}

async function findOrderById(id) {
  const { pool } = require('../../config/database');
  const orderResult = await pool.query(
    `SELECT id, user_id, status, total, expires_at, created_at, updated_at
       FROM orders.orders WHERE id = $1`,
    [id]
  );
  if (!orderResult.rows[0]) return null;

  const itemResult = await pool.query(
    `SELECT product_id, product_name, unit_price, quantity
       FROM orders.order_items WHERE order_id = $1 ORDER BY id`,
    [id]
  );
  return { ...orderResult.rows[0], items: itemResult.rows };
}

module.exports = {
  findProductForCheckout,
  reserveStock,
  createOrder,
  createOrderItem,
  listOrders,
  findOrderById
};
