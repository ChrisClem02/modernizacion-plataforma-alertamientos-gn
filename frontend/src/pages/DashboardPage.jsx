import React, { useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';

// Placeholder visual para demo: reemplazar por métricas reales cuando exista
// un servicio de resumen operativo.
const DASHBOARD_DEMO_METRICS = [
    {
        label: 'Total alertamientos',
        value: '5',
        detail: 'Visibles para el perfil actual',
        tone: 'total'
    },
    {
        label: 'Alertamientos activos',
        value: '3',
        detail: 'En seguimiento operativo',
        tone: 'active'
    },
    {
        label: 'Alertamientos cerrados',
        value: '2',
        detail: 'Con atención concluida',
        tone: 'closed'
    },
    {
        label: 'Registrados hoy',
        value: '1',
        detail: 'Altas del día operativo',
        tone: 'today'
    }
];

// Iconos SVG inline: evitan dependencias externas y mantienen los acentos
// institucionales usando el color heredado del contenedor.
function DashboardMetricIcon({ tone }) {
    if (tone === 'active') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M4 12h3l2-5 4 10 2-5h5" />
                <path d="M18.5 5.5a8.5 8.5 0 0 1 0 13" />
                <path d="M5.5 18.5a8.5 8.5 0 0 1 0-13" />
            </svg>
        );
    }

    if (tone === 'closed') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8" />
                <path d="m8.5 12.2 2.3 2.3 4.9-5" />
            </svg>
        );
    }

    if (tone === 'today') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <rect x="5" y="6.5" width="14" height="13" rx="2" />
                <path d="M8 4.5v4" />
                <path d="M16 4.5v4" />
                <path d="M5 10.5h14" />
                <path d="M9 14h2" />
                <path d="M13 14h2" />
            </svg>
        );
    }

    return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M7 10a5 5 0 0 1 10 0v3.5l1.7 2.6H5.3L7 13.5V10Z" />
            <path d="M10 19a2 2 0 0 0 4 0" />
            <path d="M9 5.5 7.8 4.3" />
            <path d="m15 5.5 1.2-1.2" />
        </svg>
    );
}

function DashboardContextIcon({ type }) {
    if (type === 'role') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M12 3.5 5.5 6v5.5c0 4.1 2.7 7.3 6.5 9 3.8-1.7 6.5-4.9 6.5-9V6L12 3.5Z" />
                <path d="M9.5 12 11 13.5 14.8 10" />
            </svg>
        );
    }

    if (type === 'level') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8" />
                <path d="M4 12h16" />
                <path d="M12 4c2.2 2.2 3.2 4.8 3.2 8s-1 5.8-3.2 8" />
                <path d="M12 4c-2.2 2.2-3.2 4.8-3.2 8s1 5.8 3.2 8" />
            </svg>
        );
    }

    if (type === 'scope') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M12 21s6-5.2 6-11a6 6 0 0 0-12 0c0 5.8 6 11 6 11Z" />
                <circle cx="12" cy="10" r="2.2" />
            </svg>
        );
    }

    return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="3.2" />
            <path d="M5.5 19c1.2-3.3 3.3-5 6.5-5s5.3 1.7 6.5 5" />
        </svg>
    );
}

function DashboardPage() {
    const {
        user,
        isLoading,
        errorMessage,
        fetchMe
    } = useAuthStore((state) => ({
        user: state.user,
        isLoading: state.isLoading,
        errorMessage: state.errorMessage,
        fetchMe: state.fetchMe
    }));
    const rolNombre = user?.rol?.nombre_rol || 'Sin rol';
    const nivelNombre = user?.nivel_operativo?.nombre_nivel || 'Sin nivel operativo';
    const ambito = user?.ambito;
    const ambitoNombre = ambito?.torre?.nombre_torre
        || ambito?.territorio?.nombre_territorio
        || ambito?.estado?.nombre_estado
        || (ambito?.ambito_nacional ? 'Cobertura nacional' : 'Sin ámbito asignado');
    const ambitoDescripcion = ambito?.ambito_nacional
        ? 'Acceso a información de alcance nacional.'
        : 'Acceso conforme al ámbito operativo asignado.';
    // Se refresca el perfil al entrar al dashboard para reflejar el estado vigente,
    // incluso si la página fue recargada.
    useEffect(() => {
        void fetchMe().catch(() => {});
    }, [fetchMe]);

    return (
        <section className="card card--wide dashboard-shell">
            <div className="dashboard-heading">
                <p className="eyebrow">Vista institucional</p>

                <h2 className="title">Panel de control</h2>

                <p className="subtitle">
                    Acceso rápido a la operación de alertamientos y confirmación del contexto de visibilidad vigente.
                </p>
            </div>

            {errorMessage ? <p className="message">{errorMessage}</p> : null}

            {isLoading && !user ? (
                <p className="loading-state">Cargando datos del usuario autenticado...</p>
            ) : null}

            {user ? (
                <div className="dashboard-grid">
                    <section className="summary-box dashboard-card dashboard-card--primary">
                        <span className="dashboard-card__icon dashboard-card__icon--session" aria-hidden="true">
                            <DashboardContextIcon type="session" />
                        </span>
                        <span className="dashboard-card__label">Sesión activa</span>
                        <h3>{user.nombre_usuario}</h3>
                        <p>{user.correo_electronico}</p>
                        <p className="dashboard-card__meta">Sesión activa</p>
                    </section>

                    <section className="summary-box dashboard-card dashboard-card--role">
                        <span className="dashboard-card__icon dashboard-card__icon--role" aria-hidden="true">
                            <DashboardContextIcon type="role" />
                        </span>
                        <span className="dashboard-card__label">Rol institucional</span>
                        <h3>{rolNombre}</h3>
                        <p>Acceso con privilegios de administración.</p>
                    </section>

                    <section className="summary-box dashboard-card dashboard-card--level">
                        <span className="dashboard-card__icon dashboard-card__icon--level" aria-hidden="true">
                            <DashboardContextIcon type="level" />
                        </span>
                        <span className="dashboard-card__label">Nivel operativo</span>
                        <h3>{nivelNombre}</h3>
                        <p>Alcance operativo asignado al usuario.</p>
                    </section>

                    <section className="summary-box dashboard-card dashboard-card--scope">
                        <span className="dashboard-card__icon dashboard-card__icon--scope" aria-hidden="true">
                            <DashboardContextIcon type="scope" />
                        </span>
                        <span className="dashboard-card__label">Ámbito de visibilidad</span>
                        <h3>{ambitoNombre}</h3>
                        <p>{ambitoDescripcion}</p>
                    </section>
                </div>
            ) : null}

            <section className="dashboard-operational-summary" aria-labelledby="dashboard-operational-summary-title">
                <div className="dashboard-operational-summary__heading">
                    <div>
                        <p className="eyebrow">Resumen operativo</p>
                        <h3 id="dashboard-operational-summary-title">Indicadores principales</h3>
                    </div>
                </div>

                <div className="dashboard-metric-grid">
                    {DASHBOARD_DEMO_METRICS.map((metric) => (
                        <article
                            className={`dashboard-metric-card dashboard-metric-card--${metric.tone}`}
                            key={metric.label}
                        >
                            <span
                                className={`dashboard-metric-card__icon dashboard-metric-card__icon--${metric.tone}`}
                                aria-hidden="true"
                            >
                                <DashboardMetricIcon tone={metric.tone} />
                            </span>
                            <span className="dashboard-metric-card__label">{metric.label}</span>
                            <strong>{metric.value}</strong>
                            <p>{metric.detail}</p>
                        </article>
                    ))}
                </div>
            </section>
        </section>
    );
}

export default DashboardPage;
