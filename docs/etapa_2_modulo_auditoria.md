# Etapa 2 - Modulo de auditoria

## Objetivo del modulo

El modulo de auditoria permite consultar los cambios registrados por la base de
datos sobre informacion sensible u operativa del sistema. Su objetivo no es
editar informacion, sino ofrecer trazabilidad institucional para responder:

- que cambio ocurrio,
- cuando ocurrio,
- sobre que modulo ocurrio,
- que registro fue afectado,
- quien lo realizo,
- desde que origen se registro,
- y que evidencia tecnica quedo resguardada.

En esta etapa el modulo se mantiene como consulta administrativa de solo
lectura. No modifica la base de datos, no cambia permisos y no reemplaza los
triggers de auditoria definidos en PostgreSQL.

## Tabla base utilizada

La fuente principal es `bitacora_auditoria`.

Esta tabla funciona como registro forense de operaciones criticas. Cada fila
representa un movimiento auditado sobre un registro de una tabla del sistema.
El frontend no interpreta esta tabla como un CRUD operativo, sino como una
bitacora institucional.

## Campos principales de auditoria

### id_bitacora_auditoria

Identificador unico del evento de auditoria.

En la interfaz se presenta como `Folio de auditoria` para evitar que el usuario
lo confunda con el ID del registro afectado. Sirve para abrir el detalle exacto
de un movimiento y para dar seguimiento a una evidencia concreta.

### id_usuario

Referencia al usuario asociado al movimiento, cuando existe.

Permite identificar quien realizo la accion. Si el valor viene nulo, el
movimiento puede corresponder a un proceso automatico, una operacion del sistema
o un caso donde el usuario ya no esta disponible.

### id_evento_auditoria

Referencia al catalogo `catalogo_evento_auditoria`.

No se muestra al usuario como ID tecnico. Se traduce a un tipo de cambio mas
comprensible:

- `INSERT`: alta o registro nuevo.
- `UPDATE`: actualizacion o cambio.
- `DELETE`: eliminacion o baja tecnica.

Esta traduccion ayuda a que el usuario administrador no tenga que interpretar
terminos SQL directamente.

### nombre_evento

Nombre tecnico del evento registrado en el catalogo de auditoria.

Se utiliza para construir etiquetas visuales y descripciones claras. Por
ejemplo, `INSERT` sobre `usuario` se presenta como: "Se dio de alta un usuario".

### nombre_tabla

Nombre de la tabla afectada dentro de PostgreSQL.

En la interfaz se presenta como `Modulo afectado`, porque para el usuario final
es mas claro hablar de la parte funcional del sistema que fue modificada. Por
ejemplo:

- `usuario` se muestra como `Usuarios`.
- `usuario_ambito` se muestra como `Ambitos de usuario`.
- `alertamiento_vehicular` se muestra como `Alertamientos`.
- `historial_alertamiento` se muestra como `Historial de alertamiento`.
- `torre_tidv` se muestra como `Torres TIDV`.
- `central_operativa` se muestra como `Centrales operativas`.

El nombre tecnico se conserva en la base de datos porque es necesario para
trazabilidad, soporte y auditoria tecnica.

### id_registro

Identificador del registro afectado dentro de la tabla auditada.

En la interfaz se presenta como `Registro afectado`. No es el folio de
auditoria; es el ID del dato que cambio. Por ejemplo, si `nombre_tabla` es
`usuario` e `id_registro` es `7`, significa que el movimiento afecto al usuario
con ID 7.

### datos_anteriores

Documento JSONB con el estado del registro antes del movimiento.

Sirve como evidencia tecnica para saber que informacion existia antes de una
actualizacion, baja o cambio. En altas nuevas puede no existir informacion
previa, porque el registro aun no existia.

En el frontend ya no se muestra como seccion principal aislada. Primero se
presenta un resumen por campos modificados y despues se conserva como
`Registro previo` dentro de la seccion `Evidencia tecnica`.

### datos_nuevos

Documento JSONB con el estado del registro despues del movimiento.

Sirve para comparar el resultado final del cambio. En altas muestra la
informacion creada; en actualizaciones muestra el estado resultante; en bajas
puede depender de como el trigger registre la operacion.

En el frontend se presenta como `Registro resultante` dentro de la evidencia
tecnica.

### ip_origen

Direccion IP desde la que se registro el movimiento, cuando esta disponible.

Su funcion es apoyar la trazabilidad operativa y forense. Puede aparecer como
`Sin IP` si la operacion fue generada por un proceso local, automatico, por una
conexion sin IP registrada o si el contexto de aplicacion no la proporciono.

### fecha_evento

Fecha y hora en la que se registro el movimiento de auditoria.

Se usa para ordenar la bitacora del evento mas reciente al mas antiguo y para
filtrar por periodos. Es uno de los campos mas importantes para reconstruir la
secuencia de cambios.

## Campos derivados que expone el backend

El backend no devuelve solamente los campos crudos. Tambien agrega informacion
derivada para que el frontend sea mas claro.

### usuario

Objeto construido a partir de la tabla `usuario`.

Incluye datos basicos como:

- `id_usuario`,
- `nombre_usuario`,
- `nombre_completo`.

Sirve para mostrar quien realizo el movimiento sin obligar al usuario a buscar
manualmente el ID en otra tabla.

### evento

Objeto construido a partir de `catalogo_evento_auditoria`.

Incluye:

- `id_evento_auditoria`,
- `nombre_evento`.

Sirve para traducir el evento tecnico a una etiqueta visual y a una descripcion
legible.

### datos_disponibles

Indicador booleano que informa si existen datos previos o nuevos asociados al
movimiento.

Incluye:

- `anteriores`,
- `nuevos`.

Este indicador evita cargar JSON pesado en el listado principal y permite
reservar la evidencia completa para la pantalla de detalle.

### seguridad

Objeto agregado en la consulta de detalle.

Indica que los datos sensibles fueron protegidos antes de enviarse al frontend.
Actualmente incluye:

- `json_redactado`: indica si se aplico proteccion sobre el JSON.
- `mensaje`: texto explicativo para la interfaz.

## Proteccion de datos sensibles

Antes de enviar el detalle al frontend, el backend redacta campos sensibles
dentro del JSON de auditoria.

Se protegen claves relacionadas con:

- contrasena,
- password,
- hash,
- token,
- secret,
- jwt,
- authorization,
- api_key,
- salt.

Cuando se detecta una clave sensible, su valor se reemplaza por:

```text
[REDACTADO]
```

Esto permite consultar evidencia sin exponer contrasenas, hashes o secretos en
pantalla.

## Funcionamiento del listado de auditoria

La pantalla `/auditoria` muestra una vista resumida de la bitacora.

Columnas principales:

- `Folio de auditoria`: identifica el movimiento de auditoria.
- `Fecha`: indica cuando ocurrio.
- `Descripcion`: traduce el cambio a lenguaje claro.
- `Tipo`: indica si fue alta, actualizacion o baja tecnica.
- `Modulo afectado`: muestra la parte funcional del sistema afectada.
- `Registro afectado`: muestra el ID del dato que cambio.
- `Usuario`: muestra quien realizo el movimiento.
- `IP`: muestra el origen registrado, si existe.
- `Detalle`: abre la evidencia del movimiento.

La columna `Descripcion` evita que el usuario dependa de terminos tecnicos como
`INSERT`, `UPDATE`, `DELETE` o nombres exactos de tablas.

## Funcionamiento del detalle de auditoria

La pantalla `/auditoria/:id` muestra el detalle de un movimiento especifico.

La vista se divide en tres partes:

1. Resumen del movimiento.
2. Resumen del cambio por campos.
3. Evidencia tecnica protegida.

### Resumen del movimiento

Muestra el tipo de cambio, modulo afectado, registro afectado, fecha, usuario,
IP y estado de proteccion del JSON.

### Resumen del cambio

Compara los campos del registro previo y del registro resultante.

La tabla muestra:

- `Campo`: nombre del campo que cambio.
- `Valor previo`: valor antes del movimiento.
- `Valor registrado`: valor despues del movimiento.

Esta seccion existe para que el administrador pueda entender rapidamente que
cambio sin leer JSON crudo.

### Evidencia tecnica

Contiene los documentos JSON originales, ya protegidos.

Incluye:

- `Registro previo`: estado anterior del registro, si aplica.
- `Registro resultante`: estado posterior del registro, si aplica.

Esta evidencia se conserva porque es util para auditoria tecnica, soporte y
validacion institucional, pero no se usa como lectura principal para el usuario.

## Filtros disponibles

### Fecha inicio y fecha fin

Permiten consultar movimientos dentro de un periodo.

Son necesarios porque la auditoria puede crecer con el tiempo y el administrador
normalmente revisara ventanas de tiempo concretas.

### Modulo afectado

Filtra por la parte funcional del sistema auditada.

Internamente usa `nombre_tabla`, pero la interfaz lo muestra como modulo para
evitar lenguaje tecnico innecesario.

### Tipo de cambio

Filtra por el evento registrado:

- alta o registro nuevo,
- actualizacion o cambio,
- eliminacion o baja tecnica.

Internamente se traduce a `INSERT`, `UPDATE` o `DELETE`.

### Registro afectado

Permite buscar movimientos sobre un ID especifico de una tabla.

Es util cuando ya se conoce el registro investigado.

### Usuario

Permite buscar por nombre, usuario o nombre completo del responsable.

Es util para revisar actividad asociada a una persona o cuenta institucional.

## Reglas de acceso

El modulo se encuentra protegido por autenticacion JWT y por rol funcional.

Solo usuarios con rol `ADMINISTRADOR` pueden entrar a:

- `/auditoria`,
- `/auditoria/:id`,
- `/api/auditoria/bitacora`,
- `/api/auditoria/bitacora/:id`.

Esta decision es adecuada para el prototipo porque la auditoria contiene datos
operativos y evidencia sensible. No se introduce RBAC avanzado; se respeta el
modelo funcional existente.

## Decisiones de diseno aplicadas

1. No se modifico la base de datos congelada.
2. No se agrego ORM.
3. No se cambio la logica de triggers.
4. No se expone JSON completo en el listado.
5. El detalle muestra primero una lectura clara y despues evidencia tecnica.
6. Los terminos tecnicos se traducen a lenguaje administrativo.
7. La informacion sensible se redacta antes de llegar al frontend.

## Valor para la tesis

Este modulo demuestra que el prototipo no solo registra operaciones, sino que
tambien permite consultar trazabilidad con separacion clara entre:

- datos operativos,
- evidencia tecnica,
- seguridad de datos,
- rol funcional de administrador,
- y consulta institucional de cambios.

La solucion es defendible academicamente porque mantiene la base de datos como
fuente de verdad, evita sobrearquitectura y conserva un alcance apropiado para
un prototipo PostgreSQL, Node.js y React.
