# Renewed World of Games — MVP Architecture

Source of truth for MVP implementation. See PROJECT_VISION.md for product vision.

## Phase 0 — Foundation

**Goal:** Empty app that runs locally.

- Monorepo setup (frontend + backend + shared)
- Docker Compose: PostgreSQL + Redis
- Prisma schema (users, teams, players)
- CI: lint + typecheck on push
- README: how to run the project

**Deliverable:** Apps start locally; database connects; blank dashboard shell visible.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend | NestJS, TypeScript, Prisma |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Monorepo | npm workspaces |

## Folder Structure

```
Renewed-World-of-Games/
├── frontend/          # Next.js app
├── backend/           # NestJS API + Prisma
├── shared/            # Shared types and constants
├── docker/            # Docker Compose
└── docs/              # Documentation
```

## Phase 0 Database Tables

- `users` — accounts
- `refresh_tokens` — auth tokens (schema ready for Phase 1)
- `teams` — football teams (1 per user in MVP)
- `players` — squad members

## Environment Variables

| Variable | Location | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | backend | PostgreSQL connection |
| `REDIS_URL` | backend | Redis connection |
| `JWT_SECRET` | backend | Token signing (Phase 1) |
| `NEXT_PUBLIC_API_URL` | frontend | Backend API base URL |
| `PORT` | backend | API server port (default 4001) |

## Ports

| Service | Port |
|---------|------|
| Frontend | 4000 |
| Backend | 4001 |
| PostgreSQL | 5432 |
| Redis | 6379 |
