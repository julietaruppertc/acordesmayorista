const { z } = require('zod');
const service = require('./orders.service');

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.uuid(),
        quantity: z.number().int().positive().max(1000),
        expectedVersion: z.number().int().positive()
      })
    )
    .min(1)
    .max(100)
});

const idSchema = z.uuid();

async function checkout(req, res) {
  const body = checkoutSchema.parse(req.body);
  const data = await service.checkout({
    userId: req.context.userId,
    traceId: req.context.traceId,
    items: body.items
  });
  res.status(201).json({ data, traceId: req.context.traceId });
}

async function list(req, res) {
  const data = await service.list(req.context);
  res.status(200).json({ data, traceId: req.context.traceId });
}

async function getById(req, res) {
  const id = idSchema.parse(req.params.id);
  const data = await service.getById(id, req.context);
  res.status(200).json({ data, traceId: req.context.traceId });
}

async function resolve(req, res) {
  const id = idSchema.parse(req.params.id);
  const { decision } = z.object({ decision: z.enum(['APPROVED', 'REJECTED']) }).parse(req.body);
  const simulator = require('../payments/paymentSimulator');
  const data = await simulator.resolveOrder(id, decision, req.context);
  res.status(200).json({ data, traceId: req.context.traceId });
}

module.exports = { checkout, list, getById, resolve };
