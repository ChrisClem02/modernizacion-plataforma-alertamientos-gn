import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

function ProtectedRoute() {
    const location = useLocation();
    const { token, user, isBootstrapped, isHydratingSession } = useAuthStore((state) => ({
        token: state.token,
        user: state.user,
        isBootstrapped: state.isBootstrapped,
        isHydratingSession: state.isHydratingSession
    }));

    // Mientras se reconstruye la sesion no conviene redirigir aun.
    if (!isBootstrapped || isHydratingSession) {
        return (
            <div className="page-shell">
                <div className="card card--narrow loading-state">
                    <h1 className="title">Cargando sesion</h1>
                    <p className="subtitle">Validando el contexto del usuario contra el backend.</p>
                </div>
            </div>
        );
    }

    if (!token || !user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return <Outlet />;
}

export default ProtectedRoute;
