# Etapa 2 - Frontend Minimo de Integracion

## Objetivo de esta iteracion

Construir un frontend React minimo para validar la integracion real con el backend ya existente, sin introducir complejidad innecesaria ni tocar la base de datos congelada.

## Alcance aplicado

- React + Vite
- `react-router-dom` para rutas
- `axios` para consumo HTTP
- `zustand` para estado de autenticacion
- pagina de login
- dashboard protegido
- cliente API con token Bearer

## Decisiones tomadas

### 1. Base URL del frontend

El frontend consume el backend usando:

`http://localhost:3001/api`

No se usa `http://localhost:3001` a secas porque el backend monta sus rutas bajo `/api`.

### 2. Token pequeno y contexto vivo

El frontend solo conserva el token y el usuario actual. El contexto de visibilidad sigue resolviendose desde el backend mediante `/auth/me`, lo cual evita duplicar o congelar datos de ambito en el navegador.

### 3. Persistencia simple

Se usa Zustand con persistencia manual en `localStorage`, en lugar de introducir una solucion mas pesada. Esto permite mantener la sesion al recargar la pagina y seguir un flujo sencillo de depuracion.

### 4. Docker minimo

Se agrega un servicio `frontend_mpna_gn` solo para servir la aplicacion Vite en desarrollo. El navegador sigue hablando con `localhost`, no con el nombre del contenedor del backend.

## Flujo funcional esperado

1. El usuario abre `/login`
2. Captura `nombre_usuario` y `contrasena`
3. El frontend llama a `POST /api/auth/login`
4. Si el login es correcto:
   - guarda token
   - guarda datos de usuario
   - redirige a `/dashboard`
5. El dashboard consulta `GET /api/auth/me`
6. Si no existe token valido, la ruta protegida regresa a `/login`

## Lo que no se implementa todavia

- UI avanzada
- manejo completo de errores por campo
- modulos funcionales adicionales
- recuperacion de contrasena
- layout institucional completo

## Resultado esperado

Esta iteracion deja una base suficiente para probar autenticacion y navegacion protegida desde navegador, sin perder claridad ni apartarse del objetivo del prototipo.
