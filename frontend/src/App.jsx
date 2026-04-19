import { useEffect, useRef } from 'react';
import { RouterProvider } from 'react-router-dom';
import { appRouter } from './app/router';
import { useAuthStore } from './store/auth.store';

function App() {
    const hydrateAuth = useAuthStore((state) => state.hydrateAuth);
    const didRunBootstrapRef = useRef(false);

    // Al arrancar la aplicacion se intenta reconstruir la sesion desde
    // almacenamiento local y, si hay token, se valida contra /auth/me.
    // El ref evita dobles inicializaciones en desarrollo bajo React StrictMode.
    useEffect(() => {
        if (didRunBootstrapRef.current) {
            return;
        }

        didRunBootstrapRef.current = true;
        void hydrateAuth();
    }, [hydrateAuth]);

    return <RouterProvider router={appRouter} />;
}

export default App;
