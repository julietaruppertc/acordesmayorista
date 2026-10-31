const router = require('express').Router();
const asyncHandler = require('../../shared/asyncHandler');
const controller = require('./payments.controller');

router.post('/webhook', asyncHandler(controller.webhook));

module.exports = router;
