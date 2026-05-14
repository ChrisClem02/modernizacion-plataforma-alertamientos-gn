import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

function ProfileIcon({ type }) {
    if (type === 'correo') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <rect x="4.5" y="6.5" width="15" height="11" rx="2" />
                <path d="m5.5 8 6.5 5 6.5-5" />
            </svg>
        );
    }

    if (type === 'rol') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M12 3.5 5.5 6v5.5c0 4.1 2.7 7.3 6.5 9 3.8-1.7 6.5-4.9 6.5-9V6L12 3.5Z" />
                <path d="M9.5 12 11 13.5 14.8 10" />
            </svg>
        );
    }

    if (type === 'nivel') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M5 18h14" />
                <path d="M7.5 14h9" />
                <path d="M10 10h4" />
                <path d="M12 6.2v.1" />
            </svg>
        );
    }

    if (type === 'ambito') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M12 21s6-5.2 6-11a6 6 0 0 0-12 0c0 5.8 6 11 6 11Z" />
                <circle cx="12" cy="10" r="2.2" />
            </svg>
        );
    }

    return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="12" cy="8.2" r="3.1" />
            <path d="M5.3 19.2c1.2-3.4 3.4-5.2 6.7-5.2s5.5 1.8 6.7 5.2" />
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

function getAmbitoLabel(ambito) {
    if (!ambito) {
        return 'Sin ambito asignado';
    }

    if (ambito.ambito_nacional) {
        return 'Cobertura nacional';
    }

    if (ambito.tipo === 'TORRE') {
        return ambito.referencia?.nombre_torre || 'Torre asignada';
    }

    if (ambito.tipo === 'ESTATAL') {
        return ambito.referencia?.nombre_estado || 'Estado asignado';
    }

    if (ambito.tipo === 'TERRITORIAL') {
        return ambito.referencia?.nombre_territorio || 'Territorio asignado';
    }

    return 'Sin ambito asignado';
}

function getAmbitoTypeLabel(ambito) {
    if (!ambito) {
        return 'Sin ambito activo';
    }

    if (ambito.ambito_nacional) {
        return 'NACIONAL';
    }

    return ambito.tipo || 'Sin ambito activo';
}

function getStatusLabel(user) {
    if (typeof user?.activo !== 'boolean') {
        return 'Sesion validada';
    }

    return user.activo ? 'Usuario activo' : 'Usuario inactivo';
}

function ProfileInfoRow({ iconType, label, value, helper }) {
    return (
        <div className="profile-info-row">
            <span className="profile-info-row__icon" aria-hidden="true">
                <ProfileIcon type={iconType} />
            </span>

            <div className="profile-info-row__body">
                <span>{label}</span>
                <strong>{value || 'No disponible'}</strong>
                {helper ? <small>{helper}</small> : null}
            </div>
        </div>
    );
}

function ProfilePage() {
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

    // El perfil usa la misma fuente de verdad de autenticacion ya existente.
    // Revalidar aqui evita mostrar datos obsoletos tras recargar la pagina.
    useEffect(() => {
        void fetchMe().catch(() => {});
    }, [fetchMe]);

    const userDisplayName = getUserDisplayName(user);
    const userInitials = getUserInitials(user);
    const rolNombre = user?.rol?.nombre_rol || 'Sin rol asignado';
    const nivelNombre = user?.nivel_operativo?.nombre_nivel || 'Sin nivel operativo';
    const ambitoLabel = getAmbitoLabel(user?.ambito);
    const ambitoTypeLabel = getAmbitoTypeLabel(user?.ambito);
    const statusLabel = getStatusLabel(user);

    return (
        <section className="profile-page">
            <header className="profile-hero">
                <div className="profile-hero__copy">
                    <p className="eyebrow">Cuenta institucional</p>
                    <h2 className="title">Mi perfil</h2>
                    <p className="subtitle">
                        Consulta tu identidad de acceso y el contexto operativo
                        que determina tu visibilidad dentro de la plataforma.
                    </p>
                </div>

                <Link className="button button--secondary" to="/dashboard">
                    Volver al panel
                </Link>
            </header>

            {errorMessage ? <p className="message">{errorMessage}</p> : null}
            {isLoading ? <p className="profile-status">Actualizando perfil institucional...</p> : null}

            <div className="profile-layout">
                <article className="profile-card profile-card--identity">
                    <div className="profile-identity">
                        <span className="profile-identity__avatar" aria-hidden="true">
                            {userInitials}
                        </span>

                        <div className="profile-identity__copy">
                            <span>{statusLabel}</span>
                            <strong>{userDisplayName}</strong>
                            <p>{user?.correo_electronico || 'Sin correo institucional'}</p>
                        </div>
                    </div>

                    <div className="profile-badge-row" aria-label="Resumen de rol y visibilidad">
                        <span>{rolNombre}</span>
                        <span>{nivelNombre}</span>
                        <span>{ambitoTypeLabel}</span>
                    </div>
                </article>

                <article className="profile-card profile-card--details">
                    <div className="profile-card__heading">
                        <span className="profile-card__icon" aria-hidden="true">
                            <ProfileIcon type="perfil" />
                        </span>
                        <div>
                            <p className="eyebrow">Detalle del perfil</p>
                            <h3>Datos operativos vigentes</h3>
                        </div>
                    </div>

                    <div className="profile-info-list">
                        <ProfileInfoRow
                            iconType="correo"
                            label="Correo institucional"
                            value={user?.correo_electronico}
                            helper="Medio de identificacion registrado para esta cuenta."
                        />
                        <ProfileInfoRow
                            iconType="rol"
                            label="Rol funcional"
                            value={rolNombre}
                            helper="Define las acciones disponibles en la interfaz."
                        />
                        <ProfileInfoRow
                            iconType="nivel"
                            label="Nivel operativo"
                            value={nivelNombre}
                            helper="Representa el nivel de visibilidad institucional asignado."
                        />
                        <ProfileInfoRow
                            iconType="ambito"
                            label="Ambito de visibilidad"
                            value={ambitoLabel}
                            helper="Determina la informacion que puede consultar este usuario."
                        />
                    </div>
                </article>
            </div>
        </section>
    );
}

export default ProfilePage;
