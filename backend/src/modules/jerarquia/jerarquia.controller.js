// El controlador expone solo catalogos operativos de apoyo para formularios de
// ambito; toda la logica de consulta y filtros vive en el servicio.
const jerarquiaService = require('./jerarquia.service');

async function listEstados(req, res) {
    const response = await jerarquiaService.listEstados(req.query);
    return res.status(200).json(response);
}

async function listTerritorios(req, res) {
    const response = await jerarquiaService.listTerritorios(req.query);
    return res.status(200).json(response);
}

async function listTorres(req, res) {
    const response = await jerarquiaService.listTorres(req.query);
    return res.status(200).json(response);
}

module.exports = {
    listEstados,
    listTerritorios,
    listTorres
};
