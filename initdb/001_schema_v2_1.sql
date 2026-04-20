SET search_path TO public;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- MODELO FISICO BASE
-- Modernizacion de la Plataforma Nacional de Alertamiento de la Guardia Nacional
-- Version 2.1
-- =============================================================================
-- Separacion conceptual conservada:
-- 1. Jerarquia operativa: REGION_OPERATIVA -> CENTRAL_OPERATIVA -> TORRE_TIDV
-- 2. Visibilidad institucional: TORRE / ESTATAL / TERRITORIAL / NACIONAL
-- 3. Rol funcional: ADMINISTRADOR / COORDINADOR / OPERADOR
-- =============================================================================

CREATE TABLE estado (
    id_estado SMALLSERIAL PRIMARY KEY,
    nombre_estado VARCHAR(100) NOT NULL UNIQUE,
    abreviatura VARCHAR(10) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_estado_nombre CHECK (btrim(nombre_estado) <> ''),
    CONSTRAINT chk_estado_abreviatura CHECK (btrim(abreviatura) <> '')
);

CREATE TABLE territorio_operativo (
    id_territorio SMALLSERIAL PRIMARY KEY,
    nombre_territorio VARCHAR(150) NOT NULL UNIQUE,
    descripcion VARCHAR(300),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_territorio_nombre CHECK (btrim(nombre_territorio) <> '')
);

CREATE TABLE territorio_estado (
    id_territorio_estado BIGSERIAL PRIMARY KEY,
    id_territorio SMALLINT NOT NULL REFERENCES territorio_operativo (id_territorio) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_estado SMALLINT NOT NULL REFERENCES estado (id_estado) ON UPDATE RESTRICT ON DELETE RESTRICT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_territorio_estado_relacion UNIQUE (id_territorio, id_estado)
);
CREATE UNIQUE INDEX uq_territorio_estado_activo ON territorio_estado (id_estado) WHERE activo = TRUE;

CREATE TABLE nivel_operativo (
    id_nivel_operativo SMALLINT PRIMARY KEY,
    nombre_nivel VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(200),
    jerarquia_orden SMALLINT NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_nivel_nombre CHECK (btrim(nombre_nivel) <> ''),
    CONSTRAINT chk_nivel_orden CHECK (jerarquia_orden > 0)
);
COMMENT ON TABLE nivel_operativo IS 'Catalogo de niveles de visibilidad institucional.';
COMMENT ON COLUMN nivel_operativo.id_nivel_operativo IS 'Codigo institucional fijo: 1=TORRE, 2=ESTATAL, 3=TERRITORIAL, 4=NACIONAL.';
COMMENT ON COLUMN nivel_operativo.jerarquia_orden IS 'Orden ascendente del alcance de visibilidad institucional.';

CREATE TABLE rol_sistema (
    id_rol SMALLSERIAL PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(200),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_rol_nombre CHECK (btrim(nombre_rol) <> '')
);

CREATE TABLE estatus_alertamiento (
    id_estatus_alertamiento SMALLSERIAL PRIMARY KEY,
    nombre_estatus VARCHAR(60) NOT NULL UNIQUE,
    descripcion VARCHAR(250),
    orden_flujo SMALLINT NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_estatus_nombre CHECK (btrim(nombre_estatus) <> ''),
    CONSTRAINT chk_estatus_flujo CHECK (orden_flujo > 0)
);

CREATE TABLE catalogo_evento_auditoria (
    id_evento_auditoria SMALLSERIAL PRIMARY KEY,
    nombre_evento VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(250),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_evento_auditoria_nombre CHECK (btrim(nombre_evento) <> '')
);

CREATE TABLE region_operativa (
    id_region SMALLSERIAL PRIMARY KEY,
    nombre_region VARCHAR(150) NOT NULL UNIQUE,
    descripcion VARCHAR(300),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_region_nombre CHECK (btrim(nombre_region) <> '')
);

CREATE TABLE central_operativa (
    id_central BIGSERIAL PRIMARY KEY,
    id_region SMALLINT NOT NULL REFERENCES region_operativa (id_region) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_estado_sede SMALLINT NOT NULL REFERENCES estado (id_estado) ON UPDATE RESTRICT ON DELETE RESTRICT,
    nombre_central VARCHAR(150) NOT NULL,
    descripcion VARCHAR(300),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_central_region_nombre UNIQUE (id_region, nombre_central),
    CONSTRAINT chk_central_nombre CHECK (btrim(nombre_central) <> '')
);
CREATE INDEX idx_central_region ON central_operativa (id_region);
CREATE INDEX idx_central_estado_sede ON central_operativa (id_estado_sede);
COMMENT ON TABLE central_operativa IS 'Central operativa dentro de una region. Puede existir aun sin torres asociadas.';
COMMENT ON COLUMN central_operativa.id_estado_sede IS 'Estado sede o ubicacion administrativa de la central. No reemplaza el estado operativo de las torres.';

CREATE TABLE torre_tidv (
    id_torre BIGSERIAL PRIMARY KEY,
    id_central BIGINT NOT NULL REFERENCES central_operativa (id_central) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_estado SMALLINT NOT NULL REFERENCES estado (id_estado) ON UPDATE RESTRICT ON DELETE RESTRICT,
    nombre_torre VARCHAR(150) NOT NULL,
    codigo_torre VARCHAR(50),
    latitud NUMERIC(9,6),
    longitud NUMERIC(9,6),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_torre_central_nombre UNIQUE (id_central, nombre_torre),
    CONSTRAINT uq_torre_codigo UNIQUE (codigo_torre),
    CONSTRAINT chk_torre_nombre CHECK (btrim(nombre_torre) <> ''),
    CONSTRAINT chk_torre_latitud CHECK (latitud IS NULL OR latitud BETWEEN -90 AND 90),
    CONSTRAINT chk_torre_longitud CHECK (longitud IS NULL OR longitud BETWEEN -180 AND 180)
);
CREATE INDEX idx_torre_central ON torre_tidv (id_central);
CREATE INDEX idx_torre_estado ON torre_tidv (id_estado);

CREATE TABLE usuario (
    id_usuario BIGSERIAL PRIMARY KEY,
    id_rol SMALLINT NOT NULL REFERENCES rol_sistema (id_rol) ON UPDATE RESTRICT ON DELETE RESTRICT,
    nombres VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(100) NOT NULL,
    apellido_materno VARCHAR(100),
    nombre_usuario VARCHAR(60) NOT NULL UNIQUE,
    correo_electronico VARCHAR(150) NOT NULL,
    hash_contrasena TEXT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_ultimo_acceso TIMESTAMP,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_usuario_nombres CHECK (btrim(nombres) <> ''),
    CONSTRAINT chk_usuario_apellido_paterno CHECK (btrim(apellido_paterno) <> ''),
    CONSTRAINT chk_usuario_nombre_usuario CHECK (btrim(nombre_usuario) <> ''),
    CONSTRAINT chk_usuario_correo CHECK (
        btrim(correo_electronico) <> ''
        AND correo_electronico = btrim(correo_electronico)
        AND position('@' IN correo_electronico) > 1
        AND position(' ' IN correo_electronico) = 0
    ),
    CONSTRAINT chk_hash_contrasena_longitud CHECK (length(hash_contrasena) >= 60)
);
CREATE UNIQUE INDEX uq_usuario_correo_lower ON usuario (lower(correo_electronico));
COMMENT ON TABLE usuario IS 'Usuarios autorizados del sistema.';
COMMENT ON COLUMN usuario.correo_electronico IS 'Correo institucional obligatorio para identificacion y acceso.';

CREATE TABLE usuario_ambito (
    id_usuario_ambito BIGSERIAL PRIMARY KEY,
    id_usuario BIGINT NOT NULL REFERENCES usuario (id_usuario) ON UPDATE RESTRICT ON DELETE CASCADE,
    id_nivel_operativo SMALLINT NOT NULL REFERENCES nivel_operativo (id_nivel_operativo) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_torre BIGINT REFERENCES torre_tidv (id_torre) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_estado SMALLINT REFERENCES estado (id_estado) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_territorio SMALLINT REFERENCES territorio_operativo (id_territorio) ON UPDATE RESTRICT ON DELETE RESTRICT,
    ambito_nacional BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_usuario_ambito_unico_referente CHECK (
        (CASE WHEN id_torre IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN id_estado IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN id_territorio IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN ambito_nacional THEN 1 ELSE 0 END) = 1
    ),
    CONSTRAINT chk_usuario_ambito_tipo_consistente CHECK (
        (id_nivel_operativo = 1 AND id_torre IS NOT NULL AND id_estado IS NULL AND id_territorio IS NULL AND ambito_nacional = FALSE) OR
        (id_nivel_operativo = 2 AND id_torre IS NULL AND id_estado IS NOT NULL AND id_territorio IS NULL AND ambito_nacional = FALSE) OR
        (id_nivel_operativo = 3 AND id_torre IS NULL AND id_estado IS NULL AND id_territorio IS NOT NULL AND ambito_nacional = FALSE) OR
        (id_nivel_operativo = 4 AND id_torre IS NULL AND id_estado IS NULL AND id_territorio IS NULL AND ambito_nacional = TRUE)
    )
);
CREATE UNIQUE INDEX uq_usuario_ambito_activo_unico ON usuario_ambito (id_usuario) WHERE activo = TRUE;
CREATE INDEX idx_usuario_ambito_usuario_nivel ON usuario_ambito (id_usuario, id_nivel_operativo);
CREATE INDEX idx_usuario_ambito_torre ON usuario_ambito (id_torre) WHERE id_torre IS NOT NULL;
CREATE INDEX idx_usuario_ambito_estado ON usuario_ambito (id_estado) WHERE id_estado IS NOT NULL;
CREATE INDEX idx_usuario_ambito_territorio ON usuario_ambito (id_territorio) WHERE id_territorio IS NOT NULL;
COMMENT ON TABLE usuario_ambito IS 'Asigna el ambito de visibilidad institucional del usuario.';
COMMENT ON COLUMN usuario_ambito.id_nivel_operativo IS 'Nivel de visibilidad institucional efectivo del usuario.';
COMMENT ON INDEX uq_usuario_ambito_activo_unico IS 'Regla del prototipo: cada usuario solo puede tener un ambito institucional activo vigente.';

CREATE TABLE alertamiento_vehicular (
    id_alertamiento BIGSERIAL PRIMARY KEY,
    folio_alertamiento UUID NOT NULL DEFAULT gen_random_uuid(),
    id_torre BIGINT NOT NULL REFERENCES torre_tidv (id_torre) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_estatus_alertamiento SMALLINT NOT NULL REFERENCES estatus_alertamiento (id_estatus_alertamiento) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_usuario_creador BIGINT REFERENCES usuario (id_usuario) ON UPDATE RESTRICT ON DELETE SET NULL,
    placa_detectada VARCHAR(20) NOT NULL,
    fecha_hora_deteccion TIMESTAMP NOT NULL,
    latitud_deteccion NUMERIC(9,6),
    longitud_deteccion NUMERIC(9,6),
    carril VARCHAR(20),
    sentido_vial VARCHAR(20),
    origen_registro VARCHAR(20) NOT NULL DEFAULT 'AUTOMATICO',
    observaciones VARCHAR(500),
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_alertamiento_folio UNIQUE (folio_alertamiento),
    CONSTRAINT chk_alertamiento_placa CHECK (btrim(placa_detectada) <> '' AND placa_detectada = UPPER(btrim(placa_detectada))),
    CONSTRAINT chk_alertamiento_latitud CHECK (latitud_deteccion IS NULL OR latitud_deteccion BETWEEN -90 AND 90),
    CONSTRAINT chk_alertamiento_longitud CHECK (longitud_deteccion IS NULL OR longitud_deteccion BETWEEN -180 AND 180),
    CONSTRAINT chk_alertamiento_origen_registro CHECK (origen_registro IN ('AUTOMATICO', 'MANUAL', 'IMPORTADO')),
    CONSTRAINT chk_alertamiento_origen_usuario CHECK (origen_registro = 'AUTOMATICO' OR (origen_registro IN ('MANUAL', 'IMPORTADO') AND id_usuario_creador IS NOT NULL))
);
CREATE INDEX idx_alertamiento_fecha ON alertamiento_vehicular (fecha_hora_deteccion DESC);
CREATE INDEX idx_alertamiento_torre ON alertamiento_vehicular (id_torre);
CREATE INDEX idx_alertamiento_estatus ON alertamiento_vehicular (id_estatus_alertamiento);
CREATE INDEX idx_alertamiento_fecha_torre_estatus ON alertamiento_vehicular (fecha_hora_deteccion DESC, id_torre, id_estatus_alertamiento);
CREATE INDEX idx_alertamiento_placa ON alertamiento_vehicular (placa_detectada);
CREATE INDEX idx_alertamiento_placa_fecha ON alertamiento_vehicular (placa_detectada, fecha_hora_deteccion DESC);
CREATE INDEX idx_alertamiento_usuario_creador ON alertamiento_vehicular (id_usuario_creador) WHERE id_usuario_creador IS NOT NULL;

CREATE TABLE historial_alertamiento (
    id_historial_alertamiento BIGSERIAL PRIMARY KEY,
    id_alertamiento BIGINT NOT NULL REFERENCES alertamiento_vehicular (id_alertamiento) ON UPDATE RESTRICT ON DELETE CASCADE,
    id_estatus_alertamiento SMALLINT NOT NULL REFERENCES estatus_alertamiento (id_estatus_alertamiento) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_usuario BIGINT REFERENCES usuario (id_usuario) ON UPDATE RESTRICT ON DELETE SET NULL,
    observaciones VARCHAR(500),
    fecha_evento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_historial_alertamiento_alertamiento ON historial_alertamiento (id_alertamiento);
CREATE INDEX idx_historial_alertamiento_fecha ON historial_alertamiento (fecha_evento DESC);
COMMENT ON TABLE historial_alertamiento IS 'Bitacora cronologica de cambios de estatus de cada alertamiento.';

CREATE TABLE bitacora_auditoria (
    id_bitacora_auditoria BIGSERIAL PRIMARY KEY,
    id_usuario BIGINT REFERENCES usuario (id_usuario) ON UPDATE RESTRICT ON DELETE SET NULL,
    id_evento_auditoria SMALLINT REFERENCES catalogo_evento_auditoria (id_evento_auditoria) ON UPDATE RESTRICT ON DELETE RESTRICT,
    nombre_tabla VARCHAR(100) NOT NULL,
    id_registro TEXT NOT NULL,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    ip_origen INET,
    fecha_evento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_bitacora_nombre_tabla CHECK (btrim(nombre_tabla) <> ''),
    CONSTRAINT chk_bitacora_id_registro CHECK (btrim(id_registro) <> '')
);
CREATE INDEX idx_bitacora_tabla_fecha ON bitacora_auditoria (nombre_tabla, fecha_evento DESC);
CREATE INDEX idx_bitacora_usuario_fecha ON bitacora_auditoria (id_usuario, fecha_evento DESC);
COMMENT ON TABLE bitacora_auditoria IS 'Registro forense de inserciones, actualizaciones y eliminaciones sobre tablas criticas.';

INSERT INTO nivel_operativo (id_nivel_operativo, nombre_nivel, descripcion, jerarquia_orden) VALUES
    (1, 'TORRE', 'Visibilidad limitada a la torre asignada.', 1),
    (2, 'ESTATAL', 'Visibilidad sobre el estado asignado.', 2),
    (3, 'TERRITORIAL', 'Visibilidad sobre un conjunto de estados agrupados territorialmente.', 3),
    (4, 'NACIONAL', 'Visibilidad nacional completa.', 4)
ON CONFLICT (id_nivel_operativo) DO NOTHING;

INSERT INTO rol_sistema (id_rol, nombre_rol, descripcion) VALUES
    (1, 'ADMINISTRADOR', 'Gestiona catalogos, usuarios y estructura del sistema.'),
    (2, 'COORDINADOR', 'Consulta, supervisa y da seguimiento dentro de su ambito.'),
    (3, 'OPERADOR', 'Opera alertamientos y actualiza estatus dentro de su ambito.')
ON CONFLICT (id_rol) DO NOTHING;

INSERT INTO estatus_alertamiento (id_estatus_alertamiento, nombre_estatus, descripcion, orden_flujo) VALUES
    (1, 'DETECTADO', 'Alertamiento capturado por torre o por alta controlada.', 1),
    (2, 'VALIDADO', 'Alertamiento validado por personal autorizado.', 2),
    (3, 'EN_ATENCION', 'Alertamiento en seguimiento operativo.', 3),
    (4, 'CERRADO', 'Alertamiento concluido o cerrado.', 4)
ON CONFLICT (id_estatus_alertamiento) DO NOTHING;

INSERT INTO catalogo_evento_auditoria (id_evento_auditoria, nombre_evento, descripcion) VALUES
    (1, 'INSERT', 'Alta de registro'),
    (2, 'UPDATE', 'Modificacion de registro'),
    (3, 'DELETE', 'Baja de registro'),
    (4, 'LOGIN', 'Inicio de sesion')
ON CONFLICT (id_evento_auditoria) DO NOTHING;

SELECT setval(pg_get_serial_sequence('rol_sistema', 'id_rol'), COALESCE((SELECT MAX(id_rol) FROM rol_sistema), 1), TRUE);
SELECT setval(pg_get_serial_sequence('estatus_alertamiento', 'id_estatus_alertamiento'), COALESCE((SELECT MAX(id_estatus_alertamiento) FROM estatus_alertamiento), 1), TRUE);
SELECT setval(pg_get_serial_sequence('catalogo_evento_auditoria', 'id_evento_auditoria'), COALESCE((SELECT MAX(id_evento_auditoria) FROM catalogo_evento_auditoria), 1), TRUE);

CREATE OR REPLACE FUNCTION fn_set_fecha_actualizacion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.fecha_actualizacion := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_current_app_user_id()
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id TEXT;
BEGIN
    v_user_id := current_setting('app.current_user_id', TRUE);

    IF v_user_id IS NULL OR btrim(v_user_id) = '' THEN
        RETURN NULL;
    END IF;

    RETURN v_user_id::BIGINT;
EXCEPTION
    WHEN invalid_text_representation THEN
        RETURN NULL;
END;
$$;
COMMENT ON FUNCTION fn_get_current_app_user_id() IS 'Obtiene el id_usuario de la sesion cuando la aplicacion establece app.current_user_id.';

CREATE OR REPLACE FUNCTION fn_registrar_historial_alertamiento()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_id_usuario BIGINT;
BEGIN
    v_id_usuario := fn_get_current_app_user_id();

    IF TG_OP = 'INSERT' THEN
        INSERT INTO historial_alertamiento (
            id_alertamiento,
            id_estatus_alertamiento,
            id_usuario,
            observaciones
        )
        VALUES (
            NEW.id_alertamiento,
            NEW.id_estatus_alertamiento,
            COALESCE(v_id_usuario, NEW.id_usuario_creador),
            'Registro inicial del alertamiento.'
        );

        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.id_estatus_alertamiento IS DISTINCT FROM OLD.id_estatus_alertamiento THEN
        INSERT INTO historial_alertamiento (
            id_alertamiento,
            id_estatus_alertamiento,
            id_usuario,
            observaciones
        )
        VALUES (
            NEW.id_alertamiento,
            NEW.id_estatus_alertamiento,
            v_id_usuario,
            'Cambio de estatus del alertamiento.'
        );
    END IF;

    RETURN NEW;
END;
$$;
COMMENT ON FUNCTION fn_registrar_historial_alertamiento() IS 'Registra automaticamente el historial inicial y los cambios de estatus de cada alertamiento.';

CREATE OR REPLACE FUNCTION fn_registrar_bitacora_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_id_evento_auditoria SMALLINT;
    v_id_usuario BIGINT;
    v_pk_columna TEXT;
    v_datos_anteriores JSONB;
    v_datos_nuevos JSONB;
    v_id_registro TEXT;
BEGIN
    v_id_usuario := fn_get_current_app_user_id();
    v_pk_columna := TG_ARGV[0];

    SELECT id_evento_auditoria
      INTO v_id_evento_auditoria
      FROM catalogo_evento_auditoria
     WHERE nombre_evento = TG_OP
     ORDER BY id_evento_auditoria
     LIMIT 1;

    IF TG_OP = 'INSERT' THEN
        v_datos_nuevos := to_jsonb(NEW);
        v_id_registro := COALESCE(v_datos_nuevos ->> v_pk_columna, 'SIN_ID');

        INSERT INTO bitacora_auditoria (
            id_usuario,
            id_evento_auditoria,
            nombre_tabla,
            id_registro,
            datos_anteriores,
            datos_nuevos
        )
        VALUES (
            v_id_usuario,
            v_id_evento_auditoria,
            TG_TABLE_NAME,
            v_id_registro,
            NULL,
            v_datos_nuevos
        );

        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        v_datos_anteriores := to_jsonb(OLD);
        v_datos_nuevos := to_jsonb(NEW);

        IF (v_datos_anteriores - 'fecha_actualizacion') IS NOT DISTINCT FROM (v_datos_nuevos - 'fecha_actualizacion') THEN
            RETURN NEW;
        END IF;

        v_id_registro := COALESCE(v_datos_nuevos ->> v_pk_columna, v_datos_anteriores ->> v_pk_columna, 'SIN_ID');

        INSERT INTO bitacora_auditoria (
            id_usuario,
            id_evento_auditoria,
            nombre_tabla,
            id_registro,
            datos_anteriores,
            datos_nuevos
        )
        VALUES (
            v_id_usuario,
            v_id_evento_auditoria,
            TG_TABLE_NAME,
            v_id_registro,
            v_datos_anteriores,
            v_datos_nuevos
        );

        RETURN NEW;
    END IF;

    v_datos_anteriores := to_jsonb(OLD);
    v_id_registro := COALESCE(v_datos_anteriores ->> v_pk_columna, 'SIN_ID');

    INSERT INTO bitacora_auditoria (
        id_usuario,
        id_evento_auditoria,
        nombre_tabla,
        id_registro,
        datos_anteriores,
        datos_nuevos
    )
    VALUES (
        v_id_usuario,
        v_id_evento_auditoria,
        TG_TABLE_NAME,
        v_id_registro,
        v_datos_anteriores,
        NULL
    );

    RETURN OLD;
END;
$$;
COMMENT ON FUNCTION fn_registrar_bitacora_auditoria() IS 'Registra inserciones, actualizaciones y eliminaciones en bitacora_auditoria para tablas criticas.';

CREATE TRIGGER trg_estado_fecha_actualizacion BEFORE UPDATE ON estado FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_actualizacion();
CREATE TRIGGER trg_territorio_operativo_fecha_actualizacion BEFORE UPDATE ON territorio_operativo FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_actualizacion();
CREATE TRIGGER trg_territorio_estado_fecha_actualizacion BEFORE UPDATE ON territorio_estado FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_actualizacion();
CREATE TRIGGER trg_region_operativa_fecha_actualizacion BEFORE UPDATE ON region_operativa FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_actualizacion();
CREATE TRIGGER trg_central_operativa_fecha_actualizacion BEFORE UPDATE ON central_operativa FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_actualizacion();
CREATE TRIGGER trg_torre_tidv_fecha_actualizacion BEFORE UPDATE ON torre_tidv FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_actualizacion();
CREATE TRIGGER trg_usuario_fecha_actualizacion BEFORE UPDATE ON usuario FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_actualizacion();
CREATE TRIGGER trg_usuario_ambito_fecha_actualizacion BEFORE UPDATE ON usuario_ambito FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_actualizacion();
CREATE TRIGGER trg_alertamiento_vehicular_fecha_actualizacion BEFORE UPDATE ON alertamiento_vehicular FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_actualizacion();
CREATE TRIGGER trg_alertamiento_historial_insert AFTER INSERT ON alertamiento_vehicular FOR EACH ROW EXECUTE FUNCTION fn_registrar_historial_alertamiento();
CREATE TRIGGER trg_alertamiento_historial_update AFTER UPDATE OF id_estatus_alertamiento ON alertamiento_vehicular FOR EACH ROW EXECUTE FUNCTION fn_registrar_historial_alertamiento();
CREATE TRIGGER trg_central_operativa_bitacora AFTER INSERT OR UPDATE OR DELETE ON central_operativa FOR EACH ROW EXECUTE FUNCTION fn_registrar_bitacora_auditoria('id_central');
CREATE TRIGGER trg_torre_tidv_bitacora AFTER INSERT OR UPDATE OR DELETE ON torre_tidv FOR EACH ROW EXECUTE FUNCTION fn_registrar_bitacora_auditoria('id_torre');
CREATE TRIGGER trg_usuario_bitacora AFTER INSERT OR UPDATE OR DELETE ON usuario FOR EACH ROW EXECUTE FUNCTION fn_registrar_bitacora_auditoria('id_usuario');
CREATE TRIGGER trg_usuario_ambito_bitacora AFTER INSERT OR UPDATE OR DELETE ON usuario_ambito FOR EACH ROW EXECUTE FUNCTION fn_registrar_bitacora_auditoria('id_usuario_ambito');
CREATE TRIGGER trg_alertamiento_bitacora AFTER INSERT OR UPDATE OR DELETE ON alertamiento_vehicular FOR EACH ROW EXECUTE FUNCTION fn_registrar_bitacora_auditoria('id_alertamiento');

CREATE OR REPLACE VIEW vw_usuario_visibilidad_institucional AS
SELECT u.id_usuario, u.nombre_usuario, r.nombre_rol, nv.nombre_nivel AS nivel_visibilidad, ua.id_torre, ua.id_estado, ua.id_territorio, ua.ambito_nacional, ua.activo
FROM usuario u
JOIN rol_sistema r ON r.id_rol = u.id_rol
JOIN usuario_ambito ua ON ua.id_usuario = u.id_usuario AND ua.activo = TRUE
JOIN nivel_operativo nv ON nv.id_nivel_operativo = ua.id_nivel_operativo;

CREATE OR REPLACE VIEW vw_central_contexto AS
SELECT c.id_central, c.nombre_central, c.activo AS central_activa, r.id_region, r.nombre_region, r.activo AS region_activa, e.id_estado AS id_estado_sede, e.nombre_estado AS nombre_estado_sede, e.activo AS estado_sede_activo
FROM central_operativa c
JOIN region_operativa r ON r.id_region = c.id_region
JOIN estado e ON e.id_estado = c.id_estado_sede;
COMMENT ON VIEW vw_central_contexto IS 'Vista de centrales operativas con region y estado sede, incluso cuando no existen torres asociadas.';

CREATE OR REPLACE VIEW vw_alertamiento_contexto AS
SELECT a.id_alertamiento, a.folio_alertamiento, a.placa_detectada, a.fecha_hora_deteccion, a.id_estatus_alertamiento, t.id_torre, t.nombre_torre, t.activo AS torre_activa, c.id_central, c.nombre_central, c.id_estado_sede, esede.nombre_estado AS nombre_estado_sede, c.activo AS central_activa, r.id_region, r.nombre_region, r.activo AS region_activa, e.id_estado, e.nombre_estado, e.activo AS estado_activo, toper.id_territorio, toper.nombre_territorio, toper.activo AS territorio_activo
FROM alertamiento_vehicular a
JOIN torre_tidv t ON t.id_torre = a.id_torre
JOIN central_operativa c ON c.id_central = t.id_central
JOIN region_operativa r ON r.id_region = c.id_region
JOIN estado e ON e.id_estado = t.id_estado
JOIN estado esede ON esede.id_estado = c.id_estado_sede
LEFT JOIN territorio_estado te ON te.id_estado = e.id_estado AND te.activo = TRUE
LEFT JOIN territorio_operativo toper ON toper.id_territorio = te.id_territorio;
COMMENT ON VIEW vw_alertamiento_contexto IS 'Vista historica de alertamientos con contexto operativo y banderas de vigencia institucional.';
