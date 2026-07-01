# API

Base URL in local development: `http://localhost:4000`.

## Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/me`

## Tenants

- `GET /tenants/me`
- `PATCH /tenants/me`
- `GET /admin/tenants`
- `POST /admin/tenants`
- `PATCH /admin/tenants/:id`

## Events

- `GET /events`
- `POST /events`
- `GET /events/:id`
- `PATCH /events/:id`
- `DELETE /events/:id`
- `GET /events/:id/dashboard`

## Guests

- `GET /events/:eventId/guests`
- `POST /events/:eventId/guests`
- `POST /events/:eventId/guests/import`
- `PATCH /guests/:id`
- `DELETE /guests/:id`

## Invitations

- `POST /events/:eventId/invitations/generate`
- `POST /events/:eventId/invitations/send`
- `GET /invite/:token`
- `POST /invite/:token/confirm`

## Check-in

- `POST /checkins/validate`
- `POST /checkins/manual`
- `GET /events/:eventId/checkins`
- `GET /events/:eventId/checkins/live`

## Reports

- `GET /events/:eventId/reports/summary`
- `GET /events/:eventId/reports/pdf`
- `GET /events/:eventId/reports/excel`
- `GET /events/:eventId/reports/csv`

## Billing

- `GET /billing/plans`
- `GET /billing/subscription`
- `POST /billing/checkout/setup`
- `POST /billing/checkout/subscription`
- `POST /billing/change-plan`
- `GET /billing/payments`
- `POST /webhooks/mercadopago`
