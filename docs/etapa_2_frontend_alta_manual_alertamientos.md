# Etapa 2 - Frontend de Alta Manual de Alertamientos

## Objetivo
Agregar una interfaz minima en React para consumir el endpoint
`POST /api/alertamientos` ya disponible en backend, sin modificar ni el esquema
congelado de PostgreSQL ni la API existente.

## Alcance implementado
- Boton `Nuevo alertamiento` dentro del modulo de alertamientos
- Formulario con los campos:
  - `id_torre`
  - `placa_detectada`
  - `fecha_hora_deteccion`
  - `latitud_deteccion`
  - `longitud_deteccion`
  - `carril`
  - `sentido_vial`
  - `observaciones`
- Consumo de `POST /api/alertamientos`
- Manejo de errores devueltos por backend
- Redireccion automatica al detalle del alertamiento creado
- Mensaje visual de confirmacion en la pantalla de detalle

## Criterio de implementacion
- Se mantuvo el estilo visual existente
- No se agregaron librerias nuevas
- La creacion se encapsulo en `frontend/src/api/alertamientos.api.js`
- El formulario se separo en un componente para no sobrecargar la pagina de
  listado

## Pendiente intencional
El cambio de estatus no se incluyo en esta entrega porque requeriria otra
subetapa funcional y una UI distinta. Esta iteracion se enfoco solo en la alta
manual, que ya contaba con soporte backend completo.
