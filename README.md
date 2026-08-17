# Renewed World of Games

Multiplayer gaming platform beginning with a football management experience, built around team management, player development, competition and future social interaction.

This repository is an active prototype. The current implementation focuses on the football-management MVP. Broader multiplayer, social, and optional AI concepts remain on the long-term roadmap and are not claimed as complete.

## Vision

Renewed World of Games is intended to become a multiplayer gaming platform that connects people through competitive and social online experiences. The long-term idea is to make remote play feel more connected, even when players are in different places.

The first product slice is a football management game. Later, the platform may expand into additional game types and richer social features. Those ideas are documented as future direction, not as current functionality.

## Project Goal

The project explores how multiplayer games can combine competition, management and social interaction in one connected experience. The football-management MVP provides a focused environment for developing the core technical systems first before exploring the broader platform vision.

## Current MVP — Football Management

Version 1 focuses on football management: accounts, a team, a generated squad, and the first UI for browsing players.

The MVP is still in progress. Authentication, team foundation, player data, starter squad generation, a squad page, and a player-detail page are in place. Match simulation, leagues, transfers, chat, training, and other competition systems are not implemented yet.

## Implemented

The following exists in this repository today:

- User registration and JWT-based login
- Automatic team creation on registration
- Team retrieval and basic team-update API (`GET` / `PATCH` `/api/v1/teams/my-team`)
- Player list API for the authenticated user's squad (`GET` `/api/v1/players`)
- Individual player-detail API, scoped to the owner's team (`GET` `/api/v1/players/:id`)
- Starter squad generation (18 players) when a user registers
- Squad page that lists players by overall rating
- Player detail page with full stats
- Frontend and backend talking over a REST API
- PostgreSQL data model for users, teams, players, and related auth records
- npm workspaces monorepo (`frontend`, `backend`, `shared`)
- Docker Compose for local PostgreSQL and Redis
- Health endpoint and GitHub Actions CI (install, typecheck, lint, build)

Redis is included in local infrastructure and backend config. Application features that would use Redis (caching, chat, realtime) are not implemented yet.

## In Development / Next Steps

Planned football-MVP work, not yet complete:

- Deeper team management in the UI
- Player development and training
- Match simulation
- Leagues and competitions
- Transfer market

These items are next steps, not shipped features.

## Long-Term Vision

Future concepts, not implemented:

- Broader multiplayer competition
- Text and other social interaction between users
- Optional voice or video social features
- Optional AI-assisted coaching, scouting, or match analysis
- Possible expansion into racing, card games, and other multiplayer experiences

See [PROJECT_VISION.md](PROJECT_VISION.md) for the product vision and [docs/architecture/MVP_ARCHITECTURE.md](docs/architecture/MVP_ARCHITECTURE.md) for early architecture notes.

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend

- NestJS
- TypeScript
- Prisma
- Passport JWT

### Infrastructure / Data

- PostgreSQL
- Redis (Docker service; not yet used by application features)
- Docker Compose

### Architecture

- npm workspaces monorepo
- REST API
- Shared TypeScript package (`@rwog/shared`)
- GitHub Actions CI

## Architecture

```
Renewed-World-of-Games/
├── frontend/          Next.js app (UI)
├── backend/           NestJS API + Prisma
├── shared/            Shared TypeScript types and constants
├── docker/            Docker Compose for local PostgreSQL and Redis
├── docs/              Architecture documentation
└── .github/workflows/ CI pipeline
```

| Path | Role |
|------|------|
| `frontend/` | Next.js UI: landing, auth pages, dashboard, squad, and player detail |
| `backend/` | NestJS REST API, auth, teams, players, Prisma schema and migrations |
| `shared/` | Types and constants imported by frontend and backend |
| `docker/` | Local PostgreSQL 16 and Redis 7 |
| `docs/` | Architecture notes for the MVP |
| `.github/workflows/` | CI: install, typecheck, lint, and build |

Local ports:

| Service | URL / port |
|---------|------------|
| Frontend | http://localhost:4000 |
| Backend API | http://localhost:4001/api/v1 |
| Health check | http://localhost:4001/api/v1/health |
| PostgreSQL | `5432` |
| Redis | `6379` |
| Prisma Studio | `npm run db:studio` → http://localhost:5555 |

## Local Development

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Node.js](https://nodejs.org/) | 20+ | Run frontend and backend |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Latest | PostgreSQL and Redis locally |
| [Git](https://git-scm.com/) | Any | Version control |

npm 10+ is required (see `package.json` `engines`).

### 1. Clone and install

```bash
git clone https://github.com/Bambeki/renewed-world-of-games.git
cd Renewed-World-of-Games
npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

The backend and frontend are separate apps. Each reads its own configuration. Do not commit `.env` or `.env.local` files.

### 3. Start database services

```bash
npm run docker:up
```

This starts:

- **PostgreSQL** on port `5432` (database: `renewed_world_of_games`)
- **Redis** on port `6379` (available for later caching and realtime work)

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

The `shared` package holds types used by both frontend and backend. Build it before starting the apps if you have not already run a full workspace build.

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
| `npm run lint` | Lint frontend and backend |
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

## Development Progress

- [x] Phase 0 — Foundation
- [x] Phase 1 — Authentication
- [x] Phase 2 — Team management foundation
- [x] Phase 3 — Player management and starter squad generation
- [x] Phase 4A — Squad UI
- [x] Phase 4B — Player detail workflow
- [ ] Next football-management systems (training, matches, leagues, transfers)

## Project Status

Renewed World of Games is an active prototype under development. The current implementation focuses on the football-management MVP, while broader multiplayer, social and AI concepts remain part of the long-term roadmap.
