import apiClient from './client';

// Los catalogos de jerarquia se consumen desde un archivo dedicado porque el
// formulario de usuarios depende de ellos para construir el ambito correcto.
export async function getEstadosRequest(queryParams = {}) {
    const response = await apiClient.get('/jerarquia/estados', {
        params: queryParams
    });

    return response.data;
}

export async function getTerritoriosRequest(queryParams = {}) {
    const response = await apiClient.get('/jerarquia/territorios', {
        params: queryParams
    });

    return response.data;
}

export async function getTorresRequest(queryParams = {}) {
    const response = await apiClient.get('/jerarquia/torres', {
        params: queryParams
    });

    return response.data;
}
