FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/validations/package.json packages/validations/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN corepack pnpm install --filter @eventguard/web... --frozen-lockfile=false

FROM deps AS build
COPY . .
RUN corepack pnpm --filter @eventguard/shared build
RUN corepack pnpm --filter @eventguard/validations build
RUN corepack pnpm --filter @eventguard/web build

FROM node:22-alpine AS runner
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["corepack", "pnpm", "--filter", "@eventguard/web", "start"]
