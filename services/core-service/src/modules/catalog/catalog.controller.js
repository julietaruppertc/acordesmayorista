const { z } = require('zod');
const service = require('./catalog.service');

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  category: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).max(100).optional()
});

const idSchema = z.uuid();

async function list(req, res) {
  const query = listQuerySchema.parse(req.query);
  const result = await service.listProducts(query);
  res.status(200).json({ ...result, traceId: req.context.traceId });
}

async function getById(req, res) {
  const id = idSchema.parse(req.params.id);
  const data = await service.getProduct(id);
  res.status(200).json({ data, traceId: req.context.traceId });
}

module.exports = { list, getById };
