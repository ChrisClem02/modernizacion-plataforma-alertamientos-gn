# Base de Datos del Prototipo

## Objetivo

Esta base de datos implementa el modelo fisico del prototipo para la Modernizacion de la Plataforma Nacional de Alertamiento de la Guardia Nacional sobre PostgreSQL.

El diseno conserva tres dimensiones separadas:

1. Jerarquia operativa: `region_operativa -> central_operativa -> torre_tidv`
2. Visibilidad institucional: `TORRE / ESTATAL / TERRITORIAL / NACIONAL`
3. Rol funcional: `ADMINISTRADOR / COORDINADOR / OPERADOR`

## Criterios de diseno

- Se privilegio claridad conceptual y trazabilidad antes que complejidad arquitectonica.
- Se mantuvo un modelo relacional normalizado y defendible en tesis.
- Se evito absorber la visibilidad dentro del rol funcional.
- Se dejo la logica critica demostrable directamente desde PostgreSQL, sin depender todavia de backend.

## Entidades principales

### Estructura territorial y operativa

- `estado`: catalogo de entidades federativas.
- `territorio_operativo`: agrupacion territorial institucional.
- `territorio_estado`: relacion activa entre estados y territorios.
- `region_operativa`: nivel superior de la jerarquia operativa.
- `central_operativa`: central adscrita a una region.
- `torre_tidv`: unidad operativa concreta que genera alertamientos.

### Acceso y visibilidad

- `rol_sistema`: comportamiento funcional del usuario.
- `nivel_operativo`: catalogo fijo de visibilidad institucional.
- `usuario`: identidad digital institucional.
- `usuario_ambito`: ambito de visibilidad efectivo de cada usuario.

### Operacion y trazabilidad

- `alertamiento_vehicular`: entidad operativa central.
- `historial_alertamiento`: evolucion cronologica de estatus.
- `bitacora_auditoria`: rastro forense de cambios sobre tablas criticas.
- `catalogo_evento_auditoria`: catalogo de eventos auditables.

## Decisiones relevantes

### 1. Estado operativo de torres y estado sede de centrales

El estado operativo del alertamiento se conserva en `torre_tidv.id_estado`, porque el evento nace en la torre.

Adicionalmente, `central_operativa.id_estado_sede` se incorpora para representar la ubicacion administrativa de la central, incluso cuando aun no tiene torres asociadas.

Esto evita dos problemas:

- que una central nueva quede sin contexto geografico;
- que se confunda el estado sede de la central con el estado operativo de cada torre.

### 2. Un solo ambito activo por usuario

El prototipo establece una sola visibilidad institucional activa por usuario mediante un indice unico parcial en `usuario_ambito`.

La regla simplifica validaciones, consultas y defensa conceptual. Si en una fase posterior se requieren multiples ambitos simultaneos, el modelo puede evolucionar quitando ese indice y reemplazandolo por una unicidad por referente.

### 3. Correo obligatorio

`usuario.correo_electronico` es obligatorio y unico en forma case-insensitive mediante `lower(correo_electronico)`.

Esto mejora:

- identificacion institucional;
- consistencia de acceso;
- preparacion para autenticacion futura en backend.

### 4. Trazabilidad automatica

El esquema ya no solo define la estructura de historial y auditoria, tambien automatiza:

- el registro inicial en `historial_alertamiento` al insertar un alertamiento;
- el registro de cambios de estatus cuando cambia `id_estatus_alertamiento`;
- la bitacora de inserciones, actualizaciones y eliminaciones en tablas criticas.

Para asociar el usuario responsable desde PostgreSQL, la aplicacion puede establecer:

```sql
SET app.current_user_id = '123';
```

Si la variable no se establece, la auditoria sigue funcionando y registra `id_usuario` como `NULL`.

## Vistas de apoyo

- `vw_usuario_visibilidad_institucional`: demuestra separacion entre usuario, rol y ambito.
- `vw_central_contexto`: muestra region y estado sede de cada central, aun sin torres.
- `vw_alertamiento_contexto`: integra contexto operativo e indicadores de vigencia institucional.

## Estado actual del prototipo

La base ya esta en un punto adecuado para iniciar un backend y un frontend de pruebas, porque ya ofrece:

- catalogos base y relaciones principales;
- control de integridad suficiente;
- visibilidad institucional modelada;
- trazabilidad minima automatizada;
- vistas utiles para consultas iniciales;
- entorno reproducible en Docker.

## Que si conviene hacer ya en backend/frontend

- autenticacion e inicio de sesion;
- CRUD de catalogos institucionales;
- gestion de usuarios y ambitos;
- alta manual de alertamientos;
- consulta de alertamientos por visibilidad;
- cambio de estatus con prueba del historial;
- tablero simple de auditoria.

## Que todavia no hace falta antes de probar

- RBAC fino;
- microservicios;
- colas;
- cache distribuido;
- materialized views operativas;
- politicas avanzadas de multiambito.

## Conclusion

La base de datos ya no esta solo en fase conceptual. Con las ultimas correcciones, el prototipo es consistente, demostrable y suficientemente estable para pasar a una primera capa de backend y a un frontend de validacion funcional.
