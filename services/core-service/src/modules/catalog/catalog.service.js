const AppError = require('../../shared/AppError');
const repository = require('./catalog.repository');

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
    category: row.category,
    price: Number(row.price),
    availableStock: Number(row.available_stock),
    version: Number(row.version)
  };
}

async function listProducts(query) {
  const result = await repository.listProducts(query);
  return {
    data: result.rows.map(mapProduct),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / query.pageSize)
    }
  };
}

async function getProduct(id) {
  const product = await repository.findProductById(id);
  if (!product) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'El producto solicitado no existe.');
  }
  return mapProduct(product);
}

module.exports = { listProducts, getProduct };
