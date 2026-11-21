const mongoose = require('mongoose');

const auditoriaIaSchema = new mongoose.Schema({
  procesado: {
    type: Boolean,
    default: false
  },
  cuit_coincide_documento: {
    type: Boolean,
    default: null
  },
  razon_social_detectada: {
    type: String,
    default: null
  },
  condicion_iva_detectada: {
    type: String,
    default: null
  },
  actividad_afin: {
    type: Boolean,
    default: null
  },
  score_confianza: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  sugerencia: {
    type: String,
    enum: ['APROBAR', 'REVISION_MANUAL', 'RECHAZAR', null],
    default: null
  },
  justificacion: {
    type: String,
    default: null
  },
  fecha_analisis: {
    type: Date,
    default: null
  }
}, { _id: false });

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
  },
  auditoria_ia: {
    type: auditoriaIaSchema,
    default: () => ({ procesado: false })
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);