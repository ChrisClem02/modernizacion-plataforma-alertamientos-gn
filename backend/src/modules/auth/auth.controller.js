// Controlador base del modulo de autenticacion.
const authService = require('./auth.service');

async function getAuthModuleStatus(_req, res) {
    const response = await authService.describeAuthModule();
    return res.status(200).json(response);
}

module.exports = {
    getAuthModuleStatus
};
