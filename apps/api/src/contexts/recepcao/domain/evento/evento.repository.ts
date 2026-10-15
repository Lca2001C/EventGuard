import type { AlteracaoDoEvento, DadosDoEvento, Evento, NovoEvento } from "./evento";

export interface EventoRepository {
  /** Evento não removido; tenantId null alcança qualquer tenant (super admin). */
  buscarNoEscopo(id: string, tenantId: string | null): Promise<Evento | null>;
  /** Evento pelo id, sem escopo; falha se não existir. */
  obterPorId(id: string): Promise<Evento>;
  criar(evento: NovoEvento): Promise<DadosDoEvento>;
  alterar(id: string, alteracao: AlteracaoDoEvento): Promise<DadosDoEvento>;
}
export const EVENTO_REPOSITORY = Symbol("EventoRepository");
