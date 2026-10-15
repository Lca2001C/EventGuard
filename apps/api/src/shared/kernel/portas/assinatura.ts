import type { TenantId } from "../tipos";

// Portas implementadas por Assinatura.

export interface AssinaturaInicial {
  /** Plano com que toda conta nova começa, se estiver cadastrado. */
  planoInicial(): Promise<{ id: string } | null>;
  /** Abre o período de teste. Participa da transação em curso, se houver. */
  iniciarPeriodoDeTeste(tenantId: TenantId, planId: string): Promise<void>;
}
export const ASSINATURA_INICIAL = Symbol("AssinaturaInicial");
