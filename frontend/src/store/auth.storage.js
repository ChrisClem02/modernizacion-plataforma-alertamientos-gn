const AUTH_STORAGE_KEY = 'mpna_gn_auth_session';

function hasBrowserStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

// Lectura segura del objeto persistido para no romper la app ante datos
// incompletos o alterados manualmente desde el navegador.
export function getStoredAuthSession() {
    if (!hasBrowserStorage()) {
        return null;
    }

    const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!rawValue) {
        return null;
    }

    try {
        return JSON.parse(rawValue);
    } catch (_error) {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
    }
}

export function getStoredToken() {
    return getStoredAuthSession()?.token || null;
}

export function saveStoredAuthSession(session) {
    if (!hasBrowserStorage()) {
        return;
    }

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredAuthSession() {
    if (!hasBrowserStorage()) {
        return;
    }

    window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
