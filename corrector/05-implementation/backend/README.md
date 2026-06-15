# backend

Bun + Express API backend for Corrector de Proyectos. PostgreSQL 16 database.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/) (included with Docker Desktop)

## Quick start

```bash
# 1. Configure environment
cp .env.example .env

# 2. Start services (api + db)
docker compose up -d

# 3. Follow logs
docker compose logs -f
```

The API is available at `http://localhost:3000`. Changes to source files are hot-reloaded automatically.

## Useful commands

```bash
# Stop services
docker compose down

# Rebuild the api image (after dependency changes)
docker compose build api

# Run a command inside the api container
docker compose exec api bun run src/index.ts

# Open a shell inside the api container
docker compose exec api sh

# Access the database
docker compose exec db psql -U corrector -d corrector
```

## Running tests

```bash
# Inside the container
docker compose exec api bun test

# Or locally (requires Bun installed)
bun test
```

## Environment variables

See `.env.example`. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PASSWORD` | `corrector` | PostgreSQL password |
| `DATABASE_URL` | `postgres://corrector:corrector@localhost:5432/corrector` | Conexión a la base de datos |
| `PORT` | `3000` | Puerto del servidor Express |

## Project structure

```
backend/
├── Dockerfile              # Bun container image
├── docker-compose.yml      # api + db services
├── schema.sql              # PostgreSQL DDL (source of truth)
├── src/                    # Application source (Express + TypeScript)
├── tests/                  # Unit tests (bun test)
├── package.json
└── tsconfig.json
```

This project was created using `bun init` in bun v1.2.20. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
