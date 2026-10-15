import { Inject, Injectable } from "@nestjs/common";
import {
  ATUALIZAR_SITUACAO_DA_CONTA,
  GERADOR_DE_IDS,
  RELOGIO,
  type AtualizarSituacaoDaConta,
  type GeradorDeIds,
  type Relogio
} from "../../../shared/kernel";
import { Assinatura } from "../domain/assinatura";
import { ASSINATURA_REPOSITORY, type AssinaturaRepository } from "../domain/assinatura.repository";
import { Pagamento, type RetornoDoPagamento } from "../domain/pagamento";
import {
  NOTIFICACAO_REPOSITORY,
  PAGAMENTO_REPOSITORY,
  type NotificacaoRepository,
  type PagamentoRepository
} from "../domain/pagamento.repository";
import {
  GATEWAY_DE_PAGAMENTO,
  type CabecalhosDaNotificacao,
  type GatewayDePagamento
} from "./portas";

export type NotificacaoDePagamento = CabecalhosDaNotificacao & {
  body: Record<string, unknown>;
};

/**
 * Webhook do provedor: registra a notificação, busca o recurso, atualiza o
 * pagamento e a assinatura, e pede à Conta (por porta) a nova situação.
 */
@Injectable()
export class ProcessarNotificacaoDePagamento {
  constructor(
    @Inject(GATEWAY_DE_PAGAMENTO) private readonly gateway: GatewayDePagamento,
    @Inject(NOTIFICACAO_REPOSITORY) private readonly notificacoes: NotificacaoRepository,
    @Inject(PAGAMENTO_REPOSITORY) private readonly pagamentos: PagamentoRepository,
    @Inject(ASSINATURA_REPOSITORY) private readonly assinaturas: AssinaturaRepository,
    @Inject(ATUALIZAR_SITUACAO_DA_CONTA) private readonly situacaoDaConta: AtualizarSituacaoDaConta,
    @Inject(GERADOR_DE_IDS) private readonly ids: GeradorDeIds,
    @Inject(RELOGIO) private readonly relogio: Relogio
  ) {}

  async executar(entrada: NotificacaoDePagamento) {
    const notificacao = this.gateway.lerNotificacao(entrada.body, entrada.dataId, () => this.ids.novo());
    this.gateway.validarAssinatura({
      xSignature: entrada.xSignature,
      xRequestId: entrada.xRequestId,
      dataId: notificacao.dataId
    });

    await this.notificacoes.registrar({
      chave: notificacao.chave,
      tipo: notificacao.tipo,
      conteudo: entrada.body,
      assinatura: entrada.xSignature
    });

    const recurso = notificacao.dataId
      ? await this.gateway.buscarRecurso(entrada.body, notificacao.dataId)
      : entrada.body;
    await this.aplicarRetorno(this.gateway.interpretar(recurso ?? entrada.body));

    await this.notificacoes.marcarProcessada(notificacao.chave, this.relogio.agora());

    return { ok: true };
  }

  private async aplicarRetorno(retorno: RetornoDoPagamento) {
    if (!Pagamento.identificavel(retorno)) {
      return;
    }

    const pagamento = await this.pagamentos.buscarPorReferencia(
      retorno.externalReference,
      retorno.mercadoPagoPaymentId
    );
    if (!pagamento) {
      return;
    }

    await this.pagamentos.alterar(pagamento.id, Pagamento.registrarRetorno(retorno, this.relogio.agora()));

    const efeito = Pagamento.efeitoNaConta(pagamento, retorno.status);
    if (efeito) {
      await this.situacaoDaConta.atualizar({ tenantId: pagamento.tenantId, ...efeito });
    }

    if (retorno.status === "APPROVED" && pagamento.subscriptionId) {
      await this.assinaturas.alterar(pagamento.subscriptionId, Assinatura.renovarCiclo(this.relogio.agora()));
    }
  }
}
