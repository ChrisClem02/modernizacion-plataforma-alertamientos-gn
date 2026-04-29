# Etapa 2 - UI Institucional V1

## Objetivo

Pulir visualmente el frontend existente de la Plataforma Nacional de Alertamientos con una identidad institucional sobria basada en guinda, dorado, blanco y grises claros, sin modificar reglas funcionales, contratos de API, autenticacion, rutas ni visibilidad institucional.

Esta fase consolida el trabajo visual de:

- Layout general, header y navegacion.
- Dashboard institucional.
- Modulo operativo de alertamientos.
- Detalle e historial de alertamientos.
- Modulo administrativo de usuarios.
- Mapa V1.
- Login institucional.

## Alcance implementado

### Tokens y estilos globales

- Se agregaron tokens CSS para guinda, dorado, fondos, bordes, radios, sombras suaves y tipografia base.
- Se normalizaron estilos de tarjetas, botones, formularios, tablas, estados, paneles, mensajes y filtros.
- Se redujo la densidad visual en tablas y formularios.
- Se incorporaron badges y estados visuales consistentes para elementos activos, inactivos, pendientes y cerrados.

### Layout institucional

- El layout autenticado incorpora un encabezado con sello de Guardia Nacional.
- Se mantuvo la navegacion existente y la visibilidad del menu Usuarios solo para ADMINISTRADOR.
- No se agregaron rutas nuevas en esta fase visual.
- No se modifico el flujo de cierre de sesion.

### Dashboard

- Se reemplazo la vista tecnica cruda por tarjetas legibles de sesion, rol, nivel operativo y ambito.
- Se mantuvo la consulta al perfil autenticado sin modificar el store ni el endpoint `/auth/me`.
- Se elimino la exposicion de JSON crudo para mejorar presentacion.

### Alertamientos

- Se pulieron filtros, tabla, paginacion, estados y formularios visuales.
- Se mantuvieron intactos los nombres de campos, parametros de consulta, payloads y endpoints.
- Se conservaron los flujos ya validados: consulta, alta manual, detalle, historial y cambio de estatus.

### Usuarios

- Se pulieron filtros, tabla, panel de alta/edicion, mensajes y agrupacion visual de secciones.
- Se mantuvieron intactos los contratos con el backend de usuarios.
- No se modificaron reglas de rol, nivel operativo ni ambito.

### Mapa V1

- Se pulieron paneles, filtros, tarjetas resumen, leyenda, popups y marcadores.
- Se aplico tratamiento gris a tiles Leaflet mediante CSS.
- No se modifico `GET /api/mapa`, estructura de datos, filtros funcionales ni ciclo de vida de Leaflet.

### Login institucional

- Se redisenio visualmente la pantalla de login con identidad Guardia Nacional.
- Se incorporaron elementos institucionales locales:
  - `frontend/src/assets/defensa-logo.png`
  - `frontend/src/assets/escudo-guardia-nacional.png`
  - `frontend/src/assets/emblema-gobierno.png`
- La ilustracion de la mujer con bandera se integra como grabado oscuro sobre fondo guinda usando CSS:

```css
.login-hero-engraving {
    opacity: 0.42;
    filter: grayscale(1) brightness(0.42) contrast(1.55);
    mix-blend-mode: multiply;
}
```

- Los textos tecnicos del login fueron reemplazados por textos institucionales.
- Se conservaron `id`, `name`, state, validaciones, endpoint de login y navegacion post-login.

## Archivos frontend modificados

- `frontend/src/index.css`
- `frontend/src/components/AppLayout.jsx`
- `frontend/src/components/UsuarioFormPanel.jsx`
- `frontend/src/pages/LoginPage.jsx`
- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/pages/AlertamientosPage.jsx`
- `frontend/src/pages/AlertamientoDetailPage.jsx`
- `frontend/src/pages/UsuariosPage.jsx`
- `frontend/src/pages/MapaPage.jsx`

## Assets versionados

Los assets institucionales se versionan dentro del repositorio para que el proyecto funcione al clonarse en otra computadora, sin depender de rutas locales de `Downloads` ni imagenes remotas.

- `frontend/src/assets/defensa-logo.png`
- `frontend/src/assets/emblema-gobierno.png`
- `frontend/src/assets/escudo-guardia-nacional.png`

## Reglas respetadas

- No se modifico backend.
- No se modifico base de datos.
- No se modificaron rutas.
- No se modificaron endpoints.
- No se modifico autenticacion.
- No se modifico visibilidad institucional.
- No se modificaron nombres de campos, props, state ni payloads.
- No se agregaron dependencias nuevas.
- No se agregaron funcionalidades nuevas.

## Validaciones realizadas

- `npm.cmd run build` en `frontend`.
- `docker compose build frontend_mpna_gn`.
- `docker compose up -d frontend_mpna_gn`.
- Verificacion HTTP de `/login` en `http://localhost:5173/login`.

## Pendientes fuera de alcance

- Redisenar el sistema completo.
- Agregar reportes funcionales.
- Agregar auditoria visual.
- Agregar CRUD completo de jerarquia operativa.
- Agregar clustering, tiempo real, PostGIS o heatmap al mapa.
- Cambiar autenticacion, permisos o reglas de visibilidad.

## Criterio de cierre

La fase UI Institucional V1 queda cerrada como una mejora visual transversal del frontend existente. La funcionalidad operativa sigue dependiendo de los modulos ya validados previamente: autenticacion, alertamientos, usuarios, visibilidad institucional y Mapa V1.
