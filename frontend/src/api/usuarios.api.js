import apiClient from './client';

// El modulo de usuarios concentra aqui sus endpoints para que la pagina y los
// formularios no dupliquen rutas HTTP ni detalles de axios.
export async function getUsuariosRequest(queryParams = {}) {
    const response = await apiClient.get('/usuarios', {
        params: queryParams
    });

    return response.data;
}

export async function getUsuarioDetailRequest(usuarioId) {
    const response = await apiClient.get(`/usuarios/${usuarioId}`);
    return response.data;
}

export async function createUsuarioRequest(payload) {
    const response = await apiClient.post('/usuarios', payload);
    return response.data;
}

export async function updateUsuarioRequest(usuarioId, payload) {
    const response = await apiClient.put(`/usuarios/${usuarioId}`, payload);
    return response.data;
}

export async function activateUsuarioRequest(usuarioId) {
    const response = await apiClient.patch(`/usuarios/${usuarioId}/activar`);
    return response.data;
}

export async function deactivateUsuarioRequest(usuarioId) {
    const response = await apiClient.patch(`/usuarios/${usuarioId}/desactivar`);
    return response.data;
}

export async function getRolesCatalogRequest(queryParams = {}) {
    const response = await apiClient.get('/usuarios/catalogos/roles', {
        params: queryParams
    });

    return response.data;
}

export async function getNivelesOperativosCatalogRequest(queryParams = {}) {
    const response = await apiClient.get('/usuarios/catalogos/niveles-operativos', {
        params: queryParams
    });

    return response.data;
}
