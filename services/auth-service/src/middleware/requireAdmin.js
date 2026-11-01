const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const publicKey = fs.readFileSync(
  path.resolve(__dirname, '../../../../shared/keys/public.pem'),
  'utf8'
);

function createRequireAdmin(verificationKey) {
  return (req, res, next) => {
    const authorization = req.headers.authorization;
    if (typeof authorization !== 'string' || !/^Bearer \S+$/.test(authorization)) {
      return res.status(401).json({ error: 'TOKEN_REQUIRED' });
    }

    let payload;
    try {
      payload = jwt.verify(authorization.slice(7), verificationKey, {
        algorithms: ['RS256'],
        issuer: 'acordes-auth-service'
      });
    } catch (_error) {
      return res.status(401).json({ error: 'INVALID_TOKEN' });
    }

    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      return res.status(401).json({ error: 'INVALID_TOKEN' });
    }

    if (payload.rol !== 'admin') {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    next();
  };
}

module.exports = createRequireAdmin(publicKey);
module.exports.createRequireAdmin = createRequireAdmin;
