const router = require('express').Router();
const asyncHandler = require('../../shared/asyncHandler');
const { requireIdentity, allowRoles } = require('../../middleware/requireIdentity');
const controller = require('./orders.controller');

router.use(requireIdentity);
router.post('/checkout', allowRoles('cliente'), asyncHandler(controller.checkout));
router.get('/', allowRoles('cliente', 'operador', 'admin'), asyncHandler(controller.list));
router.get('/:id', allowRoles('cliente', 'operador', 'admin'), asyncHandler(controller.getById));

module.exports = router;
