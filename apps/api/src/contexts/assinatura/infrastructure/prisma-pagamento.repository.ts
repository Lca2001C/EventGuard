import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../../platform/prisma/prisma.service";
import { clienteAtual } from "../../../platform/prisma/transacao";
import type { AlteracaoDoPagamento, DadosDoPagamento, NovoPagamento } from "../domain/pagamento";
import type {
  NotificacaoRecebida,
  NotificacaoRepository,
  PagamentoRepository
} from "../domain/pagamento.repository";

@Injectable()
export class PrismaPagamentoRepository implements PagamentoRepository {
  constructor(private readonly prisma: PrismaService) {}

  criar(pagamento: NovoPagamento): Promise<DadosDoPagamento> {
    return clienteAtual(this.prisma).payment.create({ data: pagamento });
  }

  alterar(id: string, alteracao: AlteracaoDoPagamento): Promise<DadosDoPagamento> {
    return clienteAtual(this.prisma).payment.update({ where: { id }, data: alteracao });
  }

  listarDoTenant(tenantId: string): Promise<DadosDoPagamento[]> {
    return clienteAtual(this.prisma).payment.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }

  buscarPorReferencia(
    externalReference: string,
    mercadoPagoPaymentId?: string
  ): Promise<DadosDoPagamento | null> {
    const paymentLookup = [
      externalReference ? { externalReference } : null,
      mercadoPagoPaymentId ? { mercadoPagoPaymentId } : null
    ].filter(Boolean) as Array<{ externalReference: string } | { mercadoPagoPaymentId: string }>;

    return clienteAtual(this.prisma).payment.findFirst({
      where: {
        OR: paymentLookup
      },
      include: {
        subscription: true
      }
    });
  }
}

@Injectable()
export class PrismaNotificacaoRepository implements NotificacaoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(notificacao: NotificacaoRecebida): Promise<void> {
    const payload = notificacao.conteudo as Prisma.InputJsonValue;

    await clienteAtual(this.prisma).webhookEvent.upsert({
      where: { eventId: notificacao.chave },
      update: { payload, signature: notificacao.assinatura },
      create: {
        provider: "mercadopago",
        eventId: notificacao.chave,
        type: notificacao.tipo,
        payload,
        signature: notificacao.assinatura
      }
    });
  }

  async marcarProcessada(chave: string, agora: Date): Promise<void> {
    await clienteAtual(this.prisma).webhookEvent.update({
      where: { eventId: chave },
      data: { processedAt: agora }
    });
  }
}
