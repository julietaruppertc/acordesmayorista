const { ZodError } = require('zod');
const AppError = require('../shared/AppError');

function notFound(req, _res, next) {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `No existe la ruta ${req.method} ${req.path}.`));
}

function errorHandler(error, req, res, _next) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Los datos enviados no son válidos.',
      details: error.issues,
      traceId: req.context?.traceId
    });
  }

  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_ERROR';

  if (statusCode >= 500) {
    console.error(`[${req.context?.traceId || 'no-trace'}]`, error);
  }

  return res.status(statusCode).json({
    error: code,
    message: statusCode >= 500 ? 'Ocurrió un error interno.' : error.message,
    ...(error.details ? { details: error.details } : {}),
    traceId: req.context?.traceId
  });
}

module.exports = { notFound, errorHandler };
