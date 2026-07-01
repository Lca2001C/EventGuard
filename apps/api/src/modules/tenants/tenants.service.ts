import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { slugify } from "../../common/utils/security";
import type { AuthenticatedUser } from "../../common/types/authenticated-request";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AdminCreateTenantDto, AdminUpdateTenantDto, UpdateTenantDto } from "./dto/tenant.dto";

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async me(user: AuthenticatedUser) {
    if (!user.tenantId) {
      return null;
    }

    return this.prisma.tenant.findFirst({
      where: { id: user.tenantId, deletedAt: null },
      include: {
        plan: true,
        subscription: {
          include: {
            plan: true
          }
        }
      }
    });
  }

  async updateMe(user: AuthenticatedUser, dto: UpdateTenantDto) {
    if (!user.tenantId) {
      throw new ForbiddenException("Tenant scope is required");
    }

    const tenant = await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data: dto
    });

    await this.auditService.record({
      tenantId: tenant.id,
      actorId: user.id,
      action: "tenant.update",
      entity: "tenant",
      entityId: tenant.id,
      metadata: dto
    });

    return tenant;
  }

  adminList() {
    return this.prisma.tenant.findMany({
      where: { deletedAt: null },
      include: {
        plan: true,
        subscription: true,
        _count: {
          select: {
            users: true,
            events: true,
            guests: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async adminCreate(user: AuthenticatedUser, dto: AdminCreateTenantDto) {
    const starter = await this.prisma.plan.findUnique({ where: { code: "STARTER" } });
    const slug = await this.uniqueSlug(slugify(dto.name));
    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug,
        logoUrl: dto.logoUrl,
        primaryColor: dto.primaryColor,
        status: "TRIAL",
        planId: starter?.id
      }
    });

    await this.auditService.record({
      actorId: user.id,
      tenantId: tenant.id,
      action: "admin.tenant.create",
      entity: "tenant",
      entityId: tenant.id
    });

    return tenant;
  }

  async adminUpdate(user: AuthenticatedUser, id: string, dto: AdminUpdateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException("Tenant not found");
    }

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: dto
    });

    await this.auditService.record({
      actorId: user.id,
      tenantId: tenant.id,
      action: "admin.tenant.update",
      entity: "tenant",
      entityId: tenant.id,
      metadata: dto
    });

    return tenant;
  }

  private async uniqueSlug(base: string): Promise<string> {
    const clean = base || "tenant";
    let candidate = clean;
    let suffix = 1;

    while (await this.prisma.tenant.findUnique({ where: { slug: candidate } })) {
      suffix += 1;
      candidate = `${clean}-${suffix}`;
    }

    return candidate;
  }
}
