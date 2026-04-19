import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { appRouter } from './app/router';
import { useAuthStore } from './store/auth.store';

function App() {
    const hydrateAuth = useAuthStore((state) => state.hydrateAuth);

    // Al arrancar la aplicacion se intenta reconstruir la sesion desde
    // almacenamiento local y, si hay token, se valida contra /auth/me.
    useEffect(() => {
        void hydrateAuth();
    }, [hydrateAuth]);

    return <RouterProvider router={appRouter} />;
}

export default App;
