const router = require('express').Router();
const asyncHandler = require('../../shared/asyncHandler');
const { requireIdentity, allowRoles } = require('../../middleware/requireIdentity');
const controller = require('./inventory.controller');

router.patch(
  '/products/:productId/stock',
  requireIdentity,
  allowRoles('operador', 'admin'),
  asyncHandler(controller.update)
);

module.exports = router;
