// Controlador del modulo de autenticacion. Mantiene el transporte HTTP simple
// y delega la logica de acceso a base y tokens al servicio.
const authService = require('./auth.service');

async function login(req, res) {
    const response = await authService.loginUser({
        nombre_usuario: req.body?.nombre_usuario,
        contrasena: req.body?.contrasena
    });

    return res.status(200).json(response);
}

async function getAuthenticatedUserProfile(req, res) {
    return res.status(200).json({
        user: req.user
    });
}

module.exports = {
    login,
    getAuthenticatedUserProfile
};
