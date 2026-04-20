# Etapa 2 - Alta Manual de Alertamientos

## Objetivo
Habilitar el endpoint `POST /api/alertamientos` para registrar alertamientos
manuales sin modificar el esquema congelado de PostgreSQL y reutilizando la
trazabilidad automatica ya existente en la base de datos.

## Alcance implementado
- Alta manual de alertamientos desde backend
- Validacion de:
  - `id_torre`
  - `placa_detectada`
  - `fecha_hora_deteccion`
  - coordenadas opcionales
  - longitud maxima de textos opcionales
- Resolucion del estatus inicial `DETECTADO` desde catalogo
- Asignacion automatica de:
  - `origen_registro = MANUAL`
  - `id_usuario_creador = usuario autenticado`
- Validacion de visibilidad institucional sobre la torre destino
- Insercion dentro de transaccion con propagacion de
  `app.current_user_id` hacia PostgreSQL

## Criterio tecnico
La logica de historial y auditoria no se duplico en Node.js. El backend solo
abre la transaccion, inserta el registro operativo y deja que los triggers de
PostgreSQL creen:
- `historial_alertamiento`
- `bitacora_auditoria`

## Validacion realizada
- alta manual exitosa con `admin_test`
- rechazo por latitud invalida
- rechazo por falta de visibilidad con usuario estatal
- verificacion de historial inicial generado automaticamente
- verificacion de auditoria con `id_usuario = 2`
