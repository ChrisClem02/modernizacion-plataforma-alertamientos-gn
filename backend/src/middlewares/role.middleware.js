// El control de roles se mantiene separado para no mezclar autenticacion con
// autorizacion. En esta fase solo se deja la base de validacion.

function requireRoles(...allowedRoles) {
    const normalizedAllowedRoles = allowedRoles.map((role) => String(role).trim().toUpperCase());

    return function roleMiddleware(req, res, next) {
        const currentRole = req.authContext?.role;

        if (!currentRole) {
            return res.status(401).json({
                message: 'No existe un rol autenticado en el contexto de la solicitud.'
            });
        }

        if (!normalizedAllowedRoles.includes(currentRole)) {
            return res.status(403).json({
                message: 'El rol autenticado no tiene permiso para acceder a este recurso.'
            });
        }

        return next();
    };
}

module.exports = {
    requireRoles
};
