// Este middleware todavia no implementa autenticacion definitiva.
// Su objetivo en esta iteracion es dejar un contrato de contexto comun para
// que el resto del backend pueda crecer sin rehacer la estructura base.

function normalizeUserId(rawValue) {
    if (!rawValue) {
        return null;
    }

    const parsedValue = Number.parseInt(rawValue, 10);
    return Number.isNaN(parsedValue) || parsedValue <= 0 ? null : parsedValue;
}

function normalizeRole(rawValue) {
    if (!rawValue || typeof rawValue !== 'string') {
        return null;
    }

    const normalizedValue = rawValue.trim().toUpperCase();
    return normalizedValue === '' ? null : normalizedValue;
}

function attachAuthContext(req, _res, next) {
    req.authContext = {
        userId: normalizeUserId(req.header('x-user-id')),
        role: normalizeRole(req.header('x-user-role'))
    };

    next();
}

function requireAuthenticatedUser(req, res, next) {
    if (!req.authContext?.userId) {
        return res.status(401).json({
            message: 'Se requiere un usuario autenticado para acceder a este recurso.'
        });
    }

    return next();
}

module.exports = {
    attachAuthContext,
    requireAuthenticatedUser
};
