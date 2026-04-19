# Diagrama E-R en Mermaid

```mermaid
erDiagram
    ESTADO {
        SMALLSERIAL id_estado PK
        VARCHAR nombre_estado
        VARCHAR abreviatura
        BOOLEAN activo
    }

    TERRITORIO_OPERATIVO {
        SMALLSERIAL id_territorio PK
        VARCHAR nombre_territorio
        BOOLEAN activo
    }

    TERRITORIO_ESTADO {
        BIGSERIAL id_territorio_estado PK
        SMALLINT id_territorio FK
        SMALLINT id_estado FK
        BOOLEAN activo
    }

    REGION_OPERATIVA {
        SMALLSERIAL id_region PK
        VARCHAR nombre_region
        BOOLEAN activo
    }

    CENTRAL_OPERATIVA {
        BIGSERIAL id_central PK
        SMALLINT id_region FK
        SMALLINT id_estado_sede FK
        VARCHAR nombre_central
        BOOLEAN activo
    }

    TORRE_TIDV {
        BIGSERIAL id_torre PK
        BIGINT id_central FK
        SMALLINT id_estado FK
        VARCHAR nombre_torre
        VARCHAR codigo_torre
        BOOLEAN activo
    }

    ROL_SISTEMA {
        SMALLSERIAL id_rol PK
        VARCHAR nombre_rol
        BOOLEAN activo
    }

    NIVEL_OPERATIVO {
        SMALLINT id_nivel_operativo PK
        VARCHAR nombre_nivel
        SMALLINT jerarquia_orden
        BOOLEAN activo
    }

    USUARIO {
        BIGSERIAL id_usuario PK
        SMALLINT id_rol FK
        VARCHAR nombre_usuario
        VARCHAR correo_electronico
        BOOLEAN activo
    }

    USUARIO_AMBITO {
        BIGSERIAL id_usuario_ambito PK
        BIGINT id_usuario FK
        SMALLINT id_nivel_operativo FK
        BIGINT id_torre FK
        SMALLINT id_estado FK
        SMALLINT id_territorio FK
        BOOLEAN ambito_nacional
        BOOLEAN activo
    }

    ESTATUS_ALERTAMIENTO {
        SMALLSERIAL id_estatus_alertamiento PK
        VARCHAR nombre_estatus
        SMALLINT orden_flujo
        BOOLEAN activo
    }

    ALERTAMIENTO_VEHICULAR {
        BIGSERIAL id_alertamiento PK
        UUID folio_alertamiento
        BIGINT id_torre FK
        SMALLINT id_estatus_alertamiento FK
        BIGINT id_usuario_creador FK
        VARCHAR placa_detectada
        TIMESTAMP fecha_hora_deteccion
        VARCHAR origen_registro
    }

    HISTORIAL_ALERTAMIENTO {
        BIGSERIAL id_historial_alertamiento PK
        BIGINT id_alertamiento FK
        SMALLINT id_estatus_alertamiento FK
        BIGINT id_usuario FK
        TIMESTAMP fecha_evento
    }

    CATALOGO_EVENTO_AUDITORIA {
        SMALLSERIAL id_evento_auditoria PK
        VARCHAR nombre_evento
        BOOLEAN activo
    }

    BITACORA_AUDITORIA {
        BIGSERIAL id_bitacora_auditoria PK
        BIGINT id_usuario FK
        SMALLINT id_evento_auditoria FK
        VARCHAR nombre_tabla
        TEXT id_registro
        TIMESTAMP fecha_evento
    }

    ESTADO ||--o{ TERRITORIO_ESTADO : agrupa
    TERRITORIO_OPERATIVO ||--o{ TERRITORIO_ESTADO : contiene

    REGION_OPERATIVA ||--o{ CENTRAL_OPERATIVA : organiza
    ESTADO ||--o{ CENTRAL_OPERATIVA : sede
    CENTRAL_OPERATIVA ||--o{ TORRE_TIDV : administra
    ESTADO ||--o{ TORRE_TIDV : ubica

    ROL_SISTEMA ||--o{ USUARIO : asigna
    USUARIO ||--o{ USUARIO_AMBITO : define
    NIVEL_OPERATIVO ||--o{ USUARIO_AMBITO : clasifica
    TORRE_TIDV ||--o{ USUARIO_AMBITO : referencia
    ESTADO ||--o{ USUARIO_AMBITO : referencia
    TERRITORIO_OPERATIVO ||--o{ USUARIO_AMBITO : referencia

    TORRE_TIDV ||--o{ ALERTAMIENTO_VEHICULAR : genera
    ESTATUS_ALERTAMIENTO ||--o{ ALERTAMIENTO_VEHICULAR : controla
    USUARIO ||--o{ ALERTAMIENTO_VEHICULAR : crea

    ALERTAMIENTO_VEHICULAR ||--o{ HISTORIAL_ALERTAMIENTO : registra
    ESTATUS_ALERTAMIENTO ||--o{ HISTORIAL_ALERTAMIENTO : clasifica
    USUARIO ||--o{ HISTORIAL_ALERTAMIENTO : ejecuta

    USUARIO ||--o{ BITACORA_AUDITORIA : realiza
    CATALOGO_EVENTO_AUDITORIA ||--o{ BITACORA_AUDITORIA : tipifica
```

## Nota de lectura

- La jerarquia operativa esta representada por `region_operativa`, `central_operativa` y `torre_tidv`.
- La visibilidad institucional esta representada por `nivel_operativo` y `usuario_ambito`.
- El rol funcional esta representado por `rol_sistema`.
- `central_operativa.id_estado_sede` representa la sede administrativa de la central.
- `torre_tidv.id_estado` representa el estado operativo real de la torre.
