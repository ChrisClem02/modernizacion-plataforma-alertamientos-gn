const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const apiRouter = require('./routes');
const { checkDatabaseConnection } = require('./config/db');
const { attachAuthContext } = require('./middlewares/auth.middleware');
const {
    asyncHandler,
    notFoundMiddleware,
    errorMiddleware
} = require('./middlewares/error.middleware');

const app = express();

// Se reduce ruido de cabeceras y se activa una base minima de seguridad HTTP.
app.disable('x-powered-by');
app.use(helmet());

// CORS queda configurable por variable de entorno para facilitar el arranque
// posterior del frontend sin reescribir el backend.
app.use(cors({
    origin: env.CORS_ORIGIN === '*'
        ? true
        : env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: true
}));

// Cargamos body parsers desde el inicio para futuras rutas JSON.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// Morgan es suficiente en esta fase; un logger estructurado puede esperar.
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// El contexto de autenticacion queda disponible para cualquier ruta.
app.use(attachAuthContext);

// Healthcheck con prueba real de acceso a PostgreSQL.
app.get('/health', asyncHandler(async (_req, res) => {
    const database = await checkDatabaseConnection();

    res.status(200).json({
        status: 'ok',
        service: 'mpna_gn_backend',
        stage: 'ETAPA_2_INICIAL',
        timestamp: new Date().toISOString(),
        database
    });
}));

app.use('/api', apiRouter);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
