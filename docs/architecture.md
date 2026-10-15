# Architecture

EventGuard is a SaaS monorepo with a Next.js web app, a NestJS API, shared packages and a Prisma-managed PostgreSQL schema. Both apps follow Domain-Driven Design as a **modular monolith**: one deployable per app, one database, with bounded contexts separated in code and checked by tests.

## Runtime

- `apps/api`: NestJS API split into six bounded contexts plus a technical platform layer.
- `apps/web`: Next.js app organized with the same contexts and layers.
- `packages/shared`: business constants shared by client, API and seed.
- `packages/validations`: Zod schemas shared by forms and DTO-aligned validation.
- `prisma`: database schema, migrations and seed. Table names are unchanged; each table has one owning context.
- `infra`: Docker and nginx deployment files.

## Bounded contexts

| Context | Owns | Aggregates |
|---|---|---|
| Identidade | `users`, `roles`, `user_roles`, `refresh_tokens`, `password_reset_tokens` | Usuário, RefreshToken, Pedido de redefinição |
| Conta | `tenants` (slug, brand, status) | Conta |
| Recepção | `events`, `guests`, `guest_companions`, `invitations`, `checkins`, `checkin_devices` | Evento, Convidado, Convite, Entrada + policy AvaliarEntrada |
| Assinatura | `plans`, `subscriptions`, `payments`, `usage_records`, `webhook_events` | Assinatura/Plano, Pagamento |
| Consulta | read models only (reports, live dashboard, cross-context account views) | none, read-only |
| Mensageria | e-mail, WhatsApp, templates, BullMQ processors | Mensagens |

Recepção is deliberately one context: guest, invitation and entry share transactions and invariants (capacity, check-in window, single-use QR, guest belongs to the event).

## Layers (both apps)

```txt
contexts/<context>/
  domain/          entities, value rules, repository interfaces; no framework, no Prisma, no HTTP
  application/     use cases (API) or hooks/use cases (web); depend on domain and ports
  infrastructure/  Prisma repositories and adapters (API) or HTTP calls (web)
  interface/       controllers, DTOs, queue processors (API) or screens (web)
  <context>.module.ts (API) / index.ts (web public API)
```

- API: `src/platform` holds Prisma, the unit of work, queue, storage, websocket, audit, clock, ids and HTTP guards/filters. `src/shared/kernel` holds only integration types (`TenantId`, `UserId`, `EventId`, `Ator`), application errors and port contracts.
- Web: `src/platform` holds the HTTP client and session storage, the event socket and UI primitives. `src/app` contains only Next.js routes that re-export context screens, plus the composition shell.

## Cross-context communication

Contexts talk only through ports called in process; there is no broker and no distributed transaction.

| Port | Implemented by | Used by |
|---|---|---|
| ConsultarConta, AbrirConta, AtualizarSituacaoDaConta | Conta | Identidade, Assinatura |
| AssinaturaInicial | Assinatura | Identidade, Conta |
| MedirUso, AutorizarAcessoAoEvento | Recepção | Assinatura, Consulta |
| EnviarConvite, EnviarRedefinicaoDeSenha | Mensageria | Recepção, Identidade |
| RegistrarAuditoria, PublicarEntrada, UnidadeDeTrabalho, Relogio, GeradorDeIds, GeradorDeTokens, ArmazenarArquivo | Platform | all contexts |

Rules that follow from this:

- Only Conta writes `tenants`; Assinatura asks through `AtualizarSituacaoDaConta`.
- Assinatura never counts guests or check-ins; it asks Recepção through `MedirUso`.
- Consulta never writes; it asks Recepção whether an actor may see an event, then reads through its own tenant-scoped query repository.
- Mensageria delivers messages and never changes invitation status.
- Recepção publishes check-ins in real time through `PublicarEntrada` after the transaction commits.

## Enforcement

- `apps/api/test/arquitetura/fronteiras.spec.ts` fails the API test suite when a domain imports Nest, Prisma or an infrastructure SDK, when application imports Prisma or infrastructure, when a context reaches another context other than module to module, when Consulta writes, when anything outside Conta writes `tenants`, or when `src/modules` comes back.
- `apps/api/test/arquitetura/rotas.spec.ts` boots the whole `AppModule` with Prisma stubbed and asserts the public route table.
- `apps/web/scripts/verificar-fronteiras.mjs` runs in `pnpm lint` for the web app with the same layer and context rules (other contexts only through their `index.ts`).

## Request flow (API)

1. User authenticates with `/auth/login` (Identidade).
2. API returns a short-lived access token and a rotating refresh token.
3. Web app sends `Authorization: Bearer <token>`.
4. Global guards validate the JWT (Identidade use case `AutenticarAcesso`), tenant status and role permissions.
5. Controllers call one use case each; use cases load aggregates through repository ports and apply domain rules.
6. Use cases record audit entries through `RegistrarAuditoria`.
7. Check-ins are pushed through Socket.IO rooms keyed by event id.

## Realtime

`DashboardGateway` (platform) exposes Socket.IO rooms named `event:<eventId>`. Recepção publishes `checkin.created` through the `PublicarEntrada` port; the web Consulta context listens with `useEntradasAoVivo`.
