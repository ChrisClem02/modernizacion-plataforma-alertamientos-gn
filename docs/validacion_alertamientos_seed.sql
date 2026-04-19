-- ============================================================================
-- DATOS CONTROLADOS DE VALIDACION PARA EL MODULO DE ALERTAMIENTOS
-- ============================================================================
-- Este script NO modifica el esquema congelado de la base de datos.
-- Solo inserta datos minimos de prueba para validar:
--   1. lectura de alertamientos con visibilidad institucional,
--   2. detalle de alertamiento,
--   3. historial cronologico,
--   4. comportamiento con usuarios NACIONAL, TERRITORIAL, ESTATAL y TORRE.
--
-- Se diseno para ser idempotente en lo razonable:
--   - reutiliza registros si ya existen por claves naturales,
--   - usa folios UUID fijos para no duplicar alertamientos,
--   - conserva el password de prueba "Admin12345!" para todos los usuarios test.
-- ============================================================================

BEGIN;

-- Se propaga el usuario de aplicacion hacia PostgreSQL para que historial y
-- bitacora automatica registren trazabilidad con el usuario admin_test.
SET LOCAL app.current_user_id = '2';

-- --------------------------------------------------------------------------
-- 1. CATALOGOS Y ESTRUCTURA OPERATIVA MINIMA
-- --------------------------------------------------------------------------

INSERT INTO estado (nombre_estado, abreviatura)
VALUES
    ('JALISCO', 'JAL'),
    ('GUANAJUATO', 'GTO')
ON CONFLICT (nombre_estado) DO NOTHING;

INSERT INTO territorio_operativo (nombre_territorio, descripcion)
VALUES (
    'TERRITORIO OCCIDENTE PRUEBA',
    'Territorio controlado para validar visibilidad territorial del prototipo.'
)
ON CONFLICT (nombre_territorio) DO NOTHING;

INSERT INTO region_operativa (nombre_region, descripcion)
VALUES (
    'REGION OCCIDENTE PRUEBA',
    'Region controlada para validar consultas de alertamientos en backend.'
)
ON CONFLICT (nombre_region) DO NOTHING;

INSERT INTO territorio_estado (id_territorio, id_estado)
SELECT t.id_territorio, e.id_estado
FROM territorio_operativo t
JOIN estado e
  ON e.nombre_estado IN ('JALISCO', 'GUANAJUATO')
WHERE t.nombre_territorio = 'TERRITORIO OCCIDENTE PRUEBA'
ON CONFLICT (id_territorio, id_estado) DO NOTHING;

INSERT INTO central_operativa (
    id_region,
    id_estado_sede,
    nombre_central,
    descripcion
)
SELECT
    r.id_region,
    e.id_estado,
    'CENTRAL GUADALAJARA PRUEBA',
    'Central controlada para validar visibilidad y detalle de alertamientos.'
FROM region_operativa r
JOIN estado e
  ON e.nombre_estado = 'JALISCO'
WHERE r.nombre_region = 'REGION OCCIDENTE PRUEBA'
ON CONFLICT (id_region, nombre_central) DO NOTHING;

INSERT INTO torre_tidv (
    id_central,
    id_estado,
    nombre_torre,
    codigo_torre,
    latitud,
    longitud
)
SELECT
    c.id_central,
    e.id_estado,
    x.nombre_torre,
    x.codigo_torre,
    x.latitud,
    x.longitud
FROM central_operativa c
JOIN (
    VALUES
        ('TORRE GUADALAJARA PRUEBA', 'TIDV-GDL-PRUEBA', 20.659699::NUMERIC, -103.349609::NUMERIC, 'JALISCO'),
        ('TORRE LEON PRUEBA', 'TIDV-LEON-PRUEBA', 21.122021::NUMERIC, -101.682495::NUMERIC, 'GUANAJUATO')
) AS x(nombre_torre, codigo_torre, latitud, longitud, nombre_estado)
  ON TRUE
JOIN estado e
  ON e.nombre_estado = x.nombre_estado
WHERE c.nombre_central = 'CENTRAL GUADALAJARA PRUEBA'
ON CONFLICT (codigo_torre) DO NOTHING;

-- --------------------------------------------------------------------------
-- 2. USUARIOS DE VALIDACION POR AMBITO
-- --------------------------------------------------------------------------
-- Todos usan la contrasena de prueba: Admin12345!
-- Hash bcrypt reutilizable para evitar generar contrasenas desde SQL.

INSERT INTO usuario (
    id_rol,
    nombres,
    apellido_paterno,
    apellido_materno,
    nombre_usuario,
    correo_electronico,
    hash_contrasena,
    activo
)
VALUES
    (
        3,
        'OPERADOR',
        'TORRE',
        'PRUEBA',
        'operador_torre_test',
        'operador_torre_test@gn.mx',
        '$2b$10$xJZwhFXkG1vAIRVr8f81sOm8ZpZUH9lPX9MG0GGLuuVHUOfRrL/BO',
        TRUE
    ),
    (
        2,
        'COORDINADOR',
        'ESTATAL',
        'PRUEBA',
        'coord_estatal_test',
        'coord_estatal_test@gn.mx',
        '$2b$10$xJZwhFXkG1vAIRVr8f81sOm8ZpZUH9lPX9MG0GGLuuVHUOfRrL/BO',
        TRUE
    ),
    (
        2,
        'COORDINADOR',
        'TERRITORIAL',
        'PRUEBA',
        'coord_territorial_test',
        'coord_territorial_test@gn.mx',
        '$2b$10$xJZwhFXkG1vAIRVr8f81sOm8ZpZUH9lPX9MG0GGLuuVHUOfRrL/BO',
        TRUE
    )
ON CONFLICT (nombre_usuario) DO NOTHING;

INSERT INTO usuario_ambito (
    id_usuario,
    id_nivel_operativo,
    id_torre,
    id_estado,
    id_territorio,
    ambito_nacional,
    activo
)
SELECT
    u.id_usuario,
    1,
    t.id_torre,
    NULL,
    NULL,
    FALSE,
    TRUE
FROM usuario u
JOIN torre_tidv t
  ON t.codigo_torre = 'TIDV-GDL-PRUEBA'
WHERE u.nombre_usuario = 'operador_torre_test'
  AND NOT EXISTS (
      SELECT 1
      FROM usuario_ambito ua
      WHERE ua.id_usuario = u.id_usuario
        AND ua.activo = TRUE
  );

INSERT INTO usuario_ambito (
    id_usuario,
    id_nivel_operativo,
    id_torre,
    id_estado,
    id_territorio,
    ambito_nacional,
    activo
)
SELECT
    u.id_usuario,
    2,
    NULL,
    e.id_estado,
    NULL,
    FALSE,
    TRUE
FROM usuario u
JOIN estado e
  ON e.nombre_estado = 'JALISCO'
WHERE u.nombre_usuario = 'coord_estatal_test'
  AND NOT EXISTS (
      SELECT 1
      FROM usuario_ambito ua
      WHERE ua.id_usuario = u.id_usuario
        AND ua.activo = TRUE
  );

INSERT INTO usuario_ambito (
    id_usuario,
    id_nivel_operativo,
    id_torre,
    id_estado,
    id_territorio,
    ambito_nacional,
    activo
)
SELECT
    u.id_usuario,
    3,
    NULL,
    NULL,
    t.id_territorio,
    FALSE,
    TRUE
FROM usuario u
JOIN territorio_operativo t
  ON t.nombre_territorio = 'TERRITORIO OCCIDENTE PRUEBA'
WHERE u.nombre_usuario = 'coord_territorial_test'
  AND NOT EXISTS (
      SELECT 1
      FROM usuario_ambito ua
      WHERE ua.id_usuario = u.id_usuario
        AND ua.activo = TRUE
  );

-- --------------------------------------------------------------------------
-- 3. ALERTAMIENTOS DE PRUEBA
-- --------------------------------------------------------------------------
-- Se insertan dos alertamientos:
--   - uno en JALISCO,
--   - uno en GUANAJUATO.
-- Asi podemos comprobar que TORRE y ESTATAL vean menos que NACIONAL y
-- TERRITORIAL, manteniendo una trazabilidad facil de verificar.

INSERT INTO alertamiento_vehicular (
    folio_alertamiento,
    id_torre,
    id_estatus_alertamiento,
    id_usuario_creador,
    placa_detectada,
    fecha_hora_deteccion,
    latitud_deteccion,
    longitud_deteccion,
    carril,
    sentido_vial,
    origen_registro,
    observaciones
)
SELECT
    '11111111-1111-1111-1111-111111111111'::UUID,
    t.id_torre,
    1,
    u.id_usuario,
    'ABC123',
    TIMESTAMP '2026-04-18 08:15:00',
    20.659699,
    -103.349609,
    'CARRIL 1',
    'NORTE-SUR',
    'MANUAL',
    'Alertamiento de prueba en Jalisco.'
FROM torre_tidv t
JOIN usuario u
  ON u.nombre_usuario = 'admin_test'
WHERE t.codigo_torre = 'TIDV-GDL-PRUEBA'
ON CONFLICT (folio_alertamiento) DO NOTHING;

INSERT INTO alertamiento_vehicular (
    folio_alertamiento,
    id_torre,
    id_estatus_alertamiento,
    id_usuario_creador,
    placa_detectada,
    fecha_hora_deteccion,
    latitud_deteccion,
    longitud_deteccion,
    carril,
    sentido_vial,
    origen_registro,
    observaciones
)
SELECT
    '22222222-2222-2222-2222-222222222222'::UUID,
    t.id_torre,
    1,
    u.id_usuario,
    'XYZ789',
    TIMESTAMP '2026-04-18 09:20:00',
    21.122021,
    -101.682495,
    'CARRIL 2',
    'SUR-NORTE',
    'MANUAL',
    'Alertamiento de prueba en Guanajuato.'
FROM torre_tidv t
JOIN usuario u
  ON u.nombre_usuario = 'admin_test'
WHERE t.codigo_torre = 'TIDV-LEON-PRUEBA'
ON CONFLICT (folio_alertamiento) DO NOTHING;

-- Se actualiza el segundo alertamiento a VALIDADO para producir dos eventos en
-- historial: el registro inicial y el cambio de estatus posterior.
UPDATE alertamiento_vehicular
SET id_estatus_alertamiento = 2
WHERE folio_alertamiento = '22222222-2222-2222-2222-222222222222'::UUID
  AND id_estatus_alertamiento <> 2;

COMMIT;
