// Controlador base del modulo de alertamientos.
const alertamientosService = require('./alertamientos.service');

async function getAlertamientosModuleStatus(_req, res) {
    const response = await alertamientosService.describeAlertamientosModule();
    return res.status(200).json(response);
}

module.exports = {
    getAlertamientosModuleStatus
};
