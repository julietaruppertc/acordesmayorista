const test = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPairSync } = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const authController = require('../src/controllers/authController');
const { createRequireAdmin } = require('../src/middleware/requireAdmin');

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

test('el registro público siempre crea clientes y conserva el estado mayorista', async () => {
  const originalFindOne = User.findOne;
  const originalSave = User.prototype.save;
  const savedUsers = [];
  User.findOne = async () => null;
  User.prototype.save = async function () {
    savedUsers.push(this);
    return this;
  };

  try {
    for (const [requestedRole, cuit, expectedStatus] of [
      ['admin', null, 'NO_APLICA'],
      ['operador', '20381234564', 'PENDIENTE']
    ]) {
      const res = response();
      await authController.register({
        body: {
          email: `${requestedRole}@example.com`,
          password: 'Password123!',
          cuit,
          rol: requestedRole
        }
      }, res);

      assert.equal(res.statusCode, 201);
      assert.equal(res.body.user.rol, 'cliente');
      assert.equal(res.body.user.estado_mayorista, expectedStatus);
    }

    assert.equal(savedUsers.length, 2);
    assert.ok(savedUsers.every((user) => user.rol === 'cliente'));
    assert.equal(await bcrypt.compare('Password123!', savedUsers[0].password), true);
  } finally {
    User.findOne = originalFindOne;
    User.prototype.save = originalSave;
  }
});

test('el registro conserva el rechazo de correos duplicados', async () => {
  const originalFindOne = User.findOne;
  User.findOne = async () => ({ _id: 'existing-user' });
  try {
    const res = response();
    await authController.register({ body: { email: 'existing@example.com', password: 'Password123!' } }, res);
    assert.equal(res.statusCode, 409);
  } finally {
    User.findOne = originalFindOne;
  }
});

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const requireAdmin = createRequireAdmin(publicKey);

function token(role, options = {}) {
  return jwt.sign({ sub: '507f1f77bcf86cd799439011', rol: role }, privateKey, {
    algorithm: 'RS256',
    issuer: 'acordes-auth-service',
    expiresIn: '1h',
    ...options
  });
}

function authorize(headers) {
  const res = response();
  let passed = false;
  requireAdmin({ headers }, res, () => { passed = true; });
  return { res, passed };
}

test('Auth rechaza una cabecera de rol falsificada sin token', () => {
  const { res, passed } = authorize({ 'x-user-role': 'admin' });
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, 'TOKEN_REQUIRED');
  assert.equal(passed, false);
});

test('Auth rechaza un cliente aunque se envíe una cabecera de administrador', () => {
  const { res, passed } = authorize({
    authorization: `Bearer ${token('cliente')}`,
    'x-user-role': 'admin'
  });
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, 'FORBIDDEN');
  assert.equal(passed, false);
});

test('Auth permite un token válido de administrador', () => {
  const { passed } = authorize({ authorization: `Bearer ${token('admin')}` });
  assert.equal(passed, true);
});

test('Auth rechaza tokens con emisor incorrecto o vencidos', () => {
  for (const signedToken of [
    token('admin', { issuer: 'otro-emisor' }),
    token('admin', { expiresIn: -1 })
  ]) {
    const { res, passed } = authorize({ authorization: `Bearer ${signedToken}` });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.error, 'INVALID_TOKEN');
    assert.equal(passed, false);
  }
});
