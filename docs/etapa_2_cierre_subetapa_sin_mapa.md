# Cierre de Subetapa Sin Mapa

Este documento formaliza el cierre de la subetapa operativa previa a Mapa V1. El alcance
incluye autenticacion, alertamientos, usuarios, visibilidad institucional y auditoria tecnica
por triggers. No incluye codigo, rutas ni documentacion tecnica propia del modulo de mapa.

## Modulos implementados

### Autenticacion

- Login funcional con credenciales institucionales.
- Emision de JWT sin cambios de contrato.
- Consulta de sesion vigente mediante `/api/auth/me`.
- Actualizacion de `fecha_ultimo_acceso` despues de un login exitoso.
- Login fallido sin actualizacion de `fecha_ultimo_acceso`.

### Alertamientos

- Consulta operativa con filtros.
- Detalle de alertamiento.
- Historial de cambios.
- Alta manual.
- Cambio de estatus operativo.
- Proteccion por autenticacion y visibilidad institucional.

### Usuarios

- Listado real de usuarios.
- Detalle por usuario.
- Alta de usuario.
- Edicion de datos permitidos.
- Activacion y desactivacion.
- Asignacion y cambio de rol.
- Asignacion y cambio de nivel operativo y ambito.
- Conservacion de historico logico del ambito: se desactiva el ambito vigente y se inserta
  uno nuevo.
- Validacion de nombres y apellidos con caracteres propios del espanol: acentos, ene,
  dieresis, espacios, guion y apostrofo.
- Proteccion contra duplicados, auto-desactivacion y desactivacion del ultimo administrador
  activo.

### Jerarquia de soporte

- Catalogos de estados, territorios y torres para asignacion de ambito de usuario.
- Uso de jerarquia solo como soporte de usuarios.
- No se implementa CRUD completo de jerarquia operativa en esta subetapa.

### Frontend operativo

- Ruta `/usuarios` protegida para ADMINISTRADOR.
- Opcion de menu Usuarios visible solo para ADMINISTRADOR.
- Listado con filtros minimos por busqueda, activo, rol y nivel operativo.
- Formularios de alta y edicion.
- Activacion y desactivacion desde la interfaz.
- Asignacion y cambio de rol, nivel operativo y ambito.
- Mensajes claros de exito y error.

## Validaciones realizadas

- Autenticacion exitosa y fallida.
- Actualizacion de `fecha_ultimo_acceso` solo en login exitoso.
- Consulta de usuarios desde backend.
- Detalle de usuario.
- Alta de usuario.
- Edicion de usuario.
- Cambio de rol.
- Cambio de nivel operativo y ambito.
- Rechazo de usuarios duplicados.
- Activacion y desactivacion.
- Rechazo de auto-desactivacion.
- Proteccion contra dejar el sistema sin administradores activos.
- Acceso a `/usuarios` restringido en frontend para no administradores.
- Rechazo backend con 403 para usuarios no administradores.
- Visibilidad institucional validada con perfiles administrador, coordinador y operador.
- Auditoria tecnica generada por triggers ante escrituras relevantes.

## Decisiones de diseno

- La base de datos PostgreSQL V3 permanece congelada; no se agregaron tablas ni columnas.
- Backend sin ORM; se mantiene SQL parametrizado.
- Las escrituras usan transacciones mediante `withTransaction(..., { userId })` cuando aplica.
- El contexto tecnico de auditoria se conserva con `SET LOCAL app.current_user_id`.
- La visibilidad institucional se aplica en backend, no solo en frontend.
- La actualizacion de `fecha_ultimo_acceso` en login genera auditoria tecnica por UPDATE de
  usuario, pero no representa una bitacora operativa independiente de evento LOGIN.
- Los catalogos de jerarquia se exponen solo como auxiliares minimos para usuarios.

## Pendientes fuera de alcance

- Reportes institucionales.
- Consulta visual de bitacora o auditoria.
- CRUD completo de jerarquia operativa: regiones, centrales, territorios y torres.
- Mapa V1, que queda como siguiente subetapa y no forma parte de este cierre.

## Nota de control de versiones

Este cierre excluye codigo, rutas y documentacion tecnica especifica de Mapa V1.
