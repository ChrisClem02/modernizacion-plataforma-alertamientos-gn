// Controlador base del modulo de auditoria.
const auditoriaService = require('./auditoria.service');

async function getAuditoriaModuleStatus(_req, res) {
    const response = await auditoriaService.describeAuditoriaModule();
    return res.status(200).json(response);
}

async function listBitacora(req, res) {
    const response = await auditoriaService.listBitacora(req.query);
    return res.status(200).json(response);
}

async function getBitacoraDetail(req, res) {
    const response = await auditoriaService.getBitacoraDetailById(req.params.id);
    return res.status(200).json({
        data: response
    });
}

module.exports = {
    getAuditoriaModuleStatus,
    listBitacora,
    getBitacoraDetail
};
