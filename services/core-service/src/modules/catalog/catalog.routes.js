const router = require('express').Router();
const asyncHandler = require('../../shared/asyncHandler');
const controller = require('./catalog.controller');

router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getById));

module.exports = router;
