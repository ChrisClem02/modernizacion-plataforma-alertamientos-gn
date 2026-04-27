const express = require('express');
const mapaController = require('./mapa.controller');
const { requireAuthenticatedUser } = require('../../middlewares/auth.middleware');
const { asyncHandler } = require('../../middlewares/error.middleware');

const router = express.Router();

// Mapa V1 usa la misma sesion viva que alertamientos. La visibilidad se
// resuelve en el servicio para que el frontend nunca reciba datos fuera de ambito.
router.use(requireAuthenticatedUser);

router.get('/', asyncHandler(mapaController.getMapaData));

module.exports = router;
