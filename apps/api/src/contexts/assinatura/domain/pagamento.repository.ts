import type { AlteracaoDoPagamento, DadosDoPagamento, NovoPagamento } from "./pagamento";

export interface PagamentoRepository {
  criar(pagamento: NovoPagamento): Promise<DadosDoPagamento>;
  alterar(id: string, alteracao: AlteracaoDoPagamento): Promise<DadosDoPagamento>;
  listarDoTenant(tenantId: string): Promise<DadosDoPagamento[]>;
  /** Pela referência externa ou pelo id do pagamento no provedor. */
  buscarPorReferencia(externalReference: string, mercadoPagoPaymentId?: string): Promise<DadosDoPagamento | null>;
}
export const PAGAMENTO_REPOSITORY = Symbol("PagamentoRepository");

export type NotificacaoRecebida = {
  chave: string;
  tipo: string;
  conteudo: Record<string, unknown>;
  assinatura?: string;
};

/** Registro idempotente das notificações do provedor (tabela webhook_events). */
export interface NotificacaoRepository {
  registrar(notificacao: NotificacaoRecebida): Promise<void>;
  marcarProcessada(chave: string, agora: Date): Promise<void>;
}
export const NOTIFICACAO_REPOSITORY = Symbol("NotificacaoRepository");
