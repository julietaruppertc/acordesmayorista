const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../src/models/User');
const { validateCuitModulo11 } = require('../src/utils/cuitValidator');
const cuitAiAuditor = require('../src/services/cuitAiAuditor');
const authController = require('../src/controllers/authController');

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

test('validateCuitModulo11 valida prefijos, longitud y dígito verificador real', () => {
  const valid = validateCuitModulo11('20-38123456-9', { strictChecksum: true });
  assert.equal(valid.valid, true);
  assert.equal(valid.normalized, '20-38123456-9');

  const badCheck = validateCuitModulo11('20-38123456-4', { strictChecksum: true });
  assert.equal(badCheck.valid, false);

  const badPrefix = validateCuitModulo11('99-38123456-9', { strictChecksum: true });
  assert.equal(badPrefix.valid, false);
});

test('register rechaza con 400 un CUIT con formato o prefijo inválido antes de tocar MongoDB', async () => {
  const originalFindOne = User.findOne;
  User.findOne = () => {
    throw new Error('No debe consultar la DB si el CUIT es inválido');
  };

  try {
    const res = response();
    await authController.register({
      body: {
        email: 'invalido@example.com',
        password: 'Password123!',
        cuit: '99-123'
      }
    }, res);

    assert.equal(res.statusCode, 400);
  } finally {
    User.findOne = originalFindOne;
  }
});

test('register guarda auditoria_ia cuando se adjunta constancia pero mantiene estado PENDIENTE (Human-in-the-Loop)', async () => {
  const originalFindOne = User.findOne;
  const originalSave = User.prototype.save;
  const originalAudit = cuitAiAuditor.auditCuitDocument;

  User.findOne = async () => null;
  User.prototype.save = async function () {
    return this;
  };

  cuitAiAuditor.auditCuitDocument = async () => ({
    procesado: true,
    cuit_coincide_documento: true,
    razon_social_detectada: 'CASA DE MUSICA MENDOZA S.R.L.',
    condicion_iva_detectada: 'RESPONSABLE_INSCRIPTO',
    actividad_afin: true,
    score_confianza: 96,
    sugerencia: 'APROBAR',
    justificacion: 'CUIT coincidente y actividad registrada en venta de instrumentos musicales.',
    fecha_analisis: new Date('2026-11-20T00:00:00Z')
  });

  try {
    const res = response();
    await authController.register({
      body: {
        email: 'tienda@musica.com',
        password: 'Password123!',
        cuit: '20-38123456-9',
        constanciaBase64: 'JVBERi0xLjQfakeBase64Payload==',
        constanciaMimeType: 'application/pdf'
      }
    }, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.user.estado_mayorista, 'PENDIENTE');
    assert.equal(res.body.user.auditoria_ia.procesado, true);
    assert.equal(res.body.user.auditoria_ia.sugerencia, 'APROBAR');
    assert.equal(res.body.user.auditoria_ia.score_confianza, 96);
  } finally {
    User.findOne = originalFindOne;
    User.prototype.save = originalSave;
    cuitAiAuditor.auditCuitDocument = originalAudit;
  }
});