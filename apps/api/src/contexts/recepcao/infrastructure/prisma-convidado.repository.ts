import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../platform/prisma/prisma.service";
import { clienteAtual } from "../../../platform/prisma/transacao";
import {
  Convidado,
  type AlteracaoDoConvidado,
  type DadosDoConvidado,
  type NovoConvidado
} from "../domain/convidado/convidado";
import type {
  ConvidadoComAcompanhantes,
  ConvidadoRepository
} from "../domain/convidado/convidado.repository";
import type { SituacaoDoConvite } from "../domain/convite/convite";

@Injectable()
export class PrismaConvidadoRepository implements ConvidadoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async buscar(id: string, tenantId: string | undefined): Promise<Convidado | null> {
    const guest = await clienteAtual(this.prisma).guest.findFirst({
      where: { id, tenantId, deletedAt: null }
    });

    return guest ? Convidado.reconstituir(guest) : null;
  }

  async buscarDoEvento(id: string, eventId: string, tenantId: string): Promise<Convidado | null> {
    const guest = await clienteAtual(this.prisma).guest.findFirst({
      where: { id, tenantId, eventId, deletedAt: null }
    });

    return guest ? Convidado.reconstituir(guest) : null;
  }

  async listarDoEvento(eventId: string, tenantId: string, ids?: string[]): Promise<Convidado[]> {
    const guests = await clienteAtual(this.prisma).guest.findMany({
      where: {
        tenantId,
        eventId,
        deletedAt: null,
        id: ids ? { in: ids } : undefined
      }
    });

    return guests.map((guest) => Convidado.reconstituir(guest));
  }

  async limitesDeAcompanhantes(eventId: string): Promise<number[]> {
    const guests = await clienteAtual(this.prisma).guest.findMany({
      where: { eventId, deletedAt: null },
      select: { companionLimit: true }
    });

    return guests.map((guest) => guest.companionLimit);
  }

  cadastrar(convidado: NovoConvidado): Promise<ConvidadoComAcompanhantes> {
    const { companions, ...dados } = convidado;

    return clienteAtual(this.prisma).guest.create({
      data: {
        ...dados,
        companions: companions ? { create: companions } : undefined
      },
      include: {
        companions: true
      }
    }) as Promise<ConvidadoComAcompanhantes>;
  }

  alterar(id: string, alteracao: AlteracaoDoConvidado): Promise<DadosDoConvidado> {
    return clienteAtual(this.prisma).guest.update({ where: { id }, data: alteracao });
  }

  async marcarSituacaoDoConvite(id: string, situacao: SituacaoDoConvite): Promise<void> {
    await clienteAtual(this.prisma).guest.update({
      where: { id },
      data: { invitationStatus: situacao }
    });
  }
}
