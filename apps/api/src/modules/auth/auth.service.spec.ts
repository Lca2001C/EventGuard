import bcrypt from "bcryptjs";
import { AuthService } from "./auth.service";

function userFixture(passwordHash: string) {
  return {
    id: "user-1",
    tenantId: "tenant-1",
    name: "Ana Admin",
    email: "admin@demo.eventguard.local",
    passwordHash,
    status: "ACTIVE",
    failedLoginAttempts: 0,
    lockedUntil: null,
    deletedAt: null,
    tenant: {
      id: "tenant-1",
      name: "Demo Buffet",
      slug: "demo-buffet",
      status: "ACTIVE",
      primaryColor: "#2563eb"
    },
    roles: [{ role: { name: "TENANT_ADMIN" } }]
  };
}

describe("AuthService", () => {
  it("logs in with valid credentials", async () => {
    const passwordHash = await bcrypt.hash("EventGuard@123", 4);
    const user = userFixture(passwordHash);
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn().mockResolvedValue(user)
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: "refresh-1" })
      }
    };
    const service = new AuthService(
      prisma as never,
      { signAsync: jest.fn().mockResolvedValue("access-token") } as never,
      { get: jest.fn((key: string) => (key.includes("EXPIRES") ? "15m" : "secret")) } as never,
      { record: jest.fn() } as never
    );

    const session = await service.login({
      email: "admin@demo.eventguard.local",
      password: "EventGuard@123"
    });

    expect(session.accessToken).toBe("access-token");
    expect(session.user.roles).toContain("TENANT_ADMIN");
  });

  it("registers a tenant admin and returns a session", async () => {
    const createdUser = userFixture("hash");
    const tx = {
      role: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "role-1" }) },
      tenant: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "tenant-1" })
      },
      user: { create: jest.fn().mockResolvedValue(createdUser) },
      subscription: { create: jest.fn().mockResolvedValue({ id: "sub-1" }) }
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      plan: { findUnique: jest.fn().mockResolvedValue({ id: "plan-1" }) },
      refreshToken: { create: jest.fn().mockResolvedValue({ id: "refresh-1" }) },
      $transaction: jest.fn((callback) => callback(tx))
    };
    const service = new AuthService(
      prisma as never,
      { signAsync: jest.fn().mockResolvedValue("access-token") } as never,
      { get: jest.fn((key: string) => (key.includes("EXPIRES") ? "15m" : "secret")) } as never,
      { record: jest.fn() } as never
    );

    const session = await service.register({
      name: "Ana",
      companyName: "Demo Buffet",
      email: "ana@example.com",
      password: "EventGuard@123",
      confirmPassword: "EventGuard@123",
      termsAccepted: true
    });

    expect(session.accessToken).toBe("access-token");
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("rotates refresh tokens", async () => {
    const user = userFixture("hash");
    const prisma = {
      refreshToken: {
        findUnique: jest.fn().mockResolvedValue({
          id: "old-refresh",
          user,
          family: "family-1",
          revokedAt: null,
          expiresAt: new Date(Date.now() + 60_000)
        }),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({ id: "new-refresh" })
      }
    };
    const service = new AuthService(
      prisma as never,
      { signAsync: jest.fn().mockResolvedValue("access-token") } as never,
      { get: jest.fn((key: string) => (key.includes("EXPIRES") ? "15m" : "secret")) } as never,
      { record: jest.fn() } as never
    );

    const session = await service.refresh("refresh-token");

    expect(session.accessToken).toBe("access-token");
    expect(prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "old-refresh" } })
    );
  });
});
