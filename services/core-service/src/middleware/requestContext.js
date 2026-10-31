const crypto = require('crypto');

function requestContext(req, res, next) {
  const traceId = req.header('x-trace-id') || crypto.randomUUID();

  req.context = {
    traceId,
    userId: req.header('x-user-id') || null,
    userRole: req.header('x-user-role') || null
  };

  res.setHeader('X-Trace-Id', traceId);
  next();
}

module.exports = requestContext;
