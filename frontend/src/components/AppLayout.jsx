import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import escudoGuardiaNacional from '../assets/escudo-guardia-nacional.png';
import { useAuthStore } from '../store/auth.store';

function AppNavIcon({ type }) {
    if (type === 'dashboard') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M4.5 11.4 12 5l7.5 6.4" />
                <path d="M6.6 10.6v8.2h10.8v-8.2" />
                <path d="M9.4 18.8v-4.3h5.2v4.3" />
            </svg>
        );
    }

    if (type === 'alertamientos') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M7.2 10.2a4.8 4.8 0 0 1 9.6 0v3.4l1.8 2.6H5.4l1.8-2.6v-3.4Z" />
                <path d="M9.8 19a2.2 2.2 0 0 0 4.4 0" />
                <path d="M12 4.8V3.5" />
            </svg>
        );
    }

    if (type === 'mapa') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="m4.5 7.5 5-2 5 2 5-2v11l-5 2-5-2-5 2Z" />
                <path d="M9.5 5.5v11" />
                <path d="M14.5 7.5v11" />
                <path d="M12 12.5s2.2-1.8 2.2-3.8a2.2 2.2 0 0 0-4.4 0c0 2 2.2 3.8 2.2 3.8Z" />
            </svg>
        );
    }

    if (type === 'usuarios') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="9" cy="8.4" r="2.5" />
                <circle cx="16" cy="9.3" r="2.1" />
                <path d="M4.5 18.5c1-2.9 2.9-4.4 5.6-4.4s4.5 1.5 5.6 4.4" />
                <path d="M14.6 18.5c.7-1.9 2-2.9 3.8-2.9 1.2 0 2.3.5 3.1 1.6" />
            </svg>
        );
    }

    if (type === 'perfil') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="12" cy="8.2" r="3.1" />
                <path d="M5.3 19.2c1.2-3.4 3.4-5.2 6.7-5.2s5.5 1.8 6.7 5.2" />
            </svg>
        );
    }

    if (type === 'auditoria') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M12 3.5 5.5 6v5.5c0 4.1 2.7 7.3 6.5 9 3.8-1.7 6.5-4.9 6.5-9V6L12 3.5Z" />
                <path d="M8.5 11h7" />
                <path d="M8.5 14h4.5" />
            </svg>
        );
    }

    return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M15 7.5V6a2 2 0 0 0-2-2H6.5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2H13a2 2 0 0 0 2-2v-1.5" />
            <path d="M11 12h8" />
            <path d="m16 9 3 3-3 3" />
        </svg>
    );
}

function ChevronIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="m7 10 5 5 5-5" />
        </svg>
    );
}

function getUserDisplayName(user) {
    return user?.nombre_completo || user?.nombre_usuario || 'Usuario institucional';
}

function getUserInitials(user) {
    const initials = getUserDisplayName(user)
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

    return initials || 'UI';
}

function AppLayout() {
    const navigate = useNavigate();
    const userMenuRef = useRef(null);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const { user, logout } = useAuthStore((state) => ({
        user: state.user,
        logout: state.logout
    }));
    const isAdministrador = user?.rol?.nombre_rol === 'ADMINISTRADOR';
    const userDisplayName = getUserDisplayName(user);
    const userInitials = getUserInitials(user);
    const rolNombre = user?.rol?.nombre_rol || 'Usuario institucional';

    const navItems = [
        {
            key: 'dashboard',
            label: 'Panel principal',
            to: '/dashboard',
            iconType: 'dashboard'
        },
        {
            key: 'alertamientos',
            label: 'Alertamientos',
            to: '/alertamientos',
            iconType: 'alertamientos'
        },
        {
            key: 'mapa',
            label: 'Mapa operativo',
            to: '/mapa',
            iconType: 'mapa'
        }
    ];

    if (isAdministrador) {
        navItems.push({
            key: 'usuarios',
            label: 'Gestion de usuarios',
            to: '/usuarios',
            iconType: 'usuarios'
        }, {
            key: 'auditoria',
            label: 'Auditoria',
            to: '/auditoria',
            iconType: 'auditoria'
        });
    }

    // El menu se cierra con click externo o Escape. Es solo estado visual:
    // no modifica permisos, rutas ni la logica de autenticacion existente.
    useEffect(() => {
        if (!isUserMenuOpen) {
            return undefined;
        }

        function handlePointerDown(event) {
            if (!userMenuRef.current?.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
        }

        function handleKeyDown(event) {
            if (event.key === 'Escape') {
                setIsUserMenuOpen(false);
            }
        }

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isUserMenuOpen]);

    function handleProfileNavigation() {
        // La pantalla de perfil es una ruta protegida del frontend; reutiliza
        // el contexto real de /auth/me sin crear permisos ni endpoints nuevos.
        setIsUserMenuOpen(false);
        navigate('/perfil');
    }

    function handleLogout() {
        setIsUserMenuOpen(false);
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

                    <div className="app-header__institution">
                        <h1>Guardia Nacional</h1>
                        <p>Justicia y Paz</p>
                    </div>

                    <span className="app-header__divider" aria-hidden="true" />

                    <div className="app-header__project">
                        <strong>Plataforma Nacional</strong>
                        <span>de Alertamientos</span>
                    </div>
                </div>

                <div className="app-header__actions">
                    <nav className="app-nav" aria-label="Navegacion principal">
                        {navItems.map((item) => (
                            <NavLink
                                className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}
                                key={item.key}
                                to={item.to}
                            >
                                <span className="nav-link__icon" aria-hidden="true">
                                    <AppNavIcon type={item.iconType} />
                                </span>
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>

                    <div className="app-user-menu" ref={userMenuRef}>
                        <button
                            aria-expanded={isUserMenuOpen}
                            aria-haspopup="menu"
                            className={`app-user-menu__trigger${isUserMenuOpen ? ' is-open' : ''}`}
                            onClick={() => setIsUserMenuOpen((currentValue) => !currentValue)}
                            type="button"
                        >
                            <span className="app-user-menu__avatar" aria-hidden="true">{userInitials}</span>
                            <span className="app-user-menu__identity">
                                <strong>{userDisplayName}</strong>
                                <small>{rolNombre}</small>
                            </span>
                            <span className="app-user-menu__chevron" aria-hidden="true">
                                <ChevronIcon />
                            </span>
                        </button>

                        {isUserMenuOpen ? (
                            <div className="app-user-menu__panel" role="menu">
                                <div className="app-user-menu__summary">
                                    <span className="app-user-menu__avatar app-user-menu__avatar--large" aria-hidden="true">
                                        {userInitials}
                                    </span>
                                    <div>
                                        <strong>{userDisplayName}</strong>
                                        <span>{user?.correo_electronico || 'Sin correo institucional'}</span>
                                        <small>{rolNombre}</small>
                                    </div>
                                </div>

                                <button
                                    className="app-user-menu__action"
                                    onClick={handleProfileNavigation}
                                    role="menuitem"
                                    type="button"
                                >
                                    <span className="app-user-menu__action-icon" aria-hidden="true">
                                        <AppNavIcon type="perfil" />
                                    </span>
                                    <span className="app-user-menu__action-copy">
                                        <strong>Mi perfil</strong>
                                        <small>Ver contexto operativo</small>
                                    </span>
                                </button>

                                <button
                                    className="app-user-menu__logout"
                                    onClick={handleLogout}
                                    role="menuitem"
                                    type="button"
                                >
                                    <span className="app-user-menu__logout-icon" aria-hidden="true">
                                        <AppNavIcon type="logout" />
                                    </span>
                                    <span className="app-user-menu__logout-copy">
                                        <strong>Cerrar sesion</strong>
                                        <small>Finalizar acceso seguro</small>
                                    </span>
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </header>

            <main className="app-content">
                <Outlet />
            </main>
        </div>
    );
}

export default AppLayout;
