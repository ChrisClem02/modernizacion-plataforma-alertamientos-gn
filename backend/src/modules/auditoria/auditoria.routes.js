// Rutas placeholder del modulo de auditoria.
const express = require('express');
const auditoriaController = require('./auditoria.controller');
const { requireAuthenticatedUser } = require('../../middlewares/auth.middleware');
const { requireRoles } = require('../../middlewares/role.middleware');
const { asyncHandler } = require('../../middlewares/error.middleware');

const router = express.Router();

// La bitacora es informacion sensible. En el prototipo se consulta solo por
// administradores y siempre en modo lectura, sin exponer JSON de cambios.
router.use(requireAuthenticatedUser);
router.use(requireRoles('ADMINISTRADOR'));

router.get('/', asyncHandler(auditoriaController.getAuditoriaModuleStatus));
router.get('/bitacora', asyncHandler(auditoriaController.listBitacora));
router.get('/bitacora/:id', asyncHandler(auditoriaController.getBitacoraDetail));

module.exports = router;
