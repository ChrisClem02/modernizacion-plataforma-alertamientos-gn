import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import defensaLogo from '../assets/defensa-logo.png';
import emblemaGobierno from '../assets/emblema-gobierno.png';
import escudoGuardiaNacional from '../assets/escudo-guardia-nacional.png';
import { useAuthStore } from '../store/auth.store';

function LoginPage() {
    const navigate = useNavigate();
    const { login, token, user, isBootstrapped, isHydratingSession, isLoading, errorMessage } = useAuthStore((state) => ({
        login: state.login,
        token: state.token,
        user: state.user,
        isBootstrapped: state.isBootstrapped,
        isHydratingSession: state.isHydratingSession,
        isLoading: state.isLoading,
        errorMessage: state.errorMessage
    }));

    const [formValues, setFormValues] = useState({
        nombre_usuario: '',
        contrasena: ''
    });

    // Solo se redirige cuando la sesión ya fue validada contra el backend.
    useEffect(() => {
        if (isBootstrapped && token && user) {
            navigate('/dashboard', { replace: true });
        }
    }, [isBootstrapped, navigate, token, user]);

    function handleChange(event) {
        const { name, value } = event.target;

        setFormValues((currentState) => ({
            ...currentState,
            [name]: value
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        try {
            await login(formValues);
            navigate('/dashboard', { replace: true });
        } catch (_error) {
            // El mensaje queda centralizado en el store para simplificar la UI.
        }
    }

    return (
        <div className="login-shell">
            <div className="login-stage">
                <section className="login-brand-panel" aria-label="Identidad institucional">
                    <img
                        className="login-hero-engraving"
                        src={emblemaGobierno}
                        alt=""
                        aria-hidden="true"
                    />

                    <div className="login-brand-panel__content">
                        <p className="login-eyebrow">Guardia Nacional</p>
                        <h1>Plataforma Nacional de Alertamientos</h1>
                        <p>
                            Sistema institucional para la consulta, seguimiento y administración
                            operativa de alertamientos.
                        </p>
                    </div>

                    <div className="login-feature-row" aria-hidden="true">
                        <span className="login-feature">
                            <span className="login-feature-icon login-feature-icon--shield" />
                            Seguridad institucional
                        </span>
                        <span className="login-feature">
                            <span className="login-feature-icon login-feature-icon--lock" />
                            Acceso controlado
                        </span>
                        <span className="login-feature">
                            <span className="login-feature-icon login-feature-icon--scale" />
                            Información confiable
                        </span>
                    </div>
                </section>

                <section className="login-form-panel" aria-label="Inicio de sesión">
                    <div className="login-institution-strip" aria-label="Identidad superior">
                        <span className="login-strip-defense">
                            <img className="login-strip-emblem" src={defensaLogo} alt="" />
                            <span>Defensa</span>
                        </span>
                        <span className="login-strip-divider" aria-hidden="true" />
                        <span className="login-strip-gn">
                            <img src={escudoGuardiaNacional} alt="" />
                            <span className="login-strip-gn-copy">
                                <strong>GN</strong>
                                <span>GUARDIA NACIONAL</span>
                            </span>
                        </span>
                    </div>

                    <div className="card card--narrow login-card">
                        <p className="eyebrow">Acceso institucional</p>
                        <h2 className="title">Inicio de sesión</h2>
                        <p className="subtitle">Ingresa con tu cuenta autorizada para continuar.</p>

                        {isHydratingSession ? (
                            <p className="login-status">
                                Validando una sesión almacenada antes de mostrar el formulario.
                            </p>
                        ) : null}

                        <form className="form-grid login-form" onSubmit={handleSubmit}>
                            <div className="field">
                                <label htmlFor="nombre_usuario">Nombre de usuario</label>
                                <div className="login-input-shell">
                                    <span className="login-input-icon login-input-icon--user" aria-hidden="true" />
                                    <input
                                        id="nombre_usuario"
                                        name="nombre_usuario"
                                        type="text"
                                        value={formValues.nombre_usuario}
                                        onChange={handleChange}
                                        autoComplete="username"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="field">
                                <label htmlFor="contrasena">Contraseña</label>
                                <div className="login-input-shell">
                                    <span className="login-input-icon login-input-icon--lock" aria-hidden="true" />
                                    <input
                                        id="contrasena"
                                        name="contrasena"
                                        type="password"
                                        value={formValues.contrasena}
                                        onChange={handleChange}
                                        autoComplete="current-password"
                                        required
                                    />
                                    <span className="login-input-action" aria-hidden="true" />
                                </div>
                            </div>

                            {errorMessage ? <p className="message">{errorMessage}</p> : null}

                            <div className="button-row">
                                <button className="button" type="submit" disabled={isLoading || isHydratingSession}>
                                    {isLoading ? 'Ingresando...' : 'Ingresar'}
                                </button>
                            </div>
                        </form>

                        <p className="login-forgot-link">
                            ¿Olvidaste tu contraseña?
                        </p>

                        <div className="login-security-note">
                            <span aria-hidden="true" />
                            Acceso restringido a usuarios no autorizados
                        </div>
                    </div>
                </section>

                <div className="login-justice-mark" aria-hidden="true">
                    <span className="login-justice-line" />
                    <span className="login-laurel login-laurel--left" />
                    <span className="login-star">*</span>
                    <span className="login-laurel login-laurel--right" />
                    <span className="login-justice-line" />
                    <strong>JUSTICIA Y PAZ</strong>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
