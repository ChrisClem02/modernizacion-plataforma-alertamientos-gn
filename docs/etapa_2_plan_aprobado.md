# Etapa 2 - Plan Aprobado

## Estado de partida

- La Etapa 1 queda congelada formalmente con el tag Git `etapa-1-db-v2_1`.
- La base de datos PostgreSQL V2_1 es la fuente de verdad y no debe redisenarse sin instruccion expresa.
- La capa de aplicacion debe adaptarse a la base existente, no al reves.

## Objetivo de la Etapa 2

Construir una primera capa de aplicacion con:

- Backend: Node.js + Express
- Frontend: React
- Entorno: Docker y repositorio actual

El objetivo no es completar todo el sistema en una sola iteracion, sino habilitar pruebas funcionales controladas contra la base ya congelada.

## Principios aprobados

1. No modificar el SQL congelado salvo necesidad extrema y justificada.
2. No introducir ORM en esta fase.
3. Priorizar SQL parametrizado y servicios pequenos.
4. Respetar la separacion entre jerarquia operativa, visibilidad institucional y rol funcional.
5. Aprovechar la auditoria y trazabilidad ya implementadas en PostgreSQL.

## Orden aprobado de implementacion

1. Estructura inicial del backend Node.js/Express.
2. Conexion a PostgreSQL con variables de entorno.
3. Healthcheck y base de middlewares.
4. Modulos vacios y rutas iniciales.
5. Autenticacion basica y contexto de usuario.
6. Catalogos, usuarios y jerarquia.
7. Alertamientos, cambios de estatus y consulta por visibilidad.
8. Auditoria y reportes.
9. Inicio del frontend React.

## Alcance aprobado de la primera entrega de backend

- Crear el directorio `backend/`
- Agregar `package.json`, `app.js` y `server.js`
- Configurar conexion a PostgreSQL sin ORM
- Crear modulos vacios:
  - `auth`
  - `usuarios`
  - `jerarquia`
  - `alertamientos`
  - `auditoria`
  - `reportes`
- Agregar middlewares base:
  - autenticacion
  - control de roles
  - manejo de errores
- Exponer endpoint `GET /health`
- Adaptar Docker lo minimo necesario

## Decision tecnica importante

El backend debe prepararse desde el inicio para enviar a PostgreSQL el contexto de usuario de aplicacion mediante:

```sql
SET LOCAL app.current_user_id = '...';
```

Esto es importante porque la base ya tiene triggers de historial y auditoria que dependen de ese contexto para registrar correctamente al usuario responsable.

## No incluido todavia

- Logica de negocio completa
- JWT definitivo
- Recuperacion de contrasena
- Frontend React
- Pruebas E2E
- Autorizacion fina por permisos

## Criterio de aprobacion de esta iteracion

La iteracion se considera correcta si deja un backend arrancable, con estructura clara, conexion a base preparada, modulos separados y cambios pequenos, revisables y alineados con la BD congelada.
