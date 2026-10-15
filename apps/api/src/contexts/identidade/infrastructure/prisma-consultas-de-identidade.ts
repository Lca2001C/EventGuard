import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../platform/prisma/prisma.service";
import type { ConsultasDeIdentidade, PerfilDoUsuario, UsuarioNaLista } from "../application/portas";

@Injectable()
export class PrismaConsultasDeIdentidade implements ConsultasDeIdentidade {
  constructor(private readonly prisma: PrismaService) {}

  async perfil(userId: string): Promise<PerfilDoUsuario> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        tenantId: true,
        twoFactorEnabled: true,
        roles: {
          select: {
            role: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    return { ...user, roles: user.roles.map((userRole) => userRole.role.name) };
  }

  listarUsuarios(tenantId: string | null): Promise<UsuarioNaLista[]> {
    return this.prisma.user.findMany({
      where: tenantId ? { tenantId, deletedAt: null } : { deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        tenantId: true,
        lastLoginAt: true,
        createdAt: true,
        roles: {
          select: {
            role: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }
}
