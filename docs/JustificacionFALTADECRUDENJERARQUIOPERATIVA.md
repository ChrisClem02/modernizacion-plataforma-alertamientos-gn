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

---

