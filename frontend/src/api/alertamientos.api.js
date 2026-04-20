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

export async function updateAlertamientoStatusRequest(alertamientoId, payload) {
    const response = await apiClient.patch(`/alertamientos/${alertamientoId}/estatus`, payload);
    return response.data;
}

// La creacion manual se encapsula aqui para mantener el contrato del backend
// en un solo punto y no repetir rutas dentro de los componentes React.
export async function createManualAlertamientoRequest(payload) {
    const response = await apiClient.post('/alertamientos', payload);
    return response.data;
}
