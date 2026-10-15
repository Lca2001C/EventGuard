import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../../../../platform/http/decorators/public.decorator";
import type { AuthenticatedRequest } from "../../../../platform/http/types/authenticated-request";
import { NaoAutenticado } from "../../../../shared/kernel";
import { AutenticarAcesso } from "../../application/sessao/renovar-sessao";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly autenticarAcesso: AutenticarAcesso
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
      request.user = await this.autenticarAcesso.executar(token);
      return true;
    } catch (error) {
      if (error instanceof NaoAutenticado) {
        throw new UnauthorizedException(error.message);
      }

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
