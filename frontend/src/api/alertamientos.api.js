import apiClient from './client';

// Esta pequena capa evita dispersar rutas HTTP por las paginas del frontend.
// Asi, cuando el backend evolucione, los cambios de endpoint quedan aislados.
export async function getAlertamientosRequest(queryParams = {}) {
    const response = await apiClient.get('/alertamientos', {
        params: queryParams
    });

    return response.data;
}

export async function getAlertamientoDetailRequest(alertamientoId) {
    const response = await apiClient.get(`/alertamientos/${alertamientoId}`);
    return response.data;
}

export async function getAlertamientoHistorialRequest(alertamientoId) {
    const response = await apiClient.get(`/alertamientos/${alertamientoId}/historial`);
    return response.data;
}
