const { Pool } = require('pg');
const env = require('./env');

// Se usa pg nativo y no ORM porque la base ya encapsula reglas importantes
// de integridad, visibilidad y trazabilidad que conviene respetar de forma
// explicita con SQL parametrizado.
const pool = new Pool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    application_name: 'mpna_gn_backend'
});

// Este handler evita que errores de conexiones ociosas queden invisibles.
pool.on('error', (error) => {
    console.error('[db] Error inesperado en el pool de PostgreSQL:', error);
});

async function query(text, params = []) {
    return pool.query(text, params);
}

async function checkDatabaseConnection() {
    const result = await pool.query(`
        SELECT
            current_database() AS database_name,
            current_user AS database_user,
            NOW() AS server_time
    `);

    return result.rows[0];
}

function normalizeTransactionUserId(userId) {
    const numericUserId = Number.parseInt(userId, 10);

    if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
        throw new Error('[db] userId invalido para contexto transaccional.');
    }

    return String(numericUserId);
}

async function setCurrentAppUserLocal(client, userId) {
    const normalizedUserId = normalizeTransactionUserId(userId);

    // Se usa set_config con parametros para evitar concatenar SQL y para que
    // el valor quede acotado a la transaccion actual (is_local = true).
    await client.query(
        'SELECT set_config($1, $2, true)',
        ['app.current_user_id', normalizedUserId]
    );
}

// Este helper centraliza la forma correcta de propagar el contexto del usuario
// hacia PostgreSQL para que historial y auditoria automaticos tomen el mismo
// origen de datos en todos los casos de uso del backend.
async function withTransaction(work, options = {}) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        if (options.userId !== undefined && options.userId !== null) {
            await setCurrentAppUserLocal(client, options.userId);
        }

        const result = await work(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    pool,
    query,
    checkDatabaseConnection,
    withTransaction
};
