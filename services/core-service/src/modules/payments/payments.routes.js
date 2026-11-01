const router = require('express').Router();
const asyncHandler = require('../../shared/asyncHandler');
const controller = require('./payments.controller');
const { verifyWebhookSignature } = require('./webhookSignature');

router.post('/webhook', verifyWebhookSignature, asyncHandler(controller.webhook));

module.exports = router;
