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

// Este helper ya deja preparada la forma correcta de propagar el contexto del
// usuario hacia PostgreSQL. Mas adelante, cuando existan casos de uso reales,
// los servicios podran reutilizarlo para que auditoria e historial automatico
// registren el id del usuario de aplicacion.
async function withTransaction(work, options = {}) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        if (options.userId !== undefined && options.userId !== null) {
            await client.query('SET LOCAL app.current_user_id = $1', [String(options.userId)]);
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
