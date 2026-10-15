import type { SituacaoDaConta } from "../../../shared/kernel";
import type { Plano } from "./assinatura";

export type SituacaoDoPagamento = "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED" | "CANCELLED";
export type TipoDePagamento = "SETUP" | "SUBSCRIPTION" | "OVERAGE";

export type DadosDoPagamento = {
  id: string;
  tenantId: string;
  subscriptionId: string | null;
  planId: string | null;
  type: TipoDePagamento;
  status: SituacaoDoPagamento;
  amountCents: number;
  description: string;
  externalReference: string;
  checkoutUrl: string | null;
  mercadoPagoPaymentId: string | null;
  paidAt: Date | null;
};

export type NovoPagamento = {
  tenantId: string;
  subscriptionId?: string;
  planId?: string;
  type: TipoDePagamento;
  status: SituacaoDoPagamento;
  amountCents: number;
  description: string;
  externalReference: string;
};

export type AlteracaoDoPagamento = {
  status?: SituacaoDoPagamento;
  mercadoPagoPaymentId?: string;
  paidAt?: Date;
  checkoutUrl?: string;
};

/** Retorno do provedor de pagamento, já traduzido para o vocabulário do domínio. */
export type RetornoDoPagamento = {
  externalReference: string;
  mercadoPagoPaymentId?: string;
  status: SituacaoDoPagamento;
};

/** O que um retorno de pagamento pede à Conta, se pedir algo. */
export type EfeitoNaConta = { situacao: SituacaoDaConta; planId?: string } | null;

export type TaxaDeImplantacao = { label: string; amountCents: number };

/** Agregado Pagamento: cobrança avulsa (implantação) ou mensalidade, e o retorno dela. */
export const Pagamento = {
  implantacao(tenantId: string, taxa: TaxaDeImplantacao, id: string): NovoPagamento {
    return {
      tenantId,
      type: "SETUP",
      status: "PENDING",
      amountCents: taxa.amountCents,
      description: taxa.label,
      externalReference: `setup:${tenantId}:${id}`
    };
  },

  mensalidade(tenantId: string, subscriptionId: string, plano: Plano, id: string): NovoPagamento {
    return {
      tenantId,
      subscriptionId,
      planId: plano.id,
      type: "SUBSCRIPTION",
      status: "PENDING",
      amountCents: plano.priceCents,
      description: `Mensalidade ${plano.name}`,
      externalReference: `subscription:${tenantId}:${plano.code}:${id}`
    };
  },

  /** Sem referência nem id do provedor não há como achar o pagamento. */
  identificavel(retorno: RetornoDoPagamento): boolean {
    return Boolean(retorno.externalReference || retorno.mercadoPagoPaymentId);
  },

  registrarRetorno(retorno: RetornoDoPagamento, agora: Date): AlteracaoDoPagamento {
    return {
      status: retorno.status,
      mercadoPagoPaymentId: retorno.mercadoPagoPaymentId,
      paidAt: retorno.status === "APPROVED" ? agora : undefined
    };
  },

  /** Aprovado reativa a conta no plano pago; recusado deixa a conta em atraso. */
  efeitoNaConta(pagamento: DadosDoPagamento, status: SituacaoDoPagamento): EfeitoNaConta {
    if (status === "APPROVED") {
      return { situacao: "ACTIVE", planId: pagamento.planId ?? undefined };
    }

    if (status === "REJECTED") {
      return { situacao: "PAST_DUE" };
    }

    return null;
  }
};
