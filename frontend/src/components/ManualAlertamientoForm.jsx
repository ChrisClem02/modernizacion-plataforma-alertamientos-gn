import React, { useState } from 'react';
import { createManualAlertamientoRequest } from '../api/alertamientos.api';

const INITIAL_FORM_STATE = {
    id_torre: '',
    placa_detectada: '',
    fecha_hora_deteccion: '',
    latitud_deteccion: '',
    longitud_deteccion: '',
    carril: '',
    sentido_vial: '',
    observaciones: ''
};

function getApiErrorMessage(error, fallbackMessage) {
    return error?.response?.data?.message || fallbackMessage;
}

function normalizeFormValue(value) {
    return typeof value === 'string' ? value.trim() : value;
}

function buildCreatePayload(formState) {
    const payload = {
        id_torre: Number.parseInt(formState.id_torre, 10),
        placa_detectada: normalizeFormValue(formState.placa_detectada).toUpperCase(),
        fecha_hora_deteccion: normalizeFormValue(formState.fecha_hora_deteccion)
    };

    // Los campos opcionales solo se envian cuando tienen valor para no forzar
    // nulls innecesarios en la solicitud.
    if (normalizeFormValue(formState.latitud_deteccion) !== '') {
        payload.latitud_deteccion = Number.parseFloat(formState.latitud_deteccion);
    }

    if (normalizeFormValue(formState.longitud_deteccion) !== '') {
        payload.longitud_deteccion = Number.parseFloat(formState.longitud_deteccion);
    }

    if (normalizeFormValue(formState.carril) !== '') {
        payload.carril = normalizeFormValue(formState.carril);
    }

    if (normalizeFormValue(formState.sentido_vial) !== '') {
        payload.sentido_vial = normalizeFormValue(formState.sentido_vial);
    }

    if (normalizeFormValue(formState.observaciones) !== '') {
        payload.observaciones = normalizeFormValue(formState.observaciones);
    }

    return payload;
}

function ManualAlertamientoForm({ onCancel, onCreated }) {
    const [formState, setFormState] = useState(INITIAL_FORM_STATE);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    function handleChange(event) {
        const { name, value } = event.target;

        setFormState((currentState) => ({
            ...currentState,
            [name]: name === 'placa_detectada' ? value.toUpperCase() : value
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const payload = buildCreatePayload(formState);
            const response = await createManualAlertamientoRequest(payload);

            // El componente no decide por si solo a donde navegar: delega la
            // reaccion de exito al contenedor para mantenerlo reutilizable.
            onCreated?.(response);
        } catch (error) {
            setErrorMessage(
                getApiErrorMessage(error, 'No fue posible registrar el alertamiento manual.')
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="form-panel">
            <div className="section-heading section-heading--compact">
                <div>
                    <p className="eyebrow">Alta Manual</p>
                    <h3 className="title title--small">Nuevo alertamiento</h3>
                    <p className="subtitle subtitle--small">
                        Esta captura usa el endpoint ya disponible del backend y respeta la visibilidad institucional.
                    </p>
                </div>
            </div>

            <form className="form-grid" onSubmit={handleSubmit}>
                <div className="filter-grid">
                    <div className="field">
                        <label htmlFor="nuevo_id_torre">id_torre</label>
                        <input
                            id="nuevo_id_torre"
                            name="id_torre"
                            type="number"
                            min="1"
                            value={formState.id_torre}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="nuevo_placa_detectada">placa_detectada</label>
                        <input
                            id="nuevo_placa_detectada"
                            name="placa_detectada"
                            type="text"
                            placeholder="ABC123"
                            value={formState.placa_detectada}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="nuevo_fecha_hora_deteccion">fecha_hora_deteccion</label>
                        <input
                            id="nuevo_fecha_hora_deteccion"
                            name="fecha_hora_deteccion"
                            type="datetime-local"
                            value={formState.fecha_hora_deteccion}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="nuevo_latitud_deteccion">latitud_deteccion</label>
                        <input
                            id="nuevo_latitud_deteccion"
                            name="latitud_deteccion"
                            type="number"
                            step="0.000001"
                            value={formState.latitud_deteccion}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="nuevo_longitud_deteccion">longitud_deteccion</label>
                        <input
                            id="nuevo_longitud_deteccion"
                            name="longitud_deteccion"
                            type="number"
                            step="0.000001"
                            value={formState.longitud_deteccion}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="nuevo_carril">carril</label>
                        <input
                            id="nuevo_carril"
                            name="carril"
                            type="text"
                            value={formState.carril}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="nuevo_sentido_vial">sentido_vial</label>
                        <input
                            id="nuevo_sentido_vial"
                            name="sentido_vial"
                            type="text"
                            value={formState.sentido_vial}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="field field--full">
                        <label htmlFor="nuevo_observaciones">observaciones</label>
                        <textarea
                            id="nuevo_observaciones"
                            name="observaciones"
                            rows="4"
                            value={formState.observaciones}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {errorMessage ? <p className="message">{errorMessage}</p> : null}

                <div className="button-row">
                    <button className="button" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Registrando...' : 'Registrar alertamiento'}
                    </button>

                    <button
                        className="button button--ghost"
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </section>
    );
}

export default ManualAlertamientoForm;
