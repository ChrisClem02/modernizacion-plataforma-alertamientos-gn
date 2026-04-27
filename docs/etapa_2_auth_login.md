# Etapa 2 - Login y Ultimo Acceso

## Alcance

El endpoint `POST /api/auth/login` mantiene el mismo contrato de autenticacion:

- valida `nombre_usuario` y `contrasena`
- construye el mismo JWT con `id_usuario` e `id_rol`
- devuelve el mismo contexto de usuario usado por el frontend
- no modifica el contrato de `GET /api/auth/me`

## Ultimo acceso

Cuando la contrasena es correcta y el usuario esta activo, el backend actualiza
`usuario.fecha_ultimo_acceso = CURRENT_TIMESTAMP` dentro de una transaccion.

La transaccion usa `app.current_user_id` con el propio `id_usuario` autenticado,
por lo que los triggers de PostgreSQL registran la auditoria tecnica normal del
`UPDATE` sobre la tabla `usuario`.

## Auditoria

Este ajuste no agrega un evento operativo independiente de tipo `LOGIN` desde el
backend. La trazabilidad generada es la auditoria tecnica ya definida en la base
congelada para actualizaciones de `usuario`.
