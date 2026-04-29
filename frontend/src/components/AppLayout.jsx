import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import escudoGuardiaNacional from '../assets/escudo-guardia-nacional.png';
import { useAuthStore } from '../store/auth.store';

function AppLayout() {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore((state) => ({
        user: state.user,
        logout: state.logout
    }));
    const isAdministrador = user?.rol?.nombre_rol === 'ADMINISTRADOR';

    function handleLogout() {
        logout();
        navigate('/login', { replace: true });
    }

    return (
        <div className="app-layout">
            <header className="app-header">
                <div className="app-header__brand">
                    <span className="app-header__seal" aria-hidden="true">
                        <img src={escudoGuardiaNacional} alt="" />
                    </span>
                    <div>
                        <p className="eyebrow">Plataforma Nacional de Alertamientos</p>
                        <h1>Guardia Nacional</h1>
                        <p className="app-header__meta">
                            Sesión institucional: <span className="mono">{user?.nombre_usuario || 'sin sesión'}</span>
                        </p>
                    </div>
                </div>

                <div className="app-header__actions">
                    <nav className="app-nav" aria-label="Navegación principal">
                        <NavLink
                            className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}
                            to="/dashboard"
                        >
                            Dashboard
                        </NavLink>
                        <NavLink
                            className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}
                            to="/alertamientos"
                        >
                            Alertamientos
                        </NavLink>
                        <NavLink
                            className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}
                            to="/mapa"
                        >
                            Mapa
                        </NavLink>
                        {isAdministrador ? (
                            <NavLink
                                className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}
                                to="/usuarios"
                            >
                                Usuarios
                            </NavLink>
                        ) : null}
                    </nav>

                    <button className="button button--secondary" type="button" onClick={handleLogout}>
                        Cerrar sesión
                    </button>
                </div>
            </header>

            <main className="app-content">
                <Outlet />
            </main>
        </div>
    );
}

export default AppLayout;
