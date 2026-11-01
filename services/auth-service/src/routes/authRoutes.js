const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const requireAdmin = require('../middleware/requireAdmin');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.patch('/users/:id/approve-wholesale', requireAdmin, authController.approveWholesale);
router.get('/public-key', authController.getPublicKey);

module.exports = router;
