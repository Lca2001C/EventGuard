import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { RegistrarAuditoria, RegistroDeAuditoria } from "../../shared/kernel";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PrismaAuditoria implements RegistrarAuditoria {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(input: RegistroDeAuditoria) {
    await this.prisma.auditLog.create({
      data: {
        tenantId: input.tenantId ?? undefined,
        actorId: input.actorId ?? undefined,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? undefined,
        ip: input.ip ?? undefined,
        userAgent: input.userAgent ?? undefined,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue
      }
    });
  }
}
