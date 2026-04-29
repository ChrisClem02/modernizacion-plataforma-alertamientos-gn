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

function createTorreIcon() {
    return L.divIcon({
        className: 'map-marker map-marker--torre',
        html: '<span>T</span>',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18]
    });
}

function createAlertamientoIcon(alertamiento) {
    return L.divIcon({
        className: `map-marker map-marker--alertamiento ${getStatusClass(alertamiento)}`,
        html: `<span>${getStatusInitial(alertamiento)}</span>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18]
    });
}

function appendPopupLine(container, label, value) {
    const line = document.createElement('p');
    const strong = document.createElement('strong');
    const text = document.createTextNode(value || 'Sin dato');

    strong.textContent = `${label}: `;
    line.appendChild(strong);
    line.appendChild(text);
    container.appendChild(line);
}

function createTorrePopup(torre) {
    const container = document.createElement('div');
    const title = document.createElement('h3');

    container.className = 'map-popup';
    title.textContent = torre.nombre_torre || `Torre ${torre.id_torre}`;
    container.appendChild(title);

    appendPopupLine(container, 'Codigo', torre.codigo_torre);
    appendPopupLine(container, 'Estado', torre.estado?.nombre_estado);
    appendPopupLine(container, 'Central', torre.central?.nombre_central);
    appendPopupLine(container, 'Region', torre.region?.nombre_region);

    return container;
}

function createAlertamientoPopup(alertamiento) {
    const container = document.createElement('div');
    const title = document.createElement('h3');
    const link = document.createElement('a');

    container.className = 'map-popup';
    title.textContent = alertamiento.folio_alertamiento || `Alertamiento ${alertamiento.id_alertamiento}`;
    container.appendChild(title);

    appendPopupLine(container, 'Placa', alertamiento.placa_detectada);
    appendPopupLine(container, 'Estatus', alertamiento.estatus?.nombre_estatus);
    appendPopupLine(container, 'Torre', alertamiento.torre?.nombre_torre);
    appendPopupLine(container, 'Fecha/hora', formatDateTime(alertamiento.fecha_hora_deteccion));
    appendPopupLine(container, 'Fuente coordenada', alertamiento.fuente_coordenada);

    link.className = 'button button--inline button--small';
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
    const alertamientosSinCoordenadas = mapData.alertamientos.filter((alertamiento) => !alertamiento.ubicable);

    return (
        <section className="card card--wide">
            <div className="section-heading">
                <div>
                    <p className="eyebrow">Vista Geografica</p>
                    <h2 className="title">Mapa Operativo V1</h2>
                    <p className="subtitle">
                        Torres y alertamientos visibles conforme al ámbito institucional del usuario autenticado.
                    </p>
                </div>

                <div className="info-chip">
                    <span className="info-chip__label">Visibilidad actual</span>
                    <strong>{mapData.visibilidad?.nivel_operativo || user?.nivel_operativo?.nombre_nivel || 'Sin nivel'}</strong>
                </div>
            </div>

            <form className="filter-panel filter-panel--mapa" onSubmit={handleSearchSubmit}>
                <div className="panel-heading">
                    <h3>Filtros del mapa</h3>
                    <p>Consulta torres y alertamientos visibles sin modificar la visibilidad institucional.</p>
                </div>

                <div className="filter-grid">
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

                <div className="button-row">
                    <button className="button" type="submit">
                        Aplicar filtros
                    </button>

                    <button className="button button--ghost" type="button" onClick={handleResetFilters}>
                        Limpiar filtros
                    </button>
                </div>
            </form>

            {errorMessage ? <p className="message">{errorMessage}</p> : null}

            <div className="summary-grid summary-grid--mapa">
                <div className="summary-box map-summary-card">
                    <span className="map-summary-card__label">Infraestructura</span>
                    <h3>Torres visibles</h3>
                    <p className="summary-number">{resumen.total_torres_visibles ?? 0}</p>
                    <p>{resumen.torres_sin_coordenadas ?? 0} sin coordenadas</p>
                </div>

                <div className="summary-box map-summary-card">
                    <span className="map-summary-card__label">Operación</span>
                    <h3>Alertamientos devueltos</h3>
                    <p className="summary-number">{resumen.total_alertamientos_devuelto ?? 0}</p>
                    <p>{resumen.total_alertamientos_filtrados ?? 0} filtrados en backend</p>
                </div>

                <div className="summary-box map-summary-card map-summary-card--warning">
                    <span className="map-summary-card__label">Calidad de datos</span>
                    <h3>Registros sin coordenadas</h3>
                    <p className="summary-number">{resumen.alertamientos_sin_coordenadas ?? 0}</p>
                    <p>Alertamientos no ubicables en el mapa</p>
                </div>
            </div>

            {isLoading ? (
                <p className="loading-state">Consultando torres y alertamientos visibles...</p>
            ) : null}

            <div className="map-layout">
                <div className="map-panel">
                    <div ref={mapContainerRef} className="map-canvas" aria-label="Mapa operativo de torres y alertamientos" />
                </div>

                <aside className="map-side-panel">
                    <div>
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

                    <div>
                        <div className="panel-heading">
                            <h3>Alertamientos sin coordenadas</h3>
                            <p>Registros devueltos que no pueden ubicarse en el mapa.</p>
                        </div>
                        {alertamientosSinCoordenadas.length === 0 ? (
                            <p className="field-hint">No hay alertamientos devueltos sin coordenadas.</p>
                        ) : (
                            <ul className="map-alert-list">
                                {alertamientosSinCoordenadas.map((alertamiento) => (
                                    <li key={alertamiento.id_alertamiento}>
                                        <strong className="mono">{alertamiento.placa_detectada}</strong>
                                        <span>{alertamiento.estatus?.nombre_estatus || 'Sin estatus'}</span>
                                        <Link to={`/alertamientos/${alertamiento.id_alertamiento}`}>
                                            Ver detalle
                                        </Link>
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
