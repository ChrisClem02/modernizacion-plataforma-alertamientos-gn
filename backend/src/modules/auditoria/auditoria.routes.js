// Rutas placeholder del modulo de auditoria.
const express = require('express');
const auditoriaController = require('./auditoria.controller');
const { asyncHandler } = require('../../middlewares/error.middleware');

const router = express.Router();

router.get('/', asyncHandler(auditoriaController.getAuditoriaModuleStatus));

module.exports = router;
