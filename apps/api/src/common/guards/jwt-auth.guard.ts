import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import type { AuthenticatedRequest } from "../types/authenticated-request";
import { PrismaService } from "../../prisma/prisma.service";

type AccessPayload = {
  sub: string;
  tenantId?: string | null;
  roles?: string[];
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException("Authentication required");
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessPayload>(token, {
        secret: this.configService.get<string>("JWT_ACCESS_SECRET")
      });
      const user = await this.prisma.user.findFirst({
        where: {
          id: payload.sub,
          status: "ACTIVE",
          deletedAt: null
        },
        include: {
          tenant: true,
          roles: {
            include: {
              role: true
            }
          }
        }
      });

      if (!user) {
        throw new UnauthorizedException("Invalid session");
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new UnauthorizedException("User is temporarily locked");
      }

      request.user = {
        id: user.id,
        tenantId: user.tenantId,
        tenantStatus: user.tenant?.status ?? null,
        email: user.email,
        name: user.name,
        roles: user.roles.map((userRole) => userRole.role.name)
      };

      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  private extractBearerToken(header: string | undefined): string | null {
    if (!header) {
      return null;
    }

    const [type, token] = header.split(" ");
    return type === "Bearer" && token ? token : null;
  }
}
