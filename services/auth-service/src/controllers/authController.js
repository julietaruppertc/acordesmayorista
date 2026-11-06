const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const privateKeyPath = path.join(__dirname, '../../../../shared/keys/private.pem');
const publicKeyPath = path.join(__dirname, '../../../../shared/keys/public.pem');
let privateKey = '';
let publicKey = '';
try {
  privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  publicKey = fs.readFileSync(publicKeyPath, 'utf8');
} catch (error) {
  console.error('Error al cargar las claves PEM:', error.message);
}

function publicError(res, status, error, message) {
  return res.status(status).json({ error, message });
}

exports.register = async (req, res, next) => {
  try {
    const { email, password, cuit } = req.body;
    if (!email || !password) return publicError(res, 400, 'BAD_REQUEST', 'Email y contraseña requeridos.');
    const normalizedEmail = email.toLowerCase().trim();
    if (await User.findOne({ email: normalizedEmail })) return publicError(res, 409, 'CONFLICT', 'El email ya está registrado.');
    const user = new User({
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      cuit: cuit || null,
      // El alta pública jamás acepta rol desde el body.
      rol: 'cliente',
      estado_mayorista: cuit ? 'PENDIENTE' : 'NO_APLICA'
    });
    await user.save();
    return res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: { id: user._id, email: user.email, rol: user.rol, estado_mayorista: user.estado_mayorista }
    });
  } catch (error) {
    return next(error);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(password || '', user.password))) {
      return publicError(res, 401, 'INVALID_CREDENTIALS', 'Credenciales inválidas.');
    }
    const token = jwt.sign({
      sub: user._id.toString(), email: user.email, rol: user.rol,
      cuit: user.cuit, estado_mayorista: user.estado_mayorista
    }, privateKey, { algorithm: 'RS256', expiresIn: process.env.JWT_EXPIRES_IN || '1h', issuer: 'acordes-auth-service' });
    return res.json({
      message: 'Autenticación exitosa', token,
      user: { id: user._id, email: user.email, rol: user.rol, estado_mayorista: user.estado_mayorista }
    });
  } catch (_error) {
    return publicError(res, 500, 'INTERNAL_ERROR', 'Ocurrió un error interno.');
  }
};

exports.approveWholesale = async (req, res) => {
  try {
    const { estado } = req.body;
    if (!['APROBADO', 'RECHAZADO'].includes(estado)) return publicError(res, 400, 'INVALID_WHOLESALE_STATUS', 'Estado mayorista inválido.');
    const user = await User.findByIdAndUpdate(req.params.id, { estado_mayorista: estado }, { new: true }).select('-password');
    if (!user) return publicError(res, 404, 'USER_NOT_FOUND', 'Usuario no encontrado.');
    return res.json({ message: `Estado actualizado a ${estado}`, user });
  } catch (_error) {
    return publicError(res, 500, 'INTERNAL_ERROR', 'Ocurrió un error interno.');
  }
};

exports.getPublicKey = (_req, res) => res.type('text/plain').send(publicKey);
