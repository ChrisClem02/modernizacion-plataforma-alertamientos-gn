// Rutas placeholder del modulo de jerarquia.
const express = require('express');
const jerarquiaController = require('./jerarquia.controller');
const { asyncHandler } = require('../../middlewares/error.middleware');

const router = express.Router();

router.get('/', asyncHandler(jerarquiaController.getJerarquiaModuleStatus));

module.exports = router;
