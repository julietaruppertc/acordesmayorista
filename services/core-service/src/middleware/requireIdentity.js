const AppError = require('../shared/AppError');

function requireIdentity(req, _res, next) {
  if (!req.context?.userId || !req.context?.userRole) {
    return next(
      new AppError(401, 'IDENTITY_REQUIRED', 'La solicitud no contiene una identidad válida.')
    );
  }
  next();
}

function allowRoles(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.context?.userRole)) {
      return next(
        new AppError(403, 'FORBIDDEN', 'El usuario no tiene permisos para esta operación.')
      );
    }
    next();
  };
}

module.exports = { requireIdentity, allowRoles };
