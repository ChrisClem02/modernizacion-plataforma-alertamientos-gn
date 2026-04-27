const { query } = require('../../config/db');
const { createHttpError } = require('../../middlewares/error.middleware');

const ESTADOS_BASE_QUERY = `
    SELECT
        e.id_estado,
        e.nombre_estado,
        e.abreviatura,
        e.activo
    FROM estado e
`;

const TERRITORIOS_BASE_QUERY = `
    SELECT
        t.id_territorio,
        t.nombre_territorio,
        t.descripcion,
        t.activo
    FROM territorio_operativo t
`;

// La consulta de torres agrega central, region, estado y territorio para que
// el frontend futuro pueda poblar selectores sin hacer joins en el cliente.
const TORRES_BASE_QUERY = `
    SELECT
        tor.id_torre,
        tor.nombre_torre,
        tor.codigo_torre,
        tor.activo AS torre_activa,
        c.id_central,
        c.nombre_central,
        c.activo AS central_activa,
        r.id_region,
        r.nombre_region,
        r.activo AS region_activa,
        e.id_estado,
        e.nombre_estado,
        e.abreviatura,
        e.activo AS estado_activo,
        te.id_territorio,
        toper.nombre_territorio,
        toper.activo AS territorio_activo
    FROM torre_tidv tor
    JOIN central_operativa c
      ON c.id_central = tor.id_central
    JOIN region_operativa r
      ON r.id_region = c.id_region
    JOIN estado e
      ON e.id_estado = tor.id_estado
    LEFT JOIN territorio_estado te
      ON te.id_estado = e.id_estado
     AND te.activo = TRUE
    LEFT JOIN territorio_operativo toper
      ON toper.id_territorio = te.id_territorio
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

function normalizeSearch(rawValue) {
    if (typeof rawValue !== 'string') {
        return null;
    }

    const normalizedValue = rawValue.trim();
    return normalizedValue || null;
}

function appendClause(clauses, params, sqlFragment, value) {
    params.push(value);
    clauses.push(`${sqlFragment} $${params.length}`);
}

function buildWhereClause(clauses) {
    if (clauses.length === 0) {
        return '';
    }

    return `WHERE ${clauses.join('\n          AND ')}`;
}

function normalizeCommonFilters(queryParams) {
    const activeFilter = parseBooleanValue(queryParams.activo, 'activo');

    return {
        search: normalizeSearch(queryParams.search),
        activo: activeFilter === null ? true : activeFilter
    };
}

function normalizeTorreFilters(queryParams) {
    return {
        ...normalizeCommonFilters(queryParams),
        id_estado: parsePositiveInteger(queryParams.id_estado, 'id_estado'),
        id_territorio: parsePositiveInteger(queryParams.id_territorio, 'id_territorio')
    };
}

function mapEstadoRow(row) {
    return {
        id_estado: row.id_estado,
        nombre_estado: row.nombre_estado,
        abreviatura: row.abreviatura,
        activo: row.activo === true
    };
}

function mapTerritorioRow(row) {
    return {
        id_territorio: row.id_territorio,
        nombre_territorio: row.nombre_territorio,
        descripcion: row.descripcion,
        activo: row.activo === true
    };
}

function mapTorreRow(row) {
    return {
        id_torre: row.id_torre,
        nombre_torre: row.nombre_torre,
        codigo_torre: row.codigo_torre,
        activo: row.torre_activa === true,
        central: {
            id_central: row.id_central,
            nombre_central: row.nombre_central,
            activo: row.central_activa === true
        },
        region: {
            id_region: row.id_region,
            nombre_region: row.nombre_region,
            activo: row.region_activa === true
        },
        estado: {
            id_estado: row.id_estado,
            nombre_estado: row.nombre_estado,
            abreviatura: row.abreviatura,
            activo: row.estado_activo === true
        },
        territorio: row.id_territorio ? {
            id_territorio: row.id_territorio,
            nombre_territorio: row.nombre_territorio,
            activo: row.territorio_activo === true
        } : null
    };
}

async function listEstados(queryParams) {
    const filters = normalizeCommonFilters(queryParams);
    const clauses = [];
    const params = [];

    if (filters.search) {
        params.push(`%${filters.search}%`);
        clauses.push(`(
            e.nombre_estado ILIKE $${params.length}
            OR e.abreviatura ILIKE $${params.length}
        )`);
    }

    appendClause(clauses, params, 'e.activo =', filters.activo);

    const result = await query(`
        ${ESTADOS_BASE_QUERY}
        ${buildWhereClause(clauses)}
        ORDER BY e.nombre_estado ASC, e.id_estado ASC
    `, params);

    return {
        filters,
        data: result.rows.map(mapEstadoRow)
    };
}

async function listTerritorios(queryParams) {
    const filters = normalizeCommonFilters(queryParams);
    const clauses = [];
    const params = [];

    if (filters.search) {
        params.push(`%${filters.search}%`);
        clauses.push(`(
            t.nombre_territorio ILIKE $${params.length}
            OR COALESCE(t.descripcion, '') ILIKE $${params.length}
        )`);
    }

    appendClause(clauses, params, 't.activo =', filters.activo);

    const result = await query(`
        ${TERRITORIOS_BASE_QUERY}
        ${buildWhereClause(clauses)}
        ORDER BY t.nombre_territorio ASC, t.id_territorio ASC
    `, params);

    return {
        filters,
        data: result.rows.map(mapTerritorioRow)
    };
}

async function listTorres(queryParams) {
    const filters = normalizeTorreFilters(queryParams);
    const clauses = [];
    const params = [];

    if (filters.search) {
        params.push(`%${filters.search}%`);
        clauses.push(`(
            tor.nombre_torre ILIKE $${params.length}
            OR COALESCE(tor.codigo_torre, '') ILIKE $${params.length}
            OR c.nombre_central ILIKE $${params.length}
            OR e.nombre_estado ILIKE $${params.length}
            OR COALESCE(toper.nombre_territorio, '') ILIKE $${params.length}
        )`);
    }

    if (filters.id_estado !== null) {
        appendClause(clauses, params, 'e.id_estado =', filters.id_estado);
    }

    if (filters.id_territorio !== null) {
        appendClause(clauses, params, 'te.id_territorio =', filters.id_territorio);
    }

    if (filters.activo === true) {
        appendClause(clauses, params, 'tor.activo =', true);
        appendClause(clauses, params, 'c.activo =', true);
        appendClause(clauses, params, 'r.activo =', true);
        appendClause(clauses, params, 'e.activo =', true);
    } else {
        clauses.push('('
            + 'tor.activo = FALSE'
            + ' OR c.activo = FALSE'
            + ' OR r.activo = FALSE'
            + ' OR e.activo = FALSE'
            + ')');
    }

    const result = await query(`
        ${TORRES_BASE_QUERY}
        ${buildWhereClause(clauses)}
        ORDER BY tor.nombre_torre ASC, tor.id_torre ASC
    `, params);

    return {
        filters,
        data: result.rows.map(mapTorreRow)
    };
}

module.exports = {
    listEstados,
    listTerritorios,
    listTorres
};
