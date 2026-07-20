const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Mounted behind requireAuth + requireAdmin in server.js, so every handler
// here is already guaranteed to be an authenticated admin.
router.get('/', userController.listUsers);
router.put('/:id', userController.updateUser);

module.exports = router;
