import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    getAlertamientoDetailRequest,
    getAlertamientoHistorialRequest
} from '../api/alertamientos.api';

function getApiErrorMessage(error, fallbackMessage) {
    return error?.response?.data?.message || fallbackMessage;
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
    const [detail, setDetail] = useState(null);
    const [historial, setHistorial] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState(null);
    const flashMessage = location.state?.flashMessage || null;

    useEffect(() => {
        let isMounted = true;

        async function fetchAlertamientoContext() {
            setIsLoading(true);
            setErrorMessage(null);

            try {
                // Se consultan detalle e historial en paralelo porque ambos
                // dependen del mismo id y no bloquean uno al otro.
                const [detailResponse, historialResponse] = await Promise.all([
                    getAlertamientoDetailRequest(id),
                    getAlertamientoHistorialRequest(id)
                ]);

                if (!isMounted) {
                    return;
                }

                setDetail(detailResponse.data);
                setHistorial(historialResponse.data || []);
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setErrorMessage(
                    getApiErrorMessage(error, 'No fue posible obtener el detalle del alertamiento.')
                );
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        void fetchAlertamientoContext();

        return () => {
            isMounted = false;
        };
    }, [id]);

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

            {flashMessage ? <p className="message message--success">{flashMessage}</p> : null}
            {errorMessage ? <p className="message">{errorMessage}</p> : null}

            {detail ? (
                <>
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
