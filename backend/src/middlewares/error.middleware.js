// Los errores se centralizan aqui para no repetir try/catch y para mantener
// respuestas predecibles desde el primer dia del backend.

function createHttpError(statusCode, message, details) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.details = details;
    return error;
}

function asyncHandler(handler) {
    return function wrappedHandler(req, res, next) {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

function notFoundMiddleware(req, _res, next) {
    next(createHttpError(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

function errorMiddleware(error, _req, res, _next) {
    const statusCode = error.statusCode || 500;
    const payload = {
        message: error.message || 'Ocurrio un error interno en el servidor.'
    };

    // En desarrollo conviene devolver mas contexto para depuracion.
    if (process.env.NODE_ENV !== 'production' && error.details) {
        payload.details = error.details;
    }

    if (process.env.NODE_ENV !== 'production' && statusCode >= 500 && error.stack) {
        payload.stack = error.stack;
    }

    res.status(statusCode).json(payload);
}

module.exports = {
    createHttpError,
    asyncHandler,
    notFoundMiddleware,
    errorMiddleware
};
