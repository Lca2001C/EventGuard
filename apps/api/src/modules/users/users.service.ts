import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import bcrypt from "bcryptjs";
import type { AuthenticatedUser } from "../../common/types/authenticated-request";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateUserDto, UpdateUserDto } from "./dto/user.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  list(user: AuthenticatedUser) {
    return this.prisma.user.findMany({
      where: this.tenantWhere(user),
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

  async create(user: AuthenticatedUser, dto: CreateUserDto) {
    const tenantId = this.resolveTenantId(user, dto.tenantId);
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("Email is already registered");
    }

    const role = await this.prisma.role.findUniqueOrThrow({ where: { name: dto.role } });
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const created = await this.prisma.user.create({
      data: {
        tenantId,
        name: dto.name,
        email: dto.email,
        passwordHash,
        status: "ACTIVE",
        roles: {
          create: {
            roleId: role.id,
            tenantId
          }
        }
      },
      include: {
        roles: {
          include: { role: true }
        }
      }
    });

    await this.auditService.record({
      tenantId,
      actorId: user.id,
      action: "user.create",
      entity: "user",
      entityId: created.id,
      metadata: { role: dto.role }
    });

    return this.serialize(created);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        ...this.tenantWhere(user)
      },
      include: {
        roles: {
          include: { role: true }
        }
      }
    });

    if (!existing) {
      throw new NotFoundException("User not found");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.user.update({
        where: { id },
        data: {
          name: dto.name,
          status: dto.status
        },
        include: {
          roles: {
            include: { role: true }
          }
        }
      });

      if (dto.role) {
        const role = await tx.role.findUniqueOrThrow({ where: { name: dto.role } });
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.create({
          data: {
            userId: id,
            roleId: role.id,
            tenantId: saved.tenantId
          }
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id },
        include: {
          roles: {
            include: { role: true }
          }
        }
      });
    });

    await this.auditService.record({
      tenantId: updated.tenantId,
      actorId: user.id,
      action: "user.update",
      entity: "user",
      entityId: updated.id,
      metadata: dto
    });

    return this.serialize(updated);
  }

  private tenantWhere(user: AuthenticatedUser) {
    if (user.roles.includes("SUPER_ADMIN")) {
      return { deletedAt: null };
    }

    if (!user.tenantId) {
      throw new ForbiddenException("Tenant scope is required");
    }

    return {
      tenantId: user.tenantId,
      deletedAt: null
    };
  }

  private resolveTenantId(user: AuthenticatedUser, explicitTenantId?: string): string {
    if (user.roles.includes("SUPER_ADMIN")) {
      if (!explicitTenantId) {
        throw new ForbiddenException("tenantId is required for super admin");
      }

      return explicitTenantId;
    }

    if (!user.tenantId) {
      throw new ForbiddenException("Tenant scope is required");
    }

    return user.tenantId;
  }

  private serialize(user: {
    id: string;
    name: string;
    email: string;
    tenantId: string | null;
    status: string;
    roles: Array<{ role: { name: string } }>;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      tenantId: user.tenantId,
      status: user.status,
      roles: user.roles.map((userRole) => userRole.role.name)
    };
  }
}
