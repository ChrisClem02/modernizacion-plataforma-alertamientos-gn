# Etapa 2 - Mapa V1

## Objetivo

Implementar una primera visualizacion geografica operativa para consultar torres TIDV y
alertamientos visibles segun el ambito institucional del usuario autenticado. Esta version
prioriza validacion funcional y trazabilidad del prototipo, sin modificar la base de datos
congelada.

## Backend utilizado

- Endpoint principal: `GET /api/mapa`.
- El endpoint devuelve torres y alertamientos visibles para el usuario autenticado.
- La visibilidad institucional se aplica en backend:
  - `NACIONAL`: todas las torres y alertamientos.
  - `TERRITORIAL`: registros del territorio asignado.
  - `ESTATAL`: registros del estado asignado.
  - `TORRE`: solo registros de la torre asignada.
- Los alertamientos usan coordenadas propias cuando existen y coordenadas de torre como
  fallback cuando el alertamiento no tiene coordenadas validas.

## Frontend implementado

- Ruta nueva: `/mapa`.
- Opcion `Mapa` agregada al menu para usuarios autenticados.
- Cliente API nuevo para consumir `GET /api/mapa`.
- Pagina de mapa con resumen, filtros, marcadores y popups.

## Libreria de mapa

- Se uso `Leaflet`.
- La integracion se hizo con Leaflet directo desde React para mantener Mapa V1 acotado y evitar
  una capa adicional innecesaria.

## Datos mostrados

- Torres visibles como marcadores `T`.
- Alertamientos visibles como marcadores diferenciados por estatus.
- Popup de alertamiento con:
  - placa
  - estatus
  - torre
  - fecha/hora
  - fuente de coordenada
  - enlace al detalle del alertamiento
- Resumen superior con:
  - torres visibles
  - alertamientos devueltos
  - registros sin coordenadas

## Filtros disponibles

- `fecha_inicio`
- `fecha_fin`
- `id_estatus_alertamiento`
- `id_torre`

## Validaciones realizadas

- `/mapa` con sesion valida carga correctamente.
- `/mapa` sin sesion redirige a login.
- Menu `Mapa` visible para usuarios autenticados.
- `admin_test`: 2 torres, 5 alertamientos, 0 registros sin coordenadas.
- `coord_estatal_test`: 1 torre, 3 alertamientos, 0 registros sin coordenadas.
- `operador_torre_test`: 1 torre, 3 alertamientos, 0 registros sin coordenadas.
- Marcadores de torres visibles.
- Marcadores de alertamientos visibles y diferenciados por estatus.
- Popup de alertamiento validado con datos operativos y enlace al detalle.
- Navegacion desde popup hacia detalle de alertamiento validada.
- Filtros por estatus, torre y fecha validados.
- Limpieza de filtros validada.
- Estado vacio validado con rango de fechas sin alertamientos.
- `GET /api/mapa` sin token responde `401`.
- `npm run build` dentro del contenedor frontend pasa.
- `docker compose build frontend_mpna_gn` pasa.

## Ajuste de estabilidad Leaflet

Durante la validacion se detecto el error de consola:

```text
TypeError: Cannot read properties of undefined (reading '_leaflet_pos')
```

La causa fue un `setTimeout` usado para `invalidateSize`, `fitBounds` o `setView` que podia
ejecutarse despues de desmontar la ruta o cambiar sesion. El ajuste aplicado cancela el timer
en el cleanup del efecto y valida que el mapa siga montado antes de ejecutar operaciones de
Leaflet.

## Pendientes fuera de alcance

- Clustering de marcadores.
- Actualizacion en tiempo real.
- Integracion con PostGIS.
- Heatmap o analitica espacial avanzada.
