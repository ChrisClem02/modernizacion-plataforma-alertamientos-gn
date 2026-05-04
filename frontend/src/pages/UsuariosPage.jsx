import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    activateUsuarioRequest,
    createUsuarioRequest,
    deactivateUsuarioRequest,
    getNivelesOperativosCatalogRequest,
    getRolesCatalogRequest,
    getUsuarioDetailRequest,
    getUsuariosRequest,
    updateUsuarioRequest
} from '../api/usuarios.api';
import {
    getEstadosRequest,
    getTerritoriosRequest,
    getTorresRequest
} from '../api/jerarquia.api';
import UsuarioFormPanel from '../components/UsuarioFormPanel';
import { useAuthStore } from '../store/auth.store';

const EMPTY_FILTER_FORM = {
    search: '',
    activo: '',
    id_rol: '',
    id_nivel_operativo: ''
};

const INITIAL_LIST_RESPONSE = {
    filters: null,
    pagination: null,
    data: []
};

const INITIAL_CATALOGS = {
    roles: [],
    nivelesOperativos: [],
    estados: [],
    territorios: [],
    torres: []
};

function getApiErrorMessage(error, fallbackMessage) {
    return error?.response?.data?.message || fallbackMessage;
}

function createFiltersFromSearchParams(searchParams) {
    return {
        search: searchParams.get('search') || '',
        activo: searchParams.get('activo') || '',
        id_rol: searchParams.get('id_rol') || '',
        id_nivel_operativo: searchParams.get('id_nivel_operativo') || ''
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

function getAmbitoSummary(usuario) {
    if (!usuario?.ambito) {
        return 'Sin ámbito';
    }

    if (usuario.ambito.tipo === 'TORRE') {
        return usuario.ambito.referencia?.nombre_torre || `Torre ${usuario.ambito.referencia?.id_torre || 'N/A'}`;
    }

    if (usuario.ambito.tipo === 'ESTATAL') {
        return usuario.ambito.referencia?.nombre_estado || `Estado ${usuario.ambito.referencia?.id_estado || 'N/A'}`;
    }

    if (usuario.ambito.tipo === 'TERRITORIAL') {
        return usuario.ambito.referencia?.nombre_territorio || `Territorio ${usuario.ambito.referencia?.id_territorio || 'N/A'}`;
    }

    return 'Nacional';
}

function formatDateTime(value) {
    if (!value) {
        return 'Sin registro';
    }

    return new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(new Date(value));
}

function getUserInitials(usuario) {
    const displayName = usuario?.nombre_completo || usuario?.nombre_usuario || 'Usuario';
    const initials = displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((namePart) => namePart[0])
        .join('');

    return initials.toUpperCase();
}

function UsuariosIcon({ type }) {
    const icons = {
        users: (
            <>
                <circle cx="9" cy="8" r="3" />
                <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
                <path d="M16 11a2.5 2.5 0 1 0 0-5" />
                <path d="M17 20h3.5a4.5 4.5 0 0 0-4.5-4.5" />
            </>
        ),
        active: (
            <>
                <path d="M12 3l7 4v5c0 4.3-2.7 7.1-7 8.8-4.3-1.7-7-4.5-7-8.8V7l7-4z" />
                <path d="M9 12l2 2 4-4" />
            </>
        ),
        inactive: (
            <>
                <circle cx="12" cy="12" r="8" />
                <path d="M8 8l8 8" />
            </>
        ),
        role: (
            <>
                <rect x="4" y="5" width="16" height="14" rx="2" />
                <path d="M8 10h8" />
                <path d="M8 14h5" />
            </>
        ),
        plus: (
            <>
                <circle cx="12" cy="12" r="8" />
                <path d="M12 8v8" />
                <path d="M8 12h8" />
            </>
        ),
        filter: (
            <>
                <path d="M4 6h16" />
                <path d="M7 12h10" />
                <path d="M10 18h4" />
            </>
        ),
        admin: (
            <>
                <path d="M12 3l7 4v5c0 4.3-2.7 7.1-7 8.8-4.3-1.7-7-4.5-7-8.8V7l7-4z" />
                <path d="M12 8l1.1 2.3 2.5.3-1.8 1.7.4 2.5-2.2-1.2-2.2 1.2.4-2.5-1.8-1.7 2.5-.3L12 8z" />
            </>
        )
    };

    return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
            {icons[type] || icons.users}
        </svg>
    );
}

function UsuariosPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [filtersForm, setFiltersForm] = useState(() => createFiltersFromSearchParams(searchParams));
    const [listResponse, setListResponse] = useState(INITIAL_LIST_RESPONSE);
    const [catalogs, setCatalogs] = useState(INITIAL_CATALOGS);
    const [isCatalogsLoading, setIsCatalogsLoading] = useState(true);
    const [catalogErrorMessage, setCatalogErrorMessage] = useState(null);
    const [isListLoading, setIsListLoading] = useState(true);
    const [listErrorMessage, setListErrorMessage] = useState(null);
    const [feedbackMessage, setFeedbackMessage] = useState(null);
    const [feedbackType, setFeedbackType] = useState('success');
    const [formMode, setFormMode] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isFormLoading, setIsFormLoading] = useState(false);
    const [actionUserId, setActionUserId] = useState(null);
    const [reloadCounter, setReloadCounter] = useState(0);
    const [areFiltersExpanded, setAreFiltersExpanded] = useState(true);
    const {
        user: authenticatedUser,
        fetchMe
    } = useAuthStore((state) => ({
        user: state.user,
        fetchMe: state.fetchMe
    }));

    const effectiveParams = useMemo(() => buildRequestParams(searchParams), [searchParams]);

    useEffect(() => {
        setFiltersForm(createFiltersFromSearchParams(searchParams));
    }, [searchParams]);

    // Los catalogos de apoyo se cargan una sola vez y alimentan filtros y
    // formularios, de modo que el frontend no codifique catalogos institucionales.
    useEffect(() => {
        let isMounted = true;

        async function fetchCatalogs() {
            setIsCatalogsLoading(true);
            setCatalogErrorMessage(null);

            try {
                const [
                    rolesResponse,
                    nivelesResponse,
                    estadosResponse,
                    territoriosResponse,
                    torresResponse
                ] = await Promise.all([
                    getRolesCatalogRequest(),
                    getNivelesOperativosCatalogRequest(),
                    getEstadosRequest(),
                    getTerritoriosRequest(),
                    getTorresRequest()
                ]);

                if (!isMounted) {
                    return;
                }

                setCatalogs({
                    roles: rolesResponse.data || [],
                    nivelesOperativos: nivelesResponse.data || [],
                    estados: estadosResponse.data || [],
                    territorios: territoriosResponse.data || [],
                    torres: torresResponse.data || []
                });
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setCatalogErrorMessage(
                    getApiErrorMessage(error, 'No fue posible cargar los catalogos de usuarios.')
                );
            } finally {
                if (isMounted) {
                    setIsCatalogsLoading(false);
                }
            }
        }

        void fetchCatalogs();

        return () => {
            isMounted = false;
        };
    }, []);

    // El listado se deriva por completo de la query string para que filtros y
    // paginación se puedan recargar o compartir sin perder el estado actual.
    useEffect(() => {
        let isMounted = true;

        async function fetchUsuarios() {
            setIsListLoading(true);
            setListErrorMessage(null);

            try {
                const response = await getUsuariosRequest(effectiveParams);

                if (!isMounted) {
                    return;
                }

                setListResponse(response);
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setListErrorMessage(
                    getApiErrorMessage(error, 'No fue posible consultar los usuarios.')
                );
            } finally {
                if (isMounted) {
                    setIsListLoading(false);
                }
            }
        }

        void fetchUsuarios();

        return () => {
            isMounted = false;
        };
    }, [effectiveParams, reloadCounter]);

    function setFeedback(message, type = 'success') {
        setFeedbackMessage(message);
        setFeedbackType(type);
    }

    function clearFeedback() {
        setFeedbackMessage(null);
    }

    function handleFilterChange(event) {
        const { name, value } = event.target;

        setFiltersForm((currentState) => ({
            ...currentState,
            [name]: value
        }));
    }

    function handleSearchSubmit(event) {
        event.preventDefault();
        clearFeedback();

        const nextParams = new URLSearchParams();

        Object.entries(filtersForm).forEach(([key, value]) => {
            if (value.trim() !== '') {
                nextParams.set(key, value.trim());
            }
        });

        nextParams.set('page', '1');
        nextParams.set('limit', searchParams.get('limit') || '10');
        setSearchParams(nextParams);
    }

    function handleResetFilters() {
        clearFeedback();
        setFiltersForm({ ...EMPTY_FILTER_FORM });
        setSearchParams(new URLSearchParams({
            page: '1',
            limit: searchParams.get('limit') || '10'
        }));
    }

    function handleChangePage(nextPage) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('page', String(nextPage));
        nextParams.set('limit', searchParams.get('limit') || '10');
        setSearchParams(nextParams);
    }

    function handleOpenCreateForm() {
        clearFeedback();
        setFormMode('create');
        setSelectedUser(null);
        setIsFormLoading(false);
    }

    async function handleOpenEditForm(usuarioId) {
        clearFeedback();
        setFormMode('edit');
        setSelectedUser(null);
        setIsFormLoading(true);

        try {
            const response = await getUsuarioDetailRequest(usuarioId);
            setSelectedUser(response.data);
        } catch (error) {
            setFormMode(null);
            setFeedback(
                getApiErrorMessage(error, 'No fue posible cargar el detalle del usuario para editarlo.'),
                'error'
            );
        } finally {
            setIsFormLoading(false);
        }
    }

    function handleCloseForm() {
        setFormMode(null);
        setSelectedUser(null);
        setIsFormLoading(false);
    }

    async function refreshCurrentUserIfNeeded(usuarioId) {
        if (String(authenticatedUser?.id_usuario) !== String(usuarioId)) {
            return;
        }

        try {
            await fetchMe();
        } catch (_error) {
            // Si el refresh fallara, la sesión ya tiene manejo propio desde el store.
        }
    }

    async function handleCreateSubmit(payload) {
        const response = await createUsuarioRequest(payload);
        setReloadCounter((currentValue) => currentValue + 1);
        setFeedback(response.message || 'Usuario creado correctamente.', 'success');
        handleCloseForm();
    }

    async function handleUpdateSubmit(payload) {
        const response = await updateUsuarioRequest(selectedUser.id_usuario, payload);
        await refreshCurrentUserIfNeeded(selectedUser.id_usuario);
        setReloadCounter((currentValue) => currentValue + 1);
        setFeedback(response.message || 'Usuario actualizado correctamente.', 'success');
        handleCloseForm();
    }

    async function handleToggleUsuarioActive(usuario) {
        const shouldDeactivate = usuario.activo === true;
        const confirmationMessage = shouldDeactivate
            ? `Se desactivara el usuario ${usuario.nombre_usuario}.`
            : `Se activara el usuario ${usuario.nombre_usuario}.`;

        if (!window.confirm(confirmationMessage)) {
            return;
        }

        setActionUserId(usuario.id_usuario);
        clearFeedback();

        try {
            const response = shouldDeactivate
                ? await deactivateUsuarioRequest(usuario.id_usuario)
                : await activateUsuarioRequest(usuario.id_usuario);

            setReloadCounter((currentValue) => currentValue + 1);
            setFeedback(
                response.message || (shouldDeactivate ? 'Usuario desactivado correctamente.' : 'Usuario activado correctamente.'),
                'success'
            );
        } catch (error) {
            setFeedback(
                getApiErrorMessage(
                    error,
                    shouldDeactivate
                        ? 'No fue posible desactivar el usuario.'
                        : 'No fue posible activar el usuario.'
                ),
                'error'
            );
        } finally {
            setActionUserId(null);
        }
    }

    const currentPage = Number.parseInt(effectiveParams.page || '1', 10);
    const pagination = listResponse.pagination;
    const hasPreviousPage = currentPage > 1;
    const hasNextPage = pagination ? currentPage < pagination.total_pages : false;
    const usuarios = listResponse.data || [];
    const activeUsersInPage = usuarios.filter((usuario) => usuario.activo === true).length;
    const inactiveUsersInPage = usuarios.filter((usuario) => usuario.activo !== true).length;
    const adminUsersInPage = usuarios.filter((usuario) => usuario.rol?.nombre_rol === 'ADMINISTRADOR').length;

    return (
        <section className="usuarios-page">
            <div className="usuarios-shell">
                <div className="section-heading usuarios-hero">
                    <div className="usuarios-hero__content">
                        <p className="eyebrow">Administración institucional</p>
                        <h2 className="title">Gestión de usuarios</h2>
                        <p className="subtitle usuarios-hero__subtitle">
                            Módulo administrativo para altas, edición, activación y asignación de ámbitos operativos.
                        </p>
                    </div>

                    <div className="usuarios-hero__aside">
                        <div className="info-chip usuarios-role-summary">
                            <span className="usuarios-role-summary__icon" aria-hidden="true">
                                <UsuariosIcon type="role" />
                            </span>
                            <div>
                                <span className="info-chip__label">Rol actual</span>
                                <strong>{authenticatedUser?.rol?.nombre_rol || 'Sin rol'}</strong>
                            </div>
                        </div>

                        <button
                            className="button usuarios-primary-action"
                            type="button"
                            onClick={handleOpenCreateForm}
                            disabled={isCatalogsLoading || Boolean(catalogErrorMessage)}
                        >
                            <span className="button__icon" aria-hidden="true">
                                <UsuariosIcon type="plus" />
                            </span>
                            Nuevo usuario
                        </button>
                    </div>
                </div>

            <div className="usuarios-kpi-grid">
                <article className="usuarios-kpi-card usuarios-kpi-card--total">
                    <span className="usuarios-kpi-card__icon">
                        <UsuariosIcon type="users" />
                    </span>
                    <div>
                        <span>Total de usuarios</span>
                        <strong>{pagination?.total_items ?? 0}</strong>
                        <p>Total filtrado</p>
                    </div>
                </article>

                <article className="usuarios-kpi-card usuarios-kpi-card--active">
                    <span className="usuarios-kpi-card__icon usuarios-kpi-card__icon--active">
                        <UsuariosIcon type="active" />
                    </span>
                    <div>
                        <span>Activos</span>
                        <strong>{activeUsersInPage}</strong>
                        <p>En esta página</p>
                    </div>
                </article>

                <article className="usuarios-kpi-card usuarios-kpi-card--inactive">
                    <span className="usuarios-kpi-card__icon usuarios-kpi-card__icon--inactive">
                        <UsuariosIcon type="inactive" />
                    </span>
                    <div>
                        <span>Inactivos</span>
                        <strong>{inactiveUsersInPage}</strong>
                        <p>En esta página</p>
                    </div>
                </article>

                <article className="usuarios-kpi-card usuarios-kpi-card--admin">
                    <span className="usuarios-kpi-card__icon usuarios-kpi-card__icon--admin">
                        <UsuariosIcon type="admin" />
                    </span>
                    <div>
                        <span>Administradores</span>
                        <strong>{adminUsersInPage}</strong>
                        <p>En esta página</p>
                    </div>
                </article>
            </div>

            {feedbackMessage ? (
                <p className={`message${feedbackType === 'success' ? ' message--success' : ''}`}>
                    {feedbackMessage}
                </p>
            ) : null}

            {catalogErrorMessage ? <p className="message">{catalogErrorMessage}</p> : null}

            {formMode && isFormLoading ? (
                <div className="form-panel">
                    <p className="loading-state">Cargando detalle del usuario para editar...</p>
                </div>
            ) : null}

            {formMode && !isFormLoading ? (
                <UsuarioFormPanel
                    mode={formMode}
                    initialUser={selectedUser}
                    catalogs={catalogs}
                    onCancel={handleCloseForm}
                    onSubmit={formMode === 'create' ? handleCreateSubmit : handleUpdateSubmit}
                />
            ) : null}

            <form
                className={`filter-panel usuarios-filter-panel${areFiltersExpanded ? '' : ' usuarios-filter-panel--collapsed'}`}
                onSubmit={handleSearchSubmit}
            >
                <div className="panel-heading usuarios-filter-heading">
                    <div className="usuarios-filter-heading__title">
                        <span className="usuarios-filter-heading__icon" aria-hidden="true">
                            <UsuariosIcon type="filter" />
                        </span>
                        <div>
                            <h3>Filtros administrativos</h3>
                            <p>Busca usuarios por datos generales, estatus, rol o nivel operativo.</p>
                        </div>
                    </div>

                    <button
                        className="button button--ghost usuarios-filter-toggle"
                        type="button"
                        onClick={() => setAreFiltersExpanded((currentValue) => !currentValue)}
                        aria-expanded={areFiltersExpanded}
                    >
                        {areFiltersExpanded ? 'Ocultar filtros' : 'Mostrar filtros'}
                        <span aria-hidden="true">{areFiltersExpanded ? '−' : '+'}</span>
                    </button>
                </div>

                <div className="usuarios-filter-body" hidden={!areFiltersExpanded}>
                <div className="filter-grid usuarios-filter-grid">
                    <div className="field usuarios-filter-field usuarios-filter-field--search">
                        <label htmlFor="usuarios_search">Búsqueda</label>
                        <input
                            id="usuarios_search"
                            name="search"
                            type="text"
                            placeholder="usuario, correo o nombre"
                            value={filtersForm.search}
                            onChange={handleFilterChange}
                        />
                    </div>

                    <div className="field usuarios-filter-field">
                        <label htmlFor="usuarios_activo">Estatus</label>
                        <select
                            id="usuarios_activo"
                            name="activo"
                            value={filtersForm.activo}
                            onChange={handleFilterChange}
                        >
                            <option value="">Todos</option>
                            <option value="true">Activos</option>
                            <option value="false">Inactivos</option>
                        </select>
                    </div>

                    <div className="field usuarios-filter-field">
                        <label htmlFor="usuarios_id_rol">Rol</label>
                        <select
                            id="usuarios_id_rol"
                            name="id_rol"
                            value={filtersForm.id_rol}
                            onChange={handleFilterChange}
                            disabled={isCatalogsLoading}
                        >
                            <option value="">Todos los roles</option>
                            {catalogs.roles.map((role) => (
                                <option key={role.id_rol} value={role.id_rol}>
                                    {role.nombre_rol}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="field usuarios-filter-field">
                        <label htmlFor="usuarios_id_nivel_operativo">Nivel operativo</label>
                        <select
                            id="usuarios_id_nivel_operativo"
                            name="id_nivel_operativo"
                            value={filtersForm.id_nivel_operativo}
                            onChange={handleFilterChange}
                            disabled={isCatalogsLoading}
                        >
                            <option value="">Todos los niveles</option>
                            {catalogs.nivelesOperativos.map((nivel) => (
                                <option key={nivel.id_nivel_operativo} value={nivel.id_nivel_operativo}>
                                    {nivel.nombre_nivel}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="button-row usuarios-filter-actions">
                    <button className="button usuarios-filter-submit" type="submit">
                        <span className="button__icon" aria-hidden="true">
                            <UsuariosIcon type="filter" />
                        </span>
                        Aplicar filtros
                    </button>

                    <button
                        className="button button--ghost usuarios-filter-reset"
                        type="button"
                        onClick={handleResetFilters}
                    >
                        Limpiar filtros
                    </button>
                </div>
                </div>
            </form>

            {listErrorMessage ? <p className="message">{listErrorMessage}</p> : null}

            {isListLoading ? (
                <p className="loading-state">Consultando usuarios institucionales...</p>
            ) : (
                <>
                    <div className="results-summary usuarios-results-summary">
                        <p className="usuarios-results-summary__item">
                            <span>Total</span>
                            <strong>{pagination?.total_items ?? 0}</strong>
                        </p>
                        <p className="usuarios-results-summary__item">
                            <span>Página</span>
                            <strong>
                                {pagination?.page ?? 1}
                                {' / '}
                                {pagination?.total_pages ?? 0}
                            </strong>
                        </p>
                    </div>

                    {listResponse.data.length === 0 ? (
                        <div className="empty-state">
                            <h3>Sin usuarios para mostrar</h3>
                            <p>No se encontraron usuarios con los filtros actuales.</p>
                        </div>
                    ) : (
                        <div className="table-wrapper usuarios-table-wrapper">
                            <table className="data-table data-table--users data-table--comfortable usuarios-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Usuario</th>
                                        <th>Rol</th>
                                        <th>Nivel</th>
                                        <th>Ámbito</th>
                                        <th>Estatus</th>
                                        <th>Último acceso</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {listResponse.data.map((usuario) => {
                                        const isCurrentUser = String(usuario.id_usuario) === String(authenticatedUser?.id_usuario);
                                        const isActionPending = String(actionUserId) === String(usuario.id_usuario);

                                        return (
                                            <tr key={usuario.id_usuario}>
                                                <td className="mono usuarios-table__id">{usuario.id_usuario}</td>
                                                <td>
                                                    <div className="usuarios-user-profile">
                                                        <span className="usuarios-user-avatar" aria-hidden="true">
                                                            {getUserInitials(usuario)}
                                                        </span>
                                                        <div className="table-cell-stack usuarios-user-cell">
                                                            <strong>{usuario.nombre_usuario}</strong>
                                                            <span>{usuario.nombre_completo}</span>
                                                            <span className="mono usuarios-user-cell__email">{usuario.correo_electronico}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`usuarios-role-badge${usuario.rol?.nombre_rol === 'ADMINISTRADOR' ? ' usuarios-role-badge--admin' : ''}`}>
                                                        {usuario.rol?.nombre_rol || 'Sin rol'}
                                                    </span>
                                                </td>
                                                <td>{usuario.nivel_operativo?.nombre_nivel || 'Sin nivel'}</td>
                                                <td>{getAmbitoSummary(usuario)}</td>
                                                <td>
                                                    <span className={`status-pill${usuario.activo ? ' status-pill--active' : ' status-pill--inactive'}`}>
                                                        {usuario.activo ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="usuarios-last-access">
                                                        {formatDateTime(usuario.fecha_ultimo_acceso)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="table-actions usuarios-table-actions">
                                                        <button
                                                            className="button button--ghost button--small usuarios-action-button usuarios-action-button--edit"
                                                            type="button"
                                                            onClick={() => handleOpenEditForm(usuario.id_usuario)}
                                                            disabled={isActionPending || isCatalogsLoading || Boolean(catalogErrorMessage)}
                                                        >
                                                            Editar
                                                        </button>

                                                        <button
                                                            className={`button button--small usuarios-action-button${usuario.activo ? ' button--secondary usuarios-action-button--deactivate' : ' usuarios-action-button--activate'}`}
                                                            type="button"
                                                            onClick={() => handleToggleUsuarioActive(usuario)}
                                                            disabled={isActionPending || (isCurrentUser && usuario.activo)}
                                                            title={isCurrentUser && usuario.activo ? 'No puedes desactivar tu propio usuario.' : undefined}
                                                        >
                                                            {isActionPending
                                                                ? 'Procesando...'
                                                                : usuario.activo
                                                                    ? 'Desactivar'
                                                                    : 'Activar'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
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
            </div>
        </section>
    );
}

export default UsuariosPage;
