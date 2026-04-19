const express = require('express');
const authController = require('./auth.controller');
const { asyncHandler } = require('../../middlewares/error.middleware');

const router = express.Router();

// Ruta base del modulo. Por ahora solo confirma que el modulo existe.
router.get('/', asyncHandler(authController.getAuthModuleStatus));

module.exports = router;
