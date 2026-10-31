const { pool } = require('../../config/database');

async function updateStock({ productId, onHand, expectedVersion }) {
  const result = await pool.query(
    `UPDATE inventory.stock
        SET on_hand = $1,
            version = version + 1,
            updated_at = NOW()
      WHERE product_id = $2
        AND version = $3
        AND $1 >= reserved
      RETURNING product_id, on_hand, reserved, version`,
    [onHand, productId, expectedVersion]
  );
  return result.rows[0] || null;
}

async function findStock(productId) {
  const result = await pool.query(
    `SELECT product_id, on_hand, reserved, version
       FROM inventory.stock
      WHERE product_id = $1`,
    [productId]
  );
  return result.rows[0] || null;
}

module.exports = { updateStock, findStock };
