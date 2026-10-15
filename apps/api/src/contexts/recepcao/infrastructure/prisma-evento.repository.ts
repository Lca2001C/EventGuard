import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../platform/prisma/prisma.service";
import { clienteAtual } from "../../../platform/prisma/transacao";
import {
  Evento,
  type AlteracaoDoEvento,
  type DadosDoEvento,
  type NovoEvento
} from "../domain/evento/evento";
import type { EventoRepository } from "../domain/evento/evento.repository";

@Injectable()
export class PrismaEventoRepository implements EventoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async buscarNoEscopo(id: string, tenantId: string | null): Promise<Evento | null> {
    const event = await clienteAtual(this.prisma).event.findFirst({
      where: {
        id,
        ...(tenantId ? { tenantId } : {}),
        deletedAt: null
      }
    });

    return event ? Evento.reconstituir(event) : null;
  }

  async obterPorId(id: string): Promise<Evento> {
    return Evento.reconstituir(await clienteAtual(this.prisma).event.findUniqueOrThrow({ where: { id } }));
  }

  criar(evento: NovoEvento): Promise<DadosDoEvento> {
    return clienteAtual(this.prisma).event.create({ data: evento });
  }

  alterar(id: string, alteracao: AlteracaoDoEvento): Promise<DadosDoEvento> {
    return clienteAtual(this.prisma).event.update({ where: { id }, data: alteracao });
  }
}
