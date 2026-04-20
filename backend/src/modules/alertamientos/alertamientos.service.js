const { pool, query } = require('../../config/db');
const { createHttpError } = require('../../middlewares/error.middleware');

// El listado se apoya en la vista historica porque ya concentra el contexto
// operativo y territorial del alertamiento sin duplicar joins en cada consulta.
const ALERTAMIENTOS_LIST_FROM_CLAUSE = `
    FROM vw_alertamiento_contexto v
    JOIN estatus_alertamiento ea
      ON ea.id_estatus_alertamiento = v.id_estatus_alertamiento
`;

// El detalle necesita complementar la vista con columnas propias del registro
// operativo, como origen, observaciones y datos de ubicacion.
const ALERTAMIENTO_DETAIL_BASE_QUERY = `
    SELECT
        v.id_alertamiento,
        v.folio_alertamiento,
        v.placa_detectada,
        v.fecha_hora_deteccion,
        v.id_estatus_alertamiento,
        ea.nombre_estatus,
        ea.orden_flujo,
        a.id_usuario_creador,
        a.latitud_deteccion,
        a.longitud_deteccion,
        a.carril,
        a.sentido_vial,
        a.origen_registro,
        a.observaciones,
        a.fecha_creacion,
        a.fecha_actualizacion,
        uc.nombre_usuario AS nombre_usuario_creador,
        uc.nombres AS creador_nombres,
        uc.apellido_paterno AS creador_apellido_paterno,
        uc.apellido_materno AS creador_apellido_materno,
        v.id_torre,
        v.nombre_torre,
        v.torre_activa,
        v.id_central,
        v.nombre_central,
        v.id_estado_sede,
        v.nombre_estado_sede,
        v.central_activa,
        v.id_region,
        v.nombre_region,
        v.region_activa,
        v.id_estado,
        v.nombre_estado,
        v.estado_activo,
        v.id_territorio,
        v.nombre_territorio,
        v.territorio_activo
    FROM vw_alertamiento_contexto v
    JOIN alertamiento_vehicular a
      ON a.id_alertamiento = v.id_alertamiento
    JOIN estatus_alertamiento ea
      ON ea.id_estatus_alertamiento = v.id_estatus_alertamiento
    LEFT JOIN usuario uc
      ON uc.id_usuario = a.id_usuario_creador
`;

const ALERTAMIENTO_HISTORIAL_QUERY = `
    SELECT
        h.id_historial_alertamiento,
        h.id_alertamiento,
        h.id_estatus_alertamiento,
        ea.nombre_estatus,
        ea.orden_flujo,
        h.id_usuario,
        u.nombre_usuario,
        u.nombres,
        u.apellido_paterno,
        u.apellido_materno,
        h.observaciones,
        h.fecha_evento
    FROM historial_alertamiento h
    JOIN estatus_alertamiento ea
      ON ea.id_estatus_alertamiento = h.id_estatus_alertamiento
    LEFT JOIN usuario u
      ON u.id_usuario = h.id_usuario
    WHERE h.id_alertamiento = $1
    ORDER BY h.fecha_evento ASC, h.id_historial_alertamiento ASC
`;

// El estatus inicial no se hardcodea desde Node: se resuelve por nombre en el
// catalogo congelado para mantener la semantica institucional en PostgreSQL.
const ESTATUS_DETECTADO_QUERY = `
    SELECT id_estatus_alertamiento
    FROM estatus_alertamiento
    WHERE nombre_estatus = 'DETECTADO'
    ORDER BY id_estatus_alertamiento
    LIMIT 1
`;

// Esta consulta resuelve la torre destino junto con su contexto operativo y
// territorial vigente. Se usa para autorizar el alta manual antes del INSERT.
const TORRE_CONTEXT_FOR_INSERT_QUERY = `
    SELECT
        t.id_torre,
        t.nombre_torre,
        t.codigo_torre,
        t.id_estado,
        e.nombre_estado,
        te.id_territorio,
        toper.nombre_territorio,
        c.id_central,
        c.nombre_central,
        r.id_region,
        r.nombre_region
    FROM torre_tidv t
    JOIN central_operativa c
      ON c.id_central = t.id_central
    JOIN region_operativa r
      ON r.id_region = c.id_region
    JOIN estado e
      ON e.id_estado = t.id_estado
    LEFT JOIN territorio_estado te
      ON te.id_estado = e.id_estado
     AND te.activo = TRUE
    LEFT JOIN territorio_operativo toper
      ON toper.id_territorio = te.id_territorio
    WHERE t.id_torre = $1
      AND t.activo = TRUE
      AND c.activo = TRUE
      AND r.activo = TRUE
    LIMIT 1
`;

const INSERT_MANUAL_ALERTAMIENTO_QUERY = `
    INSERT INTO alertamiento_vehicular (
        id_torre,
        id_estatus_alertamiento,
        id_usuario_creador,
        placa_detectada,
        fecha_hora_deteccion,
        latitud_deteccion,
        longitud_deteccion,
        carril,
        sentido_vial,
        origen_registro,
        observaciones
    )
    VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, 'MANUAL', $10
    )
    RETURNING id_alertamiento
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

function normalizePlate(rawValue) {
    if (typeof rawValue !== 'string') {
        return null;
    }

    const normalizedValue = rawValue.trim().toUpperCase();
    return normalizedValue ? normalizedValue : null;
}

function normalizeRequiredPlate(rawValue) {
    const normalizedValue = normalizePlate(rawValue);

    if (!normalizedValue) {
        throw createHttpError(400, 'placa_detectada es obligatoria.');
    }

    return normalizedValue;
}

function parseTimestampFilter(rawValue, fieldName, mode) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
        return null;
    }

    // Si solo llega YYYY-MM-DD, se fuerza inicio o fin del dia para que el
    // filtro sea intuitivo desde Postman, curl o un futuro frontend.
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

function parseRequiredDetectionTimestamp(rawValue, fieldName) {
    if (typeof rawValue !== 'string' || rawValue.trim() === '') {
        throw createHttpError(400, `${fieldName} es obligatorio.`);
    }

    const normalizedValue = rawValue.trim();

    // Para altas manuales conviene exigir fecha y hora, no solo fecha, para no
    // perder precision operativa en el registro inicial.
    if (!/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(normalizedValue)) {
        throw createHttpError(400, `${fieldName} debe incluir fecha y hora validas.`);
    }

    const parsedDate = new Date(normalizedValue);

    if (Number.isNaN(parsedDate.getTime())) {
        throw createHttpError(400, `${fieldName} debe ser una fecha valida.`);
    }

    return normalizedValue;
}

function parseOptionalCoordinate(rawValue, fieldName, minValue, maxValue) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
        return null;
    }

    const numericValue = Number.parseFloat(rawValue);

    if (Number.isNaN(numericValue)) {
        throw createHttpError(400, `${fieldName} debe ser numerico.`);
    }

    if (numericValue < minValue || numericValue > maxValue) {
        throw createHttpError(400, `${fieldName} debe estar entre ${minValue} y ${maxValue}.`);
    }

    return numericValue;
}

function normalizeOptionalText(rawValue, fieldName, maxLength) {
    if (rawValue === undefined || rawValue === null) {
        return null;
    }

    if (typeof rawValue !== 'string') {
        throw createHttpError(400, `${fieldName} debe ser texto.`);
    }

    const normalizedValue = rawValue.trim();

    if (normalizedValue === '') {
        return null;
    }

    if (normalizedValue.length > maxLength) {
        throw createHttpError(400, `${fieldName} no puede exceder ${maxLength} caracteres.`);
    }

    return normalizedValue;
}

function parsePagination(queryParams) {
    const page = parsePositiveInteger(queryParams.page, 'page') || 1;
    const limit = parsePositiveInteger(queryParams.limit, 'limit') || 20;
    const normalizedLimit = Math.min(limit, 100);

    return {
        page,
        limit: normalizedLimit,
        offset: (page - 1) * normalizedLimit
    };
}

function parseAlertamientosFilters(queryParams) {
    const filters = {
        fecha_inicio: parseTimestampFilter(queryParams.fecha_inicio, 'fecha_inicio', 'start'),
        fecha_fin: parseTimestampFilter(queryParams.fecha_fin, 'fecha_fin', 'end'),
        placa: normalizePlate(queryParams.placa),
        id_torre: parsePositiveInteger(queryParams.id_torre, 'id_torre'),
        id_estatus_alertamiento: parsePositiveInteger(queryParams.id_estatus_alertamiento, 'id_estatus_alertamiento'),
        id_region: parsePositiveInteger(queryParams.id_region, 'id_region'),
        id_estado: parsePositiveInteger(queryParams.id_estado, 'id_estado'),
        id_territorio: parsePositiveInteger(queryParams.id_territorio, 'id_territorio')
    };

    if (filters.fecha_inicio && filters.fecha_fin && filters.fecha_inicio > filters.fecha_fin) {
        throw createHttpError(400, 'fecha_inicio no puede ser mayor que fecha_fin.');
    }

    return filters;
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

function normalizeManualAlertamientoPayload(payload) {
    return {
        id_torre: parseRequiredPositiveInteger(payload.id_torre, 'id_torre'),
        placa_detectada: normalizeRequiredPlate(payload.placa_detectada),
        fecha_hora_deteccion: parseRequiredDetectionTimestamp(
            payload.fecha_hora_deteccion,
            'fecha_hora_deteccion'
        ),
        latitud_deteccion: parseOptionalCoordinate(
            payload.latitud_deteccion,
            'latitud_deteccion',
            -90,
            90
        ),
        longitud_deteccion: parseOptionalCoordinate(
            payload.longitud_deteccion,
            'longitud_deteccion',
            -180,
            180
        ),
        carril: normalizeOptionalText(payload.carril, 'carril', 20),
        sentido_vial: normalizeOptionalText(payload.sentido_vial, 'sentido_vial', 20),
        observaciones: normalizeOptionalText(payload.observaciones, 'observaciones', 500)
    };
}

function appendClause(clauses, params, sqlExpression, value) {
    params.push(value);
    clauses.push(`${sqlExpression} $${params.length}`);
}

function assertRegistrationVisibilityForTower(userContext, towerContext) {
    const visibilityContext = getUserVisibilityContext(userContext);

    if (visibilityContext.nivel_operativo === 'NACIONAL') {
        return towerContext;
    }

    if (visibilityContext.nivel_operativo === 'TORRE') {
        if (Number(towerContext.id_torre) === Number(visibilityContext.ambito.referencia?.id_torre)) {
            return towerContext;
        }

        throw createHttpError(
            403,
            'El usuario autenticado no tiene visibilidad para registrar alertamientos sobre la torre indicada.'
        );
    }

    if (visibilityContext.nivel_operativo === 'ESTATAL') {
        if (Number(towerContext.id_estado) === Number(visibilityContext.ambito.referencia?.id_estado)) {
            return towerContext;
        }

        throw createHttpError(
            403,
            'El usuario autenticado no tiene visibilidad para registrar alertamientos sobre la torre indicada.'
        );
    }

    if (visibilityContext.nivel_operativo === 'TERRITORIAL') {
        if (Number(towerContext.id_territorio) === Number(visibilityContext.ambito.referencia?.id_territorio)) {
            return towerContext;
        }

        throw createHttpError(
            403,
            'El usuario autenticado no tiene visibilidad para registrar alertamientos sobre la torre indicada.'
        );
    }

    throw createHttpError(403, 'El nivel operativo del usuario no es reconocido por el modulo de alertamientos.');
}

async function getDetectedStatusId(client) {
    const result = await client.query(ESTATUS_DETECTADO_QUERY);

    if (result.rowCount === 0) {
        throw createHttpError(
            500,
            'No fue posible resolver el estatus inicial DETECTADO desde el catalogo institucional.'
        );
    }

    return result.rows[0].id_estatus_alertamiento;
}

async function getOperativeTowerContextById(client, towerId) {
    const result = await client.query(TORRE_CONTEXT_FOR_INSERT_QUERY, [towerId]);

    if (result.rowCount === 0) {
        throw createHttpError(404, 'La torre indicada no existe o no se encuentra operativa.');
    }

    return result.rows[0];
}

function applyVisibilityClauses(clauses, params, userContext) {
    const visibilityContext = getUserVisibilityContext(userContext);

    if (visibilityContext.nivel_operativo === 'TORRE') {
        appendClause(clauses, params, 'v.id_torre =', visibilityContext.ambito.referencia?.id_torre);
        return visibilityContext;
    }

    if (visibilityContext.nivel_operativo === 'ESTATAL') {
        appendClause(clauses, params, 'v.id_estado =', visibilityContext.ambito.referencia?.id_estado);
        return visibilityContext;
    }

    if (visibilityContext.nivel_operativo === 'TERRITORIAL') {
        appendClause(clauses, params, 'v.id_territorio =', visibilityContext.ambito.referencia?.id_territorio);
        return visibilityContext;
    }

    if (visibilityContext.nivel_operativo === 'NACIONAL') {
        return visibilityContext;
    }

    throw createHttpError(403, 'El nivel operativo del usuario no es reconocido por el modulo de alertamientos.');
}

function applyFilterClauses(clauses, params, filters, visibilityContext) {
    if (filters.fecha_inicio) {
        appendClause(clauses, params, 'v.fecha_hora_deteccion >=', filters.fecha_inicio);
    }

    if (filters.fecha_fin) {
        appendClause(clauses, params, 'v.fecha_hora_deteccion <=', filters.fecha_fin);
    }

    if (filters.placa) {
        params.push(`%${filters.placa}%`);
        clauses.push(`v.placa_detectada ILIKE $${params.length}`);
    }

    if (filters.id_torre) {
        appendClause(clauses, params, 'v.id_torre =', filters.id_torre);
    }

    if (filters.id_estatus_alertamiento) {
        appendClause(clauses, params, 'v.id_estatus_alertamiento =', filters.id_estatus_alertamiento);
    }

    if (filters.id_region) {
        appendClause(clauses, params, 'v.id_region =', filters.id_region);
    }

    if (filters.id_estado) {
        appendClause(clauses, params, 'v.id_estado =', filters.id_estado);
    }

    if (filters.id_territorio) {
        if (visibilityContext.nivel_operativo === 'TORRE' || visibilityContext.nivel_operativo === 'ESTATAL') {
            throw createHttpError(
                400,
                'id_territorio solo puede usarse cuando la visibilidad institucional del usuario lo permita.'
            );
        }

        appendClause(clauses, params, 'v.id_territorio =', filters.id_territorio);
    }
}

function buildWhereClause(clauses) {
    return clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
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

function buildCreatorFullName(row) {
    return [
        row.creador_nombres,
        row.creador_apellido_paterno,
        row.creador_apellido_materno
    ].filter(Boolean).join(' ');
}

function mapAlertamientoListRow(row) {
    return {
        id_alertamiento: row.id_alertamiento,
        folio_alertamiento: row.folio_alertamiento,
        placa_detectada: row.placa_detectada,
        fecha_hora_deteccion: row.fecha_hora_deteccion,
        estatus: {
            id_estatus_alertamiento: row.id_estatus_alertamiento,
            nombre_estatus: row.nombre_estatus
        },
        torre: {
            id_torre: row.id_torre,
            nombre_torre: row.nombre_torre,
            activa: row.torre_activa
        },
        central: {
            id_central: row.id_central,
            nombre_central: row.nombre_central,
            activa: row.central_activa
        },
        region: {
            id_region: row.id_region,
            nombre_region: row.nombre_region,
            activa: row.region_activa
        },
        estado: {
            id_estado: row.id_estado,
            nombre_estado: row.nombre_estado,
            activa: row.estado_activo
        },
        territorio: row.id_territorio ? {
            id_territorio: row.id_territorio,
            nombre_territorio: row.nombre_territorio,
            activo: row.territorio_activo
        } : null
    };
}

function mapAlertamientoDetailRow(row) {
    return {
        id_alertamiento: row.id_alertamiento,
        folio_alertamiento: row.folio_alertamiento,
        placa_detectada: row.placa_detectada,
        fecha_hora_deteccion: row.fecha_hora_deteccion,
        estatus: {
            id_estatus_alertamiento: row.id_estatus_alertamiento,
            nombre_estatus: row.nombre_estatus,
            orden_flujo: row.orden_flujo
        },
        origen_registro: row.origen_registro,
        observaciones: row.observaciones,
        ubicacion_deteccion: {
            latitud_deteccion: row.latitud_deteccion,
            longitud_deteccion: row.longitud_deteccion,
            carril: row.carril,
            sentido_vial: row.sentido_vial
        },
        fechas_control: {
            fecha_creacion: row.fecha_creacion,
            fecha_actualizacion: row.fecha_actualizacion
        },
        usuario_creador: row.id_usuario_creador ? {
            id_usuario: row.id_usuario_creador,
            nombre_usuario: row.nombre_usuario_creador,
            nombre_completo: buildCreatorFullName(row)
        } : null,
        contexto_operativo: {
            torre: {
                id_torre: row.id_torre,
                nombre_torre: row.nombre_torre,
                activa: row.torre_activa
            },
            central: {
                id_central: row.id_central,
                nombre_central: row.nombre_central,
                id_estado_sede: row.id_estado_sede,
                nombre_estado_sede: row.nombre_estado_sede,
                activa: row.central_activa
            },
            region: {
                id_region: row.id_region,
                nombre_region: row.nombre_region,
                activa: row.region_activa
            },
            estado_operativo: {
                id_estado: row.id_estado,
                nombre_estado: row.nombre_estado,
                activa: row.estado_activo
            },
            territorio: row.id_territorio ? {
                id_territorio: row.id_territorio,
                nombre_territorio: row.nombre_territorio,
                activo: row.territorio_activo
            } : null
        }
    };
}

function mapHistorialRow(row) {
    return {
        id_historial_alertamiento: row.id_historial_alertamiento,
        id_alertamiento: row.id_alertamiento,
        estatus: {
            id_estatus_alertamiento: row.id_estatus_alertamiento,
            nombre_estatus: row.nombre_estatus,
            orden_flujo: row.orden_flujo
        },
        usuario: row.id_usuario ? {
            id_usuario: row.id_usuario,
            nombre_usuario: row.nombre_usuario,
            nombre_completo: buildFullName(row)
        } : null,
        observaciones: row.observaciones,
        fecha_evento: row.fecha_evento
    };
}

async function listAlertamientos(options) {
    const filters = parseAlertamientosFilters(options.filters || {});
    const pagination = parsePagination(options.pagination || {});
    const clauses = [];
    const params = [];
    const visibilityContext = applyVisibilityClauses(clauses, params, options.userContext);

    applyFilterClauses(clauses, params, filters, visibilityContext);

    const whereClause = buildWhereClause(clauses);
    const countQuery = `
        SELECT COUNT(*)::INT AS total_items
        ${ALERTAMIENTOS_LIST_FROM_CLAUSE}
        ${whereClause}
    `;

    const dataQuery = `
        SELECT
            v.id_alertamiento,
            v.folio_alertamiento,
            v.placa_detectada,
            v.fecha_hora_deteccion,
            v.id_estatus_alertamiento,
            ea.nombre_estatus,
            v.id_torre,
            v.nombre_torre,
            v.torre_activa,
            v.id_central,
            v.nombre_central,
            v.central_activa,
            v.id_region,
            v.nombre_region,
            v.region_activa,
            v.id_estado,
            v.nombre_estado,
            v.estado_activo,
            v.id_territorio,
            v.nombre_territorio,
            v.territorio_activo
        ${ALERTAMIENTOS_LIST_FROM_CLAUSE}
        ${whereClause}
        ORDER BY v.fecha_hora_deteccion DESC, v.id_alertamiento DESC
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
        data: dataResult.rows.map(mapAlertamientoListRow)
    };
}

async function getVisibleAlertamientoDetailById(alertamientoId, userContext) {
    const numericAlertamientoId = parsePositiveInteger(alertamientoId, 'id');
    const clauses = [];
    const params = [];

    applyVisibilityClauses(clauses, params, userContext);
    appendClause(clauses, params, 'v.id_alertamiento =', numericAlertamientoId);

    const result = await query(`
        ${ALERTAMIENTO_DETAIL_BASE_QUERY}
        ${buildWhereClause(clauses)}
        LIMIT 1
    `, params);

    if (result.rowCount === 0) {
        throw createHttpError(404, 'El alertamiento solicitado no existe o no es visible para el usuario autenticado.');
    }

    return mapAlertamientoDetailRow(result.rows[0]);
}

async function getVisibleAlertamientoHistorialById(alertamientoId, userContext) {
    // Primero se valida visibilidad con la misma regla del detalle para evitar
    // que el historial exponga ids validos fuera del ambito institucional.
    const detail = await getVisibleAlertamientoDetailById(alertamientoId, userContext);
    const result = await query(ALERTAMIENTO_HISTORIAL_QUERY, [detail.id_alertamiento]);

    return {
        alertamiento: {
            id_alertamiento: detail.id_alertamiento,
            folio_alertamiento: detail.folio_alertamiento,
            placa_detectada: detail.placa_detectada
        },
        data: result.rows.map(mapHistorialRow)
    };
}

async function createManualAlertamiento(payload, userContext) {
    const normalizedPayload = normalizeManualAlertamientoPayload(payload || {});
    const creatorUserId = parseRequiredPositiveInteger(userContext?.id_usuario, 'id_usuario_autenticado');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // El contexto se propaga directo desde esta transaccion para que los
        // triggers de historial y auditoria registren al usuario autenticado.
        await client.query(
            'SELECT set_config($1, $2, true)',
            ['app.current_user_id', String(creatorUserId)]
        );

        const detectedStatusId = await getDetectedStatusId(client);
        const towerContext = await getOperativeTowerContextById(client, normalizedPayload.id_torre);

        // La autorizacion se hace contra la torre destino antes del INSERT. De
        // este modo el backend no depende de que el usuario "se porte bien".
        assertRegistrationVisibilityForTower(userContext, towerContext);

        const insertResult = await client.query(INSERT_MANUAL_ALERTAMIENTO_QUERY, [
            normalizedPayload.id_torre,
            detectedStatusId,
            creatorUserId,
            normalizedPayload.placa_detectada,
            normalizedPayload.fecha_hora_deteccion,
            normalizedPayload.latitud_deteccion,
            normalizedPayload.longitud_deteccion,
            normalizedPayload.carril,
            normalizedPayload.sentido_vial,
            normalizedPayload.observaciones
        ]);

        await client.query('COMMIT');

        const createdAlertamientoId = insertResult.rows[0].id_alertamiento;
        const detail = await getVisibleAlertamientoDetailById(createdAlertamientoId, userContext);

        return {
            message: 'Alertamiento manual registrado correctamente.',
            data: detail
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    listAlertamientos,
    getVisibleAlertamientoDetailById,
    getVisibleAlertamientoHistorialById,
    createManualAlertamiento
};
