import axios from 'axios';
import { getStoredToken } from '../store/auth.storage';

// La URL base apunta directamente al prefijo /api del backend.
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
    timeout: 10000
});

// Interceptor que inyecta el token Bearer si existe una sesion persistida.
apiClient.interceptors.request.use((config) => {
    const token = getStoredToken();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

export default apiClient;
