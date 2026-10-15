import type { INestApplication } from "@nestjs/common";

/**
 * Sobe o AppModule inteiro com o Prisma substituído por um stub e confere:
 * 1. o grafo de injeção dos contextos resolve;
 * 2. a tabela de rotas HTTP é exatamente a de antes do corte DDD.
 */

const ROTAS_PUBLICAS = [
  "DELETE /events/:id",
  "DELETE /guests/:id",
  "GET /admin/tenants",
  "GET /auth/me",
  "GET /billing/payments",
  "GET /billing/plans",
  "GET /billing/subscription",
  "GET /events",
  "GET /events/:eventId/checkins",
  "GET /events/:eventId/checkins/live",
  "GET /events/:eventId/guests",
  "GET /events/:eventId/reports/csv",
  "GET /events/:eventId/reports/excel",
  "GET /events/:eventId/reports/pdf",
  "GET /events/:eventId/reports/summary",
  "GET /events/:id",
  "GET /events/:id/dashboard",
  "GET /invite/:token",
  "GET /tenants/me",
  "GET /users",
  "PATCH /admin/tenants/:id",
  "PATCH /auth/profile",
  "PATCH /events/:id",
  "PATCH /guests/:id",
  "PATCH /tenants/me",
  "PATCH /users/:id",
  "POST /admin/tenants",
  "POST /auth/2fa/disable",
  "POST /auth/2fa/enable",
  "POST /auth/2fa/setup",
  "POST /auth/2fa/verify",
  "POST /auth/change-password",
  "POST /auth/forgot-password",
  "POST /auth/login",
  "POST /auth/logout",
  "POST /auth/refresh",
  "POST /auth/register",
  "POST /auth/reset-password",
  "POST /billing/change-plan",
  "POST /billing/checkout/setup",
  "POST /billing/checkout/subscription",
  "POST /checkins/manual",
  "POST /checkins/validate",
  "POST /events",
  "POST /events/:eventId/guests",
  "POST /events/:eventId/guests/import",
  "POST /events/:eventId/invitations/generate",
  "POST /events/:eventId/invitations/send",
  "POST /invite/:token/confirm",
  "POST /tenants/me/logo",
  "POST /users",
  "POST /webhooks/mercadopago"
];

type CamadaExpress = { route?: { path: string; methods: Record<string, boolean> } };

describe("AppModule", () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Sem Redis no teste: a fila fica desligada e o envio é inline.
    process.env.REDIS_URL = "";
    const { Test } = await import("@nestjs/testing");
    const { AppModule } = await import("../../src/app.module");
    const { PrismaService } = await import("../../src/platform/prisma/prisma.service");

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ $connect: jest.fn(), $disconnect: jest.fn() })
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("mantém as rotas públicas de antes do corte", () => {
    const stack = (app.getHttpAdapter().getInstance() as { _router: { stack: CamadaExpress[] } })
      ._router.stack;
    const rotas = stack
      .filter((camada) => camada.route)
      .flatMap((camada) =>
        Object.keys(camada.route!.methods).map(
          (metodo) => `${metodo.toUpperCase()} ${camada.route!.path}`
        )
      )
      .sort();

    expect(rotas).toEqual([...ROTAS_PUBLICAS].sort());
  });
});
