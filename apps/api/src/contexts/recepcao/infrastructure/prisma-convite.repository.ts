import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../platform/prisma/prisma.service";
import { clienteAtual } from "../../../platform/prisma/transacao";
import {
  SITUACOES_ENVIAVEIS,
  SITUACOES_SUBSTITUIVEIS,
  type AlteracaoDoConvite,
  type ConviteComEventoEConvidado,
  type DadosDoConvite,
  type NovoConvite
} from "../domain/convite/convite";
import type { ConviteComConvidado, ConviteRepository } from "../domain/convite/convite.repository";

@Injectable()
export class PrismaConviteRepository implements ConviteRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscarPorTokenHash(tokenHash: string): Promise<ConviteComEventoEConvidado | null> {
    return clienteAtual(this.prisma).invitation.findUnique({
      where: { tokenHash },
      include: {
        event: true,
        guest: true
      }
    });
  }

  listarEnviaveis(eventId: string, tenantId: string, guestIds?: string[]): Promise<ConviteComConvidado[]> {
    return clienteAtual(this.prisma).invitation.findMany({
      where: {
        tenantId,
        eventId,
        guestId: guestIds ? { in: guestIds } : undefined,
        status: { in: [...SITUACOES_ENVIAVEIS] }
      },
      include: { guest: true }
    });
  }

  async cancelarSubstituiveis(eventId: string, tenantId: string, guestId: string): Promise<void> {
    await clienteAtual(this.prisma).invitation.updateMany({
      where: {
        tenantId,
        eventId,
        guestId,
        status: { in: [...SITUACOES_SUBSTITUIVEIS] }
      },
      data: { status: "CANCELLED" }
    });
  }

  emitir(convite: NovoConvite): Promise<DadosDoConvite> {
    return clienteAtual(this.prisma).invitation.create({ data: convite });
  }

  async alterar(id: string, alteracao: AlteracaoDoConvite): Promise<void> {
    await clienteAtual(this.prisma).invitation.update({ where: { id }, data: alteracao });
  }

  async registrarEntradaSeNaoUsado(id: string, alteracao: AlteracaoDoConvite): Promise<boolean> {
    const updated = await clienteAtual(this.prisma).invitation.updateMany({
      where: {
        id,
        checkedInAt: null,
        status: { not: "CHECKED_IN" }
      },
      data: alteracao
    });

    return updated.count > 0;
  }
}
