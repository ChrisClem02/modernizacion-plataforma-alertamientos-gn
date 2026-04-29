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
    const rolNombre = user?.rol?.nombre_rol || 'Sin rol';
    const nivelNombre = user?.nivel_operativo?.nombre_nivel || 'Sin nivel operativo';
    const ambito = user?.ambito;
    const ambitoTipo = ambito?.tipo || 'Sin ámbito';
    const ambitoNombre = ambito?.torre?.nombre_torre
        || ambito?.territorio?.nombre_territorio
        || ambito?.estado?.nombre_estado
        || (ambito?.ambito_nacional ? 'Cobertura nacional' : 'Sin ámbito asignado');
    // Se refresca el perfil al entrar al dashboard para reflejar el estado real
    // del backend, incluso si la página fue recargada.
    useEffect(() => {
        void fetchMe().catch(() => {});
    }, [fetchMe]);

    return (
        <section className="card card--wide">
            <div className="section-heading">
                <div>
                    <p className="eyebrow">Vista institucional</p>
                    <h2 className="title">Panel de control</h2>
                    <p className="subtitle">
                        Acceso rápido a la operación de alertamientos y confirmación del contexto de visibilidad vigente.
                    </p>
                </div>

                <Link className="button" to="/alertamientos">
                    Abrir alertamientos
                </Link>
            </div>

            {errorMessage ? <p className="message">{errorMessage}</p> : null}

            {isLoading && !user ? (
                <p className="loading-state">Cargando datos del usuario autenticado...</p>
            ) : null}

            {user ? (
                <div className="dashboard-grid">
                    <section className="summary-box dashboard-card dashboard-card--primary">
                        <span className="dashboard-card__label">Sesión activa</span>
                        <h3>{user.nombre_usuario}</h3>
                        <p>{user.correo_electronico}</p>
                        <p className="dashboard-card__meta">
                            ID usuario <span className="mono">{user.id_usuario}</span>
                        </p>
                    </section>

                    <section className="summary-box dashboard-card">
                        <span className="dashboard-card__label">Rol institucional</span>
                        <h3>{rolNombre}</h3>
                        <p>Perfil con permisos aplicados desde backend.</p>
                        <p className="dashboard-card__meta">
                            ID rol <span className="mono">{user.id_rol}</span>
                        </p>
                    </section>

                    <section className="summary-box dashboard-card">
                        <span className="dashboard-card__label">Nivel operativo</span>
                        <h3>{nivelNombre}</h3>
                        <p>Define el alcance operativo usado para consultar información.</p>
                        <p className="dashboard-card__meta">
                            ID nivel <span className="mono">{user.nivel_operativo?.id_nivel_operativo || 'N/A'}</span>
                        </p>
                    </section>

                    <section className="summary-box dashboard-card dashboard-card--scope">
                        <span className="dashboard-card__label">Ámbito de visibilidad</span>
                        <h3>{ambitoNombre}</h3>
                        <p>{ambitoTipo}</p>
                        <p className="dashboard-card__meta">
                            Ámbito nacional: {ambito?.ambito_nacional ? 'Sí' : 'No'}
                        </p>
                    </section>
                </div>
            ) : null}
        </section>
    );
}

export default DashboardPage;
