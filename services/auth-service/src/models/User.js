const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: [true, 'El email es obligatorio'], 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  password: { 
    type: String, 
    required: [true, 'La contraseña es obligatoria'] 
  },
  rol: { 
    type: String, 
    enum: ['cliente', 'operador', 'admin'], 
    default: 'cliente' 
  },
  cuit: { 
    type: String, 
    default: null 
  },
  estado_mayorista: { 
    type: String, 
    enum: ['NO_APLICA', 'PENDIENTE', 'APROBADO', 'RECHAZADO'], 
    default: 'NO_APLICA' 
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('User', userSchema);