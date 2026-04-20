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
        return backendMessage || 'La transicion solicitada no es valida para este alertamiento.';
    }

    if (statusCode === 403) {
        return backendMessage || 'Tu rol actual no tiene permiso para cambiar este alertamiento.';
    }

    if (statusCode === 404) {
        return backendMessage || 'El alertamiento ya no existe o dejo de ser visible para tu ambito.';
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
        return 'Selecciona la siguiente transicion operativa disponible para tu rol.';
    }

    if (normalizeCatalogName(detail.estatus.nombre_estatus) === 'CERRADO') {
        return 'El alertamiento ya se encuentra cerrado. No hay transiciones disponibles.';
    }

    if (!user?.rol?.nombre_rol) {
        return 'No fue posible determinar el rol autenticado para habilitar transiciones.';
    }

    return 'Tu rol actual no tiene una transicion disponible para el estatus en que se encuentra este alertamiento.';
}

function DetailPair({ label, value, mono = false }) {
    return (
        <p>
            <strong>{label}:</strong>{' '}
            <span className={mono ? 'mono' : ''}>{value ?? 'Sin dato'}</span>
        </p>
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
        <section className="card card--wide">
            <div className="section-heading">
                <div>
                    <p className="eyebrow">Detalle Operativo</p>
                    <h2 className="title">Alertamiento #{id}</h2>
                    <p className="subtitle">
                        Consulta detallada del registro y su historial cronologico.
                    </p>
                </div>

                <div className="button-row">
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
                    <section className="status-action-panel">
                        <div className="section-heading section-heading--compact">
                            <div>
                                <h3 className="title title--small">Cambio de estatus</h3>
                                <p className="subtitle subtitle--small">
                                    {statusActionHint}
                                </p>
                            </div>
                        </div>

                        <div className="status-action-grid">
                            <section className="summary-box">
                                <h3>Contexto de autorizacion</h3>
                                <DetailPair label="rol_actual" value={user?.rol?.nombre_rol} />
                                <DetailPair label="nivel_operativo" value={user?.nivel_operativo?.nombre_nivel} />
                                <DetailPair label="estatus_actual" value={detail.estatus?.nombre_estatus} />
                            </section>

                            <section className="summary-box">
                                <h3>Transicion operativa</h3>

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
                            </section>
                        </div>
                    </section>

                    <div className="summary-grid">
                        <section className="summary-box">
                            <h3>Identificacion</h3>
                            <DetailPair label="id_alertamiento" value={detail.id_alertamiento} mono />
                            <DetailPair label="folio_alertamiento" value={detail.folio_alertamiento} mono />
                            <DetailPair label="placa_detectada" value={detail.placa_detectada} mono />
                            <DetailPair label="fecha_hora_deteccion" value={formatDateTime(detail.fecha_hora_deteccion)} />
                        </section>

                        <section className="summary-box">
                            <h3>Estatus y origen</h3>
                            <DetailPair label="estatus" value={detail.estatus?.nombre_estatus} />
                            <DetailPair label="orden_flujo" value={detail.estatus?.orden_flujo} mono />
                            <DetailPair label="origen_registro" value={detail.origen_registro} />
                            <DetailPair label="observaciones" value={detail.observaciones} />
                        </section>

                        <section className="summary-box">
                            <h3>Ubicacion de deteccion</h3>
                            <DetailPair label="latitud_deteccion" value={detail.ubicacion_deteccion?.latitud_deteccion} mono />
                            <DetailPair label="longitud_deteccion" value={detail.ubicacion_deteccion?.longitud_deteccion} mono />
                            <DetailPair label="carril" value={detail.ubicacion_deteccion?.carril} />
                            <DetailPair label="sentido_vial" value={detail.ubicacion_deteccion?.sentido_vial} />
                        </section>

                        <section className="summary-box">
                            <h3>Usuario creador</h3>
                            <DetailPair label="id_usuario" value={detail.usuario_creador?.id_usuario} mono />
                            <DetailPair label="nombre_usuario" value={detail.usuario_creador?.nombre_usuario} mono />
                            <DetailPair label="nombre_completo" value={detail.usuario_creador?.nombre_completo} />
                        </section>

                        <section className="summary-box">
                            <h3>Contexto operativo</h3>
                            <DetailPair label="torre" value={detail.contexto_operativo?.torre?.nombre_torre} />
                            <DetailPair label="central" value={detail.contexto_operativo?.central?.nombre_central} />
                            <DetailPair label="region" value={detail.contexto_operativo?.region?.nombre_region} />
                            <DetailPair label="estado_operativo" value={detail.contexto_operativo?.estado_operativo?.nombre_estado} />
                            <DetailPair label="territorio" value={detail.contexto_operativo?.territorio?.nombre_territorio} />
                        </section>

                        <section className="summary-box">
                            <h3>Fechas de control</h3>
                            <DetailPair label="fecha_creacion" value={formatDateTime(detail.fechas_control?.fecha_creacion)} />
                            <DetailPair label="fecha_actualizacion" value={formatDateTime(detail.fechas_control?.fecha_actualizacion)} />
                        </section>
                    </div>

                    <section className="history-section">
                        <div className="section-heading section-heading--compact">
                            <div>
                                <h3 className="title title--small">Historial del alertamiento</h3>
                                <p className="subtitle subtitle--small">
                                    La linea de tiempo se muestra en orden cronologico ascendente.
                                </p>
                            </div>
                        </div>

                        {historial.length === 0 ? (
                            <div className="empty-state">
                                <h3>Sin historial</h3>
                                <p>Este alertamiento no tiene eventos de historial visibles.</p>
                            </div>
                        ) : (
                            <div className="timeline">
                                {historial.map((evento) => (
                                    <article key={evento.id_historial_alertamiento} className="timeline-item">
                                        <div className="timeline-item__marker" />
                                        <div className="timeline-item__content">
                                            <p className="timeline-item__title">
                                                {evento.estatus?.nombre_estatus || 'Sin estatus'}
                                            </p>
                                            <p className="timeline-item__meta">
                                                {formatDateTime(evento.fecha_evento)}
                                            </p>
                                            <p className="timeline-item__meta">
                                                Usuario: <span className="mono">{evento.usuario?.nombre_usuario || 'Sistema'}</span>
                                            </p>
                                            <p className="timeline-item__text">
                                                {evento.observaciones || 'Sin observaciones.'}
                                            </p>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            ) : null}
        </section>
    );
}

export default AlertamientoDetailPage;
