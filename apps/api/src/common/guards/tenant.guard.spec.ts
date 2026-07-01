import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { TenantGuard } from "./tenant.guard";

function context(input: { method: string; path: string; user: Record<string, unknown> }): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => input
    })
  } as unknown as ExecutionContext;
}

describe("TenantGuard", () => {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) } as unknown as Reflector;

  it("allows active tenants", () => {
    const guard = new TenantGuard(reflector);

    expect(
      guard.canActivate(
        context({
          method: "POST",
          path: "/events",
          user: { tenantId: "tenant-1", tenantStatus: "ACTIVE", roles: ["TENANT_ADMIN"] }
        })
      )
    ).toBe(true);
  });

  it("blocks past-due tenant writes outside billing", () => {
    const guard = new TenantGuard(reflector);

    expect(() =>
      guard.canActivate(
        context({
          method: "POST",
          path: "/events",
          user: { tenantId: "tenant-1", tenantStatus: "PAST_DUE", roles: ["TENANT_ADMIN"] }
        })
      )
    ).toThrow(ForbiddenException);
  });

  it("allows past-due tenants to reach billing", () => {
    const guard = new TenantGuard(reflector);

    expect(
      guard.canActivate(
        context({
          method: "POST",
          path: "/billing/checkout/subscription",
          user: { tenantId: "tenant-1", tenantStatus: "PAST_DUE", roles: ["FINANCE"] }
        })
      )
    ).toBe(true);
  });
});
