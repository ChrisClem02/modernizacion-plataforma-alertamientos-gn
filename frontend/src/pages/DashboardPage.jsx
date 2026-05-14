import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAlertamientosRequest } from '../api/alertamientos.api';
import { getMapaRequest } from '../api/mapa.api';
import escudoGuardiaNacional from '../assets/escudo-guardia-nacional.png';
import emblemaGobierno from '../assets/gobierno-mexico-2024-2030.png';
import { useAuthStore } from '../store/auth.store';

function DashboardSectionIcon({ type }) {
    if (type === 'summary') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M5 18.5V10" />
                <path d="M10.5 18.5V5.5" />
                <path d="M16 18.5v-8" />
                <path d="M3.5 18.5h17" />
            </svg>
        );
    }

    if (type === 'quick-access') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M7 12h10" />
                <path d="m13 8 4 4-4 4" />
                <path d="M7 6.5h6" />
                <path d="M7 17.5h4" />
            </svg>
        );
    }

    return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M12 3.5 5.5 6v5.5c0 4.1 2.7 7.3 6.5 9 3.8-1.7 6.5-4.9 6.5-9V6L12 3.5Z" />
            <path d="M9.5 12 11 13.5 14.8 10" />
        </svg>
    );
}

function DashboardMetaIcon({ type }) {
    if (type === 'date') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <rect x="5" y="6.5" width="14" height="12.5" rx="2" />
                <path d="M8 4.5v4" />
                <path d="M16 4.5v4" />
                <path d="M5 10.5h14" />
            </svg>
        );
    }

    return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8" />
            <path d="M12 8v4.2l2.8 1.6" />
        </svg>
    );
}

function QuickAccessIcon({ type }) {
    if (type === 'alertamientos') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M7.2 10.2a4.8 4.8 0 0 1 9.6 0v3.4l1.8 2.6H5.4l1.8-2.6v-3.4Z" />
                <path d="M9.8 19a2.2 2.2 0 0 0 4.4 0" />
                <path d="M12 4.8V3.5" />
            </svg>
        );
    }

    if (type === 'mapa') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="m4.5 7.5 5-2 5 2 5-2v11l-5 2-5-2-5 2Z" />
                <path d="M9.5 5.5v11" />
                <path d="M14.5 7.5v11" />
                <path d="M12 12.5s2.2-1.8 2.2-3.8a2.2 2.2 0 0 0-4.4 0c0 2 2.2 3.8 2.2 3.8Z" />
            </svg>
        );
    }

    return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="9" cy="8.4" r="2.5" />
            <circle cx="16" cy="9.3" r="2.1" />
            <path d="M4.5 18.5c1-2.9 2.9-4.4 5.6-4.4s4.5 1.5 5.6 4.4" />
            <path d="M14.6 18.5c.7-1.9 2-2.9 3.8-2.9 1.2 0 2.3.5 3.1 1.6" />
        </svg>
    );
}

function DashboardMetricIcon({ type }) {
    if (type === 'today') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <rect x="5" y="6.5" width="14" height="12.5" rx="2" />
                <path d="M8 4.5v4" />
                <path d="M16 4.5v4" />
                <path d="M5 10.5h14" />
                <path d="M9 14h2" />
                <path d="M13 14h2" />
            </svg>
        );
    }

    if (type === 'torres') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M6.5 20V5.5h8V20" />
                <path d="M14.5 9h3v11" />
                <path d="M9 9h3" />
                <path d="M9 13h3" />
                <path d="M9 17h3" />
                <path d="M4.5 20h15" />
            </svg>
        );
    }

    if (type === 'mapa') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="m4.5 7.5 5-2 5 2 5-2v11l-5 2-5-2-5 2Z" />
                <path d="M9.5 5.5v11" />
                <path d="M14.5 7.5v11" />
            </svg>
        );
    }

    return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M7 10a5 5 0 0 1 10 0v3.5l1.7 2.6H5.3L7 13.5V10Z" />
            <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
    );
}

function ContextInfoIcon({ type }) {
    if (type === 'correo') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <rect x="4.5" y="6.5" width="15" height="11" rx="2" />
                <path d="m5.5 8 6.5 5 6.5-5" />
            </svg>
        );
    }

    if (type === 'rol') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M12 3.5 5.5 6v5.5c0 4.1 2.7 7.3 6.5 9 3.8-1.7 6.5-4.9 6.5-9V6L12 3.5Z" />
                <path d="M9.5 12 11 13.5 14.8 10" />
            </svg>
        );
    }

    if (type === 'nivel') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M5 18h14" />
                <path d="M7.5 14h9" />
                <path d="M10 10h4" />
                <path d="M12 6.2v.1" />
            </svg>
        );
    }

    if (type === 'ambito') {
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

function ArrowIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M5 12h11" />
            <path d="m12 5 7 7-7 7" />
        </svg>
    );
}

function getUserDisplayName(user) {
    return user?.nombre_completo || user?.nombre_usuario || 'Usuario institucional';
}

function getUserInitials(user) {
    const displayName = getUserDisplayName(user);
    const initials = displayName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

    return initials || 'UI';
}

function getAmbitoLabel(ambito) {
    if (!ambito) {
        return 'Sin ambito asignado';
    }

    if (ambito.ambito_nacional) {
        return 'Cobertura nacional';
    }

    if (ambito.tipo === 'TORRE') {
        return ambito.referencia?.nombre_torre || `Torre ${ambito.referencia?.id_torre || 'N/A'}`;
    }

    if (ambito.tipo === 'ESTATAL') {
        return ambito.referencia?.nombre_estado || `Estado ${ambito.referencia?.id_estado || 'N/A'}`;
    }

    if (ambito.tipo === 'TERRITORIAL') {
        return ambito.referencia?.nombre_territorio || `Territorio ${ambito.referencia?.id_territorio || 'N/A'}`;
    }

    return 'Sin ambito asignado';
}

function getAmbitoSupportText(ambito) {
    if (!ambito) {
        return 'El perfil no tiene un ambito institucional activo.';
    }

    if (ambito.ambito_nacional) {
        return 'El ambito nacional permite consultar la informacion disponible para todo el pais.';
    }

    return 'El ambito asignado determina la informacion disponible para este perfil.';
}

function formatCurrentDate(dateValue) {
    return new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'long'
    }).format(dateValue);
}

function formatCurrentTime(dateValue) {
    return new Intl.DateTimeFormat('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(dateValue);
}

function formatMetricNumber(value) {
    return new Intl.NumberFormat('es-MX').format(value);
}

function getMetricNumber(rawValue) {
    const numberValue = Number(rawValue);
    return Number.isFinite(numberValue) ? numberValue : null;
}

function getLocalDateFilter(dateValue) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function buildMetricCard({ key, title, value, detail, iconType }) {
    return {
        key,
        title,
        value: formatMetricNumber(value),
        detail,
        iconType
    };
}

function getMetricErrorCount(results) {
    return results.filter((result) => result.status === 'rejected').length;
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
    const [currentBrowserDate, setCurrentBrowserDate] = useState(() => new Date());
    const [summaryMetrics, setSummaryMetrics] = useState([]);
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);
    const [summaryErrorMessage, setSummaryErrorMessage] = useState(null);

    // El dashboard siempre revalida el contexto del usuario para no mostrar un
    // rol o ambito obsoleto despues de recargar la aplicacion.
    useEffect(() => {
        void fetchMe().catch(() => {});
    }, [fetchMe]);

    // La fecha y hora del encabezado se actualizan de forma discreta para que
    // el panel mantenga contexto temporal sin depender de un endpoint extra.
    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setCurrentBrowserDate(new Date());
        }, 60000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, []);

    // DB2 obtiene indicadores reales desde endpoints existentes. Cada llamada
    // se resuelve de forma independiente para que una falla parcial no rompa el
    // dashboard ni oculte las demas secciones.
    useEffect(() => {
        if (!user) {
            setSummaryMetrics([]);
            return;
        }

        let isMounted = true;

        async function fetchOperationalSummary() {
            setIsSummaryLoading(true);
            setSummaryErrorMessage(null);

            const todayFilter = getLocalDateFilter(new Date());
            const [totalResult, todayResult, mapaResult] = await Promise.allSettled([
                getAlertamientosRequest({ page: 1, limit: 1 }),
                getAlertamientosRequest({
                    page: 1,
                    limit: 1,
                    fecha_inicio: todayFilter,
                    fecha_fin: todayFilter
                }),
                getMapaRequest()
            ]);

            if (!isMounted) {
                return;
            }

            const nextMetrics = [];

            if (totalResult.status === 'fulfilled') {
                const totalVisible = getMetricNumber(totalResult.value?.pagination?.total_items);

                if (totalVisible !== null) {
                    nextMetrics.push(buildMetricCard({
                        key: 'total-alertamientos',
                        title: 'Total alertamientos',
                        value: totalVisible,
                        detail: 'Visibles para tu ambito',
                        iconType: 'total'
                    }));
                }
            }

            if (todayResult.status === 'fulfilled') {
                const registeredToday = getMetricNumber(todayResult.value?.pagination?.total_items);

                if (registeredToday !== null) {
                    nextMetrics.push(buildMetricCard({
                        key: 'registrados-hoy',
                        title: 'Registrados hoy',
                        value: registeredToday,
                        detail: 'Fecha local del navegador',
                        iconType: 'today'
                    }));
                }
            }

            if (mapaResult.status === 'fulfilled') {
                const mapaResumen = mapaResult.value?.resumen || {};
                const visibleTowers = getMetricNumber(mapaResumen.total_torres_visibles);
                const towersWithoutCoordinates = getMetricNumber(mapaResumen.torres_sin_coordenadas);
                const visibleMapAlerts = getMetricNumber(mapaResumen.total_alertamientos_filtrados);

                if (visibleTowers !== null) {
                    nextMetrics.push(buildMetricCard({
                        key: 'torres-visibles',
                        title: 'Torres visibles',
                        value: visibleTowers,
                        detail: towersWithoutCoordinates !== null
                            ? `${formatMetricNumber(towersWithoutCoordinates)} sin coordenadas`
                            : 'Segun mapa operativo',
                        iconType: 'torres'
                    }));
                }

                if (visibleMapAlerts !== null) {
                    nextMetrics.push(buildMetricCard({
                        key: 'alertamientos-mapa',
                        title: 'Alertamientos en mapa',
                        value: visibleMapAlerts,
                        detail: 'Ventana operativa del mapa',
                        iconType: 'mapa'
                    }));
                }
            }

            setSummaryMetrics(nextMetrics.slice(0, 4));

            if (nextMetrics.length === 0 || getMetricErrorCount([totalResult, todayResult, mapaResult]) > 0) {
                setSummaryErrorMessage('Algunos indicadores no pudieron actualizarse en este momento.');
            }

            setIsSummaryLoading(false);
        }

        void fetchOperationalSummary().catch(() => {
            if (!isMounted) {
                return;
            }

            setSummaryMetrics([]);
            setSummaryErrorMessage('No fue posible actualizar los indicadores operativos.');
            setIsSummaryLoading(false);
        });

        return () => {
            isMounted = false;
        };
    }, [user]);

    const isAdministrador = user?.rol?.nombre_rol === 'ADMINISTRADOR';
    const userDisplayName = getUserDisplayName(user);
    const rolNombre = user?.rol?.nombre_rol || 'Sin rol asignado';
    const nivelNombre = user?.nivel_operativo?.nombre_nivel || 'Sin nivel operativo';
    const ambitoLabel = getAmbitoLabel(user?.ambito);
    const ambitoSupportText = getAmbitoSupportText(user?.ambito);
    const userInitials = getUserInitials(user);
    const currentYear = currentBrowserDate.getFullYear();

    // Los accesos rapidos se construyen solo con rutas ya confirmadas en el
    // router. Gestion de usuarios aparece unicamente para administradores.
    const quickAccessCards = useMemo(() => {
        const baseCards = [
            {
                key: 'alertamientos',
                title: 'Alertamientos',
                description: 'Consultar y registrar alertamientos visibles.',
                to: '/alertamientos',
                iconType: 'alertamientos'
            },
            {
                key: 'mapa',
                title: 'Mapa operativo',
                description: 'Ubicar torres y alertamientos en el mapa.',
                to: '/mapa',
                iconType: 'mapa'
            }
        ];

        if (isAdministrador) {
            baseCards.push({
                key: 'usuarios',
                title: 'Gestion de usuarios',
                description: 'Administrar cuentas y ambitos autorizados.',
                to: '/usuarios',
                iconType: 'usuarios'
            });
        }

        return baseCards;
    }, [isAdministrador]);

    return (
        <section className="dashboard-shell">
            <header className="dashboard-hero">
                <div className="dashboard-hero__content">
                    <p className="eyebrow">Vista institucional</p>
                    <h2 className="title">Panel principal</h2>
                    <p className="dashboard-hero__welcome">
                        Bienvenido(a), <strong>{userDisplayName}</strong>
                    </p>
                    <p className="subtitle">
                        Consulta tu contexto operativo vigente y accede a los modulos
                        prioritarios de la plataforma sin exponer datos no consolidados.
                    </p>
                </div>

                <div className="dashboard-hero__meta" aria-label="Fecha y hora actual del navegador">
                    <div className="dashboard-meta-chip">
                        <span className="dashboard-meta-chip__icon" aria-hidden="true">
                            <DashboardMetaIcon type="date" />
                        </span>
                        <div>
                            <span className="dashboard-meta-chip__label">Fecha</span>
                            <strong>{formatCurrentDate(currentBrowserDate)}</strong>
                        </div>
                    </div>

                    <div className="dashboard-meta-chip">
                        <span className="dashboard-meta-chip__icon" aria-hidden="true">
                            <DashboardMetaIcon type="time" />
                        </span>
                        <div>
                            <span className="dashboard-meta-chip__label">Hora</span>
                            <strong>{formatCurrentTime(currentBrowserDate)} h</strong>
                        </div>
                    </div>
                </div>
            </header>

            {errorMessage ? <p className="message">{errorMessage}</p> : null}

            {isLoading && !user ? (
                <p className="loading-state">Cargando el contexto institucional del usuario...</p>
            ) : null}

            <section className="dashboard-section" aria-labelledby="dashboard-summary-title">
                <div className="dashboard-section__heading">
                    <span className="dashboard-section__icon" aria-hidden="true">
                        <DashboardSectionIcon type="summary" />
                    </span>

                    <div>
                        <p className="eyebrow">Resumen operativo</p>
                        <h3 id="dashboard-summary-title">Indicadores principales</h3>
                    </div>
                </div>

                {isSummaryLoading ? (
                    <p className="dashboard-summary-status">Actualizando indicadores operativos...</p>
                ) : null}

                {summaryErrorMessage ? (
                    <p className="dashboard-summary-status dashboard-summary-status--warning">
                        {summaryErrorMessage}
                    </p>
                ) : null}

                {summaryMetrics.length > 0 ? (
                    <div className="dashboard-metric-grid">
                        {summaryMetrics.map((metric) => (
                            <article className="dashboard-metric-card" key={metric.key}>
                                <span className="dashboard-metric-card__icon" aria-hidden="true">
                                    <DashboardMetricIcon type={metric.iconType} />
                                </span>
                                <div className="dashboard-metric-card__body">
                                    <span className="dashboard-metric-card__label">{metric.title}</span>
                                    <strong>{metric.value}</strong>
                                    <p>{metric.detail}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : null}

                {!isSummaryLoading && summaryMetrics.length === 0 ? (
                    <div className="dashboard-summary-placeholder">
                        <span className="dashboard-summary-placeholder__badge">DB2</span>
                        <strong>Indicadores pendientes de fuente consolidada.</strong>
                        <p>
                            No se recibieron metricas reales desde los endpoints disponibles
                            para este usuario. El panel permanece operativo.
                        </p>
                    </div>
                ) : null}
            </section>

            <div className="dashboard-main-grid">
                <section className="dashboard-section" aria-labelledby="dashboard-shortcuts-title">
                    <div className="dashboard-section__heading">
                        <span className="dashboard-section__icon" aria-hidden="true">
                            <DashboardSectionIcon type="quick-access" />
                        </span>

                        <div>
                            <p className="eyebrow">Accesos rapidos</p>
                            <h3 id="dashboard-shortcuts-title">Modulos disponibles</h3>
                        </div>
                    </div>

                    <div className="dashboard-shortcut-grid">
                        {quickAccessCards.map((card) => (
                            <Link className="dashboard-shortcut-card" key={card.key} to={card.to}>
                                <span className="dashboard-shortcut-card__icon" aria-hidden="true">
                                    <QuickAccessIcon type={card.iconType} />
                                </span>

                                <div className="dashboard-shortcut-card__body">
                                    <h4>{card.title}</h4>
                                    <p>{card.description}</p>
                                </div>

                                <span className="dashboard-shortcut-card__arrow" aria-hidden="true">
                                    <ArrowIcon />
                                </span>
                            </Link>
                        ))}
                    </div>
                </section>

                <aside className="dashboard-section dashboard-section--context" aria-labelledby="dashboard-context-title">
                    <div className="dashboard-section__heading">
                        <span className="dashboard-section__icon" aria-hidden="true">
                            <DashboardSectionIcon type="context" />
                        </span>

                        <div>
                            <p className="eyebrow">Mi contexto operativo</p>
                            <h3 id="dashboard-context-title">Perfil institucional vigente</h3>
                        </div>
                    </div>

                    <div className="dashboard-context-card">
                        <div className="dashboard-context-profile">
                            <span className="dashboard-context-profile__avatar" aria-hidden="true">
                                {userInitials}
                            </span>

                            <div className="dashboard-context-profile__body">
                                <span>Usuario</span>
                                <strong>{userDisplayName}</strong>
                                <p>{user?.correo_electronico || 'Sin correo institucional'}</p>
                            </div>
                        </div>

                        <dl className="dashboard-context-chip-list">
                            <div className="dashboard-context-chip">
                                <dt>
                                    <span className="dashboard-context-chip__icon" aria-hidden="true">
                                        <ContextInfoIcon type="rol" />
                                    </span>
                                    Rol
                                </dt>
                                <dd>{rolNombre}</dd>
                            </div>

                            <div className="dashboard-context-chip">
                                <dt>
                                    <span className="dashboard-context-chip__icon" aria-hidden="true">
                                        <ContextInfoIcon type="nivel" />
                                    </span>
                                    Nivel operativo
                                </dt>
                                <dd>{nivelNombre}</dd>
                            </div>

                            <div className="dashboard-context-chip dashboard-context-chip--wide">
                                <dt>
                                    <span className="dashboard-context-chip__icon" aria-hidden="true">
                                        <ContextInfoIcon type="ambito" />
                                    </span>
                                    Ambito de visibilidad
                                </dt>
                                <dd>{ambitoLabel}</dd>
                            </div>
                        </dl>

                        <p className="dashboard-context-card__note">{ambitoSupportText}</p>
                    </div>
                </aside>
            </div>

            <footer className="dashboard-footer" aria-label="Pie de pagina institucional">
                <div className="dashboard-footer__brand" aria-label="Institucion principal">
                    <img
                        className="dashboard-footer__logo dashboard-footer__logo--gobierno"
                        src={emblemaGobierno}
                        alt="Gobierno de Mexico"
                    />
                </div>

                <div className="dashboard-footer__copy">
                    <strong>Dirección General Científica de la Guardia Nacional</strong>
                    <span>Guardia Nacional Dirección General</span>
                    <small>Plataforma de Alertamientos de la Guardia Nacional V1.1</small>
                </div>

                <div className="dashboard-footer__right">
                    <div className="dashboard-footer__motto">
                        <span>Justicia y Paz</span>
                        <small>{currentYear}</small>
                    </div>

                    <img
                        className="dashboard-footer__shield"
                        src={escudoGuardiaNacional}
                        alt=""
                    />
                </div>
            </footer>
        </section>
    );
}

export default DashboardPage;
