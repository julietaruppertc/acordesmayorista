
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { validateCuitModulo11 } = require('../utils/cuitValidator');
const cuitAiAuditor = require('../services/cuitAiAuditor');

// Cargar claves RSA
const privateKeyPath = process.env.PRIVATE_KEY_PATH || path.join(__dirname, '../../../../shared/keys/private.pem');
const publicKeyPath = process.env.PUBLIC_KEY_PATH || path.join(__dirname, '../../../../shared/keys/public.pem');

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
    const { email, password, cuit, constanciaBase64, constanciaMimeType } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    let normalizedCuit = null;

    if (cuit !== undefined && cuit !== null && String(cuit).trim() !== '') {
      const validation = validateCuitModulo11(String(cuit).trim());

      if (!validation.valid) {
        return res.status(400).json({ error: validation.reason });
      }

      normalizedCuit = validation.normalized;
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        error: 'El email ya se encuentra registrado'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Si envía CUIT, requiere validación de mayorista.
    const estadoMayorista = normalizedCuit ? 'PENDIENTE' : 'NO_APLICA';

    const hasConstancia = Boolean(
      normalizedCuit && constanciaBase64 && constanciaMimeType
    );

    // La auditoría comienza como pendiente.
    const auditoriaIa = {
      procesado: false,
      justificacion: hasConstancia
        ? 'Análisis documental en curso...'
        : null
    };

    const user = new User({
      email: normalizedEmail,
      password: hashedPassword,
      rol: 'cliente',
      cuit: normalizedCuit,
      estado_mayorista: estadoMayorista,
      auditoria_ia: auditoriaIa
    });

    await user.save();

    // Responder al frontend sin esperar a Gemini.
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: user._id,
        email: user.email,
        rol: user.rol,
        cuit: user.cuit,
        estado_mayorista: user.estado_mayorista,
        auditoria_ia: user.auditoria_ia
      }
    });

    // Ejecutar la auditoría en segundo plano.
    if (hasConstancia) {
      cuitAiAuditor
        .auditCuitDocument({
          declaredCuit: normalizedCuit,
          constanciaBase64,
          constanciaMimeType
        })
        .then(async (resultadoAuditoria) => {
          await User.findByIdAndUpdate(user._id, {
            $set: { auditoria_ia: resultadoAuditoria }
          });
        })
        .catch((err) => {
          console.error(
            '[AUTH][AI-AUDITOR] Error en auditoría asíncrona:',
            err.message
          );
        });
    }
  } catch (error) {
    console.error('[AUTH][REGISTER] Error:', error.message);

    if (!res.headersSent) {
      res.status(500).json({ error: 'Ocurrió un error interno.' });
    }
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

    // Payload de identidad desacoplada con claims de rol y tier.
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      rol: user.rol,
      cuit: user.cuit,
      estado_mayorista: user.estado_mayorista
    };

    // Firma con clave privada usando RS256.
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
        cuit: user.cuit,
        estado_mayorista: user.estado_mayorista
      }
    });
  } catch (error) {
    console.error('[AUTH][LOGIN] Error:', error.message);
    res.status(500).json({ error: 'Ocurrió un error interno.' });
  }
};

// 3. Aprobación / Rechazo de cuenta mayorista por Admin (RF-01 / US-03)
exports.approveWholesale = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

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
    console.error('[AUTH][APPROVE] Error:', error.message);
    res.status(500).json({ error: 'Ocurrió un error interno.' });
  }
};

// 4. Clave pública para que el Gateway / Core verifiquen sin compartir secretos
exports.getPublicKey = (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(publicKey);
};

// 5. Listar usuarios para el panel administrativo
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ rol: 'cliente' })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    const formattedUsers = users.map((user) => ({
      ...user,
      id: user._id.toString()
    }));

    return res.status(200).json({
      users: formattedUsers
    });
  } catch (error) {
    console.error('[AUTH][GET-USERS] Error:', error.message);
    return res.status(500).json({ error: 'Ocurrió un error interno.' });
  }
};

// 6. Crear usuario desde el panel administrativo
exports.createUser = async (req, res) => {
  try {
    const { email, password, cuit } = req.body;

    if (
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string' ||
      !password
    ) {
      return res.status(400).json({
        error: 'El email y la contraseña son obligatorios'
      });
    }

    if (cuit != null && typeof cuit !== 'string') {
      return res.status(400).json({ error: 'CUIT inválido' });
    }

    let normalizedCuit = null;

    if (cuit && cuit.trim()) {
      const validation = validateCuitModulo11(cuit.trim());

      if (!validation.valid) {
        return res.status(400).json({ error: validation.reason });
      }

      normalizedCuit = validation.normalized;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'El email ya se encuentra registrado'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email: normalizedEmail,
      password: hashedPassword,
      rol: 'cliente',
      cuit: normalizedCuit,
      estado_mayorista: normalizedCuit ? 'PENDIENTE' : 'NO_APLICA'
    });

    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;

    return res.status(201).json({
      message: 'Usuario creado correctamente',
      user: {
        ...safeUser,
        id: user._id.toString()
      }
    });
  } catch (error) {
    console.error('[AUTH][CREATE-USER] Error:', error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        error: 'El email ya se encuentra registrado'
      });
    }

    return res.status(500).json({ error: 'Ocurrió un error interno.' });
  }
};

// 7. Modificar usuario desde el panel administrativo
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[a-f0-9]{24}$/i.test(id)) {
      return res.status(400).json({
        error: 'Identificador de usuario inválido'
      });
    }

    const { email, cuit } = req.body;

    if (
      (email !== undefined && typeof email !== 'string') ||
      (cuit != null && typeof cuit !== 'string')
    ) {
      return res.status(400).json({ error: 'Datos de usuario inválidos' });
    }

    const user = await User.findOne({
      _id: id,
      rol: 'cliente'
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) {
        return res.status(400).json({
          error: 'El email no puede estar vacío'
        });
      }

      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: id }
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'El email ya se encuentra registrado'
        });
      }

      user.email = normalizedEmail;
    }

    if (cuit !== undefined) {
      const rawCuit = cuit?.trim() || null;

      if (!rawCuit) {
        user.cuit = null;
        user.estado_mayorista = 'NO_APLICA';
        user.auditoria_ia = { procesado: false };
      } else {
        const validation = validateCuitModulo11(rawCuit);

        if (!validation.valid) {
          return res.status(400).json({ error: validation.reason });
        }

        const prevDigits = (user.cuit || '').replace(/[-\s]/g, '');
        const nextDigits = rawCuit.replace(/[-\s]/g, '');

        if (prevDigits !== nextDigits) {
          user.estado_mayorista = 'PENDIENTE';
          user.auditoria_ia = { procesado: false };
        }

        user.cuit = rawCuit;
      }
    }

    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;

    return res.status(200).json({
      message: 'Usuario actualizado correctamente',
      user: {
        ...safeUser,
        id: user._id.toString()
      }
    });
  } catch (error) {
    console.error('[AUTH][UPDATE-USER] Error:', error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        error: 'El email ya se encuentra registrado'
      });
    }

    return res.status(500).json({ error: 'Ocurrió un error interno.' });
  }
};

// 8. Eliminar usuario desde el panel administrativo
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[a-f0-9]{24}$/i.test(id)) {
      return res.status(400).json({
        error: 'Identificador de usuario inválido'
      });
    }

    const user = await User.findOneAndDelete({
      _id: id,
      rol: 'cliente'
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    return res.status(200).json({
      message: 'Usuario eliminado correctamente'
    });
  } catch (error) {
    console.error('[AUTH][DELETE-USER] Error:', error.message);
    return res.status(500).json({ error: 'Ocurrió un error interno.' });
  }
};

// 9. Re-auditar constancia fiscal con IA desde el panel administrativo
exports.reAuditCuit = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[a-f0-9]{24}$/i.test(id)) {
      return res.status(400).json({
        error: 'Identificador de usuario inválido'
      });
    }

    const { constanciaBase64, constanciaMimeType } = req.body;

    if (!constanciaBase64 || !constanciaMimeType) {
      return res.status(400).json({
        error: 'Debe adjuntar constanciaBase64 y constanciaMimeType'
      });
    }

    const user = await User.findOne({
      _id: id,
      rol: 'cliente'
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (!user.cuit) {
      return res.status(400).json({
        error: 'El usuario no tiene un CUIT asignado para auditar'
      });
    }

    const auditoriaIa = await cuitAiAuditor.auditCuitDocument({
      declaredCuit: user.cuit,
      constanciaBase64,
      constanciaMimeType
    });

    user.auditoria_ia = auditoriaIa;
    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;

    return res.status(200).json({
      message: 'Auditoría de CUIT ejecutada',
      user: {
        ...safeUser,
        id: user._id.toString()
      }
    });
  } catch (error) {
    console.error('[AUTH][RE-AUDIT] Error:', error.message);
    return res.status(500).json({ error: 'Ocurrió un error interno.' });
  }
};
