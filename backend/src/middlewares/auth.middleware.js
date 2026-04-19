const jwt = require('jsonwebtoken');
const env = require('../config/env');
const authService = require('../modules/auth/auth.service');
const { createHttpError } = require('./error.middleware');

function initializeAuthState(req) {
    req.user = null;
    req.authError = null;
    req.authTokenPayload = null;
    req.authContext = {
        userId: null,
        role: null
    };
}

function extractBearerToken(req) {
    const authorizationHeader = req.header('authorization');

    if (!authorizationHeader) {
        return null;
    }

    const [scheme, token, ...extraParts] = authorizationHeader.split(' ');

    if (scheme !== 'Bearer' || !token || extraParts.length > 0) {
        return {
            error: createHttpError(401, 'El encabezado Authorization debe usar el esquema Bearer.')
        };
    }

    return { token };
}

async function attachAuthContext(req, _res, next) {
    initializeAuthState(req);

    const extractedToken = extractBearerToken(req);

    if (!extractedToken) {
        return next();
    }

    if (extractedToken.error) {
        req.authError = extractedToken.error;
        return next();
    }

    try {
        const payload = jwt.verify(extractedToken.token, env.JWT_SECRET);

        if (!payload?.id_usuario || !payload?.id_rol) {
            req.authError = createHttpError(401, 'El token no contiene el contexto minimo requerido.');
            return next();
        }

        const currentUser = await authService.getCurrentUserContextById(payload.id_usuario);

        if (!currentUser) {
            req.authError = createHttpError(401, 'El usuario autenticado ya no existe.');
            return next();
        }

        if (currentUser.activo !== true) {
            req.authError = createHttpError(401, 'El usuario autenticado ya no se encuentra activo.');
            return next();
        }

        req.authTokenPayload = payload;
        req.user = currentUser;
        req.authContext = {
            userId: currentUser.id_usuario,
            role: currentUser.rol?.nombre_rol || null
        };

        return next();
    } catch (error) {
        req.authError = createHttpError(401, 'Token de acceso invalido o expirado.', {
            cause: error.message
        });
        return next();
    }
}

function requireAuthenticatedUser(req, res, next) {
    if (req.authError) {
        return next(req.authError);
    }

    if (!req.user) {
        return res.status(401).json({
            message: 'Se requiere un token de acceso valido para acceder a este recurso.'
        });
    }

    return next();
}

module.exports = {
    attachAuthContext,
    requireAuthenticatedUser
};
