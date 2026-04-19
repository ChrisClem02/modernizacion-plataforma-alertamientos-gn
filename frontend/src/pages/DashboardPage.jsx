import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

function DashboardPage() {
    const navigate = useNavigate();
    const {
        user,
        isLoading,
        errorMessage,
        fetchMe,
        logout
    } = useAuthStore((state) => ({
        user: state.user,
        isLoading: state.isLoading,
        errorMessage: state.errorMessage,
        fetchMe: state.fetchMe,
        logout: state.logout
    }));

    // Se refresca el perfil al entrar al dashboard para reflejar el estado real
    // del backend, incluso si la pagina fue recargada.
    useEffect(() => {
        void fetchMe().catch(() => {});
    }, [fetchMe]);

    function handleLogout() {
        logout();
        navigate('/login', { replace: true });
    }

    return (
        <div className="page-shell">
            <div className="card">
                <div className="button-row" style={{ justifyContent: 'space-between', marginTop: 0 }}>
                    <div>
                        <h1 className="title">Dashboard</h1>
                        <p className="subtitle">
                            Validacion minima de la integracion frontend-backend para autenticacion.
                        </p>
                    </div>

                    <button className="button button--secondary" type="button" onClick={handleLogout}>
                        Cerrar sesion
                    </button>
                </div>

                {errorMessage ? <p className="message">{errorMessage}</p> : null}

                {isLoading && !user ? (
                    <p className="loading-state">Cargando datos del usuario autenticado...</p>
                ) : null}

                {user ? (
                    <div className="summary-grid">
                        <section className="summary-box">
                            <h3>Usuario</h3>
                            <p><strong>nombre_usuario:</strong> <span className="mono">{user.nombre_usuario}</span></p>
                            <p><strong>id_usuario:</strong> <span className="mono">{user.id_usuario}</span></p>
                            <p><strong>correo:</strong> {user.correo_electronico}</p>
                        </section>

                        <section className="summary-box">
                            <h3>Rol</h3>
                            <p><strong>id_rol:</strong> <span className="mono">{user.id_rol}</span></p>
                            <p><strong>nombre_rol:</strong> {user.rol?.nombre_rol || 'Sin rol'}</p>
                        </section>

                        <section className="summary-box">
                            <h3>Nivel Operativo</h3>
                            <p><strong>id_nivel_operativo:</strong> <span className="mono">{user.nivel_operativo?.id_nivel_operativo || 'N/A'}</span></p>
                            <p><strong>nombre_nivel:</strong> {user.nivel_operativo?.nombre_nivel || 'Sin nivel'}</p>
                        </section>

                        <section className="summary-box">
                            <h3>Ambito</h3>
                            <p><strong>tipo:</strong> {user.ambito?.tipo || 'Sin ambito'}</p>
                            <p><strong>ambito_nacional:</strong> {String(user.ambito?.ambito_nacional ?? false)}</p>
                            <pre className="mono" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                                {JSON.stringify(user.ambito, null, 2)}
                            </pre>
                        </section>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export default DashboardPage;
