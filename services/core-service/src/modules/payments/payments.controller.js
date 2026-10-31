const { z } = require('zod');
const service = require('./payments.service');

const webhookSchema = z.object({
  paymentId: z.string().trim().min(1).max(200),
  orderId: z.uuid(),
  status: z.enum(['APPROVED', 'REJECTED']),
  amount: z.number().nonnegative().optional()
});

async function webhook(req, res) {
  const input = webhookSchema.parse(req.body);
  const data = await service.handleWebhook(input, req.context.traceId);
  res.status(200).json({ data, traceId: req.context.traceId });
}

module.exports = { webhook };
