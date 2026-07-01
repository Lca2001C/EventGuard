# Security

## Authentication

- Passwords use bcrypt with cost 12.
- Access tokens are short-lived JWTs.
- Refresh tokens are random, opaque and stored only as SHA-256 hashes.
- Refresh is rotating: the previous token is revoked and linked to the replacement.
- Login attempts are counted and temporarily locked after repeated failure.

## Authorization

Roles:

- `SUPER_ADMIN`: all tenants.
- `TENANT_ADMIN`: full tenant administration.
- `ORGANIZER`: event, guest, invitation and report operations.
- `RECEPTION`: check-in only.
- `FINANCE`: billing and financial reports.

Guards:

- `JwtAuthGuard`: validates token and loads user, tenant and roles.
- `TenantGuard`: blocks missing tenant scope and prevents writes for past-due accounts.
- `RolesGuard`: checks endpoint roles, with `SUPER_ADMIN` override.

## Multi-Tenant Isolation

Every business table has `tenant_id` where applicable. Services always derive tenant scope from the authenticated user, not from arbitrary client input, except super-admin endpoints.

## QR Code Safety

The QR Code contains only a public URL with a random token. It never contains name, email, phone, CPF or other personal data. The API stores only `token_hash`, validates it on check-in and marks the invitation as used.

## Webhooks

Mercado Pago webhooks validate `x-signature`, `x-request-id` and `data.id` with the official SDK validator when `MERCADOPAGO_WEBHOOK_SECRET` is configured.

## LGPD

The MVP includes terms, privacy page, audit logs, soft delete fields, export endpoints and tenant-scoped access controls. Biometric recognition is intentionally not implemented.
