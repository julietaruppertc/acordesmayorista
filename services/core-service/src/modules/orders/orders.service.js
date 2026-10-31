const env = require('../../config/env');
const { withTransaction } = require('../../config/database');
const AppError = require('../../shared/AppError');
const repository = require('./orders.repository');

function mapOrder(row) {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    total: Number(row.total),
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.items
      ? {
          items: row.items.map((item) => ({
            productId: item.product_id,
            productName: item.product_name,
            unitPrice: Number(item.unit_price),
            quantity: Number(item.quantity)
          }))
        }
      : {})
  };
}

async function checkout({ userId, traceId, items }) {
  const consolidated = new Map();
  for (const item of items) {
    if (consolidated.has(item.productId)) {
      throw new AppError(
        400,
        'DUPLICATED_PRODUCT',
        'Cada producto debe aparecer una sola vez en el checkout.'
      );
    }
    consolidated.set(item.productId, item);
  }

  const sortedItems = [...consolidated.values()].sort((a, b) =>
    a.productId.localeCompare(b.productId)
  );

  return withTransaction(async (client) => {
    const orderItems = [];
    let total = 0;

    for (const item of sortedItems) {
      const product = await repository.findProductForCheckout(client, item.productId);
      if (!product || !product.active) {
        throw new AppError(404, 'PRODUCT_NOT_FOUND', `No existe el producto ${item.productId}.`);
      }

      const reservation = await repository.reserveStock(client, item);
      if (!reservation) {
        const available = Number(product.on_hand) - Number(product.reserved);
        if (available < item.quantity) {
          throw new AppError(409, 'INSUFFICIENT_STOCK', `No hay stock suficiente para ${product.name}.`, {
            productId: item.productId,
            available
          });
        }
        throw new AppError(
          409,
          'STOCK_VERSION_CONFLICT',
          `El stock de ${product.name} fue modificado por otra operación.`,
          { productId: item.productId, currentVersion: Number(product.version) }
        );
      }

      const unitPrice = Number(product.price);
      total += unitPrice * item.quantity;
      orderItems.push({
        productId: product.id,
        productName: product.name,
        unitPrice,
        quantity: item.quantity
      });
    }

    const expiresAt = new Date(Date.now() + env.RESERVATION_TTL_MINUTES * 60_000);
    const order = await repository.createOrder(client, { userId, total, expiresAt, traceId });

    for (const item of orderItems) {
      await repository.createOrderItem(client, order.id, item);
    }

    return mapOrder(order);
  });
}

async function list(context) {
  const rows = await repository.listOrders(context);
  return rows.map(mapOrder);
}

async function getById(id, context) {
  const order = await repository.findOrderById(id);
  if (!order) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'El pedido solicitado no existe.');
  }
  if (context.userRole === 'cliente' && order.user_id !== context.userId) {
    throw new AppError(403, 'FORBIDDEN', 'No puede consultar pedidos de otro usuario.');
  }
  return mapOrder(order);
}

module.exports = { checkout, list, getById };
