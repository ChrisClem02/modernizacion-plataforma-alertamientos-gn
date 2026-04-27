import apiClient from './client';

// El frontend de mapa consume un unico endpoint agregado. El backend conserva
// la responsabilidad de aplicar visibilidad institucional y filtros operativos.
export async function getMapaRequest(queryParams = {}) {
    const response = await apiClient.get('/mapa', {
        params: queryParams
    });

    return response.data;
}
