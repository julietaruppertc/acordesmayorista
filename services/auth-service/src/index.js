require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 4001;

// Middlewares
app.use(cors());
app.use(express.json());

// Trazabilidad y logging simple
app.use((req, res, next) => {
  const traceId = req.headers['x-trace-id'] || 'no-trace';
  console.log(`[AUTH] [${new Date().toISOString()}] [${traceId}] ${req.method} ${req.url}`);
  next();
});

// Endpoint de salud para Docker / Cloud
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'auth-service',
    dbState: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED'
  });
});

// Rutas de autenticación
app.use('/auth', authRoutes);

// Conexión a MongoDB Atlas
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error('ERROR: MONGO_URI no está definida en el archivo .env');
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => {
    console.log(' Conectado exitosamente a MongoDB');
    app.listen(PORT, () => {
      console.log(` Servicio de Autenticación corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error(' Error al conectar con MongoDB:', err.message);
  });