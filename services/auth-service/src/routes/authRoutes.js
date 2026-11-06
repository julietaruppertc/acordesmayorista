const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const requireAdmin = require('../middleware/requireAdmin');

// Rutas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/public-key', authController.getPublicKey);

// Ruta protegida con Defensa en Profundidad
router.patch('/users/:id/approve-wholesale', requireAdmin, authController.approveWholesale);

module.exports = router;