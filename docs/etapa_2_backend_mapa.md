# Etapa 2 - Backend Mapa V1

## Alcance

Mapa V1 expone `GET /api/mapa` para consumir torres y alertamientos visibles
sin modificar la base de datos congelada.

## Reglas

- Requiere usuario autenticado.
- Aplica visibilidad institucional en backend:
  - `NACIONAL`: todas las torres y alertamientos.
  - `TERRITORIAL`: registros del territorio asignado.
  - `ESTATAL`: registros del estado asignado.
  - `TORRE`: solo la torre asignada.
- Por defecto consulta alertamientos desde los ultimos 30 dias hasta el momento
  de la peticion.
- `fecha_inicio`, `fecha_fin`, `id_estatus_alertamiento`, `id_torre` y `limit`
  son filtros opcionales.
- `limit` aplica a alertamientos y se acota a un maximo de 1000.

## Coordenadas

Cada alertamiento usa coordenadas en este orden:

1. `alertamiento_vehicular.latitud_deteccion` y `longitud_deteccion`, si son
   validas.
2. Coordenadas de `torre_tidv`, si el alertamiento no tiene coordenadas propias.
3. `SIN_COORDENADAS`, si ninguna fuente es valida.

El resumen cuenta alertamientos con coordenadas propias, con fallback a torre y
sin coordenadas.
