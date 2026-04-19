// Rutas placeholder del modulo de reportes.
const express = require('express');
const reportesController = require('./reportes.controller');
const { asyncHandler } = require('../../middlewares/error.middleware');

const router = express.Router();

router.get('/', asyncHandler(reportesController.getReportesModuleStatus));

module.exports = router;
