import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

function LoginPage() {
    const navigate = useNavigate();
    const { login, token, user, isLoading, errorMessage } = useAuthStore((state) => ({
        login: state.login,
        token: state.token,
        user: state.user,
        isLoading: state.isLoading,
        errorMessage: state.errorMessage
    }));

    const [formValues, setFormValues] = useState({
        nombre_usuario: '',
        contrasena: ''
    });

    // Si ya existe sesion valida, no tiene sentido mostrar otra vez el login.
    useEffect(() => {
        if (token && user) {
            navigate('/dashboard', { replace: true });
        }
    }, [navigate, token, user]);

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
        <div className="page-shell">
            <div className="card card--narrow">
                <h1 className="title">Inicio de sesion</h1>
                <p className="subtitle">
                    Frontend minimo para validar la autenticacion institucional contra el backend.
                </p>

                <form className="form-grid" onSubmit={handleSubmit}>
                    <div className="field">
                        <label htmlFor="nombre_usuario">Nombre de usuario</label>
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

                    <div className="field">
                        <label htmlFor="contrasena">Contrasena</label>
                        <input
                            id="contrasena"
                            name="contrasena"
                            type="password"
                            value={formValues.contrasena}
                            onChange={handleChange}
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    {errorMessage ? <p className="message">{errorMessage}</p> : null}

                    <div className="button-row">
                        <button className="button" type="submit" disabled={isLoading}>
                            {isLoading ? 'Ingresando...' : 'Ingresar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default LoginPage;
