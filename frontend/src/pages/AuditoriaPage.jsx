import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { getBitacoraAuditoriaRequest } from '../api/auditoria.api';

const EMPTY_FILTER_FORM = {
    fecha_inicio: '',
    fecha_fin: '',
    nombre_tabla: '',
    evento: '',
    id_registro: '',
    usuario: ''
};

const EVENT_OPTIONS = [
    { value: 'INSERT', label: 'Alta o registro nuevo' },
    { value: 'UPDATE', label: 'Actualizacion o cambio' },
    { value: 'DELETE', label: 'Eliminacion o baja tecnica' }
];

const TABLE_OPTIONS = [
    { value: 'usuario', label: 'Usuarios' },
    { value: 'usuario_ambito', label: 'Ambitos de usuario' },
    { value: 'alertamiento_vehicular', label: 'Alertamientos' },
    { value: 'torre_tidv', label: 'Torres TIDV' },
    { value: 'central_operativa', label: 'Centrales operativas' }
];

const INITIAL_RESPONSE = {
    filters: null,
    pagination: null,
    data: []
};

function getApiErrorMessage(error, fallbackMessage) {
    return error?.response?.data?.message || fallbackMessage;
}

function createFiltersFromSearchParams(searchParams) {
    return {
        fecha_inicio: searchParams.get('fecha_inicio') || '',
        fecha_fin: searchParams.get('fecha_fin') || '',
        nombre_tabla: searchParams.get('nombre_tabla') || '',
        evento: searchParams.get('evento') || '',
        id_registro: searchParams.get('id_registro') || '',
        usuario: searchParams.get('usuario') || ''
    };
}

function buildRequestParams(searchParams) {
    const requestParams = {};

    searchParams.forEach((value, key) => {
        if (value !== '') {
            requestParams[key] = value;
        }
    });

    if (!requestParams.page) {
        requestParams.page = '1';
    }

    if (!requestParams.limit) {
        requestParams.limit = '10';
    }

    return requestParams;
}

function formatDateTimeParts(value) {
    if (!value) {
        return {
            date: 'Sin fecha',
            time: 'Sin hora'
        };
    }

    const date = new Date(value);

    return {
        date: new Intl.DateTimeFormat('es-MX', {
            dateStyle: 'medium'
        }).format(date),
        time: new Intl.DateTimeFormat('es-MX', {
            timeStyle: 'short'
        }).format(date)
    };
}

function AuditDateTime({ value }) {
    const dateTime = formatDateTimeParts(value);

    return (
        <span className="table-date">
            <strong>{dateTime.date}</strong>
            <span>{dateTime.time}</span>
        </span>
    );
}

function getEventPillClassName(eventName) {
    const normalizedEvent = typeof eventName === 'string'
        ? eventName.trim().toUpperCase()
        : '';

    if (normalizedEvent === 'INSERT') {
        return 'status-pill status-pill--active';
    }

    if (normalizedEvent === 'DELETE') {
        return 'status-pill status-pill--closed';
    }

    return 'status-pill status-pill--warning';
}

function getActorLabel(entry) {
    if (!entry?.usuario) {
        return 'Sistema o proceso automatico';
    }

    return entry.usuario.nombre_completo || entry.usuario.nombre_usuario || `Usuario ${entry.usuario.id_usuario}`;
}

function getEventDisplayLabel(eventName) {
    const normalizedEvent = normalizeAuditValue(eventName);

    if (normalizedEvent === 'INSERT') {
        return 'Alta';
    }

    if (normalizedEvent === 'UPDATE') {
        return 'Actualizacion';
    }

    if (normalizedEvent === 'DELETE') {
        return 'Baja tecnica';
    }

    return eventName || 'Sin accion';
}

function getModuleDisplayLabel(tableName) {
    const normalizedTable = normalizeAuditValue(tableName);
    const moduleOption = TABLE_OPTIONS.find((option) => normalizeAuditValue(option.value) === normalizedTable);

    return moduleOption?.label || tableName || 'Modulo no identificado';
}

function normalizeAuditValue(value) {
    return typeof value === 'string'
        ? value.trim().toUpperCase()
        : '';
}

function getAuditDescription(entry) {
    const eventName = normalizeAuditValue(entry?.evento?.nombre_evento);
    const tableName = normalizeAuditValue(entry?.nombre_tabla);

    if (eventName === 'INSERT' && tableName === 'USUARIO') {
        return 'Se dio de alta un usuario';
    }

    if (eventName === 'UPDATE' && tableName === 'USUARIO') {
        return 'Se actualizo un usuario';
    }

    if (eventName === 'DELETE' && tableName === 'USUARIO') {
        return 'Se elimino o desactivo un usuario';
    }

    if (eventName === 'INSERT' && tableName === 'ALERTAMIENTO_VEHICULAR') {
        return 'Se registro un alertamiento';
    }

    if (eventName === 'UPDATE' && tableName === 'ALERTAMIENTO_VEHICULAR') {
        return 'Se actualizo un alertamiento';
    }

    if (eventName === 'INSERT' && tableName === 'HISTORIAL_ALERTAMIENTO') {
        return 'Se agrego historial de alertamiento';
    }

    if (eventName && entry?.nombre_tabla) {
        return `Se realizo ${eventName} en ${entry.nombre_tabla}`;
    }

    return 'Se registro un movimiento de auditoria';
}

function AuditoriaIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M12 3.5 5.5 6v5.5c0 4.1 2.7 7.3 6.5 9 3.8-1.7 6.5-4.9 6.5-9V6L12 3.5Z" />
            <path d="M8.5 11h7" />
            <path d="M8.5 14h4.5" />
        </svg>
    );
}

function AuditoriaPage() {
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [filtersForm, setFiltersForm] = useState(() => createFiltersFromSearchParams(searchParams));
    const [responseData, setResponseData] = useState(INITIAL_RESPONSE);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState(null);
    const [areFiltersVisible, setAreFiltersVisible] = useState(true);
    const filtersPanelBodyId = 'auditoria-filters-body';

    const effectiveParams = useMemo(() => buildRequestParams(searchParams), [searchParams]);

    useEffect(() => {
        setFiltersForm(createFiltersFromSearchParams(searchParams));
    }, [searchParams]);

    // El listado depende por completo del query string. Asi los filtros se
    // conservan al recargar la pagina o compartir la URL durante validaciones.
    useEffect(() => {
        let isMounted = true;

        async function fetchBitacora() {
            setIsLoading(true);
            setErrorMessage(null);

            try {
                const response = await getBitacoraAuditoriaRequest(effectiveParams);

                if (!isMounted) {
                    return;
                }

                setResponseData(response);
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setErrorMessage(
                    getApiErrorMessage(error, 'No fue posible consultar la bitacora de auditoria.')
                );
                setResponseData(INITIAL_RESPONSE);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        void fetchBitacora();

        return () => {
            isMounted = false;
        };
    }, [effectiveParams]);

    function handleFilterChange(event) {
        const { name, value } = event.target;

        setFiltersForm((currentState) => ({
            ...currentState,
            [name]: value
        }));
    }

    function handleSearchSubmit(event) {
        event.preventDefault();

        const nextParams = new URLSearchParams();

        Object.entries(filtersForm).forEach(([key, value]) => {
            if (String(value).trim() !== '') {
                nextParams.set(key, String(value).trim());
            }
        });

        // Cada busqueda vuelve a la primera pagina para evitar una pagina vacia
        // cuando el filtro reduce el total de registros.
        nextParams.set('page', '1');
        nextParams.set('limit', searchParams.get('limit') || '10');
        setSearchParams(nextParams);
    }

    function handleResetFilters() {
        setFiltersForm({ ...EMPTY_FILTER_FORM });
        setSearchParams({
            page: '1',
            limit: searchParams.get('limit') || '10'
        });
    }

    function handleChangePage(nextPage) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('page', String(nextPage));
        nextParams.set('limit', searchParams.get('limit') || '10');
        setSearchParams(nextParams);
    }

    const currentPage = Number.parseInt(effectiveParams.page || '1', 10);
    const pagination = responseData.pagination;
    const hasPreviousPage = currentPage > 1;
    const hasNextPage = pagination ? currentPage < pagination.total_pages : false;
    const returnTo = `${location.pathname}${location.search}`;

    return (
        <section className="card card--wide auditoria-page">
            <div className="section-heading section-heading--module">
                <div className="section-heading__content">
                    <p className="eyebrow">Trazabilidad institucional</p>
                    <h2 className="title">Bitacora de auditoria</h2>
                    <p className="subtitle">
                        Consulta cambios relevantes del sistema y abre Detalle cuando necesites revisar evidencia tecnica.
                    </p>
                </div>

                <div className="section-heading__aside">
                    <div className="info-chip info-chip--compact">
                        <span className="info-chip__label">Acceso</span>
                        <strong>Administrador</strong>
                    </div>
                </div>
            </div>

            <form
                className={`filter-panel filter-panel--compact${areFiltersVisible ? '' : ' filter-panel--collapsed'}`}
                onSubmit={handleSearchSubmit}
            >
                <div className="panel-heading panel-heading--toggle">
                    <div>
                        <h3>Filtros de consulta</h3>
                        <p>Busca por periodo, tipo de cambio, modulo afectado, registro o usuario responsable.</p>
                    </div>

                    <button
                        className="button button--ghost button--small filter-panel__toggle"
                        type="button"
                        aria-expanded={areFiltersVisible}
                        aria-controls={filtersPanelBodyId}
                        onClick={() => setAreFiltersVisible((currentValue) => !currentValue)}
                    >
                        {areFiltersVisible ? 'Ocultar filtros' : 'Mostrar filtros'}
                    </button>
                </div>

                <div
                    id={filtersPanelBodyId}
                    className="filter-panel__body"
                    hidden={!areFiltersVisible}
                >
                    <div className="filter-grid filter-grid--auditoria">
                        <div className="field">
                            <label htmlFor="fecha_inicio">Fecha inicio</label>
                            <input
                                id="fecha_inicio"
                                name="fecha_inicio"
                                type="date"
                                value={filtersForm.fecha_inicio}
                                onChange={handleFilterChange}
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="fecha_fin">Fecha fin</label>
                            <input
                                id="fecha_fin"
                                name="fecha_fin"
                                type="date"
                                value={filtersForm.fecha_fin}
                                onChange={handleFilterChange}
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="nombre_tabla">Modulo afectado</label>
                            <select
                                id="nombre_tabla"
                                name="nombre_tabla"
                                value={filtersForm.nombre_tabla}
                                onChange={handleFilterChange}
                            >
                                <option value=""></option>
                                {TABLE_OPTIONS.map((tableOption) => (
                                    <option key={tableOption.value} value={tableOption.value}>
                                        {tableOption.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="field">
                            <label htmlFor="evento">Tipo de cambio</label>
                            <select
                                id="evento"
                                name="evento"
                                value={filtersForm.evento}
                                onChange={handleFilterChange}
                            >
                                <option value=""></option>
                                {EVENT_OPTIONS.map((eventOption) => (
                                    <option key={eventOption.value} value={eventOption.value}>
                                        {eventOption.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="field">
                            <label htmlFor="id_registro">Registro afectado</label>
                            <input
                                id="id_registro"
                                name="id_registro"
                                type="text"
                                placeholder="ID del registro"
                                value={filtersForm.id_registro}
                                onChange={handleFilterChange}
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="usuario">Usuario</label>
                            <input
                                id="usuario"
                                name="usuario"
                                type="text"
                                placeholder="Nombre o usuario"
                                value={filtersForm.usuario}
                                onChange={handleFilterChange}
                            />
                        </div>
                    </div>

                    <div className="button-row">
                        <button className="button" type="submit">
                            Aplicar filtros
                        </button>

                        <button
                            className="button button--ghost"
                            type="button"
                            onClick={handleResetFilters}
                        >
                            Limpiar filtros
                        </button>
                    </div>
                </div>
            </form>

            {errorMessage ? <p className="message">{errorMessage}</p> : null}

            {isLoading ? (
                <p className="loading-state">Consultando bitacora institucional...</p>
            ) : (
                <>
                    <div className="results-summary results-summary--table auditoria-summary">
                        <span className="auditoria-summary__icon" aria-hidden="true">
                            <AuditoriaIcon />
                        </span>
                        <p>
                            <strong>Total:</strong> {pagination?.total_items ?? 0}
                        </p>
                        <p>
                            <strong>Pagina:</strong> {pagination?.page ?? 1}
                            {' / '}
                            {pagination?.total_pages ?? 0}
                        </p>
                    </div>

                    {responseData.data.length === 0 ? (
                        <div className="empty-state">
                            <h3>Sin movimientos</h3>
                            <p>No se encontraron eventos de auditoria para los filtros aplicados.</p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="data-table data-table--comfortable data-table--auditoria">
                                <thead>
                                    <tr>
                                        <th>Folio de auditoria</th>
                                        <th>Fecha</th>
                                        <th>Descripcion</th>
                                        <th>Tipo</th>
                                        <th>Modulo afectado</th>
                                        <th>Registro afectado</th>
                                        <th>Usuario</th>
                                        <th>IP</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {responseData.data.map((entry) => (
                                        <tr key={entry.id_bitacora_auditoria}>
                                            <td className="mono">{entry.id_bitacora_auditoria}</td>
                                            <td>
                                                <AuditDateTime value={entry.fecha_evento} />
                                            </td>
                                            <td>
                                                <span className="auditoria-description">
                                                    {getAuditDescription(entry)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={getEventPillClassName(entry.evento?.nombre_evento)}>
                                                    {getEventDisplayLabel(entry.evento?.nombre_evento)}
                                                </span>
                                            </td>
                                            <td>{getModuleDisplayLabel(entry.nombre_tabla)}</td>
                                            <td className="mono">{entry.id_registro}</td>
                                            <td>
                                                <span className="table-cell-stack">
                                                    <strong>{getActorLabel(entry)}</strong>
                                                    {entry.usuario?.nombre_usuario ? (
                                                        <small className="mono">{entry.usuario.nombre_usuario}</small>
                                                    ) : null}
                                                </span>
                                            </td>
                                            <td className="mono">{entry.ip_origen || 'Sin IP'}</td>
                                            <td>
                                                <Link
                                                    className="button button--inline button--small table-detail-link"
                                                    to={`/auditoria/${entry.id_bitacora_auditoria}`}
                                                    state={{ returnTo }}
                                                >
                                                    Detalle
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="pagination-bar">
                        <button
                            className="button button--ghost"
                            type="button"
                            onClick={() => handleChangePage(currentPage - 1)}
                            disabled={!hasPreviousPage}
                        >
                            Pagina anterior
                        </button>

                        <span className="pagination-bar__text">
                            Mostrando pagina {pagination?.page ?? 1} de {pagination?.total_pages ?? 0}
                        </span>

                        <button
                            className="button button--ghost"
                            type="button"
                            onClick={() => handleChangePage(currentPage + 1)}
                            disabled={!hasNextPage}
                        >
                            Pagina siguiente
                        </button>
                    </div>
                </>
            )}
        </section>
    );
}

export default AuditoriaPage;
