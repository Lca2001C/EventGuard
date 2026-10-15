# Database

The database uses PostgreSQL with Prisma.

## Core Tables

- `tenants`: buffet or venue account.
- `users`, `roles`, `user_roles`: identity and authorization.
- `events`: event settings, capacity and check-in window.
- `guests`, `guest_companions`: guest list and companions.
- `invitations`: secure QR token hashes and invitation status.
- `checkins`, `checkin_devices`: validation attempts and reception devices.
- `plans`, `subscriptions`, `payments`, `usage_records`: SaaS billing.
- `audit_logs`: sensitive action history.
- `refresh_tokens`, `password_reset_tokens`: auth session state.
- `webhook_events`: idempotent external webhook processing.

## Tenant Indexes

Tenant-scoped tables include indexes such as:

- `events(tenant_id, status)`
- `guests(tenant_id, event_id)`
- `invitations(tenant_id, event_id, status)`
- `checkins(tenant_id, event_id, checked_in_at)`
- `audit_logs(tenant_id, created_at)`

## Soft Delete

Primary business resources include `deleted_at`. Repositories filter deleted rows out of normal operations.

## Token Storage

Invitation, refresh and password-reset tokens are never stored in plain text. Only SHA-256 hashes are persisted.
