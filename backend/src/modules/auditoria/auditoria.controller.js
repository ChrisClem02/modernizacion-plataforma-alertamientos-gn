// Controlador base del modulo de auditoria.
const auditoriaService = require('./auditoria.service');

async function getAuditoriaModuleStatus(_req, res) {
    const response = await auditoriaService.describeAuditoriaModule();
    return res.status(200).json(response);
}

module.exports = {
    getAuditoriaModuleStatus
};
