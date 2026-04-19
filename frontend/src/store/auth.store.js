import { create } from 'zustand';
import { getMeRequest, loginRequest } from '../api/auth.api';
import {
    clearStoredAuthSession,
    getStoredAuthSession,
    saveStoredAuthSession
} from './auth.storage';

function getApiErrorMessage(error, fallbackMessage) {
    return error?.response?.data?.message || fallbackMessage;
}

// Estado base reusable para reiniciar la sesion de forma consistente.
const initialAuthState = {
    token: null,
    user: null,
    isBootstrapped: false,
    isLoading: false,
    errorMessage: null
};

export const useAuthStore = create((set, get) => ({
    ...initialAuthState,

    hydrateAuth: async () => {
        if (get().isBootstrapped) {
            return;
        }

        const storedSession = getStoredAuthSession();

        if (!storedSession?.token) {
            set({
                isBootstrapped: true
            });
            return;
        }

        set({
            token: storedSession.token,
            user: storedSession.user || null,
            isLoading: true,
            errorMessage: null
        });

        try {
            const response = await getMeRequest();
            saveStoredAuthSession({
                token: storedSession.token,
                user: response.user
            });

            set({
                token: storedSession.token,
                user: response.user,
                isBootstrapped: true,
                isLoading: false,
                errorMessage: null
            });
        } catch (_error) {
            clearStoredAuthSession();
            set({
                ...initialAuthState,
                isBootstrapped: true,
                errorMessage: 'La sesion almacenada ya no es valida.'
            });
        }
    },

    login: async ({ nombre_usuario, contrasena }) => {
        set({
            isLoading: true,
            errorMessage: null
        });

        try {
            const response = await loginRequest({
                nombre_usuario,
                contrasena
            });

            saveStoredAuthSession({
                token: response.access_token,
                user: response.user
            });

            set({
                token: response.access_token,
                user: response.user,
                isBootstrapped: true,
                isLoading: false,
                errorMessage: null
            });

            return response.user;
        } catch (error) {
            const message = getApiErrorMessage(error, 'No fue posible iniciar sesion.');

            clearStoredAuthSession();
            set({
                token: null,
                user: null,
                isBootstrapped: true,
                isLoading: false,
                errorMessage: message
            });

            throw error;
        }
    },

    fetchMe: async () => {
        const currentToken = get().token || getStoredAuthSession()?.token || null;

        if (!currentToken) {
            return null;
        }

        set({
            isLoading: true,
            errorMessage: null
        });

        try {
            const response = await getMeRequest();

            saveStoredAuthSession({
                token: currentToken,
                user: response.user
            });

            set({
                token: currentToken,
                user: response.user,
                isBootstrapped: true,
                isLoading: false,
                errorMessage: null
            });

            return response.user;
        } catch (error) {
            const message = getApiErrorMessage(error, 'No fue posible obtener el usuario autenticado.');

            clearStoredAuthSession();
            set({
                ...initialAuthState,
                isBootstrapped: true,
                errorMessage: message
            });

            throw error;
        }
    },

    logout: () => {
        clearStoredAuthSession();
        set({
            ...initialAuthState,
            isBootstrapped: true
        });
    }
}));
