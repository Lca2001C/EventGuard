// Assinatura no front: planos, assinatura do tenant, uso do mês e pagamentos.

export type PlanRow = {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  includedGuests: number;
  overageCents: number;
  features: string[];
};

export type PaymentRow = {
  id: string;
  description: string;
  status: string;
  amountCents: number;
  checkoutUrl: string | null;
  createdAt: string;
};

export type SubscriptionResponse = {
  subscription:
    | {
        id: string;
        status: string;
        plan: PlanRow | null;
        currentPeriodEnd: string | null;
      }
    | null;
  usage: {
    guestsUsed: number;
    includedGuests: number;
    overageGuests: number;
    overageAmountCents: number;
  } | null;
};

export function planoAtual(assinatura: SubscriptionResponse | undefined): string | undefined {
  return assinatura?.subscription?.plan?.code;
}

export function pagamentoAprovado(pagamento: PaymentRow): boolean {
  return pagamento.status === "APPROVED";
}
