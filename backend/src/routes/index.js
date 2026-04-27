const express = require('express');
const authRoutes = require('../modules/auth/auth.routes');
const usuariosRoutes = require('../modules/usuarios/usuarios.routes');
const jerarquiaRoutes = require('../modules/jerarquia/jerarquia.routes');
const alertamientosRoutes = require('../modules/alertamientos/alertamientos.routes');
const mapaRoutes = require('../modules/mapa/mapa.routes');
const auditoriaRoutes = require('../modules/auditoria/auditoria.routes');
const reportesRoutes = require('../modules/reportes/reportes.routes');

const router = express.Router();

// Punto base para saber que la API esta disponible y versionada.
router.get('/', (_req, res) => {
    res.status(200).json({
        message: 'API base de la Plataforma Nacional de Alertamientos',
        stage: 'ETAPA_2_INICIAL'
    });
});

router.use('/auth', authRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/jerarquia', jerarquiaRoutes);
router.use('/alertamientos', alertamientosRoutes);
router.use('/mapa', mapaRoutes);
router.use('/auditoria', auditoriaRoutes);
router.use('/reportes', reportesRoutes);

module.exports = router;
