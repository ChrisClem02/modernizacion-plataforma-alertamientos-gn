const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const { query } = require('../../config/db');
const { createHttpError } = require('../../middlewares/error.middleware');

// Consulta minima para login. Se obtiene el hash almacenado y el estado del
// usuario, pero se evita cargar informacion territorial que no hace falta aqui.
const LOGIN_USER_QUERY = `
    SELECT
        u.id_usuario,
        u.id_rol,
        u.nombres,
        u.apellido_paterno,
        u.apellido_materno,
        u.nombre_usuario,
        u.correo_electronico,
        u.hash_contrasena,
        u.activo AS usuario_activo,
        r.nombre_rol
    FROM usuario u
    JOIN rol_sistema r
      ON r.id_rol = u.id_rol
    WHERE u.nombre_usuario = $1
    LIMIT 1
`;

// Esta consulta concentra el contexto que la aplicacion necesita despues de
// autenticar: identidad, rol y el ambito institucional vigente del usuario.
const AUTH_CONTEXT_QUERY = `
    SELECT
        u.id_usuario,
        u.id_rol,
        u.nombres,
        u.apellido_paterno,
        u.apellido_materno,
        u.nombre_usuario,
        u.correo_electronico,
        u.activo AS usuario_activo,
        r.nombre_rol,
        ua.id_usuario_ambito,
        ua.id_nivel_operativo,
        ua.id_torre,
        ua.id_estado,
        ua.id_territorio,
        ua.ambito_nacional,
        nv.nombre_nivel,
        t.nombre_torre,
        t.codigo_torre,
        e.nombre_estado,
        toper.nombre_territorio
    FROM usuario u
    JOIN rol_sistema r
      ON r.id_rol = u.id_rol
    LEFT JOIN usuario_ambito ua
      ON ua.id_usuario = u.id_usuario
     AND ua.activo = TRUE
    LEFT JOIN nivel_operativo nv
      ON nv.id_nivel_operativo = ua.id_nivel_operativo
    LEFT JOIN torre_tidv t
      ON t.id_torre = ua.id_torre
    LEFT JOIN estado e
      ON e.id_estado = ua.id_estado
    LEFT JOIN territorio_operativo toper
      ON toper.id_territorio = ua.id_territorio
    WHERE u.id_usuario = $1
    LIMIT 1
`;

function normalizeUsername(rawValue) {
    return typeof rawValue === 'string' ? rawValue.trim() : '';
}

function normalizePassword(rawValue) {
    // La contrasena no se recorta para no alterar el valor real digitado.
    return typeof rawValue === 'string' ? rawValue : '';
}

function buildFullName(row) {
    return [
        row.nombres,
        row.apellido_paterno,
        row.apellido_materno
    ].filter(Boolean).join(' ');
}

function mapNivelOperativo(row) {
    if (!row.id_nivel_operativo) {
        return null;
    }

    return {
        id_nivel_operativo: row.id_nivel_operativo,
        nombre_nivel: row.nombre_nivel
    };
}

function mapAmbito(row) {
    if (!row.id_nivel_operativo) {
        return null;
    }

    const baseAmbito = {
        id_usuario_ambito: row.id_usuario_ambito,
        tipo: row.nombre_nivel,
        ambito_nacional: row.ambito_nacional === true
    };

    if (row.nombre_nivel === 'TORRE') {
        return {
            ...baseAmbito,
            referencia: {
                id_torre: row.id_torre,
                nombre_torre: row.nombre_torre,
                codigo_torre: row.codigo_torre
            }
        };
    }

    if (row.nombre_nivel === 'ESTATAL') {
        return {
            ...baseAmbito,
            referencia: {
                id_estado: row.id_estado,
                nombre_estado: row.nombre_estado
            }
        };
    }

    if (row.nombre_nivel === 'TERRITORIAL') {
        return {
            ...baseAmbito,
            referencia: {
                id_territorio: row.id_territorio,
                nombre_territorio: row.nombre_territorio
            }
        };
    }

    return {
        ...baseAmbito,
        referencia: null
    };
}

function mapUserContext(row) {
    return {
        id_usuario: row.id_usuario,
        id_rol: row.id_rol,
        nombre_usuario: row.nombre_usuario,
        nombres: row.nombres,
        apellido_paterno: row.apellido_paterno,
        apellido_materno: row.apellido_materno,
        nombre_completo: buildFullName(row),
        correo_electronico: row.correo_electronico,
        activo: row.usuario_activo,
        rol: {
            id_rol: row.id_rol,
            nombre_rol: row.nombre_rol
        },
        nivel_operativo: mapNivelOperativo(row),
        ambito: mapAmbito(row)
    };
}

function buildAccessToken(userContext) {
    // El token permanece pequeno: solo incluye identificadores estables.
    return jwt.sign(
        {
            id_usuario: userContext.id_usuario,
            id_rol: userContext.id_rol
        },
        env.JWT_SECRET,
        {
            expiresIn: env.JWT_EXPIRES_IN,
            subject: String(userContext.id_usuario)
        }
    );
}

async function getCurrentUserContextById(userId) {
    const numericUserId = Number.parseInt(userId, 10);

    if (Number.isNaN(numericUserId) || numericUserId <= 0) {
        return null;
    }

    const result = await query(AUTH_CONTEXT_QUERY, [numericUserId]);

    if (result.rowCount === 0) {
        return null;
    }

    return mapUserContext(result.rows[0]);
}

async function loginUser(credentials) {
    const nombreUsuario = normalizeUsername(credentials.nombre_usuario);
    const contrasena = normalizePassword(credentials.contrasena);

    if (!nombreUsuario || !contrasena) {
        throw createHttpError(400, 'nombre_usuario y contrasena son obligatorios.');
    }

    const result = await query(LOGIN_USER_QUERY, [nombreUsuario]);

    if (result.rowCount === 0) {
        throw createHttpError(401, 'Credenciales invalidas.');
    }

    const userRow = result.rows[0];

    if (userRow.usuario_activo !== true) {
        throw createHttpError(403, 'El usuario se encuentra inactivo.');
    }

    let passwordMatches = false;

    try {
        passwordMatches = await bcrypt.compare(contrasena, userRow.hash_contrasena);
    } catch (error) {
        throw createHttpError(500, 'No fue posible validar la contrasena del usuario.', {
            cause: error.message
        });
    }

    if (!passwordMatches) {
        throw createHttpError(401, 'Credenciales invalidas.');
    }

    const userContext = await getCurrentUserContextById(userRow.id_usuario);

    if (!userContext) {
        throw createHttpError(401, 'No fue posible reconstruir el contexto del usuario autenticado.');
    }

    const accessToken = buildAccessToken(userContext);

    return {
        token_type: 'Bearer',
        access_token: accessToken,
        expires_in: env.JWT_EXPIRES_IN,
        user: userContext
    };
}

module.exports = {
    getCurrentUserContextById,
    loginUser
};
