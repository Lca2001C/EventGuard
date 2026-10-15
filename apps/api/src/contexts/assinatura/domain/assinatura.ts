export type CodigoDoPlano = "STARTER" | "PROFESSIONAL" | "PREMIUM";
export type SituacaoDaAssinatura = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE";

export type Plano = {
  id: string;
  code: CodigoDoPlano;
  name: string;
  priceCents: number;
  includedGuests: number;
  overageCents: number;
};

export type DadosDaAssinatura = {
  id: string;
  tenantId: string;
  planId: string;
  status: SituacaoDaAssinatura;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
};

export type NovaAssinatura = {
  tenantId: string;
  planId: string;
  status: SituacaoDaAssinatura;
  trialEndsAt?: Date;
  currentPeriodStart?: Date;
};

/** Campos ausentes (undefined) ficam como estão. */
export type AlteracaoDaAssinatura = {
  planId?: string;
  status?: SituacaoDaAssinatura;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
};

/** Toda conta nova começa neste plano. */
export const PLANO_INICIAL: CodigoDoPlano = "STARTER";

const DIAS_DE_TESTE = 14;
const DIAS_DO_CICLO = 30;

/** Agregado Assinatura: plano contratado, período de teste e ciclo de cobrança. */
export const Assinatura = {
  iniciarTeste(tenantId: string, planId: string, agora: Date): NovaAssinatura {
    const trialEndsAt = new Date(agora);
    trialEndsAt.setDate(trialEndsAt.getDate() + DIAS_DE_TESTE);

    return { tenantId, planId, status: "TRIALING", trialEndsAt };
  },

  /** Checkout iniciado: o plano escolhido aguarda o pagamento. */
  aguardarPagamento(planId: string): AlteracaoDaAssinatura {
    return { planId, status: "INCOMPLETE" };
  },

  /** Troca de plano sem checkout: ativa na hora. */
  trocarPlano(planId: string): AlteracaoDaAssinatura {
    return { planId, status: "ACTIVE" };
  },

  /** Pagamento aprovado: abre um ciclo de 30 dias a partir de agora. */
  renovarCiclo(agora: Date): AlteracaoDaAssinatura {
    return {
      status: "ACTIVE",
      currentPeriodStart: agora,
      currentPeriodEnd: new Date(agora.getTime() + DIAS_DO_CICLO * 24 * 60 * 60 * 1000)
    };
  }
};
