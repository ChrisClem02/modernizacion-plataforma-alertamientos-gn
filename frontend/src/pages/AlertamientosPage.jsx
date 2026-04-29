import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getAlertamientosRequest } from '../api/alertamientos.api';
import ManualAlertamientoForm from '../components/ManualAlertamientoForm';
import { useAuthStore } from '../store/auth.store';

const EMPTY_FILTER_FORM = {
    fecha_inicio: '',
    fecha_fin: '',
    placa: '',
    id_torre: '',
    id_estatus_alertamiento: '',
    id_region: '',
    id_estado: '',
    id_territorio: ''
};

function getApiErrorMessage(error, fallbackMessage) {
    return error?.response?.data?.message || fallbackMessage;
}

function createFiltersFromSearchParams(searchParams) {
    return {
        fecha_inicio: searchParams.get('fecha_inicio') || '',
        fecha_fin: searchParams.get('fecha_fin') || '',
        placa: searchParams.get('placa') || '',
        id_torre: searchParams.get('id_torre') || '',
        id_estatus_alertamiento: searchParams.get('id_estatus_alertamiento') || '',
        id_region: searchParams.get('id_region') || '',
        id_estado: searchParams.get('id_estado') || '',
        id_territorio: searchParams.get('id_territorio') || ''
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

function formatDateTime(value) {
    if (!value) {
        return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(new Date(value));
}

function getAlertamientoStatusClassName(statusName) {
    const normalizedStatus = typeof statusName === 'string'
        ? statusName.trim().toUpperCase()
        : '';

    if (normalizedStatus === 'CERRADO') {
        return 'status-pill status-pill--closed';
    }

    if (normalizedStatus === 'EN_ATENCION') {
        return 'status-pill status-pill--warning';
    }

    if (normalizedStatus === 'VALIDADO') {
        return 'status-pill status-pill--active';
    }

    return 'status-pill status-pill--pending';
}

function AlertamientosPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [filtersForm, setFiltersForm] = useState(() => createFiltersFromSearchParams(searchParams));
    const [responseData, setResponseData] = useState({
        filters: null,
        pagination: null,
        data: []
    });
    const [isCreateFormVisible, setIsCreateFormVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState(null);
    const user = useAuthStore((state) => state.user);

    const effectiveParams = useMemo(() => buildRequestParams(searchParams), [searchParams]);

    // El formulario se sincroniza con la URL para que recargar la página no
    // pierda filtros ni paginación ya aplicados.
    useEffect(() => {
        setFiltersForm(createFiltersFromSearchParams(searchParams));
    }, [searchParams]);

    // Cada cambio de query string dispara una consulta nueva. Así el listado
    // queda derivado por completo del estado de la URL.
    useEffect(() => {
        let isMounted = true;

        async function fetchAlertamientos() {
            setIsLoading(true);
            setErrorMessage(null);

            try {
                const response = await getAlertamientosRequest(effectiveParams);

                if (!isMounted) {
                    return;
                }

                setResponseData(response);
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setErrorMessage(
                    getApiErrorMessage(error, 'No fue posible consultar los alertamientos.')
                );
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        void fetchAlertamientos();

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
            if (value.trim() !== '') {
                nextParams.set(key, value.trim());
            }
        });

        // Cada nueva búsqueda vuelve a la primera página para evitar que un
        // cambio de filtros deje al usuario en una página inexistente.
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

    function handleOpenCreateForm() {
        setIsCreateFormVisible(true);
    }

    function handleCloseCreateForm() {
        setIsCreateFormVisible(false);
    }

    function handleAlertamientoCreated(response) {
        const createdAlertamientoId = response?.data?.id_alertamiento;

        if (!createdAlertamientoId) {
            return;
        }

        // En vez de refrescar el listado y forzar al usuario a buscar el nuevo
        // registro, se le lleva directo al detalle con un mensaje de confirmacion.
        navigate(`/alertamientos/${createdAlertamientoId}`, {
            state: {
                flashMessage: response.message || 'Alertamiento manual registrado correctamente.'
            }
        });
    }

    return (
        <section className="card card--wide">
            <div className="section-heading">
                <div>
                    <p className="eyebrow">Módulo Operativo</p>
                    <h2 className="title">Consulta de Alertamientos</h2>
                    <p className="subtitle">
                        El listado ya respeta la visibilidad institucional del usuario autenticado.
                    </p>
                </div>

                <div className="info-chip">
                    <span className="info-chip__label">Visibilidad actual</span>
                    <strong>{user?.nivel_operativo?.nombre_nivel || 'Sin nivel'}</strong>
                </div>
            </div>

            <div className="button-row section-actions">
                <button
                    className="button"
                    type="button"
                    onClick={handleOpenCreateForm}
                    disabled={isCreateFormVisible}
                >
                    Nuevo alertamiento
                </button>
            </div>

            {isCreateFormVisible ? (
                <ManualAlertamientoForm
                    onCancel={handleCloseCreateForm}
                    onCreated={handleAlertamientoCreated}
                />
            ) : null}

            <form className="filter-panel" onSubmit={handleSearchSubmit}>
                <div className="panel-heading">
                    <h3>Filtros de consulta</h3>
                    <p>Refina el listado visible sin modificar el ámbito institucional aplicado por backend.</p>
                </div>

                <div className="filter-grid">
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
                        <label htmlFor="placa">Placa</label>
                        <input
                            id="placa"
                            name="placa"
                            type="text"
                            placeholder="ABC123"
                            value={filtersForm.placa}
                            onChange={handleFilterChange}
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="id_torre">ID torre</label>
                        <input
                            id="id_torre"
                            name="id_torre"
                            type="number"
                            min="1"
                            value={filtersForm.id_torre}
                            onChange={handleFilterChange}
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="id_estatus_alertamiento">ID estatus</label>
                        <input
                            id="id_estatus_alertamiento"
                            name="id_estatus_alertamiento"
                            type="number"
                            min="1"
                            value={filtersForm.id_estatus_alertamiento}
                            onChange={handleFilterChange}
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="id_region">ID region</label>
                        <input
                            id="id_region"
                            name="id_region"
                            type="number"
                            min="1"
                            value={filtersForm.id_region}
                            onChange={handleFilterChange}
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="id_estado">ID estado</label>
                        <input
                            id="id_estado"
                            name="id_estado"
                            type="number"
                            min="1"
                            value={filtersForm.id_estado}
                            onChange={handleFilterChange}
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="id_territorio">ID territorio</label>
                        <input
                            id="id_territorio"
                            name="id_territorio"
                            type="number"
                            min="1"
                            value={filtersForm.id_territorio}
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
            </form>

            {errorMessage ? <p className="message">{errorMessage}</p> : null}

            {isLoading ? (
                <p className="loading-state">Consultando alertamientos visibles para tu ámbito...</p>
            ) : (
                <>
                    <div className="results-summary">
                        <p>
                            <strong>Total:</strong> {pagination?.total_items ?? 0}
                        </p>
                        <p>
                            <strong>Página:</strong> {pagination?.page ?? 1}
                            {' / '}
                            {pagination?.total_pages ?? 0}
                        </p>
                    </div>

                    {responseData.data.length === 0 ? (
                        <div className="empty-state">
                            <h3>Sin resultados</h3>
                            <p>
                                No se encontraron alertamientos para los filtros y el ámbito institucional actuales.
                            </p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="data-table data-table--comfortable">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Placa</th>
                                        <th>Fecha deteccion</th>
                                        <th>Estatus</th>
                                        <th>Torre</th>
                                        <th>Estado</th>
                                        <th>Territorio</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {responseData.data.map((alertamiento) => (
                                        <tr key={alertamiento.id_alertamiento}>
                                            <td className="mono">{alertamiento.id_alertamiento}</td>
                                            <td className="mono">{alertamiento.placa_detectada}</td>
                                            <td>{formatDateTime(alertamiento.fecha_hora_deteccion)}</td>
                                            <td>
                                                <span className={getAlertamientoStatusClassName(alertamiento.estatus?.nombre_estatus)}>
                                                    {alertamiento.estatus?.nombre_estatus || 'Sin estatus'}
                                                </span>
                                            </td>
                                            <td>{alertamiento.torre?.nombre_torre || 'Sin torre'}</td>
                                            <td>{alertamiento.estado?.nombre_estado || 'Sin estado'}</td>
                                            <td>{alertamiento.territorio?.nombre_territorio || 'Sin territorio'}</td>
                                            <td>
                                                <Link
                                                    className="button button--inline"
                                                    to={`/alertamientos/${alertamiento.id_alertamiento}`}
                                                >
                                                    Ver detalle
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
                            Página anterior
                        </button>

                        <span className="pagination-bar__text">
                            Mostrando página {pagination?.page ?? 1} de {pagination?.total_pages ?? 0}
                        </span>

                        <button
                            className="button button--ghost"
                            type="button"
                            onClick={() => handleChangePage(currentPage + 1)}
                            disabled={!hasNextPage}
                        >
                            Página siguiente
                        </button>
                    </div>
                </>
            )}
        </section>
    );
}

export default AlertamientosPage;
