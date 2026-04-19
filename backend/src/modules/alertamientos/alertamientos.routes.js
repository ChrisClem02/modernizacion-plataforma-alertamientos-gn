// Rutas placeholder del modulo de alertamientos.
const express = require('express');
const alertamientosController = require('./alertamientos.controller');
const { asyncHandler } = require('../../middlewares/error.middleware');

const router = express.Router();

router.get('/', asyncHandler(alertamientosController.getAlertamientosModuleStatus));

module.exports = router;
