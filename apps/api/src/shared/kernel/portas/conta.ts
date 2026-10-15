import type { TenantId } from "../tipos";

// Portas implementadas por Conta.

export type SituacaoDaConta = "TRIAL" | "ACTIVE" | "PAST_DUE" | "BLOCKED" | "CANCELED";

export type ResumoDaConta = {
  id: TenantId;
  name: string;
  slug: string;
  status: SituacaoDaConta;
  primaryColor: string;
};

export interface ConsultarConta {
  resumo(tenantId: TenantId): Promise<ResumoDaConta | null>;
}
export const CONSULTAR_CONTA = Symbol("ConsultarConta");

export type AberturaDeConta = {
  nome: string;
  logoUrl?: string;
  primaryColor?: string;
  planId?: string | null;
};

/** Cria o tenant em TRIAL. Participa da transação em curso, se houver. */
export interface AbrirConta {
  abrir(abertura: AberturaDeConta): Promise<{ id: TenantId }>;
}
export const ABRIR_CONTA = Symbol("AbrirConta");

export type AlteracaoDeSituacao = {
  tenantId: TenantId;
  situacao: SituacaoDaConta;
  planId?: string;
};

/** Único caminho para mudar Tenant.status a partir de outro contexto. */
export interface AtualizarSituacaoDaConta {
  atualizar(alteracao: AlteracaoDeSituacao): Promise<void>;
}
export const ATUALIZAR_SITUACAO_DA_CONTA = Symbol("AtualizarSituacaoDaConta");
