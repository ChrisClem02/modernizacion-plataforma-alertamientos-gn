const express = require('express');
const jerarquiaController = require('./jerarquia.controller');
const { requireAuthenticatedUser } = require('../../middlewares/auth.middleware');
const { requireRoles } = require('../../middlewares/role.middleware');
const { asyncHandler } = require('../../middlewares/error.middleware');

const router = express.Router();

// Los catalogos operativos de apoyo tambien quedan reservados al administrador
// para no abrir estructura institucional a usuarios sin privilegios.
router.use(requireAuthenticatedUser);
router.use(requireRoles('ADMINISTRADOR'));

router.get('/estados', asyncHandler(jerarquiaController.listEstados));
router.get('/territorios', asyncHandler(jerarquiaController.listTerritorios));
router.get('/torres', asyncHandler(jerarquiaController.listTorres));

module.exports = router;
