# Modernizacion de la Plataforma Nacional de Alertamiento de la Guardia Nacional

Proyecto base para el modelo fisico PostgreSQL y su ejecucion en Docker.

## Ruta recomendada

Este proyecto se creo fuera de OneDrive para evitar bloqueos con Git y Docker:

- `C:\Repos\modernizacion-plataforma-alertamiento-gn`

## Que incluye

- Docker aislado para PostgreSQL
- Esquema SQL inicial en `initdb/001_schema_v2_1.sql`
- Repo Git local limpio
- Archivo `.env.example` para replicar el entorno en otra laptop
- Documentacion tecnica en `docs/base_datos_tesis.md`
- Diagrama E-R en Mermaid en `docs/diagrama_er_mermaid.md`

## Primer arranque local

```powershell
Copy-Item .env.example .env
notepad .env
```

Ajusta si hace falta:

- `POSTGRES_VERSION`
- `POSTGRES_PORT`
- `POSTGRES_PASSWORD`

Luego levanta el contenedor:

```powershell
docker compose up -d
docker compose ps
docker compose logs postgres_mpna_gn
```

## Conexion local

- Host: `localhost`
- Puerto: el de `POSTGRES_PORT`
- Base: `mpna_gn`
- Usuario: `postgres`
- Password: el de tu `.env`


## Otra laptop

1. Instala Git y Docker Desktop.
2. Clona el repo.
3. Crea `.env` a partir de `.env.example`.
4. Ejecuta `docker compose up -d`.

## Nota sobre la version de PostgreSQL

Se deja `POSTGRES_VERSION=16` por defecto para evitar descarga adicional en esta maquina. Si en otra laptop tienes acceso normal a Docker Hub y quieres usar 17 o 18, cambiar solo esa variable en `.env`.
