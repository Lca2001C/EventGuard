import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../platform/prisma/prisma.service";
import type { MedirUso, UsoDoPeriodo } from "../../../shared/kernel";
import { RESULTADOS_DE_PRESENCA } from "../domain/entrada/entrada";

/**
 * Implementa a porta MedirUso para a Assinatura: convidados cadastrados e
 * entradas válidas do tenant no período. Só a Recepção conta as próprias tabelas.
 */
@Injectable()
export class PrismaMedicaoDeUso implements MedirUso {
  constructor(private readonly prisma: PrismaService) {}

  async medir(tenantId: string, inicio: Date, fim: Date): Promise<UsoDoPeriodo> {
    const [guestsUsed, checkinsUsed] = await Promise.all([
      this.prisma.guest.count({
        where: {
          tenantId,
          createdAt: { gte: inicio, lte: fim },
          deletedAt: null
        }
      }),
      this.prisma.checkin.count({
        where: {
          tenantId,
          createdAt: { gte: inicio, lte: fim },
          result: { in: [...RESULTADOS_DE_PRESENCA] }
        }
      })
    ]);

    return { guestsUsed, checkinsUsed };
  }
}
