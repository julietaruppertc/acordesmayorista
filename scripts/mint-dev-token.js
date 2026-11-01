const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Cargar la clave privada local
const privateKeyPath = path.join(__dirname, '../shared/keys/private.pem');

if (!fs.existsSync(privateKeyPath)) {
  console.error('Error: No se encontró shared/keys/private.pem');
  process.exit(1);
}

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

// Roles permitidos según los TPs
const role = process.argv[2] || 'cliente';
const validRoles = ['cliente', 'operador', 'admin'];

if (!validRoles.includes(role)) {
  console.error(`Rol inválido. Usa uno de: ${validRoles.join(', ')}`);
  process.exit(1);
}

// Payload alineado al contrato de identidad (TP2 / TP3)
const payload = {
  sub: 'usr_dev_' + crypto.randomBytes(4).toString('hex'),
  email: `${role}@acordes.com`,
  rol: role,
  iss: 'acordes-auth-service',
  cuit: role === 'cliente' ? '20381234564' : null,
  estado_mayorista: role === 'cliente' ? 'APROBADO' : 'NO_APLICA',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // 7 días de validez para dev
};

// Generar JWT usando crypto nativo de Node (sin dependencias externas)
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

const header = { alg: 'RS256', typ: 'JWT' };
const encodedHeader = base64UrlEncode(JSON.stringify(header));
const encodedPayload = base64UrlEncode(JSON.stringify(payload));
const dataToSign = `${encodedHeader}.${encodedPayload}`;

const sign = crypto.createSign('RSA-SHA256');
sign.update(dataToSign);
const signature = sign.sign(privateKey, 'base64')
  .replace(/=/g, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_');

const token = `${dataToSign}.${signature}`;

console.log(`\n=== JWT Dev Token [ROL: ${role.toUpperCase()}] ===\n`);
console.log(token);
console.log('\n=======================================================\n');
