# Architecture

EventGuard is a SaaS monorepo with a Next.js web app, a NestJS API, shared packages and Prisma-managed PostgreSQL schema.

## Runtime

- `apps/web`: PWA-ready Next.js app for landing, auth, dashboard, event operations, reports, billing, settings and public invitations.
- `apps/api`: NestJS API with modular boundaries for auth, tenants, users, events, guests, invitations, check-ins, reports, billing and audit.
- `packages/shared`: business constants shared by client, API and seed.
- `packages/validations`: Zod schemas shared by forms and DTO-aligned validation.
- `prisma`: database schema and seed.
- `infra`: Docker and nginx deployment files.

## Request Flow

1. User authenticates with `/auth/login`.
2. API returns short-lived access token and rotating refresh token.
3. Web app sends `Authorization: Bearer <token>`.
4. Global guards validate JWT, tenant status and role permissions.
5. Services query Prisma with tenant-scoped filters.
6. Sensitive operations write audit logs.
7. Check-in events are emitted through Socket.IO rooms keyed by event id.

## Module Boundaries

- Controllers expose REST endpoints and stay thin.
- Services hold business rules and Prisma access.
- Guards enforce cross-cutting access policy.
- DTOs validate request shape before service calls.
- Reports and billing are separated because they have export and payment-specific concerns.

## Realtime

`DashboardGateway` exposes Socket.IO rooms named `event:<eventId>`. Reception check-ins emit `checkin.created`, allowing dashboards and event detail screens to update without polling.
