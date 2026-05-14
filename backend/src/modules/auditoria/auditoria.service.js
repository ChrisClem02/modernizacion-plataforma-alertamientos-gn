// Servicio del modulo de auditoria. En esta fase se expone una consulta
// institucional de solo lectura sobre bitacora_auditoria, sin modificar la BD.
const { query } = require('../../config/db');
const { createHttpError } = require('../../middlewares/error.middleware');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const AUDITORIA_FROM_CLAUSE = `
    FROM bitacora_auditoria b
    LEFT JOIN usuario u
      ON u.id_usuario = b.id_usuario
    LEFT JOIN catalogo_evento_auditoria cea
      ON cea.id_evento_auditoria = b.id_evento_auditoria
`;

const SENSITIVE_AUDIT_KEY_PATTERN = /(contrasena|contraseña|password|passphrase|hash|token|secret|jwt|authorization|autorizacion|api_key|apikey|salt)/i;
const REDACTED_VALUE = '[REDACTADO]';

async function describeAuditoriaModule() {
    return {
        module: 'auditoria',
        implemented: true,
        message: 'Modulo de auditoria disponible en modo consulta.'
    };
}

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

function normalizeSearchText(rawValue) {
    if (typeof rawValue !== 'string') {
        return null;
    }

    const normalizedValue = rawValue.trim();
    return normalizedValue ? normalizedValue : null;
}

function parseTimestampFilter(rawValue, fieldName, mode) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
        return null;
    }

    // Si el frontend envia solo YYYY-MM-DD, se interpreta como dia completo.
    const hasOnlyDate = /^\d{4}-\d{2}-\d{2}$/.test(rawValue);
    const timestampValue = hasOnlyDate
        ? (mode === 'start'
            ? `${rawValue}T00:00:00.000Z`
            : `${rawValue}T23:59:59.999Z`)
        : rawValue;

    const parsedDate = new Date(timestampValue);

    if (Number.isNaN(parsedDate.getTime())) {
        throw createHttpError(400, `${fieldName} debe ser una fecha valida.`);
    }

    return parsedDate.toISOString();
}

function buildBitacoraFilters(queryParams) {
    const conditions = [];
    const params = [];
    const filters = {};

    const fechaInicio = parseTimestampFilter(queryParams.fecha_inicio, 'fecha_inicio', 'start');
    const fechaFin = parseTimestampFilter(queryParams.fecha_fin, 'fecha_fin', 'end');
    const nombreTabla = normalizeSearchText(queryParams.nombre_tabla);
    const evento = normalizeSearchText(queryParams.evento);
    const idRegistro = normalizeSearchText(queryParams.id_registro);
    const usuarioBusqueda = normalizeSearchText(queryParams.usuario);
    const idUsuario = parsePositiveInteger(queryParams.id_usuario, 'id_usuario');

    if (fechaInicio && fechaFin && new Date(fechaInicio) > new Date(fechaFin)) {
        throw createHttpError(400, 'fecha_inicio no puede ser posterior a fecha_fin.');
    }

    if (fechaInicio) {
        params.push(fechaInicio);
        conditions.push(`b.fecha_evento >= $${params.length}`);
        filters.fecha_inicio = queryParams.fecha_inicio;
    }

    if (fechaFin) {
        params.push(fechaFin);
        conditions.push(`b.fecha_evento <= $${params.length}`);
        filters.fecha_fin = queryParams.fecha_fin;
    }

    if (nombreTabla) {
        params.push(nombreTabla);
        conditions.push(`LOWER(b.nombre_tabla) = LOWER($${params.length})`);
        filters.nombre_tabla = nombreTabla;
    }

    if (evento) {
        params.push(evento.toUpperCase());
        conditions.push(`UPPER(COALESCE(cea.nombre_evento, '')) = $${params.length}`);
        filters.evento = evento.toUpperCase();
    }

    if (idRegistro) {
        params.push(idRegistro);
        conditions.push(`b.id_registro = $${params.length}`);
        filters.id_registro = idRegistro;
    }

    if (usuarioBusqueda) {
        params.push(`%${usuarioBusqueda}%`);
        conditions.push(`(
            u.nombre_usuario ILIKE $${params.length}
            OR u.nombres ILIKE $${params.length}
            OR u.apellido_paterno ILIKE $${params.length}
            OR u.apellido_materno ILIKE $${params.length}
            OR concat_ws(' ', u.nombres, u.apellido_paterno, u.apellido_materno) ILIKE $${params.length}
        )`);
        filters.usuario = usuarioBusqueda;
    }

    if (idUsuario) {
        params.push(idUsuario);
        conditions.push(`b.id_usuario = $${params.length}`);
        filters.id_usuario = idUsuario;
    }

    return {
        params,
        filters,
        whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    };
}

function mapBitacoraRow(row) {
    return {
        id_bitacora_auditoria: row.id_bitacora_auditoria,
        fecha_evento: row.fecha_evento,
        nombre_tabla: row.nombre_tabla,
        id_registro: row.id_registro,
        ip_origen: row.ip_origen,
        evento: row.id_evento_auditoria ? {
            id_evento_auditoria: row.id_evento_auditoria,
            nombre_evento: row.nombre_evento
        } : null,
        usuario: row.id_usuario ? {
            id_usuario: row.id_usuario,
            nombre_usuario: row.nombre_usuario,
            nombre_completo: row.nombre_completo
        } : null,
        datos_disponibles: {
            anteriores: row.tiene_datos_anteriores,
            nuevos: row.tiene_datos_nuevos
        }
    };
}

function redactAuditJson(value, parentKey = '') {
    if (value === null || value === undefined) {
        return value;
    }

    if (SENSITIVE_AUDIT_KEY_PATTERN.test(parentKey)) {
        return REDACTED_VALUE;
    }

    if (Array.isArray(value)) {
        return value.map((item) => redactAuditJson(item));
    }

    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, childValue]) => [
                key,
                redactAuditJson(childValue, key)
            ])
        );
    }

    return value;
}

function mapBitacoraDetail(row) {
    return {
        ...mapBitacoraRow(row),
        datos_anteriores: redactAuditJson(row.datos_anteriores),
        datos_nuevos: redactAuditJson(row.datos_nuevos),
        seguridad: {
            json_redactado: true,
            mensaje: 'Campos sensibles ocultos antes de enviar la respuesta.'
        }
    };
}

async function listBitacora(queryParams = {}) {
    const pagination = parsePagination(queryParams);
    const { params, filters, whereClause } = buildBitacoraFilters(queryParams);

    const countQuery = `
        SELECT COUNT(*)::INT AS total_items
        ${AUDITORIA_FROM_CLAUSE}
        ${whereClause}
    `;

    const dataQuery = `
        SELECT
            b.id_bitacora_auditoria,
            b.id_usuario,
            b.id_evento_auditoria,
            b.nombre_tabla,
            b.id_registro,
            b.ip_origen::TEXT AS ip_origen,
            b.fecha_evento,
            b.datos_anteriores IS NOT NULL AS tiene_datos_anteriores,
            b.datos_nuevos IS NOT NULL AS tiene_datos_nuevos,
            cea.nombre_evento,
            u.nombre_usuario,
            NULLIF(
                btrim(concat_ws(' ', u.nombres, u.apellido_paterno, u.apellido_materno)),
                ''
            ) AS nombre_completo
        ${AUDITORIA_FROM_CLAUSE}
        ${whereClause}
        ORDER BY b.fecha_evento DESC, b.id_bitacora_auditoria DESC
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
        data: dataResult.rows.map(mapBitacoraRow)
    };
}

async function getBitacoraDetailById(rawAuditId) {
    const auditId = parseRequiredPositiveInteger(rawAuditId, 'id_bitacora_auditoria');

    const result = await query(`
        SELECT
            b.id_bitacora_auditoria,
            b.id_usuario,
            b.id_evento_auditoria,
            b.nombre_tabla,
            b.id_registro,
            b.ip_origen::TEXT AS ip_origen,
            b.fecha_evento,
            b.datos_anteriores,
            b.datos_nuevos,
            b.datos_anteriores IS NOT NULL AS tiene_datos_anteriores,
            b.datos_nuevos IS NOT NULL AS tiene_datos_nuevos,
            cea.nombre_evento,
            u.nombre_usuario,
            NULLIF(
                btrim(concat_ws(' ', u.nombres, u.apellido_paterno, u.apellido_materno)),
                ''
            ) AS nombre_completo
        ${AUDITORIA_FROM_CLAUSE}
        WHERE b.id_bitacora_auditoria = $1
        LIMIT 1
    `, [auditId]);

    const auditRow = result.rows[0];

    if (!auditRow) {
        throw createHttpError(404, 'Movimiento de auditoria no encontrado.');
    }

    return mapBitacoraDetail(auditRow);
}

module.exports = {
    describeAuditoriaModule,
    listBitacora,
    getBitacoraDetailById
};
