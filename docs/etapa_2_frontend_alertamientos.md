# Etapa 2 - Frontend de Alertamientos

## Objetivo de esta iteracion
Implementar la primera interfaz React para consumir el modulo backend de
`alertamientos` sin modificar la base congelada ni agregar librerias pesadas de
interfaz.

## Alcance implementado
- Navegacion protegida comun para `dashboard` y `alertamientos`
- Listado de alertamientos con:
  - filtros
  - paginacion
  - visualizacion del ambito actual del usuario
- Vista de detalle de alertamiento
- Vista de historial cronologico del alertamiento
- Integracion con la API existente:
  - `GET /api/alertamientos`
  - `GET /api/alertamientos/:id`
  - `GET /api/alertamientos/:id/historial`

## Archivos principales
- `frontend/src/api/alertamientos.api.js`
- `frontend/src/components/AppLayout.jsx`
- `frontend/src/pages/AlertamientosPage.jsx`
- `frontend/src/pages/AlertamientoDetailPage.jsx`
- `frontend/src/app/router.jsx`
- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/index.css`

## Criterio de diseno
- Mantener el frontend simple y legible
- Reutilizar la sesion autenticada ya existente
- Dejar la URL como fuente del estado del listado para conservar filtros y
  paginacion entre recargas
- Evitar duplicar logica de negocio que ya existe en backend

## Validacion esperada
- iniciar sesion
- entrar a `/alertamientos`
- aplicar filtros
- navegar a detalle
- ver historial del alertamiento
- comprobar que los resultados cambian segun el usuario autenticado
