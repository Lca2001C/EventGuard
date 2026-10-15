import type { DadosDoConvidado } from "../convidado/convidado";
import type {
  AlteracaoDoConvite,
  ConviteComEventoEConvidado,
  DadosDoConvite,
  NovoConvite
} from "./convite";

export type ConviteComConvidado = DadosDoConvite & { guest: DadosDoConvidado };

export interface ConviteRepository {
  buscarPorTokenHash(tokenHash: string): Promise<ConviteComEventoEConvidado | null>;
  listarEnviaveis(eventId: string, tenantId: string, guestIds?: string[]): Promise<ConviteComConvidado[]>;
  /** Cancela os convites substituíveis do convidado antes de emitir outro. */
  cancelarSubstituiveis(eventId: string, tenantId: string, guestId: string): Promise<void>;
  emitir(convite: NovoConvite): Promise<DadosDoConvite>;
  alterar(id: string, alteracao: AlteracaoDoConvite): Promise<void>;
  /** Aplica a entrada só se o QR ainda não foi usado. Devolve false se já foi. */
  registrarEntradaSeNaoUsado(id: string, alteracao: AlteracaoDoConvite): Promise<boolean>;
}
export const CONVITE_REPOSITORY = Symbol("ConviteRepository");
