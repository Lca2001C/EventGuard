import type { SituacaoDoConvite } from "../convite/convite";
import type {
  Acompanhante,
  AlteracaoDoConvidado,
  Convidado,
  DadosDoConvidado,
  NovoConvidado
} from "./convidado";

export type ConvidadoComAcompanhantes = DadosDoConvidado & {
  companions: Array<Acompanhante & { id: string }>;
};

export interface ConvidadoRepository {
  /** Convidado não removido; tenantId undefined não restringe por tenant. */
  buscar(id: string, tenantId: string | undefined): Promise<Convidado | null>;
  buscarDoEvento(id: string, eventId: string, tenantId: string): Promise<Convidado | null>;
  listarDoEvento(eventId: string, tenantId: string, ids?: string[]): Promise<Convidado[]>;
  /** companionLimit de cada convidado ativo do evento, para a lotação. */
  limitesDeAcompanhantes(eventId: string): Promise<number[]>;
  cadastrar(convidado: NovoConvidado): Promise<ConvidadoComAcompanhantes>;
  alterar(id: string, alteracao: AlteracaoDoConvidado): Promise<DadosDoConvidado>;
  /** Espelho da situação do convite, gravado junto com o convite. */
  marcarSituacaoDoConvite(id: string, situacao: SituacaoDoConvite): Promise<void>;
}
export const CONVIDADO_REPOSITORY = Symbol("ConvidadoRepository");
