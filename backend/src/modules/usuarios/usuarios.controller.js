// El controlador se mantiene delgado desde el inicio para separar transporte
// HTTP de la futura logica de negocio del modulo.
const usuariosService = require('./usuarios.service');

async function getUsuariosModuleStatus(_req, res) {
    const response = await usuariosService.describeUsuariosModule();
    return res.status(200).json(response);
}

module.exports = {
    getUsuariosModuleStatus
};
