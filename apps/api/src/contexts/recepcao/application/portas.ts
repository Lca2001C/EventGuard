import type { ConvidadoComAcompanhantes } from "../domain/convidado/convidado.repository";
import type { DadosDoConvidado, FichaDoConvidado } from "../domain/convidado/convidado";
import type { DadosDoConvite } from "../domain/convite/convite";
import type { DadosDoEvento } from "../domain/evento/evento";

// Portas de saída da Recepção, implementadas na infrastructure do contexto.

export interface GeradorDeQrCode {
  /** QR Code do conteúdo como data URL (image/png). */
  gerar(conteudo: string): Promise<string>;
}
export const GERADOR_DE_QR_CODE = Symbol("GeradorDeQrCode");

export interface EnderecoPublico {
  /** Link público que o convidado abre a partir do token do convite. */
  doConvite(token: string): string;
}
export const ENDERECO_PUBLICO = Symbol("EnderecoPublico");

export interface LeitorDeCsvDeConvidados {
  ler(csv: string | undefined): FichaDoConvidado[];
}
export const LEITOR_DE_CSV_DE_CONVIDADOS = Symbol("LeitorDeCsvDeConvidados");

// Leituras próprias da Recepção (listagens das telas de cadastro).

export type FiltroDeEventos = { search?: string; status?: string };
export type FiltroDeConvidados = { search?: string; category?: string };

export type EventoNaLista = DadosDoEvento & { _count: { guests: number; checkins: number } };

export type EventoDetalhado = DadosDoEvento & {
  guests: DadosDoConvidado[];
  _count: { guests: number; checkins: number; invitations: number };
};

export type ConvidadoNaLista = ConvidadoComAcompanhantes & { invitations: DadosDoConvite[] };

export interface ConsultasDaRecepcao {
  listarEventos(tenantId: string | null, filtro: FiltroDeEventos): Promise<EventoNaLista[]>;
  detalharEvento(id: string, tenantId: string | null): Promise<EventoDetalhado | null>;
  listarConvidados(eventId: string, tenantId: string, filtro: FiltroDeConvidados): Promise<ConvidadoNaLista[]>;
}
export const CONSULTAS_DA_RECEPCAO = Symbol("ConsultasDaRecepcao");
