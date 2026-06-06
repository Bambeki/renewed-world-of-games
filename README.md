# Renewed World of Games

Multiplayer football management platform — MVP Phase 0 foundation.

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Node.js](https://nodejs.org/) | 20+ | Run frontend and backend |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Latest | PostgreSQL and Redis locally |
| [Git](https://git-scm.com/) | Any | Version control |

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo-url>
cd Renewed-World-of-Games
npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

**Why two env files?** The backend and frontend are separate apps. Each reads its own configuration. Never commit `.env` files — they may contain secrets.

### 3. Start database services

```bash
npm run docker:up
```

This starts:
- **PostgreSQL** on port `5432` (database: `renewed_world_of_games`)
- **Redis** on port `6379` (for chat and caching in later phases)

Wait until both containers are healthy:

```bash
docker ps
```

### 4. Set up the database

```bash
npm run db:generate   # Generate Prisma client from schema
npm run db:migrate    # Create tables in PostgreSQL
```

When prompted for a migration name, enter: `init`

### 5. Build shared package

```bash
npm run build -w shared
```

The `shared` package holds types used by both frontend and backend. It must be built before the backend can import it.

### 6. Start development servers

```bash
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:4000 |
| Backend API | http://localhost:4001/api/v1 |
| Health check | http://localhost:4001/api/v1/health |
| Prisma Studio | `npm run db:studio` → http://localhost:5555 |

## Project Structure

```
Renewed-World-of-Games/
├── frontend/          Next.js app (UI)
├── backend/           NestJS API + Prisma
├── shared/            Shared TypeScript types
├── docker/            Docker Compose for local services
├── docs/              Architecture documentation
└── .github/workflows/ CI pipeline
```

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + backend together |
| `npm run docker:up` | Start PostgreSQL and Redis |
| `npm run docker:down` | Stop Docker services |
| `npm run docker:logs` | Follow Docker logs |
| `npm run db:generate` | Regenerate Prisma client after schema changes |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:studio` | Open Prisma database GUI |
| `npm run typecheck` | Type-check all packages |
| `npm run build` | Production build for all packages |

## Troubleshooting

### Backend shows "database: disconnected"

1. Check Docker is running: `docker ps`
2. Verify `backend/.env` has the correct `DATABASE_URL`
3. Run migrations: `npm run db:migrate`

### Port already in use

Stop the process using the port, or change:
- Frontend: `frontend/package.json` → `dev` script port
- Backend: `PORT` in `backend/.env`
- PostgreSQL: `docker/docker-compose.yml` → ports mapping

### `Cannot find module '@rwog/shared'`

Build the shared package first:

```bash
npm run build -w shared
```

## Phase 0 Checklist

- [x] Monorepo with npm workspaces
- [x] Next.js frontend with page shells
- [x] NestJS backend with health endpoint
- [x] Prisma schema (users, teams, players)
- [x] Docker Compose (PostgreSQL + Redis)
- [x] Environment file templates
- [x] CI workflow (typecheck, lint, build)

**Next:** Phase 1 — user registration, login, and team creation.

See [docs/architecture/MVP_ARCHITECTURE.md](docs/architecture/MVP_ARCHITECTURE.md) for the full roadmap.
