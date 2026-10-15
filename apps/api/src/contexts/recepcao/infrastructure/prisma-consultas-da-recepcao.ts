import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../../platform/prisma/prisma.service";
import type {
  ConsultasDaRecepcao,
  ConvidadoNaLista,
  EventoDetalhado,
  EventoNaLista,
  FiltroDeConvidados,
  FiltroDeEventos
} from "../application/portas";

@Injectable()
export class PrismaConsultasDaRecepcao implements ConsultasDaRecepcao {
  constructor(private readonly prisma: PrismaService) {}

  listarEventos(tenantId: string | null, filtro: FiltroDeEventos): Promise<EventoNaLista[]> {
    const where: Prisma.EventWhereInput = {
      ...(tenantId ? { tenantId } : {}),
      deletedAt: null,
      status: filtro.status ? (filtro.status as never) : undefined,
      name: filtro.search
        ? {
            contains: filtro.search,
            mode: "insensitive"
          }
        : undefined
    };

    return this.prisma.event.findMany({
      where,
      include: {
        _count: {
          select: {
            guests: true,
            checkins: true
          }
        }
      },
      orderBy: { startsAt: "asc" }
    });
  }

  detalharEvento(id: string, tenantId: string | null): Promise<EventoDetalhado | null> {
    return this.prisma.event.findFirst({
      where: {
        id,
        ...(tenantId ? { tenantId } : {}),
        deletedAt: null
      },
      include: {
        guests: {
          where: { deletedAt: null },
          take: 20,
          orderBy: { createdAt: "desc" }
        },
        _count: {
          select: {
            guests: true,
            checkins: true,
            invitations: true
          }
        }
      }
    });
  }

  listarConvidados(
    eventId: string,
    tenantId: string,
    filtro: FiltroDeConvidados
  ): Promise<ConvidadoNaLista[]> {
    return this.prisma.guest.findMany({
      where: {
        tenantId,
        eventId,
        deletedAt: null,
        category: filtro.category ? (filtro.category as never) : undefined,
        name: filtro.search
          ? {
              contains: filtro.search,
              mode: "insensitive"
            }
          : undefined
      },
      include: {
        companions: true,
        invitations: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: { createdAt: "desc" }
    }) as Promise<ConvidadoNaLista[]>;
  }
}
