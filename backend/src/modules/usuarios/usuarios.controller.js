// El controlador mantiene el modulo orientado al contrato HTTP: recibe
// parametros, delega la logica al servicio y devuelve respuestas JSON simples.
const usuariosService = require('./usuarios.service');

async function listUsuarios(req, res) {
    const response = await usuariosService.listUsuarios(req.query);
    return res.status(200).json(response);
}

async function getUsuarioById(req, res) {
    const response = await usuariosService.getUsuarioDetailById(req.params.id);
    return res.status(200).json({
        data: response
    });
}

async function createUsuario(req, res) {
    const response = await usuariosService.createUsuario(req.body, req.user);
    return res.status(201).json(response);
}

async function updateUsuario(req, res) {
    const response = await usuariosService.updateUsuario(req.params.id, req.body, req.user);
    return res.status(200).json(response);
}

async function activateUsuario(req, res) {
    const response = await usuariosService.activateUsuario(req.params.id, req.user);
    return res.status(200).json(response);
}

async function deactivateUsuario(req, res) {
    const response = await usuariosService.deactivateUsuario(req.params.id, req.user);
    return res.status(200).json(response);
}

async function listRolesCatalog(req, res) {
    const response = await usuariosService.listRolesCatalog(req.query);
    return res.status(200).json(response);
}

async function listNivelesOperativosCatalog(req, res) {
    const response = await usuariosService.listNivelesOperativosCatalog(req.query);
    return res.status(200).json(response);
}

module.exports = {
    listUsuarios,
    getUsuarioById,
    createUsuario,
    updateUsuario,
    activateUsuario,
    deactivateUsuario,
    listRolesCatalog,
    listNivelesOperativosCatalog
};
