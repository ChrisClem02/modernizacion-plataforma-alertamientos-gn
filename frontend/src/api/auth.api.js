import apiClient from './client';

// Envolturas pequenas para mantener las rutas auth en un solo sitio.
export async function loginRequest(credentials) {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
}

export async function getMeRequest() {
    const response = await apiClient.get('/auth/me');
    return response.data;
}
