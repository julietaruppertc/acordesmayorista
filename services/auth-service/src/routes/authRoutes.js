
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const requireAdmin = require('../middleware/requireAdmin');

// Rutas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/public-key', authController.getPublicKey);

// Rutas administrativas: solamente administradores
router.get('/users', requireAdmin, authController.getUsers);
router.post('/users', requireAdmin, authController.createUser);
router.patch('/users/:id', requireAdmin, authController.updateUser);
router.delete('/users/:id', requireAdmin, authController.deleteUser);

// Aprobar o rechazar solicitudes mayoristas
router.patch(
  '/users/:id/approve-wholesale',
  requireAdmin,
  authController.approveWholesale
);

module.exports = router;

