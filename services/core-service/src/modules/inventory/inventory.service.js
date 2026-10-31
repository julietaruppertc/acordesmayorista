const AppError = require('../../shared/AppError');
const repository = require('./inventory.repository');

async function setStock(input) {
  const updated = await repository.updateStock(input);
  if (updated) {
    return {
      productId: updated.product_id,
      onHand: Number(updated.on_hand),
      reserved: Number(updated.reserved),
      availableStock: Number(updated.on_hand) - Number(updated.reserved),
      version: Number(updated.version)
    };
  }

  const current = await repository.findStock(input.productId);
  if (!current) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'El producto solicitado no existe.');
  }
  if (input.onHand < Number(current.reserved)) {
    throw new AppError(
      409,
      'STOCK_BELOW_RESERVED',
      'El stock físico no puede ser menor que las unidades reservadas.',
      { reserved: Number(current.reserved) }
    );
  }
  throw new AppError(409, 'STOCK_VERSION_CONFLICT', 'El stock fue modificado por otra operación.', {
    currentVersion: Number(current.version)
  });
}

module.exports = { setStock };
