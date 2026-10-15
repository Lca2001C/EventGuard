import type {
  AlteracaoDaAssinatura,
  CodigoDoPlano,
  DadosDaAssinatura,
  NovaAssinatura,
  Plano
} from "./assinatura";

export type AssinaturaComPlano = DadosDaAssinatura & { plan: Plano };

export interface PlanoRepository {
  listar(): Promise<Plano[]>;
  buscarPorCodigo(code: CodigoDoPlano): Promise<Plano | null>;
  /** Falha se o plano não existir. */
  obterPorCodigo(code: CodigoDoPlano): Promise<Plano>;
}
export const PLANO_REPOSITORY = Symbol("PlanoRepository");

export interface AssinaturaRepository {
  doTenant(tenantId: string): Promise<AssinaturaComPlano | null>;
  criar(assinatura: NovaAssinatura): Promise<DadosDaAssinatura>;
  /** Cria a assinatura do tenant ou altera a existente. */
  salvarDoTenant(
    tenantId: string,
    alteracao: AlteracaoDaAssinatura,
    criacao: NovaAssinatura
  ): Promise<DadosDaAssinatura>;
  alterar(id: string, alteracao: AlteracaoDaAssinatura): Promise<void>;
}
export const ASSINATURA_REPOSITORY = Symbol("AssinaturaRepository");
