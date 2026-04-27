# Etapa 2 - Backend de Usuarios

## Objetivo

Cerrar el backend operativo del modulo de usuarios sin modificar la base congelada y reutilizando las reglas ya existentes de autenticacion, roles, auditoria y visibilidad institucional.

## Endpoints implementados

### Modulo `usuarios`

- `GET /api/usuarios`
  - listado paginado
  - filtros: `search`, `activo`, `id_rol`, `id_nivel_operativo`, `page`, `limit`
- `GET /api/usuarios/:id`
  - detalle de usuario
- `POST /api/usuarios`
  - alta de usuario con rol y ambito inicial
- `PUT /api/usuarios/:id`
  - actualizacion de datos editables
  - permite cambiar `id_rol`
  - permite reemplazar el ambito activo actual
- `PATCH /api/usuarios/:id/activar`
  - activa al usuario
- `PATCH /api/usuarios/:id/desactivar`
  - desactiva al usuario
- `GET /api/usuarios/catalogos/roles`
  - catalogo de roles
- `GET /api/usuarios/catalogos/niveles-operativos`
  - catalogo de niveles operativos

### Modulo `jerarquia`

- `GET /api/jerarquia/estados`
- `GET /api/jerarquia/territorios`
- `GET /api/jerarquia/torres`

## Reglas de acceso

- Todas las rutas de `usuarios` y `jerarquia` requieren token valido.
- Todas las rutas exigen rol `ADMINISTRADOR`.
- No se usa ORM.
- Todas las escrituras usan `withTransaction(..., { userId })`.
- El historial de `usuario_ambito` se conserva desactivando el ambito vigente e insertando uno nuevo cuando cambia.

## Contratos relevantes

### `POST /api/usuarios`

```json
{
  "nombres": "JUAN",
  "apellido_paterno": "PEREZ",
  "apellido_materno": "LOPEZ",
  "nombre_usuario": "jperez",
  "correo_electronico": "jperez@gn.mx",
  "contrasena": "Admin12345!",
  "id_rol": 2,
  "ambito": {
    "id_nivel_operativo": 2,
    "id_estado": 14
  }
}
```

### `PUT /api/usuarios/:id`

Acepta cambios parciales de:

- `nombres`
- `apellido_paterno`
- `apellido_materno`
- `nombre_usuario`
- `correo_electronico`
- `id_rol`
- `ambito`

`contrasena` no forma parte de este alcance.

### `ambito`

Se valida con las mismas reglas de la base:

- `TORRE` => `id_nivel_operativo = 1` e `id_torre`
- `ESTATAL` => `id_nivel_operativo = 2` e `id_estado`
- `TERRITORIAL` => `id_nivel_operativo = 3` e `id_territorio`
- `NACIONAL` => `id_nivel_operativo = 4` y `ambito_nacional = true`

## Validaciones de negocio

- rechazo de `nombre_usuario` duplicado
- rechazo de `correo_electronico` duplicado sin distinguir mayusculas
- rechazo de referencias institucionales inexistentes o inactivas
- rechazo de auto-desactivacion
- rechazo de activar usuarios sin ambito activo
- rechazo de dejar al sistema sin administradores activos
- rechazo de cambio de rol del ultimo administrador activo a un rol distinto

## Forma de respuesta

- `GET /api/usuarios` responde con `{ filters, pagination, data }`
- `GET /api/usuarios/:id` responde con `{ data }`
- escrituras responden con `{ message, data }`
- catalogos y jerarquia responden con `{ filters, data }`

## Validacion sugerida

1. Iniciar sesion con un usuario `ADMINISTRADOR`.
2. Consultar catalogos de roles, niveles y jerarquia.
3. Crear un usuario con ambito valido.
4. Editar el usuario y cambiar su ambito.
5. Desactivarlo y activarlo de nuevo.
6. Intentar crear duplicados por usuario y correo.
7. Intentar auto-desactivacion.
8. Intentar dejar sin administradores activos al sistema.
