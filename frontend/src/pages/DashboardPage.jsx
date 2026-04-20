import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

function DashboardPage() {
    const {
        user,
        isLoading,
        errorMessage,
        fetchMe
    } = useAuthStore((state) => ({
        user: state.user,
        isLoading: state.isLoading,
        errorMessage: state.errorMessage,
        fetchMe: state.fetchMe
    }));

    // Se refresca el perfil al entrar al dashboard para reflejar el estado real
    // del backend, incluso si la pagina fue recargada.
    useEffect(() => {
        void fetchMe().catch(() => {});
    }, [fetchMe]);

    return (
        <section className="card card--wide">
            <div className="section-heading">
                <div>
                    <p className="eyebrow">Resumen Inicial</p>
                    <h2 className="title">Dashboard</h2>
                    <p className="subtitle">
                        Validacion minima del contexto autenticado y punto de entrada al modulo de alertamientos.
                    </p>
                </div>

                <Link className="button" to="/alertamientos">
                    Abrir modulo de alertamientos
                </Link>
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
                        <pre className="mono preformatted-box">
                            {JSON.stringify(user.ambito, null, 2)}
                        </pre>
                    </section>
                </div>
            ) : null}
        </section>
    );
}

export default DashboardPage;
