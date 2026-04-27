const bcrypt = require('bcrypt');
const { query, withTransaction } = require('../../config/db');
const { createHttpError } = require('../../middlewares/error.middleware');

const PASSWORD_SALT_ROUNDS = 10;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const ADMINISTRADOR_ROLE_NAME = 'ADMINISTRADOR';
const HUMAN_NAME_PATTERN = /^\p{L}+(?:[ '-]\p{L}+)*$/u;

const USUARIOS_SELECT_CLAUSE = `
    SELECT
        u.id_usuario,
        u.id_rol,
        u.nombres,
        u.apellido_paterno,
        u.apellido_materno,
        u.nombre_usuario,
        u.correo_electronico,
        u.activo AS usuario_activo,
        u.fecha_ultimo_acceso,
        u.fecha_creacion,
        u.fecha_actualizacion,
        r.nombre_rol,
        r.activo AS rol_activo,
        ua.id_usuario_ambito,
        ua.id_nivel_operativo,
        ua.id_torre,
        ua.id_estado,
        ua.id_territorio,
        ua.ambito_nacional,
        ua.activo AS usuario_ambito_activo,
        ua.fecha_creacion AS usuario_ambito_fecha_creacion,
        ua.fecha_actualizacion AS usuario_ambito_fecha_actualizacion,
        nv.nombre_nivel,
        nv.jerarquia_orden,
        nv.activo AS nivel_operativo_activo,
        t.nombre_torre,
        t.codigo_torre,
        t.activo AS torre_activa,
        e.nombre_estado,
        e.abreviatura AS abreviatura_estado,
        e.activo AS estado_activo,
        toper.nombre_territorio,
        toper.activo AS territorio_activo
`;

// La parte FROM/JOIN queda separada porque el listado la reutiliza tanto para
// el SELECT real como para el COUNT, evitando concatenar dos SELECT seguidos.
const USUARIOS_FROM_CLAUSE = `
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
`;

// La consulta base mantiene la misma forma de datos que /auth/me para que el
// frontend futuro pueda reutilizar un contrato consistente entre modulos.
const USUARIOS_BASE_QUERY = `
    ${USUARIOS_SELECT_CLAUSE}
    ${USUARIOS_FROM_CLAUSE}
`;

const ROLES_CATALOG_QUERY = `
    SELECT
        id_rol,
        nombre_rol,
        descripcion,
        activo
    FROM rol_sistema
`;

const NIVELES_OPERATIVOS_CATALOG_QUERY = `
    SELECT
        id_nivel_operativo,
        nombre_nivel,
        descripcion,
        jerarquia_orden,
        activo
    FROM nivel_operativo
`;

const USER_FOR_UPDATE_QUERY = `
    SELECT
        u.id_usuario,
        u.id_rol,
        u.nombre_usuario,
        u.activo AS usuario_activo,
        r.nombre_rol,
        r.activo AS rol_activo
    FROM usuario u
    JOIN rol_sistema r
      ON r.id_rol = u.id_rol
    WHERE u.id_usuario = $1
    FOR UPDATE
`;

const ACTIVE_AMBITO_FOR_UPDATE_QUERY = `
    SELECT
        id_usuario_ambito,
        id_usuario,
        id_nivel_operativo,
        id_torre,
        id_estado,
        id_territorio,
        ambito_nacional,
        activo
    FROM usuario_ambito
    WHERE id_usuario = $1
      AND activo = TRUE
    FOR UPDATE
`;

const ROLE_BY_ID_QUERY = `
    SELECT
        id_rol,
        nombre_rol,
        descripcion,
        activo
    FROM rol_sistema
    WHERE id_rol = $1
    LIMIT 1
`;

const NIVEL_BY_ID_QUERY = `
    SELECT
        id_nivel_operativo,
        nombre_nivel,
        descripcion,
        jerarquia_orden,
        activo
    FROM nivel_operativo
    WHERE id_nivel_operativo = $1
    LIMIT 1
`;

const ESTADO_ASSIGNABLE_QUERY = `
    SELECT
        id_estado,
        nombre_estado,
        abreviatura,
        activo
    FROM estado
    WHERE id_estado = $1
    LIMIT 1
`;

const TERRITORIO_ASSIGNABLE_QUERY = `
    SELECT
        id_territorio,
        nombre_territorio,
        activo
    FROM territorio_operativo
    WHERE id_territorio = $1
    LIMIT 1
`;

const TORRE_ASSIGNABLE_QUERY = `
    SELECT
        t.id_torre,
        t.nombre_torre,
        t.codigo_torre,
        t.activo AS torre_activa,
        c.id_central,
        c.nombre_central,
        c.activo AS central_activa,
        r.id_region,
        r.nombre_region,
        r.activo AS region_activa,
        e.id_estado,
        e.nombre_estado,
        e.activo AS estado_activo
    FROM torre_tidv t
    JOIN central_operativa c
      ON c.id_central = t.id_central
    JOIN region_operativa r
      ON r.id_region = c.id_region
    JOIN estado e
      ON e.id_estado = t.id_estado
    WHERE t.id_torre = $1
    LIMIT 1
`;

const INSERT_USUARIO_QUERY = `
    INSERT INTO usuario (
        id_rol,
        nombres,
        apellido_paterno,
        apellido_materno,
        nombre_usuario,
        correo_electronico,
        hash_contrasena,
        activo
    )
    VALUES (
        $1, $2, $3, $4, $5, $6, $7, TRUE
    )
    RETURNING id_usuario
`;

const INSERT_USUARIO_AMBITO_QUERY = `
    INSERT INTO usuario_ambito (
        id_usuario,
        id_nivel_operativo,
        id_torre,
        id_estado,
        id_territorio,
        ambito_nacional,
        activo
    )
    VALUES (
        $1, $2, $3, $4, $5, $6, TRUE
    )
    RETURNING id_usuario_ambito
`;

const UPDATE_USUARIO_STATUS_QUERY = `
    UPDATE usuario
    SET activo = $2
    WHERE id_usuario = $1
    RETURNING id_usuario
`;

const DEACTIVATE_ACTIVE_AMBITO_QUERY = `
    UPDATE usuario_ambito
    SET activo = FALSE
    WHERE id_usuario_ambito = $1
    RETURNING id_usuario_ambito
`;

function parsePositiveInteger(rawValue, fieldName) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
        return null;
    }

    const numericValue = Number.parseInt(rawValue, 10);

    if (!Number.isInteger(numericValue) || numericValue <= 0) {
        throw createHttpError(400, `${fieldName} debe ser un entero positivo.`);
    }

    return numericValue;
}

function parseRequiredPositiveInteger(rawValue, fieldName) {
    const numericValue = parsePositiveInteger(rawValue, fieldName);

    if (numericValue === null) {
        throw createHttpError(400, `${fieldName} es obligatorio.`);
    }

    return numericValue;
}

function parseBooleanValue(rawValue, fieldName) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
        return null;
    }

    if (typeof rawValue === 'boolean') {
        return rawValue;
    }

    if (typeof rawValue === 'string') {
        const normalizedValue = rawValue.trim().toLowerCase();

        if (normalizedValue === 'true') {
            return true;
        }

        if (normalizedValue === 'false') {
            return false;
        }
    }

    throw createHttpError(400, `${fieldName} debe ser booleano.`);
}

function normalizeRequiredString(rawValue, fieldName) {
    if (typeof rawValue !== 'string') {
        throw createHttpError(400, `${fieldName} es obligatorio.`);
    }

    const normalizedValue = rawValue.trim();

    if (!normalizedValue) {
        throw createHttpError(400, `${fieldName} es obligatorio.`);
    }

    return normalizedValue;
}

function normalizeHumanNameSpaces(rawValue) {
    return rawValue.replace(/\s+/g, ' ').trim();
}

function assertValidHumanName(rawValue, fieldName) {
    if (!HUMAN_NAME_PATTERN.test(rawValue)) {
        throw createHttpError(
            400,
            `${fieldName} solo admite letras, espacios, apostrofes y guiones.`
        );
    }
}

function normalizeRequiredHumanName(rawValue, fieldName) {
    const normalizedValue = normalizeHumanNameSpaces(
        normalizeRequiredString(rawValue, fieldName)
    );

    assertValidHumanName(normalizedValue, fieldName);
    return normalizedValue;
}

function normalizeOptionalNullableString(rawValue) {
    if (rawValue === undefined) {
        return undefined;
    }

    if (rawValue === null) {
        return null;
    }

    if (typeof rawValue !== 'string') {
        throw createHttpError(400, 'apellido_materno debe ser texto o null.');
    }

    const normalizedValue = rawValue.trim();
    return normalizedValue || null;
}

function normalizeOptionalNullableHumanName(rawValue, fieldName) {
    if (rawValue === undefined) {
        return undefined;
    }

    if (rawValue === null) {
        return null;
    }

    if (typeof rawValue !== 'string') {
        throw createHttpError(400, `${fieldName} debe ser texto o null.`);
    }

    const normalizedValue = normalizeHumanNameSpaces(rawValue);

    if (!normalizedValue) {
        return null;
    }

    assertValidHumanName(normalizedValue, fieldName);
    return normalizedValue;
}

function normalizeEmail(rawValue, fieldName) {
    return normalizeRequiredString(rawValue, fieldName).toLowerCase();
}

function normalizePassword(rawValue, fieldName) {
    if (typeof rawValue !== 'string' || rawValue.length === 0) {
        throw createHttpError(400, `${fieldName} es obligatoria.`);
    }

    return rawValue;
}

function normalizeSearch(rawValue) {
    if (typeof rawValue !== 'string') {
        return null;
    }

    const normalizedValue = rawValue.trim();
    return normalizedValue || null;
}

function parsePagination(queryParams) {
    const page = parsePositiveInteger(queryParams.page, 'page') || DEFAULT_PAGE;
    const requestedLimit = parsePositiveInteger(queryParams.limit, 'limit') || DEFAULT_LIMIT;
    const limit = Math.min(requestedLimit, MAX_LIMIT);

    return {
        page,
        limit,
        offset: (page - 1) * limit
    };
}

function buildPaginationMeta(page, limit, totalItems) {
    return {
        page,
        limit,
        total_items: totalItems,
        total_pages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit)
    };
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
        nombre_nivel: row.nombre_nivel,
        jerarquia_orden: row.jerarquia_orden,
        activo: row.nivel_operativo_activo === true
    };
}

function mapAmbito(row) {
    if (!row.id_nivel_operativo) {
        return null;
    }

    const baseAmbito = {
        id_usuario_ambito: row.id_usuario_ambito,
        tipo: row.nombre_nivel,
        ambito_nacional: row.ambito_nacional === true,
        activo: row.usuario_ambito_activo === true,
        fecha_creacion: row.usuario_ambito_fecha_creacion,
        fecha_actualizacion: row.usuario_ambito_fecha_actualizacion
    };

    if (row.nombre_nivel === 'TORRE') {
        return {
            ...baseAmbito,
            referencia: {
                id_torre: row.id_torre,
                nombre_torre: row.nombre_torre,
                codigo_torre: row.codigo_torre,
                activo: row.torre_activa === true
            }
        };
    }

    if (row.nombre_nivel === 'ESTATAL') {
        return {
            ...baseAmbito,
            referencia: {
                id_estado: row.id_estado,
                nombre_estado: row.nombre_estado,
                abreviatura: row.abreviatura_estado,
                activo: row.estado_activo === true
            }
        };
    }

    if (row.nombre_nivel === 'TERRITORIAL') {
        return {
            ...baseAmbito,
            referencia: {
                id_territorio: row.id_territorio,
                nombre_territorio: row.nombre_territorio,
                activo: row.territorio_activo === true
            }
        };
    }

    return {
        ...baseAmbito,
        referencia: null
    };
}

function mapUsuarioRow(row) {
    return {
        id_usuario: row.id_usuario,
        id_rol: row.id_rol,
        nombre_usuario: row.nombre_usuario,
        nombres: row.nombres,
        apellido_paterno: row.apellido_paterno,
        apellido_materno: row.apellido_materno,
        nombre_completo: buildFullName(row),
        correo_electronico: row.correo_electronico,
        activo: row.usuario_activo === true,
        fecha_ultimo_acceso: row.fecha_ultimo_acceso,
        fecha_creacion: row.fecha_creacion,
        fecha_actualizacion: row.fecha_actualizacion,
        rol: {
            id_rol: row.id_rol,
            nombre_rol: row.nombre_rol,
            activo: row.rol_activo === true
        },
        nivel_operativo: mapNivelOperativo(row),
        ambito: mapAmbito(row)
    };
}

function mapRoleCatalogRow(row) {
    return {
        id_rol: row.id_rol,
        nombre_rol: row.nombre_rol,
        descripcion: row.descripcion,
        activo: row.activo === true
    };
}

function mapNivelCatalogRow(row) {
    return {
        id_nivel_operativo: row.id_nivel_operativo,
        nombre_nivel: row.nombre_nivel,
        descripcion: row.descripcion,
        jerarquia_orden: row.jerarquia_orden,
        activo: row.activo === true
    };
}

function hasOwnProperty(objectValue, key) {
    return Object.prototype.hasOwnProperty.call(objectValue, key);
}

function normalizeUsuariosListFilters(queryParams) {
    return {
        search: normalizeSearch(queryParams.search),
        activo: parseBooleanValue(queryParams.activo, 'activo'),
        id_rol: parsePositiveInteger(queryParams.id_rol, 'id_rol'),
        id_nivel_operativo: parsePositiveInteger(queryParams.id_nivel_operativo, 'id_nivel_operativo')
    };
}

function normalizeCatalogFilters(queryParams) {
    const activeFilter = parseBooleanValue(queryParams.activo, 'activo');

    return {
        activo: activeFilter === null ? true : activeFilter
    };
}

function buildWhereClause(clauses) {
    if (clauses.length === 0) {
        return '';
    }

    return `WHERE ${clauses.join('\n          AND ')}`;
}

function appendClause(clauses, params, sqlFragment, value) {
    params.push(value);
    clauses.push(`${sqlFragment} $${params.length}`);
}

function isAdministradorRole(roleName) {
    return String(roleName || '').trim().toUpperCase() === ADMINISTRADOR_ROLE_NAME;
}

function normalizeAmbitoPayload(rawValue, options = {}) {
    const { required = false } = options;

    if (rawValue === undefined) {
        if (required) {
            throw createHttpError(400, 'ambito es obligatorio.');
        }

        return undefined;
    }

    if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
        throw createHttpError(400, 'ambito debe ser un objeto valido.');
    }

    const idNivelOperativo = parseRequiredPositiveInteger(rawValue.id_nivel_operativo, 'ambito.id_nivel_operativo');
    const idTorre = parsePositiveInteger(rawValue.id_torre, 'ambito.id_torre');
    const idEstado = parsePositiveInteger(rawValue.id_estado, 'ambito.id_estado');
    const idTerritorio = parsePositiveInteger(rawValue.id_territorio, 'ambito.id_territorio');
    const ambitoNacionalInput = parseBooleanValue(rawValue.ambito_nacional, 'ambito.ambito_nacional');

    if (idNivelOperativo === 1) {
        if (!idTorre || idEstado !== null || idTerritorio !== null || ambitoNacionalInput === true) {
            throw createHttpError(400, 'El ambito TORRE requiere id_torre y no admite otras referencias.');
        }

        return {
            id_nivel_operativo: idNivelOperativo,
            id_torre: idTorre,
            id_estado: null,
            id_territorio: null,
            ambito_nacional: false
        };
    }

    if (idNivelOperativo === 2) {
        if (idTorre !== null || !idEstado || idTerritorio !== null || ambitoNacionalInput === true) {
            throw createHttpError(400, 'El ambito ESTATAL requiere id_estado y no admite otras referencias.');
        }

        return {
            id_nivel_operativo: idNivelOperativo,
            id_torre: null,
            id_estado: idEstado,
            id_territorio: null,
            ambito_nacional: false
        };
    }

    if (idNivelOperativo === 3) {
        if (idTorre !== null || idEstado !== null || !idTerritorio || ambitoNacionalInput === true) {
            throw createHttpError(400, 'El ambito TERRITORIAL requiere id_territorio y no admite otras referencias.');
        }

        return {
            id_nivel_operativo: idNivelOperativo,
            id_torre: null,
            id_estado: null,
            id_territorio: idTerritorio,
            ambito_nacional: false
        };
    }

    if (idNivelOperativo === 4) {
        if (idTorre !== null || idEstado !== null || idTerritorio !== null) {
            throw createHttpError(400, 'El ambito NACIONAL no admite referencias territoriales.');
        }

        return {
            id_nivel_operativo: idNivelOperativo,
            id_torre: null,
            id_estado: null,
            id_territorio: null,
            ambito_nacional: true
        };
    }

    throw createHttpError(400, 'ambito.id_nivel_operativo no es reconocido por el sistema.');
}

function normalizeCreateUsuarioPayload(payload) {
    return {
        // Los nombres institucionales se validan aqui porque la BD congelada
        // no puede cambiar; asi evitamos numeros y signos especiales desde la
        // capa de aplicacion sin romper el esquema fisico ya aprobado.
        nombres: normalizeRequiredHumanName(payload.nombres, 'nombres'),
        apellido_paterno: normalizeRequiredHumanName(payload.apellido_paterno, 'apellido_paterno'),
        apellido_materno: normalizeOptionalNullableHumanName(payload.apellido_materno, 'apellido_materno'),
        nombre_usuario: normalizeRequiredString(payload.nombre_usuario, 'nombre_usuario'),
        correo_electronico: normalizeEmail(payload.correo_electronico, 'correo_electronico'),
        contrasena: normalizePassword(payload.contrasena, 'contrasena'),
        id_rol: parseRequiredPositiveInteger(payload.id_rol, 'id_rol'),
        ambito: normalizeAmbitoPayload(payload.ambito, { required: true })
    };
}

function normalizeUpdateUsuarioPayload(payload) {
    const normalizedPayload = {
        nombres: undefined,
        apellido_paterno: undefined,
        apellido_materno: undefined,
        nombre_usuario: undefined,
        correo_electronico: undefined,
        id_rol: undefined,
        ambito: undefined
    };

    if (hasOwnProperty(payload, 'contrasena')) {
        throw createHttpError(400, 'El cambio de contrasena no forma parte de este modulo.');
    }

    if (hasOwnProperty(payload, 'nombres')) {
        normalizedPayload.nombres = normalizeRequiredHumanName(payload.nombres, 'nombres');
    }

    if (hasOwnProperty(payload, 'apellido_paterno')) {
        normalizedPayload.apellido_paterno = normalizeRequiredHumanName(payload.apellido_paterno, 'apellido_paterno');
    }

    if (hasOwnProperty(payload, 'apellido_materno')) {
        normalizedPayload.apellido_materno = normalizeOptionalNullableHumanName(payload.apellido_materno, 'apellido_materno');
    }

    if (hasOwnProperty(payload, 'nombre_usuario')) {
        normalizedPayload.nombre_usuario = normalizeRequiredString(payload.nombre_usuario, 'nombre_usuario');
    }

    if (hasOwnProperty(payload, 'correo_electronico')) {
        normalizedPayload.correo_electronico = normalizeEmail(payload.correo_electronico, 'correo_electronico');
    }

    if (hasOwnProperty(payload, 'id_rol')) {
        normalizedPayload.id_rol = parseRequiredPositiveInteger(payload.id_rol, 'id_rol');
    }

    if (hasOwnProperty(payload, 'ambito')) {
        normalizedPayload.ambito = normalizeAmbitoPayload(payload.ambito, { required: true });
    }

    const hasRootField = [
        'nombres',
        'apellido_paterno',
        'apellido_materno',
        'nombre_usuario',
        'correo_electronico',
        'id_rol'
    ].some((fieldName) => normalizedPayload[fieldName] !== undefined);

    if (!hasRootField && normalizedPayload.ambito === undefined) {
        throw createHttpError(400, 'No se enviaron cambios permitidos para actualizar el usuario.');
    }

    return normalizedPayload;
}

function buildDynamicUsuarioUpdateFields(normalizedPayload) {
    const assignments = [];
    const values = [];

    if (normalizedPayload.nombres !== undefined) {
        values.push(normalizedPayload.nombres);
        assignments.push(`nombres = $${values.length}`);
    }

    if (normalizedPayload.apellido_paterno !== undefined) {
        values.push(normalizedPayload.apellido_paterno);
        assignments.push(`apellido_paterno = $${values.length}`);
    }

    if (normalizedPayload.apellido_materno !== undefined) {
        values.push(normalizedPayload.apellido_materno);
        assignments.push(`apellido_materno = $${values.length}`);
    }

    if (normalizedPayload.nombre_usuario !== undefined) {
        values.push(normalizedPayload.nombre_usuario);
        assignments.push(`nombre_usuario = $${values.length}`);
    }

    if (normalizedPayload.correo_electronico !== undefined) {
        values.push(normalizedPayload.correo_electronico);
        assignments.push(`correo_electronico = $${values.length}`);
    }

    if (normalizedPayload.id_rol !== undefined) {
        values.push(normalizedPayload.id_rol);
        assignments.push(`id_rol = $${values.length}`);
    }

    return {
        assignments,
        values
    };
}

function areAmbitosEquivalent(currentAmbito, nextAmbito) {
    if (!currentAmbito || !nextAmbito) {
        return false;
    }

    return Number(currentAmbito.id_nivel_operativo) === Number(nextAmbito.id_nivel_operativo)
        && Number(currentAmbito.id_torre || 0) === Number(nextAmbito.id_torre || 0)
        && Number(currentAmbito.id_estado || 0) === Number(nextAmbito.id_estado || 0)
        && Number(currentAmbito.id_territorio || 0) === Number(nextAmbito.id_territorio || 0)
        && currentAmbito.ambito_nacional === nextAmbito.ambito_nacional;
}

function mapPostgresWriteError(error) {
    if (error?.statusCode) {
        return error;
    }

    if (error?.code === '23505') {
        if (error.constraint === 'usuario_nombre_usuario_key') {
            return createHttpError(409, 'Ya existe un usuario con el nombre de usuario indicado.');
        }

        if (error.constraint === 'uq_usuario_correo_lower') {
            return createHttpError(409, 'Ya existe un usuario con el correo electronico indicado.');
        }

        if (error.constraint === 'uq_usuario_ambito_activo_unico') {
            return createHttpError(409, 'El usuario ya cuenta con un ambito institucional activo.');
        }

        return createHttpError(409, 'La operacion genero un conflicto de unicidad en la base de datos.');
    }

    if (error?.code === '23503') {
        return createHttpError(400, 'Alguna referencia institucional indicada no existe.');
    }

    if (error?.code === '23514') {
        return createHttpError(400, 'Los datos enviados no cumplen las restricciones institucionales de la base.');
    }

    return error;
}

async function getUsuarioDetailById(userId) {
    const numericUserId = parseRequiredPositiveInteger(userId, 'id');
    const result = await query(`
        ${USUARIOS_BASE_QUERY}
        WHERE u.id_usuario = $1
        LIMIT 1
    `, [numericUserId]);

    if (result.rowCount === 0) {
        throw createHttpError(404, 'El usuario solicitado no existe.');
    }

    return mapUsuarioRow(result.rows[0]);
}

async function getRoleById(client, roleId, options = {}) {
    const { requireActive = false } = options;
    const result = await client.query(ROLE_BY_ID_QUERY, [roleId]);

    if (result.rowCount === 0) {
        throw createHttpError(400, 'El rol indicado no existe.');
    }

    const role = result.rows[0];

    if (requireActive && role.activo !== true) {
        throw createHttpError(400, 'El rol indicado no se encuentra activo.');
    }

    return role;
}

async function getNivelOperativoById(client, nivelId, options = {}) {
    const { requireActive = false } = options;
    const result = await client.query(NIVEL_BY_ID_QUERY, [nivelId]);

    if (result.rowCount === 0) {
        throw createHttpError(400, 'El nivel operativo indicado no existe.');
    }

    const nivel = result.rows[0];

    if (requireActive && nivel.activo !== true) {
        throw createHttpError(400, 'El nivel operativo indicado no se encuentra activo.');
    }

    return nivel;
}

async function assertAssignableEstado(client, estadoId) {
    const result = await client.query(ESTADO_ASSIGNABLE_QUERY, [estadoId]);

    if (result.rowCount === 0) {
        throw createHttpError(400, 'El estado indicado no existe.');
    }

    if (result.rows[0].activo !== true) {
        throw createHttpError(400, 'No se puede asignar un estado inactivo al ambito del usuario.');
    }
}

async function assertAssignableTerritorio(client, territorioId) {
    const result = await client.query(TERRITORIO_ASSIGNABLE_QUERY, [territorioId]);

    if (result.rowCount === 0) {
        throw createHttpError(400, 'El territorio indicado no existe.');
    }

    if (result.rows[0].activo !== true) {
        throw createHttpError(400, 'No se puede asignar un territorio inactivo al ambito del usuario.');
    }
}

async function assertAssignableTorre(client, torreId) {
    const result = await client.query(TORRE_ASSIGNABLE_QUERY, [torreId]);

    if (result.rowCount === 0) {
        throw createHttpError(400, 'La torre indicada no existe.');
    }

    const tower = result.rows[0];

    if (tower.torre_activa !== true || tower.central_activa !== true || tower.region_activa !== true || tower.estado_activo !== true) {
        throw createHttpError(400, 'La torre indicada no cuenta con contexto operativo activo para asignarse.');
    }
}

async function assertAssignableAmbito(client, ambitoPayload) {
    const nivel = await getNivelOperativoById(client, ambitoPayload.id_nivel_operativo, {
        requireActive: true
    });

    if (nivel.id_nivel_operativo === 1) {
        await assertAssignableTorre(client, ambitoPayload.id_torre);
        return;
    }

    if (nivel.id_nivel_operativo === 2) {
        await assertAssignableEstado(client, ambitoPayload.id_estado);
        return;
    }

    if (nivel.id_nivel_operativo === 3) {
        await assertAssignableTerritorio(client, ambitoPayload.id_territorio);
    }
}

async function getUserForUpdate(client, userId) {
    const result = await client.query(USER_FOR_UPDATE_QUERY, [userId]);

    if (result.rowCount === 0) {
        throw createHttpError(404, 'El usuario solicitado no existe.');
    }

    return result.rows[0];
}

async function getActiveAmbitoForUpdate(client, userId) {
    const result = await client.query(ACTIVE_AMBITO_FOR_UPDATE_QUERY, [userId]);
    return result.rows[0] || null;
}

async function lockActiveAdministratorIds(client) {
    const result = await client.query(`
        SELECT u.id_usuario
        FROM usuario u
        JOIN rol_sistema r
          ON r.id_rol = u.id_rol
        WHERE u.activo = TRUE
          AND UPPER(r.nombre_rol) = $1
        FOR UPDATE
    `, [ADMINISTRADOR_ROLE_NAME]);

    return result.rows.map((row) => Number(row.id_usuario));
}

async function assertCanRemoveAdministrator(client, targetUserId) {
    const activeAdminIds = await lockActiveAdministratorIds(client);

    if (!activeAdminIds.includes(Number(targetUserId))) {
        return;
    }

    if (activeAdminIds.length <= 1) {
        throw createHttpError(409, 'No es posible dejar al sistema sin administradores activos.');
    }
}

async function insertUsuarioAmbito(client, userId, ambitoPayload) {
    await client.query(INSERT_USUARIO_AMBITO_QUERY, [
        userId,
        ambitoPayload.id_nivel_operativo,
        ambitoPayload.id_torre,
        ambitoPayload.id_estado,
        ambitoPayload.id_territorio,
        ambitoPayload.ambito_nacional
    ]);
}

async function updateUsuarioRecord(client, userId, normalizedPayload) {
    const { assignments, values } = buildDynamicUsuarioUpdateFields(normalizedPayload);

    if (assignments.length === 0) {
        return userId;
    }

    values.push(userId);

    const result = await client.query(`
        UPDATE usuario
        SET ${assignments.join(', ')}
        WHERE id_usuario = $${values.length}
        RETURNING id_usuario
    `, values);

    return result.rows[0].id_usuario;
}

async function listUsuarios(queryParams) {
    const filters = normalizeUsuariosListFilters(queryParams);
    const pagination = parsePagination(queryParams);
    const clauses = [];
    const params = [];

    if (filters.search) {
        params.push(`%${filters.search}%`);
        clauses.push(`(
            u.nombre_usuario ILIKE $${params.length}
            OR u.correo_electronico ILIKE $${params.length}
            OR u.nombres ILIKE $${params.length}
            OR u.apellido_paterno ILIKE $${params.length}
            OR COALESCE(u.apellido_materno, '') ILIKE $${params.length}
        )`);
    }

    if (filters.activo !== null) {
        appendClause(clauses, params, 'u.activo =', filters.activo);
    }

    if (filters.id_rol !== null) {
        appendClause(clauses, params, 'u.id_rol =', filters.id_rol);
    }

    if (filters.id_nivel_operativo !== null) {
        appendClause(clauses, params, 'ua.id_nivel_operativo =', filters.id_nivel_operativo);
    }

    const whereClause = buildWhereClause(clauses);

    const countQuery = `
        SELECT COUNT(*)::INT AS total_items
        ${USUARIOS_FROM_CLAUSE}
        ${whereClause}
    `;

    const dataQuery = `
        ${USUARIOS_BASE_QUERY}
        ${whereClause}
        ORDER BY u.nombre_usuario ASC, u.id_usuario ASC
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
    `;

    const [countResult, dataResult] = await Promise.all([
        query(countQuery, params),
        query(dataQuery, [...params, pagination.limit, pagination.offset])
    ]);

    const totalItems = countResult.rows[0]?.total_items || 0;

    return {
        filters,
        pagination: buildPaginationMeta(pagination.page, pagination.limit, totalItems),
        data: dataResult.rows.map(mapUsuarioRow)
    };
}

async function createUsuario(payload, authenticatedUser) {
    const normalizedPayload = normalizeCreateUsuarioPayload(payload || {});
    const authenticatedUserId = parseRequiredPositiveInteger(
        authenticatedUser?.id_usuario,
        'id_usuario_autenticado'
    );
    const passwordHash = await bcrypt.hash(normalizedPayload.contrasena, PASSWORD_SALT_ROUNDS);

    try {
        const createdUserId = await withTransaction(async (client) => {
            await getRoleById(client, normalizedPayload.id_rol, { requireActive: true });
            await assertAssignableAmbito(client, normalizedPayload.ambito);

            const insertResult = await client.query(INSERT_USUARIO_QUERY, [
                normalizedPayload.id_rol,
                normalizedPayload.nombres,
                normalizedPayload.apellido_paterno,
                normalizedPayload.apellido_materno,
                normalizedPayload.nombre_usuario,
                normalizedPayload.correo_electronico,
                passwordHash
            ]);

            const createdUserIdValue = insertResult.rows[0].id_usuario;

            // El ambito se inserta de inmediato para que el usuario nazca con un
            // contexto institucional operativo y quede trazado en auditoria.
            await insertUsuarioAmbito(client, createdUserIdValue, normalizedPayload.ambito);

            return createdUserIdValue;
        }, {
            userId: authenticatedUserId
        });

        const detail = await getUsuarioDetailById(createdUserId);

        return {
            message: 'Usuario creado correctamente.',
            data: detail
        };
    } catch (error) {
        throw mapPostgresWriteError(error);
    }
}

async function updateUsuario(userId, payload, authenticatedUser) {
    const numericUserId = parseRequiredPositiveInteger(userId, 'id');
    const normalizedPayload = normalizeUpdateUsuarioPayload(payload || {});
    const authenticatedUserId = parseRequiredPositiveInteger(
        authenticatedUser?.id_usuario,
        'id_usuario_autenticado'
    );

    try {
        await withTransaction(async (client) => {
            const currentUser = await getUserForUpdate(client, numericUserId);

            if (normalizedPayload.id_rol !== undefined) {
                const targetRole = await getRoleById(client, normalizedPayload.id_rol, {
                    requireActive: true
                });

                if (currentUser.usuario_activo === true
                    && isAdministradorRole(currentUser.nombre_rol)
                    && !isAdministradorRole(targetRole.nombre_rol)) {
                    await assertCanRemoveAdministrator(client, currentUser.id_usuario);
                }
            }

            if (normalizedPayload.ambito !== undefined) {
                await assertAssignableAmbito(client, normalizedPayload.ambito);

                const currentAmbito = await getActiveAmbitoForUpdate(client, numericUserId);

                // Solo se cierra el ambito actual cuando realmente cambia; asi se
                // conserva el historial sin generar ruido innecesario.
                if (!areAmbitosEquivalent(currentAmbito, normalizedPayload.ambito)) {
                    if (currentAmbito) {
                        await client.query(DEACTIVATE_ACTIVE_AMBITO_QUERY, [currentAmbito.id_usuario_ambito]);
                    }

                    await insertUsuarioAmbito(client, numericUserId, normalizedPayload.ambito);
                }
            }

            await updateUsuarioRecord(client, numericUserId, normalizedPayload);
        }, {
            userId: authenticatedUserId
        });

        const detail = await getUsuarioDetailById(numericUserId);

        return {
            message: 'Usuario actualizado correctamente.',
            data: detail
        };
    } catch (error) {
        throw mapPostgresWriteError(error);
    }
}

async function activateUsuario(userId, authenticatedUser) {
    const numericUserId = parseRequiredPositiveInteger(userId, 'id');
    const authenticatedUserId = parseRequiredPositiveInteger(
        authenticatedUser?.id_usuario,
        'id_usuario_autenticado'
    );

    try {
        await withTransaction(async (client) => {
            const currentUser = await getUserForUpdate(client, numericUserId);

            if (currentUser.usuario_activo !== true) {
                if (currentUser.rol_activo !== true) {
                    throw createHttpError(409, 'No se puede activar un usuario cuyo rol ya no se encuentra activo.');
                }

                const currentAmbito = await getActiveAmbitoForUpdate(client, numericUserId);

                if (!currentAmbito) {
                    throw createHttpError(409, 'No se puede activar un usuario sin ambito institucional activo.');
                }

                // La reactivacion verifica que el ambito vigente siga apuntando a
                // referencias activas para no reabrir cuentas con contexto roto.
                await assertAssignableAmbito(client, currentAmbito);

                await client.query(UPDATE_USUARIO_STATUS_QUERY, [numericUserId, true]);
            }
        }, {
            userId: authenticatedUserId
        });

        const detail = await getUsuarioDetailById(numericUserId);

        return {
            message: 'Usuario activado correctamente.',
            data: detail
        };
    } catch (error) {
        throw mapPostgresWriteError(error);
    }
}

async function deactivateUsuario(userId, authenticatedUser) {
    const numericUserId = parseRequiredPositiveInteger(userId, 'id');
    const authenticatedUserId = parseRequiredPositiveInteger(
        authenticatedUser?.id_usuario,
        'id_usuario_autenticado'
    );

    if (numericUserId === authenticatedUserId) {
        throw createHttpError(409, 'No puedes desactivar tu propio usuario autenticado.');
    }

    try {
        await withTransaction(async (client) => {
            const currentUser = await getUserForUpdate(client, numericUserId);

            if (currentUser.usuario_activo === true && isAdministradorRole(currentUser.nombre_rol)) {
                await assertCanRemoveAdministrator(client, currentUser.id_usuario);
            }

            if (currentUser.usuario_activo !== false) {
                await client.query(UPDATE_USUARIO_STATUS_QUERY, [numericUserId, false]);
            }
        }, {
            userId: authenticatedUserId
        });

        const detail = await getUsuarioDetailById(numericUserId);

        return {
            message: 'Usuario desactivado correctamente.',
            data: detail
        };
    } catch (error) {
        throw mapPostgresWriteError(error);
    }
}

async function listRolesCatalog(queryParams) {
    const filters = normalizeCatalogFilters(queryParams);
    const params = [];
    let whereClause = '';

    if (filters.activo !== null) {
        params.push(filters.activo);
        whereClause = `WHERE activo = $${params.length}`;
    }

    const result = await query(`
        ${ROLES_CATALOG_QUERY}
        ${whereClause}
        ORDER BY id_rol ASC
    `, params);

    return {
        filters,
        data: result.rows.map(mapRoleCatalogRow)
    };
}

async function listNivelesOperativosCatalog(queryParams) {
    const filters = normalizeCatalogFilters(queryParams);
    const params = [];
    let whereClause = '';

    if (filters.activo !== null) {
        params.push(filters.activo);
        whereClause = `WHERE activo = $${params.length}`;
    }

    const result = await query(`
        ${NIVELES_OPERATIVOS_CATALOG_QUERY}
        ${whereClause}
        ORDER BY jerarquia_orden ASC, id_nivel_operativo ASC
    `, params);

    return {
        filters,
        data: result.rows.map(mapNivelCatalogRow)
    };
}

module.exports = {
    listUsuarios,
    getUsuarioDetailById,
    createUsuario,
    updateUsuario,
    activateUsuario,
    deactivateUsuario,
    listRolesCatalog,
    listNivelesOperativosCatalog
};
