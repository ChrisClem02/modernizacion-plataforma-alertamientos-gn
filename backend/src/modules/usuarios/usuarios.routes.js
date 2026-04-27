const express = require('express');
const usuariosController = require('./usuarios.controller');
const { requireAuthenticatedUser } = require('../../middlewares/auth.middleware');
const { requireRoles } = require('../../middlewares/role.middleware');
const { asyncHandler } = require('../../middlewares/error.middleware');

const router = express.Router();

// Todo el modulo de usuarios exige sesion valida y privilegios de
// administrador. Asi se evita duplicar estas reglas en cada endpoint.
router.use(requireAuthenticatedUser);
router.use(requireRoles('ADMINISTRADOR'));

router.get('/catalogos/roles', asyncHandler(usuariosController.listRolesCatalog));
router.get('/catalogos/niveles-operativos', asyncHandler(usuariosController.listNivelesOperativosCatalog));

router.get('/:id', asyncHandler(usuariosController.getUsuarioById));
router.patch('/:id/activar', asyncHandler(usuariosController.activateUsuario));
router.patch('/:id/desactivar', asyncHandler(usuariosController.deactivateUsuario));
router.put('/:id', asyncHandler(usuariosController.updateUsuario));
router.post('/', asyncHandler(usuariosController.createUsuario));
router.get('/', asyncHandler(usuariosController.listUsuarios));

module.exports = router;
