// La configuracion del backend se centraliza aqui para evitar variables
// dispersas y para fallar rapido cuando falta algun dato esencial.
require('dotenv').config();

function getRequiredEnv(name) {
    const value = process.env[name];

    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`La variable de entorno ${name} es obligatoria.`);
    }

    return value.trim();
}

function getIntegerEnv(name, fallbackValue) {
    const rawValue = process.env[name];

    if (rawValue === undefined || rawValue === null || rawValue === '') {
        return fallbackValue;
    }

    const parsedValue = Number.parseInt(rawValue, 10);

    if (Number.isNaN(parsedValue) || parsedValue <= 0) {
        throw new Error(`La variable de entorno ${name} debe ser un entero positivo.`);
    }

    return parsedValue;
}

// El objeto se congela para que ninguna parte del codigo cambie la
// configuracion en tiempo de ejecucion por accidente.
const env = Object.freeze({
    NODE_ENV: process.env.NODE_ENV?.trim() || 'development',
    BACKEND_PORT: getIntegerEnv('BACKEND_PORT', 3001),
    DB_HOST: getRequiredEnv('DB_HOST'),
    DB_PORT: getIntegerEnv('DB_PORT', 5432),
    DB_NAME: getRequiredEnv('DB_NAME'),
    DB_USER: getRequiredEnv('DB_USER'),
    DB_PASSWORD: getRequiredEnv('DB_PASSWORD'),
    CORS_ORIGIN: process.env.CORS_ORIGIN?.trim() || '*',
    JWT_SECRET: getRequiredEnv('JWT_SECRET'),
    JWT_EXPIRES_IN: getRequiredEnv('JWT_EXPIRES_IN')
});

module.exports = env;
