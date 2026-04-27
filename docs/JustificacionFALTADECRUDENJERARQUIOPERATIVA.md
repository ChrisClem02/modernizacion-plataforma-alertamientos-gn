## Gestión de Jerarquía Institucional

En este sistema, la **Jerarquía Operativa** (Regiones > Centrales > Torres) se 
maneja bajo un esquema de **Solo Lectura**. A continuación se detalla la diferencia 
entre un CRUD completo y el alcance actual del proyecto.

---

### 🔍 Estado Actual del CRUD: Solo Lectura (Catálogos)

Actualmente, el sistema consume la jerarquía mediante endpoints de consulta para garantizar la estabilidad de los datos:

* `GET /regiones` — Listado de regiones.
* `GET /centrales` — Listado de centrales asociadas.
* `GET /torres` — Listado de infraestructura final.

> [!IMPORTANT]  
> El sistema está diseñado para la **operación de alertamientos**, no para la administración estructural.

---

###  El Concepto de "CRUD Completo" (Fuera de Alcance)
Implementar un CRUD (Create, Read, Update, Delete) dinámico para la jerarquía implicaría los siguientes endpoints y funcionalidades en Frontend:
| Método | Endpoint        | Acción                         |
|--------|---------------|--------------------------------|
| POST   | `/regiones`   | Crear nueva región             |
| PUT    | `/regiones/:id` | Editar nombre/parámetros       |
| DELETE | `/regiones/:id` | Eliminar región y cascada      |

**Impacto Técnico:**
Modificar la jerarquía dinámicamente es una operación crítica que afecta:
1. **Visibilidad Institucional:** Los permisos de usuario dependen de esta estructura.
2. **Integridad de BD:** Riesgo de registros "huérfanos" en el historial de alertamientos.
3. **Trazabilidad:** Posible pérdida de datos históricos y auditoría.

---
### Justificación Técnica del Diseño

La **jerarquía operativa del sistema**, compuesta por región, central y torre, se define como un catálogo institucional previamente establecido y no editable desde la aplicación. 
Esta decisión responde a la necesidad de **preservar la integridad estructural del sistema**, 
ya que dicha jerarquía constituye la **base para la asignación de alertamientos y la aplicación de las reglas de visibilidad institucional.**

Permitir la modificación dinámica de esta estructura desde la interfaz implicaría riesgos de inconsistencias en la información, afectando directamente la trazabilidad, la seguridad y la coherencia de los datos. 
Por ello, el sistema se enfoca en la operación de alertamientos sobre una estructura fija, mientras que la administración de dicha jerarquía se considera un proceso externo al alcance del prototipo.


**Conclusión:**  
La administración de dicha jerarquía se considera un **proceso externo** al alcance de este prototipo, centrando el esfuerzo de desarrollo en la eficiencia del motor de alertamientos.

---## En caso de NO MANEJAR REPORTES

En caso de no manejar reportes:

**“¿Por qué no implementaste reportes?”**
**Respondes:**
El sistema ya cubre completamente el flujo operativo de alertamientos, incluyendo consulta, registro, actualización de estatus y visualización geográfica, 
todos bajo control de visibilidad institucional.
La implementación de reportes implica consultas agregadas que deben respetar exactamente la misma lógica de visibilidad, 
lo cual requiere una extensión analítica adicional.
Por ello, se decidió priorizar la consistencia y estabilidad del modelo operativo, dejando los reportes como una línea de trabajo futuro.

**¿Pero no son importantes los reportes?”**
**Respondes:**
Sí, son importantes a nivel analítico, pero no son necesarios para validar el objetivo del proyecto, 
que es la modernización del flujo operativo y el control de acceso a la información.
El sistema ya permite la consulta filtrada y controlada de alertamientos, lo cual cubre la necesidad operativa principal.

**“¿Entonces tu sistema está incompleto?”**
**Respondes:**
No está incompleto, está acotado.
El prototipo se enfoca en la operación y control de alertamientos, mientras que los componentes analíticos
como reportes se plantean como una extensión natural del sistema en una siguiente fase.

**“¿Podrías implementarlos después?”**

**Respondes:**
Sí. *La arquitectura actual permite extender el sistema para incorporar 
reportes reutilizando la lógica de visibilidad existente, 
por lo que su integración futura es totalmente viable sin modificar el modelo de datos.*

