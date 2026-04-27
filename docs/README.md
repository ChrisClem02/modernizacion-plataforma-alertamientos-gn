# Indice Secuencial de Documentacion

Este indice organiza la lectura de los documentos tecnicos del proyecto en el orden en que
conviene revisarlos. La idea es que GitHub funcione como una bitacora entendible: primero el
modelo de datos, despues el plan de implementacion, luego los modulos construidos y finalmente
los cierres o siguientes subetapas.

## Ruta recomendada de lectura

1. [Base de Datos del Prototipo](./base_datos_tesis.md)
   - Explica el modelo fisico, las entidades principales, la separacion entre rol, visibilidad
     institucional y jerarquia operativa, y las decisiones de diseno de PostgreSQL.

2. [Diagrama E-R en Mermaid](./diagrama_er_mermaid.md)
   - Complementa el modelo de datos con una vista visual de relaciones.

3. [Etapa 2 - Plan Aprobado](./etapa_2_plan_aprobado.md)
   - Define el objetivo inicial de la capa de aplicacion, las reglas tecnicas y el orden
     aprobado de implementacion.

4. [Etapa 2 - Frontend Minimo](./etapa_2_frontend_minimo.md)
   - Documenta la primera interfaz React para autenticacion y navegacion basica.

5. [Etapa 2 - Frontend de Alertamientos](./etapa_2_frontend_alertamientos.md)
   - Describe la consulta operativa inicial de alertamientos desde frontend.

6. [Etapa 2 - Alta Manual de Alertamientos](./etapa_2_alertamientos_alta_manual.md)
   - Documenta el alcance backend para crear alertamientos manualmente.

7. [Etapa 2 - Frontend Alta Manual de Alertamientos](./etapa_2_frontend_alta_manual_alertamientos.md)
   - Registra el formulario y flujo visual para alta manual.

8. [Etapa 2 - Cambio de Estatus de Alertamientos](./etapa_2_alertamientos_cambio_estatus_propuesta.md)
   - Define la propuesta y reglas para cambio de estatus e historial.

9. [Etapa 2 - Auth Login](./etapa_2_auth_login.md)
   - Documenta la actualizacion de `fecha_ultimo_acceso` en login exitoso y su alcance de
     auditoria tecnica.

10. [Etapa 2 - Backend Usuarios](./etapa_2_backend_usuarios.md)
    - Describe CRUD de usuarios, roles, niveles operativos, ambitos y validaciones.

11. [Cierre de Subetapa Sin Mapa](./cierre_subetapa_sin_mapa_ETAPA2.md)
    - Resume los modulos cerrados: autenticacion, alertamientos, usuarios, visibilidad
      institucional y auditoria tecnica. Este es el documento de cierre formal previo a Mapa V1.

## Siguiente subetapa

- `etapa_2_backend_mapa.md` corresponde a Mapa V1 y debe leerse como trabajo posterior al
  cierre de subetapa sin mapa. Si todavia no aparece en GitHub, significa que el codigo y la
  documentacion de mapa siguen en preparacion local.

## Anexos tecnicos

- [Seed de validacion de alertamientos](./validacion_alertamientos_seed.sql)
  - Script de apoyo para datos de prueba y validacion funcional.

## Criterio de mantenimiento

- Agregar nuevos documentos al final de la secuencia si pertenecen a una subetapa nueva.
- Si un documento reemplaza a otro, conservar ambos solo si explican decisiones historicas
  distintas.
- Evitar renombrar archivos ya publicados salvo que se haga una limpieza documental dedicada.
