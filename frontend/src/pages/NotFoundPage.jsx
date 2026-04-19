import React from 'react';
import { Link } from 'react-router-dom';

function NotFoundPage() {
    return (
        <div className="page-shell">
            <div className="card card--narrow">
                <h1 className="title">Ruta no encontrada</h1>
                <p className="subtitle">
                    La ruta solicitada no existe en este frontend minimo de validacion.
                </p>
                <div className="button-row">
                    <Link className="button" to="/dashboard">Ir al dashboard</Link>
                    <Link className="button button--secondary" to="/login">Ir al login</Link>
                </div>
            </div>
        </div>
    );
}

export default NotFoundPage;
