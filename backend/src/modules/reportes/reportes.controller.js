// Controlador base del modulo de reportes.
const reportesService = require('./reportes.service');

async function getReportesModuleStatus(_req, res) {
    const response = await reportesService.describeReportesModule();
    return res.status(200).json(response);
}

module.exports = {
    getReportesModuleStatus
};
