const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../src/models/User');
const controller = require('../src/controllers/authController');
const id = '507f1f77bcf86cd799439011';
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test('administracion no expone errores internos en sus cuatro operaciones', async () => {
  const originals = { find: User.find, findOne: User.findOne, findOneAndDelete: User.findOneAndDelete };
  const fail = () => { throw new Error('private-connection-detail'); };
  User.find = User.findOne = User.findOneAndDelete = fail;
  try {
    for (const action of ['getUsers', 'createUser', 'updateUser', 'deleteUser']) {
      const res = response();
      await controller[action]({ params: { id }, body: { email: 'test@example.test', password: 'test-password' } }, res);
      assert.equal(res.statusCode, 500);
      assert.deepEqual(res.body, { error: 'Ocurri\u00f3 un error interno.' });
    }
  } finally { Object.assign(User, originals); }
});

test('editar CUIT requiere nueva aprobacion solo cuando cambia; eliminarlo crea minorista', async () => {
  const original = User.findOne;
  try {
    for (const [cuit, expected] of [['20222222223', 'PENDIENTE'], ['20111111112', 'APROBADO'], [null, 'NO_APLICA']]) {
      const user = { _id: id, cuit: '20111111112', estado_mayorista: 'APROBADO',
        save: async () => {}, toObject() { return { cuit: this.cuit, estado_mayorista: this.estado_mayorista }; } };
      User.findOne = async () => user;
      const res = response();
      await controller.updateUser({ params: { id }, body: { cuit } }, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.user.estado_mayorista, expected);
    }
  } finally { User.findOne = original; }
});

test('administracion rechaza tipos e identificadores invalidos antes de consultar la base', async () => {
  const original = User.findOne;
  User.findOne = () => { throw new Error('Database must not be queried'); };
  try {
    for (const [action, params, body] of [
      ['createUser', {}, { email: {}, password: 'valid' }],
      ['createUser', {}, { email: 'a@example.test', password: 'valid', cuit: 123 }],
      ['updateUser', { id }, { email: [] }],
      ['updateUser', { id }, { cuit: {} }],
      ['updateUser', { id: 'invalid' }, {}],
      ['deleteUser', { id: 'invalid' }, {}]
    ]) {
      const res = response(); await controller[action]({ params, body }, res);
      assert.equal(res.statusCode, 400);
    }
  } finally { User.findOne = original; }
});

test('creacion administrativa conserva cliente, hashea password y no lo devuelve', async () => {
  const originalFind = User.findOne, originalSave = User.prototype.save;
  let saved;
  User.findOne = async () => null;
  User.prototype.save = async function () { saved = this; return this; };
  try {
    const res = response();
    await controller.createUser({ body: { email: ' Test@Example.test ', password: 'test-password', cuit: '20111111112', rol: 'admin' } }, res);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.user.rol, 'cliente');
    assert.equal(res.body.user.email, 'test@example.test');
    assert.equal(res.body.user.estado_mayorista, 'PENDIENTE');
    assert.equal(res.body.user.password, undefined);
    assert.equal(await require('bcryptjs').compare('test-password', saved.password), true);
  } finally { User.findOne = originalFind; User.prototype.save = originalSave; }
});

test('listado y eliminacion se limitan a clientes; respuesta de listado no incluye passwords', async () => {
  const oldFind = User.find, oldDelete = User.findOneAndDelete;
  User.find = query => { assert.deepEqual(query, { rol: 'cliente' }); return {
    select(fields) { assert.equal(fields, '-password'); return this; }, sort() { return this; },
    lean: async () => [{ _id: id, email: 'test@example.test' }]
  }; };
  User.findOneAndDelete = async query => { assert.deepEqual(query, { _id: id, rol: 'cliente' }); return null; };
  try {
    const list = response(); await controller.getUsers({}, list);
    assert.equal(list.statusCode, 200); assert.equal(list.body.users[0].id, id);
    assert.equal(list.body.users[0].password, undefined);
    const deleted = response(); await controller.deleteUser({ params: { id } }, deleted);
    assert.equal(deleted.statusCode, 404);
  } finally { User.find = oldFind; User.findOneAndDelete = oldDelete; }
});
