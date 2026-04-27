import React from 'react';
import { useAuthStore } from '../store/auth.store';

function isAdministrador(user) {
    return user?.rol?.nombre_rol === 'ADMINISTRADOR';
}

function AdminRoute({ children }) {
    const user = useAuthStore((state) => state.user);

    if (!isAdministrador(user)) {
        return (
            <section className="card card--narrow">
                <p className="eyebrow">Acceso Restringido</p>
                <h2 className="title">Administracion de usuarios</h2>
                <p className="subtitle">
                    Solo el perfil ADMINISTRADOR puede acceder a este modulo.
                </p>
                <p className="message">
                    Rol autenticado actual: {user?.rol?.nombre_rol || 'Sin rol'}
                </p>
            </section>
        );
    }

    return children;
}

export default AdminRoute;
