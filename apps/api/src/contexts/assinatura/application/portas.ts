import type { RetornoDoPagamento } from "../domain/pagamento";

export type CabecalhosDaNotificacao = {
  xSignature?: string;
  xRequestId?: string;
  dataId?: string;
};

export type NotificacaoLida = {
  /** Id do recurso notificado (pagamento ou assinatura), se veio. */
  dataId?: string;
  /** Chave de idempotência da notificação. */
  chave: string;
  tipo: string;
};

/**
 * Provedor de pagamento (Mercado Pago). A infrastructure traduz o payload do
 * provedor para o vocabulário de Assinatura; nada do SDK passa desta porta.
 */
export interface GatewayDePagamento {
  criarCheckout(externalReference: string, titulo: string, valorEmCentavos: number): Promise<string>;
  lerNotificacao(
    corpo: Record<string, unknown>,
    dataIdDaQuery: string | undefined,
    novoId: () => string
  ): NotificacaoLida;
  /** Lança NaoAutenticado quando a assinatura da notificação não confere. */
  validarAssinatura(cabecalhos: CabecalhosDaNotificacao): void;
  buscarRecurso(corpo: Record<string, unknown>, dataId: string): Promise<Record<string, unknown> | null>;
  interpretar(recurso: Record<string, unknown>): RetornoDoPagamento;
}
export const GATEWAY_DE_PAGAMENTO = Symbol("GatewayDePagamento");
