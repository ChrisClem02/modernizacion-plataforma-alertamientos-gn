// Rutas placeholder del modulo de usuarios.
const express = require('express');
const usuariosController = require('./usuarios.controller');
const { asyncHandler } = require('../../middlewares/error.middleware');

const router = express.Router();

router.get('/', asyncHandler(usuariosController.getUsuariosModuleStatus));

module.exports = router;
