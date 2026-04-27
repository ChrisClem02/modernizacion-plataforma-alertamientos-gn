const { query } = require('../../config/db');
const { createHttpError } = require('../../middlewares/error.middleware');

const DEFAULT_WINDOW_DAYS = 30;
const DEFAULT_ALERT_LIMIT = 500;
const MAX_ALERT_LIMIT = 1000;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const TORRES_FROM_CLAUSE = `
    FROM torre_tidv t
    JOIN central_operativa c
      ON c.id_central = t.id_central
    JOIN region_operativa r
      ON r.id_region = c.id_region
    JOIN estado e
      ON e.id_estado = t.id_estado
    JOIN estado esede
      ON esede.id_estado = c.id_estado_sede
    LEFT JOIN territorio_estado te
      ON te.id_estado = e.id_estado
     AND te.activo = TRUE
    LEFT JOIN territorio_operativo toper
      ON toper.id_territorio = te.id_territorio
`;

const ALERTAMIENTOS_FROM_CLAUSE = `
    FROM alertamiento_vehicular a
    JOIN estatus_alertamiento ea
      ON ea.id_estatus_alertamiento = a.id_estatus_alertamiento
    JOIN torre_tidv t
      ON t.id_torre = a.id_torre
    JOIN central_operativa c
      ON c.id_central = t.id_central
    JOIN region_operativa r
      ON r.id_region = c.id_region
    JOIN estado e
      ON e.id_estado = t.id_estado
    JOIN estado esede
      ON esede.id_estado = c.id_estado_sede
    LEFT JOIN territorio_estado te
      ON te.id_estado = e.id_estado
     AND te.activo = TRUE
    LEFT JOIN territorio_operativo toper
      ON toper.id_territorio = te.id_territorio
`;

const TORRE_HAS_COORDINATES_SQL = `
    COALESCE(
        t.latitud BETWEEN -90 AND 90
        AND t.longitud BETWEEN -180 AND 180,
        FALSE
    )
`;

const ALERTAMIENTO_HAS_COORDINATES_SQL = `
    COALESCE(
        a.latitud_deteccion BETWEEN -90 AND 90
        AND a.longitud_deteccion BETWEEN -180 AND 180,
        FALSE
    )
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

function parseTimestampFilter(rawValue, fieldName, mode) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
        return null;
    }

    if (typeof rawValue !== 'string') {
        throw createHttpError(400, `${fieldName} debe ser una fecha valida.`);
    }

    const trimmedValue = rawValue.trim();
    const hasOnlyDate = /^\d{4}-\d{2}-\d{2}$/.test(trimmedValue);
    const timestampValue = hasOnlyDate
        ? (mode === 'start'
            ? `${trimmedValue}T00:00:00.000Z`
            : `${trimmedValue}T23:59:59.999Z`)
        : trimmedValue;
    const parsedDate = new Date(timestampValue);

    if (Number.isNaN(parsedDate.getTime())) {
        throw createHttpError(400, `${fieldName} debe ser una fecha valida.`);
    }

    return parsedDate.toISOString();
}

function normalizeMapaFilters(queryParams) {
    const now = new Date();
    const parsedFechaFin = parseTimestampFilter(queryParams.fecha_fin, 'fecha_fin', 'end');
    const fechaFin = parsedFechaFin || now.toISOString();
    const parsedFechaInicio = parseTimestampFilter(queryParams.fecha_inicio, 'fecha_inicio', 'start');
    const fechaInicio = parsedFechaInicio || new Date(
        new Date(fechaFin).getTime() - (DEFAULT_WINDOW_DAYS * MILLISECONDS_PER_DAY)
    ).toISOString();
    const limit = parsePositiveInteger(queryParams.limit, 'limit') || DEFAULT_ALERT_LIMIT;
    const normalizedFilters = {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        id_estatus_alertamiento: parsePositiveInteger(
            queryParams.id_estatus_alertamiento,
            'id_estatus_alertamiento'
        ),
        id_torre: parsePositiveInteger(queryParams.id_torre, 'id_torre'),
        limit: Math.min(limit, MAX_ALERT_LIMIT)
    };

    if (normalizedFilters.fecha_inicio > normalizedFilters.fecha_fin) {
        throw createHttpError(400, 'fecha_inicio no puede ser mayor que fecha_fin.');
    }

    return normalizedFilters;
}

function getUserVisibilityContext(userContext) {
    const nivelOperativo = userContext?.nivel_operativo?.nombre_nivel;
    const ambito = userContext?.ambito;

    if (!nivelOperativo || !ambito) {
        throw createHttpError(403, 'El usuario autenticado no cuenta con un ambito institucional vigente.');
    }

    return {
        nivel_operativo: nivelOperativo,
        ambito
    };
}

function appendClause(clauses, params, sqlExpression, value) {
    params.push(value);
    clauses.push(`${sqlExpression} $${params.length}`);
}

function buildWhereClause(clauses) {
    return clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
}

function applyVisibilityClauses(clauses, params, userContext) {
    const visibilityContext = getUserVisibilityContext(userContext);

    if (visibilityContext.nivel_operativo === 'TORRE') {
        appendClause(clauses, params, 't.id_torre =', visibilityContext.ambito.referencia?.id_torre);
        return visibilityContext;
    }

    if (visibilityContext.nivel_operativo === 'ESTATAL') {
        appendClause(clauses, params, 't.id_estado =', visibilityContext.ambito.referencia?.id_estado);
        return visibilityContext;
    }

    if (visibilityContext.nivel_operativo === 'TERRITORIAL') {
        appendClause(clauses, params, 'te.id_territorio =', visibilityContext.ambito.referencia?.id_territorio);
        return visibilityContext;
    }

    if (visibilityContext.nivel_operativo === 'NACIONAL') {
        return visibilityContext;
    }

    throw createHttpError(403, 'El nivel operativo del usuario no es reconocido por el modulo de mapa.');
}

function applyCommonFilters(clauses, params, filters) {
    if (filters.id_torre) {
        appendClause(clauses, params, 't.id_torre =', filters.id_torre);
    }
}

function applyAlertamientoFilters(clauses, params, filters) {
    appendClause(clauses, params, 'a.fecha_hora_deteccion >=', filters.fecha_inicio);
    appendClause(clauses, params, 'a.fecha_hora_deteccion <=', filters.fecha_fin);

    if (filters.id_estatus_alertamiento) {
        appendClause(clauses, params, 'a.id_estatus_alertamiento =', filters.id_estatus_alertamiento);
    }
}

function toNumberOrNull(value) {
    if (value === undefined || value === null) {
        return null;
    }

    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? null : numericValue;
}

function mapVisibilityContext(visibilityContext) {
    return {
        nivel_operativo: visibilityContext.nivel_operativo,
        ambito: visibilityContext.ambito
    };
}

function mapTorreRow(row) {
    return {
        id_torre: row.id_torre,
        nombre_torre: row.nombre_torre,
        codigo_torre: row.codigo_torre,
        activo: row.torre_activa === true,
        coordenada: row.torre_tiene_coordenadas === true ? {
            latitud: toNumberOrNull(row.latitud),
            longitud: toNumberOrNull(row.longitud)
        } : null,
        tiene_coordenadas: row.torre_tiene_coordenadas === true,
        estado: {
            id_estado: row.id_estado,
            nombre_estado: row.nombre_estado,
            abreviatura: row.abreviatura_estado,
            activo: row.estado_activo === true
        },
        central: {
            id_central: row.id_central,
            nombre_central: row.nombre_central,
            id_estado_sede: row.id_estado_sede,
            nombre_estado_sede: row.nombre_estado_sede,
            activo: row.central_activa === true
        },
        region: {
            id_region: row.id_region,
            nombre_region: row.nombre_region,
            activo: row.region_activa === true
        },
        territorio: row.id_territorio ? {
            id_territorio: row.id_territorio,
            nombre_territorio: row.nombre_territorio,
            activo: row.territorio_activo === true
        } : null
    };
}

function mapAlertamientoRow(row) {
    const coordinateSource = row.fuente_coordenada;

    return {
        id_alertamiento: row.id_alertamiento,
        folio_alertamiento: row.folio_alertamiento,
        placa_detectada: row.placa_detectada,
        fecha_hora_deteccion: row.fecha_hora_deteccion,
        origen_registro: row.origen_registro,
        ubicable: coordinateSource !== 'SIN_COORDENADAS',
        fuente_coordenada: coordinateSource,
        coordenada: coordinateSource !== 'SIN_COORDENADAS' ? {
            latitud: toNumberOrNull(row.latitud_mapa),
            longitud: toNumberOrNull(row.longitud_mapa)
        } : null,
        coordenada_alertamiento: row.alertamiento_tiene_coordenadas === true ? {
            latitud: toNumberOrNull(row.latitud_deteccion),
            longitud: toNumberOrNull(row.longitud_deteccion)
        } : null,
        coordenada_torre: row.torre_tiene_coordenadas === true ? {
            latitud: toNumberOrNull(row.torre_latitud),
            longitud: toNumberOrNull(row.torre_longitud)
        } : null,
        estatus: {
            id_estatus_alertamiento: row.id_estatus_alertamiento,
            nombre_estatus: row.nombre_estatus,
            orden_flujo: row.orden_flujo
        },
        torre: {
            id_torre: row.id_torre,
            nombre_torre: row.nombre_torre,
            codigo_torre: row.codigo_torre,
            activo: row.torre_activa === true
        },
        estado: {
            id_estado: row.id_estado,
            nombre_estado: row.nombre_estado,
            abreviatura: row.abreviatura_estado,
            activo: row.estado_activo === true
        },
        central: {
            id_central: row.id_central,
            nombre_central: row.nombre_central,
            id_estado_sede: row.id_estado_sede,
            nombre_estado_sede: row.nombre_estado_sede,
            activo: row.central_activa === true
        },
        region: {
            id_region: row.id_region,
            nombre_region: row.nombre_region,
            activo: row.region_activa === true
        },
        territorio: row.id_territorio ? {
            id_territorio: row.id_territorio,
            nombre_territorio: row.nombre_territorio,
            activo: row.territorio_activo === true
        } : null
    };
}

async function listVisibleTorres(filters, userContext) {
    const clauses = [];
    const params = [];

    applyVisibilityClauses(clauses, params, userContext);
    applyCommonFilters(clauses, params, filters);

    const result = await query(`
        SELECT
            t.id_torre,
            t.nombre_torre,
            t.codigo_torre,
            t.latitud,
            t.longitud,
            t.activo AS torre_activa,
            ${TORRE_HAS_COORDINATES_SQL} AS torre_tiene_coordenadas,
            e.id_estado,
            e.nombre_estado,
            e.abreviatura AS abreviatura_estado,
            e.activo AS estado_activo,
            c.id_central,
            c.nombre_central,
            c.id_estado_sede,
            esede.nombre_estado AS nombre_estado_sede,
            c.activo AS central_activa,
            r.id_region,
            r.nombre_region,
            r.activo AS region_activa,
            te.id_territorio,
            toper.nombre_territorio,
            toper.activo AS territorio_activo
        ${TORRES_FROM_CLAUSE}
        ${buildWhereClause(clauses)}
        ORDER BY t.nombre_torre ASC, t.id_torre ASC
    `, params);

    return result.rows.map(mapTorreRow);
}

async function summarizeAlertamientos(filters, userContext) {
    const clauses = [];
    const params = [];

    applyVisibilityClauses(clauses, params, userContext);
    applyCommonFilters(clauses, params, filters);
    applyAlertamientoFilters(clauses, params, filters);

    const result = await query(`
        SELECT
            COUNT(*)::INT AS total_alertamientos,
            COUNT(*) FILTER (WHERE ${ALERTAMIENTO_HAS_COORDINATES_SQL})::INT AS con_coordenadas_propias,
            COUNT(*) FILTER (
                WHERE NOT ${ALERTAMIENTO_HAS_COORDINATES_SQL}
                  AND ${TORRE_HAS_COORDINATES_SQL}
            )::INT AS con_fallback_torre,
            COUNT(*) FILTER (
                WHERE NOT ${ALERTAMIENTO_HAS_COORDINATES_SQL}
                  AND NOT ${TORRE_HAS_COORDINATES_SQL}
            )::INT AS sin_coordenadas
        ${ALERTAMIENTOS_FROM_CLAUSE}
        ${buildWhereClause(clauses)}
    `, params);

    return result.rows[0] || {
        total_alertamientos: 0,
        con_coordenadas_propias: 0,
        con_fallback_torre: 0,
        sin_coordenadas: 0
    };
}

async function listVisibleAlertamientos(filters, userContext) {
    const clauses = [];
    const params = [];

    applyVisibilityClauses(clauses, params, userContext);
    applyCommonFilters(clauses, params, filters);
    applyAlertamientoFilters(clauses, params, filters);

    const result = await query(`
        SELECT
            a.id_alertamiento,
            a.folio_alertamiento,
            a.placa_detectada,
            a.fecha_hora_deteccion,
            a.origen_registro,
            a.latitud_deteccion,
            a.longitud_deteccion,
            t.latitud AS torre_latitud,
            t.longitud AS torre_longitud,
            ${ALERTAMIENTO_HAS_COORDINATES_SQL} AS alertamiento_tiene_coordenadas,
            ${TORRE_HAS_COORDINATES_SQL} AS torre_tiene_coordenadas,
            CASE
                WHEN ${ALERTAMIENTO_HAS_COORDINATES_SQL} THEN a.latitud_deteccion
                WHEN ${TORRE_HAS_COORDINATES_SQL} THEN t.latitud
                ELSE NULL
            END AS latitud_mapa,
            CASE
                WHEN ${ALERTAMIENTO_HAS_COORDINATES_SQL} THEN a.longitud_deteccion
                WHEN ${TORRE_HAS_COORDINATES_SQL} THEN t.longitud
                ELSE NULL
            END AS longitud_mapa,
            CASE
                WHEN ${ALERTAMIENTO_HAS_COORDINATES_SQL} THEN 'ALERTAMIENTO'
                WHEN ${TORRE_HAS_COORDINATES_SQL} THEN 'TORRE'
                ELSE 'SIN_COORDENADAS'
            END AS fuente_coordenada,
            ea.id_estatus_alertamiento,
            ea.nombre_estatus,
            ea.orden_flujo,
            t.id_torre,
            t.nombre_torre,
            t.codigo_torre,
            t.activo AS torre_activa,
            e.id_estado,
            e.nombre_estado,
            e.abreviatura AS abreviatura_estado,
            e.activo AS estado_activo,
            c.id_central,
            c.nombre_central,
            c.id_estado_sede,
            esede.nombre_estado AS nombre_estado_sede,
            c.activo AS central_activa,
            r.id_region,
            r.nombre_region,
            r.activo AS region_activa,
            te.id_territorio,
            toper.nombre_territorio,
            toper.activo AS territorio_activo
        ${ALERTAMIENTOS_FROM_CLAUSE}
        ${buildWhereClause(clauses)}
        ORDER BY a.fecha_hora_deteccion DESC, a.id_alertamiento DESC
        LIMIT $${params.length + 1}
    `, [...params, filters.limit]);

    return result.rows.map(mapAlertamientoRow);
}

function buildResumen(torres, alertamientos, alertamientosSummary, filters) {
    const totalAlertamientos = alertamientosSummary.total_alertamientos || 0;

    return {
        total_torres_visibles: torres.length,
        torres_con_coordenadas: torres.filter((torre) => torre.tiene_coordenadas).length,
        torres_sin_coordenadas: torres.filter((torre) => !torre.tiene_coordenadas).length,
        total_alertamientos_filtrados: totalAlertamientos,
        total_alertamientos_devuelto: alertamientos.length,
        alertamientos_con_coordenadas_propias: alertamientosSummary.con_coordenadas_propias || 0,
        alertamientos_con_fallback_torre: alertamientosSummary.con_fallback_torre || 0,
        alertamientos_sin_coordenadas: alertamientosSummary.sin_coordenadas || 0,
        limite_alertamientos: filters.limit,
        limite_excedido: totalAlertamientos > alertamientos.length
    };
}

async function getMapaData(options) {
    const filters = normalizeMapaFilters(options.queryParams || {});
    const visibilityContext = getUserVisibilityContext(options.userContext);
    const [torres, alertamientosSummary, alertamientos] = await Promise.all([
        listVisibleTorres(filters, options.userContext),
        summarizeAlertamientos(filters, options.userContext),
        listVisibleAlertamientos(filters, options.userContext)
    ]);

    return {
        filters,
        visibilidad: mapVisibilityContext(visibilityContext),
        resumen: buildResumen(torres, alertamientos, alertamientosSummary, filters),
        torres,
        alertamientos
    };
}

module.exports = {
    getMapaData
};
