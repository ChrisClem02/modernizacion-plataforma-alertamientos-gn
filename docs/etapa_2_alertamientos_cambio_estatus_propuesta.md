# Etapa 2 - Propuesta de Cambio de Estatus de Alertamientos

## Objetivo
Implementar el endpoint `PATCH /api/alertamientos/:id/estatus` para completar
el flujo operativo de alertamientos sin modificar el esquema congelado de
PostgreSQL y aprovechando la trazabilidad automatica ya existente en la base de
datos.

## Estado actual verificado en el repositorio
- El backend ya expone el modulo `alertamientos` en:
  - `backend/src/modules/alertamientos/alertamientos.routes.js`
  - `backend/src/modules/alertamientos/alertamientos.controller.js`
  - `backend/src/modules/alertamientos/alertamientos.service.js`
- La autenticacion JWT ya inyecta `req.user` con:
  - identidad
  - rol
  - nivel operativo
  - ambito institucional
- La visibilidad institucional ya esta centralizada en el servicio de
  alertamientos mediante `applyVisibilityClauses(...)`.
- El alta manual ya propaga `app.current_user_id` hacia PostgreSQL dentro de
  transaccion.
- La base congelada ya cuenta con triggers para:
  - historial automatico al insertar alertamientos
  - historial automatico al actualizar `id_estatus_alertamiento`
  - bitacora de auditoria
  - `fecha_actualizacion`

## Decision tecnica principal
El backend **no debe insertar historial ni auditoria desde Node.js**.

La implementacion correcta debe limitarse a:
1. validar identidad, visibilidad, rol y transicion
2. abrir transaccion
3. establecer `SET LOCAL app.current_user_id`
4. ejecutar `UPDATE alertamiento_vehicular`
5. dejar que PostgreSQL genere historial y bitacora por triggers

## Contrato propuesto del endpoint

### Ruta
`PATCH /api/alertamientos/:id/estatus`

### Body minimo
```json
{
  "id_estatus_alertamiento": 2
}
```

### Respuesta exitosa
```json
{
  "message": "Estatus de alertamiento actualizado correctamente.",
  "data": {
    "...": "detalle actualizado del alertamiento"
  }
}
```

La respuesta debe reutilizar el mismo formato del detalle ya entregado por
`getVisibleAlertamientoDetailById(...)`.

## Reglas de negocio propuestas

### 1. Visibilidad institucional
El usuario solo puede cambiar el estatus de un alertamiento que ya sea visible
para su ambito institucional.

La validacion debe reutilizar la misma logica del detalle y del listado para no
duplicar reglas territoriales en otra parte del backend.

### 2. Roles
Propuesta operativa inicial, alineada con el catalogo actual de roles:

- `ADMINISTRADOR`: puede avanzar cualquier alertamiento visible hasta
  `CERRADO`
- `COORDINADOR`: puede avanzar cualquier alertamiento visible hasta
  `CERRADO`
- `OPERADOR`: puede avanzar solo tramos operativos intermedios

### 3. Transiciones permitidas
Con base en el catalogo actual verificado:

- `DETECTADO`
- `VALIDADO`
- `EN_ATENCION`
- `CERRADO`

La regla recomendada es permitir solo avance secuencial por `orden_flujo`:

- `DETECTADO -> VALIDADO`
- `VALIDADO -> EN_ATENCION`
- `EN_ATENCION -> CERRADO`

No permitir:
- mismo estatus
- retrocesos
- saltos de flujo
- cambios desde `CERRADO`

### 4. Matriz sugerida de autorizacion
- `ADMINISTRADOR`:
  - `DETECTADO -> VALIDADO`
  - `VALIDADO -> EN_ATENCION`
  - `EN_ATENCION -> CERRADO`
- `COORDINADOR`:
  - `DETECTADO -> VALIDADO`
  - `VALIDADO -> EN_ATENCION`
  - `EN_ATENCION -> CERRADO`
- `OPERADOR`:
  - `DETECTADO -> VALIDADO`
  - `VALIDADO -> EN_ATENCION`

Esta matriz es conservadora y operativamente coherente. Si despues se requiere
que `OPERADOR` tambien pueda cerrar, eso se puede habilitar en una regla puntual
sin redisenar la arquitectura.

## Cambios propuestos por archivo

### 1. `backend/src/config/db.js`
Refactor recomendado:

- fortalecer `withTransaction(...)` para que sea el helper oficial de
  transacciones del proyecto
- introducir un helper pequeno para establecer el contexto del usuario con
  `SET LOCAL app.current_user_id`

Notas:
- hoy el proyecto usa `SELECT set_config(..., true)`, que es equivalente en
  alcance transaccional
- como el requerimiento pide explicitamente `SET LOCAL`, conviene dejarlo
  expresado asi en este helper comun
- para evitar riesgos, el valor debe validarse primero como entero positivo

Resultado esperado:
- `createManualAlertamiento(...)` y el nuevo cambio de estatus compartiran la
  misma forma de abrir transaccion y propagar contexto de usuario

### 2. `backend/src/modules/alertamientos/alertamientos.routes.js`
Agregar:

```js
router.patch('/:id/estatus', asyncHandler(alertamientosController.updateAlertamientoStatus));
```

Debe declararse despues de `router.use(requireAuthenticatedUser)` y antes o
despues del resto de rutas parametrizadas sin conflicto.

### 3. `backend/src/modules/alertamientos/alertamientos.controller.js`
Agregar un controlador pequeno:

```js
async function updateAlertamientoStatus(req, res) {
    const response = await alertamientosService.updateAlertamientoStatus(
        req.params.id,
        req.body,
        req.user
    );

    return res.status(200).json(response);
}
```

El controlador no debe contener logica de negocio.

### 4. `backend/src/modules/alertamientos/alertamientos.service.js`
Aqui cae la mayor parte del cambio.

#### Nuevos helpers recomendados
- `normalizeAlertamientoStatusPayload(payload)`
- `getAlertamientoVisibleForStatusUpdate(client, alertamientoId, userContext)`
- `getStatusById(client, statusId)`
- `assertAlertamientoStatusTransition(currentStatus, nextStatus)`
- `assertAlertamientoStatusRole(userContext, currentStatus, nextStatus)`

#### Consultas SQL nuevas recomendadas

Consulta de alertamiento visible para actualizar, con bloqueo:

```sql
SELECT
    a.id_alertamiento,
    a.id_estatus_alertamiento,
    ea.nombre_estatus,
    ea.orden_flujo
FROM vw_alertamiento_contexto v
JOIN alertamiento_vehicular a
  ON a.id_alertamiento = v.id_alertamiento
JOIN estatus_alertamiento ea
  ON ea.id_estatus_alertamiento = a.id_estatus_alertamiento
WHERE ...
FOR UPDATE OF a
```

Consulta de estatus destino:

```sql
SELECT
    id_estatus_alertamiento,
    nombre_estatus,
    orden_flujo
FROM estatus_alertamiento
WHERE id_estatus_alertamiento = $1
LIMIT 1
```

Update minimo:

```sql
UPDATE alertamiento_vehicular
SET id_estatus_alertamiento = $2
WHERE id_alertamiento = $1
RETURNING id_alertamiento
```

#### Flujo del servicio propuesto
1. Validar `id` de ruta.
2. Validar `id_estatus_alertamiento` en body.
3. Validar `id_usuario` autenticado.
4. Abrir transaccion con contexto de usuario.
5. Obtener el alertamiento visible y bloquearlo con `FOR UPDATE`.
6. Obtener el estatus destino desde catalogo.
7. Validar:
   - que exista el alertamiento visible
   - que exista el estatus destino
   - que no sea el mismo estatus
   - que la transicion sea secuencial
   - que el rol pueda ejecutar ese tramo
8. Ejecutar el `UPDATE`.
9. Confirmar transaccion.
10. Reutilizar `getVisibleAlertamientoDetailById(...)` para responder con el
    detalle actualizado.

#### Reutilizacion importante
Conviene extraer `createManualAlertamiento(...)` para que use
`withTransaction(...)` en lugar de manejar `BEGIN/COMMIT/ROLLBACK` por su
cuenta. Asi el modulo de alertamientos no queda con dos patrones distintos para
la misma responsabilidad.

### 5. `backend/package.json`
El script `check` hoy no valida los archivos de `alertamientos`.

Propuesta:
- ampliar `npm run check` para incluir:
  - `src/modules/alertamientos/alertamientos.service.js`
  - `src/modules/alertamientos/alertamientos.controller.js`
  - `src/modules/alertamientos/alertamientos.routes.js`

Esto conviene hacerlo en la misma subetapa para no dejar la verificacion ciega
justo sobre el modulo que estamos extendiendo.

## Mapeo propuesto de errores HTTP
- `400`:
  - body invalido
  - estatus destino inexistente
- `403`:
  - usuario sin ambito institucional valido
  - rol sin permiso para esa transicion
- `404`:
  - alertamiento inexistente o no visible para el usuario autenticado
- `409`:
  - mismo estatus
  - salto de flujo
  - retroceso
  - intento de mover un alertamiento ya cerrado

## Propuesta concreta de mensajes
- `400`: `id_estatus_alertamiento es obligatorio.`
- `400`: `El estatus destino indicado no existe en el catalogo institucional.`
- `403`: `El rol autenticado no tiene permiso para cambiar el alertamiento al estatus indicado.`
- `404`: `El alertamiento solicitado no existe o no es visible para el usuario autenticado.`
- `409`: `El alertamiento ya se encuentra en el estatus solicitado.`
- `409`: `El cambio de estatus debe respetar la secuencia operativa del flujo.`
- `409`: `No es posible cambiar el estatus de un alertamiento cerrado.`

## Impacto esperado en PostgreSQL
Con solo actualizar `alertamiento_vehicular.id_estatus_alertamiento`, los
triggers existentes deben seguir resolviendo automaticamente:

- insercion en `historial_alertamiento`
- insercion en `bitacora_auditoria`
- actualizacion de `fecha_actualizacion`

Esto mantiene la base como fuente real de trazabilidad y evita desalineacion
entre backend y SQL congelado.

## Validacion recomendada despues de implementar
- cambio exitoso `DETECTADO -> VALIDADO`
- cambio exitoso `VALIDADO -> EN_ATENCION`
- rechazo por mismo estatus
- rechazo por salto `DETECTADO -> EN_ATENCION`
- rechazo por retroceso
- rechazo por rol insuficiente
- rechazo por falta de visibilidad institucional
- verificacion de fila nueva en `historial_alertamiento`
- verificacion de fila nueva en `bitacora_auditoria`
- verificacion de `id_usuario` correcto tomado desde `app.current_user_id`

## Siguiente paso mas conveniente
Lo mas conveniente es dividir la siguiente subetapa en este orden:

1. implementar primero el backend del PATCH
2. validar manualmente con Postman o curl que historial y auditoria se generen
   solos
3. agregar despues la accion de cambio de estatus en
   `frontend/src/pages/AlertamientoDetailPage.jsx`
4. solo al final decidir si tambien conviene mostrar esa accion en el listado

La razon es simple: el frontend depende por completo de que el flujo de negocio
del backend quede bien definido primero. Si arrancamos por UI antes de fijar la
matriz de roles y transiciones, corremos el riesgo de rehacer pantalla y
mensajes dos veces.

## Recomendacion final
La propuesta es correcta y encaja bien con la arquitectura actual del proyecto.

Lo unico que recomiendo ajustar antes de implementar es unificar la gestion de
transacciones en `backend/src/config/db.js` para que:

- el alta manual
- el cambio de estatus

usen exactamente el mismo mecanismo de `withTransaction(...)` y propagacion de
`app.current_user_id`.
