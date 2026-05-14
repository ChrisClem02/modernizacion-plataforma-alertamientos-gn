import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { getBitacoraAuditoriaDetailRequest } from '../api/auditoria.api';

const TABLE_OPTIONS = [
    { value: 'usuario', label: 'Usuarios' },
    { value: 'usuario_ambito', label: 'Ambitos de usuario' },
    { value: 'alertamiento_vehicular', label: 'Alertamientos' },
    { value: 'historial_alertamiento', label: 'Historial de alertamiento' },
    { value: 'torre_tidv', label: 'Torres TIDV' },
    { value: 'central_operativa', label: 'Centrales operativas' }
];

function getApiErrorMessage(error, fallbackMessage) {
    return error?.response?.data?.message || fallbackMessage;
}

function formatDateTime(value) {
    if (!value) {
        return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'long',
        timeStyle: 'medium'
    }).format(new Date(value));
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

function normalizeAuditValue(value) {
    return typeof value === 'string'
        ? value.trim().toUpperCase()
        : '';
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

function formatJson(value) {
    if (value === null || value === undefined) {
        return null;
    }

    return JSON.stringify(value, null, 2);
}

function isPlainAuditObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function formatAuditFieldName(fieldName) {
    return String(fieldName)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatAuditDisplayValue(value) {
    if (value === null || value === undefined || value === '') {
        return 'Sin valor';
    }

    if (typeof value === 'boolean') {
        return value ? 'Si' : 'No';
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return String(value);
}

function areAuditValuesEqual(previousValue, currentValue) {
    return JSON.stringify(previousValue ?? null) === JSON.stringify(currentValue ?? null);
}

function buildAuditChangeRows(previousRecord, currentRecord) {
    const previousObject = isPlainAuditObject(previousRecord) ? previousRecord : {};
    const currentObject = isPlainAuditObject(currentRecord) ? currentRecord : {};
    const fieldNames = Array.from(new Set([
        ...Object.keys(previousObject),
        ...Object.keys(currentObject)
    ])).sort();

    return fieldNames
        .filter((fieldName) => !areAuditValuesEqual(previousObject[fieldName], currentObject[fieldName]))
        .map((fieldName) => ({
            fieldName,
            previousValue: formatAuditDisplayValue(previousObject[fieldName]),
            currentValue: formatAuditDisplayValue(currentObject[fieldName])
        }));
}

function AuditDetailIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M12 3.5 5.5 6v5.5c0 4.1 2.7 7.3 6.5 9 3.8-1.7 6.5-4.9 6.5-9V6L12 3.5Z" />
            <path d="M8.5 10.5h7" />
            <path d="M8.5 14h4.5" />
        </svg>
    );
}

function AuditChangeSummary({ previousRecord, currentRecord }) {
    const changedRows = buildAuditChangeRows(previousRecord, currentRecord);

    return (
        <article className="audit-change-summary">
            <div className="audit-change-summary__heading">
                <div>
                    <h3>Resumen del cambio</h3>
                    <p>
                        Comparacion sencilla de los campos registrados antes y despues del movimiento.
                    </p>
                </div>
                <span>{changedRows.length} campo{changedRows.length === 1 ? '' : 's'}</span>
            </div>

            {changedRows.length > 0 ? (
                <div className="table-wrapper audit-change-summary__table">
                    <table className="data-table data-table--audit-changes">
                        <thead>
                            <tr>
                                <th>Campo</th>
                                <th>Valor previo</th>
                                <th>Valor registrado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {changedRows.map((row) => (
                                <tr key={row.fieldName}>
                                    <td>{formatAuditFieldName(row.fieldName)}</td>
                                    <td>
                                        <span className="audit-change-summary__value">
                                            {row.previousValue}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="audit-change-summary__value">
                                            {row.currentValue}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="audit-json-panel__empty">
                    No se detectaron diferencias comparables para mostrar en resumen.
                </p>
            )}
        </article>
    );
}

function AuditJsonPanel({ title, value, helperText }) {
    const formattedJson = formatJson(value);

    return (
        <article className="audit-json-panel">
            <div className="audit-json-panel__heading">
                <div>
                    <h3>{title}</h3>
                    <p>{helperText}</p>
                </div>
                <span>{formattedJson ? 'JSON redactado' : 'Sin captura'}</span>
            </div>

            {formattedJson ? (
                <pre className="audit-json-panel__content">{formattedJson}</pre>
            ) : (
                <p className="audit-json-panel__empty">
                    No existe informacion JSON para esta seccion del movimiento.
                </p>
            )}
        </article>
    );
}

function AuditMetaItem({ label, value, mono = false }) {
    return (
        <div className="audit-detail-meta__item">
            <span>{label}</span>
            <strong className={mono ? 'mono' : undefined}>{value || 'No disponible'}</strong>
        </div>
    );
}

function AuditoriaDetailPage() {
    const { id } = useParams();
    const location = useLocation();
    const [entry, setEntry] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState(null);
    const returnTo = location.state?.returnTo || '/auditoria';

    // El detalle se consulta bajo demanda para no cargar JSON en el listado.
    // El backend ya devuelve los campos sensibles redactados.
    useEffect(() => {
        let isMounted = true;

        async function fetchAuditDetail() {
            setIsLoading(true);
            setErrorMessage(null);

            try {
                const response = await getBitacoraAuditoriaDetailRequest(id);

                if (!isMounted) {
                    return;
                }

                setEntry(response.data);
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setErrorMessage(
                    getApiErrorMessage(error, 'No fue posible consultar el detalle de auditoria.')
                );
                setEntry(null);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        void fetchAuditDetail();

        return () => {
            isMounted = false;
        };
    }, [id]);

    return (
        <section className="card card--wide auditoria-detail-page">
            <div className="section-heading section-heading--module">
                <div className="section-heading__content">
                    <p className="eyebrow">Detalle de trazabilidad</p>
                    <h2 className="title">Movimiento de auditoria</h2>
                    <p className="subtitle">
                        Consulta el resumen del cambio y la evidencia tecnica protegida.
                    </p>
                </div>

                <div className="section-heading__aside">
                    <Link className="button button--secondary button--inline" to={returnTo}>
                        Volver a bitacora
                    </Link>
                </div>
            </div>

            {isLoading ? <p className="loading-state">Consultando detalle de auditoria...</p> : null}
            {errorMessage ? <p className="message">{errorMessage}</p> : null}

            {!isLoading && entry ? (
                <>
                    <article className="audit-detail-summary">
                        <span className="audit-detail-summary__icon" aria-hidden="true">
                            <AuditDetailIcon />
                        </span>

                        <div className="audit-detail-summary__copy">
                            <span className={getEventPillClassName(entry.evento?.nombre_evento)}>
                                {getEventDisplayLabel(entry.evento?.nombre_evento)}
                            </span>
                            <h3>
                                {getModuleDisplayLabel(entry.nombre_tabla)}
                                {' '}
                                <small className="mono">#{entry.id_registro}</small>
                            </h3>
                            <p>{entry.seguridad?.mensaje || 'Detalle protegido para consulta administrativa.'}</p>
                        </div>
                    </article>

                    <div className="audit-detail-meta">
                        <AuditMetaItem label="ID auditoria" value={entry.id_bitacora_auditoria} mono />
                        <AuditMetaItem label="Fecha evento" value={formatDateTime(entry.fecha_evento)} />
                        <AuditMetaItem label="Usuario" value={getActorLabel(entry)} />
                        <AuditMetaItem label="Usuario tecnico" value={entry.usuario?.nombre_usuario || 'Sin usuario'} mono />
                        <AuditMetaItem label="IP origen" value={entry.ip_origen || 'Sin IP'} mono />
                        <AuditMetaItem label="JSON protegido" value={entry.seguridad?.json_redactado ? 'Si' : 'No'} />
                    </div>

                    <AuditChangeSummary
                        previousRecord={entry.datos_anteriores}
                        currentRecord={entry.datos_nuevos}
                    />

                    <section className="audit-technical-evidence" aria-labelledby="audit-technical-evidence-title">
                        <div className="audit-technical-evidence__heading">
                            <h3 id="audit-technical-evidence-title">Evidencia tecnica</h3>
                            <p>
                                Respaldo original guardado por la bitacora. Se mantiene visible para auditoria,
                                con datos sensibles protegidos.
                            </p>
                        </div>

                        <div className="audit-json-grid">
                            <AuditJsonPanel
                                title="Registro previo"
                                value={entry.datos_anteriores}
                                helperText="Informacion que existia antes del movimiento, si aplica."
                            />
                            <AuditJsonPanel
                                title="Registro resultante"
                                value={entry.datos_nuevos}
                                helperText="Informacion almacenada despues del movimiento, si aplica."
                            />
                        </div>
                    </section>
                </>
            ) : null}
        </section>
    );
}

export default AuditoriaDetailPage;
