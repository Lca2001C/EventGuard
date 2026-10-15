import type { DadosDoConvidado } from "../convidado/convidado";
import type { DadosDoEvento } from "../evento/evento";
import type { DadosDaEntrada, IdentificacaoDoDispositivo, NovaEntrada } from "./entrada";

export type EntradaDetalhada = DadosDaEntrada & {
  guest: DadosDoConvidado | null;
  event: DadosDoEvento;
};

export interface EntradaRepository {
  registrar(entrada: NovaEntrada): Promise<DadosDaEntrada>;
  /** Registra e devolve a entrada com convidado e evento, para a resposta e o painel. */
  registrarDetalhada(entrada: NovaEntrada): Promise<EntradaDetalhada>;
  /** O convidado já tem entrada aprovada ou manual neste evento? */
  temPresenca(eventId: string, guestId: string): Promise<boolean>;
  /** Cria ou atualiza o aparelho e devolve o id dele. */
  registrarDispositivo(tenantId: string, dispositivo: IdentificacaoDoDispositivo, agora: Date): Promise<string>;
}
export const ENTRADA_REPOSITORY = Symbol("EntradaRepository");
