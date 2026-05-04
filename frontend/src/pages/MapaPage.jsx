import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getMapaRequest } from '../api/mapa.api';
import { useAuthStore } from '../store/auth.store';

const MEXICO_CENTER = [23.6345, -102.5528];

const EMPTY_FILTER_FORM = {
    fecha_inicio: '',
    fecha_fin: '',
    id_estatus_alertamiento: '',
    id_torre: ''
};

const INITIAL_MAP_DATA = {
    filters: null,
    visibilidad: null,
    resumen: null,
    torres: [],
    alertamientos: []
};

const TOWER_MARKER_ICON = `
    <span class="map-marker__pin" aria-hidden="true">
        <svg class="map-marker__icon" viewBox="0 0 24 24" focusable="false">
            <path d="M12 5v14" />
            <path d="M8 19h8" />
            <path d="M9.5 9.5 12 7l2.5 2.5" />
            <path d="M8 12.5a5.5 5.5 0 0 1 0-7.8" />
            <path d="M16 12.5a5.5 5.5 0 0 0 0-7.8" />
        </svg>
    </span>
`;

const ALERT_MARKER_ICON = `
    <span class="map-marker__pin" aria-hidden="true">
        <svg class="map-marker__icon" viewBox="0 0 24 24" focusable="false">
            <path d="M12 4v9" />
            <path d="M8.5 8.5a5 5 0 0 0 0 7" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M6 6a8.5 8.5 0 0 0 0 12" />
            <path d="M18 6a8.5 8.5 0 0 1 0 12" />
            <path d="M12 18h.01" />
        </svg>
    </span>
`;

const POPUP_HEADER_ICON = `
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M12 5v14" />
        <path d="M8 19h8" />
        <path d="M9.5 9.5 12 7l2.5 2.5" />
        <path d="M8 12.5a5.5 5.5 0 0 1 0-7.8" />
        <path d="M16 12.5a5.5 5.5 0 0 0 0-7.8" />
    </svg>
`;

function getApiErrorMessage(error, fallbackMessage) {
    return error?.response?.data?.message || fallbackMessage;
}

function createFiltersFromSearchParams(searchParams) {
    return {
        fecha_inicio: searchParams.get('fecha_inicio') || '',
        fecha_fin: searchParams.get('fecha_fin') || '',
        id_estatus_alertamiento: searchParams.get('id_estatus_alertamiento') || '',
        id_torre: searchParams.get('id_torre') || ''
    };
}

function buildRequestParams(searchParams) {
    const requestParams = {};

    Object.keys(EMPTY_FILTER_FORM).forEach((key) => {
        const value = searchParams.get(key);

        if (value) {
            requestParams[key] = value;
        }
    });

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

function hasValidCoordinate(coordenada) {
    const latitud = Number(coordenada?.latitud);
    const longitud = Number(coordenada?.longitud);

    return Number.isFinite(latitud)
        && Number.isFinite(longitud)
        && latitud >= -90
        && latitud <= 90
        && longitud >= -180
        && longitud <= 180;
}

function getCoordinateTuple(coordenada) {
    return [
        Number(coordenada.latitud),
        Number(coordenada.longitud)
    ];
}

function normalizeStatusName(alertamiento) {
    return String(alertamiento?.estatus?.nombre_estatus || '').trim().toUpperCase();
}

function getStatusClass(alertamiento) {
    const statusName = normalizeStatusName(alertamiento);

    if (statusName === 'DETECTADO') {
        return 'map-marker--detectado';
    }

    if (statusName === 'VALIDADO') {
        return 'map-marker--validado';
    }

    if (statusName === 'EN_ATENCION') {
        return 'map-marker--atencion';
    }

    if (statusName === 'CERRADO') {
        return 'map-marker--cerrado';
    }

    return 'map-marker--sin-estatus';
}

function getStatusInitial(alertamiento) {
    const statusName = normalizeStatusName(alertamiento);

    if (statusName === 'DETECTADO') {
        return 'D';
    }

    if (statusName === 'VALIDADO') {
        return 'V';
    }

    if (statusName === 'EN_ATENCION') {
        return 'A';
    }

    if (statusName === 'CERRADO') {
        return 'C';
    }

    return '?';
}

function getAlertamientoBadgeClass(alertamiento) {
    const statusName = normalizeStatusName(alertamiento);

    if (statusName === 'VALIDADO') {
        return 'map-alert-status map-alert-status--validado';
    }

    if (statusName === 'CERRADO') {
        return 'map-alert-status map-alert-status--cerrado';
    }

    if (statusName === 'DETECTADO') {
        return 'map-alert-status map-alert-status--detectado';
    }

    if (statusName === 'EN_ATENCION') {
        return 'map-alert-status map-alert-status--atencion';
    }

    return 'map-alert-status';
}

function createTorreIcon() {
    return L.divIcon({
        className: 'map-marker map-marker--torre',
        html: TOWER_MARKER_ICON,
        iconSize: [38, 46],
        iconAnchor: [19, 43],
        popupAnchor: [0, -40]
    });
}

function createAlertamientoIcon(alertamiento) {
    return L.divIcon({
        className: `map-marker map-marker--alertamiento ${getStatusClass(alertamiento)}`,
        html: ALERT_MARKER_ICON,
        iconSize: [36, 44],
        iconAnchor: [18, 41],
        popupAnchor: [0, -38]
    });
}

function hasPopupValue(value) {
    return value !== undefined && value !== null && String(value).trim() !== '';
}

function formatCoordinate(value) {
    const coordinate = Number(value);

    if (!Number.isFinite(coordinate)) {
        return null;
    }

    return coordinate.toFixed(6);
}

function appendPopupHeader(container, { title, badgeText, badgeClass }) {
    const header = document.createElement('div');
    const icon = document.createElement('span');
    const content = document.createElement('div');
    const heading = document.createElement('h3');
    const badge = document.createElement('span');

    header.className = 'map-popup__header';
    icon.className = 'map-popup__header-icon';
    icon.innerHTML = POPUP_HEADER_ICON;
    content.className = 'map-popup__header-content';
    heading.textContent = title;
    badge.className = badgeClass;
    badge.textContent = badgeText;

    content.appendChild(heading);
    content.appendChild(badge);
    header.appendChild(icon);
    header.appendChild(content);
    container.appendChild(header);
}

function appendPopupLine(container, label, value) {
    if (!hasPopupValue(value)) {
        return;
    }

    const line = document.createElement('p');
    const strong = document.createElement('strong');
    const text = document.createElement('span');

    line.className = 'map-popup__row';
    strong.textContent = label;
    text.textContent = value;
    line.appendChild(strong);
    line.appendChild(text);
    container.appendChild(line);
}

function appendPopupSection(container, title, rows) {
    const visibleRows = rows.filter(({ value }) => hasPopupValue(value));

    if (visibleRows.length === 0) {
        return;
    }

    const section = document.createElement('section');
    const heading = document.createElement('h4');

    section.className = 'map-popup__section';
    heading.textContent = title;
    section.appendChild(heading);

    visibleRows.forEach(({ label, value }) => appendPopupLine(section, label, value));
    container.appendChild(section);
}

function createTorrePopup(torre) {
    const container = document.createElement('div');

    container.className = 'map-popup map-popup--torre';
    appendPopupHeader(container, {
        title: torre.nombre_torre || 'Torre operativa',
        badgeText: 'Torre operativa',
        badgeClass: 'map-alert-status map-alert-status--validado map-popup__status'
    });

    appendPopupSection(container, 'Información operativa', [
        { label: 'ID Torre', value: torre.id_torre },
        { label: 'Código', value: torre.codigo_torre },
        { label: 'Central', value: torre.central?.nombre_central },
        { label: 'Región', value: torre.region?.nombre_region },
        { label: 'Estado', value: torre.estado?.nombre_estado },
        { label: 'Municipio', value: torre.municipio?.nombre_municipio }
    ]);

    appendPopupSection(container, 'Ubicación', [
        { label: 'Latitud', value: formatCoordinate(torre.coordenada?.latitud) },
        { label: 'Longitud', value: formatCoordinate(torre.coordenada?.longitud) },
        { label: 'Dirección', value: torre.direccion }
    ]);

    return container;
}

function createAlertamientoPopup(alertamiento) {
    const container = document.createElement('div');
    const link = document.createElement('a');

    container.className = 'map-popup map-popup--alertamiento';
    appendPopupHeader(container, {
        title: alertamiento.placa_detectada || 'Alertamiento sin placa',
        badgeText: alertamiento.estatus?.nombre_estatus || 'Sin estatus',
        badgeClass: `${getAlertamientoBadgeClass(alertamiento)} map-popup__status`
    });

    appendPopupSection(container, 'Información operativa', [
        { label: 'Placa', value: alertamiento.placa_detectada },
        { label: 'Torre', value: alertamiento.torre?.nombre_torre },
        { label: 'Fecha/hora', value: formatDateTime(alertamiento.fecha_hora_deteccion) },
        { label: 'Fuente coordenada', value: alertamiento.fuente_coordenada }
    ]);

    appendPopupSection(container, 'Ubicación', [
        { label: 'Latitud', value: formatCoordinate(alertamiento.coordenada?.latitud) },
        { label: 'Longitud', value: formatCoordinate(alertamiento.coordenada?.longitud) },
        { label: 'Dirección', value: alertamiento.direccion }
    ]);

    link.className = 'button button--inline button--small map-popup__detail-link';
    link.href = `/alertamientos/${alertamiento.id_alertamiento}`;
    link.textContent = 'Ver detalle';
    container.appendChild(link);

    return container;
}

function buildStatusOptions(alertamientos, selectedValue) {
    const options = new Map();

    alertamientos.forEach((alertamiento) => {
        const statusId = alertamiento.estatus?.id_estatus_alertamiento;

        if (statusId) {
            options.set(String(statusId), alertamiento.estatus.nombre_estatus || `Estatus ${statusId}`);
        }
    });

    if (selectedValue && !options.has(String(selectedValue))) {
        options.set(String(selectedValue), `Estatus ${selectedValue}`);
    }

    return Array.from(options.entries())
        .map(([value, label]) => ({ value, label }))
        .sort((left, right) => left.label.localeCompare(right.label, 'es'));
}

function buildTowerOptions(torres, selectedValue) {
    const options = new Map();

    torres.forEach((torre) => {
        if (torre.id_torre) {
            options.set(String(torre.id_torre), torre.nombre_torre || `Torre ${torre.id_torre}`);
        }
    });

    if (selectedValue && !options.has(String(selectedValue))) {
        options.set(String(selectedValue), `Torre ${selectedValue}`);
    }

    return Array.from(options.entries())
        .map(([value, label]) => ({ value, label }))
        .sort((left, right) => left.label.localeCompare(right.label, 'es'));
}

function MapaPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [filtersForm, setFiltersForm] = useState(() => createFiltersFromSearchParams(searchParams));
    const [mapData, setMapData] = useState(INITIAL_MAP_DATA);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState(null);
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markerLayerRef = useRef(null);
    const user = useAuthStore((state) => state.user);

    const effectiveParams = useMemo(() => buildRequestParams(searchParams), [searchParams]);
    const statusOptions = useMemo(
        () => buildStatusOptions(mapData.alertamientos, filtersForm.id_estatus_alertamiento),
        [mapData.alertamientos, filtersForm.id_estatus_alertamiento]
    );
    const towerOptions = useMemo(
        () => buildTowerOptions(mapData.torres, filtersForm.id_torre),
        [mapData.torres, filtersForm.id_torre]
    );
    const latestVisibleAlertamientos = useMemo(
        () => [...mapData.alertamientos]
            .sort((left, right) => {
                const leftTime = new Date(left.fecha_hora_deteccion || 0).getTime();
                const rightTime = new Date(right.fecha_hora_deteccion || 0).getTime();

                return rightTime - leftTime;
            })
            .slice(0, 5),
        [mapData.alertamientos]
    );

    useEffect(() => {
        setFiltersForm(createFiltersFromSearchParams(searchParams));
    }, [searchParams]);

    // El mapa se inicializa una sola vez. Las capas se actualizan aparte para
    // evitar recrear Leaflet en cada consulta de filtros.
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) {
            return undefined;
        }

        const map = L.map(mapContainerRef.current, {
            zoomControl: true,
            scrollWheelZoom: true
        }).setView(MEXICO_CENTER, 5);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        markerLayerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
            markerLayerRef.current = null;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function fetchMapa() {
            setIsLoading(true);
            setErrorMessage(null);

            try {
                const response = await getMapaRequest(effectiveParams);

                if (!isMounted) {
                    return;
                }

                setMapData({
                    filters: response.filters,
                    visibilidad: response.visibilidad,
                    resumen: response.resumen,
                    torres: response.torres || [],
                    alertamientos: response.alertamientos || []
                });
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setErrorMessage(getApiErrorMessage(error, 'No fue posible consultar el mapa operativo.'));
                setMapData(INITIAL_MAP_DATA);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        void fetchMapa();

        return () => {
            isMounted = false;
        };
    }, [effectiveParams]);

    useEffect(() => {
        const map = mapRef.current;
        const markerLayer = markerLayerRef.current;

        if (!map || !markerLayer) {
            return;
        }

        markerLayer.clearLayers();

        const bounds = [];

        mapData.torres.forEach((torre) => {
            if (!hasValidCoordinate(torre.coordenada)) {
                return;
            }

            const coordinate = getCoordinateTuple(torre.coordenada);
            L.marker(coordinate, {
                icon: createTorreIcon(),
                title: torre.nombre_torre || `Torre ${torre.id_torre}`
            })
                .bindPopup(createTorrePopup(torre))
                .addTo(markerLayer);
            bounds.push(coordinate);
        });

        mapData.alertamientos.forEach((alertamiento) => {
            if (!hasValidCoordinate(alertamiento.coordenada)) {
                return;
            }

            const coordinate = getCoordinateTuple(alertamiento.coordenada);
            L.marker(coordinate, {
                icon: createAlertamientoIcon(alertamiento),
                title: alertamiento.placa_detectada || `Alertamiento ${alertamiento.id_alertamiento}`
            })
                .bindPopup(createAlertamientoPopup(alertamiento))
                .addTo(markerLayer);
            bounds.push(coordinate);
        });

        // Leaflet necesita recalcular tamaño cuando el contenedor aparece dentro
        // del layout React. Se limpia el timer para no operar sobre un mapa ya
        // desmontado durante cambios rápidos de ruta o sesión.
        let isEffectMounted = true;
        const resizeTimerId = window.setTimeout(() => {
            if (!isEffectMounted || mapRef.current !== map || !map.getContainer()) {
                return;
            }

            map.invalidateSize();

            if (bounds.length > 0) {
                map.fitBounds(L.latLngBounds(bounds), {
                    padding: [28, 28],
                    maxZoom: 13
                });
            } else {
                map.setView(MEXICO_CENTER, 5);
            }
        }, 0);

        return () => {
            isEffectMounted = false;
            window.clearTimeout(resizeTimerId);
        };
    }, [mapData]);

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

        setSearchParams(nextParams);
    }

    function handleResetFilters() {
        setFiltersForm({ ...EMPTY_FILTER_FORM });
        setSearchParams(new URLSearchParams());
    }

    const resumen = mapData.resumen || {};

    return (
        <section className="card card--wide mapa-page">
            <div className="section-heading section-heading--module mapa-page__heading">
                <div className="section-heading__content">
                    <p className="eyebrow">Vista geográfica</p>
                    <h2 className="title">Mapa Operativo</h2>
                    <p className="subtitle">
                        Torres y alertamientos visibles conforme al ámbito institucional del usuario autenticado.
                    </p>
                </div>

                <div className="info-chip info-chip--compact">
                    <span className="info-chip__label">Visibilidad actual</span>
                    <strong>{mapData.visibilidad?.nivel_operativo || user?.nivel_operativo?.nombre_nivel || 'Sin nivel'}</strong>
                </div>
            </div>

            <form className="filter-panel filter-panel--mapa map-filter-bar" onSubmit={handleSearchSubmit}>
                <div className="panel-heading map-filter-bar__heading">
                    <h3>Filtros del mapa</h3>
                    <p>Consulta operativa visible.</p>
                </div>

                <div className="filter-grid map-filter-grid">
                    <div className="field">
                        <label htmlFor="mapa_fecha_inicio">Fecha inicio</label>
                        <input
                            id="mapa_fecha_inicio"
                            name="fecha_inicio"
                            type="date"
                            value={filtersForm.fecha_inicio}
                            onChange={handleFilterChange}
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="mapa_fecha_fin">Fecha fin</label>
                        <input
                            id="mapa_fecha_fin"
                            name="fecha_fin"
                            type="date"
                            value={filtersForm.fecha_fin}
                            onChange={handleFilterChange}
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="mapa_id_estatus_alertamiento">Estatus</label>
                        <select
                            id="mapa_id_estatus_alertamiento"
                            name="id_estatus_alertamiento"
                            value={filtersForm.id_estatus_alertamiento}
                            onChange={handleFilterChange}
                        >
                            <option value="">Todos los estatus</option>
                            {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="field">
                        <label htmlFor="mapa_id_torre">Torre</label>
                        <select
                            id="mapa_id_torre"
                            name="id_torre"
                            value={filtersForm.id_torre}
                            onChange={handleFilterChange}
                        >
                            <option value="">Todas las torres visibles</option>
                            {towerOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="button-row map-filter-actions">
                    <button className="button" type="submit">
                        Aplicar filtros
                    </button>

                    <button className="button button--ghost" type="button" onClick={handleResetFilters}>
                        Limpiar filtros
                    </button>
                </div>
            </form>

            {errorMessage ? <p className="message">{errorMessage}</p> : null}

            {isLoading ? (
                <p className="loading-state">Consultando torres y alertamientos visibles...</p>
            ) : null}

            <div className="map-layout">
                <div className="map-panel">
                    <div ref={mapContainerRef} className="map-canvas" aria-label="Mapa operativo de torres y alertamientos" />
                </div>

                <aside className="map-side-panel">
                    <div className="map-side-block">
                        <div className="panel-heading">
                            <h3>Leyenda</h3>
                            <p>Marcadores diferenciados por tipo y estatus.</p>
                        </div>
                        <div className="map-legend">
                            <span className="map-legend__item">
                                <span className="map-marker-swatch map-marker-swatch--torre" />
                                Torre
                            </span>
                            <span className="map-legend__item">
                                <span className="map-marker-swatch map-marker-swatch--detectado" />
                                Detectado
                            </span>
                            <span className="map-legend__item">
                                <span className="map-marker-swatch map-marker-swatch--validado" />
                                Validado
                            </span>
                            <span className="map-legend__item">
                                <span className="map-marker-swatch map-marker-swatch--atencion" />
                                En atencion
                            </span>
                            <span className="map-legend__item">
                                <span className="map-marker-swatch map-marker-swatch--cerrado" />
                                Cerrado
                            </span>
                        </div>
                    </div>

                    <div className="map-side-block">
                        <div className="panel-heading">
                            <h3>Resumen operativo</h3>
                            <p>Indicadores visibles para el ámbito actual.</p>
                        </div>

                        <div className="map-side-summary">
                            <div className="map-side-summary__row">
                                <span>Torres visibles</span>
                                <strong>{resumen.total_torres_visibles ?? 0}</strong>
                            </div>
                            <div className="map-side-summary__row">
                                <span>Alertamientos visibles</span>
                                <strong>{resumen.total_alertamientos_devuelto ?? 0}</strong>
                            </div>
                            <div className="map-side-summary__row">
                                <span>Sin coordenadas</span>
                                <strong>{resumen.alertamientos_sin_coordenadas ?? 0}</strong>
                            </div>
                        </div>
                    </div>

                    <div className="map-side-block">
                        <div className="panel-heading">
                            <h3>Últimos alertamientos visibles</h3>
                            <p>Registros disponibles con los filtros actuales.</p>
                        </div>

                        {latestVisibleAlertamientos.length === 0 ? (
                            <p className="field-hint map-alert-empty">
                                Sin alertamientos visibles con los filtros actuales.
                            </p>
                        ) : (
                            <ul className="map-latest-alerts">
                                {latestVisibleAlertamientos.map((alertamiento) => (
                                    <li key={alertamiento.id_alertamiento}>
                                        <div className="map-latest-alerts__main">
                                            <strong className="mono">
                                                {alertamiento.placa_detectada || 'Sin placa'}
                                            </strong>
                                            <span className={getAlertamientoBadgeClass(alertamiento)}>
                                                {alertamiento.estatus?.nombre_estatus || 'Sin estatus'}
                                            </span>
                                        </div>
                                        <div className="map-latest-alerts__meta">
                                            <span>{formatDateTime(alertamiento.fecha_hora_deteccion)}</span>
                                            <Link to={`/alertamientos/${alertamiento.id_alertamiento}`}>
                                                Detalle
                                            </Link>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </aside>
            </div>
        </section>
    );
}

export default MapaPage;
