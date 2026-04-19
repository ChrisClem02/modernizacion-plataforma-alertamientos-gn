// Controlador base del modulo de jerarquia.
const jerarquiaService = require('./jerarquia.service');

async function getJerarquiaModuleStatus(_req, res) {
    const response = await jerarquiaService.describeJerarquiaModule();
    return res.status(200).json(response);
}

module.exports = {
    getJerarquiaModuleStatus
};
