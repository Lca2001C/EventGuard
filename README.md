# EventGuard

EventGuard is a multi-tenant SaaS MVP for private event venues, buffets and event organizers. It manages events, guests, secure QR invitations, mobile check-in, attendance reports, billing and Mercado Pago payments.

## What Is Included

- Next.js web app with responsive dashboard, public invitation page and mobile-first check-in.
- NestJS API with JWT auth, refresh token rotation, role and tenant guards.
- PostgreSQL schema with Prisma, soft-delete fields, audit logs and tenant indexes.
- Mercado Pago checkout and webhook handling.
- Realtime dashboard gateway with WebSocket events.
- Docker Compose for PostgreSQL, Redis, API and web.
- Seed data with demo tenant, users, events, guests and plans.
- Focused Jest tests for core business rules.

## Stack

- Web: Next.js 15, React, TypeScript, Tailwind CSS, shadcn-style components, TanStack Query, React Hook Form, Zod, Recharts, Sonner and lucide-react.
- API: NestJS, TypeScript, Prisma ORM, PostgreSQL, Redis-ready BullMQ wiring, JWT, bcrypt, Mercado Pago API and Socket.IO.
- Infra: Docker Compose, PostgreSQL, Redis, Vercel-ready web and container-ready API.

## Monorepo

```txt
apps/
  api/      NestJS backend
  web/      Next.js frontend
packages/
  shared/   shared constants and types
  validations/ zod schemas shared by client and server
  config/   shared environment helpers
  ui/       shared UI placeholders
prisma/     schema and seed
infra/      Docker and nginx files
docs/       architecture, security, API, database, billing and deploy docs
```

## Local Setup

### Quick start (Windows, one command)

Run the all-in-one startup script. It loads the root `.env` into the process,
starts PostgreSQL and Redis, waits until the database is healthy, installs
dependencies, generates the Prisma client, applies migrations, seeds demo data
and starts the API + web apps:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

Useful flags: `-SkipSeed` (don't seed), `-SkipDev` (prepare only, don't start
the dev servers) and `-Fresh` (reset the database before migrating).

### Manual setup

1. Copy `.env.example` to `.env`.
2. On Windows, run `powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1`.
3. On WSL/Linux, run `bash scripts/setup-wsl.sh`.
4. If `pnpm` is not recognized, use `corepack pnpm` instead of `pnpm`.
5. Manual setup: `corepack enable`, `corepack prepare pnpm@11.7.0 --activate`, then `corepack pnpm install`.
6. Start database services with `docker compose up postgres redis -d`.
7. Generate Prisma client with `corepack pnpm db:generate`.
8. Run migrations with `corepack pnpm db:migrate`.
9. Seed demo data with `corepack pnpm db:seed`.
10. Start the apps with `corepack pnpm dev`.

### WSL Note

Do not run the Windows PowerShell setup from inside WSL. If `corepack` points to `/mnt/c/Program Files/nodejs/corepack`, install Node.js inside WSL first:

```bash
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
bash scripts/setup-wsl.sh
```

### Windows Note

If `corepack enable` prints an `EPERM` error for `C:\Program Files\nodejs\pnpx`, continue using `corepack pnpm ...`. The setup script and package scripts are written to work without the global `pnpm` shim.

Default URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- PostgreSQL: `localhost:15432`
- Redis: `localhost:6379`

## Demo Users

Seed password for all demo users: `EventGuard@123`

- Super admin: `super@eventguard.local`
- Tenant admin: `admin@demo.eventguard.local`
- Organizer: `organizer@demo.eventguard.local`
- Reception: `reception@demo.eventguard.local`
- Finance: `finance@demo.eventguard.local`

## Scripts

```bash
corepack pnpm dev
corepack pnpm build
corepack pnpm test
corepack pnpm lint
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm db:seed
```

## Security Notes

- Invitation QR codes contain only an opaque random token.
- The API stores only SHA-256 hashes of invitation and session tokens.
- Every business query is scoped by `tenantId` unless explicitly guarded for `SUPER_ADMIN`.
- Past-due tenants keep their data but are blocked from creating new billable resources.
- Webhooks use Mercado Pago `x-signature`, `x-request-id` and `data.id` validation.

## Mercado Pago

Set `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_PUBLIC_KEY` and `MERCADOPAGO_WEBHOOK_SECRET`. The billing module creates checkout preferences for setup fees, subscriptions and plan changes. Webhooks update payment, subscription and tenant status.

## Roadmap

- Email and WhatsApp delivery providers.
- Cloud object storage for tenant logos and exports.
- 2FA activation.
- Native mobile reception app with Expo.
- Biometric modules only after a dedicated legal and technical privacy review.
