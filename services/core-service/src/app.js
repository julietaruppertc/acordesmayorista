const express = require('express');
const helmet = require('helmet');
const { pool } = require('./config/database');
const requestContext = require('./middleware/requestContext');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const catalogRoutes = require('./modules/catalog/catalog.routes');
const inventoryRoutes = require('./modules/inventory/inventory.routes');
const orderRoutes = require('./modules/orders/orders.routes');
const paymentRoutes = require('./modules/payments/payments.routes');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(
  express.json({
    limit: '256kb',
    verify: (req, _res, buffer) => {
      req.rawBody = Buffer.from(buffer);
    }
  })
);
app.use(requestContext);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'core-service',
    uptimeSeconds: Math.floor(process.uptime()),
    traceId: req.context.traceId
  });
});

app.get('/ready', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ready', service: 'core-service', traceId: req.context.traceId });
  } catch (error) {
    next(error);
  }
});

app.use('/api/products', catalogRoutes);
app.use('/api/operator', inventoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
