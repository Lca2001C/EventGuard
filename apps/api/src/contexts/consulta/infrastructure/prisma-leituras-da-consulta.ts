import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../platform/prisma/prisma.service";
import type {
  EventoLido,
  LeituraDoPainel,
  LeituraDoRelatorio,
  LeiturasDaConsulta
} from "../application/portas";

const RESULTADOS_DE_PRESENCA = ["APPROVED", "MANUAL"] as const;

/** Repositório de consulta: só findMany/findFirst/count/groupBy, sempre com tenant. */
@Injectable()
export class PrismaLeiturasDaConsulta implements LeiturasDaConsulta {
  constructor(private readonly prisma: PrismaService) {}

  evento(eventId: string, tenantId: string | null): Promise<EventoLido | null> {
    return this.prisma.event.findFirst({
      where: {
        id: eventId,
        ...(tenantId ? { tenantId } : {}),
        deletedAt: null
      }
    });
  }

  async painel(eventId: string, tenantId: string): Promise<LeituraDoPainel> {
    const [totalGuests, checkedIn, duplicateAttempts, invitationsByStatus, checkins] = await Promise.all([
      this.prisma.guest.count({ where: { tenantId, eventId, deletedAt: null } }),
      this.prisma.checkin.count({
        where: { tenantId, eventId, result: { in: [...RESULTADOS_DE_PRESENCA] } }
      }),
      this.prisma.checkin.count({
        where: { tenantId, eventId, result: "DUPLICATE" }
      }),
      this.prisma.invitation.groupBy({
        by: ["status"],
        where: { tenantId, eventId },
        _count: { status: true }
      }),
      this.prisma.checkin.findMany({
        where: { tenantId, eventId },
        select: { checkedInAt: true, result: true },
        orderBy: { checkedInAt: "asc" }
      })
    ]);

    return {
      totalGuests,
      checkedIn,
      duplicateAttempts,
      invitationsByStatus,
      horarios: checkins.map((checkin) => checkin.checkedInAt)
    };
  }

  async relatorio(eventId: string, tenantId: string): Promise<LeituraDoRelatorio> {
    const [guests, entradasValidas, duplicateAttempts] = await Promise.all([
      this.prisma.guest.findMany({
        where: { tenantId, eventId, deletedAt: null },
        include: {
          checkins: true,
          invitations: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        },
        orderBy: { name: "asc" }
      }),
      this.prisma.checkin.findMany({
        where: { tenantId, eventId, result: { in: [...RESULTADOS_DE_PRESENCA] } },
        orderBy: { checkedInAt: "asc" }
      }),
      this.prisma.checkin.count({
        where: { tenantId, eventId, result: "DUPLICATE" }
      })
    ]);

    return { guests, entradasValidas, duplicateAttempts };
  }

  entradasRecentes(eventId: string, tenantId: string): Promise<unknown[]> {
    return this.prisma.checkin.findMany({
      where: { tenantId, eventId },
      include: {
        guest: true,
        operator: {
          select: {
            id: true,
            name: true
          }
        },
        device: true
      },
      orderBy: { checkedInAt: "desc" },
      take: 200
    });
  }

  contaDoTenant(tenantId: string): Promise<unknown | null> {
    return this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
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

  contas(): Promise<unknown[]> {
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
}
