const { pool } = require('../../config/database');

async function listProducts({ page, pageSize, category, search }) {
  const filters = ['p.active = TRUE'];
  const values = [];

  if (category) {
    values.push(category);
    filters.push(`LOWER(c.name) = LOWER($${values.length})`);
  }

  if (search) {
    values.push(`%${search}%`);
    filters.push(
      `(p.name ILIKE $${values.length} OR COALESCE(p.description, '') ILIKE $${values.length})`
    );
  }

  const where = `WHERE ${filters.join(' AND ')}`;
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
       FROM catalog.products p
       JOIN catalog.categories c ON c.id = p.category_id
       ${where}`,
    values
  );

  values.push(pageSize);
  const limitIndex = values.length;
  values.push((page - 1) * pageSize);
  const offsetIndex = values.length;

  const result = await pool.query(
    `SELECT p.id,
            p.name,
            p.description,
            p.image_url,
            c.name AS category,
            p.price,
            GREATEST(s.on_hand - s.reserved, 0)::int AS available_stock,
            s.version
       FROM catalog.products p
       JOIN catalog.categories c ON c.id = p.category_id
       JOIN inventory.stock s ON s.product_id = p.id
       ${where}
      ORDER BY p.name ASC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    values
  );

  return { rows: result.rows, total: countResult.rows[0].total };
}

async function findProductById(id) {
  const result = await pool.query(
    `SELECT p.id,
            p.name,
            p.description,
            p.image_url,
            c.name AS category,
            p.price,
            GREATEST(s.on_hand - s.reserved, 0)::int AS available_stock,
            s.version
       FROM catalog.products p
       JOIN catalog.categories c ON c.id = p.category_id
       JOIN inventory.stock s ON s.product_id = p.id
      WHERE p.id = $1 AND p.active = TRUE`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = { listProducts, findProductById };
