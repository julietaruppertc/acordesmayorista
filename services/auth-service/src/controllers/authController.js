const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Cargar claves RSA
const privateKeyPath = path.join(__dirname, '../../../../shared/keys/private.pem');
const publicKeyPath = path.join(__dirname, '../../../../shared/keys/public.pem');

let privateKey = '';
let publicKey = '';

try {
  privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  publicKey = fs.readFileSync(publicKeyPath, 'utf8');
} catch (error) {
  console.error('Error al cargar las claves pem:', error.message);
}

// 1. Registro de usuarios (RF-10 / US-01)
exports.register = async (req, res) => {
  try {
    const { email, password, cuit } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'El email ya se encuentra registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Si envía CUIT, requiere validación de mayorista (RF-01)
    const estadoMayorista = cuit ? 'PENDIENTE' : 'NO_APLICA';

    const user = new User({
      email,
      password: hashedPassword,
      rol: 'cliente',
      cuit: cuit || null,
      estado_mayorista: estadoMayorista
    });

    await user.save();

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: user._id,
        email: user.email,
        rol: user.rol,
        estado_mayorista: user.estado_mayorista
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Ocurri\u00f3 un error interno.' });
  }
};

// 2. Inicio de sesión y emisión de JWT (RF-11 / US-02 / DEC-02)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Payload de identidad desacoplada con claims de rol y tier
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      rol: user.rol,
      cuit: user.cuit,
      estado_mayorista: user.estado_mayorista
    };

    // Firma con clave privada usando RS256
    const token = jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      issuer: 'acordes-auth-service'
    });

    res.json({
      message: 'Autenticación exitosa',
      token,
      user: {
        id: user._id,
        email: user.email,
        rol: user.rol,
        estado_mayorista: user.estado_mayorista
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Ocurri\u00f3 un error interno.' });
  }
};

// 3. Aprobación / Rechazo de cuenta mayorista por Admin (RF-01 / US-03)
exports.approveWholesale = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body; // 'APROBADO' o 'RECHAZADO'

    if (!['APROBADO', 'RECHAZADO'].includes(estado)) {
      return res.status(400).json({ error: 'Estado mayorista inválido' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { estado_mayorista: estado },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: `Estado actualizado a ${estado}`, user });
  } catch (error) {
    res.status(500).json({ error: 'Ocurri\u00f3 un error interno.' });
  }
};

// 4. Clave pública para que el Gateway / Core verifiquen sin compartir secretos
exports.getPublicKey = (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(publicKey);
};
