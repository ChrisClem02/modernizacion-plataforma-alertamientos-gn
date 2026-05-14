import apiClient from './client';

// Cliente del modulo de auditoria. Se mantiene separado para que las paginas
// no dupliquen rutas HTTP ni conozcan detalles internos de axios.
export async function getBitacoraAuditoriaRequest(queryParams = {}) {
    const response = await apiClient.get('/auditoria/bitacora', {
        params: queryParams
    });

    return response.data;
}

export async function getBitacoraAuditoriaDetailRequest(bitacoraId) {
    const response = await apiClient.get(`/auditoria/bitacora/${bitacoraId}`);
    return response.data;
}
