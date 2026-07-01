import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import type { AuthenticatedRequest } from "../types/authenticated-request";

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || user.roles.includes("SUPER_ADMIN")) {
      return true;
    }

    if (!user.tenantId) {
      throw new ForbiddenException("Tenant scope is required");
    }

    if (user.tenantStatus === "BLOCKED" || user.tenantStatus === "CANCELED") {
      throw new ForbiddenException("Tenant account is blocked");
    }

    const method = request.method.toUpperCase();
    const path = request.path.toLowerCase();
    const isBillingRoute = path.startsWith("/billing") || path.startsWith("/webhooks");

    if (user.tenantStatus === "PAST_DUE" && method !== "GET" && !isBillingRoute) {
      throw new ForbiddenException("Tenant account is past due");
    }

    return true;
  }
}
