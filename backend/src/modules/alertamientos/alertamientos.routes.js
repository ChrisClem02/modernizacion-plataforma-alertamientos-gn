const express = require('express');
const alertamientosController = require('./alertamientos.controller');
const { requireAuthenticatedUser } = require('../../middlewares/auth.middleware');
const { asyncHandler } = require('../../middlewares/error.middleware');

const router = express.Router();

// El modulo es solo de lectura en esta iteracion, pero ya exige autenticacion
// para poder aplicar la visibilidad institucional desde req.user.
router.use(requireAuthenticatedUser);

// Historial se declara antes del detalle para evitar que Express capture
// "/:id/historial" como si fuera solo "/:id".
router.get('/:id/historial', asyncHandler(alertamientosController.getAlertamientoHistorialById));
router.get('/:id', asyncHandler(alertamientosController.getAlertamientoById));
router.get('/', asyncHandler(alertamientosController.listAlertamientos));

module.exports = router;
