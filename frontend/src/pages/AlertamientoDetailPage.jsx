import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    getAlertamientoDetailRequest,
    getAlertamientoHistorialRequest,
    updateAlertamientoStatusRequest
} from '../api/alertamientos.api';
import { useAuthStore } from '../store/auth.store';

const NEXT_STATUS_BY_ORDER = {
    1: {
        id_estatus_alertamiento: 2,
        nombre_estatus: 'VALIDADO',
        orden_flujo: 2
    },
    2: {
        id_estatus_alertamiento: 3,
        nombre_estatus: 'EN_ATENCION',
        orden_flujo: 3
    },
    3: {
        id_estatus_alertamiento: 4,
        nombre_estatus: 'CERRADO',
        orden_flujo: 4
    }
};

const ALLOWED_ROLE_STATUS_TRANSITIONS = {
    OPERADOR: new Set([
        'DETECTADO->VALIDADO',
        'VALIDADO->EN_ATENCION'
    ]),
    COORDINADOR: new Set([
        'DETECTADO->VALIDADO',
        'VALIDADO->EN_ATENCION',
        'EN_ATENCION->CERRADO'
    ]),
    ADMINISTRADOR: new Set([
        'DETECTADO->VALIDADO',
        'VALIDADO->EN_ATENCION',
        'EN_ATENCION->CERRADO'
    ])
};

function getApiErrorMessage(error, fallbackMessage) {
    return error?.response?.data?.message || fallbackMessage;
}

function getStatusUpdateErrorMessage(error) {
    const backendMessage = error?.response?.data?.message;
    const statusCode = error?.response?.status;

    if (statusCode === 400) {
        return backendMessage || 'La transición solicitada no es válida para este alertamiento.';
    }

    if (statusCode === 403) {
        return backendMessage || 'Tu rol actual no tiene permiso para cambiar este alertamiento.';
    }

    if (statusCode === 404) {
        return backendMessage || 'El alertamiento ya no existe o dejó de ser visible para tu ámbito.';
    }

    if (statusCode === 409) {
        return backendMessage || 'El estatus solicitado ya no es compatible con el estado actual del alertamiento.';
    }

    return backendMessage || 'No fue posible actualizar el estatus del alertamiento.';
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

function normalizeCatalogName(value) {
    return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function getAlertamientoStatusClassName(statusName) {
    const normalizedStatus = normalizeCatalogName(statusName);

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

async function fetchAlertamientoContext(alertamientoId) {
    const [detailResponse, historialResponse] = await Promise.all([
        getAlertamientoDetailRequest(alertamientoId),
        getAlertamientoHistorialRequest(alertamientoId)
    ]);

    return {
        detail: detailResponse.data,
        historial: historialResponse.data || []
    };
}

function getAvailableStatusTransitions(detail, user) {
    const currentStatusName = normalizeCatalogName(detail?.estatus?.nombre_estatus);
    const currentOrder = Number.parseInt(detail?.estatus?.orden_flujo, 10);
    const roleName = normalizeCatalogName(user?.rol?.nombre_rol);

    if (!currentStatusName || !Number.isInteger(currentOrder) || !roleName) {
        return [];
    }

    if (currentStatusName === 'CERRADO') {
        return [];
    }

    const nextStatus = NEXT_STATUS_BY_ORDER[currentOrder];
    const allowedTransitions = ALLOWED_ROLE_STATUS_TRANSITIONS[roleName];

    if (!nextStatus || !allowedTransitions) {
        return [];
    }

    const transitionKey = `${currentStatusName}->${normalizeCatalogName(nextStatus.nombre_estatus)}`;

    return allowedTransitions.has(transitionKey) ? [nextStatus] : [];
}

function getStatusActionHint(detail, user, availableTransitions) {
    if (!detail?.estatus) {
        return null;
    }

    if (availableTransitions.length > 0) {
        return 'Selecciona la siguiente transición operativa disponible para tu rol.';
    }

    if (normalizeCatalogName(detail.estatus.nombre_estatus) === 'CERRADO') {
        return 'El alertamiento ya se encuentra cerrado. No hay transiciones disponibles.';
    }

    if (!user?.rol?.nombre_rol) {
        return 'No fue posible determinar el rol autenticado para habilitar transiciones.';
    }

    return 'Tu rol actual no tiene una transición disponible para el estatus en que se encuentra este alertamiento.';
}

function DetailPair({ label, value, mono = false, hideWhenEmpty = false }) {
    const hasValue = value !== undefined && value !== null && String(value).trim() !== '';

    if (hideWhenEmpty && !hasValue) {
        return null;
    }

    return (
        <p>
            <strong>{label}:</strong>{' '}
            <span className={mono ? 'mono' : ''}>{hasValue ? value : 'Sin dato'}</span>
        </p>
    );
}

function StatusBadge({ value }) {
    return (
        <span className={getAlertamientoStatusClassName(value)}>
            {value || 'Sin estatus'}
        </span>
    );
}

function DetailIcon({ type }) {
    const icons = {
        status: (
            <>
                <path d="M12 3l7 3v5c0 4.5-2.8 7.5-7 9-4.2-1.5-7-4.5-7-9V6l7-3z" />
                <path d="M9 12l2 2 4-4" />
            </>
        ),
        level: (
            <>
                <path d="M12 3l8 4-8 4-8-4 8-4z" />
                <path d="M4 12l8 4 8-4" />
                <path d="M4 17l8 4 8-4" />
            </>
        ),
        role: (
            <>
                <rect x="4" y="5" width="16" height="14" rx="2" />
                <path d="M8 9h8" />
                <path d="M8 13h5" />
                <circle cx="16.5" cy="14.5" r="1.7" />
            </>
        ),
        date: (
            <>
                <rect x="4" y="5" width="16" height="15" rx="2" />
                <path d="M8 3v4" />
                <path d="M16 3v4" />
                <path d="M4 10h16" />
                <path d="M12 14v3" />
                <path d="M12 17h3" />
            </>
        ),
        identification: (
            <>
                <rect x="4" y="5" width="16" height="14" rx="2" />
                <path d="M8 10h8" />
                <path d="M8 14h5" />
            </>
        ),
        location: (
            <>
                <path d="M12 21s6-5.1 6-11a6 6 0 0 0-12 0c0 5.9 6 11 6 11z" />
                <circle cx="12" cy="10" r="2" />
            </>
        ),
        source: (
            <>
                <path d="M5 12a7 7 0 0 1 14 0" />
                <path d="M8 12a4 4 0 0 1 8 0" />
                <path d="M12 12v7" />
                <path d="M9 19h6" />
            </>
        ),
        user: (
            <>
                <circle cx="12" cy="8" r="3" />
                <path d="M5 20a7 7 0 0 1 14 0" />
            </>
        ),
        refresh: (
            <>
                <path d="M20 11a8 8 0 0 0-14.5-4.5L4 8" />
                <path d="M4 4v4h4" />
                <path d="M4 13a8 8 0 0 0 14.5 4.5L20 16" />
                <path d="M20 20v-4h-4" />
            </>
        )
    };

    return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
            {icons[type] || icons.identification}
        </svg>
    );
}

function AlertamientoDetailPage() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const [detail, setDetail] = useState(null);
    const [historial, setHistorial] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState(null);
    const [successMessage, setSuccessMessage] = useState(() => location.state?.flashMessage || null);
    const [statusErrorMessage, setStatusErrorMessage] = useState(null);
    const [selectedStatusId, setSelectedStatusId] = useState('');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const availableTransitions = getAvailableStatusTransitions(detail, user);
    const statusActionHint = getStatusActionHint(detail, user, availableTransitions);
    const executiveDate = detail?.fechas_control?.fecha_actualizacion
        || detail?.fechas_control?.fecha_creacion
        || detail?.fecha_hora_deteccion;
    const detectionOrCreationDate = detail?.fecha_hora_deteccion || detail?.fechas_control?.fecha_creacion;

    useEffect(() => {
        let isMounted = true;

        async function loadAlertamientoContext() {
            setIsLoading(true);
            setErrorMessage(null);

            try {
                const context = await fetchAlertamientoContext(id);

                if (!isMounted) {
                    return;
                }

                setDetail(context.detail);
                setHistorial(context.historial);
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setDetail(null);
                setHistorial([]);
                setErrorMessage(
                    getApiErrorMessage(error, 'No fue posible obtener el detalle del alertamiento.')
                );
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        void loadAlertamientoContext();

        return () => {
            isMounted = false;
        };
    }, [id]);

    useEffect(() => {
        if (availableTransitions.length > 0) {
            setSelectedStatusId(String(availableTransitions[0].id_estatus_alertamiento));
            return;
        }

        setSelectedStatusId('');
    }, [detail?.estatus?.id_estatus_alertamiento, detail?.estatus?.orden_flujo, user?.rol?.nombre_rol]);

    async function handleStatusSubmit(event) {
        event.preventDefault();

        if (!selectedStatusId) {
            return;
        }

        setIsUpdatingStatus(true);
        setStatusErrorMessage(null);
        setSuccessMessage(null);

        try {
            const response = await updateAlertamientoStatusRequest(id, {
                id_estatus_alertamiento: Number.parseInt(selectedStatusId, 10)
            });
            const updatedContext = await fetchAlertamientoContext(id);

            setDetail(updatedContext.detail);
            setHistorial(updatedContext.historial);
            setErrorMessage(null);
            setSuccessMessage(
                response.message || 'Estatus de alertamiento actualizado correctamente.'
            );
        } catch (error) {
            setStatusErrorMessage(getStatusUpdateErrorMessage(error));
        } finally {
            setIsUpdatingStatus(false);
        }
    }

    return (
        <section className="card card--wide alertamiento-detail-page">
            <div className="section-heading section-heading--module alertamiento-detail-heading">
                <div className="section-heading__content">
                    <p className="breadcrumb-text">Alertamientos &gt; Detalle</p>
                    <p className="eyebrow">Detalle operativo</p>
                    <h2 className="title">Detalle de Alertamiento</h2>
                    <p className="subtitle">
                        Consulta detallada del registro y su historial cronológico.
                    </p>
                </div>

                <div className="button-row alertamiento-detail-heading__actions">
                    <Link className="button button--ghost" to="/alertamientos">
                        Volver al listado
                    </Link>
                    <button className="button" type="button" onClick={() => navigate(-1)}>
                        Regresar
                    </button>
                </div>
            </div>

            {isLoading ? (
                <p className="loading-state">Consultando detalle e historial del alertamiento...</p>
            ) : null}

            {successMessage ? <p className="message message--success">{successMessage}</p> : null}
            {errorMessage ? <p className="message">{errorMessage}</p> : null}

            {detail ? (
                <>
                    <section className="detail-executive-summary">
                        <div className="detail-executive-summary__title">
                            <span>Folio / Placa principal</span>
                            <strong className="mono">{detail.placa_detectada || detail.folio_alertamiento || 'Sin placa'}</strong>
                        </div>

                        <div className="detail-executive-summary__grid">
                            <div className="detail-executive-summary__metric detail-executive-summary__metric--status">
                                <span className="detail-executive-summary__metric-icon">
                                    <DetailIcon type="status" />
                                </span>
                                <div className="detail-executive-summary__metric-copy">
                                    <span className="detail-executive-summary__metric-label">Estatus actual</span>
                                    <StatusBadge value={detail.estatus?.nombre_estatus} />
                                </div>
                            </div>
                            <div className="detail-executive-summary__metric">
                                <span className="detail-executive-summary__metric-icon">
                                    <DetailIcon type="level" />
                                </span>
                                <div className="detail-executive-summary__metric-copy">
                                    <span className="detail-executive-summary__metric-label">Nivel operativo</span>
                                    <strong>{user?.nivel_operativo?.nombre_nivel || 'Sin nivel'}</strong>
                                </div>
                            </div>
                            <div className="detail-executive-summary__metric">
                                <span className="detail-executive-summary__metric-icon">
                                    <DetailIcon type="role" />
                                </span>
                                <div className="detail-executive-summary__metric-copy">
                                    <span className="detail-executive-summary__metric-label">Rol actual</span>
                                    <strong>{user?.rol?.nombre_rol || 'Sin rol'}</strong>
                                </div>
                            </div>
                            <div className="detail-executive-summary__metric">
                                <span className="detail-executive-summary__metric-icon">
                                    <DetailIcon type="date" />
                                </span>
                                <div className="detail-executive-summary__metric-copy">
                                    <span className="detail-executive-summary__metric-label">Fecha de control</span>
                                    <strong>{formatDateTime(executiveDate)}</strong>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="alertamiento-detail-layout">
                        <div className="alertamiento-detail-main">
                            <section className="summary-box detail-general-card">
                                <div className="detail-general-card__heading">
                                    <div className="detail-general-card__title-row">
                                        <span className="detail-general-card__icon" aria-hidden="true">
                                            <DetailIcon type="identification" />
                                        </span>
                                        <div>
                                            <h3>Información general del alertamiento</h3>
                                            <p>Datos principales del registro, su origen y contexto operativo visible.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="detail-general-grid">
                                    <section className="detail-general-section">
                                        <h4>
                                            <span className="detail-general-section__icon" aria-hidden="true">
                                                <DetailIcon type="identification" />
                                            </span>
                                            <span>Identificación</span>
                                        </h4>
                                        <DetailPair label="ID alertamiento" value={detail.id_alertamiento} mono />
                                        <DetailPair label="Folio" value={detail.folio_alertamiento} mono />
                                        <DetailPair label="Placa" value={detail.placa_detectada} mono hideWhenEmpty />
                                        <DetailPair label="Fecha/hora de detección" value={formatDateTime(detectionOrCreationDate)} />
                                        <DetailPair
                                            label="Fecha de control"
                                            value={executiveDate ? formatDateTime(executiveDate) : null}
                                            hideWhenEmpty
                                        />
                                    </section>

                                    <section className="detail-general-section">
                                        <h4>
                                            <span className="detail-general-section__icon" aria-hidden="true">
                                                <DetailIcon type="location" />
                                            </span>
                                            <span>Ubicación de detección</span>
                                        </h4>
                                        <DetailPair label="Latitud" value={detail.ubicacion_deteccion?.latitud_deteccion} mono />
                                        <DetailPair label="Longitud" value={detail.ubicacion_deteccion?.longitud_deteccion} mono />
                                        <DetailPair label="Entidad operativa" value={detail.contexto_operativo?.estado_operativo?.nombre_estado} hideWhenEmpty />
                                        <DetailPair label="Torre asociada" value={detail.contexto_operativo?.torre?.nombre_torre} hideWhenEmpty />
                                        <DetailPair label="Region operativa" value={detail.contexto_operativo?.region?.nombre_region} hideWhenEmpty />
                                        <DetailPair label="Territorio" value={detail.contexto_operativo?.territorio?.nombre_territorio} hideWhenEmpty />
                                    </section>

                                    <section className="detail-general-section">
                                        <h4>
                                            <span className="detail-general-section__icon" aria-hidden="true">
                                                <DetailIcon type="source" />
                                            </span>
                                            <span>Origen / estatus</span>
                                        </h4>
                                        <p>
                                            <strong>Estatus:</strong>{' '}
                                            <StatusBadge value={detail.estatus?.nombre_estatus} />
                                        </p>
                                        <DetailPair label="Fuente de información" value={detail.origen_registro} hideWhenEmpty />
                                        <DetailPair
                                            label="Fecha de actualización"
                                            value={detail.fechas_control?.fecha_actualizacion
                                                ? formatDateTime(detail.fechas_control.fecha_actualizacion)
                                                : null}
                                            hideWhenEmpty
                                        />
                                        <DetailPair label="Observaciones" value={detail.observaciones} hideWhenEmpty />
                                    </section>

                                    <section className="detail-general-section">
                                        <h4>
                                            <span className="detail-general-section__icon" aria-hidden="true">
                                                <DetailIcon type="user" />
                                            </span>
                                            <span>Usuario creador</span>
                                        </h4>
                                        <DetailPair label="Usuario creador" value={detail.usuario_creador?.nombre_usuario} mono />
                                        <DetailPair label="Nombre completo" value={detail.usuario_creador?.nombre_completo} hideWhenEmpty />
                                        <DetailPair
                                            label="Registro asociado"
                                            value={detail.fechas_control?.fecha_creacion
                                                ? formatDateTime(detail.fechas_control.fecha_creacion)
                                                : null}
                                            hideWhenEmpty
                                        />
                                    </section>
                                </div>
                            </section>

                            <section className="history-section detail-history-section">
                                <div className="section-heading section-heading--compact">
                                    <div>
                                        <h3 className="title title--small">Historial del alertamiento</h3>
                                        <p className="subtitle subtitle--small">
                                            La línea de tiempo se muestra en orden cronológico ascendente.
                                        </p>
                                    </div>
                                </div>

                                {historial.length === 0 ? (
                                    <div className="empty-state">
                                        <h3>Sin historial</h3>
                                        <p>Este alertamiento no tiene eventos de historial visibles.</p>
                                    </div>
                                ) : (
                                    <div className="timeline detail-timeline">
                                        {historial.map((evento) => (
                                            <article
                                                key={evento.id_historial_alertamiento}
                                                className="timeline-item detail-timeline__item"
                                            >
                                                <div className="timeline-item__marker detail-timeline__marker" />
                                                <div className="timeline-item__content detail-timeline__card">
                                                    <div className="detail-timeline__status">
                                                        <StatusBadge value={evento.estatus?.nombre_estatus} />
                                                        <span className="timeline-item__meta detail-timeline__user">
                                                            Usuario: <span className="mono">{evento.usuario?.nombre_usuario || 'Sistema'}</span>
                                                        </span>
                                                    </div>
                                                    <p className="timeline-item__text detail-timeline__text">
                                                        {evento.observaciones || 'Sin observaciones.'}
                                                    </p>
                                                    <span className="timeline-item__meta detail-timeline__date">
                                                        {formatDateTime(evento.fecha_evento)}
                                                    </span>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>

                        <aside className="alertamiento-detail-sidebar">
                            <div className="detail-control-panel">
                                <section className="detail-side-card detail-side-card--authorization">
                                    <div className="detail-side-card__heading">
                                        <span className="detail-side-card__heading-icon" aria-hidden="true">
                                            <DetailIcon type="role" />
                                        </span>
                                        <div>
                                            <h3>Contexto de autorización</h3>
                                            <p>Perfil y alcance aplicados al registro.</p>
                                        </div>
                                    </div>
                                    <div className="detail-badge-stack">
                                        <span className="detail-soft-badge">
                                            <span>Perfil autorizado</span>
                                            <strong>{user?.rol?.nombre_rol || 'Sin rol'}</strong>
                                        </span>
                                        <span className="detail-soft-badge">
                                            <span>Alcance operativo</span>
                                            <strong>{user?.nivel_operativo?.nombre_nivel || 'Sin nivel'}</strong>
                                        </span>
                                        <span className="detail-soft-badge detail-soft-badge--status">
                                            <span>Estatus</span>
                                            <StatusBadge value={detail.estatus?.nombre_estatus} />
                                        </span>
                                    </div>
                                </section>

                                <section className="status-action-panel detail-side-card detail-side-card--action">
                                    <div className="detail-side-card__heading detail-side-card__heading--action">
                                        <span className="detail-side-card__heading-icon" aria-hidden="true">
                                            <DetailIcon type="status" />
                                        </span>
                                        <div>
                                            <h3>Transición operativa</h3>
                                            <p>
                                                {statusActionHint}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="status-action-panel__body">
                                        {availableTransitions.length > 0 ? (
                                            <form className="status-action-form" onSubmit={handleStatusSubmit}>
                                                <div className="field">
                                                    <label htmlFor="id_estatus_alertamiento">Siguiente estatus</label>
                                                    <select
                                                        id="id_estatus_alertamiento"
                                                        name="id_estatus_alertamiento"
                                                        value={selectedStatusId}
                                                        onChange={(event) => setSelectedStatusId(event.target.value)}
                                                        disabled={isUpdatingStatus}
                                                    >
                                                        {availableTransitions.map((transition) => (
                                                            <option
                                                                key={transition.id_estatus_alertamiento}
                                                                value={transition.id_estatus_alertamiento}
                                                            >
                                                                {transition.nombre_estatus}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="button-row">
                                                    <button
                                                    className="button"
                                                    type="submit"
                                                    disabled={isUpdatingStatus}
                                                >
                                                    <span className="button__icon" aria-hidden="true">
                                                        <DetailIcon type="refresh" />
                                                    </span>
                                                    {isUpdatingStatus ? 'Actualizando estatus...' : 'Actualizar estatus'}
                                                </button>
                                            </div>
                                            </form>
                                        ) : (
                                            <p className="status-action-note">
                                                {statusActionHint}
                                            </p>
                                        )}

                                        {statusErrorMessage ? <p className="message">{statusErrorMessage}</p> : null}
                                    </div>
                                </section>

                                <section className="detail-side-card detail-side-card--quick">
                                    <div className="detail-side-card__heading detail-side-card__heading--small">
                                        <span className="detail-side-card__heading-icon" aria-hidden="true">
                                            <DetailIcon type="identification" />
                                        </span>
                                        <div>
                                            <h3>Resumen rápido</h3>
                                        </div>
                                    </div>
                                    <div className="detail-quick-grid">
                                        <div className="detail-quick-item">
                                            <span>Placa</span>
                                            <strong className="mono">{detail.placa_detectada || 'Sin dato'}</strong>
                                        </div>
                                        <div className="detail-quick-item">
                                            <span>Torre</span>
                                            <strong>{detail.contexto_operativo?.torre?.nombre_torre || 'Sin dato'}</strong>
                                        </div>
                                        <div className="detail-quick-item">
                                            <span>Última fecha</span>
                                            <strong>{formatDateTime(executiveDate)}</strong>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </aside>
                    </div>
                </>
            ) : null}
        </section>
    );
}

export default AlertamientoDetailPage;
