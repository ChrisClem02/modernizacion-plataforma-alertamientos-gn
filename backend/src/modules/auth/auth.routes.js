const express = require('express');
const authController = require('./auth.controller');
const { requireAuthenticatedUser } = require('../../middlewares/auth.middleware');
const { asyncHandler } = require('../../middlewares/error.middleware');

const router = express.Router();

// Login institucional con nombre de usuario y contrasena.
router.post('/login', asyncHandler(authController.login));

// Devuelve el contexto actual del usuario autenticado segun la BD.
router.get('/me', requireAuthenticatedUser, asyncHandler(authController.getAuthenticatedUserProfile));

module.exports = router;
