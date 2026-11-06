const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

// Clave pública compartida para verificar la firma asimétrica RS256
const publicKeyPath = path.resolve(__dirname, '../../../../shared/keys/public.pem');
const publicKey = fs.readFileSync(publicKeyPath, 'utf8');

function createMiddleware(verificationKey) {
  return function requireAdmin(req, res, next) {
  const authorization = req.headers.authorization;

  // 1. Si no hay header de autorización, rechaza de inmediato
  if (typeof authorization !== 'string' || !/^Bearer \S+$/.test(authorization)) {
    return res.status(401).json({
      error: 'TOKEN_REQUIRED',
      message: 'Se requiere un token Bearer en el encabezado Authorization.'
    });
  }

  // 2. Valida criptográficamente el token con la clave pública RSA
  let payload;
  try {
    const token = authorization.slice(7);
    payload = jwt.verify(token, verificationKey, {
      algorithms: ['RS256'],
      issuer: 'acordes-auth-service'
    });
  } catch (_error) {
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'El token proporcionado es inválido o ha expirado.'
    });
  }

  // 3. Comprueba el claim de usuario y el rol de administrador
  if (!payload.sub || typeof payload.sub !== 'string') {
    return res.status(401).json({ error: 'INVALID_TOKEN' });
  }

  if (payload.rol !== 'admin') {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Acceso denegado: se requieren privilegios de administrador.'
    });
  }

  // Pasa el payload al request para que el controlador tenga los datos del admin
  req.user = payload;
  next();
  };
}

const requireAdmin = createMiddleware(publicKey);

// Compatibilidad con la prueba unitaria que inyecta una clave efímera; la ruta
// de producción exporta y utiliza únicamente el middleware anterior.
Object.defineProperty(requireAdmin, 'createRequireAdmin', {
  value: createMiddleware,
  enumerable: false
});
module.exports = requireAdmin;
