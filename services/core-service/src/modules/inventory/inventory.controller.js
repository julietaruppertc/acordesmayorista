const { z } = require('zod');
const service = require('./inventory.service');

const paramsSchema = z.object({ productId: z.uuid() });
const bodySchema = z.object({
  onHand: z.number().int().nonnegative(),
  expectedVersion: z.number().int().positive()
});

async function update(req, res) {
  const { productId } = paramsSchema.parse(req.params);
  const body = bodySchema.parse(req.body);
  const data = await service.setStock({ productId, ...body });
  res.status(200).json({ data, traceId: req.context.traceId });
}

module.exports = { update };
