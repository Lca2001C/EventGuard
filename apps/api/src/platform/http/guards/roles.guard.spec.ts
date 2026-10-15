import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";

function contextWithRoles(roles: string[]): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user: { roles } })
    })
  } as unknown as ExecutionContext;
}

describe("RolesGuard", () => {
  it("allows users with a required role", () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(["TENANT_ADMIN"]) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(contextWithRoles(["TENANT_ADMIN"]))).toBe(true);
  });

  it("allows super admin override", () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(["TENANT_ADMIN"]) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(contextWithRoles(["SUPER_ADMIN"]))).toBe(true);
  });

  it("blocks missing roles", () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(["FINANCE"]) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(contextWithRoles(["RECEPTION"]))).toThrow(ForbiddenException);
  });
});
