# Deploy

## Frontend

Deploy `apps/web` to Vercel.

Required variables:

- `NEXT_PUBLIC_API_URL`
- `FRONTEND_URL`

## API

Deploy `apps/api` to Render, Railway, Fly.io or another container host.

Required variables:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGIN`
- `API_URL`
- `FRONTEND_URL`
- Mercado Pago variables when billing is enabled

## Database

Use Neon, Supabase, Railway PostgreSQL or managed Postgres. Run:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

## Redis

Use Upstash, Render Redis or Railway Redis. Redis is included for queues and future notification jobs.

## Storage

The `.env.example` is prepared for Cloudflare R2. Tenant logos and generated exports can be moved to R2 without changing API boundaries.
