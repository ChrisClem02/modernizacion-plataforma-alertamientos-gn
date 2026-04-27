import React, { useEffect, useMemo, useState } from 'react';

function getApiErrorMessage(error, fallbackMessage) {
    return error?.response?.data?.message || fallbackMessage;
}

function normalizeTrimmedValue(value) {
    return typeof value === 'string' ? value.trim() : value;
}

function sanitizeHumanNameInput(value) {
    if (typeof value !== 'string') {
        return value;
    }

    // La UI filtra caracteres invalidos en tiempo real para que nombres y
    // apellidos no acepten numeros ni signos especiales ajenos al dominio.
    return value
        .replace(/[^\p{L}\s'-]/gu, '')
        .replace(/\s+/g, ' ')
        .replace(/^[ '-]+/u, '');
}

function createEmptyFormState() {
    return {
        nombres: '',
        apellido_paterno: '',
        apellido_materno: '',
        nombre_usuario: '',
        correo_electronico: '',
        contrasena: '',
        id_rol: '',
        id_nivel_operativo: '',
        id_torre: '',
        id_estado: '',
        id_territorio: ''
    };
}

function createFormStateFromUser(user) {
    if (!user) {
        return createEmptyFormState();
    }

    return {
        nombres: user.nombres || '',
        apellido_paterno: user.apellido_paterno || '',
        apellido_materno: user.apellido_materno || '',
        nombre_usuario: user.nombre_usuario || '',
        correo_electronico: user.correo_electronico || '',
        contrasena: '',
        id_rol: user.id_rol ? String(user.id_rol) : '',
        id_nivel_operativo: user.nivel_operativo?.id_nivel_operativo
            ? String(user.nivel_operativo.id_nivel_operativo)
            : '',
        id_torre: user.ambito?.referencia?.id_torre
            ? String(user.ambito.referencia.id_torre)
            : '',
        id_estado: user.ambito?.referencia?.id_estado
            ? String(user.ambito.referencia.id_estado)
            : '',
        id_territorio: user.ambito?.referencia?.id_territorio
            ? String(user.ambito.referencia.id_territorio)
            : ''
    };
}

function buildAmbitoPayload(formState) {
    const nivelId = Number.parseInt(formState.id_nivel_operativo, 10);

    if (!Number.isInteger(nivelId)) {
        throw new Error('Selecciona un nivel operativo valido.');
    }

    if (nivelId === 1) {
        const torreId = Number.parseInt(formState.id_torre, 10);

        if (!Number.isInteger(torreId) || torreId <= 0) {
            throw new Error('Selecciona la torre para el ambito del usuario.');
        }

        return {
            id_nivel_operativo: nivelId,
            id_torre: torreId
        };
    }

    if (nivelId === 2) {
        const estadoId = Number.parseInt(formState.id_estado, 10);

        if (!Number.isInteger(estadoId) || estadoId <= 0) {
            throw new Error('Selecciona el estado para el ambito del usuario.');
        }

        return {
            id_nivel_operativo: nivelId,
            id_estado: estadoId
        };
    }

    if (nivelId === 3) {
        const territorioId = Number.parseInt(formState.id_territorio, 10);

        if (!Number.isInteger(territorioId) || territorioId <= 0) {
            throw new Error('Selecciona el territorio para el ambito del usuario.');
        }

        return {
            id_nivel_operativo: nivelId,
            id_territorio: territorioId
        };
    }

    if (nivelId === 4) {
        return {
            id_nivel_operativo: nivelId,
            ambito_nacional: true
        };
    }

    throw new Error('El nivel operativo seleccionado no es valido.');
}

function buildUsuarioPayload(formState, mode) {
    const payload = {
        nombres: normalizeTrimmedValue(formState.nombres),
        apellido_paterno: normalizeTrimmedValue(formState.apellido_paterno),
        apellido_materno: normalizeTrimmedValue(formState.apellido_materno) || null,
        nombre_usuario: normalizeTrimmedValue(formState.nombre_usuario),
        correo_electronico: normalizeTrimmedValue(formState.correo_electronico),
        id_rol: Number.parseInt(formState.id_rol, 10),
        ambito: buildAmbitoPayload(formState)
    };

    if (!payload.nombres || !payload.apellido_paterno || !payload.nombre_usuario || !payload.correo_electronico) {
        throw new Error('Completa todos los campos obligatorios del usuario.');
    }

    if (!Number.isInteger(payload.id_rol) || payload.id_rol <= 0) {
        throw new Error('Selecciona un rol valido.');
    }

    if (mode === 'create') {
        if (!formState.contrasena) {
            throw new Error('La contrasena inicial es obligatoria para crear usuarios.');
        }

        payload.contrasena = formState.contrasena;
    }

    return payload;
}

function getAmbitoHint(levelId) {
    if (levelId === '1') {
        return 'El nivel TORRE requiere seleccionar una torre activa.';
    }

    if (levelId === '2') {
        return 'El nivel ESTATAL requiere seleccionar un estado activo.';
    }

    if (levelId === '3') {
        return 'El nivel TERRITORIAL requiere seleccionar un territorio activo.';
    }

    if (levelId === '4') {
        return 'El nivel NACIONAL no requiere una referencia territorial adicional.';
    }

    return 'Selecciona primero el nivel operativo para habilitar el ambito correspondiente.';
}

function UsuarioFormPanel({ mode, initialUser, catalogs, onCancel, onSubmit }) {
    const [formState, setFormState] = useState(() => createFormStateFromUser(initialUser));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    useEffect(() => {
        setFormState(createFormStateFromUser(initialUser));
        setErrorMessage(null);
        setIsSubmitting(false);
    }, [initialUser, mode]);

    const selectedNivelOperativo = formState.id_nivel_operativo;

    const availableTorres = useMemo(
        () => catalogs.torres.filter((torre) => torre.activo),
        [catalogs.torres]
    );
    const availableEstados = useMemo(
        () => catalogs.estados.filter((estado) => estado.activo),
        [catalogs.estados]
    );
    const availableTerritorios = useMemo(
        () => catalogs.territorios.filter((territorio) => territorio.activo),
        [catalogs.territorios]
    );

    function handleChange(event) {
        const { name, value } = event.target;
        const nextValue = ['nombres', 'apellido_paterno', 'apellido_materno'].includes(name)
            ? sanitizeHumanNameInput(value)
            : value;

        setFormState((currentState) => {
            const nextState = {
                ...currentState,
                [name]: nextValue
            };

            // Cuando cambia el nivel operativo se limpian las referencias
            // incompatibles para evitar combinaciones ambiguas en el payload.
            if (name === 'id_nivel_operativo') {
                nextState.id_torre = '';
                nextState.id_estado = '';
                nextState.id_territorio = '';
            }

            return nextState;
        });
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const payload = buildUsuarioPayload(formState, mode);
            await onSubmit(payload);
        } catch (error) {
            setErrorMessage(
                getApiErrorMessage(error, 'No fue posible guardar los datos del usuario.')
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    const isCreateMode = mode === 'create';

    return (
        <section className="form-panel">
            <div className="section-heading section-heading--compact">
                <div>
                    <p className="eyebrow">{isCreateMode ? 'Alta de Usuario' : 'Edicion de Usuario'}</p>
                    <h3 className="title title--small">
                        {isCreateMode ? 'Nuevo usuario institucional' : 'Actualizar usuario existente'}
                    </h3>
                    <p className="subtitle subtitle--small">
                        El formulario consume directamente el backend de usuarios ya validado y respeta las reglas de rol y ambito.
                    </p>
                </div>
            </div>

            <form className="form-grid" onSubmit={handleSubmit}>
                <div className="filter-grid">
                    <div className="field">
                        <label htmlFor="usuario_nombres">nombres</label>
                        <input
                            id="usuario_nombres"
                            name="nombres"
                            type="text"
                            value={formState.nombres}
                            onChange={handleChange}
                            title="Solo se permiten letras, espacios, apostrofes y guiones."
                            required
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="usuario_apellido_paterno">apellido_paterno</label>
                        <input
                            id="usuario_apellido_paterno"
                            name="apellido_paterno"
                            type="text"
                            value={formState.apellido_paterno}
                            onChange={handleChange}
                            title="Solo se permiten letras, espacios, apostrofes y guiones."
                            required
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="usuario_apellido_materno">apellido_materno</label>
                        <input
                            id="usuario_apellido_materno"
                            name="apellido_materno"
                            type="text"
                            value={formState.apellido_materno}
                            onChange={handleChange}
                            title="Solo se permiten letras, espacios, apostrofes y guiones."
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="usuario_nombre_usuario">nombre_usuario</label>
                        <input
                            id="usuario_nombre_usuario"
                            name="nombre_usuario"
                            type="text"
                            value={formState.nombre_usuario}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="usuario_correo_electronico">correo_electronico</label>
                        <input
                            id="usuario_correo_electronico"
                            name="correo_electronico"
                            type="email"
                            value={formState.correo_electronico}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {isCreateMode ? (
                        <div className="field">
                            <label htmlFor="usuario_contrasena">contrasena_inicial</label>
                            <input
                                id="usuario_contrasena"
                                name="contrasena"
                                type="password"
                                value={formState.contrasena}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    ) : null}

                    <div className="field">
                        <label htmlFor="usuario_id_rol">rol</label>
                        <select
                            id="usuario_id_rol"
                            name="id_rol"
                            value={formState.id_rol}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Selecciona un rol</option>
                            {catalogs.roles.map((role) => (
                                <option key={role.id_rol} value={role.id_rol}>
                                    {role.nombre_rol}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="field">
                        <label htmlFor="usuario_id_nivel_operativo">nivel_operativo</label>
                        <select
                            id="usuario_id_nivel_operativo"
                            name="id_nivel_operativo"
                            value={formState.id_nivel_operativo}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Selecciona un nivel operativo</option>
                            {catalogs.nivelesOperativos.map((nivel) => (
                                <option key={nivel.id_nivel_operativo} value={nivel.id_nivel_operativo}>
                                    {nivel.nombre_nivel}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="field field--full">
                    <label>ambito</label>
                    <p className="field-hint">{getAmbitoHint(selectedNivelOperativo)}</p>
                </div>

                {selectedNivelOperativo === '1' ? (
                    <div className="field">
                        <label htmlFor="usuario_id_torre">torre</label>
                        <select
                            id="usuario_id_torre"
                            name="id_torre"
                            value={formState.id_torre}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Selecciona una torre</option>
                            {availableTorres.map((torre) => (
                                <option key={torre.id_torre} value={torre.id_torre}>
                                    {torre.nombre_torre} ({torre.codigo_torre || `ID ${torre.id_torre}`})
                                </option>
                            ))}
                        </select>
                    </div>
                ) : null}

                {selectedNivelOperativo === '2' ? (
                    <div className="field">
                        <label htmlFor="usuario_id_estado">estado</label>
                        <select
                            id="usuario_id_estado"
                            name="id_estado"
                            value={formState.id_estado}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Selecciona un estado</option>
                            {availableEstados.map((estado) => (
                                <option key={estado.id_estado} value={estado.id_estado}>
                                    {estado.nombre_estado}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : null}

                {selectedNivelOperativo === '3' ? (
                    <div className="field">
                        <label htmlFor="usuario_id_territorio">territorio</label>
                        <select
                            id="usuario_id_territorio"
                            name="id_territorio"
                            value={formState.id_territorio}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Selecciona un territorio</option>
                            {availableTerritorios.map((territorio) => (
                                <option key={territorio.id_territorio} value={territorio.id_territorio}>
                                    {territorio.nombre_territorio}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : null}

                {selectedNivelOperativo === '4' ? (
                    <div className="summary-box">
                        <h3>Ambito Nacional</h3>
                        <p>El backend registrara este usuario con visibilidad nacional completa.</p>
                    </div>
                ) : null}

                {errorMessage ? <p className="message">{errorMessage}</p> : null}

                <div className="button-row">
                    <button className="button" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Guardando...' : isCreateMode ? 'Crear usuario' : 'Guardar cambios'}
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

export default UsuarioFormPanel;
