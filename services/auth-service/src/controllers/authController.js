
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
        cuit: user.cuit,
        estado_mayorista: user.estado_mayorista
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
        cuit: user.cuit,
        estado_mayorista: user.estado_mayorista
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
      id: user._id.toString(),
    }));

    return res.status(200).json({
      users: formattedUsers,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// 6. Crear usuario desde el panel administrativo
exports.createUser = async (req, res) => {
  try {
    const { email, password, cuit } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'El email y la contraseña son obligatorios',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'El email ya se encuentra registrado',
      });
    }

    const normalizedCuit = cuit?.trim() || null;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email: normalizedEmail,
      password: hashedPassword,
      rol: 'cliente',
      cuit: normalizedCuit,
      estado_mayorista: normalizedCuit ? 'PENDIENTE' : 'NO_APLICA',
    });

    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;

    return res.status(201).json({
      message: 'Usuario creado correctamente',
      user: {
        ...safeUser,
        id: user._id.toString(),
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'El email ya se encuentra registrado',
      });
    }

    return res.status(500).json({ error: error.message });
  }
};

// 7. Modificar usuario desde el panel administrativo
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, cuit } = req.body;

    const user = await User.findOne({
      _id: id,
      rol: 'cliente',
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
      });
    }

    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) {
        return res.status(400).json({
          error: 'El email no puede estar vacío',
        });
      }

      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: id },
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'El email ya se encuentra registrado',
        });
      }

      user.email = normalizedEmail;
    }

    if (cuit !== undefined) {
      const normalizedCuit = cuit?.trim() || null;

      if (!normalizedCuit) {
        user.cuit = null;
        user.estado_mayorista = 'NO_APLICA';
      } else {
        if (!user.cuit) {
          user.estado_mayorista = 'PENDIENTE';
        }

        user.cuit = normalizedCuit;
      }
    }

    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;

    return res.status(200).json({
      message: 'Usuario actualizado correctamente',
      user: {
        ...safeUser,
        id: user._id.toString(),
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'El email ya se encuentra registrado',
      });
    }

    return res.status(500).json({ error: error.message });
  }
};

// 8. Eliminar usuario desde el panel administrativo
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOneAndDelete({
      _id: id,
      rol: 'cliente',
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
      });
    }

    return res.status(200).json({
      message: 'Usuario eliminado correctamente',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
