import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../platform/prisma/prisma.service";
import { clienteAtual } from "../../../platform/prisma/transacao";
import {
  RESULTADOS_DE_PRESENCA,
  type DadosDaEntrada,
  type IdentificacaoDoDispositivo,
  type NovaEntrada
} from "../domain/entrada/entrada";
import type { EntradaDetalhada, EntradaRepository } from "../domain/entrada/entrada.repository";

@Injectable()
export class PrismaEntradaRepository implements EntradaRepository {
  constructor(private readonly prisma: PrismaService) {}

  registrar(entrada: NovaEntrada): Promise<DadosDaEntrada> {
    return clienteAtual(this.prisma).checkin.create({ data: entrada });
  }

  registrarDetalhada(entrada: NovaEntrada): Promise<EntradaDetalhada> {
    return clienteAtual(this.prisma).checkin.create({
      data: entrada,
      include: {
        guest: true,
        event: true
      }
    });
  }

  async temPresenca(eventId: string, guestId: string): Promise<boolean> {
    const existing = await clienteAtual(this.prisma).checkin.findFirst({
      where: {
        eventId,
        guestId,
        result: { in: [...RESULTADOS_DE_PRESENCA] }
      }
    });

    return Boolean(existing);
  }

  async registrarDispositivo(
    tenantId: string,
    dispositivo: IdentificacaoDoDispositivo,
    agora: Date
  ): Promise<string> {
    const device = await clienteAtual(this.prisma).checkinDevice.upsert({
      where: {
        tenantId_fingerprint: {
          tenantId,
          fingerprint: dispositivo.fingerprint
        }
      },
      update: {
        name: dispositivo.name,
        lastSeenAt: agora
      },
      create: {
        tenantId,
        fingerprint: dispositivo.fingerprint,
        name: dispositivo.name
      }
    });

    return device.id;
  }
}
